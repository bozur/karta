const { Pool } = require('pg');
require('dotenv').config();

// Use fallback if env var is missing, same as db.js
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/map';

const pool = new Pool({
    connectionString: connectionString
});

async function debug() {
    console.log('--- PostgreSQL Debug Info ---');
    console.log(`Connection String (Masked): ${connectionString.replace(/:[^:/@]+@/, ':****@')}`);

    try {
        const client = await pool.connect();

        // 1. Check current database and user
        const dbRes = await client.query('SELECT current_database(), current_user, inet_server_addr(), inet_server_port()');
        console.log('Connected to:', dbRes.rows[0]);

        // 2. List all tables
        console.log('\n--- Tables in public schema ---');
        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        if (tablesRes.rows.length === 0) {
            console.log('⚠ NO TABLES FOUND in public schema!');
        } else {
            tablesRes.rows.forEach(r => console.log(`   - ${r.table_name}`));
        }

        // 3. Test Select specific tables
        const testTables = ['table_1', 'Table_1', '"table_1"', '"Table_1"'];
        console.log('\n--- Query Tests ---');

        for (const t of testTables) {
            try {
                // If t has quotes, send as is, else quoted
                // We want to test exact SQL: SELECT count(*) FROM <t>
                await client.query(`SELECT count(*) FROM ${t}`);
                console.log(`✓ SELECT count(*) FROM ${t} : SUCCESS`);
            } catch (err) {
                console.log(`✗ SELECT count(*) FROM ${t} : FAILED (${err.message})`);
            }
        }

        client.release();
    } catch (err) {
        console.error('Connection Failed:', err.message);
    } finally {
        await pool.end();
    }
}

debug();
