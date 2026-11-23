const { poolPromise } = require('./db');

async function getFirstId() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT TOP 1 ID FROM Table_1");
        console.log('First ID:', result.recordset[0]);
        process.exit(0);
    } catch (err) {
        console.error('Error fetching ID:', err);
        process.exit(1);
    }
}
getFirstId();
