const puppeteer = require('puppeteer');
const fs = require('fs');

async function fetchItems(limit = null) {
    if (!fs.existsSync('links.json')) {
        console.error("links.json not found!");
        return;
    }
    
    let links = JSON.parse(fs.readFileSync('links.json', 'utf-8'));
    if (limit) {
        links = links.filter(url => !url.endsWith('/4968')).slice(0, limit);
    } else {
        links = links.filter(url => !url.endsWith('/4968'));
    }
    
    // Load existing progress
    let rawData = [];
    if (fs.existsSync('raw_data.json') && !limit) {
        rawData = JSON.parse(fs.readFileSync('raw_data.json', 'utf-8'));
        console.log(`Resuming from ${rawData.length} already processed items...`);
    }

    const processedUrls = new Set(rawData.map(d => d.source_url));
    const toProcess = links.filter(url => !processedUrls.has(url));
    
    console.log(`${toProcess.length} items to process.`);
    if (toProcess.length === 0) return rawData;

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    
    for (let i = 0; i < toProcess.length; i++) {
        const url = toProcess[i];
        console.log(`[${i+1}/${toProcess.length}] Fetching ${url} ...`);
        
        let attempts = 0;
        let success = false;
        while (attempts < 3 && !success) {
            try {
                await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
                
                const itemData = await page.evaluate(() => {
                    const fields = {
                        old_name_gr: "", old_name_en: "",
                        new_name_gr: "", new_name_en: "",
                        old_name_alternative: "", new_name_alternative: "",
                        prefecture: "", province: "",
                        renaming_date: "", official_journal: "",
                        community_or_municipality: "",
                        name_of_community_or_municipality: ""
                    };
                    
                    const items = document.querySelectorAll('div.ekt_met_item');
                    items.forEach(item => {
                        const divs = Array.from(item.querySelectorAll('div'));
                        if (divs.length >= 4) {
                            const val_gr = divs[1].innerText.trim();
                            const lbl_en = divs[2].innerText.trim().toLowerCase();
                            const val_en = divs[3].innerText.trim();
                            
                            if (lbl_en.includes('old name') && !lbl_en.includes('alternative')) {
                                fields.old_name_gr = val_gr; fields.old_name_en = val_en;
                            } else if (lbl_en.includes('new name') && !lbl_en.includes('alternative')) {
                                fields.new_name_gr = val_gr; fields.new_name_en = val_en;
                            } else if (lbl_en.includes('old name (alternative)')) {
                                fields.old_name_alternative = val_gr; // or en
                            } else if (lbl_en.includes('new name (alternative)')) {
                                fields.new_name_alternative = val_gr;
                            } else if (lbl_en.includes('prefecture')) {
                                fields.prefecture = val_en; // We keep English/Latin for geocoding
                            } else if (lbl_en.includes('province')) {
                                fields.province = val_en;
                            } else if (lbl_en.includes('date of renaming')) {
                                fields.renaming_date = val_en;
                            } else if (lbl_en.includes('official journal')) {
                                fields.official_journal = val_en;
                            } else if (lbl_en.includes('name of community')) {
                                fields.name_of_community_or_municipality = val_en;
                            } else if (lbl_en.includes('community or municipality')) {
                                fields.community_or_municipality = val_en;
                            }
                        }
                    });
                    return fields;
                });
                
                itemData.source_url = url;
                rawData.push(itemData);
                success = true;
                
            } catch (e) {
                console.error(`Attempt ${attempts+1} failed: ${e.message}`);
                attempts++;
                await new Promise(r => setTimeout(r, 2000));
            }
        }
        
        if (!success) {
            console.error(`Failed to process ${url} after 3 attempts.`);
        }
        
        // Save progress every 10 items or if it's the target limit file
        if ((i + 1) % 10 === 0 || limit) {
            fs.writeFileSync(limit ? 'sample_raw_data.json' : 'raw_data.json', JSON.stringify(rawData, null, 2), 'utf-8');
        }
    }
    
    await browser.close();
    fs.writeFileSync(limit ? 'sample_raw_data.json' : 'raw_data.json', JSON.stringify(rawData, null, 2), 'utf-8');
    console.log("Extraction complete.");
    return rawData;
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const isSample = args.includes('--sample');
    fetchItems(isSample ? 5 : null);
} else {
    module.exports = fetchItems;
}
