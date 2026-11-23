const fs = require('fs');
const path = require('path');
const { PDFParse, VerbosityLevel } = require('pdf-parse');

const PDF_PATH = path.join(__dirname, 'Die_Slaven_in_Griechenland.pdf');
const PAGES_JSON = path.join(__dirname, 'pdf_pages.json');

async function dumpPages() {
    if (fs.existsSync(PAGES_JSON)) {
        console.log('pdf_pages.json already exists.');
        return;
    }
    console.log('Extracting all pages from PDF...');
    const dataBuffer = fs.readFileSync(PDF_PATH);
    const parser = new PDFParse({ verbosity: VerbosityLevel.ERRORS, data: dataBuffer });
    await parser.load();
    const result = await parser.getText();
    console.log(`Extracted ${result.pages.length} pages.`);
    fs.writeFileSync(PAGES_JSON, JSON.stringify(result.pages, null, 2));
    console.log('Saved to pdf_pages.json');
}

dumpPages().catch(err => console.error(err));
