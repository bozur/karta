const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/points/2222?table=1',
    method: 'GET'
};

const req = http.request(options, (res) => {
    console.log(`statusCode: ${res.statusCode}`);

    let responseBody = '';

    res.on('data', (chunk) => {
        responseBody += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(responseBody);
            console.log('Response:', JSON.stringify(json, null, 2));
        } catch (e) {
            console.log('Response is not JSON:', responseBody);
        }
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.end();
