/**
 * add_cyrillic_to_serbian_rows.js
 *
 * Za sve redove gde je `vrsta = '0'` (Серби) u listovima `1_ZA_UPDATE` i `2_ZA_INSERT`:
 *   1. Automatski rekonstruise srpski/slovenski naziv na cirilici (`srpski_cirilica`)
 *      koristeci Vasmerovu rekonstrukciju (K., srp., slov., *...) i grcki zapis starog naziva (`old_name_gr`).
 *   2. Postavlja kolonu `srpski_cirilica` odmah pored kolone `opis` u Excelu, kako bi korisnik
 *      mogao lako da pregleda ili po zelji dotera bilo koji naziv.
 *   3. Azurira kolonu `opis` za sve `vrsta = '0'` u format:
 *      `OldEn (OldGr | Vasmer: ...) - Српски назив >> NewEn (NewGr)`
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('./node_modules/xlsx');

const FILE_CISTO = path.join(__dirname, 'priprema_za_bazu_table2_cisto.xlsx');
const FILE_MAIN = path.join(__dirname, 'priprema_za_bazu_table2.xlsx');
const FILE_CIRILICA = path.join(__dirname, 'priprema_za_bazu_table2_cirilica.xlsx');

// Uklanjanje akcenata sa samoglasnika (à, è, ì, ò, ù, á, é, í, ó, ú, â, ê, î, ô, û, ā, ē, ī, ō, ū) uz cuvanje č, š, ž, ć, đ, ě, ę, ǫ
function stripVowelAccents(str) {
    return str
        .replace(/[àáâãäāă]/g, 'a')
        .replace(/[ÀÁÂÃÄĀĂ]/g, 'A')
        .replace(/[èéêëēĕ]/g, 'e')
        .replace(/[ÈÉÊËĒĔ]/g, 'E')
        .replace(/[ìíîïīĭ]/g, 'i')
        .replace(/[ÌÍÎÏĪĬ]/g, 'I')
        .replace(/[òóôõöōŏ]/g, 'o')
        .replace(/[ÒÓÔÕÖŌŎ]/g, 'O')
        .replace(/[ùúûüūŭ]/g, 'u')
        .replace(/[ÙÚÛÜŪŬ]/g, 'U');
}

// Pretvaranje latinske slavisticke transkripcije (Vasmer / Kânčov / srpski) u srpsku cirilicu
function slavicLatinToCyrillic(str) {
    if (!str) return '';
    let s = stripVowelAccents(str.trim().replace(/^\*/, ''));

    // Ukloni oznake na pocetku ili kraju
    s = s.replace(/^(K\.|srp\.|bug\.|slov\.):\s*/i, '').trim();

    // Ignorisi nemacke reci koje su slucajno uhvacene posle "K."
    if (/^(ich\s+kenne|fehlt|hat\s+es|nennt|auch|wohl|oder|und|vgl|aus|zu|bei)\b/i.test(s)) {
        return '';
    }

    // Specijalne zamene iz staroslovenskog / makedonskog (Kânčov) u srpsku cirilicu:
    s = s
        .replace(/r[ъь]/gi, 'р')
        .replace(/l[ъь]/gi, 'л')
        .replace(/[ъь]r/gi, 'р')
        .replace(/[ъь]l/gi, 'л')
        // ъ ili ь na kraju reci se brise
        .replace(/[ъь]+(?=\s|$)/g, '')
        // ъn/ьn + suglasnik (npr. Gumьnьnica -> Gumnica)
        .replace(/m[ъь]n[ъь]n/gi, 'мн')
        .replace(/n[ъь]n/gi, 'н')
        .replace(/[ъь]n/g, 'н')
        .replace(/[ъь]c/g, 'ц')
        .replace(/[ъь]k/g, 'к')
        .replace(/[ъь]sk/g, 'ск')
        .replace(/ъ/g, 'а')
        .replace(/ь/g, 'е')
        .replace(/ě/g, 'е')
        .replace(/Ě/g, 'Е')
        .replace(/ę/g, 'е')
        .replace(/[ǫą]/g, 'у')
        .replace(/ch/g, 'х')
        .replace(/Ch/g, 'Х')
        .replace(/dž/g, 'џ')
        .replace(/Dž/g, 'Џ')
        .replace(/dz/g, 'ѕ')
        .replace(/šč/g, 'шч')
        .replace(/št/g, 'шт')
        .replace(/Št/g, 'Шт')
        .replace(/žđ/g, 'жђ')
        .replace(/lj|ľ|l'/g, 'љ')
        .replace(/Lj|Ľ|L'/g, 'Љ')
        .replace(/nj|ń|n'/g, 'њ')
        .replace(/Nj|Ń|N'/g, 'Њ')
        .replace(/t'/g, 'ћ')
        .replace(/d'/g, 'ђ')
        .replace(/ŕ|r'/g, 'р')
        .replace(/ś/g, 'с')
        .replace(/ź/g, 'з');

    const charMap = {
        'A': 'А', 'a': 'а',
        'B': 'Б', 'b': 'б',
        'C': 'Ц', 'c': 'ц',
        'Č': 'Ч', 'č': 'ч',
        'Ć': 'Ћ', 'ć': 'ћ',
        'D': 'Д', 'd': 'д',
        'Đ': 'Ђ', 'đ': 'ђ',
        'E': 'Е', 'e': 'е',
        'F': 'Ф', 'f': 'ф',
        'G': 'Г', 'g': 'г',
        'H': 'Х', 'h': 'х',
        'I': 'И', 'i': 'и',
        'J': 'Ј', 'j': 'ј',
        'K': 'К', 'k': 'к',
        'L': 'Л', 'l': 'л',
        'M': 'М', 'm': 'м',
        'N': 'Н', 'n': 'н',
        'O': 'О', 'o': 'о',
        'P': 'П', 'p': 'п',
        'R': 'Р', 'r': 'р',
        'S': 'С', 's': 'с',
        'Š': 'Ш', 'š': 'ш',
        'T': 'Т', 't': 'т',
        'U': 'У', 'u': 'у',
        'V': 'В', 'v': 'в',
        'Z': 'З', 'z': 'з',
        'Ž': 'Ж', 'ž': 'ж',
        'Y': 'И', 'y': 'и',
        'W': 'В', 'w': 'в',
    };

    let out = '';
    for (const ch of s) {
        if (/\p{M}/u.test(ch)) continue;
        out += charMap[ch] !== undefined ? charMap[ch] : ch;
    }

    out = out
        .replace(/['’ʼ]/g, '')
        .replace(/нн/g, 'н')
        .replace(/лл/g, 'л')
        .trim();

    if (out.length > 0) {
        out = out.charAt(0).toUpperCase() + out.slice(1);
    }
    return out;
}

// Rekonstrukcija srpskog cirilicnog naziva direktno iz grckog zapisa starog toponima (old_name_gr)
function greekToponymToSerbianCyrillic(oldNameGr) {
    if (!oldNameGr) return '';
    let s = oldNameGr.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ς/g, 'σ');

    // Prevedi grcke prefikse Άνω / Κάτω / Μέγα / Μικρό / Παλαιό / Νέο
    let prefixCyr = '';
    const words = s.split(/\s+/);
    if (words.length >= 2) {
        const w0 = words[0].toLowerCase();
        const rest = words.slice(1).join(' ');
        const restLow = rest.toLowerCase();
        const isFem = /(α|η)$/.test(restLow);
        const isNeut = /(ον|ο|ι|ιον)$/.test(restLow);

        if (w0 === 'ανω') {
            prefixCyr = isFem ? 'Горња ' : (isNeut ? 'Горње ' : 'Горњи ');
            s = rest;
        } else if (w0 === 'κατω') {
            prefixCyr = isFem ? 'Доња ' : (isNeut ? 'Доње ' : 'Доњи ');
            s = rest;
        } else if (/^(μεγα|μεγασ|μεγαλο|μεγαλη)$/.test(w0)) {
            prefixCyr = isFem ? 'Велика ' : (isNeut ? 'Велико ' : 'Велики ');
            s = rest;
        } else if (/^(μικρο|μικρον|μικρα|μικροσ)$/.test(w0)) {
            prefixCyr = isFem ? 'Мала ' : (isNeut ? 'Мало ' : 'Мали ');
            s = rest;
        } else if (/^(παλαιο|παλαιον|παλαια|παλιο|παλια)$/.test(w0)) {
            prefixCyr = isFem ? 'Стара ' : (isNeut ? 'Старо ' : 'Стари ');
            s = rest;
        } else if (/^(νεο|νεον|νεα|νεοσ)$/.test(w0)) {
            prefixCyr = isFem ? 'Нова ' : (isNeut ? 'Ново ' : 'Нови ');
            s = rest;
        }
    }

    let w = s.toLowerCase();

    // Koristi (?=\s|$) umesto \b jer \b ne radi na grckom alfabetu!
    w = w
        .replace(/οβιτσα(?=\s|$)/g, 'овица')
        .replace(/εβιτσα(?=\s|$)/g, 'евица')
        .replace(/οβον(?=\s|$)/g, 'ово')
        .replace(/εβον(?=\s|$)/g, 'ево')
        .replace(/ινον(?=\s|$)/g, 'ино')
        .replace(/σκον(?=\s|$)/g, 'ско')
        .replace(/τσιον(?=\s|$)/g, 'ц')
        .replace(/τζιον(?=\s|$)/g, 'ц')
        .replace(/ετσι(?=\s|$)/g, 'ец')
        .replace(/ιον(?=\s|$)/g, 'и')
        .replace(/ον(?=\s|$)/g, 'о')
        .replace(/ιστα(?=\s|$)/g, 'ишта')
        .replace(/ιστια(?=\s|$)/g, 'ишта')
        .replace(/ιτσα(?=\s|$)/g, 'ица')
        .replace(/ιτζα(?=\s|$)/g, 'ица')
        .replace(/λιανη(?=\s|$)/g, 'љани')
        .replace(/λιανα(?=\s|$)/g, 'љана')
        .replace(/νιανη(?=\s|$)/g, 'њани')
        .replace(/νιανα(?=\s|$)/g, 'њана')
        .replace(/ιανη(?=\s|$)/g, 'јани')
        .replace(/ιανα(?=\s|$)/g, 'јана');

    w = w
        .replace(/μπ/g, 'б')
        .replace(/ντ/g, 'д')
        .replace(/γκ/g, 'г')
        .replace(/γγ/g, 'г')
        .replace(/τσ/g, 'ц')
        .replace(/τζ/g, 'џ')
        .replace(/λι([αεοου])/g, 'љ$1')
        .replace(/νι([αεοου])/g, 'њ$1')
        .replace(/ου/g, 'у')
        .replace(/ει/g, 'и')
        .replace(/οι/g, 'и')
        .replace(/αι/g, 'е')
        .replace(/αυ/g, 'ав')
        .replace(/ευ/g, 'ев')
        .replace(/λλ/g, 'л')
        .replace(/νν/g, 'н')
        .replace(/ρρ/g, 'р')
        .replace(/σσ/g, 'с')
        .replace(/ττ/g, 'т')
        .replace(/κκ/g, 'к')
        .replace(/ππ/g, 'п')
        .replace(/μμ/g, 'м');

    const grToCyr = {
        'α': 'а', 'β': 'в', 'γ': 'г', 'δ': 'д', 'ε': 'е', 'ζ': 'з',
        'η': 'и', 'θ': 'т', 'ι': 'и', 'κ': 'к', 'λ': 'л', 'μ': 'м',
        'ν': 'н', 'ξ': 'кс', 'ο': 'о', 'π': 'п', 'ρ': 'р', 'σ': 'с',
        'τ': 'т', 'υ': 'и', 'φ': 'ф', 'χ': 'х', 'ψ': 'пс', 'ω': 'о'
    };

    let res = '';
    for (const ch of w) {
        res += grToCyr[ch] !== undefined ? grToCyr[ch] : ch;
    }

    res = res
        .split(/\s+/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

    return (prefixCyr + res).trim();
}

function determineSerbianCyrillic(row) {
    const oldGr = (row.old_name_gr || '').trim();
    const vasmerSlav = (row.vasmer_slovenski_naziv || '').trim();

    const fromGreek = greekToponymToSerbianCyrillic(oldGr);
    if (!vasmerSlav) {
        return { cyr: fromGreek ? `${fromGreek}?` : '', source: 'Фонетски са грчког (?)' };
    }

    const parts = vasmerSlav.split('|').map(p => p.trim()).filter(Boolean);

    let prefixFromGr = '';
    const mPref = fromGreek.match(/^(Горњ[аеи]|Доњ[аеи]|Велик[аои]|Мал[аои]|Стар[аои]|Нов[аои])\s+/);
    if (mPref) {
        prefixFromGr = mPref[1] + ' ';
    }

    let kancovCyr = '';
    let srpCyr = '';
    let starCyr = '';

    for (const p of parts) {
        const cleanVal = p.replace(/\s*\(v\.\s*br\.\s*\d+\)/i, '').trim();
        if (/^K\.:\s*[A-ZČŠŽĆĐ]/u.test(cleanVal)) {
            const c = slavicLatinToCyrillic(cleanVal);
            if (c && !kancovCyr) kancovCyr = c;
        } else if (/^(\*[A-ZČŠŽĆĐ]|slov\.:\s*[A-ZČŠŽĆĐ])/u.test(cleanVal)) {
            const c = slavicLatinToCyrillic(cleanVal);
            if (c && !starCyr) starCyr = c;
        } else if (/^srp\.:\s*[A-ZČŠŽĆĐ]/u.test(cleanVal)) {
            const c = slavicLatinToCyrillic(cleanVal);
            if (c && !srpCyr) srpCyr = c;
        }
    }

    // Kânčov (lokalni naziv sela) ili rekonstrukcija (*...) ima prednost nad udaljenom paralelom
    const bestVasmer = kancovCyr || starCyr || srpCyr;
    if (bestVasmer) {
        const hasDirWord = /(Горњ|Горн|Доњ|Долн|Нов|Стар|Велик|Мал)/i.test(bestVasmer);
        const finalCyr = (prefixFromGr && !hasDirWord) ? (prefixFromGr + bestVasmer).trim() : bestVasmer;
        return { cyr: finalCyr, source: 'Васмер' };
    }

    // Ako Vasmer navodi samo opstu imenicu malim slovom (npr. "srp.: jéla"), koristimo fonetski oblik sa upitnikom
    return { cyr: fromGreek ? `${fromGreek}?` : '', source: 'Фонетски са грчког (?)' };
}

function updateRowWithCyrillic(row) {
    if (String(row.vrsta) !== '0' && String(row.vrsta) !== '1') {
        row.srpski_cirilica = '';
        row.izvor_cirilice = '';
        return;
    }

    const { cyr, source } = determineSerbianCyrillic(row);
    row.srpski_cirilica = cyr;
    row.izvor_cirilice = source;
    if (!cyr) return;

    if (row.opis && row.opis.includes('>>')) {
        let [leftRaw, rightRaw] = row.opis.split('>>').map(s => s.trim());

        // Ako smo u prethodnom pokretanju vec dodali " - <neka_cirilica>" na kraj leftRaw, ukloni stari sufiks pre dodavanja novog
        leftRaw = leftRaw.replace(/\s+-\s+[А-Яа-яЂђЈјЉљЊњЋћЏџ\s\(\)\/\?]+$/, '').trim();

        // Proveri da li sam pocetak leftRaw vec ima cirilicni naziv iz stare baze (npr. "Долно Броди [...]")
        // Ignorisi ъ i ь iz Vasmerovih rekonstrukcija (*Bělešь)
        const leftWithoutYers = leftRaw.replace(/[ъь]/g, '');
        const startsWithCyr = /^[А-Яа-яЂђЈјЉљЊњЋћЏџ]{2,}/.test(leftWithoutYers);

        if (startsWithCyr) {
            row.izvor_cirilice = 'Постојеће у бази';
            row.opis = `${leftRaw} >> ${rightRaw}`;
            return;
        }

        let newOpis = `${leftRaw} - ${cyr} >> ${rightRaw}`;
        if (newOpis.length > 255) {
            const maxLeft = 255 - (` - ${cyr} >> ${rightRaw}`).length;
            if (maxLeft > 15) {
                newOpis = `${leftRaw.slice(0, maxLeft - 3)}... - ${cyr} >> ${rightRaw}`;
            } else {
                newOpis = newOpis.slice(0, 255);
            }
        }
        row.opis = newOpis;
    }
}

// Preslozi kljuceve objekta tako da `srpski_cirilica` i `izvor_cirilice` budu odmah pored `opis`
function reorderColumns(rows) {
    return rows.map(r => {
        const out = {};
        for (const k of Object.keys(r)) {
            if (k === 'srpski_cirilica' || k === 'izvor_cirilice') continue;
            out[k] = r[k];
            if (k === 'opis') {
                out['srpski_cirilica'] = r.srpski_cirilica || '';
                out['izvor_cirilice'] = r.izvor_cirilice || '';
            }
        }
        return out;
    });
}

function main() {
    console.log('Ucitavanje priprema_za_bazu_table2_cisto.xlsx...');
    const wb = xlsx.readFile(FILE_CISTO);
    let s1 = xlsx.utils.sheet_to_json(wb.Sheets['1_ZA_UPDATE'], { defval: '' });
    let s2 = xlsx.utils.sheet_to_json(wb.Sheets['2_ZA_INSERT'], { defval: '' });
    const s3 = xlsx.utils.sheet_to_json(wb.Sheets['3_SAMO_U_BAZI'], { defval: '' });

    let countS1 = 0, countS2 = 0;
    for (const r of s1) {
        updateRowWithCyrillic(r);
        if (r.srpski_cirilica) countS1++;
    }
    for (const r of s2) {
        updateRowWithCyrillic(r);
        if (r.srpski_cirilica) countS2++;
    }

    // Zadrzi 2 specificna Tesprotijska opisa sa upitnikom kako je korisnik trazio
    for (const r of s2) {
        if (r.old_name_gr === 'Λομποβίστρα') {
            r.srpski_cirilica = 'Лабовица?';
            r.opis = 'Lompovistra (Λομποβίστρα) - Лабовица? >> Potamia Filiaton (Ποταμιά Φιλιατών)';
        } else if (r.old_name_gr === 'Μύλων (Σμέρτος)') {
            r.srpski_cirilica = 'Смертос?';
            r.opis = 'Smertos / Mylon (Σμέρτος / Μύλων) - Смертос? >> Smertou (Σμέρτου / Σμέρτος)';
        }
    }

    s1 = reorderColumns(s1);
    s2 = reorderColumns(s2);

    console.log(`Generisani srpski cirilicni nazivi:`);
    console.log(`  - U 1_ZA_UPDATE: ${countS1} redova`);
    console.log(`  - U 2_ZA_INSERT: ${countS2} redova`);

    console.log('\n=== PRIMERI 25 REDOVA SA AUTOMATSKOM CIRILICOM ===');
    s2.filter(r => r.srpski_cirilica).slice(0, 25).forEach(r => {
        console.log(`  [${r.srpski_cirilica}] -> ${r.opis}`);
    });

    // Proveri i korisnikov primer Novosel (Νοβοσέλο)
    const nov = s2.find(r => r.old_name_gr && r.old_name_gr.includes('Νοβοσ'));
    if (nov) {
        console.log('\n=== PROVERA PRIMERA: Νοβοσέλο ===');
        console.log(`  [${nov.srpski_cirilica}] -> ${nov.opis}`);
    }

    const outWb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(s1), '1_ZA_UPDATE');
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(s2), '2_ZA_INSERT');
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(s3), '3_SAMO_U_BAZI');

    let savedPaths = [];
    for (const fp of [FILE_CISTO, FILE_MAIN, FILE_CIRILICA]) {
        try {
            xlsx.writeFile(outWb, fp);
            savedPaths.push(fp);
        } catch (e) {
            console.log(`  (Fajl ${path.basename(fp)} je trenutno otvoren u Excelu, preskacem direktan upis u njega)`);
        }
    }
    console.log(`\nUspesno sacuvano u:\n  - ${savedPaths.join('\n  - ')}`);
}

main();
