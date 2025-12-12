const { poolPromise, sql } = require('./db');
const bcrypt = require('bcrypt');

async function debugInsert() {
    try {
        const pool = await poolPromise;
        const email = `debug_${Date.now()}@example.com`;
        const username = email.split('@')[0].substring(0, 20);
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log(`Attempting to insert:
        Email: ${email} (Length: ${email.length})
        Username: ${username} (Length: ${username.length})
        Password: ${hashedPassword} (Length: ${hashedPassword.length})
        `);

        await pool.request()
            .input('email', sql.NVarChar, email)
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, hashedPassword)
            .query(`
                INSERT INTO korisnik (eposta, korisnik, lozinka, pristup0, brojac_pristupa)
                VALUES (@email, @username, @password, GETDATE(), 0)
            `);

        console.log('Insert successful!');
    } catch (err) {
        console.error('Insert failed!');
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
        console.error('Full error:', err);
    } finally {
        process.exit();
    }
}

debugInsert();
