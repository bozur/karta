const fs = require('fs');
const path = require('path');
const { poolPromise } = require('../db');

async function applyUpdates() {
    try {
        const pool = await poolPromise;
        const sqlFilePath = path.join(__dirname, 'update_theme_options_20251206.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        console.log('Executing SQL script...');
        const result = await pool.request().query(sqlContent);

        console.log('SQL Execution Result:', result);
        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error('Error executing SQL script:', err);
        process.exit(1);
    }
}

applyUpdates();
