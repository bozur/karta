const { poolPromise } = require('./db');
(async () => {
    try {
        const pool = await poolPromise;
        const result = await pool.query("SELECT eposta, obavjestenja FROM korisnik WHERE obavjestenja IS TRUE");
        console.log('Active Subscribers Count:', result.recordset.length);
        result.recordset.forEach(r => console.log('- ' + r.eposta));
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
})();
