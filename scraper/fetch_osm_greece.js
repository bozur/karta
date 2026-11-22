/**
 * fetch_osm_greece.js
 * Preuzima sve geografske tacke (naselja, sela, засеоке, istorijska/napustena naselja, lokalitete)
 * u Grckoj iz OpenStreetMap Overpass API-ja kako bismo lokalno i trenutno (bez 429 rate-limita)
 * uparili svih 962 toponima kojima nedostaju koordinate, uz proveru prefekture i provincije.
 */

const fs = require('fs');
const path = require('path');

const OUT_FILE = path.join(__dirname, 'osm_greece_places.json');

async function main() {
    console.log('Preuzimanje svih naselja i lokaliteta u Grckoj sa Overpass API...');
    const query = `
[out:json][timeout:120];
area["ISO3166-1"="GR"][admin_level=2]->.gr;
(
  node["place"](area.gr);
  way["place"](area.gr);
  relation["place"](area.gr);
  node["abandoned:place"](area.gr);
  node["historic"](area.gr);
);
out center tags;
`.trim();

    const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://lz4.overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter'
    ];

    for (const url of endpoints) {
        try {
            console.log(`Pokusavam: ${url} ...`);
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'KartaSrbApp_DataProc/1.0'
                },
                body: `data=${encodeURIComponent(query)}`
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (data && Array.isArray(data.elements)) {
                const elements = data.elements.map(el => ({
                    id: el.id,
                    type: el.type,
                    lat: el.lat || (el.center && el.center.lat) || null,
                    lon: el.lon || (el.center && el.center.lon) || null,
                    tags: el.tags || {}
                })).filter(el => el.lat !== null && el.lon !== null && el.tags && (
                    el.tags.name || el.tags['name:el'] || el.tags['name:en'] || el.tags.alt_name || el.tags.old_name
                ));

                console.log(`Uspesno preuzeto ${elements.length} tacaka u Grckoj!`);
                fs.writeFileSync(OUT_FILE, JSON.stringify(elements, null, 2));
                console.log(`Sacuvano u ${OUT_FILE}`);
                return;
            }
        } catch (err) {
            console.error(`Greska na ${url}: ${err.message}`);
        }
    }
    process.exit(1);
}

main();
