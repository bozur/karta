const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { poolPromise, sql } = require('./db');
const session = require('express-session');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const fs = require('fs');
const NodeClam = require('clamscan');

// Dynamic import for file-type (ESM module)
let FileType;
(async () => {
    FileType = await import('file-type');
})();
// Rate limiter for file uploads - STRICT: 5 uploads per day
const uploadLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 5, // 5 uploads per day
    message: { error: 'Можете учитати максимално 5 записа дневно.' },
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
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret_key_change_this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours (can be extended with remember me)
    }
}));



// Serve static files
app.use(express.static(path.join(__dirname, '.')));

// API Routes

// GET /api/comments (Replaces back/comments-get.asp)
app.get('/api/comments', async (req, res) => {

    try {
        const pool = await poolPromise;
        const result = await pool.request().query('select * from CTable_1 where ID=1');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// GET /api/users (Replaces back/users-get.asp)
app.get('/api/users', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('select ID, ime AS fullname, slika_url AS profile_picture_url from korisnik');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// GET /api/points/:id (Replaces back/test4.asp)
app.get('/api/points/:id', async (req, res) => {
    const { id } = req.params;
    const { table } = req.query;

    // Basic validation for table name to prevent SQL injection
    if (!/^\d+$/.test(table)) {
        return res.status(400).json({ error: "Invalid table parameter" });
    }

    const tableName = `Table_${table}`;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('uid', sql.Int, id)
            .query(`select vrsta, podvrsta, razred, vrijeme0, vrijeme1, opis, izvor, tp, tv from ${tableName} WHERE ID = @uid`);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: "Point not found" });
        }

        const row = result.recordset[0];
        res.json({
            vrs: row.vrsta,
            pod: row.podvrsta,
            raz: row.razred,
            vri0: row.vrijeme0,
            vri1: row.vrijeme1,
            opi: row.opis,
            izv: row.izvor,
            prostorno: row.tp,
            vremenski: row.tv
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// POST /api/search (Replaces back/test5.asp)
app.post('/api/search', async (req, res) => {
    const { tabela, vrsta, podvrsta, razred, prostorno, vremenski, izvor, opis } = req.body;

    // Basic validation for table name
    if (!/^\d+$/.test(tabela)) {
        return res.status(400).json({ error: "Invalid table parameter" });
    }

    const tableName = `Table_${tabela}`;

    try {
        const pool = await poolPromise;
        const request = pool.request();

        let query = `SELECT ID, vrsta, podvrsta, razred, vrijeme0, vrijeme1, tacke0, tacke FROM ${tableName}`;
        let conditions = [];

        if (vrsta) {
            conditions.push("vrsta LIKE @vrsta");
            request.input('vrsta', sql.NVarChar, `%${vrsta}%`);
        }
        if (podvrsta) {
            conditions.push("podvrsta LIKE @podvrsta");
            request.input('podvrsta', sql.NVarChar, `%${podvrsta}%`);
        }
        if (razred) {
            conditions.push("razred LIKE @razred");
            request.input('razred', sql.NVarChar, `%${razred}%`);
        }
        if (prostorno) {
            conditions.push("tp LIKE @prostorno");
            request.input('prostorno', sql.NVarChar, `%${prostorno}%`);
        }
        if (vremenski) {
            conditions.push("tv LIKE @vremenski");
            request.input('vremenski', sql.NVarChar, `%${vremenski}%`);
        }
        if (izvor && izvor !== '-1') {
            conditions.push("LEN(ISNULL(LTRIM(RTRIM(izvor)),'')) > @izvorLen");
            request.input('izvorLen', sql.Int, parseInt(izvor));
        }
        if (opis) {
            conditions.push("opis LIKE @opis");
            request.input('opis', sql.NVarChar, `%${opis}%`);
        }

        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }

        const result = await request.query(query);

        const geojson = {
            type: "FeatureCollection",
            features: result.recordset.map(row => ({
                type: "Feature",
                geometry: {
                    type: row.tacke0,
                    coordinates: JSON.parse(row.tacke)
                },
                properties: {
                    id: row.ID,
                    v: row.vrsta,
                    p: row.podvrsta,
                    r: row.razred,
                    v0: row.vrijeme0,
                    v1: row.vrijeme1
                }
            }))
        };

        res.json(geojson);

    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// POST /api/comments (Create new comment)
app.post('/api/comments', async (req, res) => {
    const { parent, content, pings, creator, fullname, profile_picture_url, created_by_admin, created_by_current_user } = req.body;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('parent', sql.Int, parent)
            .input('content', sql.NVarChar, content)
            .input('creator', sql.Int, creator)
            .input('fullname', sql.NVarChar, fullname)
            .input('profile_picture_url', sql.NVarChar, profile_picture_url)
            .input('created_by_admin', sql.Bit, created_by_admin)
            .input('created_by_current_user', sql.Bit, created_by_current_user)
            .query(`
                INSERT INTO comments (parent, created, modified, content, creator, fullname, profile_picture_url, created_by_admin, created_by_current_user, upvote_count, user_has_upvoted, is_new)
                OUTPUT INSERTED.*
                VALUES (@parent, GETDATE(), GETDATE(), @content, @creator, @fullname, @profile_picture_url, @created_by_admin, @created_by_current_user, 0, 0, 1)
            `);

        res.json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// PUT /api/comments/:id (Update comment)
app.put('/api/comments/:id', async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('content', sql.NVarChar, content)
            .query(`
                UPDATE comments
                SET content = @content, modified = GETDATE()
                OUTPUT INSERTED.*
                WHERE id = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: "Comment not found" });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// DELETE /api/comments/:id (Delete comment)
app.delete('/api/comments/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM comments WHERE id = @id');

        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// POST /api/comments/:id/upvote (Upvote comment)
app.post('/api/comments/:id/upvote', async (req, res) => {
    const { id } = req.params;
    const { user_has_upvoted } = req.body; // New state

    try {
        const pool = await poolPromise;
        // Toggle logic: if user_has_upvoted is true, we increment, else decrement
        // Ideally this should be per-user in a separate table, but following the existing schema/logic
        const increment = user_has_upvoted ? 1 : -1;

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('increment', sql.Int, increment)
            .input('user_has_upvoted', sql.Bit, user_has_upvoted)
            .query(`
                UPDATE comments
                SET upvote_count = upvote_count + @increment, user_has_upvoted = @user_has_upvoted
                OUTPUT INSERTED.*
            WHERE id = @id
                `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: "Comment not found" });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

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
                error: 'Немате дозволу за учитавање записа!'
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
        const { fileTypeFromFile } = FileType;
        const fileTypeResult = await fileTypeFromFile(req.file.path);
        const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];

        if (!fileTypeResult || !allowedMimeTypes.includes(fileTypeResult.mime)) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                error: 'Дозвољене врсте записа су: PDF, JPG, PNG'
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
        console.log(`✓ File uploaded by ${korisnik}: ${naziv} (${fileTypeResult.mime}, ${req.file.size} bytes)`);
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
        res.download(record.file_path, record.naziv + '.' + record.file_type);
    } catch (err) {
        console.error('Error retrieving file:', err);
        res.status(500).json({ error: 'Грешка при преузимању фајла' });
    }
});

// Authentication Routes

// POST /api/login
app.get('/api/check-auth', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// GET /api/user-info - Get detailed user information
app.get('/api/user-info', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.session.user.id)
            .query('SELECT id, ime, prezime, korisnik, eposta, slika_url, pristup0, pristup1, brojac_pristupa FROM korisnik WHERE id = @id');

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.recordset[0];
        res.json({
            user: {
                id: user.id,
                ime: user.ime,
                prezime: user.prezime,
                username: user.korisnik,
                email: user.eposta,
                slika_url: user.slika_url,
                pristup0: user.pristup0,
                pristup1: user.pristup1,
                brojac_pristupa: user.brojac_pristupa
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/user/update - Update user profile
app.put('/api/user/update', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { ime, prezime, korisnik, eposta, slika_url, lozinka, nova_lozinka } = req.body;

    // Validate mandatory fields
    if (!eposta || !lozinka) {
        return res.status(400).json({ error: 'лозинка/е-пошта су обавезни' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(eposta)) {
        return res.status(400).json({ error: 'неисправна е-пошта' });
    }

    try {
        const pool = await poolPromise;

        // Get current user data and verify password
        const userResult = await pool.request()
            .input('id', sql.Int, req.session.user.id)
            .query('SELECT * FROM korisnik WHERE id = @id');

        if (userResult.recordset.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const currentUser = userResult.recordset[0];

        // Verify current password
        const passwordMatch = await bcrypt.compare(lozinka, currentUser.lozinka);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Неисправна лозинка' });
        }

        // Prepare update query
        let updateFields = [];
        const request = pool.request();
        request.input('id', sql.Int, req.session.user.id);

        if (ime !== null && ime !== undefined) {
            updateFields.push('ime = @ime');
            request.input('ime', sql.NVarChar, ime || null);
        }

        if (prezime !== null && prezime !== undefined) {
            updateFields.push('prezime = @prezime');
            request.input('prezime', sql.NVarChar, prezime || null);
        }

        if (korisnik !== null && korisnik !== undefined) {
            updateFields.push('korisnik = @korisnik');
            request.input('korisnik', sql.NVarChar, korisnik || null);
        }

        if (eposta) {
            // Check if email is already taken by another user
            const emailCheck = await pool.request()
                .input('eposta', sql.NVarChar, eposta)
                .input('id', sql.Int, req.session.user.id)
                .query('SELECT id FROM korisnik WHERE eposta = @eposta AND id != @id');

            if (emailCheck.recordset.length > 0) {
                return res.status(409).json({ error: 'Е-пошта је већ у употреби' });
            }

            updateFields.push('eposta = @eposta');
            request.input('eposta', sql.NVarChar, eposta);
        }

        if (slika_url !== null && slika_url !== undefined) {
            updateFields.push('slika_url = @slika_url');
            request.input('slika_url', sql.NVarChar, slika_url || null);
        }

        // Handle new password if provided
        if (nova_lozinka) {
            const hashedPassword = await bcrypt.hash(nova_lozinka, 10);
            updateFields.push('lozinka = @nova_lozinka');
            request.input('nova_lozinka', sql.NVarChar, hashedPassword);
        }

        // Execute update if there are fields to update
        if (updateFields.length > 0) {
            const updateQuery = `UPDATE korisnik SET ${updateFields.join(', ')} WHERE id = @id`;
            await request.query(updateQuery);
        }

        // Update session if email or username changed
        if (eposta) {
            req.session.user.email = eposta;
        }
        if (korisnik) {
            req.session.user.username = korisnik;
        }

        res.json({ success: true, message: 'Подаци су успјешно ажурирани' });

    } catch (err) {
        console.error('Error updating user profile:');
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        console.error('Request body:', req.body);
        res.status(500).json({ error: 'Internal server error: ' + err.message });
    }
});


app.post('/api/login', async (req, res) => {
    const { username, password, remember } = req.body;

    try {
        const pool = await poolPromise;
        // Check if username matches email or username column
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT * FROM korisnik WHERE (korisnik = @username OR eposta = @username)');

        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.recordset[0];

        // Verify password
        const match = await bcrypt.compare(password, user.lozinka);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update access stats
        // Set pristup0 only if it's NULL (first login)
        // Always update pristup1 and increment brojac_pristupa
        await pool.request()
            .input('id', sql.Int, user.id)
            .query(`
                UPDATE korisnik 
                SET pristup0 = CASE WHEN pristup0 IS NULL THEN GETDATE() ELSE pristup0 END,
                    pristup1 = GETDATE(),
                    brojac_pristupa = ISNULL(brojac_pristupa, 0) + 1 
                WHERE id = @id
            `);

        // Set session with extended timeout if remember me is checked
        if (remember) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        }

        req.session.user = {
            id: user.id,
            username: user.korisnik,
            email: user.eposta
        };

        res.json({ success: true, redirect: '/karta.html' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/register', async (req, res) => {
    const { email } = req.body;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    try {
        const pool = await poolPromise;

        // Check if email exists
        const checkResult = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT id FROM korisnik WHERE eposta = @email');

        if (checkResult.recordset.length > 0) {
            return res.status(409).json({ error: 'Email already exists' });
        }

        // Generate random password
        const password = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        // Note: 'korisnik' (username) is set to email initially or part of email
        const username = email.split('@')[0].substring(0, 20);

        await pool.request()
            .input('email', sql.NVarChar, email)
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, hashedPassword)
            .query(`
                INSERT INTO korisnik (eposta, korisnik, lozinka, pristup0, brojac_pristupa)
                VALUES (@email, @username, @password, GETDATE(), 0)
            `);

        // Mock sending email
        console.log(`[MOCK EMAIL]To: ${email}, Password: ${password} `);

        res.json({ success: true, message: 'Password sent to email' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/forgot-password
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    try {
        const pool = await poolPromise;

        // Check if email exists
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT id FROM korisnik WHERE eposta = @email');

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate new random password
        const newPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await pool.request()
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, hashedPassword)
            .query('UPDATE korisnik SET lozinka = @password WHERE eposta = @email');

        // Mock sending email
        console.log(`[MOCK EMAIL] To: ${email}, New Password: ${newPassword}`);

        res.json({ success: true, message: 'Password sent to email' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.json({ success: true });
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
