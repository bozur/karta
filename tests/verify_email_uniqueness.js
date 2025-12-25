const axios = require('axios');

async function verify() {
    const baseUrl = 'http://localhost:3000';

    console.log('--- Testing /api/user/check-email ---');
    try {
        // Try to find an existing email first
        const { poolPromise } = require('./db');
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT TOP 1 eposta FROM korisnik WHERE eposta IS NOT NULL');

        if (result.recordset.length === 0) {
            console.log('No users found in database to test against.');
            process.exit(0);
        }

        const existingEmail = result.recordset[0].eposta;
        console.log(`Found existing email: ${existingEmail}`);

        // 1. Check existing email availability
        const checkRes = await axios.post(`${baseUrl}/api/user/check-email`, { email: existingEmail });
        console.log('Check existing email (expecting available: false):', checkRes.data);

        // 2. Check new email availability
        const newEmail = `test_${Date.now()}@example.com`;
        const checkNewRes = await axios.post(`${baseUrl}/api/user/check-email`, { email: newEmail });
        console.log('Check new email (expecting available: true):', checkNewRes.data);

        // 3. Test registration conflict
        console.log('--- Testing /api/register conflict ---');
        try {
            await axios.post(`${baseUrl}/api/register`, { email: existingEmail });
        } catch (err) {
            if (err.response && err.response.status === 409) {
                console.log('Registration conflict received (409):', err.response.data);
                if (err.response.data.error === 'Адреса е-поште се већ користи') {
                    console.log('Correct Serbian error message received!');
                } else {
                    console.log('Incorrect error message:', err.response.data.error);
                }
            } else {
                console.log('Registration failed with unexpected error:', err.message);
            }
        }

    } catch (err) {
        console.error('Verification failed:', err.message);
    }
    process.exit(0);
}

verify();
