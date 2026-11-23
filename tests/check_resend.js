require('dotenv').config();

async function check() {
    const key = process.env.RESEND_API_KEY;
    const headers = {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
    };

    try {
        console.log('--- DOMAINS ---');
        const resDomains = await fetch('https://api.resend.com/domains', { headers });
        console.log(JSON.stringify(await resDomains.json(), null, 2));

        console.log('--- WEBHOOKS ---');
        const resWebhooks = await fetch('https://api.resend.com/webhooks', { headers });
        console.log(JSON.stringify(await resWebhooks.json(), null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
}
check();
