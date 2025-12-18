console.log('--- SERVER RESTARTING: V2 LOADED ---');
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
    const { tabela, vrsta, podvrsta, razred, prostorno, vremenski, izvor, opis, od, do: doDate } = req.body;

    console.log('--- Search Request ---');
    console.log('Tabela:', tabela);
    console.log('OD:', od, 'DO:', doDate);

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
            if (izvor === '1') {
                conditions.push("(zapis IS NOT NULL OR LEN(ISNULL(izvor,'')) > 20)");
            } else {
                conditions.push("(zapis IS NULL AND LEN(ISNULL(izvor,'')) <= 20)");
            }
        }
        if (opis) {
            conditions.push("opis LIKE @opis");
            request.input('opis', sql.NVarChar, `%${opis}%`);
        }

        // Time span filtering - Direct DateTime2
        // User confirmed column is datetime2. Input is YYYY-MM-DD HH:mm from Flatpickr.
        // We just append seconds if missing to be safe for SQL parsing.

        // Filter to only show objects with stanje '1'
        conditions.push("stanje = '1'");

        if (od) {
            conditions.push("vrijeme0 >= @od");
            // Flatpickr sends "YYYY-MM-DD HH:mm". SQL DateTime2 prefers "YYYY-MM-DD HH:mm:ss" or just date.
            // We append ':00' if it looks like it lacks seconds (length 16).
            const odVal = od.length === 16 ? od + ':00' : od;
            request.input('od', sql.DateTime2, odVal);
        }
        if (doDate) {
            conditions.push("vrijeme1 <= @do");
            const doVal = doDate.length === 16 ? doDate + ':59' : doDate; // End of range inclusive
            request.input('do', sql.DateTime2, doVal);
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
                VALUES (@parent, GETUTCDATE(), GETUTCDATE(), @content, @creator, @fullname, @profile_picture_url, @created_by_admin, @created_by_current_user, 0, 0, 1)
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
                SET content = @content, modified = GETUTCDATE()
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
// GET /api/v2/themes
app.get('/api/v2/themes', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT id, naziv, opis FROM teme ORDER BY id');
        console.log('Themes fetched:', result.recordset);
        res.json({ themes: result.recordset });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/v2/theme-options/:tema_id
app.get('/api/v2/theme-options/:tema_id', async (req, res) => {
    try {
        const { tema_id } = req.params;

        // Validate tema_id is a number
        if (!/^\d+$/.test(tema_id)) {
            return res.status(400).json({ error: 'Invalid tema_id parameter' });
        }

        const pool = await poolPromise;

        // Verify tema exists
        const temaCheck = await pool.request()
            .input('tema_id', sql.Int, tema_id)
            .query('SELECT id FROM teme WHERE id = @tema_id');

        if (temaCheck.recordset.length === 0) {
            return res.status(404).json({ error: 'Theme not found' });
        }

        // Fetch all options for this theme
        const result = await pool.request()
            .input('tema_id', sql.Int, tema_id)
            .query('SELECT tip, redosled, vrednost FROM teme_opcije WHERE tema_id = @tema_id ORDER BY tip, redosled');

        // Group options by type
        const options = {
            razred: [],
            vrsta: [],
            podvrsta: []
        };

        result.recordset.forEach(row => {
            if (options[row.tip]) {
                options[row.tip].push(row.vrednost);
            }
        });

        console.log(`Theme options fetched for tema_id ${tema_id}:`, options);
        res.json({ options });

    } catch (err) {
        console.error('Error fetching theme options:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/teme/insert (Insert new theme data)
app.post('/api/teme/insert', async (req, res) => {
    try {
        // 1. Authenticate
        if (!req.session.user) {
            return res.status(401).json({ error: 'Морате бити пријављени' });
        }

        const { temaId, rows } = req.body;
        const userId = req.session.user.id;

        if (!temaId || !rows || !Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ error: 'Неисправни подаци' });
        }

        const tableName = `Table_${temaId}`;
        // Basic SQL injection protection for table name
        if (!/^\d+$/.test(temaId)) {
            return res.status(400).json({ error: "Invalid theme ID" });
        }

        const pool = await poolPromise;

        // Fetch user permission
        const userCheck = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT moze_ucitati FROM korisnik WHERE id = @userId');

        const mozeUcitati = userCheck.recordset[0]?.moze_ucitati === 1 || userCheck.recordset[0]?.moze_ucitati === true;
        const stanje = mozeUcitati ? '1' : '0';
        const message = mozeUcitati ? 'подаци су учитани' : 'подаци чекају на одобрење';

        // Loop through rows and insert
        for (const row of rows) {
            const request = pool.request();
            // ... (rest of the logic inside loop remains same except the query)
            // Need to repeat some logic because I'm replacing a block

            // Logic for tp and tv (1 if "одређено", 0 if "неодређено")
            const tp = row.dp === 'одређено' ? '1' : (row.prostorno === 'одређено' ? '1' : '0'); // Field name is prostorno in frontend
            const tv = row.vremenski === 'одређено' ? '1' : '0';

            // Logic for kraj (if empty, use pocetak)
            let pocetak = row.pocetak;
            let kraj = row.kraj;
            if (!kraj) kraj = pocetak;

            // Ensure proper datetime format (append :00 if missing seconds)
            if (pocetak && pocetak.length === 16) pocetak += ':00';
            if (kraj && kraj.length === 16) kraj += ':00';

            // Coordinates Conversion (GeoJSON -> WKT)
            let wkt = null;
            if (row.geometry) {
                const geo = row.geometry;
                const type = geo.type.toUpperCase();
                const coords = geo.coordinates;

                if (type === 'POINT') {
                    // Coordinates: [lng, lat]
                    wkt = `POINT (${coords[0]} ${coords[1]})`;
                } else if (type === 'LINESTRING') {
                    // Coordinates: [[lng, lat], [lng, lat], ...]
                    const points = coords.map(c => `${c[0]} ${c[1]}`).join(', ');
                    wkt = `LINESTRING (${points})`;
                } else if (type === 'POLYGON') {
                    // Coordinates: [[[lng, lat], ...]] (Leaflet usually nests polygons)
                    // WKT expects closed ring (first point == last point)
                    // Leaflet might not close it, but SQL often requires it.
                    // Let's assume input is simple polygon
                    let ring = coords[0];
                    // Check if closed
                    const first = ring[0];
                    const last = ring[ring.length - 1];
                    if (first[0] !== last[0] || first[1] !== last[1]) {
                        ring.push(first);
                    }
                    const points = ring.map(c => `${c[0]} ${c[1]}`).join(', ');
                    wkt = `POLYGON ((${points}))`;
                }
            }

            if (!wkt) {
                // If geometry is required this should be an error, but let's continue or skip
                continue;
            }

            request.input('vrsta', sql.NVarChar, row.vrsta || null);
            request.input('podvrsta', sql.NVarChar, row.podvrsta || null);
            request.input('razred', sql.NVarChar, row.razred);
            request.input('tp', sql.NVarChar, tp);
            request.input('vrijeme0', sql.DateTime2, pocetak);
            request.input('vrijeme1', sql.DateTime2, kraj);
            request.input('tv', sql.NVarChar, tv);
            request.input('opis', sql.NVarChar, row.opis);
            request.input('izvor', sql.NVarChar, row.izvor || null);
            request.input('dodao', sql.Int, userId);
            request.input('zapis', sql.Int, row.zapis ? parseInt(row.zapis) : null);
            // stanje defaults to '0'

            request.input('stanje', sql.NVarChar, stanje);

            // Note: We use query with specific parameter for WKT injection
            const query = `
                INSERT INTO ${tableName} 
                (vrsta, podvrsta, razred, prostorno, tp, vrijeme0, vrijeme1, tv, opis, izvor, dodao, dodao_vrijeme, zapis, stanje)
                VALUES 
                (@vrsta, @podvrsta, @razred, geometry::STGeomFromText('${wkt}', 4326), @tp, @vrijeme0, @vrijeme1, @tv, @opis, @izvor, @dodao, GETUTCDATE(), @zapis, @stanje)
            `;
            await request.query(query);
        }

        // Update user counter for stavki
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('count', sql.Int, rows.length)
            .query('UPDATE korisnik SET brojac_stavki = ISNULL(brojac_stavki, 0) + @count WHERE id = @userId');

        res.json({ success: true, message: message });

    } catch (err) {
        console.error('Error in teme insert:', err);
        res.status(500).json({ error: 'Грешка при упису података: ' + err.message });
    }
});
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

        const mozeUcitati = userCheck.recordset[0]?.moze_ucitati === 1 || userCheck.recordset[0]?.moze_ucitati === true;
        const stanje = mozeUcitati ? '1' : '0';
        const message = mozeUcitati ? 'подаци су учитани' : 'подаци чекају на одобрење';
        // 3. File presence check
        if (!req.file) {
            return res.status(400).json({ error: 'Фајл није изабран' });
        }
        const { naziv, opis, tema_id, tagovi } = req.body;
        const korisnik_id = req.session.user.id;
        // 4. Required fields validation
        if (!naziv || !tema_id || !opis || !tagovi) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Сва поља морају бити попуњена' });
        }
        // 4a. Validate tema_id exists
        const temaCheck = await pool.request()
            .input('tema_id', sql.Int, tema_id)
            .query('SELECT id FROM teme WHERE id = @tema_id');
        if (temaCheck.recordset.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Неисправна тема' });
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
                    console.warn(`⚠ Virus detected in upload by user ${korisnik_id}: ${viruses.join(', ')}`);
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
            .input('tema_id', sql.Int, tema_id)
            .input('korisnik_id', sql.Int, korisnik_id)
            .input('tagovi', sql.NVarChar, tagovi)
            .input('file_path', sql.NVarChar, req.file.path)
            .input('file_type', sql.NVarChar, path.extname(req.file.originalname).substring(1))
            .input('file_size', sql.Int, req.file.size)
            .input('stanje', sql.NVarChar, stanje)
            .query(`
                INSERT INTO zapisi (naziv, opis, tema_id, korisnik_id, tagovi, file_path, file_type, file_size, stanje, created_at)
                OUTPUT INSERTED.id
                VALUES (@naziv, @opis, @tema_id, @korisnik_id, @tagovi, @file_path, @file_type, @file_size, @stanje, GETUTCDATE())
            `);

        // Update user counter for zapisi
        await pool.request()
            .input('userId', sql.Int, korisnik_id)
            .query('UPDATE korisnik SET brojac_zapisa = ISNULL(brojac_zapisa, 0) + 1 WHERE id = @userId');

        console.log(`✓ File uploaded by user ${korisnik_id}: ${naziv} (${fileTypeResult.mime}, ${req.file.size} bytes)`);
        res.json({
            success: true,
            message: message,
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
        const { naziv, tema_id, korisnik, opis, tagovi } = req.body;
        const pool = await poolPromise;
        const request = pool.request();
        let query = `
            SELECT z.id, z.naziv, z.opis, t.naziv AS tema, k.korisnik, z.tagovi, z.file_type, z.file_size, z.created_at
            FROM zapisi z
            INNER JOIN teme t ON z.tema_id = t.id
            INNER JOIN korisnik k ON z.korisnik_id = k.id
                `;
        let conditions = [];
        if (naziv) {
            conditions.push("z.naziv LIKE @naziv");
            request.input('naziv', sql.NVarChar, `% ${naziv} % `);
        }
        if (tema_id) {
            conditions.push("z.tema_id = @tema_id");
            request.input('tema_id', sql.Int, tema_id);
        }
        if (korisnik) {
            conditions.push("k.korisnik LIKE @korisnik");
            request.input('korisnik', sql.NVarChar, `% ${korisnik} % `);
        }
        if (opis) {
            conditions.push("z.opis LIKE @opis");
            request.input('opis', sql.NVarChar, `% ${opis} % `);
        }
        if (tagovi) {
            conditions.push("z.tagovi LIKE @tagovi");
            request.input('tagovi', sql.NVarChar, `% ${tagovi} % `);
        }
        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }
        query += " ORDER BY z.created_at DESC";
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

// ============================================
// Dogadjaji (Events) API Routes
// ============================================

// POST /api/dogadjaji/insert
app.post('/api/dogadjaji/insert', async (req, res) => {
    try {
        // 1. Authentication check
        if (!req.session.user) {
            return res.status(401).json({ error: 'Морате бити пријављени' });
        }

        const { opis, pocetak, kraj, izvor, zapis, koordinate, vremenski } = req.body;
        const korisnik_id = req.session.user.id;

        console.log('=== DOGADJAJI INSERT REQUEST ===');
        console.log('User ID:', korisnik_id);
        console.log('Request body:', JSON.stringify(req.body, null, 2));

        // 1.5 Check if user has permission to insert (moze_ucitati = 1)
        const pool = await poolPromise;
        const permissionCheck = await pool.request()
            .input('korisnik_id', sql.Int, korisnik_id)
            .query('SELECT moze_ucitati FROM korisnik WHERE id = @korisnik_id');

        console.log('Permission check result:', permissionCheck.recordset[0]);
        const rawMozeUcitati = permissionCheck.recordset[0]?.moze_ucitati;
        console.log('moze_ucitati value:', rawMozeUcitati, 'type:', typeof rawMozeUcitati);

        // Handle both bit (true/false) and int (1/0) types
        const mozeUcitati = rawMozeUcitati === 1 || rawMozeUcitati === true;
        const stanje = mozeUcitati ? '1' : '0';
        const message = mozeUcitati ? 'подаци су учитани' : 'подаци чекају на одобрење';

        console.log('Permission status:', mozeUcitati ? 'can upload' : 'proposing only');

        // 2. Required fields validation
        if (!opis || !pocetak || !izvor) {
            console.log('Validation failed: missing required fields');
            return res.status(400).json({ error: 'Сва обавезна поља морају бити попуњена' });
        }

        // 3. Validate opis length (min 10 chars)
        if (opis.trim().length < 10) {
            console.log('Validation failed: opis too short');
            return res.status(400).json({ error: 'Опис мора имати најмање 10 карактера' });
        }

        // 4. Validate opis length (max 255 chars)
        if (opis.length > 255) {
            console.log('Validation failed: opis too long');
            return res.status(400).json({ error: 'Опис може имати највише 255 карактера' });
        }

        // Pool already declared above for permission check
        const request = pool.request();

        // 5. Convert datetime-local format (YYYY-MM-DDTHH:mm) to SQL Server format (YYYY-MM-DDTHH:mm:ss)
        const pocetakFormatted = pocetak ? pocetak + ':00' : null;
        const krajFormatted = kraj ? kraj + ':00' : null;

        // 6. Insert into database
        request.input('opis', sql.NVarChar, opis);
        request.input('pocetak', sql.DateTime2, pocetakFormatted);
        request.input('kraj', sql.DateTime2, krajFormatted);
        request.input('izvor', sql.NVarChar, izvor);
        request.input('korisnik_id', sql.Int, korisnik_id);
        request.input('zapis', sql.Int, zapis ? parseInt(zapis) : null);
        request.input('koordinate', sql.NVarChar, koordinate || null);
        request.input('stanje', sql.NVarChar, stanje);

        console.log('Executing SQL insert...');
        await request.query(`
            INSERT INTO dogadjaji(opis, pocetak, kraj, izvor, korisnik_id, zapis, koordinate, stanje, unos)
            VALUES(@opis, @pocetak, @kraj, @izvor, @korisnik_id, @zapis, @koordinate, @stanje, GETUTCDATE())
                    `);
        // Update user counter for dogadjaji
        await pool.request()
            .input('userId', sql.Int, korisnik_id)
            .query('UPDATE korisnik SET brojac_dogadjaja = ISNULL(brojac_dogadjaja, 0) + 1 WHERE id = @userId');

        console.log(`✓ Event created by user ${korisnik_id}: ${opis.substring(0, 50)}...`);
        res.json({
            success: true,
            message: message
        });

    } catch (err) {
        console.error('=== ERROR INSERTING DOGADJAJ ===');
        console.error('Error message:', err.message);
        console.error('Error code:', err.code);
        console.error('Error number:', err.number);
        console.error('Full error:', err);
        res.status(500).json({ error: 'Грешка при додавању догађаја' });
    }
});

// POST /api/dogadjaji/search
app.post('/api/dogadjaji/search', async (req, res) => {
    try {
        const { id, opis, pocetak, kraj, izvor, prostorno, vremenski } = req.body;
        const pool = await poolPromise;
        const request = pool.request();

        let query = `
            SELECT d.id, d.opis, d.pocetak, d.kraj, d.izvor, d.zapis, d.koordinate, d.unos, k.korisnik
            FROM dogadjaji d
            INNER JOIN korisnik k ON d.korisnik_id = k.id
                `;
        let conditions = [];

        // Filter: Only show approved events (stanje = 1)
        conditions.push("d.stanje = '1'");

        // Build WHERE clause based on search criteria
        if (id) {
            conditions.push("d.id = @id");
            request.input('id', sql.Int, id);
        }

        if (opis) {
            conditions.push("d.opis LIKE @opis");
            request.input('opis', sql.NVarChar, `% ${opis} % `);
        }

        if (pocetak) {
            conditions.push("d.pocetak >= @pocetak");
            request.input('pocetak', sql.DateTime2, pocetak + ':00');
        }

        if (kraj) {
            conditions.push("d.kraj <= @kraj");
            request.input('kraj', sql.DateTime2, kraj + ':00');
        }

        if (izvor) {
            conditions.push("d.izvor LIKE @izvor");
            request.input('izvor', sql.NVarChar, `% ${izvor} % `);
        }

        // Prostorno filter: check if koordinate field is populated
        if (prostorno === '1') {
            conditions.push("d.koordinate IS NOT NULL AND d.koordinate != ''");
        } else if (prostorno === '0') {
            conditions.push("(d.koordinate IS NULL OR d.koordinate = '')");
        }

        // Vremenski filter: check if kraj differs from pocetak (determined time range)
        if (vremenski === '1') {
            conditions.push("d.kraj != d.pocetak");
        } else if (vremenski === '0') {
            conditions.push("d.kraj = d.pocetak");
        }

        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }

        query += " ORDER BY d.id DESC";

        const result = await request.query(query);

        // Format dates for display
        const formattedResults = result.recordset.map(row => ({
            id: row.id,
            opis: row.opis,
            pocetak: row.pocetak ? new Date(row.pocetak).toLocaleString('sr-RS') : '',
            kraj: row.kraj ? new Date(row.kraj).toLocaleString('sr-RS') : '',
            izvor: row.izvor,
            zapis: row.zapis,
            koordinate: row.koordinate,
            korisnik: row.korisnik,
            unos: row.unos ? new Date(row.unos).toLocaleString('sr-RS') : ''
        }));

        res.json({
            success: true,
            results: formattedResults
        });

    } catch (err) {
        console.error('Error searching dogadjaji:', err);
        res.status(500).json({ error: 'Грешка при претрази' });
    }
});

// Authentication Routes

// POST /api/login
app.get('/api/check-auth', (req, res) => {
    if (req.session.user) {
        // Refresh privileges from DB to be sure (optional but safer)
        // or just rely on session if we update it at login
        res.json({
            user: req.session.user,
            is_admin: req.session.user.urednik == 1 || req.session.user.urednik == "1"
        });
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
        const userId = req.session.user.id;
        const previousVisit = req.session.user.previousVisit || '1970-01-01';

        // 1. Fetch user profile
        const userResult = await pool.request()
            .input('id', sql.Int, userId)
            .query('SELECT id, ime, prezime, korisnik, eposta, slika_url, pristup0, pristup1, brojac_pristupa FROM korisnik WHERE id = @id');

        if (userResult.recordset.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.recordset[0];

        // 2. Fetch User-Specific Total Stats (from counters)
        const statsResult = await pool.request()
            .input('id', sql.Int, userId)
            .query('SELECT brojac_stavki, brojac_zapisa, brojac_dogadjaja FROM korisnik WHERE id = @id');

        const userStats = statsResult.recordset[0] || { brojac_stavki: 0, brojac_zapisa: 0, brojac_dogadjaja: 0 };

        // 3. Fetch Site-Wide "Since Last Visit" Stats (timestamp based)
        // a. Zapisi
        const zapisiSince = await pool.request()
            .input('prevVisit', sql.DateTime2, previousVisit)
            .query("SELECT COUNT(*) as count FROM zapisi WHERE created_at > @prevVisit AND stanje IN('0', '1')");

        // b. Dogadjaji
        const dogadjajiSince = await pool.request()
            .input('prevVisit', sql.DateTime2, previousVisit)
            .query("SELECT COUNT(*) as count FROM dogadjaji WHERE unos > @prevVisit AND stanje IN('0', '1')");

        // c. Novosti
        const novostiSince = await pool.request()
            .input('prevVisit', sql.DateTime2, previousVisit)
            .query("SELECT COUNT(*) as count FROM novosti WHERE vrijeme > @prevVisit");

        // d. Stavki (Site-wide across all Table_X)
        const themesResult = await pool.request().query('SELECT id FROM teme');
        let sinceLastStavki = 0;

        for (const theme of themesResult.recordset) {
            const tableName = `Table_${theme.id}`;
            try {
                const stavkiSince = await pool.request()
                    .input('prevVisit', sql.DateTime2, previousVisit)
                    .query(`SELECT COUNT(*) as count FROM ${tableName} WHERE dodao_vrijeme > @prevVisit AND stanje IN('0', '1')`);
                sinceLastStavki += stavkiSince.recordset[0].count || 0;
            } catch (err) {
                // Table might not exist
            }
        }

        const currentTotal = {
            stavki: userStats.brojac_stavki || 0,
            zapisi: userStats.brojac_zapisa || 0,
            dogadjaji: userStats.brojac_dogadjaja || 0
        };

        const sinceLast = {
            stavki: sinceLastStavki,
            zapisi: zapisiSince.recordset[0].count || 0,
            dogadjaji: dogadjajiSince.recordset[0].count || 0,
            novosti: novostiSince.recordset[0].count || 0,
            teme: 0 // No specific tracking for new themes yet
        };

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
            },
            stats: {
                total: currentTotal,
                sinceLast: sinceLast
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/user/check-username - Check if username is available
app.post('/api/user/check-username', async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    try {
        const pool = await poolPromise;
        // Check if username exists, excluding current user if logged in
        let query = 'SELECT id FROM korisnik WHERE korisnik = @username';

        const request = pool.request()
            .input('username', sql.NVarChar, username);

        if (req.session.user) {
            query += ' AND id != @id';
            request.input('id', sql.Int, req.session.user.id);
        }

        const result = await request.query(query);

        res.json({ available: result.recordset.length === 0 });
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
            // Check if username is already taken by another user
            const usernameCheck = await pool.request()
                .input('korisnik', sql.NVarChar, korisnik)
                .input('id', sql.Int, req.session.user.id)
                .query('SELECT id FROM korisnik WHERE korisnik = @korisnik AND id != @id');

            if (usernameCheck.recordset.length > 0) {
                return res.status(409).json({ error: 'Корисничко име је већ у употреби' });
            }

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
        const previousVisit = user.pristup1;

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
                SET pristup0 = CASE WHEN pristup0 IS NULL THEN GETUTCDATE() ELSE pristup0 END,
            pristup1 = GETUTCDATE(),
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
            email: user.eposta,
            urednik: user.urednik,
            previousVisit: previousVisit,
            statsAtLogin: {
                stavki: user.brojac_stavki || 0,
                zapisi: user.brojac_zapisa || 0,
                dogadjaji: user.brojac_dogadjaja || 0
            }
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
                VALUES (@email, @username, @password, GETUTCDATE(), 0)
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
        console.log(`[MOCK EMAIL]To: ${email}, New Password: ${newPassword} `);

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

// Serve static files (MUST be after API routes to avoid conflicts)
app.use(express.static(path.join(__dirname, '.')));

// ============================================
// Novosti (News) API Routes
// ============================================

// POST /api/novosti (Insert new news)
app.post('/api/novosti', async (req, res) => {
    try {
        // 1. Authentication check
        if (!req.session.user) {
            return res.status(401).json({ error: 'Морате бити пријављени' });
        }

        const { opis } = req.body;
        const korisnik_id = req.session.user.id;

        // 2. Validation
        if (!opis) {
            return res.status(400).json({ error: 'Опис је обавезан.' });
        }

        if (opis.length < 10) {
            return res.status(400).json({ error: 'Опис мора имати најмање 10 карактера.' });
        }

        if (opis.length > 255) {
            return res.status(400).json({ error: 'Опис не смије бити дужи од 255 карактера.' });
        }

        const pool = await poolPromise;
        const request = pool.request();

        request.input('opis', sql.NVarChar, opis);
        request.input('uneo', sql.Int, korisnik_id);

        // Insert with current server time (UTC)
        await request.query(`
            INSERT INTO novosti (vrijeme, opis, uneo)
            VALUES (GETUTCDATE(), @opis, @uneo)
        `);

        res.json({ success: true, message: 'Новости успјешно додате.' });

    } catch (err) {
        console.error('Error in novosti insert:', err);
        res.status(500).json({ error: 'Грешка при упису новости.' });
    }
});

// GET /api/novosti (Fetch news)
app.get('/api/novosti', async (req, res) => {
    try {
        const pool = await poolPromise;
        // Fetch top 50, ordered by time DESC
        const result = await pool.request().query('SELECT TOP 50 vrijeme, opis FROM novosti ORDER BY vrijeme DESC');

        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching novosti:', err);
        res.status(500).json({ error: 'Грешка при добављању новости.' });
    }
});

// GET /api/opste/stats (General statistics for Opste tab)
app.get('/api/opste/stats', async (req, res) => {
    try {
        const pool = await poolPromise;

        // 1. Basic counts
        const novostiCount = await pool.request().query('SELECT COUNT(*) as count FROM novosti');
        const temeCount = await pool.request().query('SELECT COUNT(*) as count FROM teme');
        const dogadjajiCount = await pool.request().query('SELECT COUNT(*) as count FROM dogadjaji WHERE stanje = \'1\'');
        const zapisiCount = await pool.request().query('SELECT COUNT(*) as count FROM zapisi WHERE stanje = \'1\'');
        const korisnikCount = await pool.request().query('SELECT COUNT(*) as count FROM korisnik');

        // 2. Sum of all Table_X records
        const themesResult = await pool.request().query('SELECT id FROM teme');
        const themes = themesResult.recordset;
        let stavkiTotal = 0;

        for (const theme of themes) {
            const tableName = `Table_${theme.id}`;
            try {
                const stavkiResult = await pool.request().query(`SELECT COUNT(*) as count FROM ${tableName} WHERE stanje = '1'`);
                stavkiTotal += stavkiResult.recordset[0].count;
            } catch (err) {
                // Ignore if table doesn't exist
            }
        }

        // 3. Top 5 contributors
        // Formula: (brojac_stavki * 10) + brojac_dogadjaja + brojac_zapisa
        const topContributors = await pool.request().query(`
            SELECT TOP 5 
                korisnik, 
                brojac_stavki, 
                brojac_dogadjaja, 
                brojac_zapisa,
                (ISNULL(brojac_stavki, 0) * 10 + ISNULL(brojac_dogadjaja, 0) + ISNULL(brojac_zapisa, 0)) as points
            FROM korisnik
            ORDER BY points DESC
        `);

        res.json({
            pregled: {
                novosti: novostiCount.recordset[0].count,
                tema: temeCount.recordset[0].count,
                stavki: stavkiTotal,
                dogadjaja: dogadjajiCount.recordset[0].count,
                zapisa: zapisiCount.recordset[0].count,
                korisnika: korisnikCount.recordset[0].count
            },
            izbor: topContributors.recordset.map(u => ({
                username: u.korisnik,
                stavki: u.brojac_stavki || 0,
                dogadjaja: u.brojac_dogadjaja || 0,
                zapisa: u.brojac_zapisa || 0,
                points: u.points
            }))
        });

    } catch (err) {
        console.error('Error fetching opste stats:', err);
        res.status(500).json({ error: 'Грешка при добављању статистике.' });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
