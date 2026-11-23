# Security Concepts Explained

## 1. File Content Validation

**What it is:**
Checking the **actual content** of a file, not just the filename extension.

**The Problem:**
- A user can rename `virus.exe` to `document.pdf`
- Your current check only looks at the extension `.pdf`
- The file is actually an executable, not a PDF!

**How it works:**
Every file type has a unique "signature" (called magic numbers) at the beginning:
- PDF files start with: `%PDF`
- JPEG files start with: `FF D8 FF`
- PNG files start with: `89 50 4E 47`

**Example:**
```javascript
const FileType = require('file-type');

// After file upload, check actual content:
const fileType = await FileType.fromFile(filePath);

if (fileType.mime === 'application/x-msdownload') {
    // This is an .exe file disguised as PDF!
    // Delete it and reject upload
}
```

**Why you need it:**
Prevents malicious users from uploading dangerous files disguised as documents.

---

## 2. Access Control

**What it is:**
Controlling **who can download which files**.

**The Problem:**
Right now, **anyone** who knows a file ID can download it:
```
http://yoursite.com/api/zapisi/123
```
- User A uploads a private document (ID: 123)
- User B guesses the URL and downloads User A's private file!

**How it works:**
Before serving a file, check if the user has permission:

```javascript
app.get('/api/zapisi/:id', async (req, res) => {
    const record = await getRecord(id);
    
    // Check if user owns this file
    if (record.korisnik !== req.session.user.username) {
        return res.status(403).json({ 
            error: 'Немате дозволу за преузимање овог записа' 
        });
    }
    
    // User owns it, allow download
    res.download(record.file_path);
});
```

**Options:**
1. **Owner only** - Only the uploader can download
2. **Public** - Everyone can download
3. **Role-based** - Admins can download everything
4. **Shared** - Owner can share with specific users

**Why you need it:**
Protects user privacy and prevents unauthorized access to files.

---

## 3. HTTPS (HTTP Secure)

**What it is:**
Encrypted communication between browser and server.

**The Problem with HTTP:**
```
User's Browser  -->  [PASSWORD: abc123]  -->  Your Server
                  ^
                  |
            Hacker can read this!
```

Everything is sent in **plain text**:
- Passwords
- Session cookies
- Uploaded files
- Personal data

**With HTTPS:**
```
User's Browser  -->  [ENCRYPTED DATA]  -->  Your Server
                  ^
                  |
            Hacker sees gibberish!
```

**How it works:**
1. Get an SSL certificate (free from Let's Encrypt)
2. Configure your server to use HTTPS
3. All data is encrypted automatically

**Example setup:**
```javascript
const https = require('https');
const fs = require('fs');

const options = {
    key: fs.readFileSync('private-key.pem'),
    cert: fs.readFileSync('certificate.pem')
};

https.createServer(options, app).listen(443);
```

**Why you need it:**
- **Critical for production!**
- Prevents password theft
- Prevents session hijacking
- Prevents file interception
- Required for modern browsers

---

## 4. Virus Scanning

**What it is:**
Checking uploaded files for viruses and malware.

**The Problem:**
User uploads `document.pdf` which contains:
- A virus
- Ransomware
- Trojan horse

Other users download it and get infected!

**How it works:**
Use antivirus software to scan files before saving:

```javascript
const NodeClam = require('clamscan');

const clamscan = await new NodeClam().init({
    clamdscan: {
        host: 'localhost',
        port: 3310
    }
});

// After file upload:
const { isInfected, viruses } = await clamscan.isInfected(filePath);

if (isInfected) {
    fs.unlinkSync(filePath); // Delete infected file
    return res.status(400).json({ 
        error: 'Фајл садржи вирус и није могао бити учитан' 
    });
}
```

**Popular solutions:**
1. **ClamAV** - Free, open-source antivirus
2. **VirusTotal API** - Cloud-based scanning
3. **Windows Defender API** - If on Windows server

**Why you need it:**
- Protects your users from malware
- Protects your server from infection
- Legal liability protection
- Professional reputation

---

## Summary Table

| Security Feature | Current Status | Risk Level | Difficulty | Priority |
|-----------------|----------------|------------|------------|----------|
| **Rate Limiting** | ✅ Implemented (5/day) | Low | Easy | ✅ Done |
| **File Type Check** | ✅ Extension only | Medium | Easy | High |
| **Access Control** | ❌ Not implemented | High | Medium | **Critical** |
| **HTTPS** | ❌ Not implemented | **Critical** | Medium | **Critical** |
| **Virus Scanning** | ❌ Not implemented | Medium | Hard | Medium |
| **File Content Validation** | ❌ Not implemented | Medium | Easy | High |

---

## Recommendations for Your Project

### Implement Now (Before Production):
1. ✅ **Rate Limiting** - Done! (5 uploads/day)
2. **Access Control** - Add owner check to downloads
3. **HTTPS** - Get SSL certificate and enable HTTPS

### Implement Soon:
4. **File Content Validation** - Install `file-type` package
5. **Better error messages** - Don't reveal system details

### Optional (Nice to Have):
6. **Virus Scanning** - If handling sensitive documents
7. **Audit logging** - Track all file operations
8. **Backup system** - Regular backups of uploaded files

---

## Quick Implementation Guide

### Access Control (15 minutes):
```javascript
app.get('/api/zapisi/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Морате бити пријављени' });
    }
    
    const record = await getRecord(id);
    
    if (record.korisnik !== req.session.user.username) {
        return res.status(403).json({ error: 'Немате дозволу' });
    }
    
    res.download(record.file_path);
});
```

### File Content Validation (10 minutes):
```bash
npm install file-type
```

```javascript
const FileType = require('file-type');

const type = await FileType.fromFile(req.file.path);
const allowed = ['application/pdf', 'image/jpeg', 'image/png'];

if (!allowed.includes(type.mime)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Неисправна врста фајла' });
}
```

### HTTPS (Production deployment):
```bash
# Get free SSL certificate
sudo certbot --nginx -d yoursite.com
```

Would you like me to implement access control and file content validation now?
