const http = require('http');

console.log('--- Verifying API Connectivity ---');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v2/themes',
    method: 'GET'
};

const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode === 200) {
            try {
                const themes = JSON.parse(data);
                if (Array.isArray(themes)) {
                    console.log(`✓ Success: Received ${themes.length} themes from API.`);
                    console.log('   First theme:', JSON.stringify(themes[0]));
                } else {
                    console.log('? Warning: API returned 200 but data is not an array.');
                    console.log('   Response:', data.substring(0, 100));
                }
            } catch (e) {
                console.log('✗ Error: Failed to parse JSON response.');
                console.log('   Response preview:', data.substring(0, 100));
            }
        } else {
            console.log(`✗ Error: API returned status ${res.statusCode}`);
            console.log('   Response body:', data.substring(0, 100));
        }
    });
});

req.on('error', (e) => {
    console.error(`✗ Connection Error: ${e.message}`);
    console.log('   Make sure the server is running with `npm start` in another terminal.');
});

req.end();
