/**
 * import_to_local_db.js
 *
 * Izvrsava kompletan uvoz u lokalnu PostgreSQL bazu iz `priprema_za_bazu_table2.xlsx`
 * (BEZ ikakvog prepisivanja ili menjanja samog Excel fajla):
 *   1. Dodaje opciju (2, 'vrsta', 6, 'није одређено') u tabelu `teme_opcije` (ako vec ne postoji).
 *   2. Registruje Vasmerovu knjigu `Die_Slaven_in_Griechenland.pdf` u tabelu `zapisi` (ako vec ne postoji)
 *      i uzima njen tacan `id` (vasmerZapisId).
 *   3. Cita direktno `priprema_za_bazu_table2.xlsx` i u transakciji izvrsava:
 *      - UPDATE za redove iz lista `1_ZA_UPDATE` (gde je AKCIJA = 'UPDATE')
 *      - INSERT za redove iz lista `2_ZA_INSERT` (gde je AKCIJA = 'INSERT', sa ID-jevima od 887 nadalje).
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('./node_modules/xlsx');
const { pool } = require('../db.js');

const FILE_MAIN = path.join(__dirname, 'priprema_za_bazu_table2.xlsx');
const PDF_UPLOAD_PATH = path.join(__dirname, '..', 'uploads', 'zapisi', 'Die_Slaven_in_Griechenland.pdf');

async function main() {
    console.log('=== Povezivanje sa lokalnom PostgreSQL bazom ===');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Dodaj "није одређено" (redosled = 6) za tema_id = 2, tip = 'vrsta' u `teme_opcije`
        console.log('\n1. Provera / dodavanje opcije "није одређено" (vrsta=6) u teme_opcije...');
        const checkOpt = await client.query(
            `SELECT id, redosled, vrednost FROM teme_opcije WHERE tema_id = 2 AND tip = 'vrsta' ORDER BY redosled`
        );
        console.log('   Postojece opcije za vrsta (tema 2):', checkOpt.rows.map(r => `${r.redosled}=${r.vrednost}`).join(', '));

        const hasNijeOdredjeno = checkOpt.rows.some(r => Number(r.redosled) === 6 || r.vrednost === 'није одређено');
        if (!hasNijeOdredjeno) {
            await client.query(
                `INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (2, 'vrsta', 6, 'није одређено')`
            );
            console.log('   + Dodata nova opcija: (tema_id=2, tip=vrsta, redosled=6, vrednost="није одређено")');
        } else {
            console.log('   = Opcija "није одређено" (redosled=6) vec postoji.');
        }

        // 2. Proveri / dodaj Vasmerov PDF u tabelu `zapisi`
        console.log('\n2. Provera / unos Vasmerove knjige u tabelu `zapisi`...');
        const checkZapis = await client.query(
            `SELECT id, naziv, file_path FROM zapisi WHERE file_path ILIKE '%Die_Slaven_in_Griechenland.pdf%' OR naziv ILIKE '%Vasmer%' OR naziv ILIKE '%Slaven in Griechenland%' LIMIT 1`
        );

        let vasmerZapisId = null;
        if (checkZapis.rows.length > 0) {
            vasmerZapisId = checkZapis.rows[0].id;
            console.log(`   = Vasmerov PDF vec postoji u tabeli zapisi pod ID = ${vasmerZapisId} ("${checkZapis.rows[0].naziv}")`);
        } else {
            const fileSize = fs.existsSync(PDF_UPLOAD_PATH) ? fs.statSync(PDF_UPLOAD_PATH).size : 5921139;
            await client.query(`SELECT setval(pg_get_serial_sequence('zapisi', 'id'), COALESCE((SELECT MAX(id) FROM zapisi), 0) + 1, false)`);
            const insZapis = await client.query(
                `INSERT INTO zapisi (naziv, opis, tema_id, korisnik_id, tagovi, file_path, file_type, file_size, stanje, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
                 RETURNING id`,
                [
                    'Max Vasmer - Die Slaven in Griechenland (1941)',
                    'Макс Фасмер: Словени у Грчкој (Берлин, 1941) — етимолошки и географски преглед словенских топонима у Грчкој',
                    2,
                    1,
                    'Васмер, Фасмер, Грчка, топоними, преименовања, Словени, Срби',
                    PDF_UPLOAD_PATH,
                    'pdf',
                    fileSize,
                    '1'
                ]
            );
            vasmerZapisId = insZapis.rows[0].id;
            console.log(`   + Uspesno unet Vasmerov PDF u tabelu zapisi! Dodeljeni ID = ${vasmerZapisId}`);
        }

        // 3. Ucitaj `priprema_za_bazu_table2.xlsx` (samo citanje, bez prepisivanja Excela!)
        console.log(`\n3. Ucitavanje fajla ${FILE_MAIN}...`);
        const wb = xlsx.readFile(FILE_MAIN);
        const s1 = xlsx.utils.sheet_to_json(wb.Sheets['1_ZA_UPDATE'], { defval: '' });
        const s2 = xlsx.utils.sheet_to_json(wb.Sheets['2_ZA_INSERT'], { defval: '' });

        // 4. Izvrsi UPDATE na `table_2` za list 1_ZA_UPDATE
        console.log(`\n4. Izvrsavanje UPDATE u table_2 (${s1.length} redova)...`);
        let updatedCount = 0;
        let skippedUpdateCount = 0;

        for (const r of s1) {
            const akcija = String(r.AKCIJA || '').trim().toUpperCase();
            if (akcija !== 'UPDATE') {
                skippedUpdateCount++;
                continue;
            }
            const dbId = parseInt(r['db_id (table_2.id)'], 10);
            if (isNaN(dbId)) continue;

            const hasVasmer = String(r.vasmer_grcki_naziv || '').trim() !== '' || String(r.zapis || '').trim() !== '';
            const zapisVal = hasVasmer ? vasmerZapisId : null;

            const res = await client.query(
                `UPDATE table_2
                 SET vrsta = $1,
                     podvrsta = $2,
                     razred = $3,
                     opis = $4,
                     izvor = $5,
                     zapis = $6,
                     vrijeme0 = $7,
                     vrijeme1 = $8,
                     tv = $9,
                     tp = $10,
                     izmjenio = 1,
                     izmjenio_vrijeme = CURRENT_TIMESTAMP
                 WHERE id = $11`,
                [
                    String(r.vrsta).trim(),
                    String(r.podvrsta || '2').trim(),
                    String(r.razred).trim(),
                    String(r.opis).slice(0, 255),
                    String(r.izvor).slice(0, 255),
                    zapisVal,
                    r.vrijeme0 || '1900-01-01 12:00:00+00',
                    r.vrijeme1 || r.vrijeme0 || '1900-01-01 12:00:00+00',
                    String(r.tv || '1').trim(),
                    String(r.tp || '1').trim(),
                    dbId
                ]
            );
            if (res.rowCount > 0) {
                updatedCount += res.rowCount;
            } else {
                console.warn(`   ! UPOZORENJE: Red sa db_id = ${dbId} iz 1_ZA_UPDATE nije pronadjen u table_2!`);
            }
        }
        console.log(`   = Uspesno azurirano (UPDATE) ${updatedCount} postojecih redova u lokalnoj table_2 (preskoceno: ${skippedUpdateCount}).`);

        // 5. Izvrsi INSERT u `table_2` za list 2_ZA_INSERT
        console.log(`\n5. Izvrsavanje INSERT u table_2 (${s2.length} redova)...`);
        // Osiguraj da sekvenca za table_2.id krece najmanje od 887 (MAX(id) originalne baze je 886)
        await client.query(`SELECT setval(pg_get_serial_sequence('table_2', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM table_2), 0), 886) + 1, false)`);

        const existingOpisiRes = await client.query(`SELECT opis, tacke FROM table_2 WHERE id > 886`);
        const existingSet = new Set(existingOpisiRes.rows.map(x => `${x.opis}::${x.tacke}`));

        let insertedCount = 0;
        let skippedExisting = 0;

        for (const r of s2) {
            const akcija = String(r.AKCIJA || '').trim().toUpperCase();
            if (akcija !== 'INSERT') continue;

            const opisStr = String(r.opis).slice(0, 255);
            const tackeStr = String(r.tacke);
            const key = `${opisStr}::${tackeStr}`;
            if (existingSet.has(key)) {
                skippedExisting++;
                continue;
            }

            let lon = 0, lat = 0;
            try {
                const parsed = JSON.parse(tackeStr);
                lon = parsed[0];
                lat = parsed[1];
            } catch (e) {}

            const wkt = `POINT (${lon} ${lat})`;
            const hasVasmer = String(r.vasmer_grcki_naziv || '').trim() !== '' || String(r.zapis || '').trim() !== '';
            const zapisVal = hasVasmer ? vasmerZapisId : null;

            await client.query(
                `INSERT INTO table_2
                 (vrsta, podvrsta, razred, prostorno, prostorno2, tp, vrijeme0, vrijeme1, tv, opis, izvor, dodao, dodao_vrijeme, odobrio, odobrio_vrijeme, tacke, tacke0, zapis, stanje)
                 VALUES
                 ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, $12, $13, $14, $15)`,
                [
                    String(r.vrsta).trim(),
                    String(r.podvrsta || '2').trim(),
                    String(r.razred).trim(),
                    wkt,
                    wkt,
                    String(r.tp || '1').trim(),
                    r.vrijeme0 || '1900-01-01 12:00:00+00',
                    r.vrijeme1 || r.vrijeme0 || '1900-01-01 12:00:00+00',
                    String(r.tv || '1').trim(),
                    opisStr,
                    String(r.izvor).slice(0, 255),
                    tackeStr,
                    String(r.tacke0 || 'Point').trim(),
                    zapisVal,
                    String(r.stanje || '1').trim()
                ]
            );
            insertedCount++;
            existingSet.add(key);
        }

        await client.query('COMMIT');
        console.log(`   = Uspesno dodato (INSERT) ${insertedCount} novih redova u table_2 (preskoceno vec prisutnih: ${skippedExisting}).`);

        const totalRes = await client.query(`SELECT COUNT(*) AS cnt, MIN(id) AS min_id, MAX(id) AS max_id FROM table_2`);
        const origRes = await client.query(`SELECT COUNT(*) AS cnt FROM table_2 WHERE id <= 886`);
        const newRes = await client.query(`SELECT COUNT(*) AS cnt FROM table_2 WHERE id > 886`);
        console.log(`\n=== ZAVRSENO! ===`);
        console.log(`   - Originalnih redova (id <= 886): ${origRes.rows[0].cnt}`);
        console.log(`   - Novih redova (id > 886):        ${newRes.rows[0].cnt}`);
        console.log(`   - UKUPNO u lokalnoj table_2:      ${totalRes.rows[0].cnt} (ID opseg: ${totalRes.rows[0].min_id} .. ${totalRes.rows[0].max_id})`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('GRESKA pri uvozu u bazu (transakcija ponistena / ROLLBACK):', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
