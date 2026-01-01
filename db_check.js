const { poolPromise } = require('./db');

(async () => {
    try {
        const pool = await poolPromise;

        console.log('--- Checking PostGIS ---');
        try {
            const version = await pool.query('SELECT PostGIS_Full_Version()');
            console.log('PostGIS Version:', version.recordset[0]);
        } catch (err) {
            console.error('PostGIS Check Failed:', err.message);
        }

        console.log('--- Checking Function Existence ---');
        try {
            const func = await pool.query("SELECT proname, nspname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE proname = 'st_geomfromtext'");
            console.log('Found functions:', func.recordset);
        } catch (err) {
            console.error('Function Check Failed:', err.message);
        }

        console.log('--- Checking Search Path ---');
        try {
            const path = await pool.query('SHOW search_path');
            console.log('Search Path:', path.recordset);
        } catch (err) {
            console.error('Search Path Check Failed:', err.message);
        }

        process.exit(0);

    } catch (err) {
        console.error('Script Error:', err);
        process.exit(1);
    }
})();
