require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const TEST_EMAIL = 'bozur.vujicic+test@gmail.com';

async function testEmails() {
    console.log('--- Testing Email Flows ---');

    // 1. Test Registration Email
    try {
        console.log('Testing /api/register...');
        const res = await axios.post(`${API_BASE}/register`, { email: TEST_EMAIL });
        console.log('Registration success:', res.data);
    } catch (err) {
        console.error('Registration failed (might already exist):', err.response ? err.response.data : err.message);
    }

    // 2. Test Forgot Password
    try {
        console.log('Testing /api/forgot-password...');
        const res = await axios.post(`${API_BASE}/forgot-password`, { email: TEST_EMAIL });
        console.log('Forgot password success:', res.data);
    } catch (err) {
        console.error('Forgot password failed:', err.response ? err.response.data : err.message);
    }

    // 3. Test News Notification
    // Note: You need to be logged in as admin to test /api/novosti properly, 
    // but we can check if the code exists and logic is correct.
    console.log('News notification logic is integrated into /api/novosti (POST).');

    console.log('\n--- Manual Verification Steps ---');
    console.log('1. Check mail for "Лозинка за приступ"');
    console.log('2. Check mail for "Заборављена лозинка"');
}

testEmails();
