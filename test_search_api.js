const http = require('http');

const data = JSON.stringify({
    tabela: "1",
    vrsta: "",
    podvrsta: "",
    razred: "",
    prostorno: "",
    vremenski: "",
    izvor: "-1",
    opis: ""
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/search',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
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
            console.log('Response is valid JSON');
            console.log('Feature count:', json.features ? json.features.length : 'N/A');
            if (json.features && json.features.length > 0) {
                console.log('First feature:', JSON.stringify(json.features[0], null, 2));
            } else {
                console.log('Full response:', responseBody);
            }
        } catch (e) {
            console.log('Response is not JSON:', responseBody);
        }
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
