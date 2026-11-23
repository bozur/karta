const { poolPromise, sql } = require('../db');

async function addTheme() {
    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        const request = new sql.Request(transaction);

        console.log('Adding theme "тврђаве"...');

        // 1. Insert Theme
        const themeResult = await request
            .input('naziv', sql.NVarChar, 'тврђаве')
            .input('opis', sql.NVarChar, 'Локалитети тврђава и утврђења')
            .query(`
                INSERT INTO teme (naziv, opis, zakljucano)
                VALUES (@naziv, @opis, false)
                ON CONFLICT (naziv) DO UPDATE SET naziv = EXCLUDED.naziv
                RETURNING id
            `);

        const themeId = themeResult.recordset[0].id;
        console.log(`Theme ID: ${themeId}`);

        // 2. Clear existing options for this theme (to make it idempotent)
        await request.input('themeId', sql.Int, themeId).query('DELETE FROM teme_opcije WHERE tema_id = @themeId');

        // 3. Insert Options
        const options = [
            // razred: "предримска","римска","средњи вијек", "нови вијек"
            { tip: 'razred', vrednost: 'предримска' },
            { tip: 'razred', vrednost: 'римска' },
            { tip: 'razred', vrednost: 'средњи вијек' },
            { tip: 'razred', vrednost: 'нови вијек' },
            // vrsta: "насеље","религија","војска"
            { tip: 'vrsta', vrednost: 'насеље' },
            { tip: 'vrsta', vrednost: 'религија' },
            { tip: 'vrsta', vrednost: 'војска' },
            // podvrsta: "брдска","равничарска","поморска", "пећинска"
            { tip: 'podvrsta', vrednost: 'брдска' },
            { tip: 'podvrsta', vrednost: 'равничарска' },
            { tip: 'podvrsta', vrednost: 'поморска' },
            { tip: 'podvrsta', vrednost: 'пећинска' }
        ];

        for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            // Calculate redosled per type
            const redosled = options.filter((o, idx) => o.tip === opt.tip && idx < i).length;

            await new sql.Request(transaction)
                .input('tema_id', sql.Int, themeId)
                .input('tip', sql.NVarChar, opt.tip)
                .input('redosled', sql.Int, redosled)
                .input('vrednost', sql.NVarChar, opt.vrednost)
                .query('INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (@tema_id, @tip, @redosled, @vrednost)');
        }

        await transaction.commit();
        console.log('Theme and options added successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error adding theme:', err);
        process.exit(1);
    }
}

addTheme();
