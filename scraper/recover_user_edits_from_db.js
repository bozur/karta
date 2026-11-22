/**
 * recover_user_edits_from_db.js
 *
 * 1. Cita iz lokalne PostgreSQL baze (`table_2`) sve redove koji su uvezeni u 23:08
 *    (pre pokretanja add_cyrillic_to_serbian_rows.js u 23:48!), cime vraca 100% svih
 *    rucnih izmena koje je korisnik uneo u kolonu `opis` (npr. "Kalyvia (Καλύβια) - Колиба >> ...").
 * 2. Takodje cuva sve nove izmene koje je korisnik danas uneo i sacuvao u `priprema_za_bazu_table2_cisto.xlsx`.
 * 3. Potpuno cisti sve nemacke reci i glagole koji su bili uhvaceni posle "K." ili "srp."
 *    (poput "Die Bildung", "Es ist", "Dadurch wird", "Möglich wäre", "erinnert", "sehen", "sind", "als", itd.)
 *    i zamenjuje ih pravim slovenskim toponimom iz Vasmera ili fonetskim nazivom sa upitnikom.
 * 4. Snima rezultat u `priprema_za_bazu_table2_restaurirano.xlsx` (i u `priprema_za_bazu_table2.xlsx`).
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('./node_modules/xlsx');

const FILE_USER_TODAY = path.join(__dirname, 'priprema_za_bazu_table2_cisto_KORISNIK_BACKUP.xlsx');
const FILE_CISTO = path.join(__dirname, 'priprema_za_bazu_table2_cisto.xlsx');
const FILE_MAIN = path.join(__dirname, 'priprema_za_bazu_table2.xlsx');
const RECOVERED_JSON = path.join(__dirname, 'recovered_user_opisi.json');

// Siroka provera da li je pocetak niske zapravo nemacka recenica posle "bei K."
function isGermanSentenceStart(str) {
    if (!str) return false;
    const s = str.replace(/^(K\.|srp\.|bug\.|slov\.):\s*/i, '').trim();
    return /^(die|der|das|den|dem|ein|eine|einer|einem|einen|ich|wir|sie|es|er|man|im|in|am|an|auf|aus|bei|mit|nach|von|vor|zu|zur|zum|über|unter|neben|zwischen|durch|für|ohne|um|gegen|seit|bis|während|wegen|trotz|statt|dadurch|dazu|davon|damit|darin|darauf|daraus|dabei|danach|davor|dagegen|daher|darum|auch|noch|schon|nicht|kaum|wohl|eher|sehr|ganz|nur|fast|etwa|hier|dort|oben|unten|weiter|ferner|außerdem|jedoch|aber|oder|und|sowie|bzw|vgl|heißt|lautet|bedeutet|bezeichnet|entspricht|entspräche|gehört|beruht|geht|kommt|stammt|scheint|könnte|dürfte|müßte|soll|wird|sind|waren|wurde|haben|hat|hatte|fehlt|nennt|bietet|zeigt|bildet|liegt|etymologisch|vielleicht|möglich|wahrscheinlich|offenbar|anscheinend|vermutlich|ursprünglich|heute|früher|später)\b/i.test(s) ||
        /\b(bildung|name|namen|ortsname|ortsnamen|bergname|bergnamen|flußname|flußnamen|einwohner|bevölkerung|gegend|örtlichkeit|dorf|stadt|berg|fluß|bach|quelle|insel|kirche|kloster|kapelle|ruine|urkunde|beleg|form|deutung|ableitung|herkunft|ursprung|bedeutung|sprache|mundart|dialekt|jahrhundert|mittelalter|karten|karte|lexikon|statistik|verzeichnis|wurzelverwandt|slavische)\b/i.test(s);
}

// Skida nemacku drugu rec sa kraja slovenskog toponima (npr. "srp.: Kosovica sehen" -> "srp.: Kosovica", "srp.: Pònikva ON" -> "srp.: Pònikva")
function stripTrailingGermanWord(tokenStr) {
    if (!tokenStr) return '';
    let s = tokenStr.trim();
    // Ukloni "ON", "FlN", "BN", "PN", "Kr", "Bez" na kraju
    s = s.replace(/\s+(?:ON|FlN|BN|PN|Kr|Bez)$/i, '').trim();
    // Ako ima dve reci posle prefiksa ("srp.: Rec1 rec2"), a druga rec pocinje MALIM slovom (npr. "erinnert", "entsprechen", "sehen", "ganz", "sind", "von", "als", "an", "verglichen", "zusammenstellen"), ukloni drugu rec!
    // Izuzetak su kratki spojeni OCR delovi jedne reci: "Sje nica" -> "Sjenica", "Do bovo" -> "Dъbovo", "Prěbo dica" -> "Prěbodica", "So botsko" -> "Sъbotsko"
    s = s
        .replace(/\bSje\s+nica\b/g, 'Sjenica')
        .replace(/\bDo\s+bovo\b/g, 'Dabovo')
        .replace(/\bPrěbo\s+dica\b/g, 'Prěbodica')
        .replace(/\bSo\s+botsko\b/g, 'Sabotsko');

    const m = s.match(/^((?:(?:K\.|srp\.|bug\.|slov\.):\s*)?\*?[\p{L}\p{M}ъь'\-]+)\s+([a-zäöü][\p{L}\p{M}]*)$/u);
    if (m) {
        return m[1].trim();
    }
    return s;
}

function cleanVasmerSlavicField(vasmerSlav) {
    if (!vasmerSlav) return '';
    const parts = vasmerSlav.split('|').map(p => stripTrailingGermanWord(p.trim())).filter(Boolean);
    const cleanParts = parts.filter(p => {
        if (isGermanSentenceStart(p)) return false;
        const valOnly = p.replace(/^(K\.|srp\.|bug\.|slov\.):\s*/i, '').replace(/^\*/, '').trim();
        if (valOnly.length < 2) return false;
        if (/^(skr|bulg|slav|griech|türk|alb|rom|lat|sloven|čech|poln|russ|wie|oder|und)$/i.test(valOnly)) return false;
        if (/oder$/i.test(valOnly)) return false; // npr. *Golaoder
        return true;
    });
    return cleanParts.join(' | ');
}

// Re-import helpers from add_cyrillic_to_serbian_rows.js
function stripVowelAccents(str) {
    return str
        .replace(/[àáâãäāă]/g, 'a').replace(/[ÀÁÂÃÄĀĂ]/g, 'A')
        .replace(/[èéêëēĕ]/g, 'e').replace(/[ÈÉÊËĒĔ]/g, 'E')
        .replace(/[ìíîïīĭ]/g, 'i').replace(/[ÌÍÎÏĪĬ]/g, 'I')
        .replace(/[òóôõöōŏ]/g, 'o').replace(/[ÒÓÔÕÖŌŎ]/g, 'O')
        .replace(/[ùúûüūŭ]/g, 'u').replace(/[ÙÚÛÜŪŬ]/g, 'U');
}

function slavicLatinToCyrillic(str) {
    if (!str) return '';
    let s = stripVowelAccents(str.trim().replace(/^\*/, ''));
    s = s.replace(/^(K\.|srp\.|bug\.|slov\.):\s*/i, '').trim();
    if (isGermanSentenceStart(s)) return '';

    s = s
        .replace(/Lъkavica/g, 'Лукавица')
        .replace(/lъka/g, 'лука')
        .replace(/r[ъь]/gi, 'р')
        .replace(/l[ъь]/gi, 'л')
        .replace(/[ъь]r/gi, 'р')
        .replace(/[ъь]l/gi, 'л')
        .replace(/[ъь]+(?=\s|$)/g, '')
        .replace(/m[ъь]n[ъь]n/gi, 'мн')
        .replace(/n[ъь]n/gi, 'н')
        .replace(/[ъь]n/g, 'н')
        .replace(/[ъь]c/g, 'ц')
        .replace(/[ъь]k/g, 'к')
        .replace(/[ъь]sk/g, 'ск')
        .replace(/ъ/g, 'а')
        .replace(/ь/g, 'е')
        .replace(/ě/g, 'е').replace(/Ě/g, 'Е')
        .replace(/ę/g, 'е')
        .replace(/[ǫą]/g, 'у')
        .replace(/ch/g, 'х').replace(/Ch/g, 'Х')
        .replace(/dž/g, 'џ').replace(/Dž/g, 'Џ')
        .replace(/dz/g, 'ѕ')
        .replace(/šč/g, 'шч')
        .replace(/št/g, 'шт').replace(/Št/g, 'Шт')
        .replace(/žđ/g, 'жђ')
        .replace(/lj|ľ|l'/g, 'љ').replace(/Lj|Ľ|L'/g, 'Љ')
        .replace(/nj|ń|n'/g, 'њ').replace(/Nj|Ń|N'/g, 'Њ')
        .replace(/t'/g, 'ћ').replace(/d'/g, 'ђ')
        .replace(/ŕ|r'/g, 'р').replace(/ś/g, 'с').replace(/ź/g, 'з');

    const charMap = {
        'A': 'А', 'a': 'а', 'B': 'Б', 'b': 'б', 'C': 'Ц', 'c': 'ц',
        'Č': 'Ч', 'č': 'ч', 'Ć': 'Ћ', 'ć': 'ћ', 'D': 'Д', 'd': 'д',
        'Đ': 'Ђ', 'đ': 'ђ', 'E': 'Е', 'e': 'е', 'F': 'Ф', 'f': 'ф',
        'G': 'Г', 'g': 'г', 'H': 'Х', 'h': 'х', 'I': 'И', 'i': 'и',
        'J': 'Ј', 'j': 'ј', 'K': 'К', 'k': 'к', 'L': 'Л', 'l': 'л',
        'M': 'М', 'm': 'м', 'N': 'Н', 'n': 'н', 'O': 'О', 'o': 'о',
        'P': 'П', 'p': 'п', 'R': 'Р', 'r': 'р', 'S': 'С', 's': 'с',
        'Š': 'Ш', 'š': 'ш', 'T': 'Т', 't': 'т', 'U': 'У', 'u': 'у',
        'V': 'В', 'v': 'в', 'Z': 'З', 'z': 'з', 'Ž': 'Ж', 'ž': 'ж',
        'Y': 'И', 'y': 'и', 'W': 'В', 'w': 'в',
    };

    let out = '';
    for (const ch of s) {
        if (/\p{M}/u.test(ch)) continue;
        out += charMap[ch] !== undefined ? charMap[ch] : ch;
    }

    out = out.replace(/['’ʼ]/g, '').replace(/нн/g, 'н').replace(/лл/g, 'л').trim();
    if (out.length > 0) out = out.charAt(0).toUpperCase() + out.slice(1);
    return out;
}

function greekToponymToSerbianCyrillic(oldNameGr) {
    if (!oldNameGr) return '';
    let s = oldNameGr.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ς/g, 'σ');

    let prefixCyr = '';
    const words = s.split(/\s+/);
    if (words.length >= 2) {
        const w0 = words[0].toLowerCase();
        const rest = words.slice(1).join(' ');
        const restLow = rest.toLowerCase();
        const isFem = /(α|η)$/.test(restLow);
        const isNeut = /(ον|ο|ι|ιον)$/.test(restLow);

        if (w0 === 'ανω') { prefixCyr = isFem ? 'Горња ' : (isNeut ? 'Горње ' : 'Горњи '); s = rest; }
        else if (w0 === 'κατω') { prefixCyr = isFem ? 'Доња ' : (isNeut ? 'Доње ' : 'Доњи '); s = rest; }
        else if (/^(μεγα|μεγασ|μεγαλο|μεγαλη)$/.test(w0)) { prefixCyr = isFem ? 'Велика ' : (isNeut ? 'Велико ' : 'Велики '); s = rest; }
        else if (/^(μικρο|μικρον|μικρα|μικροσ)$/.test(w0)) { prefixCyr = isFem ? 'Мала ' : (isNeut ? 'Мало ' : 'Мали '); s = rest; }
        else if (/^(παλαιο|παλαιον|παλαια|παλιο|παλια)$/.test(w0)) { prefixCyr = isFem ? 'Стара ' : (isNeut ? 'Старо ' : 'Стари '); s = rest; }
        else if (/^(νεο|νεον|νεα|νεοσ)$/.test(w0)) { prefixCyr = isFem ? 'Нова ' : (isNeut ? 'Ново ' : 'Нови '); s = rest; }
    }

    let w = s.toLowerCase();
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
        .replace(/μπ/g, 'б').replace(/ντ/g, 'д').replace(/γκ/g, 'г').replace(/γγ/g, 'г')
        .replace(/τσ/g, 'ц').replace(/τζ/g, 'џ')
        .replace(/λι([αεοου])/g, 'љ$1').replace(/νι([αεοου])/g, 'њ$1')
        .replace(/ου/g, 'у').replace(/ει/g, 'и').replace(/οι/g, 'и').replace(/αι/g, 'е')
        .replace(/αυ/g, 'ав').replace(/ευ/g, 'ев')
        .replace(/λλ/g, 'л').replace(/νν/g, 'н').replace(/ρρ/g, 'р').replace(/σσ/g, 'с')
        .replace(/ττ/g, 'т').replace(/κκ/g, 'к').replace(/ππ/g, 'п').replace(/μμ/g, 'м');

    const grToCyr = {
        'α': 'а', 'β': 'в', 'γ': 'г', 'δ': 'д', 'ε': 'е', 'ζ': 'з',
        'η': 'и', 'θ': 'т', 'ι': 'и', 'κ': 'к', 'λ': 'л', 'μ': 'м',
        'ν': 'н', 'ξ': 'кс', 'ο': 'о', 'π': 'п', 'ρ': 'р', 'σ': 'с',
        'τ': 'т', 'υ': 'и', 'φ': 'ф', 'χ': 'х', 'ψ': 'пс', 'ω': 'о'
    };

    let res = '';
    for (const ch of w) res += grToCyr[ch] !== undefined ? grToCyr[ch] : ch;
    res = res.split(/\s+/).filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    return (prefixCyr + res).trim();
}

function determineCleanCyrillic(row) {
    const oldGr = (row.old_name_gr || '').trim();
    const vasmerSlav = cleanVasmerSlavicField(row.vasmer_slovenski_naziv || '');
    const fromGreek = greekToponymToSerbianCyrillic(oldGr);

    if (!vasmerSlav) {
        return { cyr: fromGreek ? `${fromGreek}?` : '', source: 'Фонетски са грчког (?)' };
    }

    const parts = vasmerSlav.split('|').map(p => p.trim()).filter(Boolean);
    let prefixFromGr = '';
    const mPref = fromGreek.match(/^(Горњ[аеи]|Доњ[аеи]|Велик[аои]|Мал[аои]|Стар[аои]|Нов[аои])\s+/);
    if (mPref) prefixFromGr = mPref[1] + ' ';

    let kancovCyr = '', starCyr = '', srpCyr = '', plainCyr = '';
    for (const p of parts) {
        const cleanVal = p.replace(/\s*\(v\.\s*br\.\s*\d+\)/i, '').trim();
        if (/^K\.:\s*[A-ZČŠŽĆĐ]/u.test(cleanVal)) {
            const c = slavicLatinToCyrillic(cleanVal);
            if (c && !kancovCyr) kancovCyr = c;
        } else if (/^(\*[A-ZČŠŽĆĐ]|slov\.:\s*[A-ZČŠŽĆĐ])/u.test(cleanVal)) {
            const c = slavicLatinToCyrillic(cleanVal);
            if (c && !starCyr) starCyr = c;
        } else if (/^(srp\.|bug\.):\s*[A-ZČŠŽĆĐ]/u.test(cleanVal)) {
            const c = slavicLatinToCyrillic(cleanVal);
            if (c && !srpCyr) srpCyr = c;
        } else if (/^[A-ZČŠŽĆĐ]/u.test(cleanVal)) {
            const c = slavicLatinToCyrillic(cleanVal);
            if (c && !plainCyr) plainCyr = c;
        }
    }

    let bestVasmer = kancovCyr || starCyr || srpCyr || plainCyr;
    if (bestVasmer) {
        // Ako je old_name_gr sa Κάτω (Доње), a iz osnovne odrednice Vasmera je povuceno "Горно", zameni sa "Долно"
        if (prefixFromGr.startsWith('Доњ') && /Горн[оаи]/i.test(bestVasmer)) {
            bestVasmer = bestVasmer.replace(/Горн([оаи])/i, 'Долн$1');
        }
        const hasDirWord = /(Горњ|Горн|Доњ|Долн|Нов|Стар|Велик|Мал)/i.test(bestVasmer);
        const finalCyr = (prefixFromGr && !hasDirWord) ? (prefixFromGr + bestVasmer).trim() : bestVasmer;
        return { cyr: finalCyr, source: 'Васмер' };
    }

    return { cyr: fromGreek ? `${fromGreek}?` : '', source: 'Фонетски са грчког (?)' };
}

function main() {
    console.log('=== Ucitavanje korisnikovog danasnjeg fajla + vracanje sinocnih unosa (id > 885) + ciscenje nemackih reci ===');
    const userManualRows = JSON.parse(fs.readFileSync(RECOVERED_JSON, 'utf8'));
    const dbByTacke = new Map();
    for (const r of userManualRows) {
        // ISKLJUCIVO redovi iz 2_ZA_INSERT (id > 885), nikada stari redovi iz table_2!
        if (r.id > 885) {
            dbByTacke.set(String(r.tacke).trim(), r);
        }
    }

    const VRSTA_LABELS = {
        '0': 'Серби', '1': 'Славени', '2': 'Грци', '3': 'Турци',
        '4': 'Нијемци', '5': 'Маџари', '6': 'није одређено',
    };

    const wb = xlsx.readFile(FILE_USER_TODAY);
    const s1 = xlsx.utils.sheet_to_json(wb.Sheets['1_ZA_UPDATE'], { defval: '' });
    const s2 = xlsx.utils.sheet_to_json(wb.Sheets['2_ZA_INSERT'], { defval: '' });
    const s3 = xlsx.utils.sheet_to_json(wb.Sheets['3_SAMO_U_BAZI'], { defval: '' });

    let keptTodayCount = 0;
    let restoredCount = 0;

    for (const r of s2) {
        const vStr = String(r.vrsta ?? '').trim();
        if (VRSTA_LABELS[vStr]) r.vrsta_tekst = VRSTA_LABELS[vStr];

        // Ocisti vasmer_slovenski_naziv od svih nemackih reci
        const cleanedVasmer = cleanVasmerSlavicField(r.vasmer_slovenski_naziv || '');
        r.vasmer_slovenski_naziv = cleanedVasmer;

        // Ako je korisnik danas promenio vrsta sa '0' na '6' (ili '2', '3'), ukloni automatsku srpsku cirilicu
        if (vStr !== '0' && vStr !== '1') {
            r.srpski_cirilica = '';
            r.izvor_cirilice = '';
            if (r.opis && r.opis.includes('>>')) {
                const [l, right] = r.opis.split('>>').map(x => x.trim());
                const cleanedL = l.replace(/\s+-\s+[А-Яа-яЂђЈјЉљЊњЋћЏџ\s\(\)\/,.\?]+$/, '').trim();
                r.opis = `${cleanedL} >> ${right}`;
            }
            continue;
        }

        // 1. Proveri da li je korisnik DANAS rucno izmenio opis u ovom redu
        const leftToday = r.opis.includes('>>') ? r.opis.split('>>')[0].trim() : r.opis;
        const mCyrToday = leftToday.match(/-\s*([^>\-]+)$/);
        const cyrInOpisToday = mCyrToday ? mCyrToday[1].trim() : '';
        if (cyrInOpisToday && cyrInOpisToday !== String(r.srpski_cirilica).trim()) {
            r.srpski_cirilica = cyrInOpisToday;
            r.izvor_cirilice = 'Унео корисник (данас)';
            keptTodayCount++;
            continue;
        }

        // 2. Ako je za ovaj red korisnik rucno uneo cirilicni opis sinoc pre 23:08 (id > 885 i sadrzi isti old_name_gr), VRATI GA NETAKNUTOG!
        const dbRow = dbByTacke.get(String(r.tacke).trim());
        if (dbRow && dbRow.opis && dbRow.opis.includes('>>') && r.old_name_gr && dbRow.opis.includes(r.old_name_gr)) {
            r.opis = dbRow.opis;
            const dbLeft = dbRow.opis.split('>>')[0].trim();
            const mCyr = dbLeft.match(/-\s*([А-Яа-яЂђЈјЉљЊњЋћЏџ\s\(\)\/,.\?]+)$/);
            if (mCyr) {
                r.srpski_cirilica = mCyr[1].trim();
            }
            r.izvor_cirilice = 'Унео корисник (враћено из базе)';
            restoredCount++;
            continue;
        }

        // 3. Za ostale vrsta=0 redove, sastavi cist opis bez ikakvih nemackih reci!
        if (r.old_name_gr === 'Λομποβίστρα') {
            r.srpski_cirilica = 'Лабовица?';
            r.izvor_cirilice = 'Унео корисник';
            r.opis = 'Lompovistra (Λομποβίστρα) - Лабовица? >> Potamia Filiaton (Ποταμιά Φιλιατών)';
            continue;
        }
        if (r.old_name_gr === 'Μύλων (Σμέρτος)') {
            r.srpski_cirilica = 'Смертос?';
            r.izvor_cirilice = 'Унео корисник';
            r.opis = 'Smertos / Mylon (Σμέρτος / Μύλων) - Смертос? >> Smertou (Σμέρτου / Σμέρτος)';
            continue;
        }

        const { cyr, source } = determineCleanCyrillic(r);
        r.srpski_cirilica = cyr;
        r.izvor_cirilice = source;

        const rightRaw = r.opis.includes('>>') ? r.opis.split('>>')[1].trim() : '';
        const slavShort = cleanedVasmer ? cleanedVasmer.split('|').map(s => s.trim()).slice(0, 2).join(', ') : '';
        const leftBase = slavShort
            ? `${r.old_name_en} (${r.old_name_gr} | Vasmer: ${slavShort})`
            : `${r.old_name_en} (${r.old_name_gr})`;

        let newOpis = cyr ? `${leftBase} - ${cyr} >> ${rightRaw}` : `${leftBase} >> ${rightRaw}`;
        if (newOpis.length > 255) {
            const maxLeft = 255 - (` - ${cyr} >> ${rightRaw}`).length;
            newOpis = `${leftBase.slice(0, Math.max(15, maxLeft - 3))}... - ${cyr} >> ${rightRaw}`.slice(0, 255);
        }
        r.opis = newOpis;
    }

    console.log(`Sacuvano danasnjih rucnih izmena korisnika: ${keptTodayCount}`);
    console.log(`Vraceno sinocnih rucnih unosa korisnika u 2_ZA_INSERT: ${restoredCount}`);

    const outWb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(s1), '1_ZA_UPDATE');
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(s2), '2_ZA_INSERT');
    xlsx.utils.book_append_sheet(outWb, xlsx.utils.json_to_sheet(s3), '3_SAMO_U_BAZI');

    for (const fp of [FILE_CISTO, FILE_MAIN]) {
        try {
            xlsx.writeFile(outWb, fp);
            console.log(`Sacuvano: ${fp}`);
        } catch (e) {
            console.log(`Preskocen (otvoren): ${fp}`);
        }
    }
}

main();
