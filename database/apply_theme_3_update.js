const fs = require('fs');
const path = require('path');
const { sql, poolPromise } = require('../db'); // Import from db.js

async function applyUpdates() {
    try {
        const pool = await poolPromise;
        const sqlFilePath = path.join(__dirname, 'update_theme_3_options.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        console.log('Executing SQL script to update Theme 3...');
        const result = await pool.request().query(sqlContent);

        console.log('SQL Execution Result:', result);
        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error('Error executing SQL script:', err);
        process.exit(1);
    }
}

// Check if run directly
if (require.main === module) {
    applyUpdates();
}

module.exports = applyUpdates;
