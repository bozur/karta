/**
 * import_to_prod_db.js
 *
 * Izvrsava kompletan uvoz u PRODUKCIONU PostgreSQL bazu iz `priprema_za_PRODUKCIJU_table2.xlsx`
 * (BEZ ikakvog prepisivanja ili menjanja samog Excel fajla):
 *   1. Proverava / dodaje opciju (2, 'vrsta', 6, 'није одређено') u tabelu `teme_opcije` (ako vec ne postoji).
 *   2. Proverava da li Vasmerova knjiga `Die_Slaven_in_Griechenland.pdf` postoji u tabeli `zapisi` pod ID = 1.
 *   3. Cita direktno `priprema_za_PRODUKCIJU_table2.xlsx` i u jednoj transakciji izvrsava:
 *      - UPDATE za redove iz lista `1_ZA_UPDATE` (gde je AKCIJA = 'UPDATE')
 *      - Grupni (batch) INSERT za redove iz lista `2_ZA_INSERT` (gde je AKCIJA = 'INSERT', sa ID-jevima od MAX(id)+1 nadalje).
 */

const path = require('path');
const { Pool } = require('pg');
const xlsx = require('./node_modules/xlsx');

const PROD_URL = process.env.PROD_DATABASE_URL;
if (!PROD_URL) {
    console.error('Nedostaje PROD_DATABASE_URL env promenljiva!');
    process.exit(1);
}
const FILE_PROD = path.join(__dirname, 'priprema_za_PRODUKCIJU_table2.xlsx');

async function main() {
    console.log('=== Povezivanje sa PRODUKCIONOM PostgreSQL bazom ===');
    const pool = new Pool({
        connectionString: PROD_URL,
        ssl: { rejectUnauthorized: false }
    });
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Provera / dodavanje opcije "није одређено" (vrsta=6) u `teme_opcije`
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
            console.log('   + Dodata nova opcija na produkciji: (tema_id=2, tip=vrsta, redosled=6, vrednost="није одређено")');
        } else {
            console.log('   = Opcija "није одређено" (redosled=6) vec postoji na produkciji.');
        }

        // 2. Proveri Vasmerov PDF u tabeli `zapisi`
        console.log('\n2. Provera Vasmerove knjige u produkcionoj tabeli `zapisi`...');
        const checkZapis = await client.query(
            `SELECT id, naziv, file_path FROM zapisi WHERE id = 1 OR file_path ILIKE '%Die_Slaven_in_Griechenland%' OR naziv ILIKE '%Vasmer%' ORDER BY id ASC LIMIT 1`
        );
        let vasmerZapisId = 1;
        if (checkZapis.rows.length > 0) {
            vasmerZapisId = Number(checkZapis.rows[0].id);
            console.log(`   = Vasmerov PDF pronadjen u tabeli zapisi pod ID = ${vasmerZapisId} ("${checkZapis.rows[0].naziv}")`);
        } else {
            throw new Error('Vasmerov PDF nije pronadjen u produkcionoj tabeli zapisi!');
        }

        // 3. Ucitaj `priprema_za_PRODUKCIJU_table2.xlsx`
        console.log(`\n3. Ucitavanje fajla ${FILE_PROD}...`);
        const wb = xlsx.readFile(FILE_PROD);
        const s1 = xlsx.utils.sheet_to_json(wb.Sheets['1_ZA_UPDATE'], { defval: '' });
        const s2 = xlsx.utils.sheet_to_json(wb.Sheets['2_ZA_INSERT'], { defval: '' });

        const beforeRes = await client.query(`SELECT COUNT(*) AS cnt, MAX(id) AS max_id FROM table_2`);
        const maxIdBefore = Number(beforeRes.rows[0].max_id || 1236);
        console.log(`   Pre uvoza u produkcionoj table_2: ${beforeRes.rows[0].cnt} redova (MAX id = ${maxIdBefore})`);

        // 4. Izvrsi UPDATE na `table_2` za list 1_ZA_UPDATE
        console.log(`\n4. Izvrsavanje UPDATE u produkcionoj table_2 (${s1.length} redova)...`);
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
                console.warn(`   ! UPOZORENJE: Red sa db_id = ${dbId} iz 1_ZA_UPDATE nije pronadjen u produkcionoj table_2!`);
            }
        }
        console.log(`   = Uspesno azurirano (UPDATE) ${updatedCount} postojecih redova u produkcionoj table_2 (preskoceno: ${skippedUpdateCount}).`);

        // 5. Izvrsi grupni (batch) INSERT u `table_2` za list 2_ZA_INSERT
        console.log(`\n5. Izvrsavanje INSERT u produkcionoj table_2 (${s2.length} redova)...`);
        await client.query(`SELECT setval(pg_get_serial_sequence('table_2', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM table_2), 0), 1236) + 1, false)`);

        const rowsToInsert = [];
        for (const r of s2) {
            const akcija = String(r.AKCIJA || '').trim().toUpperCase();
            if (akcija !== 'INSERT') continue;
            rowsToInsert.push(r);
        }

        const BATCH_SIZE = 200;
        let insertedCount = 0;

        for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
            const batch = rowsToInsert.slice(i, i + BATCH_SIZE);
            const values = [];
            const placeholders = [];
            let pIdx = 1;

            for (const r of batch) {
                const opisStr = String(r.opis).slice(0, 255);
                const tackeStr = String(r.tacke);
                let lon = 0, lat = 0;
                try {
                    const parsed = JSON.parse(tackeStr);
                    lon = parsed[0];
                    lat = parsed[1];
                } catch (e) {}

                const wkt = `POINT (${lon} ${lat})`;
                const hasVasmer = String(r.vasmer_grcki_naziv || '').trim() !== '' || String(r.zapis || '').trim() !== '';
                const zapisVal = hasVasmer ? vasmerZapisId : null;

                placeholders.push(
                    `($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, 1, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`
                );
                values.push(
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
                );
            }

            await client.query(
                `INSERT INTO table_2
                 (vrsta, podvrsta, razred, prostorno, prostorno2, tp, vrijeme0, vrijeme1, tv, opis, izvor, dodao, dodao_vrijeme, odobrio, odobrio_vrijeme, tacke, tacke0, zapis, stanje)
                 VALUES ${placeholders.join(', ')}`,
                values
            );
            insertedCount += batch.length;
            console.log(`   ... uneto ${insertedCount} / ${rowsToInsert.length}`);
        }

        await client.query('COMMIT');
        console.log(`   = Uspesno dodato (INSERT) ${insertedCount} novih redova u produkcionu table_2.`);

        const totalRes = await client.query(`SELECT COUNT(*) AS cnt, MIN(id) AS min_id, MAX(id) AS max_id FROM table_2`);
        const origRes = await client.query(`SELECT COUNT(*) AS cnt FROM table_2 WHERE id <= 1236`);
        const newRes = await client.query(`SELECT COUNT(*) AS cnt FROM table_2 WHERE id > 1236`);
        console.log(`\n=== ZAVRSENO NA PRODUKCIJI! ===`);
        console.log(`   - Postojecih redova na produkciji (id <= 1236): ${origRes.rows[0].cnt}`);
        console.log(`   - Novih unetih redova (id > 1236):              ${newRes.rows[0].cnt}`);
        console.log(`   - UKUPNO u produkcionoj table_2:                ${totalRes.rows[0].cnt} (ID opseg: ${totalRes.rows[0].min_id} .. ${totalRes.rows[0].max_id})`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('GRESKA pri uvozu na produkciju (transakcija ponistena / ROLLBACK):', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
