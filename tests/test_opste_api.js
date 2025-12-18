const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/opste/stats',
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
            console.log('Response is valid JSON');

            console.log('--- PREGLED ---');
            console.log('Novosti:', json.pregled.novosti);
            console.log('Teme:', json.pregled.tema);
            console.log('Stavki:', json.pregled.stavki);
            console.log('Dogadjaja:', json.pregled.dogadjaja);
            console.log('Zapisa:', json.pregled.zapisa);
            console.log('Korisnika:', json.pregled.korisnika);

            console.log('--- IZBOR (Top 5) ---');
            if (json.izbor && json.izbor.length > 0) {
                json.izbor.forEach((u, i) => {
                    console.log(`${i + 1}. ${u.username}: ${u.points} pts (Stavki: ${u.stavki}, Dogadjaja: ${u.dogadjaja}, Zapisa: ${u.zapisa})`);
                });
            } else {
                console.log('No contributors found.');
            }

            process.exit(0);
        } catch (e) {
            console.log('Response is not JSON:', responseBody);
            process.exit(1);
        }
    });
});

req.on('error', (error) => {
    console.error('Request Error:', error);
    process.exit(1);
});

req.end();
