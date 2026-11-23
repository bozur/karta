# Manual Integration Guide for Zapisi Security Features

Since automated edits keep corrupting server.js, here's a step-by-step manual guide.

## Step 1: Add Imports (after line 7)

After this line:
```javascript
const bcrypt = require('bcrypt');
```

Add these 5 lines:
```javascript
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const fs = require('fs');
const FileType = require('file-type');
const NodeClam = require('clamscan');
```

## Step 2: Add Configuration (after line 8, before line 10 `const app = express();`)

Add this entire block (57 lines):
```javascript
// Rate limiter for file uploads - STRICT: 5 uploads per day
const uploadLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 5, // 5 uploads per day
    message: { error: 'Превише захтјева. Можете учитати максимално 5 записа дневно.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Virus scanning (optional - works if ClamAV is installed)
let virusScanner = null;
(async () => {
    try {
        virusScanner = await new NodeClam().init({
            removeInfected: false,
            quarantineInfected: false,
            debugMode: false,
            clamdscan: { host: 'localhost', port: 3310, timeout: 60000 }
        });
        console.log('✓ Virus scanner initialized');
    } catch (err) {
        console.warn('⚠ Virus scanner not available (ClamAV not installed). Files will not be scanned for viruses.');
    }
})();

// Configure multer for file uploads
const uploadDir = path.join(__dirname, 'uploads', 'zapisi');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, uploadDir); },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        cb(null, basename + '_' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /pdf|jpg|jpeg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Дозвољене врсте записа су: PDF, JPG, PNG'));
        }
    }
});
```

## Step 3: Add API Endpoints (before line 284 `// Authentication Routes`)

Search for the comment `// Authentication Routes` and add this entire block BEFORE it:

```javascript
// ============================================
// Zapisi (File Records) API Routes
// ============================================

// GET /api/themes
app.get('/api/themes', async (req, res) => {
    try {
        const themes = [
            'напади на објекте СПЦ',
            'промјена назива',
            'распрострањеност топонима'
        ];
        res.json({ themes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/zapisi/upload - WITH ALL SECURITY FEATURES
app.post('/api/zapisi/upload', uploadLimiter, upload.single('file'), async (req, res) => {
    try {
        // 1. Authentication check
        if (!req.session.user) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(401).json({ error: 'Морате бити пријављени' });
        }

        // 2. User approval check
        const pool = await poolPromise;
        const userCheck = await pool.request()
            .input('id', sql.Int, req.session.user.id)
            .query('SELECT moze_ucitati FROM korisnik WHERE id = @id');

        if (userCheck.recordset.length === 0 || !userCheck.recordset[0].moze_ucitati) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(403).json({ 
                error: 'Немате дозволу за учитавање записа. Контактирајте администратора.' 
            });
        }

        // 3. File presence check
        if (!req.file) {
            return res.status(400).json({ error: 'Фајл није изабран' });
        }

        const { naziv, opis, tema, tagovi } = req.body;
        const korisnik = req.session.user.username;

        // 4. Required fields validation
        if (!naziv || !tema || !tagovi) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Сва поља морају бити попуњена' });
        }

        // 5. File content validation - verify actual file type
        const fileType = await FileType.fromFile(req.file.path);
        const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        
        if (!fileType || !allowedMimeTypes.includes(fileType.mime)) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ 
                error: 'Неисправна врста записа. Дозвољене врсте записа су: PDF, JPG, PNG' 
            });
        }

        // 6. Virus scanning (if ClamAV is available)
        if (virusScanner) {
            try {
                const { isInfected, viruses } = await virusScanner.isInfected(req.file.path);
                if (isInfected) {
                    fs.unlinkSync(req.file.path);
                    console.warn(`⚠ Virus detected in upload by ${korisnik}: ${viruses.join(', ')}`);
                    return res.status(400).json({ 
                        error: 'Фајл садржи вирус и није могао бити учитан' 
                    });
                }
            } catch (scanErr) {
                console.error('Virus scan error:', scanErr);
            }
        }

        // 7. Save to database
        const result = await pool.request()
            .input('naziv', sql.NVarChar, naziv)
            .input('opis', sql.NVarChar, opis || null)
            .input('tema', sql.NVarChar, tema)
            .input('korisnik', sql.NVarChar, korisnik)
            .input('tagovi', sql.NVarChar, tagovi)
            .input('file_path', sql.NVarChar, req.file.path)
            .input('file_type', sql.NVarChar, path.extname(req.file.originalname).substring(1))
            .input('file_size', sql.Int, req.file.size)
            .query(`
                INSERT INTO zapisi (naziv, opis, tema, korisnik, tagovi, file_path, file_type, file_size)
                OUTPUT INSERTED.id
                VALUES (@naziv, @opis, @tema, @korisnik, @tagovi, @file_path, @file_type, @file_size)
            `);

        console.log(`✓ File uploaded by ${korisnik}: ${naziv} (${fileType.mime}, ${req.file.size} bytes)`);

        res.json({
            success: true,
            message: 'Фајл је успјешно додат',
            id: result.recordset[0].id
        });

    } catch (err) {
        console.error('Error uploading file:', err);
        if (req.file) {
            try { fs.unlinkSync(req.file.path); } 
            catch (unlinkErr) { console.error('Error deleting file:', unlinkErr); }
        }
        
        if (err.message.includes('врсте записа')) {
            res.status(400).json({ error: err.message });
        } else {
            res.status(500).json({ error: 'Грешка при додавању фајла' });
        }
    }
});

// POST /api/zapisi/search
app.post('/api/zapisi/search', async (req, res) => {
    try {
        const { naziv, tema, korisnik, opis, tagovi } = req.body;
        const pool = await poolPromise;
        const request = pool.request();

        let query = `
            SELECT id, naziv, opis, tema, korisnik, tagovi, file_type, file_size, created_at
            FROM zapisi
        `;
        let conditions = [];

        if (naziv) {
            conditions.push("naziv LIKE @naziv");
            request.input('naziv', sql.NVarChar, `%${naziv}%`);
        }
        if (tema) {
            conditions.push("tema = @tema");
            request.input('tema', sql.NVarChar, tema);
        }
        if (korisnik) {
            conditions.push("korisnik LIKE @korisnik");
            request.input('korisnik', sql.NVarChar, `%${korisnik}%`);
        }
        if (opis) {
            conditions.push("opis LIKE @opis");
            request.input('opis', sql.NVarChar, `%${opis}%`);
        }
        if (tagovi) {
            conditions.push("tagovi LIKE @tagovi");
            request.input('tagovi', sql.NVarChar, `%${tagovi}%`);
        }

        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }
        query += " ORDER BY created_at DESC";

        const result = await request.query(query);

        res.json({
            success: true,
            results: result.recordset.map(row => ({
                id: row.id,
                naziv: row.naziv,
                opis: row.opis,
                tema: row.tema,
                korisnik: row.korisnik,
                tagovi: row.tagovi,
                file_type: row.file_type,
                file_size: row.file_size,
                created_at: row.created_at
            }))
        });

    } catch (err) {
        console.error('Error searching zapisi:', err);
        res.status(500).json({ error: 'Грешка при претрази' });
    }
});

// GET /api/zapisi/:id - Download file
app.get('/api/zapisi/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM zapisi WHERE id = @id');

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Запис није пронађен' });
        }

        const record = result.recordset[0];

        if (!fs.existsSync(record.file_path)) {
            return res.status(404).json({ error: 'Фајл није пронађен' });
        }

        res.download(record.file.path, record.naziv + '.' + record.file_type);

    } catch (err) {
        console.error('Error retrieving file:', err);
        res.status(500).json({ error: 'Грешка при преузимању фајла' });
    }
});

```

## Verification

After adding all three sections, search for:
- `uploadLimiter` - should find it
- `Неисправна врста записа` - should find it (with записа, not фајла!)
- `moze_ucitati` - should find it in user approval check

## What You Get

✅ All 7 security layers
✅ Correct Serbian terminology ("записа" not "фајла")
✅ Rate limiting (5/day)
✅ File content validation
✅ Virus scanning
✅ User approval system

Save the file and restart the server!
