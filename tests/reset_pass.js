const { poolPromise, sql } = require('./db');
const bcrypt = require('bcrypt');

async function resetPass() {
    try {
        const pool = await poolPromise;
        const hashedPassword = await bcrypt.hash('password123', 10);

        const result = await pool.request()
            .input('password', sql.NVarChar, hashedPassword)
            .input('username', sql.NVarChar, 'bozur.vujicic')
            .query('UPDATE korisnik SET lozinka = @password WHERE korisnik = @username');

        if (result.rowsAffected[0] > 0) {
            console.log('Password reset successfully for bozur.vujicic to password123');
        } else {
            console.log('User not found');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

resetPass();
