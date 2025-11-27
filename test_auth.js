const axios = require('axios');
const assert = require('assert');

const BASE_URL = 'http://localhost:3000/api';
let cookie;

async function runTests() {
    console.log('Starting Auth Tests...');

    // 1. Register a new user
    const email = `testuser_${Date.now()}@example.com`;
    console.log(`\n1. Testing Registration with ${email}...`);
    try {
        const res = await axios.post(`${BASE_URL}/register`, { email });
        assert.strictEqual(res.data.success, true);
        console.log('   PASS: Registration successful');
    } catch (err) {
        console.error('   FAIL:', err.response ? err.response.data : err.message);
    }

    // 2. Login with invalid credentials
    console.log('\n2. Testing Login with invalid credentials...');
    try {
        await axios.post(`${BASE_URL}/login`, { username: email, password: 'wrongpassword' });
        console.error('   FAIL: Should have failed');
    } catch (err) {
        if (err.response && err.response.status === 401) {
            console.log('   PASS: Login failed as expected');
        } else {
            console.error('   FAIL:', err.message);
        }
    }

    // Note: We can't easily test valid login because we don't know the random password generated.
    // However, we can verify that the user exists in the DB (manually or via a check script if we had one).
    // For this automated test, we'll assume registration worked if it returned success.
    // To test login properly, we'd need to either:
    // a) Have a way to get the password (it's logged in server console, but script can't see it easily)
    // b) Seed the DB with a known user.

    // Let's try to register a duplicate user
    console.log('\n3. Testing Duplicate Registration...');
    try {
        await axios.post(`${BASE_URL}/register`, { email });
        console.error('   FAIL: Should have failed');
    } catch (err) {
        if (err.response && err.response.status === 409) {
            console.log('   PASS: Duplicate registration failed as expected');
        } else {
            console.error('   FAIL:', err.message);
        }
    }

    // 4. Check Auth (should fail)
    console.log('\n4. Testing Check Auth (Unauthenticated)...');
    try {
        await axios.get(`${BASE_URL}/check-auth`);
        console.error('   FAIL: Should have failed');
    } catch (err) {
        if (err.response && err.response.status === 401) {
            console.log('   PASS: Check Auth failed as expected');
        } else {
            console.error('   FAIL:', err.message);
        }
    }

    console.log('\nTests Completed.');
}

runTests();
