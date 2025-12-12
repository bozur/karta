const { poolPromise } = require('./db');

async function inspectTpTv() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT TOP 5 tp, tv FROM Table_1");
        console.log("TP/TV sample:", result.recordset);
    } catch (err) {
        console.error("Error:", err);
    }
}

inspectTpTv();
