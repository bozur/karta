const { poolPromise, sql } = require('./db');

async function inspect() {
    try {
        const pool = await poolPromise;

        console.log("--- Table_2 ---");
        const t2 = await pool.request().query('SELECT TOP 1 * FROM Table_2');
        console.log(t2.recordset[0]);

        console.log("--- EarthquakeData ---");
        const ed = await pool.request().query('SELECT TOP 1 * FROM EarthquakeData');
        console.log(ed.recordset[0]);

    } catch (err) {
        console.error("Error:", err);
    }
}

inspect();
