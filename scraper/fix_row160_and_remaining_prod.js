/**
 * fix_row160_and_remaining_prod.js
 *
 * Cuva SVE korisnikove izmene u `priprema_za_PRODUKCIJU_table2.xlsx` (ne menja redosled ni brojeve redova u 1_ZA_UPDATE)
 * i sredjuje red 160 (`db_id = 1133`) i jos 4 preostala slicna slucaja ispod 160. reda:
 *
 *   1. Red 160 (`db_id = 1133`, `Madzhar, Madzhar Chiflik >> Lydia`):
 *      - Na `db_id = 1133` postavlja prvu promenu (turski -> grcki):
 *        `vrsta = 3`, `razred = 1`, `opis = "Madzhar, Madzhar Chiflik (Маџар, Маџар Чифлик) >> Filippos (Φίλιππος)"`.
 *      - Drugu promenu (1932, grcki -> grcki): `Filippos (Φίλιππος) >> Ydromyloi (Υδρόμυλοι)` (`vrsta = 2`, `razred = 0`)
 *        ubacuje kao poseban red u `2_ZA_INSERT`.
 *      - Trecu promenu (1968, grcki -> grcki) koja je vec u `2_ZA_INSERT`: `Ydromyloi (Υδρόμυλοι) >> Lydia (Λυδία)`
 *        ispravlja na `vrsta = 2` (Грци) i `razred = 0` (задржано сопство).
 *
 *   2. Red 192 (`db_id = 1177`, `Rekhimli, Rakhimli (Рехимли, Рахимли) >> Mesia`):
 *      - U 1_ZA_UPDATE stavlja pravi `Richimli (Ριχιμλή) >> Mesia (Μεσιά)` iz 2_ZA_INSERT,
 *        a `Eletzik (Ελετζίκ) >> Mesia (Μεσιά, зв. Αετοπλαγιά)` vraca u 2_ZA_INSERT.
 *
 *   3. Red 210 (`db_id = 1201`, `Eni Kjoj (Ени Ќој) >> Nea Komi`):
 *      - U 1_ZA_UPDATE stavlja pravi `Geni Kioi (Γενή Κιόι) >> Nea Komi (Νέα Κώμη)` iz 2_ZA_INSERT,
 *        a `Eski Kioi (Εσκή Κιόι) >> Nea Komi (Νέα Κώμη, зв. Παλαιά Κώμη)` vraca u 2_ZA_INSERT.
 *
 *   4. Red 214 (`db_id = 1216`, `Kara Bej, Biljal Aga >> Nea Karya`):
 *      - U 1_ZA_UPDATE stavlja pravi `Kara Bei (Καρά Μπέη) >> Nea Karya (Νέα Καρυά)` iz 2_ZA_INSERT,
 *        a `Betzeli (Μπετζελή) >> Chrysoupolis (Νέα Καρυά, зв. Δρυμούσα)` vraca u 2_ZA_INSERT.
 *
 *   5. Red 217 (`db_id = 1219`, `Karadzha Kjoj (Караџа Ќој) >> Perni`):
 *      - Na `db_id = 1219` bila je dvofazna promena (`Karadza Kioi -> Filippoi` 1926, pa `Filippoi -> Perni` 1932).
 *      - Na `db_id = 1219` stavlja prvu promenu iz 2_ZA_INSERT: `Karadzha Kjoj (Караџа Ќој) / Karatza Kioi (Καρατζά Κιόι) >> Filippoi (Φίλιπποι)` (`vrsta = 3`, `razred = 1`),
 *        a drugu promenu (1932, grcki -> grcki): `Filippoi (Φίλιπποι) >> Perni (Πέρνη)` (`vrsta = 2`, `razred = 0`) vraca kao poseban red u `2_ZA_INSERT`!
 */

const path = require('path');
const xlsx = require('./node_modules/xlsx');

const FILE_PROD = path.join(__dirname, 'priprema_za_PRODUKCIJU_table2.xlsx');

function applyS2ToS1Row(s1Row, s2Row, matchReason) {
    s1Row.razlog_poklapanja = matchReason;
    s1Row.vrsta = s2Row.vrsta;
    s1Row.podvrsta = s1Row.podvrsta || s2Row.podvrsta || '2';
    s1Row.razred = s2Row.razred;
    s1Row.opis = s2Row.opis;
    s1Row.izvor = s2Row.izvor;
    s1Row.zapis = s2Row.zapis;
    s1Row.vrijeme0 = s2Row.vrijeme0;
    s1Row.vrijeme1 = s2Row.vrijeme1;
    s1Row.tv = s2Row.tv;
    s1Row.tp = s2Row.tp || '1';
    s1Row.tacke = s2Row.tacke;
    s1Row.tacke0 = s2Row.tacke0 || 'Point';
    s1Row.stanje = s2Row.stanje || '1';
    s1Row.vasmer_grcki_naziv = s2Row.vasmer_grcki_naziv || '';
    s1Row.vasmer_slovenski_naziv = s2Row.vasmer_slovenski_naziv || '';
    s1Row.vasmer_strana_i_red = s2Row.vasmer_strana_i_red || '';
    s1Row.vasmer_opis = s2Row.vasmer_opis || '';
    s1Row.prefecture = s2Row.prefecture || '';
    s1Row.province = s2Row.province || '';
}

function s1ToS2Row(s1Row, oldEn, oldGr, newGr) {
    return {
        AKCIJA: 'INSERT',
        vrsta: s1Row.vrsta,
        vrsta_tekst: s1Row.vrsta == '0' ? 'Серби' : (s1Row.vrsta == '3' ? 'Турци' : (s1Row.vrsta == '2' ? 'Грци' : 'није одређено')),
        podvrsta: s1Row.podvrsta || '2',
        razred: s1Row.razred || '1',
        opis: s1Row.opis,
        srpski_cirilica: '',
        izvor_cirilice: '',
        izvor: s1Row.izvor,
        zapis: s1Row.zapis,
        vrijeme0: s1Row.vrijeme0,
        vrijeme1: s1Row.vrijeme1,
        tv: s1Row.tv,
        tp: s1Row.tp || '1',
        tacke: s1Row.tacke,
        tacke0: s1Row.tacke0 || 'Point',
        stanje: s1Row.stanje || '1',
        old_name_gr: oldGr || '',
        old_name_en: oldEn || '',
        new_name_gr: newGr || '',
        ime_na_karti_gr: newGr || '',
        ime_na_karti_en: '',
        prefecture: s1Row.prefecture || '',
        province: s1Row.province || '',
        vasmer_grcki_naziv: s1Row.vasmer_grcki_naziv || '',
        vasmer_slovenski_naziv: s1Row.vasmer_slovenski_naziv || '',
        vasmer_strana_i_red: s1Row.vasmer_strana_i_red || '',
        vasmer_opis: s1Row.vasmer_opis || '',
        izvor_koordinata: ''
    };
}

function main() {
    const wb = xlsx.readFile(FILE_PROD);
    const s1 = xlsx.utils.sheet_to_json(wb.Sheets['1_ZA_UPDATE'], { defval: '' });
    const s2 = xlsx.utils.sheet_to_json(wb.Sheets['2_ZA_INSERT'], { defval: '' });
    const s3 = xlsx.utils.sheet_to_json(wb.Sheets['3_SAMO_U_BAZI'], { defval: '' });

    function popS2(predicate) {
        const idx = s2.findIndex(predicate);
        if (idx === -1) return null;
        return s2.splice(idx, 1)[0];
    }

    // 1. Red 160 (db_id = 1133: Madzhar, Madzhar Chiflik -> Filippos -> Ydromyloi -> Lydia)
    const r1133 = s1.find(r => r['db_id (table_2.id)'] == 1133);
    if (r1133) {
        // Druga promena (1932: Filippos >> Ydromyloi, grcki -> grcki) ide kao poseban red u 2_ZA_INSERT
        const filipposToYdromyloi = s1ToS2Row(r1133, 'Filippos', 'Φίλιππος', 'Υδρόμυλοι');
        filipposToYdromyloi.vrsta = '2';
        filipposToYdromyloi.vrsta_tekst = 'Грци';
        filipposToYdromyloi.razred = '0';
        filipposToYdromyloi.opis = 'Filippos (Φίλιππος) >> Ydromyloi (Υδρόμυλοι)';
        s2.push(filipposToYdromyloi);

        // Treca promena (1968: Ydromyloi >> Lydia, grcki -> grcki) je vec u 2_ZA_INSERT -> ispravi joj vrstu na 2 (Грци) i razred na 0
        const ydroInS2 = s2.find(r => r.old_name_en === 'Ydromyloi' && r.prefecture === 'KAVALA');
        if (ydroInS2) {
            ydroInS2.vrsta = '2';
            ydroInS2.vrsta_tekst = 'Грци';
            ydroInS2.razred = '0';
        }

        // Prva promena (turski -> grcki) ostaje na db_id = 1133 u 1_ZA_UPDATE
        r1133.vrsta = '3';
        r1133.razred = '1';
        r1133.opis = 'Madzhar, Madzhar Chiflik (Маџар, Маџар Чифлик) >> Filippos (Φίλιππος)';
        r1133.izvor = r1133.BAZA_stari_izvor;
        r1133.tacke = r1133.BAZA_stare_tacke;
        r1133.vrijeme0 = '1926-01-01 12:00:00+00';
        r1133.vrijeme1 = '1926-01-01 12:00:00+00';
        r1133.razlog_poklapanja = 'Prva faza preimenovanja (turski -> Filippos), a Filippos -> Ydromyloi -> Lydia su u 2_ZA_INSERT';
        console.log('1. Sredjen Red 160 (db_id=1133): 3 odvojene promene (Madzhar Chiflik -> Filippos, Filippos -> Ydromyloi, Ydromyloi -> Lydia)');
    }

    // 2. Red 192 (db_id = 1177: Rekhimli, Rakhimli >> Mesia)
    const r1177 = s1.find(r => r['db_id (table_2.id)'] == 1177);
    const s2Richimli = popS2(r => r.old_name_en === 'Richimli' && r.prefecture === 'KAVALA');
    if (r1177 && s2Richimli) {
        s2.push(s1ToS2Row(r1177, 'Eletzik', 'Ελετζίκ', 'Αετοπλαγιά'));
        applyS2ToS1Row(r1177, s2Richimli, 'Grčko ime u opisu + udaljenost 0.05 km (ispravljeno)');
        r1177.vrsta = '3';
        r1177.opis = 'Rekhimli, Rakhimli (Рехимли, Рахимли) / Richimli (Ριχιμλή) >> Mesia (Μεσιά)';
        console.log('2. Sredjen Red 192 (db_id=1177: Richimli >> Mesia)');
    }

    // 3. Red 210 (db_id = 1201: Eni Kjoj >> Nea Komi)
    const r1201 = s1.find(r => r['db_id (table_2.id)'] == 1201);
    const s2GeniKioi = popS2(r => r.old_name_en === 'Geni Kioi' && r.prefecture === 'KAVALA');
    if (r1201 && s2GeniKioi) {
        s2.push(s1ToS2Row(r1201, 'Eski Kioi', 'Εσκή Κιόι', 'Παλαιά Κώμη'));
        applyS2ToS1Row(r1201, s2GeniKioi, 'Grčko ime u opisu + udaljenost 0.05 km (ispravljeno)');
        r1201.vrsta = '3';
        r1201.opis = 'Eni Kjoj (Ени Ќој) / Geni Kioi (Γενή Κιόι) >> Nea Komi (Νέα Κώμη)';
        console.log('3. Sredjen Red 210 (db_id=1201: Geni Kioi >> Nea Komi)');
    }

    // 4. Red 214 (db_id = 1216: Kara Bej, Biljal Aga >> Nea Karya)
    const r1216 = s1.find(r => r['db_id (table_2.id)'] == 1216);
    const s2KaraBei = popS2(r => r.old_name_en === 'Kara Bei' && r.prefecture === 'KAVALA');
    if (r1216 && s2KaraBei) {
        s2.push(s1ToS2Row(r1216, 'Betzeli', 'Μπετζελή', 'Δρυμούσα'));
        applyS2ToS1Row(r1216, s2KaraBei, 'Grčko ime u opisu + udaljenost 0.05 km (ispravljeno)');
        r1216.vrsta = '3';
        r1216.opis = 'Kara Bej (Кара Беј) / Kara Bei (Καρά Μπέη) >> Nea Karya (Νέα Καρυά)';
        console.log('4. Sredjen Red 214 (db_id=1216: Kara Bei >> Nea Karya)');
    }

    // 5. Red 217 (db_id = 1219: Karadzha Kjoj >> Filippoi >> Perni)
    const r1219 = s1.find(r => r['db_id (table_2.id)'] == 1219);
    const s2Karatza = popS2(r => r.old_name_en === 'Karatza Kioi' && r.prefecture === 'KAVALA');
    if (r1219 && s2Karatza) {
        // Druga faza (1932: Filippoi >> Perni, grcki -> grcki) ide kao poseban red u 2_ZA_INSERT
        const filippoiToPerni = s1ToS2Row(r1219, 'Filippoi', 'Φίλιπποι', 'Πέρνη');
        filippoiToPerni.vrsta = '2';
        filippoiToPerni.vrsta_tekst = 'Грци';
        filippoiToPerni.razred = '0';
        filippoiToPerni.opis = 'Filippoi (Φίλιπποι) >> Perni (Πέρνη)';
        s2.push(filippoiToPerni);

        // Prva faza (1926: Karatza Kioi >> Filippoi, turski -> grcki) ide na db_id = 1219
        applyS2ToS1Row(r1219, s2Karatza, 'Prva faza preimenovanja (Karadza Kjoj -> Filippoi), a Filippoi -> Perni je u 2_ZA_INSERT');
        r1219.vrsta = '3';
        r1219.razred = '1';
        r1219.opis = 'Karadzha Kjoj (Караџа Ќој) / Karatza Kioi (Καρατζά Κιόι) >> Filippoi (Φίλιπποι)';
        console.log('5. Sredjen Red 217 (db_id=1219): 2 odvojene promene (Karadza Kjoj -> Filippoi i Filippoi -> Perni)');
    }

    const outWb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(s1), '1_ZA_UPDATE');
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(s2), '2_ZA_INSERT');
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(s3), '3_SAMO_U_BAZI');
    xlsx.writeFile(outWb, FILE_PROD);
    console.log(`\nUspesno azuriran fajl: ${FILE_PROD}`);
}

main();
