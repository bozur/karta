const { poolPromise, sql } = require('../db');

async function testPendingStavke() {
    try {
        const pool = await poolPromise;
        console.log('Connected to database.');

        // 1. Get all themes
        const themesResult = await pool.request().query('SELECT id, naziv FROM teme');
        const themes = themesResult.recordset;
        console.log(`Found ${themes.length} themes.`);

        let totalPending = 0;
        const pendingSummary = [];

        // 2. Check each theme table for pending items
        for (const theme of themes) {
            const tableName = `Table_${theme.id}`;
            try {
                const countResult = await pool.request().query(`SELECT COUNT(*) as count FROM ${tableName} WHERE stanje = '0'`);
                const pendingCount = countResult.recordset[0].count;
                if (pendingCount > 0) {
                    pendingSummary.push({ id: theme.id, naziv: theme.naziv, count: pendingCount });
                    totalPending += pendingCount;
                }
            } catch (err) {
                // Table might not exist
            }
        }

        console.log('--- Pending Stavke Summary ---');
        if (pendingSummary.length === 0) {
            console.log('No pending stavke found in any theme table.');
        } else {
            pendingSummary.forEach(s => {
                console.log(`Theme: ${s.naziv} (ID: ${s.id}) - Pending: ${s.count}`);
            });
            console.log(`Total Pending: ${totalPending}`);
        }

        // 3. Detailed check for one theme if any found
        if (pendingSummary.length > 0) {
            const firstTheme = pendingSummary[0];
            const tableName = `Table_${firstTheme.id}`;
            const detailResult = await pool.request().query(`SELECT TOP 5 ID, opis, dodao_vrijeme FROM ${tableName} WHERE stanje = '0'`);
            console.log(`--- Top 5 Pending Items for ${firstTheme.naziv} ---`);
            detailResult.recordset.forEach(item => {
                console.log(`ID: ${item.ID}, Opis: ${item.opis}, Uneo: ${item.dodao_vrijeme}`);
            });
        }

        process.exit(0);
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
}

testPendingStavke();
