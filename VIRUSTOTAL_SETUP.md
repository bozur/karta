# VirusTotal Setup Instructions

## For Local Development

1. **Add API Key to .env file**
   
   Open your `.env` file and add:
   ```
   VIRUSTOTAL_API_KEY=bcfda9cc681892ecf161fae506d431f17f0733ca33b3a0945e20e037ac9355e9
   ```

2. **Restart your server**
   
   Stop the current server (Ctrl+C) and restart:
   ```bash
   npm start
   ```
   
   You should see:
   ```
   ✓ VirusTotal virus scanning enabled
   ```

## For Render.com Deployment

1. **Go to your Render dashboard**
   - Navigate to https://dashboard.render.com
   - Select your service (karta)

2. **Add Environment Variable**
   - Click on "Environment" in the left sidebar
   - Click "Add Environment Variable"
   - Key: `VIRUSTOTAL_API_KEY`
   - Value: `bcfda9cc681892ecf161fae506d431f17f0733ca33b3a0945e20e037ac9355e9`
   - Click "Save Changes"

3. **Deploy**
   - Render will automatically redeploy with the new environment variable
   - Check logs to verify: "✓ VirusTotal virus scanning enabled"

## Testing Virus Scanning

### Test 1: Upload Clean File
1. Log in to your application
2. Go to "zapisi" tab
3. Upload a legitimate PDF or image
4. Check server logs - should see: "✓ VirusTotal scan complete: Clean"

### Test 2: Upload EICAR Test Virus
1. Create EICAR test file (standard antivirus test file):
   ```
   X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*
   ```
2. Save as `test-virus.txt`
3. Try to upload it
4. Should be rejected with: "Фајл садржи вирус и није могао бити учитан"
5. Check logs - should see: "⚠ Virus detected in upload"

## Expected Behavior

### With API Key Configured:
- All file uploads are scanned by VirusTotal (70+ antivirus engines)
- Clean files: Upload proceeds normally
- Infected files: Upload rejected, file deleted, user sees error message
- Scan time: 5-10 seconds per file

### Without API Key:
- Warning on startup: "⚠ VirusTotal API key not configured"
- Uploads proceed without virus scanning
- All other security checks still active (file type, size, rate limiting, etc.)

## API Limits (Free Tier)

- **500 requests/day** - More than enough for your use case
- **4 requests/minute** - Rate limiting prevents exceeding this
- **32MB file size** - Your app limits to 10MB, so well within limits

## Troubleshooting

### "VirusTotal API key not configured"
- Check that `.env` file contains `VIRUSTOTAL_API_KEY`
- Verify no typos in the key
- Restart the server after adding the key

### "VirusTotal scan timeout"
- Network issue or VirusTotal API slow
- Upload will proceed without scanning (fail-open for availability)
- Check your internet connection

### "VirusTotal scan error"
- Could be invalid API key
- Could be API rate limit exceeded
- Check server logs for detailed error message
- Upload will proceed without scanning (fail-open)
