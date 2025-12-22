const { poolPromise, sql } = require('./db');

async function findEditor() {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query('SELECT top 1 id, eposta, korisnik, urednik FROM korisnik WHERE urednik = 1');

        if (result.recordset.length > 0) {
            console.log('Found Editor:');
            console.log(JSON.stringify(result.recordset[0], null, 2));
        } else {
            console.log('No editor found with urednik = 1');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

findEditor();
