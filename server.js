const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { poolPromise, sql } = require('./db');
const session = require('express-session');
const bcrypt = require('bcrypt');


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
            .query('SELECT id, ime, prezime, korisnik, eposta, pristup0, pristup1, brojac_pristupa FROM korisnik WHERE id = @id');

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
