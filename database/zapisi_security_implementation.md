# Zapisi Security Implementation Summary

## ✅ Implemented Features

### 1. Rate Limiting
- **Limit**: 5 uploads per 24 hours
- **Package**: `express-rate-limit`
- **Error Message**: "Превише захтјева. Можете учитати максимално 5 записа дневно."

### 2. File Content Validation  
- **Package**: `file-type`
- **Validates**: Actual file content (magic numbers), not just extension
- **Allowed**: PDF, JPG, PNG only
- **Prevents**: Renamed executables (.exe → .pdf)

### 3. Virus Scanning
- **Service**: VirusTotal API
- **Requires**: VIRUSTOTAL_API_KEY environment variable
- **Behavior**: Gracefully skips if API key not configured
- **Action**: Deletes infected files, logs detection details
- **Detection**: Uses 70+ antivirus engines

### 4. User Approval System
- **Database Field**: `moze_ucitati` (BIT) in `korisnik` table
- **Default**: 0 (not approved)
- **Check**: Before allowing upload
- **Error**: "Немате дозволу за учитавање записа. Контактирајте администратора."

## Database Migration Required

Run this SQL to add the approval field:

```sql
ALTER TABLE korisnik
ADD moze_ucitati BIT DEFAULT 0;
```

To approve a user for uploads:
```sql
UPDATE korisnik SET moze_ucitati = 1 WHERE id = <user_id>;
```

To approve all existing users:
```sql
UPDATE korisnik SET moze_ucitati = 1;
```

## Upload Endpoint Security Flow

1. ✅ **Rate Limit Check** - Max 5/day
2. ✅ **Authentication** - Must be logged in
3. ✅ **User Approval** - Check `moze_ucitati` field
4. ✅ **File Presence** - File must be uploaded
5. ✅ **Field Validation** - All required fields filled
6. ✅ **File Content Validation** - Verify actual file type
7. ✅ **Virus Scan** - Scan if ClamAV available
8. ✅ **Database Insert** - Save record
9. ✅ **Cleanup on Error** - Delete file if any step fails

## Installation

```bash
npm install express-rate-limit file-type form-data
```

## VirusTotal Setup

### Get API Key:
1. Sign up at https://www.virustotal.com/gui/join-us
2. Navigate to your profile and get your API key
3. Free tier includes:
   - 500 requests/day
   - 4 requests/minute
   - Files up to 32MB

### Configure Environment Variable:
Add to your `.env` file:
```
VIRUSTOTAL_API_KEY=your_api_key_here
```

### On Render.com:
1. Go to your service dashboard
2. Navigate to "Environment" tab
3. Add environment variable:
   - Key: `VIRUSTOTAL_API_KEY`
   - Value: Your API key

### If API Key Not Configured:
- Server will log: "⚠ VirusTotal API key not configured"
- Uploads will continue without virus scanning
- All other security checks still apply

## Security Status

| Feature | Status | Level |
|---------|--------|-------|
| Rate Limiting | ✅ Implemented | 5/day |
| Authentication | ✅ Required | Session-based |
| User Approval | ✅ Implemented | Database flag |
| File Type (Extension) | ✅ Validated | PDF/JPG/PNG |
| File Content | ✅ Validated | Magic numbers |
| File Size | ✅ Limited | 10MB max |
| Virus Scanning | ✅ Implemented | VirusTotal API |
| SQL Injection | ✅ Protected | Parameterized queries |
| Path Traversal | ✅ Protected | Unique filenames |
| HTTPS | ❌ Production only | Not for localhost |
| Access Control | ❌ Skipped | Files are public |

## Next Steps

1. **Add VirusTotal API key** - Set `VIRUSTOTAL_API_KEY` in `.env` file and Render environment
2. **Run database migration** - Add `moze_ucitati` field (if not already done)
3. **Approve users** - Set `moze_ucitati = 1` for trusted users
4. **Test upload** - Try uploading as approved/unapproved user
5. **Production deployment** - Enable HTTPS and configure environment variables

## Error Messages (Serbian)

- **Rate limit**: "Превише захтјева. Можете учитати максимално 5 записа дневно."
- **Not authenticated**: "Морате бити пријављени"
- **Not approved**: "Немате дозволу за учитавање записа. Контактирајте администратора."
- **No file**: "Фајл није изабран"
- **Missing fields**: "Сва поља морају бити попуњена"
- **Invalid file type**: "Неисправна врста фајла. Дозвољене врсте записа су: PDF, JPG, PNG"
- **Virus detected**: "Фајл садржи вирус и није могао бити учитан"
- **General error**: "Грешка при додавању фајла"

## Logging

The server logs:
- ✓ Successful uploads with file details
- ⚠ Virus detections with virus names
- ⚠ Virus scanner unavailable warning on startup
