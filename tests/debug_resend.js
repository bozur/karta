require('dotenv').config();
const axios = require('axios');

const apiKey = process.env.RESEND_API_KEY;
const from = 'Kontakt Form <kontakt@1.xn--80atbc.xn--90a3ac>';
const to = ['bozur.vujicic@gmail.com'];

console.log('Using API Key:', apiKey ? (apiKey.substring(0, 10) + '...') : 'MISSING');
console.log('From:', from);

axios.post('https://api.resend.com/emails', {
    from: from,
    to: to,
    subject: 'Debug Test',
    html: '<p>Testing Resend configuration</p>'
}, {
    headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    }
}).then(res => {
    console.log('SUCCESS:', res.data);
}).catch(err => {
    console.error('FAILED:');
    if (err.response) {
        console.error(JSON.stringify(err.response.data, null, 2));
    } else {
        console.error(err.message);
    }
});
