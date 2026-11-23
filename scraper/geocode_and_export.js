const fs = require('fs');
const axios = require('axios');
const xlsx = require('xlsx');

async function geocodeAndExport(inputFile = 'raw_data.json', outPrefix = 'output') {
    if (!fs.existsSync(inputFile)) {
        console.error(`${inputFile} not found!`);
        return;
    }
    
    const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
    console.log(`Loaded ${data.length} records. Starting geocoding...`);
    
    let features = [];
    let excelData = [];
    let startIndex = 0;
    
    // Correctly resume from geojson progress so we NEVER restart from 0!
    if (fs.existsSync(`${outPrefix}.geojson`) && fs.existsSync(`${outPrefix}.xlsx`)) {
        try {
            const existingGeo = JSON.parse(fs.readFileSync(`${outPrefix}.geojson`, 'utf-8'));
            if (existingGeo.features && existingGeo.features.length > 0) {
                features = existingGeo.features;
                excelData = features.map(f => f.properties);
                startIndex = features.length;
                console.log(`Resuming geocoding from index ${startIndex} (Item ${startIndex + 1})...`);
            }
        } catch(e) {
            console.error("Failed to parse existing progress", e.message);
        }
    }

    // We loop starting at startIndex 
    for (let i = startIndex; i < data.length; i++) {
        const item = data[i];
        let lat = null;
        let lon = null;
        
        // Optimised to 3 essential queries to not spam the server (which caused 429s)
        const queries = [
            `${item.new_name_gr}, ${item.prefecture}, Greece`,
            `${item.new_name_en}, ${item.prefecture}, Greece`,
            `${item.new_name_gr}, Greece`
        ].filter(q => q !== null);
        
        console.log(`[${i+1}/${data.length}] Geocoding: ${item.new_name_gr}`);
        
        for (let q of queries) {
            try {
                const res = await axios.get('https://nominatim.openstreetmap.org/search', {
                    params: { q: q, format: 'json', limit: 1, email: 'bozur.karta.srb@gmail.com' },
                    headers: { 'User-Agent': 'KartaSrbApp_DataProc/1.0 (Contact: bozur.karta.srb@gmail.com)' },
                    timeout: 10000
                });
                
                if (res.data && res.data.length > 0) {
                    lat = parseFloat(res.data[0].lat);
                    lon = parseFloat(res.data[0].lon);
                    console.log(`   -> Found using: "${q}"`);
                    break;
                }
            } catch (e) {
                if (e.response && e.response.status === 429) {
                    console.error(`   -> Too Many Requests (429)! Nominatim is rate-limiting us. Cooling down for 30 seconds...`);
                    await new Promise(r => setTimeout(r, 30000));
                    
                    try {
                        const retryRes = await axios.get('https://nominatim.openstreetmap.org/search', {
                            params: { q: q, format: 'json', limit: 1, email: 'bozur.karta.srb@gmail.com' },
                            headers: { 'User-Agent': 'KartaSrbApp_DataProc/1.0 (Contact: bozur.karta.srb@gmail.com)' }
                        });
                        if (retryRes.data && retryRes.data.length > 0) {
                            lat = parseFloat(retryRes.data[0].lat);
                            lon = parseFloat(retryRes.data[0].lon);
                            console.log(`   -> Found using retry: "${q}"`);
                            break;
                        }
                    } catch(err) {
                        console.error(`   -> Retry failed.`);
                    }
                } else {
                    console.error(`   -> Error on "${q}": ${e.message}`);
                }
            }
            // Sleep heavily between fallbacks to keep rate very low
            await new Promise(r => setTimeout(r, 2000));
        }
        
        if (lat === null && lon === null) {
            console.log(`   -> Not found after attempts.`);
        }
        
        item.latitude = lat;
        item.longitude = lon;
        
        const feature = {
            type: "Feature",
            properties: { ...item },
            geometry: (lon !== null && lat !== null) ? {
                type: "Point",
                coordinates: [lon, lat]
            } : null
        };
        features.push(feature);
        excelData.push(item);
        
        // Save progress every 10 items
        if ((i + 1) % 10 === 0 || i === data.length - 1) {
            const geojson = { type: "FeatureCollection", features: features };
            fs.writeFileSync(`${outPrefix}.geojson`, JSON.stringify(geojson, null, 2), 'utf-8');
            
            const wb = xlsx.utils.book_new();
            const ws = xlsx.utils.json_to_sheet(excelData);
            xlsx.utils.book_append_sheet(wb, ws, "Renamings");
            xlsx.writeFile(wb, `${outPrefix}.xlsx`);
            console.log(`   [Progress saved]`);
        }
        
        // Base sleep between records
        await new Promise(r => setTimeout(r, 1500));
    }
    
    console.log(`Finished geocoding! Saved to ${outPrefix}.geojson and ${outPrefix}.xlsx`);
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const isSample = args.includes('--sample');
    geocodeAndExport(isSample ? 'sample_raw_data.json' : 'raw_data.json', isSample ? 'sample' : 'output');
} else {
    module.exports = geocodeAndExport;
}
