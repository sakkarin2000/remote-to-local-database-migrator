import { NextApiRequest, NextApiResponse } from "next";
import { getSourceKnex, getDestinationKnex, destroyKnexInstances } from "../../lib/db";

const fetchTables = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { source, destination } = req.body;

  if (
    !source ||
    !source.host ||
    !source.user ||
    !source.password ||
    !source.database
  ) {
    return res
      .status(400)
      .json({ error: "Missing source database credentials" });
  }

  try {
    const sourceKnex = getSourceKnex({
      client: "mysql2",
      connection: {
        host: source.host,
        user: source.user,
        password: source.password,
        database: source.database
      }
    });

    const tables: any[] = await sourceKnex("information_schema.tables")
      .select("TABLE_NAME", "table_name")
      .where("table_schema", source.database);

    const names = tables
      .map((t) => t.TABLE_NAME || t.table_name || t.Table_Name || null)
      .filter(Boolean);

    // For each table, fetch a row count from the source.
    const tableRows: Array<{
      table: string;
      sourceCount: number;
      destCount?: number;
      existsInDest?: boolean;
    }> = [];
    for (const table of names) {
      try {
        const row = await sourceKnex(table).count("* as count");
        const c = Number((row && (row as any)[0] && (row as any)[0].count) || 0);
        tableRows.push({ table, sourceCount: c });
      } catch (e) {
        tableRows.push({ table, sourceCount: -1 });
      }
    }

    // If destination credentials were provided, attempt to augment results with destination info
    let migrationLock: {
      hasMigrationsTable: boolean;
      hasLockTable: boolean;
      isLocked: boolean | null;
    } | null = null;
    if (
      destination &&
      destination.host &&
      destination.user &&
      destination.database
    ) {
      const destinationKnex = getDestinationKnex({
        client: "mysql2",
        connection: destination
      });

      const destTablesRaw: any[] = await destinationKnex(
        "information_schema.tables"
      )
        .select("TABLE_NAME", "table_name")
        .where("table_schema", destination.database);
      const destNames = new Set(
        destTablesRaw.map((t) =>
          (t.TABLE_NAME || t.table_name || t.Table_Name || "").toString()
        )
      );

      for (const r of tableRows) {
        if (destNames.has(r.table)) {
          try {
            const drow = await destinationKnex(r.table).count("* as count");
            const dc = Number((drow && (drow as any)[0] && (drow as any)[0].count) || 0);
            r.destCount = dc;
            r.existsInDest = true;
          } catch (e) {
            r.destCount = -1;
            r.existsInDest = true;
          }
        } else {
          r.destCount = 0;
          r.existsInDest = false;
        }
      }

      try {
        const hasMigrations = destNames.has("knex_migrations");
        const hasLock = destNames.has("knex_migrations_lock");
        let isLocked: boolean | null = null;
        if (hasLock) {
          try {
            const lockRow = await destinationKnex("knex_migrations_lock")
              .select("*")
              .limit(1);
            if (lockRow && lockRow.length > 0 && "is_locked" in lockRow[0]) {
              isLocked = Boolean(lockRow[0].is_locked);
            }
          } catch (e) {
            // ignore
          }
        }
        migrationLock = {
          hasMigrationsTable: hasMigrations,
          hasLockTable: hasLock,
          isLocked
        };
      } catch (e) {
        migrationLock = {
          hasMigrationsTable: false,
          hasLockTable: false,
          isLocked: null
        };
      }
    }

    res.status(200).json({ tables: tableRows, migrationLock });
  } catch (error) {
    console.error("Error fetching tables:", error);
    res.status(500).json({ error: "Failed to fetch tables" });
  } finally {
    try {
      await destroyKnexInstances();
    } catch (e) {
      /* ignore */
    }
  }
};

export default fetchTables;
