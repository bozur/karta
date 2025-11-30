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

### 3. Virus Scanning (Optional)
- **Package**: `clamscan`
- **Requires**: ClamAV installed on server
- **Behavior**: Gracefully skips if ClamAV not available
- **Action**: Deletes infected files, logs warning

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
npm install express-rate-limit file-type clamscan
```

## ClamAV Setup (Optional)

### Windows:
1. Download ClamAV from https://www.clamav.net/downloads
2. Install and run `clamd` service
3. Default port: 3310

### Linux:
```bash
sudo apt-get install clamav clamav-daemon
sudo systemctl start clamav-daemon
```

### If ClamAV Not Installed:
- Server will log: "⚠ Virus scanner not available"
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
| Virus Scanning | ⚠️ Optional | Requires ClamAV |
| SQL Injection | ✅ Protected | Parameterized queries |
| Path Traversal | ✅ Protected | Unique filenames |
| HTTPS | ❌ Production only | Not for localhost |
| Access Control | ❌ Skipped | Files are public |

## Next Steps

1. **Run database migration** - Add `moze_ucitati` field
2. **Approve users** - Set `moze_ucitati = 1` for trusted users
3. **Test upload** - Try uploading as approved/unapproved user
4. **(Optional) Install ClamAV** - For virus scanning
5. **Production deployment** - Enable HTTPS

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
