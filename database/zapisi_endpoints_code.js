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
                error: 'Неисправна врста фајла. Дозвољене врсте записа су: PDF, JPG, PNG'
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

        res.download(record.file_path, record.naziv + '.' + record.file_type);

    } catch (err) {
        console.error('Error retrieving file:', err);
        res.status(500).json({ error: 'Грешка при преузимању фајла' });
    }
});
