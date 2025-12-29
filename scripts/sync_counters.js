
const { poolPromise, sql } = require('./db');

async function syncCounters() {
    console.log('--- Starting Counter Synchronization ---');
    let pool;
    try {
        pool = await poolPromise;

        // 1. Get all users
        const usersResult = await pool.request().query('SELECT id, korisnik FROM korisnik');
        const users = usersResult.recordset;
        console.log(`Found ${users.length} users.`);

        // 2. Get all themes to know which Table_X to check
        const themesResult = await pool.request().query('SELECT id FROM teme');
        const themes = themesResult.recordset;

        for (const user of users) {
            console.log(`Syncing stats for user: ${user.korisnik} (ID: ${user.id})...`);

            // a. Sync Zapisi
            const zapisiResult = await pool.request()
                .input('userId', sql.Int, user.id)
                .query("SELECT COUNT(*) as count FROM zapisi WHERE korisnik_id = @userId AND stanje IN ('0', '1')");
            const zapisiCount = zapisiResult.recordset[0].count;

            // b. Sync Dogadjaji
            const dogadjajiResult = await pool.request()
                .input('userId', sql.Int, user.id)
                .query("SELECT COUNT(*) as count FROM dogadjaji WHERE korisnik_id = @userId AND stanje IN ('0', '1')");
            const dogadjajiCount = dogadjajiResult.recordset[0].count;

            // c. Sync Stavki (Iterate through all Table_X)
            let stavkiCount = 0;
            for (const theme of themes) {
                const tableName = `Table_${theme.id}`;
                try {
                    const stavkiResult = await pool.request()
                        .input('userId', sql.Int, user.id)
                        .query(`SELECT COUNT(*) as count FROM ${tableName} WHERE dodao = @userId AND stanje IN ('0', '1')`);
                    stavkiCount += stavkiResult.recordset[0].count;
                } catch (err) {
                    // Table might not exist yet for new themes
                }
            }

            // d. Update korisnik table
            await pool.request()
                .input('userId', sql.Int, user.id)
                .input('stavki', sql.Int, stavkiCount)
                .input('zapisi', sql.Int, zapisiCount)
                .input('dogadjaji', sql.Int, dogadjajiCount)
                .query(`
                    UPDATE korisnik 
                    SET brojac_stavki = @stavki, 
                        brojac_zapisa = @zapisi, 
                        brojac_dogadjaja = @dogadjaji 
                    WHERE id = @userId
                `);

            console.log(`   ✓ Stavki: ${stavkiCount}, Zapisi: ${zapisiCount}, Dogadjaji: ${dogadjajiCount}`);
        }

        console.log('--- Synchronization Complete ---');
        process.exit(0);
    } catch (err) {
        console.error('Error during synchronization:', err);
        process.exit(1);
    }
}

syncCounters();
