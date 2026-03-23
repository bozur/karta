console.log('--- SERVER RESTARTING: V2 LOADED ---');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { poolPromise, sql, pool } = require('./db');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

// Dynamic import for file-type (ESM module)
let FileType;
(async () => {
    FileType = await import('file-type');
})();
const uploadLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 5, // 5 uploads per day
    message: { error: 'Можете учитати максимално 5 записа дневно.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Auth Rate Limiter (Login, Register, Forgot Password) - Strict
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per IP
    message: { error: 'Превише покушаја. Сачекајте 15 минута.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// General API Rate Limiter (Search, etc.) - Moderate to prevent scraping
const apiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000, // 1000 requests per hour
    message: { error: 'Превише захтјева. Сачекајте мало.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Bot Protection Helper (Honeypot + CAPTCHA)
async function validateBotProtection(req) {
    // 1. Honeypot Check (Hidden field should be empty)
    if (req.body._hp_check && req.body._hp_check.length > 0) {
        console.warn(`Bot detected via honeypot from IP ${req.ip}`);
        return { valid: false, error: "Откривен 'бот' (HP)" };
    }

    // 2. reCAPTCHA v3 Check (Only if configured)
    const recaptchaToken = req.body['g-recaptcha-response'];
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;

    if (recaptchaSecret && recaptchaToken) {
        try {
            const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${recaptchaToken}`;
            const response = await axios.post(verifyUrl);
            const data = response.data;

            if (!data.success) {
                // Check if failure is due to domain mismatch or browser error (common in localhost/dev)
                // Google response: { "success": false, "error-codes": ["domain-mismatch"] } or ["browser-error"]
                if (data['error-codes'] && (data['error-codes'].includes('domain-mismatch') || data['error-codes'].includes('browser-error'))) {
                    console.warn(`reCAPTCHA dev/localhost error (${data['error-codes'].join(',')}) - Allowing request from IP ${req.ip}`);
                    return { valid: true };
                }

                // Real bot detection failure (score low)
                if (data.score !== undefined && data.score < 0.5) {
                    console.warn(`Bot detected via reCAPTCHA (score: ${data.score}) from IP ${req.ip}`);
                    return { valid: false, error: "Откривен 'бот' (CAPTCHA)" };
                }

                // Other errors (invalid key, etc) - Fail open or closed?
                // Let's treat undefined score as suspicious only if success is false AND not domain mismatch?
                // Actually, if success is false, score is usually undefined.
                // If success is false and NOT domain mismatch, it might be a bot (invalid token) OR config error.
                // To be safe against bots, we should block if token is invalid.
                // But for now, user is blocked. Let's return error if success is false.
                console.warn(`Bot detected or CAPTCHA error (success: false, codes: ${JSON.stringify(data['error-codes'])}) from IP ${req.ip}`);
                return { valid: false, error: "Откривен 'бот' (CAPTCHA)" };
            }

            // Success true, check score
            if (data.score < 0.5) {
                console.warn(`Bot detected via reCAPTCHA (score: ${data.score}) from IP ${req.ip}`);
                return { valid: false, error: "Откривен 'бот' (CAPTCHA)" };
            }
        } catch (error) {
            console.error('reCAPTCHA verification error:', error.message);
            // Fail open if CAPTCHA service is down? Or fail closed? 
            // Let's log but allow for now to avoid locking users out if config is wrong
        }
    }

    return { valid: true };
}
// VirusTotal API configuration
const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY;

// VirusTotal virus scanning function
async function scanFileWithVirusTotal(filePath) {
    if (!VIRUSTOTAL_API_KEY) {
        console.warn('⚠ VirusTotal API key not configured. Files will not be scanned for viruses.');
        return { isInfected: false, viruses: [] };
    }

    try {
        // Step 1: Upload file to VirusTotal
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));

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
        console.log(`VirusTotal: File uploaded for analysis (ID: ${analysisId})`);

        // Step 2: Wait for analysis to complete (poll with timeout)
        const maxAttempts = 12; // 12 attempts * 5 seconds = 60 seconds max
        let attempts = 0;

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
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

                    if (isInfected) {
                        console.log(`✓ VirusTotal scan complete: INFECTED (${stats.malicious} malicious, ${stats.suspicious} suspicious)`);
                        return {
                            isInfected: true,
                            viruses: [`Detected by ${stats.malicious + stats.suspicious} engines`]
                        };
                    } else {
                        console.log(`✓ VirusTotal scan complete: Clean (${stats.harmless} harmless, ${stats.undetected} undetected)`);
                        return { isInfected: false, viruses: [] };
                    }
                }

                console.log(`VirusTotal: Analysis in progress (attempt ${attempts}/${maxAttempts})...`);
            } catch (pollError) {
                console.error('VirusTotal polling error:', pollError.message);
            }
        }

        // Timeout - assume clean to avoid blocking uploads
        console.warn('⚠ VirusTotal scan timeout - proceeding without scan result');
        return { isInfected: false, viruses: [] };

    } catch (error) {
        console.error('VirusTotal scan error:', error.response?.data || error.message);
        // On error, allow upload to proceed (fail open)
        return { isInfected: false, viruses: [] };
    }
}

// Log VirusTotal status on startup
if (VIRUSTOTAL_API_KEY) {
    console.log('✓ VirusTotal virus scanning enabled');
} else {
    console.warn('⚠ VirusTotal API key not configured. Set VIRUSTOTAL_API_KEY in .env file.');
}
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
app.set('trust proxy', 1); // Trust Render's proxy for secure cookies
const port = process.env.PORT || 3000;

// Apply General API Limiter to specific generic routes to prevent scraping
app.use('/api/search', apiLimiter);
app.use('/api/zapisi/search', apiLimiter);
app.use('/api/dogadjaji/search', apiLimiter);
app.use('/api/points', apiLimiter);

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    store: new PgSession({
        pool: pool,
        tableName: 'session' // Default is "session"
    }),
    secret: process.env.SESSION_SECRET || 'secret_key_change_this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000, // 24 hours (can be extended with remember me)
        sameSite: 'lax' // Protection against CSRF
    }
}));



// API Routes

// Email helper function using Resend API
async function sendEmail({ to, subject, html, bcc }) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.error('RESEND_API_KEY is missing in .env file');
        throw new Error('API кључ није подешен.');
    }

    try {
        const payload = {
            from: 'Kontakt obrazac <kontakt@xn--80aa2azak.xn--90a3ac>',
            to: Array.isArray(to) ? to : [to],
            subject: subject,
            html: html
        };
        if (bcc) {
            payload.bcc = Array.isArray(bcc) ? bcc : [bcc];
        }

        const response = await axios.post('https://api.resend.com/emails', payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        const errorData = error.response ? error.response.data : error.message;
        console.error('Resend API error details:', JSON.stringify(errorData, null, 2));
        throw error;
    }
}

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.query('SELECT 1 as connected');
        res.json({
            status: 'ok',
            database: 'connected',
            node_env: process.env.NODE_ENV,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            database: 'disconnected',
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

// POST /api/kontakt (Contact form submission via Resend)
app.post('/api/kontakt', async (req, res) => {
    const { subject, message } = req.body;

    if (!subject || !message) {
        return res.status(400).json({ error: 'Наслов и порука су обавезни.' });
    }

    const ownerEmail = process.env.OWNER_GMAIL || 'bozur.vujicic@gmail.com';
    const userEmail = req.session.user ? (req.session.user.email || req.session.user.eposta || 'anonymous@karta.rs') : 'anonymous@karta.rs';
    const userName = req.session.user ? (req.session.user.username || req.session.user.korisnik || req.session.user.ime || 'Anonymous User') : 'Anonymous User';

    try {
        const data = await sendEmail({
            to: ownerEmail,
            subject: `Kontakt obrazac: ${subject}`,
            html: `
                <p><strong>Od:</strong> ${userName} (${userEmail})</p>
                <p><strong>Naslov:</strong> ${subject}</p>
                <p><strong>Poruka:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
            `
        });

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: 'Грешка при слању е-поште.' });
    }
});

// POST /api/resend-webhook (Handling inbound emails from Resend)
app.post('/api/resend-webhook', async (req, res) => {
    console.log('--- Resend Webhook Received ---');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Payload:', JSON.stringify(req.body, null, 2));

    const payload = req.body;

    if (payload.type !== 'email.received') {
        console.log(`Webhook received: ${payload.type}`);
        return res.sendStatus(200);
    }

    const emailData = payload.data;
    const ownerEmail = process.env.OWNER_GMAIL || 'bozur.vujicic@gmail.com';

    console.log(`Inbound email received from ${emailData.from} to ${emailData.to}`);

    try {
        // Forward the inbound email to owner's Gmail
        await sendEmail({
            to: ownerEmail,
            subject: `Fwd: [Inbound] ${emailData.subject}`,
            html: `
                <div style="border: 1px solid #ccc; padding: 10px; margin-bottom: 20px;">
                    <p><strong>Originalna poruka primljena na:</strong> ${emailData.to}</p>
                    <p><strong>Od:</strong> ${emailData.from}</p>
                    <p><strong>Datum:</strong> ${emailData.created_at}</p>
                </div>
                ${emailData.html || emailData.text || 'Nema sadržaja.'}
            `
        });

        res.sendStatus(200);
    } catch (error) {
        console.error('Error forwarding inbound email:', error.message);
        res.status(500).send('Error forwarding email');
    }
});

// GET /api/comments (Modified to support filtering by target)
app.get('/api/comments', async (req, res) => {
    const { table, id } = req.query; // table = target_type, id = target_id

    try {
        const pool = await poolPromise;
        const userId = req.session.user ? req.session.user.id : 0;

        let query = `
            SELECT 
                c.*, 
                CASE WHEN cu.user_id IS NOT NULL THEN 1 ELSE 0 END AS user_has_upvoted,
                CASE WHEN cd.user_id IS NOT NULL THEN 1 ELSE 0 END AS user_has_downvoted,
                k.slika_url AS author_picture_url,
                k.korisnik,
                k.eposta,
                k.ime,
                k.prezime
            FROM comments c
            LEFT JOIN korisnik k ON c.creator = k.id
            LEFT JOIN comment_upvotes cu ON c.id = cu.comment_id AND cu.user_id = @userId
            LEFT JOIN comment_downvotes cd ON c.id = cd.comment_id AND cd.user_id = @userId
        `;

        if (table && id) {
            query += ` WHERE c.target_type = @target_type AND c.target_id = @target_id`;
        }

        query += ` ORDER BY c.created ASC`;

        const request = pool.request()
            .input('userId', sql.Int, userId);

        if (table && id) {
            request.input('target_type', sql.NVarChar, table)
                .input('target_id', sql.Int, id);
        }

        const result = await request.query(query);

        // Process results to handle dynamic fullname/username
        const processedResults = result.recordset.map(row => {
            let displayName = row.fullname; // Default to stored fullname

            // Fallback logic for username/email
            if (row.korisnik) {
                displayName = row.korisnik;
            } else if (row.ime) {
                displayName = row.ime + (row.prezime ? ' ' + row.prezime : '');
            } else if (row.eposta) {
                displayName = row.eposta.split('@')[0];
            }

            return {
                ...row,
                fullname: displayName
            };
        });

        res.json(processedResults);
    } catch (err) {
        console.error(err);
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
            .query(`select vrsta, podvrsta, razred, vrijeme0, vrijeme1, opis, izvor, tp, tv, dodao_vrijeme, izmjenio_vrijeme, zapis from ${tableName} WHERE id = @uid`);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: "Point not found" });
        }

        const row = result.recordset[0];

        // Fetch zapis naziv if exists
        let zapisNaziv = null;
        if (row.zapis) {
            const zapisResult = await pool.request()
                .input('zid', sql.Int, row.zapis)
                .query('SELECT naziv FROM zapisi WHERE id = @zid');
            if (zapisResult.recordset.length > 0) {
                zapisNaziv = zapisResult.recordset[0].naziv;
            }
        }

        res.json({
            vrs: row.vrsta,
            pod: row.podvrsta,
            raz: row.razred,
            vri0: row.vrijeme0,
            vri1: row.vrijeme1,
            opi: row.opis,
            izv: row.izvor,
            prostorno: row.tp,
            vremenski: row.tv,
            dodao_vrijeme: row.dodao_vrijeme,
            izmjenio_vrijeme: row.izmjenio_vrijeme,
            zapis: row.zapis,
            zapis_naziv: zapisNaziv
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// POST /api/search (Replaces back/test5.asp)
app.post('/api/search', async (req, res) => {
    const { tabela, vrsta, podvrsta, razred, prostorno, vremenski, izvor, opis, od, do: doDate } = req.body;

    // Basic validation for table name
    if (!/^\d+$/.test(tabela)) {
        return res.status(400).json({ error: "Invalid table parameter" });
    }

    const tableName = `Table_${tabela}`;

    try {
        const pool = await poolPromise;
        const request = pool.request();

        let query = `SELECT id, vrsta, podvrsta, razred, vrijeme0, vrijeme1, tacke0, tacke FROM ${tableName}`;
        let conditions = [];

        if (req.body.id) {
            conditions.push("id = @id");
            request.input('id', sql.Int, req.body.id);
        }

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

        // Filter to only show objects with stanje '1'
        conditions.push("stanje = '1'");

        if (od) {
            conditions.push("vrijeme0 >= @od");
            const odVal = od.length === 16 ? od + ':00' : od;
            request.input('od', sql.DateTime2, odVal);
        }
        if (doDate) {
            conditions.push("vrijeme1 <= @do");
            const doVal = doDate.length === 16 ? doDate + ':59' : doDate;
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
                    id: row.id,
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
    const { parent, content, pings, table, id } = req.body;

    if (!req.session.user) {
        return res.status(401).json({ error: 'Morate biti prijavljeni' });
    }

    const creator = req.session.user.id;
    const fullname = req.session.user.fullname || req.session.user.ime; // Adjust based on user session structure

    // Fetch fresh profile picture from DB in case it was just updated
    let profile_picture_url;
    try {
        const pool = await poolPromise;
        const userRes = await pool.request()
            .input('uid', sql.Int, creator)
            .query('SELECT slika_url FROM korisnik WHERE id = @uid');

        if (userRes.recordset.length > 0) {
            profile_picture_url = userRes.recordset[0].slika_url;
        }
    } catch (e) {
        console.error('Error fetching fresh profile pic for comment:', e);
    }

    if (!profile_picture_url) {
        profile_picture_url = req.session.user.slika_url || 'https://viima-app.s3.amazonaws.com/media/public/defaults/user-icon.png';
    }

    const created_by_admin = (req.session.user.admin || req.session.user.urednik) ? true : false;

    // Validate target
    if (!table || !id) {
        return res.status(400).json({ error: "Missing target parameters" });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('parent', sql.Int, parent)
            .input('target_type', sql.NVarChar, table)
            .input('target_id', sql.Int, id)
            .input('content', sql.NVarChar, content)
            .input('creator', sql.Int, creator)
            .input('fullname', sql.NVarChar, fullname)
            .input('profile_picture_url', sql.NVarChar, profile_picture_url)
            .input('created_by_admin', sql.Bit, created_by_admin)
            .query(`
                INSERT INTO comments (parent, target_type, target_id, created, modified, content, creator, fullname, profile_picture_url, created_by_admin, upvote_count, is_new)
                VALUES (@parent, @target_type, @target_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, @content, @creator, @fullname, @profile_picture_url, @created_by_admin, 0, true)
                RETURNING *
            `);

        // Add 'user_has_upvoted' = false for the response since the creator hasn't upvoted yet
        const newComment = result.recordset[0];
        newComment.user_has_upvoted = false;
        newComment.user_has_downvoted = false;
        newComment.created_by_current_user = true;

        // Apply fallback logic for session user fields (since INSERTED.* only has stored comment fields)
        newComment.korisnik = req.session.user.korisnik;
        newComment.eposta = req.session.user.eposta;
        newComment.ime = req.session.user.ime;
        newComment.prezime = req.session.user.prezime;

        newComment.fullname = newComment.korisnik || (newComment.ime ? (newComment.ime + (newComment.prezime ? ' ' + newComment.prezime : '')) : (newComment.eposta ? newComment.eposta.split('@')[0] : (newComment.fullname || 'Anonymous')));

        res.json(newComment);
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// PUT /api/comments/:id (Update comment)
app.put('/api/comments/:id', async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;

    if (!req.session.user) {
        return res.status(401).json({ error: 'Morate biti prijavljeni' });
    }

    try {
        const pool = await poolPromise;

        // Verifikacija da je korisnik vlasnik komentara
        const check = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT creator FROM comments WHERE id = @id');

        if (check.recordset.length === 0) return res.status(404).json({ error: "Comment not found" });
        if (check.recordset[0].creator !== req.session.user.id && !req.session.user.admin) {
            return res.status(403).json({ error: "Not authorized" });
        }

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('content', sql.NVarChar, content)
            .query(`
                UPDATE comments
                SET content = @content, modified = GETUTCDATE()
                OUTPUT INSERTED.*
                WHERE id = @id
            `);

        res.json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// DELETE /api/comments/:id (Delete comment RECURSIVELY)
app.delete('/api/comments/:id', async (req, res) => {
    const { id } = req.params;

    if (!req.session.user) {
        return res.status(401).json({ error: 'Morate biti prijavljeni' });
    }

    try {
        const pool = await poolPromise;

        // Verifikacija da je korisnik vlasnik komentara ILI admin
        const check = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT creator FROM comments WHERE id = @id');

        if (check.recordset.length === 0) return res.status(404).json({ error: "Comment not found" });

        const isOwner = check.recordset[0].creator === req.session.user.id;
        const isAdmin = req.session.user.admin || req.session.user.urednik;

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: "Not authorized" });
        }

        // Recursive delete using CTE
        // 1. Find all descendant IDs
        // 2. Delete upvotes for all those IDs
        // 3. Delete the comments

        await pool.request()
            .input('rootId', sql.Int, id)
            .query(`
                WITH RECURSIVE descendants AS (
                    SELECT id FROM comments WHERE id = @rootId
                    UNION ALL
                    SELECT c.id FROM comments c
                    INNER JOIN descendants d ON c.parent = d.id
                )
                DELETE FROM comment_upvotes WHERE comment_id IN (SELECT id FROM descendants);
            `);

        await pool.request()
            .input('rootId', sql.Int, id)
            .query(`
                WITH RECURSIVE descendants AS (
                    SELECT id FROM comments WHERE id = @rootId
                    UNION ALL
                    SELECT c.id FROM comments c
                    INNER JOIN descendants d ON c.parent = d.id
                )
                DELETE FROM comment_downvotes WHERE comment_id IN (SELECT id FROM descendants);
            `);

        await pool.request()
            .input('rootId', sql.Int, id)
            .query(`
                WITH RECURSIVE descendants AS (
                    SELECT id FROM comments WHERE id = @rootId
                    UNION ALL
                    SELECT c.id FROM comments c
                    INNER JOIN descendants d ON c.parent = d.id
                )
                DELETE FROM comments WHERE id IN (SELECT id FROM descendants);
            `);

        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// POST /api/comments/:id/upvote (Upvote comment)
app.post('/api/comments/:id/upvote', async (req, res) => {
    const { id } = req.params;

    if (!req.session.user) {
        return res.status(401).json({ error: 'Morate biti prijavljeni' });
    }

    const userId = req.session.user.id;

    try {
        const pool = await poolPromise;

        // Check current state
        const upvoteCheck = await pool.request()
            .input('cid', sql.Int, id)
            .input('uid', sql.Int, userId)
            .query('SELECT id FROM comment_upvotes WHERE comment_id = @cid AND user_id = @uid');
        const hasUpvoted = upvoteCheck.recordset.length > 0;

        const downvoteCheck = await pool.request()
            .input('cid', sql.Int, id)
            .input('uid', sql.Int, userId)
            .query('SELECT id FROM comment_downvotes WHERE comment_id = @cid AND user_id = @uid');
        const hasDownvoted = downvoteCheck.recordset.length > 0;

        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        const request = new sql.Request(transaction);

        try {
            // If already upvoted, remove upvote (toggle off)
            if (hasUpvoted) {
                await request.query(`
                    DELETE FROM comment_upvotes WHERE comment_id = ${id} AND user_id = ${userId};
                    UPDATE comments SET upvote_count = GREATEST(COALESCE(upvote_count, 0) - 1, 0) WHERE id = ${id};
               `);
            } else {
                // If downvoted, remove downvote first
                if (hasDownvoted) {
                    await request.query(`
                        DELETE FROM comment_downvotes WHERE comment_id = ${id} AND user_id = ${userId};
                        UPDATE comments SET downvote_count = GREATEST(COALESCE(downvote_count, 0) - 1, 0) WHERE id = ${id};
                    `);
                }
                // Add upvote
                await request.query(`
                    INSERT INTO comment_upvotes (comment_id, user_id) VALUES (${id}, ${userId});
                    UPDATE comments SET upvote_count = COALESCE(upvote_count, 0) + 1 WHERE id = ${id};
               `);
            }

            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }

        // Return updated comment state
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('userId', sql.Int, userId) // Use param here safe
            .query(`
                SELECT c.*, 
                CASE WHEN cu.user_id IS NOT NULL THEN 1 ELSE 0 END AS user_has_upvoted,
                CASE WHEN cd.user_id IS NOT NULL THEN 1 ELSE 0 END AS user_has_downvoted,
                k.slika_url AS author_picture_url, k.korisnik, k.eposta, k.ime, k.prezime
                FROM comments c
                LEFT JOIN korisnik k ON c.creator = k.id
                LEFT JOIN comment_upvotes cu ON c.id = cu.comment_id AND cu.user_id = @userId
                LEFT JOIN comment_downvotes cd ON c.id = cd.comment_id AND cd.user_id = @userId
                WHERE c.id = @id
             `);

        const updatedComment = result.recordset[0];
        // Ensure boolean conversion if driver doesn't do it (it returns 1/0 for calculated fields sometimes)
        updatedComment.user_has_upvoted = !!updatedComment.user_has_upvoted;
        updatedComment.user_has_downvoted = !!updatedComment.user_has_downvoted;

        // Apply dynamic display name (fallback logic)
        updatedComment.fullname = updatedComment.korisnik || (updatedComment.ime ? (updatedComment.ime + (updatedComment.prezime ? ' ' + updatedComment.prezime : '')) : (updatedComment.eposta ? updatedComment.eposta.split('@')[0] : updatedComment.fullname));

        res.json(updatedComment);
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// POST /api/comments/:id/downvote (Downvote comment)
app.post('/api/comments/:id/downvote', async (req, res) => {
    const { id } = req.params;

    if (!req.session.user) {
        return res.status(401).json({ error: 'Morate biti prijavljeni' });
    }

    const userId = req.session.user.id;

    try {
        const pool = await poolPromise;

        const upvoteCheck = await pool.request()
            .input('cid', sql.Int, id)
            .input('uid', sql.Int, userId)
            .query('SELECT id FROM comment_upvotes WHERE comment_id = @cid AND user_id = @uid');
        const hasUpvoted = upvoteCheck.recordset.length > 0;

        const downvoteCheck = await pool.request()
            .input('cid', sql.Int, id)
            .input('uid', sql.Int, userId)
            .query('SELECT id FROM comment_downvotes WHERE comment_id = @cid AND user_id = @uid');
        const hasDownvoted = downvoteCheck.recordset.length > 0;

        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        const request = new sql.Request(transaction);

        try {
            if (hasDownvoted) {
                // Toggle off
                await request.query(`
                    DELETE FROM comment_downvotes WHERE comment_id = ${id} AND user_id = ${userId};
                    UPDATE comments SET downvote_count = GREATEST(COALESCE(downvote_count, 0) - 1, 0) WHERE id = ${id};
               `);
            } else {
                if (hasUpvoted) {
                    await request.query(`
                        DELETE FROM comment_upvotes WHERE comment_id = ${id} AND user_id = ${userId};
                        UPDATE comments SET upvote_count = GREATEST(COALESCE(upvote_count, 0) - 1, 0) WHERE id = ${id};
                    `);
                }
                await request.query(`
                    INSERT INTO comment_downvotes (comment_id, user_id) VALUES (${id}, ${userId});
                    UPDATE comments SET downvote_count = COALESCE(downvote_count, 0) + 1 WHERE id = ${id};
               `);
            }
            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('userId', sql.Int, userId) // Use param here safe
            .query(`
                SELECT c.*, 
                CASE WHEN cu.user_id IS NOT NULL THEN 1 ELSE 0 END AS user_has_upvoted,
                CASE WHEN cd.user_id IS NOT NULL THEN 1 ELSE 0 END AS user_has_downvoted,
                k.slika_url AS author_picture_url, k.korisnik, k.eposta, k.ime, k.prezime
                FROM comments c
                LEFT JOIN korisnik k ON c.creator = k.id
                LEFT JOIN comment_upvotes cu ON c.id = cu.comment_id AND cu.user_id = @userId
                LEFT JOIN comment_downvotes cd ON c.id = cd.comment_id AND cd.user_id = @userId
                WHERE c.id = @id
             `);

        const updatedComment = result.recordset[0];
        updatedComment.user_has_upvoted = !!updatedComment.user_has_upvoted;
        updatedComment.user_has_downvoted = !!updatedComment.user_has_downvoted;

        // Apply dynamic display name (fallback logic)
        updatedComment.fullname = updatedComment.korisnik || (updatedComment.ime ? (updatedComment.ime + (updatedComment.prezime ? ' ' + updatedComment.prezime : '')) : (updatedComment.eposta ? updatedComment.eposta.split('@')[0] : updatedComment.fullname));

        res.json(updatedComment);

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
        const result = await pool.request().query('SELECT id, naziv, opis, zakljucano FROM teme ORDER BY id');
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

        // Check if theme is locked
        const lockCheck = await pool.request()
            .input('temaId', sql.Int, temaId)
            .query('SELECT zakljucano FROM teme WHERE id = @temaId');

        if (lockCheck.recordset.length > 0 && lockCheck.recordset[0].zakljucano === 1) {
            return res.status(403).json({ error: 'Тема је тренутно закључана!' });
        }

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

            let coords = null;
            let type = null;

            if (row.geometry) {
                const geo = row.geometry;
                type = geo.type.toUpperCase();
                coords = geo.coordinates;

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
            request.input('tacke', sql.NVarChar, JSON.stringify(coords));
            request.input('tacke0', sql.NVarChar, type === 'POINT' ? 'Point' : (type === 'LINESTRING' ? 'LineString' : 'Polygon'));

            // Note: We use query with specific parameter for WKT injection
            const query = `
                INSERT INTO ${tableName} 
                (vrsta, podvrsta, razred, prostorno, tp, vrijeme0, vrijeme1, tv, opis, izvor, dodao, dodao_vrijeme, zapis, stanje, tacke, tacke0)
                VALUES 
                (@vrsta, @podvrsta, @razred, ST_GeomFromText('${wkt}', 4326), @tp, @vrijeme0, @vrijeme1, @tv, @opis, @izvor, @dodao, GETUTCDATE(), @zapis, @stanje, @tacke, @tacke0)
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

// PUT /api/urednik/stavke/:tabela/:id (Update theme record)
app.put('/api/urednik/stavke/:tabela/:id', async (req, res) => {
    try {
        if (!req.session.user || (req.session.user.urednik != 1 && req.session.user.urednik != "1")) {
            return res.status(401).json({ error: 'Нисте овлашћени' });
        }

        const { tabela, id } = req.params;
        const { vrsta, podvrsta, razred, prostorno, vremenski, vrijeme0, vrijeme1, opis, izvor, zapis } = req.body;
        const userId = req.session.user.id;

        if (!/^\d+$/.test(tabela) || !/^\d+$/.test(id)) {
            return res.status(400).json({ error: "Invalid parameters" });
        }

        const tableName = `Table_${tabela}`;
        const pool = await poolPromise;

        // Logic for tp and tv
        const tp = prostorno === '1' || prostorno === 'одређено' ? '1' : '0';
        const tv = vremenski === '1' || vremenski === 'одређено' ? '1' : '0';

        let v0 = vrijeme0;
        let v1 = vrijeme1 || v0;

        if (v0 && v0.length === 16) v0 += ':00';
        if (v1 && v1.length === 16) v1 += ':00';

        await pool.request()
            .input('vrsta', sql.NVarChar, vrsta || null)
            .input('podvrsta', sql.NVarChar, podvrsta || null)
            .input('razred', sql.NVarChar, razred || null)
            .input('tp', sql.NVarChar, tp)
            .input('v0', sql.DateTime2, v0)
            .input('v1', sql.DateTime2, v1)
            .input('tv', sql.NVarChar, tv)
            .input('opis', sql.NVarChar, opis)
            .input('izvor', sql.NVarChar, izvor || null)
            .input('zapis', sql.Int, zapis ? parseInt(zapis) : null)
            .input('userId', sql.Int, userId)
            .input('id', sql.Int, id)
            .query(`
                UPDATE ${tableName}
                SET vrsta = @vrsta, podvrsta = @podvrsta, razred = @razred,
                    tp = @tp, vrijeme0 = @v0, vrijeme1 = @v1, tv = @tv,
                    opis = @opis, izvor = @izvor, zapis = @zapis,
                    izmjenio = @userId, izmjenio_vrijeme = GETUTCDATE()
                WHERE ID = @id
            `);

        res.json({ success: true, message: 'Подаци успјешно измијењени' });
    } catch (err) {
        console.error('Error updating record:', err);
        res.status(500).json({ error: 'Грешка при измјени података' });
    }
});

// DELETE /api/urednik/stavke/:tabela/:id (Delete theme record)
app.delete('/api/urednik/stavke/:tabela/:id', async (req, res) => {
    try {
        if (!req.session.user || (req.session.user.urednik != 1 && req.session.user.urednik != "1")) {
            return res.status(401).json({ error: 'Нисте овлашћени' });
        }

        const { tabela, id } = req.params;

        if (!/^\d+$/.test(tabela) || !/^\d+$/.test(id)) {
            return res.status(400).json({ error: "Invalid parameters" });
        }

        const tableName = `Table_${tabela}`;
        const pool = await poolPromise;

        await pool.request()
            .input('id', sql.Int, id)
            .query(`DELETE FROM ${tableName} WHERE ID = @id`);

        res.json({ success: true, message: 'Податак успјешно обрисан' });
    } catch (err) {
        console.error('Error deleting record:', err);
        res.status(500).json({ error: 'Грешка при брисању података' });
    }
});
// GET /api/urednik/all-zapisi (List all zapisi for dropdowns)
app.get('/api/urednik/all-zapisi', async (req, res) => {
    try {
        if (!req.session.user || (req.session.user.urednik != 1 && req.session.user.urednik != "1")) {
            return res.status(401).json({ error: 'Нисте овлашћени' });
        }
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT id, naziv, tema_id FROM zapisi ORDER BY naziv');
        res.json({ success: true, results: result.recordset });
    } catch (err) {
        console.error('Error fetching all zapisi:', err);
        res.status(500).json({ error: 'Грешка при учитавању записа' });
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
        // 6. Virus scanning with VirusTotal
        const { isInfected, viruses } = await scanFileWithVirusTotal(req.file.path);
        if (isInfected) {
            fs.unlinkSync(req.file.path);
            console.warn(`⚠ Virus detected in upload by user ${korisnik_id}: ${viruses.join(', ')}`);
            return res.status(400).json({
                error: 'Фајл садржи вирус и није могао бити учитан'
            });
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
                VALUES (@naziv, @opis, @tema_id, @korisnik_id, @tagovi, @file_path, @file_type, @file_size, @stanje, CURRENT_TIMESTAMP)
                RETURNING id
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
        conditions.push("z.stanje = '1'");

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

        // Check visibility: only editors can see/download unapproved records
        const isUrednik = req.session.user && (req.session.user.urednik == 1 || req.session.user.urednik == '1');
        if (record.stanje !== '1' && !isUrednik) {
            return res.status(403).json({ error: 'Запис још није одобрен' });
        }

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
// POST /api/login
app.get('/api/check-auth', async (req, res) => {
    console.log(`Checking auth for session: ${req.sessionID}`);
    if (req.session.user) {
        console.log(`User found in session: ${req.session.user.id}`);
        try {
            // Fetch latest profile picture URL needed for global UI
            const pool = await poolPromise;
            const result = await pool.request()
                .input('id', sql.Int, req.session.user.id)
                .query('SELECT slika_url FROM korisnik WHERE id = @id');

            if (result.recordset.length > 0) {
                req.session.user.slika_url = result.recordset[0].slika_url;
            }
        } catch (err) {
            console.error('Error fetching latest user details in check-auth:', err);
        }

        console.log(`✓ Auth check successful for user: ${req.session.user.id}`);
        res.json({
            user: req.session.user,
            is_admin: req.session.user.urednik == 1 || req.session.user.urednik == "1"
        });
    } else {
        console.log('⚠ Auth check: No user session found');
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
            .query('SELECT id, ime, prezime, korisnik, eposta, slika_url, pristup0, pristup1, brojac_pristupa, obavjestenja FROM korisnik WHERE id = @id');

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
                sinceLastStavki += parseInt(stavkiSince.recordset[0].count, 10) || 0;
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
            stavki: parseInt(sinceLastStavki, 10) || 0,
            zapisi: parseInt(zapisiSince.recordset[0].count, 10) || 0,
            dogadjaji: parseInt(dogadjajiSince.recordset[0].count, 10) || 0,
            novosti: parseInt(novostiSince.recordset[0].count, 10) || 0,
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
                brojac_pristupa: user.brojac_pristupa,
                obavjestenja: user.obavjestenja
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

// POST /api/user/check-email - Check if email is available
app.post('/api/user/check-email', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        const pool = await poolPromise;
        // Check if email exists, excluding current user if logged in
        let query = 'SELECT id FROM korisnik WHERE eposta = @email';

        const request = pool.request()
            .input('email', sql.NVarChar, email);

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

    const { ime, prezime, korisnik, eposta, slika_url, lozinka, nova_lozinka, obavjestenja } = req.body;

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
                return res.status(409).json({ error: 'Адреса е-поште се већ користи' });
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

        if (obavjestenja !== null && obavjestenja !== undefined) {
            updateFields.push('obavjestenja = @obavjestenja');
            request.input('obavjestenja', sql.Int, obavjestenja ? 1 : 0);
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


// GET /api/user/contributed-themes - Get themes where user has contributed
app.get('/api/user/contributed-themes', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const userId = req.session.user.id;
        const pool = await poolPromise;

        // Fetch all themes
        const themesResult = await pool.request().query('SELECT id, naziv FROM teme');
        const themes = themesResult.recordset;
        const contributedThemes = [];

        // For each theme, check if user has records in its Table_X
        for (const theme of themes) {
            const tableName = `Table_${theme.id}`;
            try {
                const checkResult = await pool.request()
                    .input('userId', sql.Int, userId)
                    .query(`SELECT TOP 1 id FROM ${tableName} WHERE dodao = @userId`);

                if (checkResult.recordset.length > 0) {
                    contributedThemes.push(theme);
                }
            } catch (err) {
                // Table might not exist yet
                console.warn(`Table ${tableName} check failed:`, err.message);
            }
        }

        res.json({ themes: contributedThemes });
    } catch (err) {
        console.error('Error fetching contributed themes:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/user/download-geojson/:temaId - Download user records for a theme as GeoJSON
app.get('/api/user/download-geojson/:temaId', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { temaId } = req.params;
    if (!/^\d+$/.test(temaId)) {
        return res.status(400).json({ error: 'Invalid theme ID' });
    }

    try {
        const userId = req.session.user.id;
        const pool = await poolPromise;

        // Fetch theme name for filename
        const themeResult = await pool.request()
            .input('id', sql.Int, temaId)
            .query('SELECT naziv FROM teme WHERE id = @id');

        if (themeResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Theme not found' });
        }
        const themeName = themeResult.recordset[0].naziv;

        // Fetch theme options for mapping numeric IDs to text
        const optionsResult = await pool.request()
            .input('tema_id', sql.Int, temaId)
            .query('SELECT tip, redosled, vrednost FROM teme_opcije WHERE tema_id = @tema_id');

        const optionsMap = {
            razred: {},
            vrsta: {},
            podvrsta: {}
        };
        optionsResult.recordset.forEach(row => {
            if (optionsMap[row.tip]) {
                optionsMap[row.tip][row.redosled] = row.vrednost;
            }
        });

        const tableName = `Table_${temaId}`;
        const recordsResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT t.*, z.naziv as zapis_naziv, z.opis as zapis_opis
                FROM ${tableName} t
                LEFT JOIN zapisi z ON t.zapis = z.id
                WHERE t.dodao = @userId
            `);

        const records = recordsResult.recordset;

        // Construct GeoJSON
        const geojson = {
            type: 'FeatureCollection',
            features: records.map(record => {
                let coords = [];
                try {
                    coords = JSON.parse(record.tacke);
                } catch (e) {
                    console.error('Error parsing coordinates for record', record.id);
                }

                return {
                    type: 'Feature',
                    geometry: {
                        type: record.tacke0 || 'Point',
                        coordinates: coords
                    },
                    properties: {
                        id: record.id,
                        opis: record.opis,
                        vrsta: optionsMap.vrsta[record.vrsta] || record.vrsta,
                        podvrsta: optionsMap.podvrsta[record.podvrsta] || record.podvrsta,
                        razred: optionsMap.razred[record.razred] || record.razred,
                        vrijeme0: record.vrijeme0,
                        vrijeme1: record.vrijeme1,
                        izvor: record.izvor,
                        izmjena: record.izmjena,
                        zapis: record.zapis_naziv || record.zapis_opis || (record.zapis ? `Запис ID: ${record.zapis}` : null)
                    }
                };
            })
        };

        const filename = `${themeName}_vasi_podaci.geojson`.replace(/[/\\?%*:|"<>]/g, '-');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.send(JSON.stringify(geojson, null, 2));

    } catch (err) {
        console.error('Error generating GeoJSON:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/login', authLimiter, async (req, res) => {
    // Bot Protection
    const botCheck = await validateBotProtection(req);
    if (!botCheck.valid) {
        return res.status(400).json({ error: botCheck.error });
    }

    const { username, password, remember } = req.body;

    try {
        const pool = await poolPromise;
        // Check if username matches email or username column
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT * FROM korisnik WHERE (korisnik = @username OR eposta = @username)');

        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'неисправно корисничко име/е-пошта или лозинка' });
        }

        const user = result.recordset[0];
        const previousVisit = user.pristup1;

        // Check if user is blocked
        if (user.blokiran === 1 || user.blokiran === true) {
            return res.status(403).json({ error: 'Ваш налог је блокиран. Обратите се уреднику,' });
        }

        // Verify password

        const match = await bcrypt.compare(password, user.lozinka);
        if (!match) {
            return res.status(401).json({ error: 'неисправно корисничко име/е-пошта или лозинка' });
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

        console.log(`✓ User ${user.id} authenticated. Saving session...`);
        req.session.save(err => {
            if (err) {
                console.error('CRITICAL: Session save error during login:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            console.log(`✓ Session saved for user ${user.id}. Redirecting to /karta.html`);
            res.json({ success: true, redirect: '/karta.html' });
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/register', authLimiter, async (req, res) => {
    // Bot Protection
    const botCheck = await validateBotProtection(req);
    if (!botCheck.valid) {
        return res.status(400).json({ error: botCheck.error });
    }

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
            return res.status(409).json({ error: 'Адреса е-поште се већ користи' });
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

        // Send real email via Resend
        await sendEmail({
            to: email,
            subject: 'Лозинка за приступ',
            html: `Добродошли на стране карта.СРБ! 
<br><br>
Ваша лозинка за приступ странама је: '${password}'. 
<br><br>
Након што се пријавите у дијелу 'корисник' можете да промјените лозинку и унесете остале податке. У горњем десном углу се налази листа веза према свим функцијама које можете да користите, а предлажемо да почнете од везе 'упутство' која је означена упитником и која појашњава све могућности на странама.`
        });

        res.json({ success: true, message: 'Password sent to email' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/forgot-password
app.post('/api/forgot-password', authLimiter, async (req, res) => {
    // Bot Protection
    const botCheck = await validateBotProtection(req);
    if (!botCheck.valid) {
        return res.status(400).json({ error: botCheck.error });
    }

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

        // Send real email via Resend
        await sendEmail({
            to: email,
            subject: 'Заборављена лозинка',
            html: `Ваша нова лозинка је '${newPassword}'. У дијелу 'корисник' можете да измјените лозинку поред осталих ваших података.`
        });

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

// ============================================
// Urednik (Editor) API Routes - Zapisi Approval
// ============================================

// GET /api/urednik/zapisi/pending - Fetch pending zapisi (stanje='0')
app.get('/api/urednik/zapisi/pending', async (req, res) => {
    try {
        // 1. Authentication check
        if (!req.session.user) {
            return res.status(401).json({ error: 'Морате бити пријављени' });
        }

        // 2. Admin check
        if (req.session.user.urednik != 1 && req.session.user.urednik != '1') {
            return res.status(403).json({ error: 'Немате дозволу' });
        }

        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT z.id, z.naziv, z.opis, t.naziv AS tema, k.korisnik, z.tagovi, z.created_at
            FROM zapisi z
            INNER JOIN teme t ON z.tema_id = t.id
            INNER JOIN korisnik k ON z.korisnik_id = k.id
            WHERE z.stanje = '0'
            ORDER BY z.created_at DESC
        `);

        res.json({
            success: true,
            results: result.recordset.map(row => ({
                id: row.id,
                naziv: row.naziv,
                opis: row.opis,
                tema: row.tema,
                korisnik: row.korisnik,
                tagovi: row.tagovi,
                created_at: row.created_at
            }))
        });

    } catch (err) {
        console.error('Error fetching pending zapisi:', err);
        res.status(500).json({ error: 'Грешка при добављању записа' });
    }
});

// POST /api/urednik/zapisi/process - Approve and/or delete zapisi
app.post('/api/urednik/zapisi/process', async (req, res) => {
    try {
        // 1. Authentication check
        if (!req.session.user) {
            return res.status(401).json({ error: 'Морате бити пријављени' });
        }

        // 2. Admin check
        if (req.session.user.urednik != 1 && req.session.user.urednik != '1') {
            return res.status(403).json({ error: 'Немате дозволу' });
        }

        const { approve, delete: deleteIds } = req.body;
        const pool = await poolPromise;
        let approvedCount = 0;
        let deletedCount = 0;

        // 3. Approve records (set stanje='1')
        if (approve && approve.length > 0) {
            const approveRequest = pool.request();
            const placeholders = approve.map((_, i) => `@id${i}`).join(',');
            approve.forEach((id, i) => {
                approveRequest.input(`id${i}`, sql.Int, id);
            });

            const approveResult = await approveRequest.query(`
                UPDATE zapisi 
                SET stanje = '1' 
                WHERE id IN (${placeholders}) AND stanje = '0'
            `);
            approvedCount = approveResult.rowsAffected[0];
        }

        // 4. Delete records and their files
        if (deleteIds && deleteIds.length > 0) {
            // First, get file paths for cleanup
            const fileRequest = pool.request();
            const filePlaceholders = deleteIds.map((_, i) => `@id${i}`).join(',');
            deleteIds.forEach((id, i) => {
                fileRequest.input(`id${i}`, sql.Int, id);
            });

            const fileResult = await fileRequest.query(`
                SELECT id, file_path FROM zapisi WHERE id IN (${filePlaceholders}) AND stanje = '0'
            `);

            // Delete files from filesystem
            for (const record of fileResult.recordset) {
                if (record.file_path && fs.existsSync(record.file_path)) {
                    try {
                        fs.unlinkSync(record.file_path);
                        console.log(`Deleted file: ${record.file_path}`);
                    } catch (err) {
                        console.error(`Error deleting file ${record.file_path}:`, err);
                    }
                }
            }

            // Delete records from database
            const deleteRequest = pool.request();
            deleteIds.forEach((id, i) => {
                deleteRequest.input(`id${i}`, sql.Int, id);
            });

            const deleteResult = await deleteRequest.query(`
                DELETE FROM zapisi WHERE id IN (${filePlaceholders}) AND stanje = '0'
            `);
            deletedCount = deleteResult.rowsAffected[0];
        }

        res.json({
            success: true,
            approved: approvedCount,
            deleted: deletedCount
        });

    } catch (err) {
        console.error('Error processing zapisi:', err);
        res.status(500).json({ error: 'Грешка при обради записа' });
    }
});

// ============================================
// Urednik (Editor) API Routes - Dogadjaji Approval
// ============================================

// GET /api/urednik/dogadjaji/pending - Fetch pending dogadjaji (stanje='0')
app.get('/api/urednik/dogadjaji/pending', async (req, res) => {
    try {
        // 1. Authentication check
        if (!req.session.user) {
            return res.status(401).json({ error: 'Морате бити пријављени' });
        }

        // 2. Admin check
        if (req.session.user.urednik != 1 && req.session.user.urednik != '1') {
            return res.status(403).json({ error: 'Немате дозволу' });
        }

        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT d.id, d.opis, d.pocetak, d.kraj, d.koordinate, d.izvor, d.unos, k.korisnik
            FROM dogadjaji d
            INNER JOIN korisnik k ON d.korisnik_id = k.id
            WHERE d.stanje = '0'
            ORDER BY d.unos DESC
        `);

        res.json({
            success: true,
            results: result.recordset.map(row => ({
                id: row.id,
                opis: row.opis,
                pocetak: row.pocetak ? new Date(row.pocetak).toLocaleString('sr-RS') : '',
                kraj: row.kraj ? new Date(row.kraj).toLocaleString('sr-RS') : '',
                koordinate: row.koordinate,
                izvor: row.izvor,
                korisnik: row.korisnik,
                unos: row.unos
            }))
        });

    } catch (err) {
        console.error('Error fetching pending dogadjaji:', err);
        res.status(500).json({ error: 'Грешка при добављању догађаја' });
    }
});

// POST /api/urednik/dogadjaji/process - Approve and/or delete dogadjaji
app.post('/api/urednik/dogadjaji/process', async (req, res) => {
    try {
        // 1. Authentication check
        if (!req.session.user) {
            return res.status(401).json({ error: 'Морате бити пријављени' });
        }

        // 2. Admin check
        if (req.session.user.urednik != 1 && req.session.user.urednik != '1') {
            return res.status(403).json({ error: 'Немате дозволу' });
        }

        const { approve, delete: deleteIds } = req.body;
        const pool = await poolPromise;
        let approvedCount = 0;
        let deletedCount = 0;

        // 3. Approve records (set stanje='1')
        if (approve && approve.length > 0) {
            const approveRequest = pool.request();
            const placeholders = approve.map((_, i) => `@id${i}`).join(',');
            approve.forEach((id, i) => {
                approveRequest.input(`id${i}`, sql.Int, id);
            });

            const approveResult = await approveRequest.query(`
                UPDATE dogadjaji 
                SET stanje = '1' 
                WHERE id IN (${placeholders}) AND stanje = '0'
            `);
            approvedCount = approveResult.rowsAffected[0];
        }

        // 4. Delete records
        if (deleteIds && deleteIds.length > 0) {
            const deleteRequest = pool.request();
            const placeholders = deleteIds.map((_, i) => `@id${i}`).join(',');
            deleteIds.forEach((id, i) => {
                deleteRequest.input(`id${i}`, sql.Int, id);
            });

            const deleteResult = await deleteRequest.query(`
                DELETE FROM dogadjaji WHERE id IN (${placeholders}) AND stanje = '0'
            `);
            deletedCount = deleteResult.rowsAffected[0];
        }

        res.json({
            success: true,
            approved: approvedCount,
            deleted: deletedCount
        });

    } catch (err) {
        console.error('Error processing dogadjaji:', err);
        res.status(500).json({ error: 'Грешка при обради догађаја' });
    }
});

// ============================================
// Stavke (Theme Items) Urednik API Routes
// ============================================

// GET /api/v2/urednik/stavke/pending-summary - List themes with pending counts
app.get('/api/v2/urednik/stavke/pending-summary', async (req, res) => {
    try {
        if (!req.session.user || (req.session.user.urednik != 1 && req.session.user.urednik != '1')) {
            return res.status(403).json({ error: 'Немате дозволу' });
        }

        const pool = await poolPromise;
        const themesResult = await pool.request().query('SELECT id, naziv FROM teme');
        const themes = themesResult.recordset;
        const summary = [];

        for (const theme of themes) {
            const tableName = `Table_${theme.id}`;
            try {
                const countResult = await pool.request().query(`SELECT COUNT(*) as count FROM ${tableName} WHERE stanje = '0'`);
                const pendingCount = countResult.recordset[0].count;
                if (pendingCount > 0) {
                    summary.push({
                        id: theme.id,
                        naziv: theme.naziv,
                        count: pendingCount
                    });
                }
            } catch (err) {
                // Table might not exist or other issues, skip
            }
        }

        // Sort by count descending
        summary.sort((a, b) => b.count - a.count);
        res.json({ success: true, results: summary });

    } catch (err) {
        console.error('Error fetching stavke pending summary:', err);
        res.status(500).json({ error: 'Грешка при добављању извјештаја' });
    }
});

// GET /api/v2/urednik/stavke/pending/:tema_id - Detailed pending items for a theme
app.get('/api/v2/urednik/stavke/pending/:tema_id', async (req, res) => {
    try {
        if (!req.session.user || (req.session.user.urednik != 1 && req.session.user.urednik != '1')) {
            return res.status(403).json({ error: 'Немате дозволу' });
        }

        const { tema_id } = req.params;
        if (!/^\d+$/.test(tema_id)) {
            return res.status(400).json({ error: 'Неисправан ID теме' });
        }

        const tableName = `Table_${tema_id}`;
        const pool = await poolPromise;

        // 1. Fetch pending records - Join with zapisi for filename
        const pendingResult = await pool.request().query(`
            SELECT t.ID, t.vrsta, t.podvrsta, t.razred, t.vrijeme0, t.vrijeme1, 
                   t.tacke, t.tacke0, t.opis, t.izvor, t.dodao, t.dodao_vrijeme, t.tv, t.tp, t.zapis,
                   k.korisnik, z.naziv as zapis_naziv
            FROM ${tableName} t
            LEFT JOIN korisnik k ON t.dodao = k.id
            LEFT JOIN zapisi z ON t.zapis = z.id
            WHERE t.stanje = '0'
            ORDER BY t.dodao_vrijeme DESC
        `);
        const pending = pendingResult.recordset;

        if (pending.length === 0) {
            return res.json({ success: true, pending: [], existing: [] });
        }

        // 2. Calculate time window
        let minDate = null;
        let maxDate = null;
        pending.forEach(row => {
            if (row.vrijeme0 && (!minDate || row.vrijeme0 < minDate)) minDate = row.vrijeme0;
            if (row.vrijeme1 && (!maxDate || row.vrijeme1 > maxDate)) maxDate = row.vrijeme1;
        });

        // 3. Fetch existing records in window - Join with zapisi
        let existing = [];
        if (minDate && maxDate) {
            const request = pool.request();
            request.input('min', sql.DateTime2, minDate);
            request.input('max', sql.DateTime2, maxDate);
            const existingResult = await request.query(`
                SELECT t.ID, t.vrsta, t.podvrsta, t.razred, t.vrijeme0, t.vrijeme1, t.tacke0, t.tacke, t.opis, t.izvor, t.dodao_vrijeme, t.izmjenio_vrijeme, t.tp, t.tv, t.zapis,
                       z.naziv as zapis_naziv
                FROM ${tableName} t
                LEFT JOIN zapisi z ON t.zapis = z.id
                WHERE t.stanje = '1' AND (
                    (t.vrijeme0 <= @max AND t.vrijeme1 >= @min)
                )
            `);
            existing = existingResult.recordset;
        }

        // 4. Fetch theme options for display mapping
        const optionsResult = await pool.request()
            .input('tema_id', sql.Int, tema_id)
            .query('SELECT tip, redosled, vrednost FROM teme_opcije WHERE tema_id = @tema_id');

        const options = { razred: {}, vrsta: {}, podvrsta: {} };
        optionsResult.recordset.forEach(row => {
            if (options[row.tip]) options[row.tip][row.redosled] = row.vrednost;
        });

        res.json({
            success: true,
            pending: pending.map(row => ({
                ...row,
                vrijeme0_fmt: row.vrijeme0 ? new Date(row.vrijeme0).toLocaleString('sr-RS') : '',
                vrijeme1_fmt: row.vrijeme1 ? new Date(row.vrijeme1).toLocaleString('sr-RS') : ''
            })),
            existing: existing,
            options: options
        });

    } catch (err) {
        console.error('Error fetching stavke pending detail:', err);
        res.status(500).json({ error: 'Грешка при добављању детаља' });
    }
});

// POST /api/v2/urednik/stavke/process - Bulk approve/delete stavke
app.post('/api/v2/urednik/stavke/process', async (req, res) => {
    try {
        if (!req.session.user || (req.session.user.urednik != 1 && req.session.user.urednik != '1')) {
            return res.status(403).json({ error: 'Немате дозволу' });
        }

        const { tema_id, approve, delete: deleteIds } = req.body;
        if (!/^\d+$/.test(tema_id)) {
            return res.status(400).json({ error: 'Неисправан ID теме' });
        }

        const tableName = `Table_${tema_id}`;
        const pool = await poolPromise;
        let approvedCount = 0;
        let deletedCount = 0;

        if (approve && approve.length > 0) {
            const request = pool.request();
            const placeholders = approve.map((_, i) => `@id${i}`).join(',');
            approve.forEach((id, i) => request.input(`id${i}`, sql.Int, id));
            const result = await request.query(`UPDATE ${tableName} SET stanje = '1' WHERE ID IN (${placeholders}) AND stanje = '0'`);
            approvedCount = result.rowsAffected[0];
        }

        if (deleteIds && deleteIds.length > 0) {
            const request = pool.request();
            const placeholders = deleteIds.map((_, i) => `@id${i}`).join(',');
            deleteIds.forEach((id, i) => request.input(`id${i}`, sql.Int, id));
            const result = await request.query(`DELETE FROM ${tableName} WHERE ID IN (${placeholders}) AND stanje = '0'`);
            deletedCount = result.rowsAffected[0];
        }

        res.json({ success: true, approved: approvedCount, deleted: deletedCount });

    } catch (err) {
        console.error('Error processing stavke:', err);
        res.status(500).json({ error: 'Грешка при обради' });
    }
});

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

        if (opis.length > 4000) {
            return res.status(400).json({ error: 'Опис не смије бити дужи од 4000 карактера.' });
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

        // Send notifications to subscribers
        try {
            console.log('Fetching subscribers for news notification...');
            const subscribersResult = await pool.request()
                .query("SELECT eposta FROM korisnik WHERE obavjestenja IS TRUE");
            const subscribers = subscribersResult.recordset.map(r => r.eposta).filter(e => e);

            console.log(`Found ${subscribers.length} subscribers.`);

            if (subscribers.length > 0) {
                const data = await sendEmail({
                    to: 'kontakt@1.xn--80aa2azak.xn--90a3ac', // Primary recipient (self)
                    bcc: subscribers,
                    subject: 'Новости на странама карта.СРБ',
                    html: `На странама карта.срб је објављена новост: '${opis}'.
<br><br>
Ако желите да се одјавите са примања ових порука то можете да учините у дијелу "контакт" измјеном поља за обавјештавање!`
                });
                console.log('News notifications sent successfully:', data);
            }
        } catch (emailErr) {
            console.error('Error sending news notifications:', emailErr);
            // Non-blocking error for the user
        }

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
        // Fetch top 25, ordered by time DESC
        const result = await pool.request().query('SELECT TOP 25 vrijeme, opis FROM novosti ORDER BY vrijeme DESC');

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
                // Ensure integer addition, Postgres returns COUNT as string (bigint)
                stavkiTotal += parseInt(stavkiResult.recordset[0].count, 10) || 0;
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

// ============================================
// Urednik (Editor) API Routes - User Management
// ============================================

// GET /api/urednik/users/search - Search users by username or email
app.get('/api/urednik/users/search', async (req, res) => {
    try {
        if (!req.session.user || (req.session.user.urednik != 1 && req.session.user.urednik != '1')) {
            return res.status(403).json({ error: 'Немате дозволу' });
        }

        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.json({ success: true, results: [] });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('search', sql.NVarChar, `%${q}%`)
            .query('SELECT id, korisnik, eposta FROM korisnik WHERE korisnik LIKE @search OR eposta LIKE @search');

        res.json({ success: true, results: result.recordset });
    } catch (err) {
        console.error('Error searching users:', err);
        res.status(500).json({ error: 'Грешка при претрази корисника' });
    }
});

// GET /api/urednik/users/:id - Get detailed user info and stats
app.get('/api/urednik/users/:id', async (req, res) => {
    try {
        if (!req.session.user || (req.session.user.urednik != 1 && req.session.user.urednik != '1')) {
            return res.status(403).json({ error: 'Немате дозволу' });
        }

        const { id } = req.params;
        const pool = await poolPromise;

        // 1. Fetch user data including new administration fields
        const userResult = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT id, ime, prezime, korisnik, eposta, slika_url, pristup0, pristup1, brojac_pristupa, brojac_stavki, brojac_zapisa, brojac_dogadjaja, moze_ucitati, urednik, blokiran, napomena FROM korisnik WHERE id = @id');

        if (userResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Корисник није пронађен' });
        }

        const user = userResult.recordset[0];
        res.json({ success: true, user });
    } catch (err) {
        console.error('Error fetching user details:', err);
        res.status(500).json({ error: 'Грешка при добављању података о кориснику' });
    }
});

// POST /api/urednik/users/update - Update user status and permissions
app.post('/api/urednik/users/update', async (req, res) => {
    try {
        if (!req.session.user || (req.session.user.urednik != 1 && req.session.user.urednik != '1')) {
            return res.status(403).json({ error: 'Немате дозволу' });
        }

        const { id, urednik, moze_ucitati, blokiran, napomena } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Недостаје ID корисника' });
        }

        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .input('urednik', sql.Bit, urednik ? 1 : 0)
            .input('moze_ucitati', sql.Bit, moze_ucitati ? 1 : 0)
            .input('blokiran', sql.Bit, blokiran ? 1 : 0)
            .input('napomena', sql.NVarChar, napomena || null)
            .query(`
                UPDATE korisnik 
                SET urednik = @urednik, 
                    moze_ucitati = @moze_ucitati, 
                    blokiran = @blokiran, 
                    napomena = @napomena 
                WHERE id = @id
            `);

        res.json({ success: true, message: 'Подаци успјешно ажурирани' });
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ error: 'Грешка при ажурирању корисника' });
    }
});

// ============================================
// Urednik (Editor) API Routes - Counter Sync
// ============================================


// POST /api/urednik/sync-counters - Manually trigger counter synchronization
app.post('/api/urednik/sync-counters', async (req, res) => {
    try {
        // 1. Authentication check
        if (!req.session.user) {
            return res.status(401).json({ error: 'Морате бити пријављени' });
        }

        // 2. Admin check
        if (req.session.user.urednik != 1 && req.session.user.urednik != '1') {
            return res.status(403).json({ error: 'Немате дозволу' });
        }

        const pool = await poolPromise;

        // Get all users
        const usersResult = await pool.request().query('SELECT id, korisnik FROM korisnik');
        const users = usersResult.recordset;

        // Get all themes to know which Table_X to check
        const themesResult = await pool.request().query('SELECT id FROM teme');
        const themes = themesResult.recordset;

        let updatedCount = 0;

        for (const user of users) {
            // a. Count Zapisi
            const zapisiResult = await pool.request()
                .input('userId', sql.Int, user.id)
                .query("SELECT COUNT(*) as count FROM zapisi WHERE korisnik_id = @userId AND stanje IN ('0', '1')");
            const zapisiCount = parseInt(zapisiResult.recordset[0].count, 10) || 0;

            // b. Count Dogadjaji
            const dogadjajiResult = await pool.request()
                .input('userId', sql.Int, user.id)
                .query("SELECT COUNT(*) as count FROM dogadjaji WHERE korisnik_id = @userId AND stanje IN ('0', '1')");
            const dogadjajiCount = parseInt(dogadjajiResult.recordset[0].count, 10) || 0;

            // c. Count Stavki (Iterate through all Table_X)
            let stavkiCount = 0;
            for (const theme of themes) {
                const tableName = `Table_${theme.id}`;
                try {
                    const stavkiResult = await pool.request()
                        .input('userId', sql.Int, user.id)
                        .query(`SELECT COUNT(*) as count FROM ${tableName} WHERE dodao = @userId AND stanje IN ('0', '1')`);
                    stavkiCount += parseInt(stavkiResult.recordset[0].count, 10) || 0;
                } catch (err) {
                    // Table might not exist yet for new themes
                }
            }

            // d. Update korisnik table
            await pool.request()
                .input('userId', sql.Int, user.id)
                .input('stavki', sql.Int, stavkiCount)
                .input('zapisi', sql.Int, zapisiCount)
                .input('dogadjaji', sql.Int, dogadjajiCount)
                .query(`
                    UPDATE korisnik 
                    SET brojac_stavki = @stavki, 
                        brojac_zapisa = @zapisi, 
                        brojac_dogadjaja = @dogadjaji 
                    WHERE id = @userId
                `);

            updatedCount++;
        }

        res.json({
            success: true,
            message: `Бројачи синхронизовани за ${updatedCount} корисника`
        });

    } catch (err) {
        console.error('Error syncing counters:', err);
        res.status(500).json({ error: 'Грешка при синхронизацији бројача' });
    }
});

// POST /api/urednik/teme/toggle-lock - Toggle theme lock status
app.post('/api/urednik/teme/toggle-lock', async (req, res) => {
    try {
        // 1. Authentication check
        if (!req.session.user) {
            return res.status(401).json({ error: 'Морате бити пријављени' });
        }

        // 2. Admin check
        if (req.session.user.urednik != 1 && req.session.user.urednik != '1') {
            return res.status(403).json({ error: 'Немате дозволу' });
        }

        const { tema_id } = req.body;

        if (!tema_id) {
            return res.status(400).json({ error: 'ID теме је обавезан' });
        }

        const pool = await poolPromise;

        // Get current lock status
        const currentResult = await pool.request()
            .input('tema_id', sql.Int, tema_id)
            .query('SELECT zakljucano FROM teme WHERE id = @tema_id');

        if (currentResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Тема није пронађена' });
        }

        const currentStatus = currentResult.recordset[0].zakljucano;
        const newStatus = !currentStatus; // Toggle

        // Update the lock status
        await pool.request()
            .input('tema_id', sql.Int, tema_id)
            .input('zakljucano', sql.Bit, newStatus ? true : false)
            .query('UPDATE teme SET zakljucano = @zakljucano WHERE id = @tema_id');

        res.json({
            success: true,
            zakljucano: newStatus
        });

    } catch (err) {
        console.error('Error toggling theme lock:', err);
        res.status(500).json({ error: 'Грешка при измјени статуса закључавања' });
    }
});

// GET /api/urednik/comments/reported - Fetch comments with downvotes > 0
app.get('/api/urednik/comments/reported', async (req, res) => {
    try {
        if (!req.session.user || (req.session.user.urednik != 1 && req.session.user.urednik != '1')) {
            return res.status(403).json({ error: 'Немате дозволу' });
        }

        const pool = await poolPromise;

        // Query to get reported comments (downvote_count > 0)
        // Join with teme for theme name, join with korisnik for author info
        const result = await pool.request().query(`
            SELECT 
                c.id, 
                c.content, 
                c.upvote_count, 
                c.downvote_count, 
                c.target_type, 
                c.target_id,
                c.created,
                k.slika_url AS author_picture_url,
                k.korisnik,
                k.eposta,
                k.ime,
                k.prezime,
                CASE 
                    WHEN c.target_type = 'dogadjaj' THEN 'догађаји'
                    ELSE t.naziv 
                END as theme_name
            FROM comments c
            LEFT JOIN teme t ON c.target_type = CAST(t.id AS VARCHAR)
            LEFT JOIN korisnik k ON c.creator = k.id
            WHERE c.downvote_count > 0
            ORDER BY c.downvote_count DESC, c.created DESC
        `);

        res.json({ success: true, results: result.recordset });
    } catch (err) {
        console.error('Error fetching reported comments:', err);
        res.status(500).json({ error: 'Грешка при добављању примедби' });
    }
});

// POST /api/upload-profile-picture
app.post('/api/upload-profile-picture', (req, res) => {
    // Check for upload directory existence - moved to consolidated /uploads path
    const uploadDir = path.join(__dirname, 'uploads', 'slike', 'users');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Use a specific storage config for profile pictures to ensure correct path
    const profileStorage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
            cb(null, Date.now() + '-' + cleanName);
        }
    });

    const profileUpload = multer({
        storage: profileStorage,
        limits: { fileSize: 100 * 1024 }, // 100KB limit
        fileFilter: (req, file, cb) => {
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('Није дозвољен формат фајла. Само слике су дозвољене.'));
            }
        }
    }).single('profile_picture');

    profileUpload(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: 'Грешка при отпремању: ' + err.message });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Нисте изабрали фајл.' });
        }

        // Virus scanning
        try {
            const { isInfected, viruses } = await scanFileWithVirusTotal(req.file.path);
            if (isInfected) {
                fs.unlinkSync(req.file.path);
                console.warn(`⚠ Virus detected in profile picture upload: ${viruses.join(', ')}`);
                return res.status(400).json({
                    error: 'Фајл садржи вирус и није могао бити учитан'
                });
            }
        } catch (scanErr) {
            console.error('Virus scan error (fail-open):', scanErr);
            // Continue if scan fails
        }

        const fileUrl = '/slike/users/' + req.file.filename;
        res.json({ url: fileUrl });
    });
});

// Serve static files from the new relocated icon folder for backwards compatibility
app.use('/slike/users', express.static(path.join(__dirname, 'uploads', 'slike', 'users')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files (MUST be after API routes to avoid conflicts)
app.use(express.static(path.join(__dirname, '.')));

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

// --- Monthly Digest Logic ---
async function runMonthlyDigest() {
    try {
        const pool = await poolPromise;
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
        const statusPath = path.join(__dirname, 'monthly_digest_status.json');

        // Skip if not the first day of the month or already sent this month
        // For testing purposes during implementation, you might want to bypass the date check
        if (now.getDate() !== 1) return;

        let status = { lastSentMonth: '' };
        if (fs.existsSync(statusPath)) {
            try {
                status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
            } catch (e) {
                console.error('Error reading monthly_digest_status.json:', e);
            }
        }

        if (status.lastSentMonth === currentMonthKey) return;

        console.log(`Starting monthly digest check for ${currentMonthKey}...`);

        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // 1. Gather stats from the previous month
        const newsCountResult = await pool.request()
            .input('start', sql.DateTime2, startOfLastMonth)
            .input('end', sql.DateTime2, startOfThisMonth)
            .query("SELECT COUNT(*) as count FROM novosti WHERE vrijeme >= @start AND vrijeme < @end");
        const newsCount = newsCountResult.recordset[0].count;

        const dogadjajiCountResult = await pool.request()
            .input('start', sql.DateTime2, startOfLastMonth)
            .input('end', sql.DateTime2, startOfThisMonth)
            .query("SELECT COUNT(*) as count FROM dogadjaji WHERE unos >= @start AND unos < @end AND stanje = '1'");
        const dogadjajiCount = dogadjajiCountResult.recordset[0].count;

        // Sum of Table_X records (items)
        const themesResult = await pool.request().query("SELECT id FROM teme");
        let itemsCount = 0;
        for (const theme of themesResult.recordset) {
            try {
                const tableResult = await pool.request()
                    .input('start', sql.DateTime2, startOfLastMonth)
                    .input('end', sql.DateTime2, startOfThisMonth)
                    .query(`SELECT COUNT(*) as count FROM Table_${theme.id} WHERE dodao_vrijeme >= @start AND dodao_vrijeme < @end AND stanje = '1'`);
                itemsCount += parseInt(tableResult.recordset[0].count) || 0;
            } catch (e) { }
        }

        // Teme table doesn't have created_at, so we count 0 for now as a placeholder
        const themesCount = 0;

        // 2. Find users who were inactive for the entire last month and have notifications enabled
        const recipientsResult = await pool.request()
            .input('start', sql.DateTime2, startOfLastMonth)
            .query(`
                SELECT eposta FROM korisnik 
                WHERE (obavjestenja = true OR obavjestenja = 'true' OR obavjestenja = 1)
                AND (pristup1 < @start OR (pristup1 IS NULL AND (pristup0 < @start OR pristup0 IS NULL)))
            `);
        const recipients = recipientsResult.recordset.map(r => r.eposta).filter(e => e);

        // 3. Only send if there were updates and there are recipients
        if (recipients.length > 0 && (newsCount > 0 || dogadjajiCount > 0 || itemsCount > 0)) {
            await sendEmail({
                to: 'kontakt@1.xn--80aa2azak.xn--90a3ac', // System address as primary recipient
                bcc: recipients,
                subject: 'У међувремену на странама карта.СРБ',
                html: `У протеклих мјесец дана колико нисте били на странама, унето је новости: '${newsCount}', тема: '${themesCount}', ставки: '${itemsCount}', догађаја: '${dogadjajiCount}'. Надамо се да би нешто од овога било вриједно ваше пажње! До поновног логовања, срдачно вас поздрављамо! 
<br><br>
Ако желите да се одјавите са примања ових порука то можете да учините у дијелу "контакт" измјеном поља за обавјештавање!`
            });
            console.log(`✓ Monthly digest sent to ${recipients.length} recipients for period ending ${startOfThisMonth.toDateString()}`);
        } else {
            console.log('Monthly digest skipped: No updates or no inactive recipients found.');
        }

        // 4. Update status so we don't send again this month
        status.lastSentMonth = currentMonthKey;
        fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));

    } catch (err) {
        console.error('Error in monthly digest task:', err);
    }
}

// Check every hour
setInterval(runMonthlyDigest, 3600000);
// Also run on startup after 1 minute to allow server to stabilize
setTimeout(runMonthlyDigest, 60000);
