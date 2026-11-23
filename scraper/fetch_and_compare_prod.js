/**
 * fetch_and_compare_prod.js
 *
 * 1. Povezuje se u READ-ONLY rezimu na produkcionu PostgreSQL bazu (ne pise nista na produkciju!).
 * 2. Skida kompletan bekap produkcionih tabela `table_2`, `zapisi` i `teme_opcije` u `C:\karta\database\prod_table2_backup_2026_11_22.json`.
 * 3. Poredi produkcionu `table_2` sa nasim finalnim `priprema_za_bazu_table2.xlsx`:
 *    - Proverava postojećih 144 redova iz `1_ZA_UPDATE` (id <= 886) prema produkciji (da li su na produkciji menjani).
 *    - Pronalazi sve NOVE redove na produkciji (id > 886 ili redove koji nisu bili u 1_ZA_UPDATE) i uparuje ih
 *      sa redovima iz naseg `2_ZA_INSERT` (po grckom imenu + udaljenosti < 15 km, ili latinskom/cirilicnom imenu + udaljenosti < 3 km).
 *    - Kreira novu sinhronizacionu tabelu za produkciju: `C:\karta\scraper\priprema_za_PRODUKCIJU_table2.xlsx`
 *      u kojoj su SVE korisnikove rucne izmene iz `priprema_za_bazu_table2.xlsx` 100% sacuvane, `zapis` postavljen na `1`,
 *      a novi poklopljeni redovi sa produkcije prebaceni iz `2_ZA_INSERT` u `1_ZA_UPDATE` (sa oznakom `NOVO_NA_PRODUKCIJI`
 *      kako bi korisnik mogao odmah da ih filtrira i pregleda).
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const xlsx = require('./node_modules/xlsx');

const PROD_URL = process.env.PROD_DATABASE_URL;
if (!PROD_URL) {
    console.error('Nedostaje PROD_DATABASE_URL env promenljiva!');
    process.exit(1);
}

const LOCAL_FINAL_EXCEL = path.join(__dirname, 'priprema_za_bazu_table2.xlsx');
const PROD_BACKUP_JSON = path.join(__dirname, '..', 'database', 'prod_table2_backup_2026_11_22.json');
const OUT_PROD_EXCEL = path.join(__dirname, 'priprema_za_PRODUKCIJU_table2.xlsx');
const PROD_VASMER_ZAPIS_ID = 1;

function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeGreek(str) {
    if (!str) return '';
    return String(str)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ϊ/g, 'ι')
        .replace(/ϋ/g, 'υ')
        .replace(/ς/g, 'σ')
        .toLowerCase()
        .replace(/[^α-ω]/g, '');
}

function normalizeLatin(str) {
    if (!str) return '';
    return String(str)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z]/g, '');
}

function normalizeCyrillic(str) {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .replace(/[^а-шђжћчџјљњ]/g, '');
}

async function main() {
    console.log('=== 1. Povezivanje na PRODUKCIONU bazu (READ-ONLY) ===');
    const pool = new Pool({
        connectionString: PROD_URL,
        ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();
    let prodTable2 = [];
    let prodZapisi = [];
    let prodOpcije = [];

    try {
        const resT2 = await client.query(`SELECT * FROM table_2 ORDER BY id ASC`);
        prodTable2 = resT2.rows;
        console.log(`   - Ucitano iz produkcione table_2: ${prodTable2.length} redova (MAX id = ${prodTable2.length ? prodTable2[prodTable2.length - 1].id : 0})`);

        const resZap = await client.query(`SELECT * FROM zapisi ORDER BY id ASC`);
        prodZapisi = resZap.rows;
        console.log(`   - Ucitano iz produkcione tabele zapisi: ${prodZapisi.length} redova:`);
        for (const z of prodZapisi) {
            console.log(`       [id=${z.id}] naziv="${z.naziv}" | tema_id=${z.tema_id} | file_path="${z.file_path}"`);
        }

        const resOpt = await client.query(`SELECT * FROM teme_opcije WHERE tema_id = 2 ORDER BY tip, redosled ASC`);
        prodOpcije = resOpt.rows;
        console.log(`   - Ucitano iz produkcione teme_opcije (tema_id=2): ${prodOpcije.length} opcija`);
    } finally {
        client.release();
        await pool.end();
    }

    // Sacuvaj kompletan bekap produkcije u JSON
    fs.writeFileSync(
        PROD_BACKUP_JSON,
        JSON.stringify({
            fetched_at: new Date().toISOString(),
            table_2_count: prodTable2.length,
            zapisi: prodZapisi,
            teme_opcije: prodOpcije,
            table_2: prodTable2
        }, null, 2),
        'utf8'
    );
    console.log(`   + Sacuvan kompletan READ-ONLY bekap produkcije u: ${PROD_BACKUP_JSON}`);

    // Parsiraj koordinate svih produkcionih redova
    const prodById = new Map();
    const prodGreekRows = [];
    for (const r of prodTable2) {
        let lon = null, lat = null;
        try {
            const arr = JSON.parse(r.tacke);
            if (Array.isArray(arr) && typeof arr[0] === 'number') {
                lon = arr[0];
                lat = arr[1];
            }
        } catch (e) {}
        r.lon = lon;
        r.lat = lat;
        prodById.set(Number(r.id), r);

        const inGreeceBox = (lon !== null && lat !== null && lon >= 19.3 && lon <= 28.5 && lat >= 34.8 && lat <= 41.8);
        const hasGreekChars = /[\u0370-\u03FF\u1F00-\u1FFF]/.test(r.opis || '');
        if (inGreeceBox || hasGreekChars) {
            prodGreekRows.push(r);
        }
    }

    console.log(`\n=== 2. Analiza produkcione table_2 ===`);
    console.log(`   - Ukupno redova na produkciji: ${prodTable2.length}`);
    console.log(`   - Redova sa id <= 886 na produkciji: ${prodTable2.filter(r => r.id <= 886).length}`);
    console.log(`   - NOVIH redova sa id > 886 na produkciji: ${prodTable2.filter(r => r.id > 886).length}`);
    console.log(`   - Ukupno redova za Grcku na produkciji: ${prodGreekRows.length} (od toga sa id > 886: ${prodGreekRows.filter(r => r.id > 886).length})`);

    // Ucitaj nas finalni `priprema_za_bazu_table2.xlsx`
    const wb = xlsx.readFile(LOCAL_FINAL_EXCEL);
    const localS1 = xlsx.utils.sheet_to_json(wb.Sheets['1_ZA_UPDATE'], { defval: '' });
    const localS2 = xlsx.utils.sheet_to_json(wb.Sheets['2_ZA_INSERT'], { defval: '' });

    const matchedProdIds = new Set();
    const newUpdateRows = [];

    // A) Prvo obradi postojecih 144 redova iz `1_ZA_UPDATE`
    let changedOnProdAmong144 = 0;
    for (const r of localS1) {
        const dbId = Number(r['db_id (table_2.id)']);
        const prodRow = prodById.get(dbId);
        matchedProdIds.add(dbId);

        const copy = { ...r };
        const hasVasmer = String(copy.vasmer_grcki_naziv || '').trim() !== '' || String(copy.zapis || '').trim() !== '';
        copy.zapis = hasVasmer ? PROD_VASMER_ZAPIS_ID : '';

        if (prodRow) {
            const diffFromOldBackup = (prodRow.opis !== copy.BAZA_stari_opis || String(prodRow.vrsta) !== String(copy.BAZA_stara_vrsta));
            if (diffFromOldBackup) changedOnProdAmong144++;
            copy.STATUS_PRODUKCIJA = diffFromOldBackup ? 'IZMENJENO_NA_PROD (id<=886)' : 'ISTO_KAO_LOKAL (id<=886)';
            copy.BAZA_stari_opis = prodRow.opis || '';
            copy.BAZA_stari_izvor = prodRow.izvor || '';
            copy.BAZA_stara_vrsta = prodRow.vrsta || '';
            copy.BAZA_stari_razred = prodRow.razred || '';
            copy.BAZA_stare_tacke = prodRow.tacke || '';
        } else {
            copy.STATUS_PRODUKCIJA = 'OBRISANO_NA_PROD (id<=886)';
        }
        newUpdateRows.push(copy);
    }

    // B) Sada proveri sve redove iz `2_ZA_INSERT` prema preostalim redovima iz `prodGreekRows` (posebno id > 886!)
    const remainingInsertRows = [];
    let newlyMatchedFromInsert = 0;

    for (const er of localS2) {
        let eLon = null, eLat = null;
        try {
            const p = JSON.parse(er.tacke);
            eLon = Number(p[0]);
            eLat = Number(p[1]);
        } catch (e) {}

        const newGrNorm = normalizeGreek(er.new_name_gr);
        const mapGrNorm = normalizeGreek(er.ime_na_karti_gr);
        const oldGrNorm = normalizeGreek(er.old_name_gr);
        const newEnNorm = normalizeLatin(er.ime_na_karti_en);
        const oldEnNorm = normalizeLatin(er.old_name_en);

        let bestProd = null;
        let matchReason = '';
        let bestDist = Infinity;

        for (const dbr of prodGreekRows) {
            if (matchedProdIds.has(Number(dbr.id))) continue;
            if (dbr.tacke0 !== 'Point') continue;

            const dbOpis = dbr.opis || '';
            const dbGrTokens = (dbOpis.match(/[\u0370-\u03FF\u1F00-\u1FFF][\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036f\s]+/g) || [])
                .map(s => normalizeGreek(s))
                .filter(s => s.length >= 3);

            const dKm = (dbr.lat !== null && dbr.lon !== null && eLat !== null && eLon !== null)
                ? haversineKm(eLat, eLon, dbr.lat, dbr.lon)
                : Infinity;

            // 1. Poklapanje grckog imena u opisu + bliske koordinate (< 15 km)
            const grNameMatch = dbGrTokens.some(t =>
                (newGrNorm && (t === newGrNorm || t.includes(newGrNorm) || newGrNorm.includes(t))) ||
                (mapGrNorm && (t === mapGrNorm || t.includes(mapGrNorm) || mapGrNorm.includes(t))) ||
                (oldGrNorm && (t === oldGrNorm || t.includes(oldGrNorm) || oldGrNorm.includes(t)))
            );

            if (grNameMatch && dKm < 15 && dKm < bestDist) {
                bestProd = dbr;
                bestDist = dKm;
                matchReason = `Grčko ime u opisu + udaljenost ${dKm.toFixed(2)} km`;
                continue;
            }

            // 2. Bliske koordinate (< 2.5 km) + poklapanje latinskog imena
            const dbLatNorm = normalizeLatin(dbOpis);
            const latNameMatch =
                (newEnNorm && newEnNorm.length >= 4 && dbLatNorm.includes(newEnNorm)) ||
                (oldEnNorm && oldEnNorm.length >= 4 && dbLatNorm.includes(oldEnNorm));
            if (dKm < 2.5 && latNameMatch && dKm < bestDist) {
                bestProd = dbr;
                bestDist = dKm;
                matchReason = `Latinsko ime + udaljenost ${dKm.toFixed(2)} km`;
                continue;
            }

            // 3. Veoma bliske koordinate (< 0.8 km)
            if (dKm < 0.8 && dKm < bestDist) {
                bestProd = dbr;
                bestDist = dKm;
                matchReason = `Veoma bliske koordinate (${dKm.toFixed(2)} km)`;
            }
        }

        const hasVasmer = String(er.vasmer_grcki_naziv || '').trim() !== '' || String(er.zapis || '').trim() !== '';
        const zapisId = hasVasmer ? PROD_VASMER_ZAPIS_ID : '';

        if (bestProd) {
            matchedProdIds.add(Number(bestProd.id));
            newlyMatchedFromInsert++;

            // Ako u produkciji na levoj strani opisa vec postoji cirilicni naziv koji korisnik nije imao u 2_ZA_INSERT,
            // prikazujemo oba da korisnik vidi!
            newUpdateRows.push({
                'AKCIJA': 'UPDATE',
                'STATUS_PRODUKCIJA': Number(bestProd.id) > 886 ? 'NOVO_NA_PRODUKCIJI (id>886)' : 'DODATNO_POKLAPANJE (id<=886)',
                'db_id (table_2.id)': Number(bestProd.id),
                'razlog_poklapanja': matchReason,
                'BAZA_stari_opis': bestProd.opis || '',
                'BAZA_stari_izvor': bestProd.izvor || '',
                'BAZA_stara_vrsta': bestProd.vrsta || '',
                'BAZA_stari_razred': bestProd.razred || '',
                'BAZA_stare_tacke': bestProd.tacke || '',
                'vrsta': er.vrsta,
                'podvrsta': bestProd.podvrsta || er.podvrsta || '2',
                'razred': er.razred,
                'opis': er.opis,
                'izvor': er.izvor || bestProd.izvor || '',
                'zapis': zapisId,
                'vrijeme0': er.vrijeme0,
                'vrijeme1': er.vrijeme1,
                'tv': er.tv,
                'tp': er.tp || '1',
                'tacke': er.tacke,
                'tacke0': er.tacke0 || 'Point',
                'stanje': er.stanje || '1',
                'vasmer_grcki_naziv': er.vasmer_grcki_naziv,
                'vasmer_slovenski_naziv': er.vasmer_slovenski_naziv,
                'vasmer_strana_i_red': er.vasmer_strana_i_red,
                'vasmer_opis': er.vasmer_opis,
                'prefecture': er.prefecture,
                'province': er.province
            });
        } else {
            const copyIns = { ...er };
            copyIns.zapis = zapisId;
            remainingInsertRows.push(copyIns);
        }
    }

    // C) List `3_SAMO_U_BAZI`: Svi grcki redovi na produkciji koji nisu poklopljeni
    const onlyInProdRows = [];
    for (const dbr of prodGreekRows) {
        if (matchedProdIds.has(Number(dbr.id))) continue;
        onlyInProdRows.push({
            'AKCIJA': 'ZADRZI_U_BAZI',
            'STATUS_PRODUKCIJA': Number(dbr.id) > 886 ? 'NOVO_NA_PRODUKCIJI (id>886)' : 'OD_RANIJE_U_BAZI (id<=886)',
            'db_id (table_2.id)': Number(dbr.id),
            'vrsta': dbr.vrsta || '',
            'podvrsta': dbr.podvrsta || '',
            'razred': dbr.razred || '',
            'opis': dbr.opis || '',
            'izvor': dbr.izvor || '',
            'zapis': dbr.zapis || '',
            'vrijeme0': dbr.vrijeme0 ? String(dbr.vrijeme0) : '',
            'tacke0': dbr.tacke0 || '',
            'tacke': dbr.tacke || '',
            'stanje': dbr.stanje || ''
        });
    }

    console.log(`\n=== 3. Rezultat poredjenja sa PRODUKCIJOM ===`);
    console.log(`   - Ranijih poklapanja u 1_ZA_UPDATE (id <= 886): ${localS1.length} (od toga menjano na produkciji posle 7. feb: ${changedOnProdAmong144})`);
    console.log(`   - NOVIH poklapanja pronadjenih na produkciji (prebaceno iz 2_ZA_INSERT u 1_ZA_UPDATE): ${newlyMatchedFromInsert}`);
    console.log(`   - UKUPNO u 1_ZA_UPDATE za produkciju: ${newUpdateRows.length}`);
    console.log(`   - Preostalo u 2_ZA_INSERT za produkciju: ${remainingInsertRows.length}`);
    console.log(`   - U 3_SAMO_U_BAZI na produkciji (ostaje netaknuto): ${onlyInProdRows.length} (od toga sa id > 886: ${onlyInProdRows.filter(x => x['db_id (table_2.id)'] > 886).length})`);

    // Sortiraj 1_ZA_UPDATE tako da NOVO_NA_PRODUKCIJI i IZMENJENO_NA_PROD budu na samom vrhu radi lakseg pregleda!
    newUpdateRows.sort((a, b) => {
        const rank = (s) => {
            if (String(s).startsWith('NOVO_NA_PRODUKCIJI')) return 0;
            if (String(s).startsWith('DODATNO_POKLAPANJE')) return 1;
            if (String(s).startsWith('IZMENJENO_NA_PROD')) return 2;
            return 3;
        };
        const rA = rank(a.STATUS_PRODUKCIJA);
        const rB = rank(b.STATUS_PRODUKCIJA);
        if (rA !== rB) return rA - rB;
        return Number(a['db_id (table_2.id)']) - Number(b['db_id (table_2.id)']);
    });

    const outWb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(newUpdateRows), '1_ZA_UPDATE');
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(remainingInsertRows), '2_ZA_INSERT');
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(onlyInProdRows), '3_SAMO_U_BAZI');
    xlsx.writeFile(outWb, OUT_PROD_EXCEL);
    console.log(`\n+ Kreiran fajl za produkciju: ${OUT_PROD_EXCEL}`);
}

main().catch(err => {
    console.error('Greska:', err);
    process.exit(1);
});
