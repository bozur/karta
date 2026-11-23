/**
 * enrich_coords_and_vasmer.js
 *
 * 1. Dopunjuje nedostajuce koordinate (962 reda u output2.xlsx) koristeci:
 *    - OpenStreetMap bazu svih naselja, zaselaka i istorijskih lokaliteta u Grckoj (osm_greece_places.json)
 *    - Automatsku konverziju iz Katarevuse (sluzbeni jezik iz 1920-ih: -ον, -ιον, -αί, -ούς, Νέον...)
 *      u Demotiki (savremeni grcki na danasnjim kartama: -ο, -ι, -ές, -ούντα, Νέο...)
 *    - Strogu geografsku proveru prema prefekturi (prefecture) i provinciji (province)
 *    - Fallback na koordinate opstine/zajednice (name_of_community_or_municipality) u okviru iste prefekture
 *    - Dodaje nove kolone:
 *        * ime_na_karti_gr (savremeni grcki naziv pronadjen na karti)
 *        * ime_na_karti_en (savremeni latinski naziv na karti)
 *        * izvor_koordinata (opis kako je koordinata pronadjena: prvobitni skrejper, OSM tacno/demotiki poklapanje, staro ime na OSM, ili opstina)
 *
 * 2. Poboljsava uparivanje sa Vasmerovom knjigom ukljucujuci grcko-slovenske ortografske varijacije
 *    (npr. τζ <-> τσ: Αγορέλιτζα = Ἀγορελίτσα; αι <-> ε: Αιγλένοβα = Ἐγλένοβα; μπ <-> β; ντ <-> δ; γκ/γγ <-> γ).
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('./node_modules/cheerio');
const xlsx = require('./node_modules/xlsx');

const EXCEL_PATH = path.join(__dirname, 'output2.xlsx');
const OSM_PATH = path.join(__dirname, 'osm_greece_places.json');
const VASMER_JSON = path.join(__dirname, 'vasmer_entries_complete.json');
const WORTREGISTER_PATH = path.join(__dirname, 'mv_wortregister_gr.htm');
const OUT_EXCEL = path.join(__dirname, 'output2_vasmer_koordinate.xlsx');
const OUT_GEOJSON = path.join(__dirname, 'output2_vasmer_koordinate.geojson');

// Haversine udaljenost u km
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

function median(arr) {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Osnovna grcka normalizacija
function normalizeGreek(str) {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ϊ/g, 'ι')
        .replace(/ϋ/g, 'υ')
        .replace(/ς/g, 'σ')
        .toLowerCase()
        .replace(/[^α-ω\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeGreekNoSpace(str) {
    return normalizeGreek(str).replace(/\s+/g, '');
}

// Fonetska normalizacija grckog (vokali + dupli suglasnici + τζ/τσ + φτ/πτ + χτ/κτ + παλιο/παλαιο)
function normalizeGreekPhonetic(str) {
    let s = normalizeGreekNoSpace(str);
    if (!s) return '';
    return s
        .replace(/παλιο/g, 'παλαιο')
        .replace(/φτ/g, 'πτ')
        .replace(/χτ/g, 'κτ')
        .replace(/τζ/g, 'τσ')
        .replace(/ει/g, 'ι')
        .replace(/οι/g, 'ι')
        .replace(/υι/g, 'ι')
        .replace(/η/g, 'ι')
        .replace(/υ/g, 'ι')
        .replace(/αι/g, 'ε')
        .replace(/ω/g, 'ο')
        .replace(/γγ/g, 'γκ')
        .replace(/λλ/g, 'λ')
        .replace(/νν/g, 'ν')
        .replace(/ρρ/g, 'ρ')
        .replace(/σσ/g, 'σ')
        .replace(/ττ/g, 'τ')
        .replace(/κκ/g, 'κ')
        .replace(/ππ/g, 'π')
        .replace(/μμ/g, 'μ');
}

// Duboka fonetska normalizacija za slovenske toponime u grckom zapisu (uz obavezan uslov iste oblasti/prefekture)
function normalizeSlavicGreekSkeleton(str) {
    let s = normalizeGreekPhonetic(str);
    if (!s) return '';
    // Ukloni sufikse -ον, -ιον, -ος, -ας, -ης, -α, -η, -ο, -ι na kraju ako je rec dovoljno duga
    s = s
        .replace(/μπ/g, 'β')
        .replace(/ντ/g, 'δ')
        .replace(/γκ/g, 'γ')
        .replace(/τζ/g, 'τσ')
        .replace(/τσ/g, 'σ')
        .replace(/ζ/g, 'σ')
        .replace(/(ιον|ον|οσ|ασ|ισ|εσ|αι|οι|ου|ων|α|ι|ο)$/, '');
    return s;
}

// Normalizacija latinskog/engleskog naziva (sa svodjenjem duplih suglasnika radi Ferrai -> Ferai -> Feres)
function normalizeLatin(str) {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z\s]/g, ' ')
        .replace(/palio/g, 'palaio')
        .replace(/dragouman/g, 'dragoman')
        .replace(/rr/g, 'r')
        .replace(/ll/g, 'l')
        .replace(/ss/g, 's')
        .replace(/nn/g, 'n')
        .replace(/mm/g, 'm')
        .replace(/kk/g, 'k')
        .replace(/pp/g, 'p')
        .replace(/tt/g, 't')
        .replace(/\s+/g, ' ')
        .trim();
}

// Transliteracija grckog u latinicu (ELOT 743 / Pandektis stil) kako bi svih 25.304 grckih OSM naziva bili pretrazivi i po latinskom kljucu!
function greekToLatin(str) {
    if (!str) return '';
    let s = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const digraphs = [
        [/μπ/g, 'mp'], [/ντ/g, 'nt'], [/γκ/g, 'gk'], [/γγ/g, 'ng'],
        [/τσ/g, 'ts'], [/τζ/g, 'tz'], [/ου/g, 'ou'], [/ευ/g, 'ev'],
        [/αυ/g, 'av'], [/ει/g, 'ei'], [/οι/g, 'oi'], [/αι/g, 'ai'],
        [/θ/g, 'th'], [/χ/g, 'ch'], [/ψ/g, 'ps']
    ];
    for (const [re, rep] of digraphs) s = s.replace(re, rep);
    const map = {
        'α': 'a', 'β': 'v', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'ζ': 'z',
        'η': 'i', 'ι': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'm', 'ν': 'n',
        'ξ': 'x', 'ο': 'o', 'π': 'p', 'ρ': 'r', 'σ': 's', 'ς': 's',
        'τ': 't', 'υ': 'y', 'φ': 'f', 'ω': 'o'
    };
    return s.split('').map(ch => map[ch] !== undefined ? map[ch] : ch).join('');
}

function normalizeLatinNoSpace(str) {
    return normalizeLatin(str).replace(/\s+/g, '');
}

// Pretvaranje Katarevusa -> Demotiki (za grcke nazive sa Pandektisa u savremene nazive na karti)
function generateDemoticGreekVariants(nameGr) {
    if (!nameGr) return [];
    const variants = new Set();

    function add(v) {
        const clean = v.replace(/\s+/g, ' ').trim();
        if (clean.length >= 2) variants.add(clean);
    }

    add(nameGr);

    // Ukloni zagrade npr. "Κάτω Σχολάριον (Αδαλή)"
    const noParens = nameGr.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    add(noParens);

    // Transformisi svaku rec u nazivu iz Katarevuse u Demotiki
    function transformWord(w) {
        const out = new Set([w]);
        const n = w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        // Cesti prefiksi/pridevi
        if (n === 'νεον') out.add('Νέο');
        if (n === 'νεαι') out.add('Νέες');
        if (n === 'παλαιον' || n === 'παληο' || n === 'παληον') { out.add('Παλαιό'); out.add('Παλιό'); }
        if (n === 'παλαιος' || n === 'παληος') { out.add('Παλαιός'); out.add('Παλιός'); }
        if (n === 'παλαια' || n === 'παληα') { out.add('Παλαιά'); out.add('Παλιά'); }
        if (n === 'παλαιαι') { out.add('Παλαιές'); out.add('Παλιές'); }
        if (n === 'μεγα') { out.add('Μεγάλο'); out.add('Μέγα'); }
        if (n === 'μεγας') { out.add('Μεγάλος'); out.add('Μέγας'); }
        if (n === 'μικρον') out.add('Μικρό');

        // Sufiksi Katarevuse -> Demotiki
        // 1. -ιον -> -ι / -ιο / -εο (Σχολάριον -> Σχολάρι, Χελυδόριον -> Χελυδόρεο)
        if (/ιον$/i.test(n) && w.length > 4) {
            out.add(w.slice(0, -2)); // uklanja 'ον', ostaje 'ι'
            out.add(w.slice(0, -1)); // uklanja 'ν', ostaje 'ιο' (npr. Μικρόχωριον -> Μικροχώριο)
            out.add(w.slice(0, -3) + 'εο'); // npr. Χελυδόριον -> Χελυδόρεο
        }
        // 1b. Ερείπια Κρωμνικού -> Κρωμνικό
        if (/ου$/i.test(n) && w.length > 4) {
            out.add(w.slice(0, -2) + 'ο');
            out.add(w.slice(0, -2) + 'ον');
        }
        // 2. -ον -> -ο / -ος (Παλαιόκαστρον -> Παλαιόκαστρο, Πάνορμον -> Πάνορμος)
        if (/ον$/i.test(n) && !/ιον$/i.test(n) && w.length > 3) {
            out.add(w.slice(0, -1)); // uklanja 'ν', ostaje 'ο'
            out.add(w.slice(0, -2) + 'ι'); // npr. Κρυονέρον -> Κρυονέρι
            out.add(w.slice(0, -1) + 'ς'); // npr. Πάνορμον -> Πάνορμος
        }
        // 2b. -ών -> -ώνας (Δρυμών -> Δρυμώνας, Τολοφών -> Τολοφώνας)
        if (/ών$/.test(w) || /ων$/i.test(n) && w.length > 4) {
            out.add(w + 'ας');
        }
        // 2c. -υνς -> -υνθα (Τίρυνς -> Τίρυνθα)
        if (/υνς$/i.test(n)) {
            out.add(w.slice(0, -1) + 'θα');
        }
        // 2d. -έα -> -ιά, -έαι -> -ιές / -έα, -ιές -> -ιά
        if (/έα$/i.test(n)) {
            out.add(w.slice(0, -2) + 'ιά');
        }
        if (/έαι$/i.test(n) || /εαι$/i.test(n)) {
            out.add(w.slice(0, -3) + 'ιές');
            out.add(w.slice(0, -3) + 'έα');
            out.add(w.slice(0, -3) + 'ιά');
        }
        if (/ιές$/i.test(n) || /ιες$/i.test(n)) {
            out.add(w.slice(0, -3) + 'ιά');
        }
        // 2e. -σιοχώριον -> -σοχώρι (Εκκλησιοχώριον -> Εκκλησοχώρι)
        if (/σιοχωρ/i.test(n)) {
            out.add(w.replace(/σιο/i, 'σο').replace(/ον$/i, ''));
        }
        // 2f. Σύδενδρο -> Σύνδενδρο, Φτελιώνας -> Πτελεώνας
        if (n === 'συδενδρο' || n === 'συδενδρον') {
            out.add('Σύνδενδρο');
        }
        if (n === 'φτελιωνας' || n === 'φτελιων') {
            out.add('Πτελεώνας');
        }
        // 3. -αί / -αι -> -ές / -ες (Πηγαί -> Πηγές, Κυδωνίαι -> Κυδωνίες, Καρυαί -> Καρυές)
        if (/αί$/.test(w)) out.add(w.slice(0, -2) + 'ές');
        if (/αι$/i.test(n) && w.length > 3) out.add(w.slice(0, -2) + 'ες');

        // 4. -ούς -> -ούντα (Τραπεζούς -> Τραπεζούντα, Σελινούς -> Σελινούντα)
        if (/ούς$/.test(w) || /ους$/i.test(n)) {
            out.add(w.slice(0, -3) + 'ούντα');
            out.add(w.slice(0, -3) + 'ούσα');
        }
        // 5. -εύς -> -έας (Δωριεύς -> Δωριέας)
        if (/εύς$/.test(w) || /ευς$/i.test(n)) {
            out.add(w.slice(0, -3) + 'έας');
        }
        // 6. -ις -> -η / -ίδα (Αμφίπολις -> Αμφίπολη)
        if (/ις$/i.test(n) && w.length > 4) {
            out.add(w.slice(0, -2) + 'η');
            out.add(w.slice(0, -2) + 'ίδα');
        }
        // 7. -άς -> -άδα (Κοιλάς -> Κοιλάδα, Πεδιάς -> Πεδιάδα)
        if (/άς$/.test(w) || /ας$/i.test(n) && w.length > 4) {
            out.add(w.slice(0, -2) + 'άδα');
            out.add(w.slice(0, -1));
        }
        // 8. -ην -> -η
        if (/ην$/i.test(n) && w.length > 4) {
            out.add(w.slice(0, -1));
        }
        // 9. -ωρ -> -ορας / -ωρας
        if (/ωρ$/i.test(n) && w.length > 4) {
            out.add(w + 'ας');
        }
        // 10. -ος -> -ο / -η -> -ιο
        if (/ος$/i.test(n) && w.length > 4) {
            out.add(w.slice(0, -2) + 'ο');
        }
        if (/η$/i.test(n) && w.length > 4) {
            out.add(w.slice(0, -1) + 'ι');
            out.add(w.slice(0, -1) + 'ιο');
        }

        return Array.from(out);
    }

    const words = noParens.split(/\s+/);
    if (words.length === 1) {
        for (const tw of transformWord(words[0])) add(tw);
    } else if (words.length === 2) {
        const w1s = transformWord(words[0]);
        const w2s = transformWord(words[1]);
        for (const a of w1s) {
            for (const b of w2s) {
                add(`${a} ${b}`);
            }
        }
        // Ako je druga rec genitiv oblasti (npr. "Γαρδίκιον Φιλιατών" -> "Γαρδίκι", "Πάνορμον Δωρίδος" -> "Πάνορμος", "Βλαχάτα Εικοσιμιάς" -> "Βλαχάτα")
        const firstNorm = normalizeGreek(words[0]);
        if (!/^(ανω|κατω|νεοσ|νεα|νεον|νεαι|παλαιοσ|παλαια|παλαιον|παλιοσ|παλια|παλιο|μεγασ|μεγα|μεγαλοσ|μεγαλη|μεγαλο|μικροσ|μικρα|μικρον|αγιοσ|αγια|αγιοι|τρι|τρια)$/.test(firstNorm)) {
            for (const a of w1s) add(a);
        }
    } else if (words.length >= 3) {
        const transformed = words.map(w => transformWord(w)[0]);
        add(transformed.join(' '));
        // Prve dve reci (npr. "Άγιος Γεώργιος Κερατσινίου" -> "Άγιος Γεώργιος")
        const w1s = transformWord(words[0]);
        const w2s = transformWord(words[1]);
        for (const a of w1s) {
            for (const b of w2s) {
                add(`${a} ${b}`);
            }
        }
    }

    // Takodje varijanta bez Άνω / Κάτω / Νέο / Παλαιό / Μικρό / Μεγάλο / Ερείπια
    const prefixRe = /^(ανω|κατω|νεοσ|νεα|νεον?|νεεσ|νεαι|παλαιοσ|παλαια|παλαιον?|παλιοσ|παλια|παλιο|μεγασ|μεγα|μεγαλοσ|μεγαλη|μεγαλο|μικροσ|μικρα|μικρον?|ερειπια)\s+/i;
    for (const v of Array.from(variants)) {
        const nv = v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ς/g, 'σ').toLowerCase();
        const m = nv.match(prefixRe);
        if (m) {
            const rest = v.slice(m[0].length).trim();
            if (rest.length >= 3) {
                for (const tw of transformWord(rest)) add(tw);
            }
        }
    }

    return Array.from(variants);
}

// Pretvaranje latinskog naziva iz Katarevuse u Demotiki (npr. Kato Scholarion -> Kato Scholari)
function generateDemoticLatinVariants(nameEn) {
    if (!nameEn) return [];
    const variants = new Set();
    function add(v) {
        const c = v.replace(/\s+/g, ' ').trim();
        if (c.length >= 2) variants.add(c);
    }
    add(nameEn);

    const noParens = nameEn.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    add(noParens);

    function transformLatWord(w) {
        const out = new Set([w]);
        const lw = w.toLowerCase();
        if (lw === 'neon') out.add('Neo');
        if (lw === 'neai') out.add('Nees');
        if (lw === 'palaion') { out.add('Palaio'); out.add('Palio'); }
        if (lw === 'mikron') out.add('Mikro');
        if (lw === 'mega') out.add('Megalo');

        if (lw.endsWith('ion') && w.length > 4) {
            out.add(w.slice(0, -2)); // Scholarion -> Scholari
            out.add(w.slice(0, -1)); // -> Scholario
        }
        if (lw.endsWith('on') && !lw.endsWith('ion') && w.length > 3) {
            out.add(w.slice(0, -1)); // Palaiokastron -> Palaiokastro
            out.add(w.slice(0, -2) + 'i'); // Kryoneron -> Kryoneri
            out.add(w + 'as'); // Drymon -> Drymonas
            out.add(w.slice(0, -1) + 's'); // Panormon -> Panormos
        }
        if (lw.endsWith('ea') && w.length > 4) {
            out.add(w.slice(0, -2) + 'ia'); // Vyssinea -> Vyssinia, Glykomilea -> Glykomilia
        }
        if (lw.endsWith('eai') && w.length > 4) {
            out.add(w.slice(0, -3) + 'ies'); // Achladeai -> Achladies
        }
        if (lw.endsWith('yns')) {
            out.add(w.slice(0, -1) + 'tha'); // Tiryns -> Tiryntha
        }
        if (lw.endsWith('ai') && w.length > 3) {
            out.add(w.slice(0, -2) + 'es'); // Pigai -> Piges
        }
        if (lw.endsWith('ous') && w.length > 4) {
            out.add(w.slice(0, -3) + 'ounta'); // Trapezous -> Trapezounta
        }
        if (lw.endsWith('aioi') && w.length > 5) {
            out.add(w.slice(0, -4) + 'aiika'); // Kakouraioi -> Kakouraiika
        }
        return Array.from(out);
    }

    const words = noParens.split(/\s+/);
    if (words.length === 1) {
        for (const tw of transformLatWord(words[0])) add(tw);
    } else if (words.length === 2) {
        for (const a of transformLatWord(words[0])) {
            for (const b of transformLatWord(words[1])) {
                add(`${a} ${b}`);
            }
        }
        if (!/^(ano|kato|neo|nea|neon|palaio|palio|mikro|megalo|agios|agia|tria)$/i.test(words[0])) {
            for (const a of transformLatWord(words[0])) add(a);
        }
    }

    const latPrefixRe = /^(ano|kato|neos|nea|neon?|palaio[s]?|palio[s]?|mega[s]?|megalo[s]?|mikro[s]?|mikron?)\s+/i;
    for (const v of Array.from(variants)) {
        const m = v.match(latPrefixRe);
        if (m) {
            const rest = v.slice(m[0].length).trim();
            if (rest.length >= 3) {
                for (const tw of transformLatWord(rest)) add(tw);
            }
        }
    }

    return Array.from(variants);
}

// Provera poklapanja oblasti Vasmera i prefekture u Excelu
function matchRegionToPrefecture(vasmerRegion, prefecture, province) {
    if (!vasmerRegion) return false;
    const vr = vasmerRegion.toLowerCase();
    const pref = `${prefecture || ''} ${province || ''}`.toLowerCase();

    const map = [
        ['joannina', ['ioannina', 'joannina', 'thesprotia', 'dodoni', 'konitsa', 'pogon', 'metsov']],
        ['arta', ['arta']],
        ['preveza', ['preveza', 'thesprotia', 'margarit', 'paramyth', 'filiat', 'nikopolis']],
        ['akarnanien', ['aitoloakarnania', 'acarnan', 'mesolong', 'vonitsa', 'nafpakt', 'trichon', 'valt']],
        ['ionische', ['kerkyra', 'corfu', 'lefkada', 'kefallinia', 'zakynthos', 'ithaki']],
        ['korfu', ['kerkyra', 'corfu']],
        ['leukas', ['lefkada']],
        ['kephallenia', ['kefallinia']],
        ['ithaka', ['kefallinia', 'ithaki']],
        ['zakynthos', ['zakynthos']],
        ['eurytanien', ['evrytania', 'aitoloakarnania']],
        ['thessalien', ['trikala', 'larisa', 'karditsa', 'magnisia', 'volos', 'farsala', 'kalampaka', 'elassona', 'agia', 'almyros', 'fthiotis']],
        ['trikkala', ['trikala', 'karditsa']],
        ['larissa', ['larisa', 'magnisia', 'trikala']],
        ['phthiotis', ['fthiotis', 'fokis', 'magnisia', 'larisa']],
        ['magnesia', ['magnisia', 'larisa']],
        ['euboia', ['evoia', 'chalkida', 'karyst', 'istiaia']],
        ['andros', ['kyklades', 'andros']],
        ['tenos', ['kyklades', 'tinos']],
        ['skyros', ['evoia', 'skyros']],
        ['phokis', ['fokis', 'fthiotis', 'parnass', 'doris', 'lokris']],
        ['böotien', ['voiotia', 'thiva', 'livadia', 'attiki']],
        ['attika', ['attiki', 'athina', 'megar']],
        ['aigina', ['attiki', 'aigina']],
        ['korinth', ['korinthia', 'argolis', 'achaia']],
        ['argolis', ['argolis', 'korinthia', 'arkadia']],
        ['achaia', ['achaia', 'patra', 'aigial', 'kalavryt', 'ileia']],
        ['elis', ['ileia', 'achaia', 'olymp', 'pyrgos']],
        ['triphylien', ['messinia', 'ileia', 'trifylia', 'olympia', 'arkadia']],
        ['arkadien', ['arkadia', 'gortynia', 'mantineia', 'kynouria', 'megalopoli', 'argolis', 'lakonia']],
        ['messenien', ['messinia', 'kalamata', 'pylia', 'trifylia', 'lakonia']],
        ['lakonien', ['lakonia', 'sparti', 'gytheio', 'epidavros', 'oitylo', 'arkadia', 'messinia']],
        ['kreta', ['chania', 'rethymno', 'irakleio', 'lasithi']],
        ['kozani', ['kozani', 'grevena', 'kastoria', 'voio', 'eordaia', 'florina', 'imathia', 'pieria']],
        ['florina', ['florina', 'kastoria', 'pella', 'kozani']],
        ['pella', ['pella', 'edessa', 'almopia', 'giannitsa', 'imathia', 'kilkis', 'florina']],
        ['thessalonike', ['thessaloniki', 'chalkidiki', 'kilkis', 'imathia', 'veroia', 'pieria', 'katerini', 'lagkadas', 'paionia', 'pella', 'serrai']],
        ['serres', ['serrai', 'sidirokastro', 'visaltia', 'fyllida', 'drama', 'kilkis', 'thessaloniki', 'kavala']],
        ['drama', ['drama', 'kavala', 'xanthi', 'serrai']],
        ['thrakische inseln', ['kavala', 'thasos', 'evros', 'samothraki']],
        ['thasos', ['kavala', 'thasos']],
        ['samothrake', ['evros', 'samothraki']],
        ['thrakien', ['rodopi', 'evros', 'xanthi', 'komotini', 'alexandroupoli', 'didymoteicho', 'kavala']],
        ['xanthe', ['xanthi', 'rodopi', 'kavala', 'drama']],
        ['ainos', ['evros', 'rodopi']],
        ['adrianopel', ['evros']],
        ['saranda', ['evros']],
        ['rhaidestos', ['evros', 'rodopi', 'magnisia']],
        ['kallipolis', ['evros', 'lesvos']],
    ];

    for (const [key, list] of map) {
        if (vr.includes(key)) {
            return list.some(item => pref.includes(item));
        }
    }
    return false;
}

async function main() {
    console.log('=== 1. Ucitavanje Excela (output2.xlsx) i izracunavanje geografskih centara prefektura/provincija ===');
    const wb = xlsx.readFile(EXCEL_PATH);
    const ws = wb.Sheets['Renamings'];
    const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });
    console.log(`Ukupno redova: ${rows.length}`);

    // Izracunaj centre za svaku prefekturu i provinciju na osnovu vec postojecih 3451 koordinata
    const prefPoints = new Map();
    const provPoints = new Map();
    const commCoords = new Map(); // (prefecture::community_norm) -> [{lat, lon, name_gr, name_en}]
    const existingNewNameCoords = new Map(); // (prefecture::new_name_norm) -> {lat, lon, name_gr, name_en}

    for (const r of rows) {
        const lat = parseFloat(r.latitude);
        const lon = parseFloat(r.longitude);
        if (!isNaN(lat) && !isNaN(lon) && lat > 34 && lat < 42 && lon > 19 && lon < 30) {
            const pKey = (r.prefecture || '').trim().toUpperCase();
            const prKey = `${pKey}::${(r.province || '').trim().toUpperCase()}`;
            if (!prefPoints.has(pKey)) prefPoints.set(pKey, []);
            prefPoints.get(pKey).push({ lat, lon });

            if (!provPoints.has(prKey)) provPoints.set(prKey, []);
            provPoints.get(prKey).push({ lat, lon });

            // Sacuvaj koordinate po zajednici/opstini i po starom/novom latinskom nazivu (radi uvezanih preimenovanja i starih imena opstina)
            const latNamesForComm = [r.name_of_community_or_municipality, r.old_name_en, r.new_name_en].filter(Boolean);
            for (const lnRaw of latNamesForComm) {
                for (const v of generateDemoticLatinVariants(lnRaw)) {
                    const cKey = `${pKey}::${normalizeLatinNoSpace(v)}`;
                    if (!commCoords.has(cKey)) commCoords.set(cKey, []);
                    commCoords.get(cKey).push({ lat, lon, name_gr: r.new_name_gr, name_en: r.new_name_en });
                }
            }

            // Sacuvaj koordinate po novom i starom grckom imenu u istoj prefekturi (radi dvostrukih preimenovanja npr. Μπαλτινόν -> Μπάλτινον -> Καταφύγι)
            const grNamesForChain = [r.new_name_gr, r.old_name_gr, r.new_name_alternative, r.old_name_alternative].filter(Boolean);
            for (const gnRaw of grNamesForChain) {
                for (const v of generateDemoticGreekVariants(gnRaw)) {
                    const nKey = `${pKey}::${normalizeGreekNoSpace(v)}`;
                    if (!existingNewNameCoords.has(nKey)) {
                        existingNewNameCoords.set(nKey, { lat, lon, name_gr: r.new_name_gr, name_en: r.new_name_en });
                    }
                }
            }
        }
    }

    const prefCentroids = new Map();
    for (const [k, pts] of prefPoints.entries()) {
        const mLat = median(pts.map(p => p.lat));
        const mLon = median(pts.map(p => p.lon));
        prefCentroids.set(k, { lat: mLat, lon: mLon });
    }
    // Tacni geografski centri za prefekture koje su imale mali uzorak ili pomerenu medijanu u prvobitnom skrejperu
    prefCentroids.set('IRAKLEIO', { lat: 35.15, lon: 25.12 });
    prefCentroids.set('KEFALLINIA', { lat: 38.20, lon: 20.55 });
    prefCentroids.set('KEFALLONIA', { lat: 38.20, lon: 20.55 });
    prefCentroids.set('EYVOIA', { lat: 38.55, lon: 23.85 });
    prefCentroids.set('KYKLADES', { lat: 37.08, lon: 25.30 });

    const provCentroids = new Map();
    for (const [k, pts] of provPoints.entries()) {
        const mLat = median(pts.map(p => p.lat));
        const mLon = median(pts.map(p => p.lon));
        provCentroids.set(k, { lat: mLat, lon: mLon });
    }
    // Dodaj ostrvske provincije koje su daleko od centra maticne prefekture (npr. Kythira u Attiki, Thira/Amorgos u Kyklades)
    provCentroids.set('ATTIKI::KYTHIRA', { lat: 36.22, lon: 22.98 });
    provCentroids.set('KYKLADES::THIRA', { lat: 36.60, lon: 25.65 });
    provCentroids.set('KYKLADES::KEA', { lat: 37.62, lon: 24.33 });
    provCentroids.set('IRAKLEIO::MALEVIZI', { lat: 35.25, lon: 25.00 });
    provCentroids.set('IRAKLEIO::MONOFATSI', { lat: 35.08, lon: 25.15 });
    provCentroids.set('KEFALLINIA::KRANAIA', { lat: 38.18, lon: 20.55 });

    console.log(`Izracunati centri za ${prefCentroids.size} prefektura i ${provCentroids.size} provincija.`);

    // === 2. Ucitavanje i indeksiranje OpenStreetMap naselja u Grckoj ===
    console.log('\n=== 2. Ucitavanje OpenStreetMap baze naselja u Grckoj ===');
    const osmPlaces = JSON.parse(fs.readFileSync(OSM_PATH, 'utf8'));
    console.log(`Ucitano OSM tacaka u Grckoj: ${osmPlaces.length}`);

    const osmByGrNorm = new Map();
    const osmByGrPhonetic = new Map();
    const osmByLatNorm = new Map();
    const osmByOldGrNorm = new Map();

    function addToMap(map, key, obj) {
        if (!key || key.length < 2) return;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(obj);
    }

    for (const el of osmPlaces) {
        const t = el.tags || {};
        const primaryGr = t['name:el'] || t.name || '';
        const primaryEn = t['name:en'] || t.int_name || t['name:latin'] || '';

        const entry = {
            lat: el.lat,
            lon: el.lon,
            name_gr: primaryGr,
            name_en: primaryEn,
            place: t.place || t.historic || 'locality',
            old_name: t.old_name || '',
        };

        // Svi savremeni nazivi (ukljucujuci alt_name, official_name, short_name)
        const nameFields = [t.name, t['name:el'], t.alt_name, t['alt_name:el'], t.official_name, t.short_name, t.loc_name].filter(Boolean);
        for (const nf of nameFields) {
            for (const part of nf.split(/[;,\/]/)) {
                const trimmed = part.trim();
                if (!trimmed) continue;
                for (const dv of generateDemoticGreekVariants(trimmed)) {
                    const gn = normalizeGreekNoSpace(dv);
                    if (gn) {
                        addToMap(osmByGrNorm, gn, entry);
                        addToMap(osmByGrPhonetic, normalizeGreekPhonetic(dv), entry);
                    }
                    const translit = normalizeLatinNoSpace(greekToLatin(dv));
                    if (translit) addToMap(osmByLatNorm, translit, entry);
                }
                const ln = normalizeLatinNoSpace(trimmed);
                if (ln) addToMap(osmByLatNorm, ln, entry);
            }
        }

        // Latinski nazivi
        const latFields = [t['name:en'], t.int_name, t['name:latin'], t['alt_name:en']].filter(Boolean);
        for (const lf of latFields) {
            for (const part of lf.split(/[;,\/]/)) {
                for (const dv of generateDemoticLatinVariants(part.trim())) {
                    const ln = normalizeLatinNoSpace(dv);
                    if (ln) addToMap(osmByLatNorm, ln, entry);
                }
            }
        }

        // Stari nazivi u OSM-u (old_name, old_name:el, nat_name)
        const oldFields = [t.old_name, t['old_name:el'], t['old_name:en'], t.nat_name].filter(Boolean);
        for (const ofld of oldFields) {
            for (const part of ofld.split(/[;,\/]/)) {
                const gn = normalizeGreekNoSpace(part);
                if (gn) addToMap(osmByOldGrNorm, gn, entry);
                const ln = normalizeLatinNoSpace(part);
                if (ln) addToMap(osmByLatNorm, ln, entry);
            }
        }
    }

    console.log(`Indeksirano OSM grckih kljuceva: ${osmByGrNorm.size}, fonetskih: ${osmByGrPhonetic.size}, latinskih: ${osmByLatNorm.size}`);

    // Funkcija koja bira OSM tacku koja pripada trazenoj prefekturi / provinciji
    function pickBestInRegion(candidates, row, maxDistPrefKm = 90) {
        if (!candidates || candidates.length === 0) return null;
        const pKey = (row.prefecture || '').trim().toUpperCase();
        const prKey = `${pKey}::${(row.province || '').trim().toUpperCase()}`;

        const provCenter = provCentroids.get(prKey);
        const prefCenter = prefCentroids.get(pKey);
        const refCenter = provCenter || prefCenter;

        if (!refCenter) return candidates[0];

        let best = null;
        let bestDist = Infinity;

        for (const c of candidates) {
            const dProv = provCenter ? haversineKm(c.lat, c.lon, provCenter.lat, provCenter.lon) : Infinity;
            const dPref = prefCenter ? haversineKm(c.lat, c.lon, prefCenter.lat, prefCenter.lon) : dProv;
            const d = Math.min(dProv, dPref);

            // Daj blagu prednost pravim naseljima (village, town, hamlet) u odnosu na planinske vrhove ako su blizu
            const isSettlement = /^(village|town|city|hamlet|suburb|Quarter|neighbourhood)$/i.test(c.place);
            const scoreDist = isSettlement ? d : d + 5;

            if (d <= maxDistPrefKm && scoreDist < bestDist) {
                bestDist = scoreDist;
                best = c;
            }
        }

        return best;
    }

    // Pronadji koordinate za red kome fale koordinate
    function findMissingCoordinates(row) {
        const pKey = (row.prefecture || '').trim().toUpperCase();

        // 1. Pokusaj novo grcko ime (ukljucujuci Demotiki transformaciju Katarevuse: Κάτω Σχολάριον -> Κάτω Σχολάρι)
        const grNewVariants = [
            ...generateDemoticGreekVariants(row.new_name_gr),
            ...generateDemoticGreekVariants(row.new_name_alternative),
        ];

        for (let i = 0; i < grNewVariants.length; i++) {
            const v = grNewVariants[i];
            const gn = normalizeGreekNoSpace(v);
            if (!gn) continue;

            if (osmByGrNorm.has(gn)) {
                const hit = pickBestInRegion(osmByGrNorm.get(gn), row, 95);
                if (hit) {
                    const isModified = normalizeGreekNoSpace(hit.name_gr) !== normalizeGreekNoSpace(row.new_name_gr);
                    return {
                        lat: hit.lat,
                        lon: hit.lon,
                        map_name_gr: hit.name_gr || v,
                        map_name_en: hit.name_en || '',
                        source: isModified
                            ? `OSM savremeni naziv (Demotiki: ${hit.name_gr || v})`
                            : `OSM tačan naziv (${hit.name_gr || v})`
                    };
                }
            }
        }

        // 2. Pokusaj fonetsko poklapanje novog grckog imena u OSM-u (npr. Θύρρειον -> Θύρρειο / Θύριο)
        for (const v of grNewVariants) {
            const ph = normalizeGreekPhonetic(v);
            if (!ph) continue;
            if (osmByGrPhonetic.has(ph)) {
                const hit = pickBestInRegion(osmByGrPhonetic.get(ph), row, 85);
                if (hit) {
                    return {
                        lat: hit.lat,
                        lon: hit.lon,
                        map_name_gr: hit.name_gr || v,
                        map_name_en: hit.name_en || '',
                        source: `OSM fonetski/ortografski naziv (${hit.name_gr || v})`
                    };
                }
            }
        }

        // 3. Pokusaj engleski/latinski naziv (Kato Scholarion -> Kato Scholari)
        const latNewVariants = generateDemoticLatinVariants(row.new_name_en);
        for (const v of latNewVariants) {
            const ln = normalizeLatinNoSpace(v);
            if (!ln) continue;
            if (osmByLatNorm.has(ln)) {
                const hit = pickBestInRegion(osmByLatNorm.get(ln), row, 90);
                if (hit) {
                    return {
                        lat: hit.lat,
                        lon: hit.lon,
                        map_name_gr: hit.name_gr || '',
                        map_name_en: hit.name_en || v,
                        source: `OSM latinski/demotiki naziv (${hit.name_gr || hit.name_en || v})`
                    };
                }
            }
        }

        // 4. Pokusaj staro ime (old_name_gr / old_name_alternative / old_name_en) u OSM-u (mnoga napustena sela su na OSM upisana pod starim imenom ili old_name tagom!)
        const grOldVariants = [
            ...generateDemoticGreekVariants(row.old_name_gr),
            ...generateDemoticGreekVariants(row.old_name_alternative),
        ];
        for (const v of grOldVariants) {
            const gn = normalizeGreekNoSpace(v);
            const ph = normalizeGreekPhonetic(v);
            const cands = [
                ...(osmByOldGrNorm.get(gn) || []),
                ...(osmByGrNorm.get(gn) || []),
                ...(osmByGrPhonetic.get(ph) || []),
            ];
            if (cands.length > 0) {
                const hit = pickBestInRegion(cands, row, 80);
                if (hit) {
                    return {
                        lat: hit.lat,
                        lon: hit.lon,
                        map_name_gr: hit.name_gr || v,
                        map_name_en: hit.name_en || '',
                        source: `OSM pronađeno po starom nazivu (${hit.name_gr || v})`
                    };
                }
            }
        }

        // 5. Proveri da li isto novo ime u istoj prefekturi vec ima koordinate u drugom redu output2.xlsx
        for (const v of grNewVariants) {
            const nKey = `${pKey}::${normalizeGreekNoSpace(v)}`;
            if (existingNewNameCoords.has(nKey)) {
                const hit = existingNewNameCoords.get(nKey);
                return {
                    lat: hit.lat,
                    lon: hit.lon,
                    map_name_gr: hit.name_gr,
                    map_name_en: hit.name_en,
                    source: `Isto mesto već geokodirano u prefekturi (${hit.name_gr})`
                };
            }
        }

        // 6. Pokusaj preko opstine / zajednice (name_of_community_or_municipality) u OSM-u ili postojecim redovima u istoj prefekturi
        if (row.name_of_community_or_municipality) {
            const commVariants = generateDemoticLatinVariants(row.name_of_community_or_municipality);
            for (const cv of commVariants) {
                const ln = normalizeLatinNoSpace(cv);
                if (osmByLatNorm.has(ln)) {
                    const hit = pickBestInRegion(osmByLatNorm.get(ln), row, 85);
                    if (hit) {
                        return {
                            lat: hit.lat,
                            lon: hit.lon,
                            map_name_gr: hit.name_gr || cv,
                            map_name_en: hit.name_en || cv,
                            source: `Koordinate matične opštine/zajednice na OSM (${hit.name_gr || cv})`
                        };
                    }
                }
                const cKey = `${pKey}::${ln}`;
                if (commCoords.has(cKey)) {
                    const pts = commCoords.get(cKey);
                    return {
                        lat: pts[0].lat,
                        lon: pts[0].lon,
                        map_name_gr: pts[0].name_gr || cv,
                        map_name_en: cv,
                        source: `Koordinate matične opštine/zajednice iz tabele (${cv})`
                    };
                }
            }
        }

        // 7. Verifikovane istorijske lokacije za 5 specificnih preimenovanja (gde je naselje naknadno promenilo ime 1928. ili je napusteno)
        const manualVerified = {
            'KOZANI::νεασιγη': { lat: 40.3128, lon: 21.8492, map_name_gr: 'Αυγή (Νέα Σιγή)', map_name_en: 'Avgi (Nea Sigi)', source: 'Verifikovana lokacija naknadnog preimenovanja (Αυγή Κοζάνης)' },
            'THESPROTIA::μακροχωρα': { lat: 39.3554008, lon: 20.4141365, map_name_gr: 'Καταβόθρα (Μακροχώρα)', map_name_en: 'Katavothra (Makrochora)', source: 'OSM naknadno preimenovanje 1928 (Καταβόθρα Θεσπρωτίας)' },
            'DRAMA::ακρινον': { lat: 41.3986, lon: 23.8647, map_name_gr: 'Ακρινό (Λόφτσα)', map_name_en: 'Akrino (Loftsa)', source: 'Verifikovana istorijska lokacija (Ακρινό / Λόφτσα Νευροκοπίου Δράμας)' },
            'ACHAIA::βουνοπυργοσ': { lat: 38.2031, lon: 21.7375, map_name_gr: 'Βουνόπυργος (Δεμενίκα)', map_name_en: 'Vounopyrgos (Demenika)', source: 'Verifikovana lokacija u okviru opštine (Δεμενίκα Πατρών)' },
            'ATTIKI::μυρτιδια': { lat: 36.1972, lon: 22.9197, map_name_gr: 'Μυρτίδια Κυθήρων', map_name_en: 'Myrtidia Kythiron', source: 'Verifikovana lokacija (Μυρτίδια Κυθήρων)' },
        };
        const mKey = `${pKey}::${normalizeGreekNoSpace(row.new_name_gr)}`;
        if (manualVerified[mKey]) return manualVerified[mKey];

        return null;
    }

    // === 3. Ucitavanje Vasmer baze i unapredjeno fonetsko uparivanje ===
    console.log('\n=== 3. Ucitavanje Vasmerove baze i prosireno fonetsko indeksiranje ===');
    const vasmerEntries = JSON.parse(fs.readFileSync(VASMER_JSON, 'utf8'));

    const wrBuf = fs.readFileSync(WORTREGISTER_PATH);
    const wrHtml = wrBuf.toString('utf16le');
    const $ = cheerio.load(wrHtml);
    const wortregGrMap = new Map();
    $('p').each((i, el) => {
        const txt = $(el).text().trim().replace(/\s+/g, ' ');
        const m = txt.match(/^([\p{L}\p{M}\s\-'ʹ\(\)\/\.]+?)\s+((?:[0-9]|I|V|X|f)[0-9\.\s,f\-]+(?:\s+ff\.)?)$/u);
        if (m) {
            const name = m[1].trim();
            const pagesStr = m[2].trim();
            const norm = normalizeGreekNoSpace(name);
            if (norm) {
                if (!wortregGrMap.has(norm)) wortregGrMap.set(norm, []);
                wortregGrMap.get(norm).push({ name_orig: name, pages: pagesStr });
            }
        }
    });

    // Varijante starog grckog naziva za uparivanje sa Vasmerom:
    // uklanja samo geografske prefikse (Άνω/Κάτω/Μέγα/Μικρό/Νέον/Παλαιόν) i padezne sufikse (-ον/-ο, -ιον/-ι),
    // ali NIKADA ne skracuje dvočlane nazive tipa "Καρά Μπουνάρ" na samo "Καρά"!
    function generateVasmerOldNameVariants(str) {
        if (!str) return [];
        const out = new Set();
        function addV(v) {
            const c = v.replace(/\s+/g, ' ').trim();
            if (c.length >= 2) out.add(c);
        }
        addV(str);
        const noParens = str.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
        addV(noParens);

        const prefixRe = /^(ανω|κατω|νεοσ|νεα|νεον?|παλαιοσ|παλαια|παλαιον?|παλιοσ|παλια|παλιο|μεγασ|μεγα|μεγαλοσ|μεγαλη|μεγαλο|μικροσ|μικρα|μικρον?)\s+/i;
        for (const item of Array.from(out)) {
            const nv = item.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ς/g, 'σ').toLowerCase();
            const m = nv.match(prefixRe);
            if (m) {
                const rest = item.slice(m[0].length).trim();
                if (rest.length >= 3) addV(rest);
            }
        }

        // Sufiksne varijante na poslednjoj reci (-ον -> -ο, -ιον -> -ι, -ος -> -ο, -ας -> -α)
        for (const item of Array.from(out)) {
            const n = item.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            if (/ιον$/i.test(n) && item.length > 4) {
                addV(item.slice(0, -2));
                addV(item.slice(0, -1));
            } else if (/ον$/i.test(n) && item.length > 3) {
                addV(item.slice(0, -1));
            } else if (/ο$/i.test(n) && item.length > 3) {
                addV(item + 'ν');
            } else if (/(ος|ας)$/i.test(n) && item.length > 4) {
                addV(item.slice(0, -1));
            }
        }
        return Array.from(out);
    }

    const vNormMap = new Map();
    const vPhoneticMap = new Map();
    const vSkeletonMap = new Map();

    const genericGreekNouns = new Set([
        'καλυβια', 'χωριον', 'χωριο', 'παλαιοχωριον', 'παλαιοχωρι', 'νεοχωριον', 'νεοχωρι',
        'κεφαλοχωριον', 'κεφαλοχωρι', 'μαχαλασ', 'μαχαλα', 'τσιφλικι', 'τσιφλικιον', 'μετοχι', 'μετοχιον'
    ]);

    for (const e of vasmerEntries) {
        // Indeksiraj samo glavno grcko ime odrednice (e.greek_name), bez pomocnih imenica (Καλύβια, Χωρίον, Παλαιοχώριον)
        const names = [e.greek_name];
        for (const g of names) {
            for (const dv of generateVasmerOldNameVariants(g)) {
                const gn = normalizeGreekNoSpace(dv);
                if (genericGreekNouns.has(gn)) continue;
                addToMap(vNormMap, gn, e);
                const ph = normalizeGreekPhonetic(dv);
                if (!genericGreekNouns.has(ph)) addToMap(vPhoneticMap, ph, e);
                const sk = normalizeSlavicGreekSkeleton(dv);
                if (sk.length >= 4 && !genericGreekNouns.has(sk)) addToMap(vSkeletonMap, sk, e);
            }
        }
    }

    function selectBestVasmer(candidates, row, requireRegionMatch = false) {
        if (!candidates || !candidates.length) return null;
        for (const c of candidates) {
            if (matchRegionToPrefecture(c.region, row.prefecture, row.province)) {
                return c;
            }
        }
        if (requireRegionMatch) return null;
        const withSlav = candidates.filter(c => c.slavic_extracted);
        if (withSlav.length > 0) {
            return withSlav.sort((a, b) => b.full_text.length - a.full_text.length)[0];
        }
        return candidates[0];
    }

    function matchVasmerRow(row) {
        const rawCands = [row.old_name_gr, row.old_name_alternative].filter(Boolean);
        const expanded = [];
        for (const rc of rawCands) {
            for (const v of generateVasmerOldNameVariants(rc)) {
                if (!expanded.includes(v)) expanded.push(v);
            }
        }

        // 1. Tacno / Demotiki poklapanje
        for (let i = 0; i < expanded.length; i++) {
            const gn = normalizeGreekNoSpace(expanded[i]);
            if (vNormMap.has(gn)) {
                const chosen = selectBestVasmer(vNormMap.get(gn), row, false);
                if (chosen) {
                    return {
                        match_type: i === 0 ? 'Tačno poklapanje (Poglavlje III)' : 'Poklapanje osnove/varijante (Poglavlje III)',
                        entry: chosen
                    };
                }
            }
        }

        // 2. Fonetsko/ortografsko poklapanje (ukljucujuci τζ <-> τσ, αι <-> ε, η/ει/οι/υ <-> ι, ω <-> ο)
        for (const str of expanded) {
            const ph = normalizeGreekPhonetic(str);
            if (ph.length >= 3 && vPhoneticMap.has(ph)) {
                const chosen = selectBestVasmer(vPhoneticMap.get(ph), row, false);
                if (chosen) {
                    return {
                        match_type: 'Fonetsko/ortografsko poklapanje (Poglavlje III)',
                        entry: chosen
                    };
                }
            }
        }

        // 3. Duboko slovensko-grcko poklapanje kostura reci (μπ<->β, ντ<->δ, γκ<->γ, bez sufiksa), UZ OBAVEZNO POKLAPANJE PREFEKTURE/OBLASTI!
        for (const str of expanded) {
            const sk = normalizeSlavicGreekSkeleton(str);
            if (sk.length >= 4 && vSkeletonMap.has(sk)) {
                const chosen = selectBestVasmer(vSkeletonMap.get(sk), row, true);
                if (chosen) {
                    return {
                        match_type: 'Blago izmenjen zapis u istoj oblasti (Poglavlje III)',
                        entry: chosen
                    };
                }
            }
        }

        // 4. Wortregister I
        for (const str of expanded) {
            const gn = normalizeGreekNoSpace(str);
            if (wortregGrMap.has(gn)) {
                const hit = wortregGrMap.get(gn)[0];
                return {
                    match_type: 'Wortregister (indeks knjige)',
                    entry: {
                        greek_name: hit.name_orig,
                        slavic_extracted: '',
                        region: 'Indeks (Wortregister I)',
                        book_page: hit.pages,
                        origin_assessment: 'Slovenski (Vasmer registar)',
                        citation: `Knjiga str. ${hit.pages} (Wortregister I)`,
                        full_text: `Navedeno u Vasmerovom grčkom registru (Wortregister I) na str. ${hit.pages}.`
                    }
                };
            }
        }

        return null;
    }

    // Heuristika za turske i grcke nazive
    function detectNonVasmerOrigin(oldNameGr, oldNameAlt) {
        const norm = normalizeGreekNoSpace(`${oldNameGr || ''} ${oldNameAlt || ''}`);
        if (!norm) return '';
        const turkishPatterns = [
            /κιοι/, /κιου/, /λαρ$/, /λερ$/, /ντερε/, /τεπε/, /μαχαλ/, /τσιφλικ/, /τζιφλικ/,
            /καγια/, /μπουν/, /πουνναρ/, /χισαρ/, /καλε/, /παζαρ/, /τζαμι/, /σεραι/,
            /οβασι/, /αγα/, /μπεη/, /μπαση/, /πασα/, /χατζη/, /χασαν/, /χουσειν/, /μουσταφα/,
            /μεχμετ/, /αχμετ/, /αλι/, /ισμαιλ/, /σουλειμαν/, /οσμαν/, /ιμπραημ/, /μπαιραμ/,
            /^καρα/, /^ακ/, /^κιζιλ/, /^γενι/, /^εσκι/, /^μπουγιουκ/, /^κουτσουκ/, /^σαρι/,
            /νταγ/, /τσαιρ/, /μπαξ/, /κισλα/, /κονακ/, /χαν$/, /χανι/, /κουλε/, /ογλου/
        ];
        for (const pat of turkishPatterns) {
            if (pat.test(norm)) return 'Турци (turska osnova/sufiks)';
        }
        if (/^(αγιοσ|αγια|αγιοι|παναγια|προφητησ|μονη)/.test(norm)) {
            return 'Грци (grčki naziv)';
        }
        return '';
    }

    // === 4. Obrada svih 4413 redova ===
    console.log('\n=== 4. Obrada svih 4413 redova (dopuna koordinata + Vasmer) ===');
    let coordStats = {
        already_had: 0,
        fixed_wrong_prefecture: 0,
        missing_before: 0,
        filled_osm_new_name: 0,
        filled_osm_old_name: 0,
        filled_same_pref_table: 0,
        filled_community: 0,
        still_missing: 0
    };

    let vasmerStats = {
        total_matched: 0,
        exact: 0,
        variant: 0,
        phonetic: 0,
        skeleton_in_region: 0,
        wortregister: 0,
        with_slavic: 0
    };

    for (const row of rows) {
        const hasCoord = row.latitude !== '' && row.longitude !== '' && !isNaN(parseFloat(row.latitude)) && !isNaN(parseFloat(row.longitude));
        if (hasCoord) {
            coordStats.already_had++;
            const lat = parseFloat(row.latitude);
            const lon = parseFloat(row.longitude);
            const pKey = (row.prefecture || '').trim().toUpperCase();
            const prKey = `${pKey}::${(row.province || '').trim().toUpperCase()}`;
            const provCenter = provCentroids.get(prKey);
            const prefCenter = prefCentroids.get(pKey);
            const dProv = provCenter ? haversineKm(lat, lon, provCenter.lat, provCenter.lon) : Infinity;
            const dPref = prefCenter ? haversineKm(lat, lon, prefCenter.lat, prefCenter.lon) : dProv;

            // Ako je prvobitni skrejper upisao koordinatu > 100 km daleko od prave prefekture/provincije (zbog homonima u drugoj oblasti Grcke),
            // proveri da li imamo tacno to mesto unutar prave prefekture!
            if (Math.min(dProv, dPref) > 100) {
                const better = findMissingCoordinates(row);
                if (better) {
                    row.latitude = better.lat;
                    row.longitude = better.lon;
                    row.ime_na_karti_gr = better.map_name_gr || row.new_name_gr;
                    row.ime_na_karti_en = better.map_name_en || row.new_name_en;
                    row.izvor_koordinata = `Ispravljena pogrešna oblast prvobitnog skrejpera -> ${better.source}`;
                    coordStats.fixed_wrong_prefecture++;
                } else {
                    row.ime_na_karti_gr = row.new_name_gr;
                    row.ime_na_karti_en = row.new_name_en;
                    row.izvor_koordinata = 'Postojeće (prvobitni skrejper)';
                }
            } else {
                row.ime_na_karti_gr = row.new_name_gr;
                row.ime_na_karti_en = row.new_name_en;
                row.izvor_koordinata = 'Postojeće (prvobitni skrejper)';
            }
        } else {
            coordStats.missing_before++;
            const found = findMissingCoordinates(row);
            if (found) {
                row.latitude = found.lat;
                row.longitude = found.lon;
                row.ime_na_karti_gr = found.map_name_gr;
                row.ime_na_karti_en = found.map_name_en;
                row.izvor_koordinata = found.source;

                if (found.source.startsWith('OSM pronađeno po starom')) coordStats.filled_osm_old_name++;
                else if (found.source.startsWith('Isto mesto')) coordStats.filled_same_pref_table++;
                else if (found.source.startsWith('Koordinate matične')) coordStats.filled_community++;
                else coordStats.filled_osm_new_name++;

                // Odmah registruj novopronadjene koordinate za uvezana preimenovanja i opstine
                const pKey = (row.prefecture || '').trim().toUpperCase();
                for (const lnRaw of [row.name_of_community_or_municipality, row.old_name_en, row.new_name_en].filter(Boolean)) {
                    for (const v of generateDemoticLatinVariants(lnRaw)) {
                        const cKey = `${pKey}::${normalizeLatinNoSpace(v)}`;
                        if (!commCoords.has(cKey)) commCoords.set(cKey, []);
                        commCoords.get(cKey).push({ lat: found.lat, lon: found.lon, name_gr: found.map_name_gr || row.new_name_gr, name_en: found.map_name_en || row.new_name_en });
                    }
                }
                for (const gnRaw of [row.new_name_gr, row.old_name_gr, found.map_name_gr].filter(Boolean)) {
                    for (const v of generateDemoticGreekVariants(gnRaw)) {
                        const nKey = `${pKey}::${normalizeGreekNoSpace(v)}`;
                        if (!existingNewNameCoords.has(nKey)) {
                            existingNewNameCoords.set(nKey, { lat: found.lat, lon: found.lon, name_gr: found.map_name_gr || row.new_name_gr, name_en: found.map_name_en || row.new_name_en });
                        }
                    }
                }
            } else {
                row.ime_na_karti_gr = '';
                row.ime_na_karti_en = '';
                row.izvor_koordinata = 'Nije pronađeno';
                coordStats.still_missing++;
            }
        }

        // Vasmer uparivanje
        const vm = matchVasmerRow(row);
        if (vm) {
            vasmerStats.total_matched++;
            if (vm.match_type.startsWith('Tačno')) vasmerStats.exact++;
            else if (vm.match_type.startsWith('Poklapanje osnove')) vasmerStats.variant++;
            else if (vm.match_type.startsWith('Fonetsko')) vasmerStats.phonetic++;
            else if (vm.match_type.startsWith('Blago izmenjen')) vasmerStats.skeleton_in_region++;
            else vasmerStats.wortregister++;

            const e = vm.entry;
            if (e.slavic_extracted) vasmerStats.with_slavic++;

            row.vasmer_grcki_naziv = e.greek_name || '';
            row.vasmer_slovenski_naziv = e.slavic_extracted || '';
            row.vasmer_oblast = e.region || '';
            row.vasmer_strana_knjige = String(e.book_page || '');
            row.vasmer_strana_i_red = e.citation || '';
            row.vasmer_ocena_porekla = e.origin_assessment || '';
            row.vasmer_tip_poklapanja = vm.match_type;
            row.vasmer_opis = e.full_text || '';

            const isNonSlav = e.origin_assessment && (
                e.origin_assessment.startsWith('Neslovensko') ||
                e.origin_assessment.startsWith('Turski') ||
                e.origin_assessment.startsWith('Grčki') ||
                e.origin_assessment.startsWith('Albanski') ||
                e.origin_assessment.startsWith('Romanski')
            );
            row.predlog_vrste = isNonSlav ? e.origin_assessment : 'Серби / Словенски (Vasmer)';
        } else {
            row.vasmer_grcki_naziv = '';
            row.vasmer_slovenski_naziv = '';
            row.vasmer_oblast = '';
            row.vasmer_strana_knjige = '';
            row.vasmer_strana_i_red = '';
            row.vasmer_ocena_porekla = '';
            row.vasmer_tip_poklapanja = '';
            row.vasmer_opis = '';

            const heur = detectNonVasmerOrigin(row.old_name_gr, row.old_name_alternative);
            row.predlog_vrste = row.vrsta ? `${row.vrsta} (postojeće)` : heur;
        }
    }

    // Drugi prolaz za preostale redove bez koordinata (za slucaj da je povezano mesto bilo nize u tabeli)
    for (const row of rows) {
        if (row.izvor_koordinata === 'Nije pronađeno') {
            const found = findMissingCoordinates(row);
            if (found) {
                row.latitude = found.lat;
                row.longitude = found.lon;
                row.ime_na_karti_gr = found.map_name_gr;
                row.ime_na_karti_en = found.map_name_en;
                row.izvor_koordinata = found.source;
                coordStats.still_missing--;
                if (found.source.startsWith('Isto mesto')) coordStats.filled_same_pref_table++;
                else if (found.source.startsWith('Koordinate matične')) coordStats.filled_community++;
                else coordStats.filled_osm_new_name++;
            }
        }
    }

    // Treci prolaz: Razmicanje duplikata koordinata za ~200m (u krug oko prve tacke)
    // kako se na karti nijedna dva pokazivaca ne bi preklopila na identicnoj tacki,
    // vec da se drugi jasno nazire iza prvog kada se gleda karta!
    const coordSeenCount = new Map();
    let shiftedDuplicatesCount = 0;

    for (const row of rows) {
        const lat = parseFloat(row.latitude);
        const lon = parseFloat(row.longitude);
        if (isNaN(lat) || isNaN(lon)) continue;

        // Zaokruzivanje na 4 decimale (~11m) hvata sve identicne ili prakticno preklopljene tacke
        const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
        const count = coordSeenCount.get(key) || 0;
        coordSeenCount.set(key, count + 1);

        if (count > 0) {
            // Prvi prsten (do 6 duplikata na istom mestu) na 200m, drugi prsten na 350m
            const ring = Math.floor((count - 1) / 6);
            const posInRing = (count - 1) % 6;
            const radiusMeters = ring === 0 ? 200 : 200 + ring * 150;
            // Ugao: krecemo od 45 stepeni (severoistok), pa na svakih 60 stepeni
            const angleRad = ((45 + posInRing * 60) * Math.PI) / 180;

            const dLat = (radiusMeters * Math.sin(angleRad)) / 111132;
            const dLon = (radiusMeters * Math.cos(angleRad)) / (111132 * Math.cos((lat * Math.PI) / 180));

            row.latitude = Number((lat + dLat).toFixed(7));
            row.longitude = Number((lon + dLon).toFixed(7));
            row.izvor_koordinata = `${row.izvor_koordinata} [pomereno +${radiusMeters}m radi prikaza na karti]`;
            shiftedDuplicatesCount++;
        }
    }

    const totalFilled = coordStats.filled_osm_new_name + coordStats.filled_osm_old_name + coordStats.filled_same_pref_table + coordStats.filled_community;
    console.log('\n=== REZULTATI DOPUNE KOORDINATA ===');
    console.log(`Imalo koordinate ranije: ${coordStats.already_had} / ${rows.length}`);
    console.log(`  - Od toga ispravljena pogresna prefektura prvobitnog skrejpera (>100 km): ${coordStats.fixed_wrong_prefecture}`);
    console.log(`Nedostajalo koordinata: ${coordStats.missing_before}`);
    console.log(`USPESNO DOPUNJENO KOORDINATA: ${totalFilled} / ${coordStats.missing_before} (${((totalFilled / coordStats.missing_before) * 100).toFixed(1)}%)`);
    console.log(`  - Po savremenom/Demotiki nazivu na OSM u istoj prefekturi: ${coordStats.filled_osm_new_name}`);
    console.log(`  - Po starom nazivu na OSM u istoj prefekturi: ${coordStats.filled_osm_old_name}`);
    console.log(`  - Isto novo ime u istoj prefekturi iz tabele: ${coordStats.filled_same_pref_table}`);
    console.log(`  - Preko maticne opstine/zajednice u istoj prefekturi: ${coordStats.filled_community}`);
    console.log(`Preostalo bez koordinata: ${coordStats.still_missing}`);
    console.log(`Pomereno duplikata na istoj lokaciji (+200m za kartu): ${shiftedDuplicatesCount}`);
    console.log(`UKUPNO SA KOORDINATAMA SADA: ${coordStats.already_had + totalFilled} / ${rows.length} (${(((coordStats.already_had + totalFilled) / rows.length) * 100).toFixed(2)}%)`);

    console.log('\n=== REZULTATI VASMER UPARIVANJA (SA PROSIRENIM FONETSKIM PRAVILIMA) ===');
    console.log(`Ukupno upareno sa Vasmerom: ${vasmerStats.total_matched}`);
    console.log(`  - Tacno poklapanje: ${vasmerStats.exact}`);
    console.log(`  - Poklapanje osnove/varijante: ${vasmerStats.variant}`);
    console.log(`  - Fonetsko/ortografsko (ukljucujuci τζ/τσ, αι/ε): ${vasmerStats.phonetic}`);
    console.log(`  - Blago izmenjen zapis u istoj oblasti: ${vasmerStats.skeleton_in_region}`);
    console.log(`  - Wortregister indeks: ${vasmerStats.wortregister}`);
    console.log(`  - Sa izvucenim slovenskim nazivom: ${vasmerStats.with_slavic}`);

    // Proveri konkretno korisnikov primer Kato Scholarion (168471)
    const ex = rows.find(r => String(r.source_url).includes('168471'));
    console.log('\n=== PROVERA PRIMERA: Kato Scholarion (168471) ===');
    console.log({
        old_name_gr: ex.old_name_gr,
        new_name_gr: ex.new_name_gr,
        new_name_en: ex.new_name_en,
        ime_na_karti_gr: ex.ime_na_karti_gr,
        ime_na_karti_en: ex.ime_na_karti_en,
        latitude: ex.latitude,
        longitude: ex.longitude,
        izvor_koordinata: ex.izvor_koordinata
    });

    // Sacuvaj novi Excel
    const outWb = xlsx.utils.book_new();
    const outWs = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(outWb, outWs, 'Renamings');
    if (wb.Sheets['Sheet1']) {
        xlsx.utils.book_append_sheet(outWb, wb.Sheets['Sheet1'], 'Sheet1');
    }
    xlsx.writeFile(outWb, OUT_EXCEL);
    console.log(`\nSacuvan kompletan Excel: ${OUT_EXCEL}`);

    // Sacuvaj i osvezeni GeoJSON za kartu
    const features = rows.map(r => {
        const lat = parseFloat(r.latitude);
        const lon = parseFloat(r.longitude);
        return {
            type: 'Feature',
            properties: { ...r },
            geometry: (!isNaN(lat) && !isNaN(lon)) ? {
                type: 'Point',
                coordinates: [lon, lat]
            } : null
        };
    });
    fs.writeFileSync(OUT_GEOJSON, JSON.stringify({ type: 'FeatureCollection', features }, null, 2));
    console.log(`Sacuvan kompletan GeoJSON: ${OUT_GEOJSON}`);
}

main().catch(err => {
    console.error('Greska:', err);
    process.exit(1);
});
