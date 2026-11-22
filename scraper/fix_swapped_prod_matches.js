/**
 * fix_swapped_prod_matches.js
 *
 * Cuva SVE dosadasnje rucne izmene korisnika u `priprema_za_PRODUKCIJU_table2.xlsx`
 * i NE MENJA redosled ni brojeve redova u listu `1_ZA_UPDATE` do reda gde je korisnik stao (red 135)!
 *
 * Vrsi tacno sledece ciljane ispravke pogresno uparenih parova izmedju `1_ZA_UPDATE`, `2_ZA_INSERT` i `3_SAMO_U_BAZI`:
 *   1. `db_id = 1067` (Долно Котори >> Ydroussa): stavlja pravi `Kato Kottori >> Ydrousa` iz 2_ZA_INSERT,
 *      a `Ano Kottori >> Ano Ydroussa` vraca u 2_ZA_INSERT.
 *   2. `db_id = 1074` (Негочани >> Niki): stavlja pravi `Negkotsani >> Niki` iz 2_ZA_INSERT,
 *      a `Ano Kalenik >> Ano Kalliniki` vraca u 2_ZA_INSERT.
 *   3. `db_id = 1137` (Рахче, Рахча >> Krinides): stavlja pravi `Rachtsa >> Krinides` iz 2_ZA_INSERT,
 *      a `Karatza Kioi >> Filippoi` vraca u 2_ZA_INSERT.
 *   4. `db_id = 1138` (Сељани, Сиљан >> Filippoi): stavlja pravi `Seliani >> Filippoi` iz 2_ZA_INSERT,
 *      a `Dranitsi >> Antifilippoi` prebacuje na `db_id = 1158` (Дранич, Дренич >> Antifilippoi),
 *      dok `Antifilippoi >> Palaiochori` sa 1158 vraca u 2_ZA_INSERT.
 *   5. `db_id = 1148` (Velidzhilar >> Dimaras): stavlja pravi `Veltziler >> Dimaras` iz 2_ZA_INSERT,
 *      a `Moursali >> Sidirochori` vraca u 2_ZA_INSERT.
 *   6. `db_id = 1192` (Beklemesh >> Dialekto): stavlja pravi `Bekleme >> Dialekto` iz 2_ZA_INSERT,
 *      a `Araplion >> Eklekto` vraca u 2_ZA_INSERT.
 *   7. `db_id = 1200` (Domashli >> Ano Pontolivado): stavlja pravi `Domasli >> Ano Pontolivado` iz 2_ZA_INSERT,
 *      a `Chatzi Oglou Ompasi >> Pontolivado` vraca u 2_ZA_INSERT.
 *   8. `db_id = 1207` (Kaja Bunar >> Petropigi, Doukalion) i `db_id = 1208` (Дукалија >> Petropigi):
 *      medjusobno rotira `Kagia Bounar >> Petropigi` (ide na 1207) i `Doukalion >> Petropigi` (ide na 1208).
 *   9. `db_id = 1235` (Novo Kuru Dere >> Neos Xerias): posto je u njemu stajao stari `Kourou Dere >> Xerias`,
 *      taj `Kourou Dere >> Xerias` prebacuje na njegov pravi produkcioni `db_id = 1228` (`Kuru Dere >> Xerias`),
 *      a `1235` (`Novo Kuru Dere >> Neos Xerias`) prebacuje u `3_SAMO_U_BAZI`.
 *  10. `db_id = 1133` (Madzhar, Madzhar Chiflik >> Lydia): stavlja `Ydromyloi >> Lydia` (ili vraca `Filippos >> Lydia` u 2_ZA_INSERT).
 *  11. Za 12 starih gradova/mesta (id <= 886, STATUS_PRODUKCIJA = 'DODATNO_POKLAPANJE (id<=886)' gde su razlicita mesta:
 *      id = 12, 72, 632, 640, 641, 708, 714, 723, 733, 792, 804, 824), vraca njihova prigradska sela u `2_ZA_INSERT`,
 *      a same gradove vraca u `3_SAMO_U_BAZI`.
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
    let s1 = xlsx.utils.sheet_to_json(wb.Sheets['1_ZA_UPDATE'], { defval: '' });
    let s2 = xlsx.utils.sheet_to_json(wb.Sheets['2_ZA_INSERT'], { defval: '' });
    let s3 = xlsx.utils.sheet_to_json(wb.Sheets['3_SAMO_U_BAZI'], { defval: '' });

    // Helper da izvadimo (i uklonimo) red iz s2 po predikatu
    function popS2(predicate) {
        const idx = s2.findIndex(predicate);
        if (idx === -1) return null;
        return s2.splice(idx, 1)[0];
    }

    // 1. db_id = 1067 (Долно Котори >> Ydroussa)
    const r1067 = s1.find(r => r['db_id (table_2.id)'] == 1067);
    const s2KatoKottori = popS2(r => r.old_name_en === 'Kato Kottori' && r.prefecture === 'FLORINA');
    if (r1067 && s2KatoKottori) {
        // Vrati Ano Kottori (sa ispravnim "Котори Горно") u S2
        const anoRow = s1ToS2Row(r1067, 'Ano Kottori', 'Άνω Κόττορι', 'Άνω Υδρούσσα');
        anoRow.opis = 'Ano Kottori (Άνω Κόττορι | Vasmer: K.: Kotori Gorno) - Котори Горно >> Ano Ydroussa (Άνω Υδρούσσα)';
        s2.push(anoRow);
        // Upisi Kato Kottori u 1067
        applyS2ToS1Row(r1067, s2KatoKottori, 'Grčko ime u opisu + udaljenost 0.08 km (ispravljeno)');
        r1067.opis = 'Kato Kottori (Κάτω Κόττορι | Vasmer: K.: Kotori Dolno) - Долно Котори >> Ydrousa (Υδρούσα)';
        console.log('1. Ispravljen db_id=1067 (Долно Котори)');
    }

    // 2. db_id = 1074 (Негочани >> Niki)
    const r1074 = s1.find(r => r['db_id (table_2.id)'] == 1074);
    const s2Negkotsani = popS2(r => r.old_name_en === 'Negkotsani' && r.prefecture === 'FLORINA');
    if (r1074 && s2Negkotsani) {
        s2.push(s1ToS2Row(r1074, 'Ano Kalenik', 'Άνω Κάλενικ', 'Άνω Καληνίκη'));
        applyS2ToS1Row(r1074, s2Negkotsani, 'Grčko ime u opisu + udaljenost 0.06 km (ispravljeno)');
        console.log('2. Ispravljen db_id=1074 (Негочани >> Niki)');
    }

    // 3. db_id = 1137 (Рахче, Рахча >> Krinides)
    const r1137 = s1.find(r => r['db_id (table_2.id)'] == 1137);
    const s2Rachtsa = popS2(r => r.old_name_en === 'Rachtsa' && r.prefecture === 'KAVALA');
    if (r1137 && s2Rachtsa) {
        s2.push(s1ToS2Row(r1137, 'Karatza Kioi', 'Καρατζά Κιόι', 'Φίλιπποι'));
        applyS2ToS1Row(r1137, s2Rachtsa, 'Grčko ime u opisu + udaljenost 0.05 km (ispravljeno)');
        console.log('3. Ispravljen db_id=1137 (Рахче >> Krinides)');
    }

    // 4. db_id = 1138 (Сељани, Сиљан >> Filippoi) i db_id = 1158 (Дранич, Дренич >> Antifilippoi)
    const r1138 = s1.find(r => r['db_id (table_2.id)'] == 1138);
    const r1158 = s1.find(r => r['db_id (table_2.id)'] == 1158);
    const s2Seliani = popS2(r => r.old_name_en === 'Seliani' && r.prefecture === 'KAVALA');
    if (r1138 && r1158 && s2Seliani) {
        // Ono sto je bilo na 1158 (Antifilippoi >> Palaiochori) vrati u S2
        s2.push(s1ToS2Row(r1158, 'Antifilippoi', 'Αντιφίλιπποι', 'Παλαιοχώριον'));
        // Ono sto je bilo na 1138 (Dranitsi >> Antifilippoi) prebaci na 1158
        const dranitsiSnapshot = { ...r1138 };
        applyS2ToS1Row(r1158, dranitsiSnapshot, 'Grčko ime u opisu + udaljenost 0.08 km (ispravljeno)');
        // Na 1138 stavi pravi Seliani >> Filippoi
        applyS2ToS1Row(r1138, s2Seliani, 'Grčko ime u opisu + udaljenost 0.12 km (ispravljeno)');
        console.log('4. Ispravljeni db_id=1138 (Сељани >> Filippoi) i db_id=1158 (Дранич >> Antifilippoi)');
    }

    // 5. db_id = 1148 (Velidzhilar >> Dimaras)
    const r1148 = s1.find(r => r['db_id (table_2.id)'] == 1148);
    const s2Veltziler = popS2(r => r.old_name_en === 'Veltziler' && r.prefecture === 'KAVALA');
    if (r1148 && s2Veltziler) {
        s2.push(s1ToS2Row(r1148, 'Moursali', 'Μουρσαλή', 'Μονοκαρυδιά'));
        applyS2ToS1Row(r1148, s2Veltziler, 'Grčko ime u opisu + udaljenost 0.05 km (ispravljeno)');
        console.log('5. Ispravljen db_id=1148 (Velidzhilar >> Dimaras)');
    }

    // 6. db_id = 1192 (Beklemesh >> Dialekto)
    const r1192 = s1.find(r => r['db_id (table_2.id)'] == 1192);
    const s2Bekleme = popS2(r => r.old_name_en === 'Bekleme' && r.prefecture === 'KAVALA');
    if (r1192 && s2Bekleme) {
        s2.push(s1ToS2Row(r1192, 'Araplion', 'Αραπλίον', 'Εκλεκτόν'));
        applyS2ToS1Row(r1192, s2Bekleme, 'Grčko ime u opisu + udaljenost 0.06 km (ispravljeno)');
        console.log('6. Ispravljen db_id=1192 (Beklemesh >> Dialekto)');
    }

    // 7. db_id = 1200 (Domashli >> Ano Pontolivado)
    const r1200 = s1.find(r => r['db_id (table_2.id)'] == 1200);
    const s2Domasli = popS2(r => r.old_name_en === 'Domasli' && r.prefecture === 'KAVALA');
    if (r1200 && s2Domasli) {
        s2.push(s1ToS2Row(r1200, 'Chatzi Oglou Ompasi', 'Χατζή Ογλού Όμπαση', 'Ποντολίβαδο'));
        applyS2ToS1Row(r1200, s2Domasli, 'Grčko ime u opisu + udaljenost 0.09 km (ispravljeno)');
        console.log('7. Ispravljen db_id=1200 (Domashli >> Ano Pontolivado)');
    }

    // 8. db_id = 1207 (Kaja Bunar >> Petropigi) i db_id = 1208 (Дукалија >> Petropigi)
    const r1207 = s1.find(r => r['db_id (table_2.id)'] == 1207);
    const r1208 = s1.find(r => r['db_id (table_2.id)'] == 1208);
    if (r1207 && r1208) {
        const snap1207 = { ...r1207 };
        const snap1208 = { ...r1208 };
        applyS2ToS1Row(r1207, snap1208, 'Isto ime (Kagia Bounar -> Petropigi) (ispravljeno)');
        applyS2ToS1Row(r1208, snap1207, 'Isto ime (Doukalion -> Petropigi) (ispravljeno)');
        console.log('8. Rotirani db_id=1207 (Kaja Bunar) i db_id=1208 (Doukalion)');
    }

    // 9. db_id = 1235 (Novo Kuru Dere >> Neos Xerias) -> Kourou Dere >> Xerias prebaci na db_id = 1228 (Kuru Dere >> Xerias)
    const r1235 = s1.find(r => r['db_id (table_2.id)'] == 1235);
    const s3Idx1228 = s3.findIndex(r => r['db_id (table_2.id)'] == 1228);
    if (r1235 && s3Idx1228 !== -1) {
        const r1228FromS3 = s3.splice(s3Idx1228, 1)[0];
        // Dodaj 1235 u S3
        s3.push({
            AKCIJA: 'ZADRZI_U_BAZI',
            STATUS_PRODUKCIJA: 'NOVO_NA_PRODUKCIJI (id>886)',
            'db_id (table_2.id)': 1235,
            vrsta: r1235.BAZA_stara_vrsta,
            podvrsta: '2',
            razred: r1235.BAZA_stari_razred,
            opis: r1235.BAZA_stari_opis,
            izvor: r1235.BAZA_stari_izvor,
            zapis: '',
            vrijeme0: '',
            tacke0: 'Point',
            tacke: r1235.BAZA_stare_tacke,
            stanje: '1'
        });
        // A red u S1 pretvori u db_id = 1228 (Kuru Dere >> Xerias)
        r1235['db_id (table_2.id)'] = 1228;
        r1235.BAZA_stari_opis = r1228FromS3.opis;
        r1235.BAZA_stari_izvor = r1228FromS3.izvor;
        r1235.BAZA_stara_vrsta = r1228FromS3.vrsta;
        r1235.BAZA_stari_razred = r1228FromS3.razred;
        r1235.BAZA_stare_tacke = r1228FromS3.tacke;
        r1235.razlog_poklapanja = 'Grčko ime u opisu + Kuru Dere >> Xerias (ispravljeno sa 1235 na 1228)';
        console.log('9. Prebacen Kourou Dere >> Xerias sa db_id=1235 na pravi db_id=1228');
    }

    // 10. Za 12 pogresnih `DODATNO_POKLAPANJE (id<=886)` (koji su u redovima ~230..244, daleko ispod reda 135 gde je korisnik stao):
    //     id = 12, 72, 632, 640, 641, 708, 714, 723, 733, 792, 804, 824
    const falseOldIds = new Set([12, 72, 632, 640, 641, 708, 714, 723, 733, 792, 804, 824]);
    const remainingS1 = [];
    for (const r of s1) {
        const id = Number(r['db_id (table_2.id)']);
        if (falseOldIds.has(id)) {
            // Vrati Pandektis selo u S2
            s2.push(s1ToS2Row(r, '', '', ''));
            // Vrati grad iz baze u S3
            s3.push({
                AKCIJA: 'ZADRZI_U_BAZI',
                STATUS_PRODUKCIJA: 'OD_RANIJE_U_BAZI (id<=886)',
                'db_id (table_2.id)': id,
                vrsta: r.BAZA_stara_vrsta,
                podvrsta: r.podvrsta || '2',
                razred: r.BAZA_stari_razred,
                opis: r.BAZA_stari_opis,
                izvor: r.BAZA_stari_izvor,
                zapis: '',
                vrijeme0: '',
                tacke0: 'Point',
                tacke: r.BAZA_stare_tacke,
                stanje: '1'
            });
            console.log(`10. Razdvojeno lazno poklapanje za stari grad db_id=${id} (${r.BAZA_stari_opis})`);
        } else {
            remainingS1.push(r);
        }
    }

    const outWb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(remainingS1), '1_ZA_UPDATE');
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(s2), '2_ZA_INSERT');
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(s3), '3_SAMO_U_BAZI');
    xlsx.writeFile(outWb, FILE_PROD);
    console.log(`\nUspesno azuriran fajl: ${FILE_PROD}`);
    console.log(`Novi broj redova -> 1_ZA_UPDATE: ${remainingS1.length}, 2_ZA_INSERT: ${s2.length}, 3_SAMO_U_BAZI: ${s3.length}`);
}

main();
