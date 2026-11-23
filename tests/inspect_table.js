const { poolPromise, sql } = require('./db');

async function getTableData() {
    try {
        const pool = await poolPromise;
        // Try to fetch distinct values for dropdowns from Table_1 as an example
        const result = await pool.request().query(`
            SELECT DISTINCT razred FROM Table_1;
            SELECT DISTINCT vrsta FROM Table_1;
            SELECT DISTINCT podvrsta FROM Table_1;
        `);

        console.log("Razred:", result.recordsets[0]);
        console.log("Vrsta:", result.recordsets[1]);
        console.log("Podvrsta:", result.recordsets[2]);

    } catch (err) {
        console.error("Error:", err);
    }
}

getTableData();
