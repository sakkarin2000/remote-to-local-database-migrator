import { NextApiRequest, NextApiResponse } from 'next';
import { getSourceKnex, getDestinationKnex, destroyKnexInstances } from '../../lib/db';
import { Knex } from 'knex';

// --- Types & Constants ---
const BATCH_SIZE = 500;

interface MigrationResult {
  table: string;
  status: 'migrated' | 'skipped' | 'error';
  reason?: string;
  sourceCount?: number;
  processed: number;
}

// --- Refactored Main Handler ---
const migrateData = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { source, destination, tables, disableForeignKeyChecks, overwriteMap = {} } = req.body;

  // 1. Validations
  if (!source || !destination || !Array.isArray(tables)) {
    return res.status(400).json({ error: 'Invalid request payload' });
  }
  if (source.host === destination.host && source.database === destination.database) {
    return res.status(400).json({ error: 'Source and destination are the same. Aborting.' });
  }

  let destinationKnex: Knex | null = null;

  try {
    const sourceKnex = getSourceKnex({ client: 'mysql2', connection: source });
    destinationKnex = getDestinationKnex({ client: 'mysql2', connection: destination });

    if (disableForeignKeyChecks) await destinationKnex.raw('SET FOREIGN_KEY_CHECKS = 0');

    const results: MigrationResult[] = [];

    for (const table of tables) {
      const result = await migrateTable(sourceKnex, destinationKnex, table, !!overwriteMap[table]);
      results.push(result);
    }

    res.status(200).json({ message: 'Migration completed', results });
  } catch (error: any) {
    console.error('Migration execution failed:', error);
    res.status(500).json({ error: 'Migration failed', details: error.message });
  } finally {
    if (destinationKnex && disableForeignKeyChecks) {
      await destinationKnex.raw('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
    }
    await destroyKnexInstances().catch(() => {});
  }
};

// --- Table Migration Logic ---
async function migrateTable(src: Knex, dest: Knex, table: string, overwrite: boolean): Promise<MigrationResult> {
  const srcCount = await getCount(src, table);
  if (srcCount === 0) return { table, status: 'skipped', reason: 'empty_source', processed: 0 };

  const destCount = await getCount(dest, table);
  if (destCount > 0 && !overwrite) {
    return { table, status: 'skipped', reason: 'destination_not_empty', processed: 0 };
  }

  const destMeta = await dest(table).columnInfo();
  const validColumns = Object.keys(destMeta);
  let processed = 0;

  while (processed < srcCount) {
    const rows = await src(table).select('*').limit(BATCH_SIZE).offset(processed);
    if (!rows?.length) break;

    const normalizedRows = rows
      .map(row => transformRow(row, destMeta, validColumns))
      .filter(row => row !== null) as Record<string, any>[];

    if (normalizedRows.length > 0) {
      try {
        await dest(table).insert(normalizedRows).onConflict().merge();
      } catch (e) {
        // Fallback to row-by-row on batch failure
        console.warn(`Batch failed for ${table}, attempting row-by-row fallback...`);
        for (const row of normalizedRows) {
          await dest(table).insert(row).onConflict().merge().catch(err => {
            console.error(`Row insert failed in ${table}:`, err.message);
          });
        }
      }
    }
    processed += rows.length;
  }

  return { table, status: 'migrated', sourceCount: srcCount, processed };
}

// --- Data Transformation Helpers ---

function transformRow(row: any, meta: Record<string, any>, validCols: string[]) {
  const cleaned: Record<string, any> = {};
  
  for (const col of validCols) {
    if (!(col in row)) {
      cleaned[col] = null;
      continue;
    }
    
    const value = coerceValue(row[col], meta[col]);
    if (isMalformed(value)) return null; // Skip entire row if a critical value is bad
    cleaned[col] = value;
  }
  
  return cleaned;
}

function coerceValue(val: any, columnMeta: any) {
  if (val === null || val === undefined) return null;
  
  const type = (columnMeta.type || '').toLowerCase();

  // 1. Handle Dates
  if (type.includes('date') || type.includes('time')) {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 19).replace('T', ' '); // YYYY-MM-DD HH:mm:ss
  }

  // 2. Handle JSON
  if (type.includes('json')) {
    if (typeof val === 'string') return val;
    try { return JSON.stringify(val); } catch { return null; }
  }

  // 3. Handle Numbers
  if (type.includes('int') || type.includes('decimal') || type.includes('float')) {
    const n = Number(val);
    return isNaN(n) ? null : n;
  }

  // 4. Handle Strings/Truncation
  if (typeof val === 'string') {
    const cleanStr = val.replace(/\u0000/g, '').replace(/\r\n/g, '\n');
    const max = columnMeta.maxLength;
    return (max && cleanStr.length > max) ? cleanStr.slice(0, max) : cleanStr;
  }

  return val;
}

function isMalformed(val: any): boolean {
  if (typeof val === 'string' && val.length > 500000) return true; // Safety cap
  return false;
}

async function getCount(db: Knex, table: string): Promise<number> {
  try {
    const res = await db(table).count('* as count').first();
    return Number(res?.count || 0);
  } catch {
    return 0;
  }
}

export default migrateData;