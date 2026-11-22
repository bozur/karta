/**
 * finalize_sync_excel.js
 *
 * 1. Ucitava korisnikove rucno unete vrednosti kolone `vrsta` iz `priprema_za_bazu_table2_cisto.xlsx`.
 * 2. Sva prazna polja `vrsta` popunjava novom sifrom `'6'` ("није одређено" u tabeli `teme_opcije` za tema_id=2)
 *    i uskladjuje `vrsta_tekst`, `razred` i `AKCIJA = 'INSERT'`.
 * 3. Dodaje 2 preimenovanja iz Tesprotije (1963) sa paramythia-online.gr:
 *    - Λομποβίστρα -> Ποταμιά Φιλιατών (39.6791012, 20.3510156)
 *    - Μύλων (Σμέρτος) -> Σμέρτου / Σμέρτος (39.6010061, 20.2403662)
 * 4. Snima azurirani fajl u `priprema_za_bazu_table2_cisto.xlsx` i `priprema_za_bazu_table2.xlsx`.
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('./node_modules/xlsx');

const FILE_CISTO = path.join(__dirname, 'priprema_za_bazu_table2_cisto.xlsx');
const FILE_MAIN = path.join(__dirname, 'priprema_za_bazu_table2.xlsx');

const VRSTA_LABELS = {
    '0': 'Серби',
    '1': 'Славени',
    '2': 'Грци',
    '3': 'Турци',
    '4': 'Нијемци',
    '5': 'Маџари',
    '6': 'није одређено',
};

function main() {
    console.log('Ucitavanje priprema_za_bazu_table2_cisto.xlsx...');
    const wb = xlsx.readFile(FILE_CISTO);

    const s1 = xlsx.utils.sheet_to_json(wb.Sheets['1_ZA_UPDATE'], { defval: '' });
    const s2 = xlsx.utils.sheet_to_json(wb.Sheets['2_ZA_INSERT'], { defval: '' });
    const s3 = xlsx.utils.sheet_to_json(wb.Sheets['3_SAMO_U_BAZI'], { defval: '' });

    // Obradi list 1_ZA_UPDATE (ako ima praznih vrsta, stavi '6')
    for (const r of s1) {
        const v = String(r.vrsta ?? '').trim();
        if (v === '') {
            r.vrsta = '6';
        }
        r.razred = String(r.vrsta) === '2' ? '0' : '1';
    }

    // Obradi list 2_ZA_INSERT
    const counts = {};
    for (const r of s2) {
        let v = String(r.vrsta ?? '').trim();
        if (v === '') {
            v = '6';
            r.vrsta = '6';
        } else {
            r.vrsta = v;
        }
        r.vrsta_tekst = VRSTA_LABELS[v] || 'није одређено';
        // Razred: '0' (задржано сопство) ako je '2' (Грци), inace '1' (промјена сопства)
        r.razred = v === '2' ? '0' : '1';
        r.AKCIJA = 'INSERT';
        counts[v] = (counts[v] || 0) + 1;
    }

    // Proveri da li su vec dodata 2 zapisa iz Tesprotije (1963) i azuriraj im opis sa cirilicom
    const lompRow = s2.find(r => String(r.old_name_gr).includes('Λομποβίστρα'));
    const smertRow = s2.find(r => String(r.old_name_gr).includes('Μύλων (Σμέρτος)'));
    if (lompRow) {
        lompRow.opis = 'Lompovistra (Λομποβίστρα) - Лабовица? >> Potamia Filiaton (Ποταμιά Φιλιατών)';
    }
    if (smertRow) {
        smertRow.opis = 'Smertos / Mylon (Σμέρτος / Μύλων) - Смертос? >> Smertou (Σμέρτου / Σμέρτος)';
    }

    if (!lompRow) {
        const extraRows = [
            {
                'AKCIJA': 'INSERT',
                'vrsta': '0',
                'vrsta_tekst': 'Серби',
                'podvrsta': '2',
                'razred': '1',
                'opis': 'Lompovistra (Λομποβίστρα) - Лабовица? >> Potamia Filiaton (Ποταμιά Φιλιατών)',
                'izvor': 'https://www.paramythia-online.gr/34260/1-oles-tis-allages-ton-onomaton-ton-chorion-kai-ton-oikismon-tis-thesprotias/ (1963)',
                'zapis': '',
                'vrijeme0': '1963-01-01 12:00:00+00',
                'vrijeme1': '1963-01-01 12:00:00+00',
                'tv': '1',
                'tp': '1',
                'tacke': '[20.3510156,39.6791012]',
                'tacke0': 'Point',
                'stanje': '1',
                'old_name_gr': 'Λομποβίστρα',
                'old_name_en': 'Lompovistra',
                'new_name_gr': 'Ποταμιά',
                'ime_na_karti_gr': 'Ποταμιά Φιλιατών',
                'ime_na_karti_en': 'Potamia Filiaton',
                'prefecture': 'THESPROTIA',
                'province': 'FILIATAI',
                'vasmer_grcki_naziv': '',
                'vasmer_slovenski_naziv': '*Lobodьnica / Лобовица',
                'vasmer_strana_i_red': '',
                'vasmer_opis': '',
                'izvor_koordinata': 'OSM tačan naziv (Ποταμιά Φιλιατών)'
            },
            {
                'AKCIJA': 'INSERT',
                'vrsta': '0',
                'vrsta_tekst': 'Серби',
                'podvrsta': '2',
                'razred': '1',
                'opis': 'Smertos / Mylon (Σμέρτος / Μύλων) - Смертос? >> Smertou (Σμέρτου / Σμέρτος)',
                'izvor': 'https://www.paramythia-online.gr/34260/1-oles-tis-allages-ton-onomaton-ton-chorion-kai-ton-oikismon-tis-thesprotias/ (1963)',
                'zapis': '',
                'vrijeme0': '1963-01-01 12:00:00+00',
                'vrijeme1': '1963-01-01 12:00:00+00',
                'tv': '1',
                'tp': '1',
                'tacke': '[20.2403662,39.6010061]',
                'tacke0': 'Point',
                'stanje': '1',
                'old_name_gr': 'Μύλων (Σμέρτος)',
                'old_name_en': 'Mylon (Smertos)',
                'new_name_gr': 'Σμέρτου',
                'ime_na_karti_gr': 'Σμέρτος',
                'ime_na_karti_en': 'Smertos',
                'prefecture': 'THESPROTIA',
                'province': 'FILIATAI',
                'vasmer_grcki_naziv': '',
                'vasmer_slovenski_naziv': '*Smrčь / Смрч',
                'vasmer_strana_i_red': '',
                'vasmer_opis': '',
                'izvor_koordinata': 'OSM tačan naziv (Σμέρτος)'
            }
        ];
        s2.push(...extraRows);
        counts['0'] = (counts['0'] || 0) + 2;
        console.log('Dodata 2 nova zapisa iz Tesprotije (Λομποβίστρα -> Ποταμιά i Μύλων/Σμέρτος -> Σμέρτου).');
    }

    console.log('\nRaspodela po vrsti u 2_ZA_INSERT:');
    for (const [k, c] of Object.entries(counts)) {
        console.log(`  vrsta='${k}' (${VRSTA_LABELS[k]}): ${c} redova`);
    }
    console.log(`Ukupno u 2_ZA_INSERT: ${s2.length} redova`);

    const outWb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(s1), '1_ZA_UPDATE');
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(s2), '2_ZA_INSERT');
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(s3), '3_SAMO_U_BAZI');

    xlsx.writeFile(outWb, FILE_CISTO);
    xlsx.writeFile(outWb, FILE_MAIN);
    console.log(`\nUspesno azurirani fajlovi:\n  - ${FILE_CISTO}\n  - ${FILE_MAIN}`);
}

main();
