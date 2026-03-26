const { poolPromise, sql } = require('../db');

async function verifyOptions() {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('tema_id', sql.Int, 5)
            .query('SELECT tip, redosled, vrednost FROM teme_opcije WHERE tema_id = @tema_id AND tip = \'razred\' ORDER BY redosled');

        console.log('--- Theme 5 Razred Options ---');
        console.table(result.recordset);

        const commie = result.recordset.find(r => r.vrednost === 'од комуниста');
        const serbs = result.recordset.find(r => r.vrednost === 'од Срба');

        if (commie && serbs) {
            console.log('✅ VERIFICATION SUCCESS: Both options found!');
        } else {
            console.log('❌ VERIFICATION FAILED: One or both options missing!');
        }

    } catch (err) {
        console.error('Verification error:', err);
    } finally {
        process.exit();
    }
}

verifyOptions();
