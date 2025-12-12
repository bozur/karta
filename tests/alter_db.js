const { poolPromise, sql } = require('./db');

async function alterTable() {
    try {
        const pool = await poolPromise;
        console.log('Altering table korisnik...');
        await pool.request().query('ALTER TABLE korisnik ALTER COLUMN lozinka NVARCHAR(255)');
        console.log('Table altered successfully.');
    } catch (err) {
        console.error('Error altering table:', err);
    } finally {
        // Close connection if possible, but pool might keep it open.
        // Just exit.
        process.exit();
    }
}

alterTable();
