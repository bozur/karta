const { poolPromise } = require('./db');

async function inspectColumns() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT TOP 1 * FROM Table_1");
        if (result.recordset.length > 0) {
            console.log("Columns:", Object.keys(result.recordset[0]));
        } else {
            console.log("Table_1 is empty.");
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

inspectColumns();
