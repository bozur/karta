const fs = require('fs');
const { Pool } = require('pg');
const sql = require('mssql/msnodesqlv8');
require('dotenv').config();

const mssqlConfig = {
    connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=.\\SQLEXPRESS;Database=map;Trusted_Connection=yes;'
};

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function migrate() {
    console.log('--- Starting Data Migration (Improved) ---');

    let mssqlPool;
    try {
        mssqlPool = await new sql.ConnectionPool(mssqlConfig).connect();
        console.log('✓ Connected to MSSQL');

        const tableOrder = [
            'korisnik',
            'teme',
            'zapisi',
            'teme_opcije',
            'dogadjaji',
            'novosti',
            'comments',
            'comment_upvotes',
            'comment_downvotes',
            'podrska',
            'Table_1', 'Table_2', 'Table_3', 'Table_4', 'Table_5', 'Table_6'
        ];

        for (const table of tableOrder) {
            console.log(`Migrating table: ${table}...`);

            const checkTable = await mssqlPool.request().query(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${table}'`);
            if (checkTable.recordset.length === 0) {
                console.log(`   Table ${table} not found in MSSQL, skipping.`);
                continue;
            }

            const dataResult = await mssqlPool.request().query(`SELECT * FROM [${table}]`);
            const rows = dataResult.recordset;

            if (rows.length === 0) {
                console.log(`   Table ${table} is empty.`);
                continue;
            }

            // Map mixed-case tables to lowercase for PostgreSQL
            // e.g. "Table_1" -> "table_1"
            const pgTable = table.toLowerCase();

            const client = await pgPool.connect();
            try {
                await client.query('BEGIN');
                await client.query(`TRUNCATE TABLE "${pgTable}" RESTART IDENTITY CASCADE`);

                const columns = Object.keys(rows[0]);
                const idCol = columns.find(c => c.toLowerCase() === 'id');
                // Lowercase ALL column names to match new schema
                const columnNames = columns.map(c => `"${c.toLowerCase()}"`).join(', ');
                const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
                const insertQuery = `INSERT INTO "${pgTable}" (${columnNames}) VALUES (${placeholders})`;

                for (const row of rows) {
                    const values = columns.map(col => row[col]);
                    await client.query(insertQuery, values);
                }

                if (idCol) {
                    await client.query(`SELECT setval(pg_get_serial_sequence('"${pgTable}"', 'id'), coalesce(max("id"), 1)) FROM "${pgTable}"`);
                }

                await client.query('COMMIT');
                console.log(`   ✓ Migrated ${rows.length} rows for ${table} -> ${pgTable}`);
            } catch (err) {
                if (client) await client.query('ROLLBACK');
                console.error(`   ✗ Error migrating ${table}:`, err.message);
            } finally {
                client.release();
            }
        }

        console.log('--- Migration Finished ---');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        if (mssqlPool) await mssqlPool.close();
        await pgPool.end();
    }
}

migrate();
