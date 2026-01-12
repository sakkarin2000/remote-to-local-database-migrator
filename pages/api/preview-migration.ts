import { NextApiRequest, NextApiResponse } from 'next';
import { getSourceKnex, getDestinationKnex, destroyKnexInstances } from '../../lib/db';
import { Knex } from 'knex';

interface TableComparison {
  table: string;
  sourceCount: number;
  destCount: number | null;
  existsInDest: boolean;
  status: 'ready' | 'missing' | 'mismatch' | 'empty' | 'unknown';
  schemaDiff: SchemaDiff | null;
}

interface SchemaDiff {
  missingInDest: string[];
  extraInDest: string[];
  typeMismatches: Array<{ column: string; srcType: string; destType: string }>;
}

const previewMigration = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { source, destination, tables, approximate } = req.body;

  // 1. Validation
  if (!source || !destination || !Array.isArray(tables)) {
    return res.status(400).json({ error: 'Invalid request payload' });
  }

  const isLocal = (host: string) => host === 'localhost' || host === '127.0.0.1';
  if (!isLocal(destination.host)) {
    return res.status(400).json({ error: 'Destination host must be localhost or 127.0.0.1' });
  }

  try {
    const sourceKnex = getSourceKnex({ client: 'mysql2', connection: source });
    const destinationKnex = getDestinationKnex({ client: 'mysql2', connection: destination });

    // 2. Process all tables in parallel
    const [tableResults, migrationLock] = await Promise.all([
      Promise.all(tables.map(t => compareTable(sourceKnex, destinationKnex, source.database, destination.database, t, approximate))),
      getMigrationLockStatus(destinationKnex, destination.database)
    ]);

    res.status(200).json({ tables: tableResults, migrationLock });
  } catch (err) {
    console.error('Preview error:', err);
    res.status(500).json({ error: 'Preview failed' });
  } finally {
    await destroyKnexInstances().catch(() => {});
  }
};

/**
 * Compares a single table between source and destination
 */
async function compareTable(
  srcKnex: Knex,
  destKnex: Knex,
  srcDb: string,
  destDb: string,
  tableName: string,
  approximate: boolean
): Promise<TableComparison> {
  const [srcCount, destInfo, schemaDiff] = await Promise.all([
    getTableCount(srcKnex, srcDb, tableName, approximate),
    getDestTableInfo(destKnex, destDb, tableName, approximate),
    getSchemaDiff(srcKnex, destKnex, srcDb, destDb, tableName)
  ]);

  const existsInDest = destInfo.exists;
  const destCount = destInfo.count;

  // Determine Status Logic
  let status: TableComparison['status'] = 'unknown';
  if (srcCount === 0) status = 'empty';
  else if (!existsInDest) status = 'missing';
  else if (schemaDiff && (schemaDiff.missingInDest.length > 0 || schemaDiff.typeMismatches.length > 0)) {
    status = 'mismatch';
  } else if (destCount !== null && destCount !== srcCount) {
    status = 'mismatch';
  } else if (destCount === srcCount) {
    status = 'ready';
  }

  return { table: tableName, sourceCount: srcCount, destCount, existsInDest, status, schemaDiff };
}

/**
 * Fetches row counts (approximate via metadata or exact via COUNT(*))
 */
async function getTableCount(db: Knex, schema: string, table: string, approx: boolean): Promise<number> {
  try {
    if (approx) {
      const info = await db('information_schema.tables')
        .select('TABLE_ROWS')
        .where({ table_schema: schema, table_name: table })
        .first();
      return info ? Number(info.TABLE_ROWS ?? info.table_rows ?? 0) : -1;
    }
    const result = await db(table).count('* as count');
    return Number(result[0]?.count ?? 0);
  } catch {
    return -1;
  }
}

/**
 * Specialized check for destination table existence and count
 */
async function getDestTableInfo(db: Knex, schema: string, table: string, approx: boolean) {
  try {
    const count = await getTableCount(db, schema, table, approx);
    // If table count returns -1, it usually means the table doesn't exist in information_schema or query failed
    return { exists: count !== -1, count: count === -1 ? null : count };
  } catch (e: any) {
    return { exists: false, count: null };
  }
}

/**
 * Compares columns and types
 */
async function getSchemaDiff(srcKnex: Knex, destKnex: Knex, srcDb: string, destDb: string, table: string): Promise<SchemaDiff | null> {
  try {
    const fetchCols = (db: Knex, schema: string) => 
      db('information_schema.columns')
        .select('COLUMN_NAME', 'COLUMN_TYPE')
        .where({ table_schema: schema, table_name: table });

    const [srcCols, destCols] = await Promise.all([
      fetchCols(srcKnex, srcDb),
      fetchCols(destKnex, destDb).catch(() => [])
    ]);

    const srcMap = Object.fromEntries(srcCols.map((c: any) => [c.COLUMN_NAME, c.COLUMN_TYPE.toLowerCase()]));
    const destMap = Object.fromEntries(destCols.map((c: any) => [c.COLUMN_NAME, c.COLUMN_TYPE.toLowerCase()]));

    const missingInDest: string[] = [];
    const typeMismatches: SchemaDiff['typeMismatches'] = [];
    
    for (const [col, type] of Object.entries(srcMap)) {
      if (!(col in destMap)) {
        missingInDest.push(col);
      } else if (type !== destMap[col]) {
        typeMismatches.push({ column: col, srcType: type as string, destType: destMap[col] });
      }
    }

    const extraInDest = Object.keys(destMap).filter(col => !(col in srcMap));

    return { missingInDest, extraInDest, typeMismatches };
  } catch {
    return null;
  }
}

/**
 * Checks for Knex migration metadata
 */
async function getMigrationLockStatus(db: Knex, schema: string) {
  try {
    const tables = await db('information_schema.tables')
      .select('TABLE_NAME')
      .where('table_schema', schema);
    
    const tableNames = new Set(tables.map(t => t.TABLE_NAME));
    const hasMigrationsTable = tableNames.has('knex_migrations');
    const hasLockTable = tableNames.has('knex_migrations_lock');
    
    let isLocked = null;
    if (hasLockTable) {
      const lockRow = await db('knex_migrations_lock').select('is_locked').first();
      isLocked = lockRow ? Boolean(lockRow.is_locked) : null;
    }

    return { hasMigrationsTable, hasLockTable, isLocked };
  } catch {
    return null;
  }
}

export default previewMigration;