/**
 * sync_prod_table2_to_local.js
 *
 * Preuzima svih 5.262 redova iz PRODUKCIONE tabele `table_2` (READ-ONLY)
 * i preslikava ih 1-na-1 u LOKALNU tabelu `table_2` sa istim `id`-jevima,
 * uz mapiranje `zapis = 1` (produkcijski ID Vasmerovog PDF-a) -> lokalni ID Vasmerovog PDF-a (`7`).
 */

const { Pool } = require('pg');
const { pool: localPool } = require('../db.js');

const PROD_URL = process.env.PROD_DATABASE_URL;
if (!PROD_URL) {
    console.error('Nedostaje PROD_DATABASE_URL env promenljiva!');
    process.exit(1);
}

async function main() {
    console.log('=== 1. Citanje svih redova iz PRODUKCIONE table_2 (READ-ONLY) ===');
    const prodPool = new Pool({
        connectionString: PROD_URL,
        ssl: { rejectUnauthorized: false }
    });

    let prodRows = [];
    const prodClient = await prodPool.connect();
    try {
        const res = await prodClient.query(`SELECT * FROM table_2 ORDER BY id ASC`);
        prodRows = res.rows;
        console.log(`   = Preuzeto ${prodRows.length} redova sa produkcije (MAX id = ${prodRows.length ? prodRows[prodRows.length - 1].id : 0}).`);
    } finally {
        prodClient.release();
        await prodPool.end();
    }

    console.log('\n=== 2. Upis u LOKALNU table_2 ===');
    const localClient = await localPool.connect();
    try {
        await localClient.query('BEGIN');

        // Pronadji lokalni ID Vasmerovog PDF-a u tabeli zapisi
        const zRes = await localClient.query(
            `SELECT id FROM zapisi WHERE file_path ILIKE '%Die_Slaven_in_Griechenland%' OR naziv ILIKE '%Vasmer%' ORDER BY id ASC LIMIT 1`
        );
        const localVasmerId = zRes.rows.length > 0 ? Number(zRes.rows[0].id) : 7;
        console.log(`   = Lokalni ID za Vasmerov PDF u tabeli zapisi: ${localVasmerId}`);

        // Isprazni lokalnu table_2
        await localClient.query(`TRUNCATE TABLE table_2`);

        const BATCH_SIZE = 200;
        let inserted = 0;

        for (let i = 0; i < prodRows.length; i += BATCH_SIZE) {
            const batch = prodRows.slice(i, i + BATCH_SIZE);
            const values = [];
            const placeholders = [];
            let pIdx = 1;

            for (const r of batch) {
                // Ako je zapis na produkciji bio 1 (Vasmer), na lokalu stavljamo localVasmerId (7)
                const mappedZapis = (r.zapis !== null && Number(r.zapis) === 1) ? localVasmerId : r.zapis;

                placeholders.push(
                    `($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`
                );
                values.push(
                    r.id,
                    r.vrsta,
                    r.podvrsta,
                    r.razred,
                    r.prostorno,
                    r.prostorno2,
                    r.tp,
                    r.vrijeme0,
                    r.vrijeme1,
                    r.tv,
                    r.opis,
                    r.izvor,
                    r.dodao,
                    r.dodao_vrijeme,
                    r.izmjenio,
                    r.izmjenio_vrijeme,
                    r.odobrio,
                    r.odobrio_vrijeme,
                    r.tacke,
                    r.tacke0,
                    mappedZapis,
                    r.stanje
                );
            }

            await localClient.query(
                `INSERT INTO table_2
                 (id, vrsta, podvrsta, razred, prostorno, prostorno2, tp, vrijeme0, vrijeme1, tv, opis, izvor, dodao, dodao_vrijeme, izmjenio, izmjenio_vrijeme, odobrio, odobrio_vrijeme, tacke, tacke0, zapis, stanje)
                 VALUES ${placeholders.join(', ')}`,
                values
            );
            inserted += batch.length;
        }

        // Sinhronizuj sekvencu za id
        await localClient.query(`SELECT setval(pg_get_serial_sequence('table_2', 'id'), COALESCE((SELECT MAX(id) FROM table_2), 0) + 1, false)`);

        await localClient.query('COMMIT');

        const checkRes = await localClient.query(`SELECT COUNT(*) AS cnt, MIN(id) AS min_id, MAX(id) AS max_id, COUNT(zapis) AS with_zapis FROM table_2`);
        console.log(`\n=== ZAVRSENO NA LOKALU! ===`);
        console.log(`   - Ukupno redova u lokalnoj table_2: ${checkRes.rows[0].cnt}`);
        console.log(`   - ID opseg:                         ${checkRes.rows[0].min_id} .. ${checkRes.rows[0].max_id}`);
        console.log(`   - Redova povezanih sa Vasmer PDF (zapis=${localVasmerId}): ${checkRes.rows[0].with_zapis}`);
    } catch (err) {
        await localClient.query('ROLLBACK');
        console.error('GRESKA pri sinhronizaciji na lokal (ROLLBACK):', err);
        process.exit(1);
    } finally {
        localClient.release();
        await localPool.end();
    }
}

main();
