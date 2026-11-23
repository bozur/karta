const { poolPromise, sql } = require('../db');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
    try {
        const pool = await poolPromise;
        const migrationPath = path.join(__dirname, '../database/update_theme_options_20251218.sql');
        const sqlQuery = fs.readFileSync(migrationPath, 'utf8');

        console.log('Applying migration: update_theme_options_20251218.sql...');

        // mssql package handles multiple statements if they are separated by semicolons
        // but it doesn't support 'GO'. Luckily I didn't use 'GO'.
        // Also it might have issues with BEGIN TRANSACTION if not handled carefully,
        // but simple .query(sqlQuery) usually works for MSSQL.

        const result = await pool.request().query(sqlQuery);

        console.log('Migration output:', result.output);
        console.log('Changes affected columns/rows if any.');
        console.log('Migration applied successfully.');

    } catch (err) {
        console.error('Migration FAILED!');
        console.error(err);
    } finally {
        process.exit();
    }
}

applyMigration();
