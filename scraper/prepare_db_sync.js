/**
 * prepare_db_sync.js
 *
 * Priprema 3-listni Excel fajl (priprema_za_bazu_table2.xlsx) koji je 1-na-1 uskladjen
 * sa strukturom PostgreSQL tabele `table_2` (tema 2: "промјена назива"):
 *
 *   1. List "ZA_UPDATE" — Mesta koja VEC POSTOJE u bazi (table_2) i poklapaju se sa nasim Excelom.
 *      Prikazuje paralelno postojece stanje u bazi (db_id, stari_opis, stari_izvor...) i predlozene
 *      nove vrednosti za UPDATE (opis, izvor sa Vasmer stranom i Pandektis linkom, tacno vrijeme0/vrijeme1,
 *      zapis = ID Vasmerovog PDF-a, vrsta, razred, podvrsta, tacke).
 *
 *   2. List "ZA_INSERT" — Nova mesta iz naseg Excela (output2_vasmer_koordinate.xlsx) kojih jos NEMA u bazi,
 *      spremna za INSERT u `table_2`.
 *
 *   3. List "SAMO_U_BAZI" — Mesta u Grckoj koja vec postoje u bazi `table_2`, a nema ih u Pandektis Excelu
 *      (npr. veci gradovi, reke, mora ili rucni unosi iz drugih izvora), uz proveru da li se pominju kod Vasmera.
 *
 * Moze da cita postojece stanje iz lokalne/produkcione PostgreSQL baze (kada se pokrene sa --db)
 * ili iz SQL bekapa (backup_2026_02_07.sql).
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('./node_modules/xlsx');

const EXCEL_IN = path.join(__dirname, 'output2_vasmer_koordinate.xlsx');
const VASMER_JSON = path.join(__dirname, 'vasmer_entries_complete.json');
const BACKUP_SQL = path.join(__dirname, '..', 'database', 'backup_2026_02_07.sql');
const OUT_SYNC_EXCEL = path.join(__dirname, 'priprema_za_bazu_table2.xlsx');

// Podrazumevani ID pod kojim ce Vasmerov PDF biti ucitan u tabelu `zapisi` (moze se promeniti parametrom --zapis=N)
const DEFAULT_VASMER_ZAPIS_ID = 1;

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
    return str
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
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z]/g, '');
}

// Pretvaranje datuma iz Pandektisa (npr. "31/8/1926" ili "1927") u ISO timestamp za PostgreSQL (vrijeme0 / vrijeme1)
function parseRenamingDate(dateStr) {
    if (!dateStr) {
        return { timestamp: '1900-01-01 12:00:00+00', tv: '0' };
    }
    const s = String(dateStr).trim();
    // Format D/M/YYYY
    const m = s.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})$/);
    if (m) {
        const day = m[1].padStart(2, '0');
        const month = m[2].padStart(2, '0');
        const year = m[3];
        return { timestamp: `${year}-${month}-${day} 12:00:00+00`, tv: '1' };
    }
    // Format samo godina YYYY
    const ym = s.match(/\b(19\d{2}|20\d{2})\b/);
    if (ym) {
        return { timestamp: `${ym[1]}-01-01 12:00:00+00`, tv: '1' };
    }
    return { timestamp: '1900-01-01 12:00:00+00', tv: '0' };
}

// Mapiranje vrste i predloga vrste iz Excela u sifre tabele `table_2` (teme_opcije za tema_id=2):
// vrsta: '0'=Серби, '1'=Славени, '2'=Грци, '3'=Турци, '4'=Нијемци, '5'=Маџари
// razred: '0'=задржано сопство, '1'=промјена сопства
// podvrsta: '0'=бријег, '1'=језеро, '2'=мјесто, '3'=море, '4'=област, '5'=планина, '6'=ријека
function mapCodesForTable2(row) {
    const vRaw = (row.vrsta || '').trim();
    const pRaw = (row.predlog_vrste || '').trim();

    let vrstaCode = '';
    let vrstaNaziv = '';

    if (vRaw === 'Серби' || pRaw.startsWith('Серби')) {
        vrstaCode = '0';
        vrstaNaziv = 'Серби';
    } else if (vRaw === 'Славени') {
        vrstaCode = '1';
        vrstaNaziv = 'Славени';
    } else if (vRaw === 'Грци' || pRaw.includes('Грци') || pRaw.includes('(Grčki)')) {
        vrstaCode = '2';
        vrstaNaziv = 'Грци';
    } else if (vRaw === 'Турци' || pRaw.startsWith('Турци') || pRaw.includes('(Turski)')) {
        vrstaCode = '3';
        vrstaNaziv = 'Турци';
    }

    // Razred: '0' (задржано сопство) ako je grcki -> grcki ('2'), inace '1' (промјена сопства)
    let razredCode = '1';
    if (row.razred === 'задржано сопство' || vrstaCode === '2') {
        razredCode = '0';
    }

    // Podvrsta: '2' (мјесто) podrazumevano za naselja iz Pandektisa
    const podvrstaCode = '2';

    return { vrstaCode, vrstaNaziv, razredCode, podvrstaCode };
}

// Sklapanje polja `opis` (maks. 255 karaktera) i `izvor` (maks. 255 karaktera) za `table_2`
function buildOpisAndIzvor(row, existingDbOpis = null) {
    // Ako u Vasmeru postoji rekonstruisan slovenski oblik, izvucimo najcistiji prvi oblik
    let slavShort = '';
    if (row.vasmer_slovenski_naziv) {
        slavShort = row.vasmer_slovenski_naziv
            .split('|')
            .map(s => s.trim())
            .slice(0, 2)
            .join(', ');
    }

    const oldGr = (row.old_name_gr || '').trim();
    const oldEn = (row.old_name_en || '').trim();
    const newGrMap = (row.ime_na_karti_gr || row.new_name_gr || '').trim();
    const newGrOfficial = (row.new_name_gr || '').trim();
    const newEnMap = (row.ime_na_karti_en || row.new_name_en || '').trim();

    // Desna strana ">> Novi naziv"
    let rightSide = '';
    if (newGrMap && newGrOfficial && normalizeGreek(newGrMap) !== normalizeGreek(newGrOfficial)) {
        rightSide = `${newEnMap} (${newGrMap}, зв. ${newGrOfficial})`;
    } else {
        rightSide = `${newEnMap} (${newGrMap || newGrOfficial})`;
    }

    // Leva strana "Stari naziv >>"
    let leftSide = '';
    if (existingDbOpis && existingDbOpis.includes('>>')) {
        // Ako u bazi vec postoji rucno unet cirilicni oblik na levoj strani (npr. "Долно Броди >> ..."),
        // sacuvaj taj cirilicni pocetak i dopuni ga grckim starim nazivom i Vasmer oblikom ako fali!
        const dbLeft = existingDbOpis.split('>>')[0].trim();
        if (!dbLeft.includes(oldGr) && oldGr) {
            leftSide = slavShort
                ? `${dbLeft} [${oldGr}, Vasmer: ${slavShort}]`
                : `${dbLeft} (${oldGr})`;
        } else {
            leftSide = dbLeft;
        }
    } else if (slavShort) {
        leftSide = `${oldEn} (${oldGr} | Vasmer: ${slavShort})`;
    } else {
        leftSide = `${oldEn} (${oldGr})`;
    }

    let opis = `${leftSide} >> ${rightSide}`.replace(/\s+/g, ' ').trim();
    if (opis.length > 255) {
        opis = opis.slice(0, 252) + '...';
    }

    // Sklapanje polja `izvor` (maks. 255 karaktera)
    let izvorParts = [];
    if (row.source_url) izvorParts.push(row.source_url);
    if (row.vasmer_strana_i_red) {
        izvorParts.push(`Vasmer: ${row.vasmer_strana_i_red}`);
    } else if (row.official_journal) {
        izvorParts.push(`FEK ${row.official_journal}`);
    }
    let izvor = izvorParts.join(' | ');
    if (izvor.length > 255) {
        izvor = izvor.slice(0, 255);
    }

    return { opis, izvor };
}

// Ucitavanje postojecih redova iz `table_2` (iz SQL bekapa ili direktno iz baze)
function loadExistingTable2FromBackup() {
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
            const cols = l.split('\t');
            let lon = null, lat = null;
            try {
                const arr = JSON.parse(cols[16]);
                if (Array.isArray(arr) && typeof arr[0] === 'number') {
                    lon = arr[0];
                    lat = arr[1];
                }
            } catch (e) {}
            rows.push({
                id: parseInt(cols[0], 10),
                vrsta: cols[1] === '\\N' ? '' : cols[1],
                podvrsta: cols[2] === '\\N' ? '' : cols[2],
                razred: cols[3] === '\\N' ? '' : cols[3],
                prostorno: cols[4] === '\\N' ? '' : cols[4],
                prostorno2: cols[5] === '\\N' ? '' : cols[5],
                tp: cols[6] === '\\N' ? '' : cols[6],
                vrijeme0: cols[7] === '\\N' ? '' : cols[7],
                vrijeme1: cols[8] === '\\N' ? '' : cols[8],
                tv: cols[9] === '\\N' ? '' : cols[9],
                opis: cols[10] === '\\N' ? '' : cols[10],
                izvor: cols[11] === '\\N' ? '' : cols[11],
                dodao: cols[12] === '\\N' ? '' : cols[12],
                tacke: cols[16] === '\\N' ? '' : cols[16],
                tacke0: cols[17] === '\\N' ? '' : cols[17],
                zapis: cols[18] === '\\N' ? '' : cols[18],
                stanje: cols[19] === '\\N' ? '' : cols[19],
                lon,
                lat
            });
        }
    }
    return rows;
}

async function main() {
    console.log('=== Priprema 3-listnog Excela za sinhronizaciju sa PostgreSQL bazom (table_2) ===');

    const wbIn = xlsx.readFile(EXCEL_IN);
    const excelRows = xlsx.utils.sheet_to_json(wbIn.Sheets['Renamings'], { defval: '' });
    console.log(`Ucitano redova iz output2_vasmer_koordinate.xlsx: ${excelRows.length}`);

    const dbRowsAll = loadExistingTable2FromBackup();
    // Filtriraj tacke u Grckoj i okolini (ili one koje imaju grcki alfabet u opisu)
    const dbGreekRows = dbRowsAll.filter(r => {
        if (r.lon !== null && r.lat !== null) {
            if (r.lon >= 19.3 && r.lon <= 28.5 && r.lat >= 34.8 && r.lat <= 41.8) return true;
        }
        return /[\u0370-\u03FF\u1F00-\u1FFF]/.test(r.opis);
    });
    console.log(`Ukupno redova u table_2: ${dbRowsAll.length}, od toga za Grcku: ${dbGreekRows.length}`);

    // Indeksiraj postojece grcke redove iz baze radi uparivanja sa Excelom
    const matchedDbIds = new Set();
    const matchedExcelIndices = new Set();
    const updateSheetRows = [];

    for (let idx = 0; idx < excelRows.length; idx++) {
        const er = excelRows[idx];
        const eLat = parseFloat(er.latitude);
        const eLon = parseFloat(er.longitude);
        const newGrNorm = normalizeGreek(er.new_name_gr);
        const mapGrNorm = normalizeGreek(er.ime_na_karti_gr);
        const oldGrNorm = normalizeGreek(er.old_name_gr);
        const newEnNorm = normalizeLatin(er.new_name_en);
        const mapEnNorm = normalizeLatin(er.ime_na_karti_en);

        let bestDb = null;
        let matchReason = '';

        for (const dbr of dbGreekRows) {
            if (matchedDbIds.has(dbr.id)) continue;
            if (dbr.tacke0 !== 'Point') continue;

            const dbGrTokens = (dbr.opis.match(/[\u0370-\u03FF\u1F00-\u1FFF][\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036f\s]+/g) || [])
                .map(s => normalizeGreek(s))
                .filter(s => s.length >= 3);

            const dKm = (dbr.lat && dbr.lon && !isNaN(eLat) && !isNaN(eLon))
                ? haversineKm(eLat, eLon, dbr.lat, dbr.lon)
                : Infinity;

            // 1. Poklapanje grckog imena u opisu + bliske koordinate (< 15 km)
            const grNameMatch = dbGrTokens.some(t =>
                (newGrNorm && t === newGrNorm) ||
                (mapGrNorm && t === mapGrNorm) ||
                (oldGrNorm && t === oldGrNorm)
            );

            if (grNameMatch && dKm < 15) {
                bestDb = dbr;
                matchReason = `Isto grčko ime u opisu + udaljenost ${dKm.toFixed(2)} km`;
                break;
            }

            // 2. Veoma bliske koordinate (< 1.2 km) + poklapanje latinskog novog imena
            const dbRightLat = dbr.opis.includes('>>') ? normalizeLatin(dbr.opis.split('>>')[1]) : normalizeLatin(dbr.opis);
            const latNameMatch = (newEnNorm && dbRightLat.includes(newEnNorm)) || (mapEnNorm && dbRightLat.includes(mapEnNorm));
            if (dKm < 2.0 && latNameMatch) {
                bestDb = dbr;
                matchReason = `Isto latinsko ime + udaljenost ${dKm.toFixed(2)} km`;
                break;
            }
        }

        if (bestDb) {
            matchedDbIds.add(bestDb.id);
            matchedExcelIndices.add(idx);

            const codes = mapCodesForTable2(er);
            const { opis, izvor } = buildOpisAndIzvor(er, bestDb.opis);
            const { timestamp, tv } = parseRenamingDate(er.renaming_date);
            const zapisId = er.vasmer_grcki_naziv ? DEFAULT_VASMER_ZAPIS_ID : (bestDb.zapis || '');

            updateSheetRows.push({
                'AKCIJA': 'UPDATE',
                'db_id (table_2.id)': bestDb.id,
                'razlog_poklapanja': matchReason,
                // Postojece vrednosti u bazi (radi pregleda)
                'BAZA_stari_opis': bestDb.opis,
                'BAZA_stari_izvor': bestDb.izvor,
                'BAZA_stara_vrsta': bestDb.vrsta,
                'BAZA_stari_razred': bestDb.razred,
                'BAZA_stare_tacke': bestDb.tacke,
                // Nove (predlozene) vrednosti za UPDATE u table_2
                'vrsta': codes.vrstaCode !== '' ? codes.vrstaCode : bestDb.vrsta,
                'podvrsta': bestDb.podvrsta || codes.podvrstaCode,
                'razred': bestDb.razred || codes.razredCode,
                'opis': opis,
                'izvor': izvor || bestDb.izvor,
                'zapis': zapisId,
                'vrijeme0': timestamp,
                'vrijeme1': timestamp,
                'tv': tv,
                'tp': '1',
                'tacke': `[${er.longitude},${er.latitude}]`,
                'tacke0': 'Point',
                'stanje': '1',
                // Dodatne informativne kolone iz Excela/Vasmera
                'vasmer_grcki_naziv': er.vasmer_grcki_naziv,
                'vasmer_slovenski_naziv': er.vasmer_slovenski_naziv,
                'vasmer_strana_i_red': er.vasmer_strana_i_red,
                'vasmer_opis': er.vasmer_opis,
                'prefecture': er.prefecture,
                'province': er.province,
            });
        }
    }

    // 2. List "ZA_INSERT": Svi redovi iz Excela koji nisu medju poklopljenim u bazi
    const insertSheetRows = [];
    for (let idx = 0; idx < excelRows.length; idx++) {
        if (matchedExcelIndices.has(idx)) continue;
        const er = excelRows[idx];
        const codes = mapCodesForTable2(er);
        const { opis, izvor } = buildOpisAndIzvor(er, null);
        const { timestamp, tv } = parseRenamingDate(er.renaming_date);
        const zapisId = er.vasmer_grcki_naziv ? DEFAULT_VASMER_ZAPIS_ID : '';

        // Ako je vrsta poznata (iz rucnog unosa, Vasmera ili turske/grcke heuristike), akcija je INSERT;
        // ako jos nije odredjena vrsta, stavljamo "INSERT (proveriti vrstu)" kako bi korisnik lako filtrirao!
        const akcija = codes.vrstaCode !== '' ? 'INSERT' : 'INSERT_NAKON_ODLUKE_VRSTE';

        insertSheetRows.push({
            'AKCIJA': akcija,
            'vrsta': codes.vrstaCode,
            'vrsta_tekst': codes.vrstaNaziv || er.predlog_vrste || '(nije određeno)',
            'podvrsta': codes.podvrstaCode,
            'razred': codes.razredCode,
            'opis': opis,
            'izvor': izvor,
            'zapis': zapisId,
            'vrijeme0': timestamp,
            'vrijeme1': timestamp,
            'tv': tv,
            'tp': '1',
            'tacke': `[${er.longitude},${er.latitude}]`,
            'tacke0': 'Point',
            'stanje': '1',
            // Dodatne kolone iz Excela za lakse odlucivanje kod preostalih redova
            'old_name_gr': er.old_name_gr,
            'old_name_en': er.old_name_en,
            'new_name_gr': er.new_name_gr,
            'ime_na_karti_gr': er.ime_na_karti_gr,
            'ime_na_karti_en': er.ime_na_karti_en,
            'prefecture': er.prefecture,
            'province': er.province,
            'vasmer_grcki_naziv': er.vasmer_grcki_naziv,
            'vasmer_slovenski_naziv': er.vasmer_slovenski_naziv,
            'vasmer_strana_i_red': er.vasmer_strana_i_red,
            'vasmer_opis': er.vasmer_opis,
            'izvor_koordinata': er.izvor_koordinata,
        });
    }

    // 3. List "SAMO_U_BAZI": Postojeci redovi za Grcku u table_2 koji nisu u Pandektis Excelu
    const onlyInDbRows = [];
    for (const dbr of dbGreekRows) {
        if (matchedDbIds.has(dbr.id)) continue;
        onlyInDbRows.push({
            'AKCIJA': 'ZADRZI_U_BAZI',
            'db_id (table_2.id)': dbr.id,
            'vrsta': dbr.vrsta,
            'podvrsta': dbr.podvrsta,
            'razred': dbr.razred,
            'opis': dbr.opis,
            'izvor': dbr.izvor,
            'zapis': dbr.zapis,
            'vrijeme0': dbr.vrijeme0,
            'tacke0': dbr.tacke0,
            'tacke': dbr.tacke,
            'stanje': dbr.stanje,
        });
    }

    console.log(`\nRezultat pripreme:`);
    console.log(`  - List 1 (ZA_UPDATE - poklapanja sa bazom): ${updateSheetRows.length} redova`);
    console.log(`  - List 2 (ZA_INSERT - novi redovi iz Excela): ${insertSheetRows.length} redova`);
    const readyInsert = insertSheetRows.filter(r => r.AKCIJA === 'INSERT').length;
    console.log(`      * Od toga vec ima odredjenu vrstu (Серби/Турци/Грци): ${readyInsert}`);
    console.log(`      * Ceka rucnu odluku vrste: ${insertSheetRows.length - readyInsert}`);
    console.log(`  - List 3 (SAMO_U_BAZI - postojece u bazi van Pandektisa): ${onlyInDbRows.length} redova`);

    const outWb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(updateSheetRows), '1_ZA_UPDATE');
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(insertSheetRows), '2_ZA_INSERT');
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(onlyInDbRows), '3_SAMO_U_BAZI');
    try {
        xlsx.writeFile(outWb, OUT_SYNC_EXCEL);
        console.log(`\nUspesno kreiran fajl: ${OUT_SYNC_EXCEL}`);
    } catch (e) {
        const altPath = path.join(__dirname, 'priprema_za_bazu_table2_cisto.xlsx');
        xlsx.writeFile(outWb, altPath);
        console.log(`\nPosto je ${OUT_SYNC_EXCEL} trenutno otvoren u Excelu, ispravljena verzija je sacuvana u: ${altPath}`);
    }
}

main().catch(err => {
    console.error('Greska:', err);
    process.exit(1);
});
