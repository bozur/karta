# Zapisi Security Considerations

## Current Security Measures

### 1. Authentication
✅ **Implemented** - Upload endpoint requires active session
- Checks `req.session.user` before allowing upload
- Returns 401 if not authenticated
- Cleans up uploaded file if auth fails

### 2. File Type Validation
✅ **Implemented** - Both client and server-side
- **Client**: Checks file extension and MIME type
- **Server**: Multer fileFilter validates extension and MIME type
- Allowed: PDF, JPG, JPEG, PNG only
- Rejects all other file types

### 3. File Size Limit
✅ **Implemented** - 10MB maximum
- Configured in multer limits
- Prevents large file uploads that could fill disk space

### 4. SQL Injection Protection
✅ **Implemented** - Parameterized queries
- All database queries use `sql.input()` parameters
- No string concatenation in SQL queries
- MSSQL driver handles escaping

### 5. Path Traversal Prevention
✅ **Implemented** - Unique filename generation
- Files stored with timestamp + random number
- Original filename not used directly in path
- All files stored in controlled `uploads/zapisi/` directory

### 6. Error Cleanup
✅ **Implemented** - Failed uploads cleaned up
- `fs.unlinkSync()` removes file on validation failure
- Prevents orphaned files from accumulating

## Additional Security Recommendations

### 7. File Content Validation
⚠️ **Recommended** - Verify actual file content
```javascript
// Use a library like 'file-type' to verify actual file content
const FileType = require('file-type');

// In fileFilter or after upload:
const fileType = await FileType.fromFile(filePath);
if (!['application/pdf', 'image/jpeg', 'image/png'].includes(fileType.mime)) {
    // Reject file
}
```

**Risk**: User could rename `.exe` to `.pdf` and bypass extension check
**Mitigation**: Install `file-type` package and verify magic numbers

### 8. Virus Scanning
⚠️ **Recommended** - Scan uploaded files
```javascript
const ClamScan = require('clamscan');
// Scan file before saving to database
```

**Risk**: Malicious files could be uploaded
**Mitigation**: Integrate ClamAV or similar antivirus

### 9. Rate Limiting
⚠️ **Recommended** - Prevent abuse
```javascript
const rateLimit = require('express-rate-limit');

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10 // limit each IP to 10 uploads per windowMs
});

app.post('/api/zapisi/upload', uploadLimiter, upload.single('file'), ...);
```

**Risk**: User could spam uploads
**Mitigation**: Install `express-rate-limit`

### 10. File Access Control
⚠️ **Recommended** - Verify ownership before download
```javascript
app.get('/api/zapisi/:id', async (req, res) => {
    // Check if user owns file or has permission
    const record = await getRecord(id);
    if (record.korisnik !== req.session.user.username && !req.session.user.isAdmin) {
        return res.status(403).json({ error: 'Забрањен приступ' });
    }
    // ... serve file
});
```

**Risk**: Users could download other users' private files
**Mitigation**: Add ownership/permission check

### 11. HTTPS
⚠️ **Critical for Production** - Encrypt data in transit
```javascript
// In production, use HTTPS
cookie: {
    secure: true, // Only send cookie over HTTPS
    httpOnly: true, // Prevent XSS attacks
    sameSite: 'strict' // CSRF protection
}
```

**Risk**: Session hijacking, file interception
**Mitigation**: Deploy with HTTPS certificate

### 12. Input Sanitization
✅ **Partially Implemented** - Validate all inputs
- Currently validates required fields
- Consider adding max length limits
- Sanitize HTML in `opis` field to prevent XSS

### 13. Disk Space Monitoring
⚠️ **Recommended** - Prevent disk fill
```javascript
const diskusage = require('diskusage');

// Before upload, check available space
const { available } = await diskusage.check('/');
if (available < 1024 * 1024 * 1024) { // Less than 1GB
    return res.status(507).json({ error: 'Недовољно простора' });
}
```

**Risk**: Disk could fill up
**Mitigation**: Monitor disk space, set quotas per user

### 14. Audit Logging
⚠️ **Recommended** - Track all uploads/downloads
```javascript
// Log all file operations
console.log(`[AUDIT] User ${username} uploaded file ${filename} at ${new Date()}`);
```

**Risk**: No accountability for file operations
**Mitigation**: Add comprehensive logging

## Priority Recommendations

### High Priority (Implement Soon):
1. **Rate Limiting** - Easy to add, prevents abuse
2. **File Access Control** - Important for privacy
3. **HTTPS in Production** - Critical for security

### Medium Priority:
4. **File Content Validation** - Adds extra layer of security
5. **Disk Space Monitoring** - Prevents service disruption
6. **Audit Logging** - Helps with debugging and compliance

### Low Priority (Nice to Have):
7. **Virus Scanning** - Only if handling sensitive data
8. **Input Sanitization** - Already partially done

## Current Risk Assessment

**Overall Risk Level**: **MEDIUM**

**Strengths**:
- Authentication required
- File type validation
- SQL injection protection
- Path traversal prevention

**Weaknesses**:
- No rate limiting (spam risk)
- No file content verification (bypass risk)
- No access control on downloads (privacy risk)
- HTTP only (interception risk in production)

**Recommendation**: Implement rate limiting and file access control before production deployment.
