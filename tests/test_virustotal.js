// Test script for VirusTotal integration
// Run with: node test_virustotal.js

const path = require('path'); \nrequire('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY;

async function scanFileWithVirusTotal(filePath) {
    if (!VIRUSTOTAL_API_KEY) {
        console.error('❌ VIRUSTOTAL_API_KEY not configured in .env file');
        return { isInfected: false, viruses: [] };
    }

    console.log(`\n🔍 Scanning file: ${filePath}`);
    console.log(`📡 Using API key: ${VIRUSTOTAL_API_KEY.substring(0, 10)}...`);

    try {
        // Step 1: Upload file to VirusTotal
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));

        console.log('⬆️  Uploading file to VirusTotal...');
        const uploadResponse = await axios.post(
            'https://www.virustotal.com/api/v3/files',
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'x-apikey': VIRUSTOTAL_API_KEY
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }
        );

        const analysisId = uploadResponse.data.data.id;
        console.log(`✓ File uploaded for analysis (ID: ${analysisId})`);

        // Step 2: Wait for analysis to complete (poll with timeout)
        const maxAttempts = 12;
        let attempts = 0;

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            attempts++;

            try {
                const analysisResponse = await axios.get(
                    `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
                    {
                        headers: { 'x-apikey': VIRUSTOTAL_API_KEY }
                    }
                );

                const status = analysisResponse.data.data.attributes.status;

                if (status === 'completed') {
                    const stats = analysisResponse.data.data.attributes.stats;
                    const isInfected = stats.malicious > 0 || stats.suspicious > 0;

                    console.log('\n📊 Scan Results:');
                    console.log(`   Malicious: ${stats.malicious}`);
                    console.log(`   Suspicious: ${stats.suspicious}`);
                    console.log(`   Harmless: ${stats.harmless}`);
                    console.log(`   Undetected: ${stats.undetected}`);

                    if (isInfected) {
                        console.log(`\n❌ INFECTED - Detected by ${stats.malicious + stats.suspicious} engines`);
                        return {
                            isInfected: true,
                            viruses: [`Detected by ${stats.malicious + stats.suspicious} engines`]
                        };
                    } else {
                        console.log('\n✅ CLEAN - No threats detected');
                        return { isInfected: false, viruses: [] };
                    }
                }

                console.log(`⏳ Analysis in progress (attempt ${attempts}/${maxAttempts})...`);
            } catch (pollError) {
                console.error('❌ Polling error:', pollError.message);
            }
        }

        console.log('\n⚠️  Scan timeout - no result after 60 seconds');
        return { isInfected: false, viruses: [] };

    } catch (error) {
        console.error('\n❌ VirusTotal scan error:', error.response?.data || error.message);
        return { isInfected: false, viruses: [] };
    }
}

// Test with a file
async function runTest() {
    console.log('='.repeat(60));
    console.log('VirusTotal Integration Test');
    console.log('='.repeat(60));

    // Check if API key is configured
    if (!VIRUSTOTAL_API_KEY) {
        console.error('\n❌ ERROR: VIRUSTOTAL_API_KEY not found in .env file');
        console.log('\nPlease add to your .env file:');
        console.log('VIRUSTOTAL_API_KEY=your_api_key_here');
        process.exit(1);
    }

    console.log('✓ API key configured');

    // Create a test file
    const testFilePath = './test_clean_file.txt';
    fs.writeFileSync(testFilePath, 'This is a clean test file for VirusTotal scanning.');
    console.log(`✓ Created test file: ${testFilePath}`);

    // Scan the file
    const result = await scanFileWithVirusTotal(testFilePath);

    // Cleanup
    fs.unlinkSync(testFilePath);
    console.log('\n✓ Test file cleaned up');

    console.log('\n' + '='.repeat(60));
    console.log('Test Complete!');
    console.log('='.repeat(60));

    if (!result.isInfected) {
        console.log('\n✅ SUCCESS: VirusTotal integration is working correctly!');
        console.log('\nNext steps:');
        console.log('1. Add VIRUSTOTAL_API_KEY to your .env file (if not already done)');
        console.log('2. Add VIRUSTOTAL_API_KEY to Render environment variables');
        console.log('3. Restart your server');
        console.log('4. Test file upload in the application');
    } else {
        console.log('\n⚠️  WARNING: Test file was flagged (unexpected)');
    }
}

runTest().catch(console.error);
