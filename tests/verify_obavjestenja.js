
const { poolPromise, sql } = require('../db');

async function testUpdate() {
    try {
        const pool = await poolPromise;
        const testUserId = 10; // Use haiduk user for testing (safely)

        console.log('--- Phase 1: Verify current state ---');
        const initialRes = await pool.request()
            .input('id', sql.Int, testUserId)
            .query('SELECT obavjestenja FROM korisnik WHERE id = @id');
        console.log('Initial obavjestenja:', initialRes.recordset[0].obavjestenja);

        console.log('--- Phase 2: Update to 1 ---');
        await pool.request()
            .input('id', sql.Int, testUserId)
            .input('val', sql.Int, 1)
            .query('UPDATE korisnik SET obavjestenja = @val WHERE id = @id');

        const check1 = await pool.request()
            .input('id', sql.Int, testUserId)
            .query('SELECT obavjestenja FROM korisnik WHERE id = @id');
        console.log('After update 1:', check1.recordset[0].obavjestenja);

        console.log('--- Phase 3: Update to 0 ---');
        await pool.request()
            .input('id', sql.Int, testUserId)
            .input('val', sql.Int, 0)
            .query('UPDATE korisnik SET obavjestenja = @val WHERE id = @id');

        const check0 = await pool.request()
            .input('id', sql.Int, testUserId)
            .query('SELECT obavjestenja FROM korisnik WHERE id = @id');
        console.log('After update 0:', check0.recordset[0].obavjestenja);

        // Reset to null or original if needed, but 0 is fine for now

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        process.exit(0);
    }
}

testUpdate();
