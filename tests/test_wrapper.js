const { poolPromise } = require('./db');
require('dotenv').config();

async function testWrapper() {
    console.log('--- Testing db.js Wrapper ---');
    try {
        const pool = await poolPromise;

        // Exact query from the error log
        const query = "SELECT ID, vrsta, podvrsta, razred, vrijeme0, vrijeme1, tacke0, tacke FROM Table_1 WHERE stanje = '1'";
        console.log('Executing Query:', query);

        const result = await pool.request().query(query);
        console.log('✓ Success! Rows fetched:', result.recordset.length);

    } catch (err) {
        console.error('✗ Wrapper Test Failed:', err.message);
        if (err.message.includes('relation "table_1" does not exist')) {
            console.log('Analysis: Postgres cannot find table_1 when invoked via db.js.');
        }
    }
}

testWrapper();
