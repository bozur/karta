const { sql, poolPromise } = require('../db');

async function verify() {
    try {
        const pool = await poolPromise;

        console.log('Verifying options for Theme 3...');
        const result = await pool.request()
            .query("SELECT tip, redosled, vrednost FROM teme_opcije WHERE tema_id = 3 ORDER BY tip, redosled");

        const options = {
            razred: [],
            vrsta: [],
            podvrsta: []
        };

        result.recordset.forEach(row => {
            if (options[row.tip]) {
                options[row.tip].push(row.vrednost);
            }
        });

        console.log('Current Options for Theme 3:');
        console.log(JSON.stringify(options, null, 2));

        // Basic assertion logic
        const expectedVrsta = ['вода', 'равница', 'узвишење'];
        // Note: podvrsta might not be sorted in the array purely by logic but by redosled.
        // My script inserted them with redosled 0..5.
        // 'мјесто', 'ријека', 'језеро', 'море', 'област', 'планина'

        const actualVrsta = options.vrsta;
        const actualPodvrsta = options.podvrsta;

        // Check lengths
        if (actualVrsta.length !== 3) console.error('FAIL: Expected 3 vrsta options, got ' + actualVrsta.length);
        if (actualPodvrsta.length !== 6) console.error('FAIL: Expected 6 podvrsta options, got ' + actualPodvrsta.length);

        // Check content (simplified)
        if (JSON.stringify(actualVrsta) === JSON.stringify(expectedVrsta)) {
            console.log('PASS: Vrsta options match.');
        } else {
            console.error('FAIL: Vrsta options mismatch.');
        }

        console.log('Done.');
        process.exit(0);

    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

if (require.main === module) {
    verify();
}
