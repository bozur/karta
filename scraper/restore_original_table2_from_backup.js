/**
 * restore_original_table2_from_backup.js
 *
 * Vraca sve originalne redove (id = 1..885, ukupno 872 reda) iz `C:\karta\database\backup_2026_02_07.sql`
 * u lokalnu PostgreSQL tabelu `table_2`, jer su originalni redovi imali rupe u ID brojevima
 * pa su se protezali do ID = 885 (a ne do 622).
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../db.js');

const BACKUP_SQL = path.join(__dirname, '..', 'database', 'backup_2026_02_07.sql');

async function main() {
    const sql = fs.readFileSync(BACKUP_SQL, 'utf8');
    const lines = sql.split('\n');
    const rows = [];
    let inT2 = false;

    for (const l of lines) {
        if (l.startsWith('COPY public.table_2 ')) {
            inT2 = true;
            continue;
        }
        if (inT2) {
            if (l.startsWith('\\.')) break;
            const cols = l.split('\t').map(c => (c === '\\N' ? null : c));
            rows.push(cols);
        }
    }

    console.log(`Procitano ${rows.length} originalnih redova iz backup_2026_02_07.sql (max ID = ${rows[rows.length - 1][0]}).`);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let restoredCount = 0;
        for (const cols of rows) {
            const id = parseInt(cols[0], 10);
            const res = await client.query(
                `INSERT INTO table_2 (
                    id, vrsta, podvrsta, razred, prostorno, prostorno2, tp,
                    vrijeme0, vrijeme1, tv, opis, izvor, dodao, dodao_vrijeme,
                    odobrio, odobrio_vrijeme, tacke, tacke0, zapis, stanje,
                    izmjenio, izmjenio_vrijeme
                 ) VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
                 )
                 ON CONFLICT (id) DO UPDATE SET
                    vrsta = EXCLUDED.vrsta,
                    podvrsta = EXCLUDED.podvrsta,
                    razred = EXCLUDED.razred,
                    prostorno = EXCLUDED.prostorno,
                    prostorno2 = EXCLUDED.prostorno2,
                    tp = EXCLUDED.tp,
                    vrijeme0 = EXCLUDED.vrijeme0,
                    vrijeme1 = EXCLUDED.vrijeme1,
                    tv = EXCLUDED.tv,
                    opis = EXCLUDED.opis,
                    izvor = EXCLUDED.izvor,
                    tacke = EXCLUDED.tacke,
                    tacke0 = EXCLUDED.tacke0,
                    zapis = EXCLUDED.zapis,
                    stanje = EXCLUDED.stanje`,
                [
                    id, cols[1], cols[2], cols[3], cols[4], cols[5], cols[6],
                    cols[7], cols[8], cols[9], cols[10], cols[11],
                    cols[12] ? parseInt(cols[12], 10) : null, cols[13],
                    cols[14] ? parseInt(cols[14], 10) : null, cols[15],
                    cols[16], cols[17],
                    cols[18] ? parseInt(cols[18], 10) : null, cols[19],
                    cols[20] ? parseInt(cols[20], 10) : null, cols[21]
                ]
            );
            restoredCount += res.rowCount;
        }

        await client.query(`SELECT setval(pg_get_serial_sequence('table_2', 'id'), COALESCE((SELECT MAX(id) FROM table_2), 0) + 1, false)`);
        await client.query('COMMIT');

        const afterRes = await client.query('SELECT COUNT(*) AS cnt, MAX(id) AS max_id FROM table_2');
        console.log(`Uspesno vraceno svih ${afterRes.rows[0].cnt} originalnih redova u table_2 (MAX id = ${afterRes.rows[0].max_id})!`);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Greska:', e);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
