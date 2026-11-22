/**
 * merge_all_user_work.js
 *
 * Uzima korisnikov danasnji sacuvani fajl (`priprema_za_bazu_table2_cisto_KORISNIK_BACKUP.xlsx`)
 * kao APSOLUTNI PRIORITET #1 (sve sto je korisnik danas menjao u bilo kojoj koloni ostaje 100% netaknuto!).
 *
 * Na redovima koje korisnik danas jos NIJE stigao rucno da izmeni:
 *   - Vraca sve korisnikove rucne opise od sinoc iz baze (`recovered_user_opisi.json`, npr. "Kalyvia - Колиба", "Douchlista - Дуклишта, Духлишта?", itd.)
 *   - Cisti onih ~50 nemackih reci iz Vasmera (poput "Die Bildung", "Es ist", "sehen", "erinnert") iz `priprema_za_bazu_table2_restaurirano.xlsx`.
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('./node_modules/xlsx');

const FILE_USER_TODAY = path.join(__dirname, 'priprema_za_bazu_table2_cisto_KORISNIK_BACKUP.xlsx');
const FILE_RESTORED_REF = path.join(__dirname, 'priprema_za_bazu_table2_restaurirano.xlsx');
const FILE_CISTO = path.join(__dirname, 'priprema_za_bazu_table2_cisto.xlsx');
const FILE_MAIN = path.join(__dirname, 'priprema_za_bazu_table2.xlsx');
const RECOVERED_JSON = path.join(__dirname, 'recovered_user_opisi.json');

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
    console.log('=== Spajanje danasnjih izmena korisnika + sinocnih izmena iz baze + ciscenje nemackih reci ===');

    const wbToday = xlsx.readFile(FILE_USER_TODAY);
    const s1Today = xlsx.utils.sheet_to_json(wbToday.Sheets['1_ZA_UPDATE'], { defval: '' });
    const s2Today = xlsx.utils.sheet_to_json(wbToday.Sheets['2_ZA_INSERT'], { defval: '' });
    const s3Today = xlsx.utils.sheet_to_json(wbToday.Sheets['3_SAMO_U_BAZI'], { defval: '' });

    const wbRestored = xlsx.readFile(FILE_RESTORED_REF);
    const s2Restored = xlsx.utils.sheet_to_json(wbRestored.Sheets['2_ZA_INSERT'], { defval: '' });

    // Mapiraj s2Restored po `tacke`
    const restoredByTacke = new Map();
    for (const r of s2Restored) {
        restoredByTacke.set(String(r.tacke).trim(), r);
    }

    // Ucitaj sinocne rucne opise iz baze, ALI ISKLJUCIVO one sa id > 885 (koji poticu iz 2_ZA_INSERT, a ne iz 1_ZA_UPDATE!)
    const userLastNight = JSON.parse(fs.readFileSync(RECOVERED_JSON, 'utf8'));
    const lastNightByTacke = new Map();
    for (const r of userLastNight) {
        if (r.id > 885) {
            lastNightByTacke.set(String(r.tacke).trim(), r);
        }
    }

    let keptTodayEdits = 0;
    let restoredFromLastNight = 0;
    let cleanedGerman = 0;

    for (const row of s2Today) {
        const tKey = String(row.tacke).trim();
        const refRow = restoredByTacke.get(tKey);
        const lnRow = lastNightByTacke.get(tKey);

        // Uskladi vrsta_tekst sa eventualno danas izmenjenom kolonom `vrsta`
        const vStr = String(row.vrsta ?? '').trim();
        if (VRSTA_LABELS[vStr]) {
            row.vrsta_tekst = VRSTA_LABELS[vStr];
        }

        // Ako je korisnik danas promenio `vrsta` sa '0' na '6' (ili '3', '2'), ukloni automatsku srpsku cirilicu iz opisa ako je sam nije ostavio
        if (vStr !== '0' && vStr !== '1') {
            row.srpski_cirilica = '';
            row.izvor_cirilice = '';
            // Ako je u opisu ostalo automatsko "- Нешто >>" ukloni taj "- Нешто" deo
            if (row.opis && row.opis.includes('>>')) {
                const [l, right] = row.opis.split('>>').map(x => x.trim());
                const cleanedL = l.replace(/\s+-\s+[А-Яа-яЂђЈјЉљЊњЋћЏџ\s\(\)\/,.\?]+$/, '').trim();
                row.opis = `${cleanedL} >> ${right}`;
            }
            continue;
        }

        // Proveri da li je korisnik DANAS rucno izmenio `opis` ili `srpski_cirilica` u ovom redu!
        // Kako znamo da li je korisnik danas menjao?
        // Ako se danasnji `opis` razlikuje od onog sto je skripta sinoc u 23:48 napravila:
        // U 23:48 skripta je napravila `leftBase - autoCyr >> right`.
        // Ako je korisnik danas izmenio `opis` (npr. sam upisao nesto novo u `opis` ili `srpski_cirilica`),
        // zadrzavamo 100% njegov danasnji unos!
        const leftToday = row.opis.includes('>>') ? row.opis.split('>>')[0].trim() : row.opis;
        const mCyrToday = leftToday.match(/-\s*([^>\-]+)$/);
        const cyrInOpisToday = mCyrToday ? mCyrToday[1].trim() : '';

        // Ako je korisnik danas menjao `opis` (tako da se `cyrInOpisToday` razlikuje od `row.srpski_cirilica` koje je skripta sinoc upisala):
        const userEditedOpisToday = cyrInOpisToday && cyrInOpisToday !== String(row.srpski_cirilica).trim();
        // Ili ako je korisnik danas menjao `srpski_cirilica`, a nije menjao `opis`:
        if (userEditedOpisToday) {
            row.srpski_cirilica = cyrInOpisToday;
            row.izvor_cirilice = 'Унео корисник (данас)';
            keptTodayEdits++;
            continue;
        }

        // Ako korisnik danas NIJE menjao ovaj red, a sinoc (pre 23:08) JESTE rucno uneo opis (koji je sacuvan u bazi i sadrzi isti old_name_gr):
        if (lnRow && lnRow.opis && lnRow.opis.includes('>>') && row.old_name_gr && lnRow.opis.includes(row.old_name_gr)) {
            row.opis = lnRow.opis;
            const dbLeft = lnRow.opis.split('>>')[0].trim();
            const mCyrDb = dbLeft.match(/-\s*([А-Яа-яЂђЈјЉљЊњЋћЏџ\s\(\)\/,.\?]+)$/);
            if (mCyrDb) {
                row.srpski_cirilica = mCyrDb[1].trim();
            }
            row.izvor_cirilice = 'Унео корисник (враћено из базе)';
            restoredFromLastNight++;
            continue;
        }

        // Ako ni danas ni sinoc korisnik nije rucno menjao ovaj red, proveri da li je refRow imao ociscenu nemacku frazu (poput "Die Bildung")
        if (refRow && refRow.opis !== row.opis) {
            row.opis = refRow.opis;
            row.srpski_cirilica = refRow.srpski_cirilica;
            row.izvor_cirilice = refRow.izvor_cirilice;
            row.vasmer_slovenski_naziv = refRow.vasmer_slovenski_naziv;
            cleanedGerman++;
        }
    }

    console.log(`Rezultat spajanja:`);
    console.log(`  - Sacuvano danasnjih rucnih izmena opisa: ${keptTodayEdits}`);
    console.log(`  - Vraceno sinocnih rucnih izmena iz baze: ${restoredFromLastNight}`);
    console.log(`  - Ocisceno nemackih fraza из Vasmera (poput "Die Bildung"): ${cleanedGerman}`);

    const outWb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(s1Today), '1_ZA_UPDATE');
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(s2Today), '2_ZA_INSERT');
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(s3Today), '3_SAMO_U_BAZI');

    xlsx.writeFile(outWb, FILE_CISTO);
    xlsx.writeFile(outWb, FILE_MAIN);
    xlsx.writeFile(outWb, FILE_RESTORED_REF);
    console.log(`\nUspesno azuriran tvoj glavni fajl:\n  - ${FILE_CISTO}`);
}

main();
