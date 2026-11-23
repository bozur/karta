const puppeteer = require('puppeteer');
const fs = require('fs');

async function fetchLinks() {
    console.log("Launching puppeteer for link fetching...");
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
    await page.setDefaultNavigationTimeout(120000); // 2 minutes just in case

    const allLinks = [];
    
    try {
        // We try to request 4500 items at once to avoid pagination complexities. 
        // If this times out, we will fall back to pagination logic.
        const url = 'https://pandektis.ekt.gr/pandektis/handle/10442/4968/browse?type=title&sort_by=1&order=ASC&rpp=4500';
        console.log("Navigating to:", url);
        
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        console.log("Extracting links...");
        const links = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            return anchors
                .map(a => a.href)
                .filter(href => href.match(/\/pandektis\/handle\/10442\/\d+$/));
        });
        
        const uniqueLinks = [...new Set(links)];
        console.log(`Found ${uniqueLinks.length} unique item links.`);
        
        fs.writeFileSync('links.json', JSON.stringify(uniqueLinks, null, 2), 'utf-8');
        console.log("Saved to links.json. You can inspect it to verify.");
        
    } catch (e) {
        console.error("Error fetching links:", e.message);
    } finally {
        await browser.close();
    }
}

fetchLinks();
