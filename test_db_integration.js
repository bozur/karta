const { poolPromise, sql } = require('./db');

async function test() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT 1 as val');
        console.log('DB Test Success:', result.recordset[0].val === 1);
        process.exit(0);
    } catch (err) {
        console.error('DB Test Failed:', err);
        process.exit(1);
    }
}
test();
