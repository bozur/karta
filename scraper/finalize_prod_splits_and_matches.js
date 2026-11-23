/**
 * finalize_prod_splits_and_matches.js
 *
 * Cuva SVE rucne izmene korisnika u `priprema_za_PRODUKCIJU_table2.xlsx`
 * i zavrsava razdvajanje preostalih visefaznih preimenovanja i pravih parnjaka iz `2_ZA_INSERT`:
 *
 *   1. `db_id = 1144` (Avli Kjoj >> Gefira Aflis >> Avli):
 *      - Na `db_id = 1144` u `1_ZA_UPDATE` postavlja prvu promenu (turski -> grcki):
 *        `vrsta = 3`, `razred = 1`, `opis = "Avli Kjoj (Авли Ќој) >> Gefyra Avlis (Γέφυρα Αυλής)"`, sa svojim koordinatama iz baze `[24.1752005,40.8767904]`.
 *      - Drugu promenu (1970, grcki -> grcki): `Gefyria Avlis (Γέφυρα Αυλής) >> Avli (Αυλή)` (`vrsta = 2`, `razred = 0`, `[24.1787628,40.8727974]`)
 *        ubacuje kao poseban red u `2_ZA_INSERT`.
 *
 *   2. `db_id = 1049` (Chali Chiflik >> Mavrotopos >> Argyroupoli):
 *      - U `2_ZA_INSERT` vec postoji prva faza (`Tsali Tsiflik >> Mavrotopos`), a na `db_id = 1049` bila je druga faza (`Mavrotopos >> Argyroupoli`).
 *      - Na `db_id = 1049` postavlja prvu fazu (1928, turski -> grcki):
 *        `vrsta = 3`, `razred = 1`, `opis = "Chali Chiflik (Чали Чифлик) / Tsali Tsiflik (Τσαλή Τσιφλίκ) >> Mavrotopos (Μαυρότοπος)"`.
 *      - A u `2_ZA_INSERT` ostavlja drugu fazu (grcki -> grcki):
 *        `vrsta = 2`, `razred = 0`, `opis = "Mavrotopos (Μαυρότοπος) >> Argyroupoli (Αργυρούπολη, зв. Αργυρούπολις)"`.
 *
 *   3. `db_id = 1138` (Seliani >> Mesorrema >> Filippoi):
 *      - Druga faza (`Mesorrema (Μεσόρεμμα) >> Filippoi (Φίλιπποι)`, 1932) se vec nalazi u `2_ZA_INSERT` -> ispravljamo joj `vrsta = 2` (Грци) i `razred = 0` (задржано сопство)!
 *
 *   4. `db_id = 947` (Кобалишта >> Kokkinogia):
 *      - U `1_ZA_UPDATE` stavlja pravi `Koumpalista (Κουμπάλιστα) - Кобалишта, Кубалишта >> Kokkinogeia (Κοκκινόγεια)` (`zapis = 1`, Vasmer str. 226, br. 35) iz `2_ZA_INSERT`,
 *        a `Dospat (Δοσπάτ) >> Kokkinogeia (Κοκκινόγεια, зв. Πρινότοπος)` vraca u `2_ZA_INSERT`.
 *
 *   5. `db_id = 999` (Nusretli >> Nikiforos):
 *      - U `1_ZA_UPDATE` stavlja pravi `Nusretli (Нусретли) / Nousratli (Νουσρατλή) >> Nikiforos (Νικηφόρος)` iz `2_ZA_INSERT`,
 *        a `Kioultziler (Κιουλτζιλέρ) >> Nikiforos (Νικηφόρος, зв. Περιστεράκι)` vraca u `2_ZA_INSERT`.
 *
 *   6. `db_id = 1004` (Османица >> Kalos Agros):
 *      - U `1_ZA_UPDATE` stavlja pravi `Османица / Osmanitsa (Οσμανίτσα) >> Kalos Agros (Καλός Αγρός)` iz `2_ZA_INSERT`,
 *        a `Meseli (Μεσελή) >> Kalos Agros (Καλός Αγρός, зв. Καλό Νερό)` vraca u `2_ZA_INSERT`.
 *
 *   7. `db_id = 1042` (Kyuchuk Kyoy >> Mikrochori):
 *      - U `1_ZA_UPDATE` stavlja pravi `Kyuchuk Kyoy (Кючук Кьой) / Kioutsouk Kioi (Κιουτσούκ Κιόι) >> Mikrochori (Μικροχώρι)` iz `2_ZA_INSERT`,
 *        a `Geni Machala (Γενή Μαχαλά) >> Mikrochori (Μικροχώρι)` vraca u `2_ZA_INSERT`.
 *
 *   8. `db_id = 1045` (Khasan Balar >> Paliampela):
 *      - U `1_ZA_UPDATE` stavlja pravi `Khasan Balar (Хасан Балар) / Chasan Balar (Χασάν Μπαλάρ) >> Paliampela (Παλιάμπελα)` iz `2_ZA_INSERT`,
 *        a `Bektas (Μπεκτάς) >> Platanovrysis (Παλιάμπελα, зв. Σκληρόπετρα)` vraca u `2_ZA_INSERT`.
 *
 *   9. Proverava sve koordinate kroz `1_ZA_UPDATE` + `2_ZA_INSERT` + `3_SAMO_U_BAZI` da nijedan par nema identicne koordinate.
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

    // 1. db_id = 1144 (Avli Kjoj -> Gefyra Avlis -> Avli)
    const r1144 = s1.find(r => r['db_id (table_2.id)'] == 1144);
    if (r1144) {
        // Druga faza (1970: Gefyria Avlis >> Avli, grcki -> grcki) ide u 2_ZA_INSERT
        const gefyraToAvli = s1ToS2Row(r1144, 'Gefyria Avlis', 'Γέφυρα Αυλής', 'Αυλή');
        gefyraToAvli.vrsta = '2';
        gefyraToAvli.vrsta_tekst = 'Грци';
        gefyraToAvli.razred = '0';
        gefyraToAvli.opis = 'Gefyria Avlis (Γέφυρα Αυλής) >> Avli (Αυλή)';
        s2.push(gefyraToAvli);

        // Prva faza (turski -> grcki) ostaje na db_id = 1144
        r1144.vrsta = '3';
        r1144.razred = '1';
        r1144.opis = 'Avli Kjoj (Авли Ќој) >> Gefyra Avlis (Γέφυρα Αυλής)';
        r1144.izvor = r1144.BAZA_stari_izvor;
        r1144.tacke = r1144.BAZA_stare_tacke;
        r1144.vrijeme0 = '1926-01-01 12:00:00+00';
        r1144.vrijeme1 = '1926-01-01 12:00:00+00';
        r1144.razlog_poklapanja = 'Prva faza preimenovanja (Avli Kjoj -> Gefyra Avlis), a Gefyria Avlis -> Avli (1970) dodata u 2_ZA_INSERT';
        console.log('1. Razdvojen db_id=1144 na 2 reda: Avli Kjoj -> Gefyra Avlis (UPDATE) i Gefyria Avlis -> Avli (INSERT)');
    }

    // 2. db_id = 1049 (Chali Chiflik -> Mavrotopos -> Argyroupoli)
    const r1049 = s1.find(r => r['db_id (table_2.id)'] == 1049);
    const s2Tsali = popS2(r => r.old_name_en === 'Tsali Tsiflik' && r.prefecture === 'DRAMA');
    if (r1049 && s2Tsali) {
        // Druga faza (Mavrotopos >> Argyroupoli, grcki -> grcki) ide u 2_ZA_INSERT
        const mavroToArgyr = s1ToS2Row(r1049, 'Mavrotopos', 'Μαυρότοπος', 'Αργυρούπολις');
        mavroToArgyr.vrsta = '2';
        mavroToArgyr.vrsta_tekst = 'Грци';
        mavroToArgyr.razred = '0';
        mavroToArgyr.opis = 'Mavrotopos (Μαυρότοπος) >> Argyroupoli (Αργυρούπολη, зв. Αργυρούπολις)';
        s2.push(mavroToArgyr);

        // Prva faza (1928: Chali Chiflik / Tsali Tsiflik >> Mavrotopos, turski -> grcki) ide na db_id = 1049
        applyS2ToS1Row(r1049, s2Tsali, 'Prva faza preimenovanja (Chali Chiflik -> Mavrotopos), a Mavrotopos -> Argyroupoli je u 2_ZA_INSERT');
        r1049.vrsta = '3';
        r1049.razred = '1';
        r1049.opis = 'Chali Chiflik (Чали Чифлик) / Tsali Tsiflik (Τσαλή Τσιφλίκ) >> Mavrotopos (Μαυρότοπος)';
        console.log('2. Razdvojen db_id=1049 na 2 reda: Chali Chiflik -> Mavrotopos (UPDATE) i Mavrotopos -> Argyroupoli (INSERT)');
    }

    // 3. db_id = 1138 (Seliani -> Mesorrema -> Filippoi): u S2 je Mesorrema >> Filippoi (1932) -> postavi joj vrsta=2, razred=0
    const mesorremaS2 = s2.find(r => r.old_name_en === 'Mesorrema' && r.prefecture === 'KAVALA');
    if (mesorremaS2) {
        mesorremaS2.vrsta = '2';
        mesorremaS2.vrsta_tekst = 'Грци';
        mesorremaS2.razred = '0';
        console.log('3. Podesena druga faza za Seliani u 2_ZA_INSERT: Mesorrema >> Filippoi (vrsta=2 Грци, razred=0)');
    }

    // 4. db_id = 947 (Кобалишта >> Kokkinogia)
    const r947 = s1.find(r => r['db_id (table_2.id)'] == 947);
    const s2Koumpalista = popS2(r => r.old_name_en === 'Koumpalista' && r.prefecture === 'DRAMA');
    if (r947 && s2Koumpalista) {
        s2.push(s1ToS2Row(r947, 'Dospat', 'Δοσπάτ', 'Πρινότοπος'));
        applyS2ToS1Row(r947, s2Koumpalista, 'Grčko ime u opisu + Кобалишта / Κουμπάλιστα (ispravljeno)');
        r947.vrsta = '0';
        r947.opis = 'Koumpalista (Κουμπάλιστα) - Кобалишта, Кубалишта >> Kokkinogeia (Κοκκινόγεια)';
        console.log('4. Ispravljen db_id=947 (Кобалишта / Koumpalista >> Kokkinogeia)');
    }

    // 5. db_id = 999 (Nusretli >> Nikiforos)
    const r999 = s1.find(r => r['db_id (table_2.id)'] == 999);
    const s2Nousratli = popS2(r => r.old_name_en === 'Nousratli' && r.prefecture === 'DRAMA');
    if (r999 && s2Nousratli) {
        s2.push(s1ToS2Row(r999, 'Kioultziler', 'Κιουλτζιλέρ', 'Περιστεράκι'));
        applyS2ToS1Row(r999, s2Nousratli, 'Grčko ime u opisu + Nusretli / Νουσρατλή (ispravljeno)');
        r999.vrsta = '3';
        r999.opis = 'Nusretli (Нусретли) / Nousratli (Νουσρατλή) >> Nikiforos (Νικηφόρος)';
        console.log('5. Ispravljen db_id=999 (Nusretli / Nousratli >> Nikiforos)');
    }

    // 6. db_id = 1004 (Османица >> Kalos Agros)
    const r1004 = s1.find(r => r['db_id (table_2.id)'] == 1004);
    const s2Osmanitsa = popS2(r => r.old_name_en === 'Osmanitsa' && r.prefecture === 'DRAMA');
    if (r1004 && s2Osmanitsa) {
        const meseliRow = s1ToS2Row(r1004, 'Meseli', 'Μεσελή', 'Καλό Νερό');
        meseliRow.opis = 'Meseli (Μεσελή) >> Kalos Agros (Καλός Αγρός, зв. Καλό Νερό)';
        s2.push(meseliRow);
        applyS2ToS1Row(r1004, s2Osmanitsa, 'Grčko ime u opisu + Османица / Οσμανίτσα (ispravljeno)');
        r1004.vrsta = '0';
        r1004.opis = 'Osmanitsa (Οσμανίτσα) - Османица >> Kalos Agros (Καλός Αγρός)';
        console.log('6. Ispravljen db_id=1004 (Османица / Osmanitsa >> Kalos Agros)');
    }

    // 7. db_id = 1042 (Kyuchuk Kyoy >> Mikrochori)
    const r1042 = s1.find(r => r['db_id (table_2.id)'] == 1042);
    const s2Kioutsouk = popS2(r => r.old_name_en === 'Kioutsouk Kioi' && r.prefecture === 'DRAMA');
    if (r1042 && s2Kioutsouk) {
        const geniRow = s1ToS2Row(r1042, 'Geni Machala', 'Γενή Μαχαλά', 'Μικροχώρι');
        geniRow.opis = 'Geni Machala (Γενή Μαχαλά) >> Mikrochori (Μικροχώρι)';
        s2.push(geniRow);
        applyS2ToS1Row(r1042, s2Kioutsouk, 'Grčko ime u opisu + Kyuchuk Kyoy / Κιουτσούκ Κιόι (ispravljeno)');
        r1042.vrsta = '3';
        r1042.opis = 'Kyuchuk Kyoy (Кючук Кьой) / Kioutsouk Kioi (Κιουτσούκ Κιόι) >> Mikrochori (Μικροχώρι)';
        console.log('7. Ispravljen db_id=1042 (Kyuchuk Kyoy / Kioutsouk Kioi >> Mikrochori)');
    }

    // 8. db_id = 1045 (Khasan Balar >> Paliampela)
    const r1045 = s1.find(r => r['db_id (table_2.id)'] == 1045);
    const s2Chasan = popS2(r => r.old_name_en === 'Chasan Balar' && r.prefecture === 'DRAMA');
    if (r1045 && s2Chasan) {
        const bektasRow = s1ToS2Row(r1045, 'Bektas', 'Μπεκτάς', 'Σκληρόπετρα');
        bektasRow.opis = 'Bektas (Μπεκτάς) >> Platanovrysis (Παλιάμπελα, зв. Σκληρόπετρα)';
        s2.push(bektasRow);
        applyS2ToS1Row(r1045, s2Chasan, 'Grčko ime u opisu + Khasan Balar / Χασάν Μπαλάρ (ispravljeno)');
        r1045.vrsta = '3';
        r1045.opis = 'Khasan Balar (Хасан Балар) / Chasan Balar (Χασάν Μπαλάρ) >> Paliampela (Παλιάμπελα)';
        console.log('8. Ispravljen db_id=1045 (Khasan Balar / Chasan Balar >> Paliampela)');
    }

    // Provera preklapanja koordinata u S1 + S2 + S3
    const seenCoords = new Set();
    let shifted = 0;
    for (const r of [...s1, ...s3]) {
        if (r.tacke) seenCoords.add(r.tacke);
    }
    for (const r of s2) {
        if (!r.tacke) continue;
        while (seenCoords.has(r.tacke)) {
            try {
                const p = JSON.parse(r.tacke);
                p[0] = Number((p[0] + 0.0018).toFixed(7));
                p[1] = Number((p[1] + 0.0013).toFixed(7));
                r.tacke = `[${p[0]},${p[1]}]`;
                shifted++;
            } catch (e) { break; }
        }
        seenCoords.add(r.tacke);
    }
    console.log(`Provera koordinata zavrsena (dodatno pomereno preklapajucih tacaka: ${shifted}).`);

    const outWb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(s1), '1_ZA_UPDATE');
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(s2), '2_ZA_INSERT');
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(s3), '3_SAMO_U_BAZI');
    xlsx.writeFile(outWb, FILE_PROD);
    console.log(`\nUspesno sacuvan finalni fajl za produkciju: ${FILE_PROD}`);
    console.log(`Stanje -> 1_ZA_UPDATE: ${s1.length}, 2_ZA_INSERT: ${s2.length}, 3_SAMO_U_BAZI: ${s3.length}`);
}

main();
