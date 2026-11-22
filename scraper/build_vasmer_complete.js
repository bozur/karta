/**
 * build_vasmer_complete.js
 *
 * Kompleksni parser za knjigu Max Vasmer - "Die Slaven in Griechenland" (1941)
 * iz kompletnog PDF-a (svih 725 PDF strana = 350 strana knjige) + HTML Wortregister-a.
 *
 * Kreira dva izlazna Excel fajla:
 *   1. C:\karta\scraper\vasmer_knjiga_izvuceno.xlsx
 *      - Kompletna tabela svih izvucenih toponima iz Vasmerove knjige (Poglavlje III + registri)
 *        sa grckim nazivom, slovenskim/srpskim nazivom i paralelama, ocenom porekla,
 *        stranom u knjizi, PDF stranom i redom, i izvornim Vasmerovim komentarom.
 *   2. C:\karta\scraper\output2_vasmer.xlsx
 *      - Obogaceni originalni Excel (4413 redova) sa svim postojecim kolonama +
 *        Vasmer kolonama (grcki naziv, slovenski naziv, oblast, tacna strana i red u knjizi i PDF-u,
 *        Vasmerov opis, i predlog vrste promenjenog naziva: Серби/Словенски, Турци, Грци, Арbanasi/Vlaški).
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('./node_modules/cheerio');
const xlsx = require('./node_modules/xlsx');

const PAGES_JSON = path.join(__dirname, 'pdf_pages.json');
const WORTREGISTER_PATH = path.join(__dirname, 'mv_wortregister_gr.htm');
const EXCEL_PATH = path.join(__dirname, 'output2.xlsx');
const OUT_BOOK_EXCEL = path.join(__dirname, 'vasmer_knjiga_izvuceno.xlsx');
const OUT_ENRICHED_EXCEL = path.join(__dirname, 'output2_vasmer.xlsx');
const OUT_ENTRIES_JSON = path.join(__dirname, 'vasmer_entries_complete.json');

// Grcki karakteri
const greekRe = /[\u0370-\u03FF\u1F00-\u1FFF]/;

// Normalizacija grckog naziva (bez dijakritika, mala slova, samo grcka slova)
function normalizeGreek(str) {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ϊ/g, 'ι')
        .replace(/ϋ/g, 'υ')
        .replace(/ς/g, 'σ')
        .toLowerCase()
        .replace(/[^α-ω]/g, '')
        .trim();
}

// Fleksibilna fonetska/ortografska normalizacija grckog za dodatno uparivanje
// (npr. ει/η/υ/οι -> ι, αι -> ε, ω -> ο, ου -> ου, γκ/γγ -> γ, μπ -> μπ, dupli suglasnici -> jedan)
function normalizeGreekPhonetic(str) {
    let s = normalizeGreek(str);
    if (!s) return '';
    s = s
        .replace(/ει/g, 'ι')
        .replace(/οι/g, 'ι')
        .replace(/υι/g, 'ι')
        .replace(/η/g, 'ι')
        .replace(/υ/g, 'ι')
        .replace(/αι/g, 'ε')
        .replace(/ω/g, 'ο')
        .replace(/λλ/g, 'λ')
        .replace(/νν/g, 'ν')
        .replace(/ρρ/g, 'ρ')
        .replace(/σσ/g, 'σ')
        .replace(/ττ/g, 'τ')
        .replace(/κκ/g, 'κ')
        .replace(/ππ/g, 'π')
        .replace(/μμ/g, 'μ');
    return s;
}

// Uklanjanje cestih prefiksa u grckim toponimima (Άνω, Κάτω, Μέγα, Μικρό, Νέον, Παλαιόν...)
function stripGreekPrefixesAndParens(str) {
    if (!str) return [];
    const results = new Set();
    results.add(str.trim());

    // Ukloni zagrade npr. "Άγιος Ιωάννης (Κάτω)" -> "Άγιος Ιωάννης"
    const noParens = str.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    if (noParens) results.add(noParens);

    // Ako postoje zagrade, uzmi i tekst u zagradi ako je alternativi naziv
    const parenMatch = str.match(/\(([^)]+)\)/);
    if (parenMatch && parenMatch[1].length > 3) {
        results.add(parenMatch[1].trim());
    }

    // Ako ima "/" ili "-" ili ","
    for (const part of noParens.split(/[\/,]/)) {
        if (part.trim().length > 2) results.add(part.trim());
    }

    // Ukloni prefikse (Άνω, Κάτω, Μέγας/Μέγα/Μεγάλη/Μεγάλο, Μικρός/Μικρά/Μικρό, Νέος/Νέα/Νέον, Παλαιός/Παλαιά/Παλαιόν, Πέρα, Δώθε)
    const prefixRe = /^(άνω|κάτω|μέγας|μέγα|μεγάλη|μεγάλο|μεγ\.|μικρός|μικρά|μικρόν?|μικρ\.|νέος|νέα|νέον?|παλαιός|παλαιά|παλαιόν?|παληός|παληά|παληό|πέρα|δώθε|μεσαίος|μεσαία|μεσαίον?)\s+/i;
    for (const item of Array.from(results)) {
        const cleanItem = item.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const m = cleanItem.match(prefixRe);
        if (m) {
            const rest = item.slice(m[0].length).trim();
            if (rest.length > 2) results.add(rest);
        }
    }

    return Array.from(results);
}

// Generisanje sufiksnih varijanti grckog imena (-ον/-ο, -ιον/-ι, -α/-αν, -αι/-ες, -οι/-ο)
function getGreekStemVariants(norm) {
    const variants = new Set([norm]);
    if (norm.length <= 3) return Array.from(variants);

    const rules = [
        [/ον$/, 'ο'],
        [/ον$/, ''],
        [/ο$/, 'ον'],
        [/ιον$/, 'ι'],
        [/ι$/, 'ιον'],
        [/αν$/, 'α'],
        [/α$/, 'αν'],
        [/ας$/, 'α'],
        [/α$/, 'ας'],
        [/ης$/, 'η'],
        [/η$/, 'ης'],
        [/ος$/, 'ο'],
        [/ο$/, 'ος'],
        [/αι$/, 'ες'],
        [/ες$/, 'αι'],
        [/οι$/, 'ο'],
        [/εια$/, 'ια'],
        [/ια$/, 'εια'],
        [/εα$/, 'ια'],
    ];

    for (const [re, repl] of rules) {
        if (re.test(norm)) {
            const v = norm.replace(re, repl);
            if (v.length >= 3) variants.add(v);
        }
    }
    return Array.from(variants);
}

// Popravka OCR razmaka unutar slovenskih reci sa specijalnim znakovima (npr. "*Vo blъ" -> "*Vǫblъ" ili "*Do brovica")
function cleanOcrText(text) {
    if (!text) return '';
    return text
        .replace(/\s+/g, ' ')
        // Spoji razmake oko ъ i ь na kraju ili u sredini reci
        .replace(/([a-zA-ZäöüÄÖÜčšžćđČŠŽĆĐěęǫṛḷńŕśź])\s+([ъь])\b/g, '$1$2')
        .replace(/(\*[A-Za-zäöüÄÖÜčšžćđČŠŽĆĐ]{1,4})\s+([a-zäöüčšžćđěęǫъь]{2,})/g, '$1$2')
        .trim();
}

// Izvlacenje slovenskih/srpskih naziva i paralela iz Vasmerovog opisa
function extractSlavicInfo(rawText, wortregSlavicForPage = []) {
    const text = cleanOcrText(rawText);
    const items = [];
    const seen = new Set();

    function addItem(label, val) {
        if (!val) return;
        let clean = val
            .replace(/^[,.;:()\s]+|[,.;:()\s]+$/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (!clean || clean.length < 2) return;
        // Ignorisi nemacke stop-reci i imena autora (Kânčov / Kъnčov / Miklosich / Šišmanov / Hilferding)
        const stopWords = new Set([
            'die', 'der', 'das', 'den', 'dem', 'ein', 'eine', 'einem', 'einen',
            'unserm', 'unserem', 'diesem', 'dieser', 'dieses', 'jenem', 'jener',
            'welchem', 'welcher', 'anderen', 'weiter', 'oben', 'unten', 'hier',
            'dort', 'wohl', 'auch', 'noch', 'schon', 'nicht', 'kaum', 'eher',
            'oder', 'aber', 'sondern', 'wegen', 'nach', 'über', 'unter', 'neben',
            'name', 'namen', 'namenstypus', 'ortsname', 'ortsnamen', 'flußname',
            'bergname', 'beiname', 'sippenname', 'personenname', 'bewohnername',
            'griechenland', 'mazedonien', 'thessalien', 'epirus', 'peloponnes',
            'bedeutung', 'ursprung', 'herkunft', 'quelle', 'gegend', 'belege',
            'kъnčov', 'kъncov', 'kânčov', 'nčov', 'ncov', 'nach kъnčov', 'nach kъncov',
            'miklosich', 'šišmanov', 'hilferding', 'weygand', 'weigand', 'novaković',
            'name könnte', 'könnte', 'heißt', 'heisst', 'lautet', 'bezeichnet',
        ]);
        if (stopWords.has(clean.toLowerCase())) return;
        if (/k[ъâ]n[čc]ov|^n[čc]ov|\bkönnte\b|\bname\b|\bbedeutung\b/i.test(clean)) return;

        const key = clean.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        items.push(label ? `${label}: ${clean}` : clean);
    }

    // 1. Rekonstruisani oblici sa zvezdicom (*...)
    const starRe = /\*([A-ZÄÖÜa-zäöüčšžćđČŠŽĆĐěęǫъьńŕśź\u0300-\u036f\u0400-\u04FF']['a-zA-ZäöüÄÖÜčšžćđČŠŽĆĐěęǫъьńŕśź\u0300-\u036f\u0400-\u04FF\-]{1,30})/g;
    let m;
    while ((m = starRe.exec(text)) !== null) {
        addItem('', '*' + m[1]);
    }

    // 2. Kânčov (makedonski / lokalni slovenski oblik): "bei K. Xxx", "nach K. Xxx", "K. Xxx"
    const kancovRe = /(?:bei\s+K\.|nach\s+K\.|\bK\.)\s*(?:auch\s+|heißt\s+es\s+)?([A-ZÄÖÜČŠŽĆĐ][\p{L}\p{M}ъь'\-]+(?:\s+[A-ZÄÖÜČŠŽĆĐa-zäöüčšžćđ][\p{L}\p{M}ъь'\-]+)?)/gu;
    while ((m = kancovRe.exec(text)) !== null) {
        const candidate = m[1].replace(/\s+(ON|Kr|Bez|vgl|aus|zu|oder|und|in|im|bei|mit|für|von|s\.|Nr)\b.*$/i, '');
        addItem('K.', candidate);
    }

    // 3. Srpsko-hrvatske paralele: "skr. ON Xxx", "skr. Xxx"
    const skrRe = /\bskr\.\s+(?:ON\s+|FlN\s+|BN\s+|PN\s+)?([A-ZÄÖÜČŠŽĆĐa-zäöüčšžćđ][\p{L}\p{M}ъь'\-]+(?:\s+[A-ZÄÖÜČŠŽĆĐa-zäöüčšžćđ][\p{L}\p{M}ъь'\-]+)?)/gu;
    while ((m = skrRe.exec(text)) !== null) {
        const candidate = m[1].replace(/\s+(usw|vgl|und|oder|in|im|bei|aus|zu|s\.|Nr|auch|neben|sowie|bzw)\b.*$/i, '');
        addItem('srp.', candidate);
    }

    // 4. Bugarske paralele: "bulg. ON Xxx", "bulg. Xxx", "nbulg. Xxx"
    const bulgRe = /\bn?bulg\.\s+(?:ON\s+|FlN\s+|BN\s+|PN\s+)?([A-ZÄÖÜČŠŽĆĐa-zäöüčšžćđ\u0400-\u04FF][\p{L}\p{M}ъь'\-]+(?:\s+[A-ZÄÖÜČŠŽĆĐa-zäöüčšžćđ\u0400-\u04FF][\p{L}\p{M}ъь'\-]+)?)/gu;
    while ((m = bulgRe.exec(text)) !== null) {
        const candidate = m[1].replace(/\s+(usw|vgl|und|oder|in|im|bei|aus|zu|s\.|Nr|auch|neben|sowie|bzw)\b.*$/i, '');
        addItem('bug.', candidate);
    }

    // 5. Staroslovenski / crkvenoslovenski / praslovenski: "altslav. Xxx", "abg. Xxx", "kslav. Xxx", "slav. Xxx"
    const slavRe = /\b(?:altslav\.|urslav\.|abg\.|kslav\.|slav\.)\s+(?:ON\s+|PN\s+)?\*?([A-ZÄÖÜČŠŽĆĐa-zäöüčšžćđ\u0400-\u04FF][\p{L}\p{M}ъь'\-]{2,25})/gu;
    while ((m = slavRe.exec(text)) !== null) {
        const candidate = m[1].replace(/\s+(usw|vgl|und|oder|in|im|bei|aus|zu|s\.|Nr|auch|neben|sowie|bzw)\b.*$/i, '');
        addItem('slov.', candidate);
    }

    // 6. "aus Xxx" / "zu Xxx" kada nema zvezdice ali ima slovo ъ, ь, č, š, ž, ě, ę, ǫ
    const specialSlavRe = /\b([A-Za-zčšžćđČŠŽĆĐěęǫъь]*[čšžćđČŠŽĆĐěęǫъь][A-Za-zčšžćđČŠŽĆĐěęǫъь'\-]{1,25})\b/g;
    while ((m = specialSlavRe.exec(text)) !== null) {
        addItem('', m[1]);
    }

    // 7. Ako je u tekstu referenca "s. o. S. XX Nr. YY" ili "wie Nr. YY" ili "s. Nr. YY"
    // to cemo dodatno razresiti kasnije, ali zabelezimo ako nema nista drugo

    return items.join(' | ');
}

// Ocena da li Vasmer smatra naziv slovenskim ili ga odbacuje (turski, grcki, albanski, romanski)
function assessVasmerOrigin(text) {
    const t = text.toLowerCase();

    // Eksplicitno odbacivanje slovenskog porekla
    const rejectSlavic = /\b(nicht\s+slavisch|unslavisch|kaum\s+slavisch|nicht\s+zu\s+slav|hat\s+nichts\s+mit\s+slav|fern\s+zuhalten|fernzuhalten|abzulehnen\s+ist\s+slav)\b/i.test(text);

    if (rejectSlavic || (/^(?:nicht|kaum)\b/i.test(text) && !/\bslav\./i.test(text))) {
        if (/\btürk\b|\btürkisch/i.test(text)) return 'Neslovensko po Vasmeru (Turski)';
        if (/\balb\.|\balbanisch/i.test(text)) return 'Neslovensko po Vasmeru (Albanski)';
        if (/\bgriech\.|\bgriechisch|\bngriech\.|\bmgriech\.|\bagriech\./i.test(text)) return 'Neslovensko po Vasmeru (Grčki)';
        if (/\brom\.|\bromanisch|\bital\.|\bvulgärlat\.|\barum\./i.test(text)) return 'Neslovensko po Vasmeru (Romanski/Vlaški)';
        return 'Neslovensko / osporeno po Vasmeru';
    }

    // Direktno kaze "Aus türk. ..." ili "Aus griech. ..." ili "Aus alb. ..." bez slovenske etimologije
    const hasSlavEtym = /(\*[\p{L}]|\bslav|\baltslav|\babg\.|\bkslav\.|\bskr\.|\bbulg|\bruss\.|\bčech\.|\bpoln\.|\bsloven\.)/iu.test(text);
    if (!hasSlavEtym) {
        if (/\b(?:aus|zu|wohl\s+türk|türkisch|türk\.)\b/i.test(text)) return 'Turski (u Vasmeru)';
        if (/\b(?:aus\s+griech|griechisch|ngriech\.|mgriech\.)\b/i.test(text)) return 'Grčki (u Vasmeru)';
        if (/\b(?:aus\s+alb|albanisch|alb\.)\b/i.test(text)) return 'Albanski (u Vasmeru)';
        if (/\b(?:romanisch|ital\.|arumän|vlach)\b/i.test(text)) return 'Romanski/Vlaški (u Vasmeru)';
    }

    if (/\b(unsicher|zweifelhaft|unklar|dunkel)\b/i.test(text) && !hasSlavEtym) {
        return 'Neizvesno (u Vasmeru)';
    }

    return 'Slovenski (Vasmer)';
}

// Heuristika za turske i grcke nazive za one redove iz output2.xlsx kojih NEMA u Vasmeru
function detectNonVasmerOrigin(oldNameGr, oldNameAlt, newNameGr) {
    const combined = `${oldNameGr || ''} ${oldNameAlt || ''}`.trim();
    const norm = normalizeGreek(combined);
    if (!norm) return '';

    // Tipicni turski toponimski elementi u grckoj transkripciji:
    // -κιοϊ / -κιοι (köy = selo), -λαρ / -λερ (množina -lar/-ler), -ντερε (dere = reka/dolina),
    // -τεπε (tepe = brdo), -μαχαλε / -μαχαλα (mahalle = mahala), -οβα / -οβασι (ova = polje),
    // -τσιφλικ (çiftlik = čifluk), -καγια (kaya = stena), -μπουνναρ / -πουνναρ (pınar = izvor),
    // -χισαρ (hisar = tvrđava), -καλε (kale = kula), -παζαρ (pazar), -μπαγ (bağ), -τζαμι (cami),
    // prefiksi: καρα- (kara = crni), ακ- (ak = beli), κιζιλ- (kızıl = crveni), γενι- / γιαννι- (yeni = novi),
    // εσκι- (eski = stari), μπουγιουκ- (büyük = veliki), κουτσουκ- (küçük = mali), χατζη- (hacı), μπεη- (bey), πασα- (paşa), σουλταν-
    const turkishPatterns = [
        /κιοι/, /κιου/, /λαρ$/, /λερ$/, /ντερε/, /τεπε/, /μαχαλ/, /τσιφλικ/, /τζιφλικ/,
        /καγια/, /μπουν/, /πουνναρ/, /χισαρ/, /καλε/, /παζαρ/, /τζαμι/, /σεραι/,
        /οβασι/, /αγα/, /μπεη/, /μπαση/, /πασα/, /χατζη/, /χασαν/, /χουσειν/, /μουσταφα/,
        /μεχμετ/, /αχμετ/, /αλι/, /ισμαιλ/, /σουλειμαν/, /οσμαν/, /ιμπραημ/, /μπαιραμ/,
        /^καρα/, /^ακ/, /^κιζιλ/, /^γενι/, /^εσκι/, /^μπουγιουκ/, /^κουτσουκ/, /^σαρι/, /^.τσαλ/,
        /νταγ/, /τσαιρ/, /μπαξ/, /κισλα/, /κοννακ/, /κονακ/, /χαν$/, /χανι/, /κουλε/, /oglou/, /ογλου/
    ];

    for (const pat of turkishPatterns) {
        if (pat.test(norm)) {
            return 'Турци (turska osnova/sufiks)';
        }
    }

    // Ako stari naziv pocinje sa Άγιος / Αγία / Άγιοι ili ima tipicne grcke crkvene/geografske oblike
    if (/^(αγιοσ|αγια|αγιοι|παναγια|προφητησ|μονη)/.test(norm)) {
        return 'Грци (grčki naziv)';
    }

    return '';
}

// Mapiranje prefekture iz Excel-a na Vasmerove oblasti (radi razresavanja homonima poput Καμενίτσα, Γορίτσα, Γαρδίκι)
function matchRegionToPrefecture(vasmerRegion, prefecture, province) {
    if (!vasmerRegion) return false;
    const vr = vasmerRegion.toLowerCase();
    const pref = normalizeGreek(`${prefecture || ''} ${province || ''}`);

    const map = [
        ['joannina', ['ιωαννινων', 'ηπειρ', 'δωδωνη', 'κονιτσ', 'πogon']],
        ['arta', ['αρτησ', 'αρτα', 'ηπειρ']],
        ['preveza', ['πρεβεζ', 'ηπειρ', 'μαργαριτ', 'παραμυθ', 'θεσπρωτ']],
        ['akarnanien', ['αιτωλ', 'ακαρναν', 'μεσολογγ', 'βονιτσ', 'ναυπακτ', 'τριχων', 'βαλτ']],
        ['ionische', ['κερκυρ', 'λευκαδ', 'κεφαλλην', 'ζακυνθ']],
        ['eurytanien', ['ευρυταν', 'αιτωλ']],
        ['thessalien', ['τρικαλ', 'λαρισ', 'καρδιτσ', 'μαγνησ', 'βολ', 'φαρσαλ', 'καλαμπακ', 'ελασσον', 'αγια', 'αλμυρ']],
        ['euboia', ['ευβοια', 'χαλκιδ', 'καρυστ', 'ιστιαι']],
        ['andros', ['ανδρ', 'κυκλαδ']],
        ['tenos', ['την', 'κυκλαδ']],
        ['skyros', ['σκυρ', 'ευβοια']],
        ['phokis', ['φωκιδ', 'φθιωτ', 'παρνασσ', 'δωριδ', 'λοκριδ']],
        ['boeotien', ['βοιωτ', 'θηβ', 'λειβαδ', 'αττικ']],
        ['attika', ['αττικ', 'αθην', 'μεγαρ']],
        ['aigina', ['αιγιν', 'αττικ']],
        ['korinth', ['κορινθ']],
        ['argolis', ['αργολ', 'ναυπλ', 'αργ']],
        ['achaia', ['αχαια', 'πατρ', 'αιγιαλ', 'καλαβρυτ']],
        ['elis', ['ηλεια', 'ηλει', 'πυργ', 'ολυμπ']],
        ['triphylien', ['τριφυλ', 'μεσσην', 'ηλεια', 'ολυμπ']],
        ['arkadien', ['αρκαδ', 'γορτυν', 'μαντιν', 'κυνουρ', 'μεγαλοπολ']],
        ['messenien', ['μεσσην', 'καλαμ', 'πυλ', 'μεσσην']],
        ['lakonien', ['λακων', 'σπαρτ', 'γυθει', 'επιδαυρ', 'οιτυλ']],
        ['kreta', ['κρητ', 'χανι', 'ρεθυμν', 'ηρακλει', 'λασιθ']],
        ['kozani', ['κοζαν', 'γρεβεν', 'βοιο', 'εορδαι', 'καστορ']],
        ['florina', ['φλωριν', 'καστορ']],
        ['pella', ['πελλ', 'εδεσσ', 'αλμωπ', 'γιαννιτσ']],
        ['thessalonike', ['θεσσαλονικ', 'χαλκιδικ', 'κιλκισ', 'ημαθ', 'βεροι', 'πιερ', 'κατεριν', 'λαγκαδ', 'παιον']],
        ['serrai', ['σερρ', 'σιδιροκαστρ', 'βισαλτ', 'φυλλιδ']],
        ['drama', ['δραμ', 'καβαλ', 'ξανθ']],
        ['thrakische inseln', ['θασ', 'σαμοθρακ', 'καβαλ', 'εβρ']],
        ['thrakien', ['ροδοπ', 'εβρ', 'ξανθ', 'κομοτην', 'αλεξανδρουπολ', 'διδυμοτειχ']],
    ];

    for (const [key, grList] of map) {
        if (vr.includes(key)) {
            return grList.some(g => pref.includes(g));
        }
    }
    return false;
}

async function main() {
    console.log('=== 1. Ucitavanje svih 725 PDF strana iz pdf_pages.json ===');
    const pages = JSON.parse(fs.readFileSync(PAGES_JSON, 'utf8'));
    console.log(`Ucitano PDF strana: ${pages.length}`);

    // Prvo izracunaj mapiranje PDF strane -> strana u originalnoj knjizi (1-350)
    // U PDF-u svaka strana knjige ima svoj broj na posebnoj liniji (ili na dnu/vrhu)
    const pdfToBookPage = new Map();
    let lastKnownBookPage = 1;

    for (const p of pages) {
        const lines = p.text.split('\n').map(l => l.trim()).filter(Boolean);
        let foundPage = null;

        // Ocekivana strana knjige je priblizno Math.round((p.num - 11) / 2)
        // Ali proverimo eksplicitne brojeve na pocetku ili kraju strane
        for (const l of lines) {
            if (/^\d{1,3}$/.test(l)) {
                const n = parseInt(l, 10);
                // U Poglavlju III (PDF 39..489) brojevi ulaza imaju tacku "12.", a broj strane NEMA tacku!
                if (n >= 1 && n <= 350 && Math.abs(n - lastKnownBookPage) <= 5) {
                    foundPage = n;
                }
            }
        }
        if (foundPage !== null) {
            lastKnownBookPage = foundPage;
        }
        pdfToBookPage.set(p.num, lastKnownBookPage);
    }

    // === 2. Parsiranje Wortregister I (Grcki indeks iz HTML-a) ===
    console.log('\n=== 2. Parsiranje Wortregister I (Grcki indeks) ===');
    const wrBuf = fs.readFileSync(WORTREGISTER_PATH);
    const wrHtml = wrBuf.toString('utf16le');
    const $ = cheerio.load(wrHtml);

    const wortregGrMap = new Map(); // norm -> array of { name_orig, pages, pageNums }
    let wrCount = 0;
    $('p').each((i, el) => {
        const txt = $(el).text().trim().replace(/\s+/g, ' ');
        const m = txt.match(/^([\p{L}\p{M}\s\-'ʹ\(\)\/\.]+?)\s+((?:[0-9]|I|V|X|f)[0-9\.\s,f\-]+(?:\s+ff\.)?)$/u);
        if (m) {
            const name = m[1].trim();
            const pagesStr = m[2].trim();
            const pageNums = (pagesStr.match(/\d+/g) || []).map(Number);
            const norm = normalizeGreek(name);
            if (norm) {
                if (!wortregGrMap.has(norm)) wortregGrMap.set(norm, []);
                wortregGrMap.get(norm).push({ name_orig: name, pages: pagesStr, pageNums });
                wrCount++;
            }
        }
    });
    console.log(`Izvuceno iz Wortregister I (Grcki): ${wrCount} odrednica (${wortregGrMap.size} unikatnih normalizovanih).`);

    // === 3. Parsiranje Wortregister II (Slovenski indeks, PDF str. 695-721) ===
    console.log('\n=== 3. Parsiranje Wortregister II (Slovenski indeks, PDF str. 695-721) ===');
    const bookPageToSlavicReg = new Map(); // book_page -> Set of slavic words
    for (const p of pages) {
        if (p.num < 695 || p.num > 721) continue;
        const lines = p.text.split('\n');
        for (const rawLine of lines) {
            const line = cleanOcrText(rawLine.trim());
            if (!line || /^\d{1,3}$/.test(line) || /Wortregister/i.test(line)) continue;
            // Format u registru: "baba 30, 88, 180." ili "*bělъ 45, 192."
            const m = line.match(/^(\*?[\p{L}\p{M}ъь'\-\s\(\)\/]+?)\s+(\d[\d\s,\.f\-]*)$/u);
            if (m) {
                const slavWord = m[1].trim();
                const pgNums = (m[2].match(/\d+/g) || []).map(Number);
                for (const pg of pgNums) {
                    if (pg >= 20 && pg <= 234) {
                        if (!bookPageToSlavicReg.has(pg)) bookPageToSlavicReg.set(pg, new Set());
                        bookPageToSlavicReg.get(pg).add(slavWord);
                    }
                }
            }
        }
    }
    console.log(`Indeksirane knjiske strane u Wortregister II (Slovenski): ${bookPageToSlavicReg.size} strana.`);

    // === 4. Parsiranje SVIH opisnih unosa u Poglavlju III (PDF str. 39-489, Knjiga str. 20-234) ===
    console.log('\n=== 4. Parsiranje Poglavlja III (PDF str. 39-489, Knjiga str. 20-234) ===');

    const regionPatterns = [
        { re: /\ba[\)\.]\s*Gebiet von Joannina/i, name: '1a. Epirus (Joannina)' },
        { re: /\bb[\)\.]\s*Gebiet von Arta/i, name: '1b. Epirus (Arta)' },
        { re: /\bc[\)\.]\s*Gebiet von Preveza/i, name: '1c. Epirus (Preveza)' },
        { re: /\b2\.\s*Akarnanien/i, name: '2. Akarnanien-Ätolien' },
        { re: /\b3\.\s*Ionische Inseln/i, name: '3a. Ionische Inseln (Korfu)' },
        { re: /\ba\)\s*[KК]erkyra/i, name: '3a. Ionische Inseln (Korfu)' },
        { re: /\bb\)\s*Leukas/i, name: '3b. Ionische Inseln (Leukas)' },
        { re: /\bc\)\s*Kephallenia/i, name: '3c. Ionische Inseln (Kephallenia)' },
        { re: /\bd\)\s*Ithaka/i, name: '3d. Ionische Inseln (Ithaka)' },
        { re: /\be\)\s*Zakynthos/i, name: '3e. Ionische Inseln (Zakynthos)' },
        { re: /\b4\.\s*Eurytanien/i, name: '4. Eurytanien' },
        { re: /\b5\.\s*Thessalien/i, name: '5a. Thessalien (Trikkala-Karditsa)' },
        { re: /\ba\)\s*Gebiet von Trikkala/i, name: '5a. Thessalien (Trikkala-Karditsa)' },
        { re: /\bb\)\s*Gebiet von Larissa/i, name: '5b. Thessalien (Larissa)' },
        { re: /\bc\)\s*Phthiotis/i, name: '5c. Thessalien (Phthiotis)' },
        { re: /\bd\)\s*Magnesia/i, name: '5d. Thessalien (Magnesia)' },
        { re: /\b6\.\s*Euboia/i, name: '6. Euboia' },
        { re: /\b7\.\s*Insel Andros/i, name: '7. Insel Andros' },
        { re: /\b8\.\s*Insel Tenos/i, name: '8. Insel Tenos' },
        { re: /\b9\.\s*Insel Skyros/i, name: '9. Insel Skyros' },
        { re: /\b10\.\s*Phokis/i, name: '10. Phokis' },
        { re: /\b11\.\s*B(?:ö|oe)otien/i, name: '11. Böotien' },
        { re: /\b12\.\s*Attika/i, name: '12. Attika' },
        { re: /\b13\.\s*Insel Aigina/i, name: '13. Insel Aigina' },
        { re: /\b14\.\s*Korinth/i, name: '14. Korinth' },
        { re: /\b15\.\s*Argolis/i, name: '15. Argolis' },
        { re: /\b16\.\s*Achaia/i, name: '16. Achaia' },
        { re: /\b17\.\s*Elis/i, name: '17. Elis' },
        { re: /\b18\.\s*Triphylien/i, name: '18. Triphylien' },
        { re: /\b19\.\s*Arkadien/i, name: '19. Arkadien' },
        { re: /\b20\.\s*Messenien/i, name: '20. Messenien' },
        { re: /\b21\.\s*Lakonien/i, name: '21. Lakonien' },
        { re: /\b22\.\s*Kreta/i, name: '22. Kreta' },
        { re: /\ba\)\s*Gebiet von Kozani/i, name: '23a. Mazedonien (Kozani)' },
        { re: /\bb\)\s*Gebiet von Florina/i, name: '23b. Mazedonien (Florina)' },
        { re: /\bc\)\s*Gebiet von Pella/i, name: '23c. Mazedonien (Pella)' },
        { re: /\bd\)\s*Gebiet von Thessalonike/i, name: '23d. Mazedonien (Thessalonike & Chalkidike)' },
        { re: /\be\)\s*Gebiet von Serr(?:at|es|ai)/i, name: '23e. Mazedonien (Serres)' },
        { re: /\bf\)\s*Gebiet von Drama/i, name: '23f. Mazedonien (Drama & Kavalla)' },
        { re: /\b24\.\s*Thrakische Inseln/i, name: '24a. Thrakische Inseln (Thasos)' },
        { re: /\ba\)\s*Thasos/i, name: '24a. Thrakische Inseln (Thasos)' },
        { re: /\bb\)\s*Samothrake/i, name: '24b. Thrakische Inseln (Samothrake)' },
        { re: /\b25\.\s*Thrakien/i, name: '25a. Thrakien (Xanthe)' },
        { re: /\ba\)\s*Gebiet von Xanthe/i, name: '25a. Thrakien (Xanthe)' },
        { re: /\bb\)\s*Gebiet von Ainos/i, name: '25b. Thrakien (Ainos/Marica)' },
        { re: /\bc\)\s*Gebiet von Adrianopel/i, name: '25c. Thrakien (Adrianopel)' },
        { re: /\bd\)\s*Gebiet von Saranda/i, name: '25d. Thrakien (Saranda Ekklesiai)' },
        { re: /\be\)\s*Gebiet von Rhaidestos/i, name: '25e. Thrakien (Rhaidestos)' },
        { re: /\bf\)\s*Gebiet von Kallipolis/i, name: '25f. Thrakien (Kallipolis)' },
    ];

    const rawEntries = [];
    let currentRegion = '1a. Epirus (Joannina)';
    let currentBookPage = 20;
    let currentEntry = null;

    // Linija koja pocinje brojem odrednice i grckim slovom: npr. "1. Ἀρμένσκον ON..." ili "142. ἡ Βελίτσα..."
    const entryStartRe = /^(\d{1,3})\.\s+(?:(?:ὁ|ἡ|τὸ|οἱ|αἱ|τὰ|τοῦ|τῆς|τῶν)\s+)?([\p{L}\p{M}'ʹ’ʼ\-]+.*)$/u;

    for (const p of pages) {
        if (p.num < 39 || p.num > 489) continue;

        const pageLines = p.text.split('\n');
        for (let lineIdx = 0; lineIdx < pageLines.length; lineIdx++) {
            const trimmed = pageLines[lineIdx].trim();
            if (!trimmed) continue;

            // Provera da li je linija broj strane u knjizi (20..234)
            if (/^\d{2,3}$/.test(trimmed)) {
                const pgNum = parseInt(trimmed, 10);
                if (pgNum >= 20 && pgNum <= 234 && Math.abs(pgNum - currentBookPage) <= 3) {
                    currentBookPage = pgNum;
                    continue;
                }
            }

            // Provera promene regiona
            for (const rp of regionPatterns) {
                if (rp.re.test(trimmed)) {
                    currentRegion = rp.name;
                }
            }

            // Ako smo usli u Nachträge / Kapitel IV na str. 489, prekini
            if (/^Kapitel\s+IV\b/i.test(trimmed)) {
                break;
            }

            // Provera pocetka numerisane odrednice
            const m = trimmed.match(entryStartRe);
            if (m) {
                const entryNum = parseInt(m[1], 10);
                const restLine = m[2].trim();
                const firstWord = restLine.split(/[\s,\.;:\(\)\[\]]+/)[0];

                if (greekRe.test(firstWord)) {
                    // Proveri da li ova linija izgleda kao multi-kolonska TOC lista (npr. "1. Ἀρμένσκον 2. Βαμπέλι")
                    const hasMultipleNumbered = /\b\d{1,3}\.\s+[\u0370-\u03FF\u1F00-\u1FFF]/.test(restLine);
                    if (hasMultipleNumbered) {
                        // Ovo je linija iz kratkog pregleda na pocetku poglavlja, preskoci je!
                        continue;
                    }

                    if (currentEntry) {
                        rawEntries.push(currentEntry);
                    }

                    currentEntry = {
                        region: currentRegion,
                        num: entryNum,
                        greek_name: firstWord.replace(/^[,.;:()]+|[,.;:()]+$/g, ''),
                        greek_header: restLine,
                        book_page: currentBookPage,
                        pdf_page: p.num,
                        pdf_line: lineIdx + 1,
                        lines: [trimmed],
                    };
                    continue;
                }
            }

            // Nastavak teksta tekuce odrednice
            if (currentEntry) {
                // Ne dodaj ako je linija iz TOC tabele (samo broj + grcka rec bez nemackog teksta)
                if (/^\d{1,3}\.\s+[\u0370-\u03FF\u1F00-\u1FFF\s]+$/.test(trimmed)) {
                    continue;
                }
                currentEntry.lines.push(trimmed);
            }
        }
    }
    if (currentEntry) rawEntries.push(currentEntry);

    console.log(`Ukupno sirovih numerisanih blokova u Poglavlju III: ${rawEntries.length}`);

    // Filtriranje TOC stavki:
    // U svakom poglavlju (region) brojevi 1..N se prvo pojavljuju kao kratka lista (samo grcko ime),
    // a zatim ponovo 1..N sa punim opisom!
    // Zato za svaki par (region, num) cuvamo onaj unos koji ima opisni tekst (ili duzi tekst).
    const regionNumMap = new Map();
    for (const e of rawEntries) {
        e.full_text = cleanOcrText(e.lines.join(' '));
        const key = `${e.region}::${e.num}::${normalizeGreek(e.greek_name)}`;
        if (!regionNumMap.has(key)) {
            regionNumMap.set(key, e);
        } else {
            const prev = regionNumMap.get(key);
            // Uvek uzmi duzi/opisni unos (drugo pojavljivanje u poglavlju je opisna sekcija)
            if (e.full_text.length >= prev.full_text.length) {
                regionNumMap.set(key, e);
            }
        }
    }

    // Dodatno odbaci sve sto je ostalo kao samo "12. Γορίτσα" bez ikakvog opisa (duzina < 18 i bez latinskih slova)
    const descriptiveEntries = Array.from(regionNumMap.values()).filter(e => {
        const latinChars = (e.full_text.match(/[a-zA-ZäöüÄÖÜ]/g) || []).length;
        return latinChars >= 3 && e.full_text.length > 15;
    });

    console.log(`Cistih opisnih odrednica u Poglavlju III (bez TOC duplikata): ${descriptiveEntries.length}`);

    // Izvuci alternativne grcke nazive iz zaglavlja unosa (npr. "1. Ἀρμένσκον ON..., auch Ἀρμένισκα")
    // i izvuci slovenske rekonstrukcije + resi unakrsne reference ("s. Nr. X", "wie Nr. X")
    const byRegionAndNum = new Map();
    for (const e of descriptiveEntries) {
        byRegionAndNum.set(`${e.region}::${e.num}`, e);
    }

    for (const e of descriptiveEntries) {
        // Izvuci samo prave sinonime iz samog zaglavlja odrednice PRE opisa ("ON", "Kr.", "Bez.", "Dorf", "Ort", "Berg", "Fluß", "Vgl.")
        // npr. "1. Βαρυμπόπη oder Βαρυπόμπη ON..." -> ["Βαρυμπόπη", "Βαρυπόμπη"]
        const headerBeforeDesc = e.full_text.split(/\b(?:ON|FlN|BN|Kr\.|Bez\.|Dorf|Ort|Örtlichkeit|Berg|Fluß|Bach|Gegend|Landschaft|Vgl\.|Nach|Aus|Zu|Wohl|S\.|s\.)\b/)[0] || e.greek_name;
        const grTokens = [];
        const grTokenRe = /[\u0370-\u03FF\u1F00-\u1FFF][\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036f'ʹ’ʼ\-]{1,}/g;
        let gm;
        const stopGr = new Set(['ον', 'η', 'ο', 'το', 'οι', 'αι', 'τα', 'του', 'της', 'των', 'καί', 'και', 'ή', 'ανω', 'κατω']);
        while ((gm = grTokenRe.exec(headerBeforeDesc)) !== null) {
            const w = gm[0].replace(/^['ʹ’ʼ\-]+|['ʹ’ʼ\-]+$/g, '');
            const nw = normalizeGreek(w);
            if (nw.length >= 3 && !stopGr.has(nw)) {
                grTokens.push(w);
            }
        }
        e.greek_variants = Array.from(new Set([e.greek_name, ...grTokens]));
        e.greek_name_norm = normalizeGreek(e.greek_name);

        // Proveri Wortregister I za tacnu stranu u knjizi ako postoji
        const wrHits = wortregGrMap.get(e.greek_name_norm) || [];
        if (wrHits.length > 0) {
            // Ako neka od strana u Wortregisteru odgovara priblizno currentBookPage, uzmi je
            const closePage = wrHits
                .flatMap(h => h.pageNums)
                .find(p => Math.abs(p - e.book_page) <= 4);
            if (closePage) {
                e.book_page = closePage;
            }
            e.wortregister_pages = wrHits.map(h => h.pages).join('; ');
        } else {
            e.wortregister_pages = `${e.book_page}`;
        }

        // Slovenske reci sa te strane iz Wortregister II
        const wrSlav = bookPageToSlavicReg.get(e.book_page)
            ? Array.from(bookPageToSlavicReg.get(e.book_page))
            : [];

        e.slavic_extracted = extractSlavicInfo(e.full_text, wrSlav);
        e.origin_assessment = assessVasmerOrigin(e.full_text);
        e.citation = `Knjiga str. ${e.book_page}, br. ${e.num} (PDF str. ${e.pdf_page}, red ${e.pdf_line})`;
    }

    // Drugi prolaz: ako unos kaze "s. Nr. 45" ili "wie Nr. 12" u istom regionu, a nema svoj slavic_extracted, preuzmi iz referenciranog broja
    for (const e of descriptiveEntries) {
        if (!e.slavic_extracted) {
            const refMatch = e.full_text.match(/\b(?:s\.|wie|vgl\.)\s*(?:o\.\s*)?Nr\.\s*(\d{1,3})\b/i);
            if (refMatch) {
                const refNum = parseInt(refMatch[1], 10);
                const target = byRegionAndNum.get(`${e.region}::${refNum}`);
                if (target && target.slavic_extracted) {
                    e.slavic_extracted = `${target.slavic_extracted} (v. br. ${refNum})`;
                }
            }
        }
    }

    const withSlavicCount = descriptiveEntries.filter(e => e.slavic_extracted).length;
    console.log(`Odrednica sa izvucenom slovenskom rekonstrukcijom/paralelom: ${withSlavicCount} / ${descriptiveEntries.length}`);

    // Sacuvaj kompletan JSON
    fs.writeFileSync(OUT_ENTRIES_JSON, JSON.stringify(descriptiveEntries, null, 2));

    // === 5. Kreiranje Deliverable 1: vasmer_knjiga_izvuceno.xlsx ===
    console.log(`\n=== 5. Kreiranje tabele iz knjige: ${OUT_BOOK_EXCEL} ===`);
    const bookRows = descriptiveEntries.map((e, idx) => ({
        'R.br.': idx + 1,
        'Oblast (Poglavlje III)': e.region,
        'Br. u oblasti': e.num,
        'Naziv na grčkom (Vasmer)': e.greek_name,
        'Varijante u tekstu': e.greek_variants.slice(1).join(', '),
        'Naziv na srpskom / slovenskom (rekonstrukcija i paralele)': e.slavic_extracted,
        'Ocena porekla (Vasmer)': e.origin_assessment,
        'Strana u knjizi': e.book_page,
        'Strane u registru': e.wortregister_pages,
        'PDF strana i red': `PDF str. ${e.pdf_page}, red ${e.pdf_line}`,
        'Kompletna citacija': e.citation,
        'Izvorni tekst (Vasmer)': e.full_text,
    }));

    const bookWb = xlsx.utils.book_new();
    const bookWs = xlsx.utils.json_to_sheet(bookRows);
    xlsx.utils.book_append_sheet(bookWb, bookWs, 'Vasmer Toponimi (Poglavlje III)');

    // Dodaj i kompletan Wortregister I (Grcki indeks) kao drugi list
    const wrSheetRows = [];
    let wrIdx = 1;
    for (const [norm, arr] of wortregGrMap.entries()) {
        for (const item of arr) {
            wrSheetRows.push({
                'R.br.': wrIdx++,
                'Naziv na grčkom (Wortregister I)': item.name_orig,
                'Normalizovano': norm,
                'Strane u knjizi': item.pages,
            });
        }
    }
    const wrWs = xlsx.utils.json_to_sheet(wrSheetRows);
    xlsx.utils.book_append_sheet(bookWb, wrWs, 'Wortregister I (Grcki indeks)');

    xlsx.writeFile(bookWb, OUT_BOOK_EXCEL);
    console.log(`Sacuvano ${bookRows.length} opisnih toponima i ${wrSheetRows.length} indeksnih odrednica u ${OUT_BOOK_EXCEL}`);

    // === 6. Kreiranje indeksa za uparivanje sa output2.xlsx ===
    console.log('\n=== 6. Indeksiranje Vasmer baze za uparivanje sa output2.xlsx ===');

    // Cuvamo NIZ odrednica po normalizovanom imenu (jer npr. Καμενίτσα ili Γορίτσα postoji u vise oblasti!)
    const normToEntries = new Map();
    const phoneticToEntries = new Map();

    function addEntryToIndex(map, key, entry) {
        if (!key || key.length < 2) return;
        if (!map.has(key)) map.set(key, []);
        const arr = map.get(key);
        if (!arr.includes(entry)) arr.push(entry);
    }

    for (const e of descriptiveEntries) {
        // Indeksiraj primarno grcko ime i sve grcke varijante iz zaglavlja
        const allGr = [e.greek_name, ...(e.greek_variants || []).slice(0, 3)];
        for (const g of allGr) {
            const n = normalizeGreek(g);
            for (const v of getGreekStemVariants(n)) {
                addEntryToIndex(normToEntries, v, e);
            }
            const ph = normalizeGreekPhonetic(g);
            if (ph) addEntryToIndex(phoneticToEntries, ph, e);
        }
    }

    // Ako se neko grcko ime pojavljuje u vise oblasti, izaberi najbolju odrednicu prema prefekturi/provinciji iz Excela
    function selectBestEntry(candidates, row) {
        if (!candidates || candidates.length === 0) return null;
        if (candidates.length === 1) return candidates[0];

        // 1. Pokusaj poklapanje oblasti sa prefecture / province iz Excela
        for (const c of candidates) {
            if (matchRegionToPrefecture(c.region, row.prefecture, row.province)) {
                return c;
            }
        }
        // 2. Ako nema direktne oblasti, uzmi onu koja ima izvucen slovenski naziv i najduzi opis
        const withSlav = candidates.filter(c => c.slavic_extracted);
        if (withSlav.length > 0) {
            return withSlav.sort((a, b) => b.full_text.length - a.full_text.length)[0];
        }
        return candidates[0];
    }

    function matchExcelRow(row) {
        const rawCandidates = [
            row.old_name_gr,
            row.old_name_alternative,
        ].filter(Boolean);

        // Prosiri kandidate uklanjanjem prefiksa (Άνω/Κάτω/Μέγα/Μικρό...) i zagrada
        const expandedStrings = [];
        for (const rc of rawCandidates) {
            for (const exp of stripGreekPrefixesAndParens(rc)) {
                if (!expandedStrings.includes(exp)) expandedStrings.push(exp);
            }
        }

        // 1. Direktno normalizovano poklapanje u Poglavlju III
        for (let i = 0; i < expandedStrings.length; i++) {
            const str = expandedStrings[i];
            const norm = normalizeGreek(str);
            if (!norm || norm.length < 2) continue;

            if (normToEntries.has(norm)) {
                const chosen = selectBestEntry(normToEntries.get(norm), row);
                return {
                    match_type: i === 0 ? 'Tačno poklapanje (Poglavlje III)' : 'Poklapanje osnove/varijante (Poglavlje III)',
                    entry: chosen,
                };
            }
        }

        // 2. Fonetsko poklapanje u Poglavlju III (npr. ει/η/υ -> ι, αι -> ε, ω -> ο)
        for (const str of expandedStrings) {
            const ph = normalizeGreekPhonetic(str);
            if (!ph || ph.length < 3) continue;
            if (phoneticToEntries.has(ph)) {
                const chosen = selectBestEntry(phoneticToEntries.get(ph), row);
                return {
                    match_type: 'Fonetsko/ortografsko poklapanje (Poglavlje III)',
                    entry: chosen,
                };
            }
        }

        // 3. Poklapanje u Wortregister I (za imena koja se pominju u drugim poglavljima ili unutar teksta)
        for (const str of expandedStrings) {
            const norm = normalizeGreek(str);
            for (const v of getGreekStemVariants(norm)) {
                if (wortregGrMap.has(v)) {
                    const wrHits = wortregGrMap.get(v);
                    const firstHit = wrHits[0];
                    const firstPg = firstHit.pageNums[0] || null;
                    const wrSlav = firstPg && bookPageToSlavicReg.has(firstPg)
                        ? Array.from(bookPageToSlavicReg.get(firstPg)).slice(0, 5).join(', ')
                        : '';
                    return {
                        match_type: 'Wortregister (indeks knjige)',
                        entry: {
                            greek_name: firstHit.name_orig,
                            slavic_extracted: wrSlav,
                            region: 'Indeks (Wortregister I)',
                            book_page: firstHit.pages,
                            pdf_page: '',
                            pdf_line: '',
                            origin_assessment: 'Slovenski (Vasmer registar)',
                            citation: `Knjiga str. ${firstHit.pages} (Wortregister I)`,
                            full_text: `Navedeno u Vasmerovom grčkom registru (Wortregister I) na str. ${firstHit.pages}.`,
                        },
                    };
                }
            }
        }

        return null;
    }

    // === 7. Obogacivanje output2.xlsx -> output2_vasmer.xlsx ===
    console.log('\n=== 7. Obogacivanje output2.xlsx ===');
    const wb = xlsx.readFile(EXCEL_PATH);
    const ws = wb.Sheets['Renamings'];
    const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });
    console.log(`Ucitano redova iz output2.xlsx (Renamings): ${rows.length}`);

    let stats = {
        total: rows.length,
        matched_chap3_exact: 0,
        matched_chap3_variant: 0,
        matched_chap3_phonetic: 0,
        matched_wortregister: 0,
        matched_with_slavic_name: 0,
        vasmer_says_non_slavic: 0,
        existing_vrsta_kept: 0,
        newly_suggested_slavic: 0,
        newly_suggested_turkish: 0,
        newly_suggested_greek_or_other: 0,
    };

    for (const row of rows) {
        if (row.vrsta) stats.existing_vrsta_kept++;

        const m = matchExcelRow(row);
        if (m) {
            const e = m.entry;
            if (m.match_type.startsWith('Tačno')) stats.matched_chap3_exact++;
            else if (m.match_type.startsWith('Poklapanje osnove')) stats.matched_chap3_variant++;
            else if (m.match_type.startsWith('Fonetsko')) stats.matched_chap3_phonetic++;
            else stats.matched_wortregister++;

            if (e.slavic_extracted) stats.matched_with_slavic_name++;

            row.vasmer_grcki_naziv = e.greek_name || '';
            row.vasmer_slovenski_naziv = e.slavic_extracted || '';
            row.vasmer_oblast = e.region || '';
            row.vasmer_strana_knjige = String(e.book_page || '');
            row.vasmer_strana_i_red = e.citation || '';
            row.vasmer_ocena_porekla = e.origin_assessment || '';
            row.vasmer_tip_poklapanja = m.match_type;
            row.vasmer_opis = e.full_text || '';

            const isNonSlavByVasmer = e.origin_assessment && e.origin_assessment.startsWith('Neslovensko') ||
                (e.origin_assessment && (e.origin_assessment.startsWith('Turski') || e.origin_assessment.startsWith('Grčki') || e.origin_assessment.startsWith('Albanski') || e.origin_assessment.startsWith('Romanski')));

            if (isNonSlavByVasmer) {
                stats.vasmer_says_non_slavic++;
                row.predlog_vrste = e.origin_assessment;
                if (!row.vrsta) stats.newly_suggested_greek_or_other++;
            } else {
                row.predlog_vrste = 'Серби / Словенски (Vasmer)';
                if (!row.vrsta) stats.newly_suggested_slavic++;
            }
        } else {
            row.vasmer_grcki_naziv = '';
            row.vasmer_slovenski_naziv = '';
            row.vasmer_oblast = '';
            row.vasmer_strana_knjige = '';
            row.vasmer_strana_i_red = '';
            row.vasmer_ocena_porekla = '';
            row.vasmer_tip_poklapanja = '';
            row.vasmer_opis = '';

            const heuristic = detectNonVasmerOrigin(row.old_name_gr, row.old_name_alternative, row.new_name_gr);
            row.predlog_vrste = row.vrsta ? `${row.vrsta} (postojeće)` : heuristic;
            if (!row.vrsta && heuristic.startsWith('Турци')) stats.newly_suggested_turkish++;
            else if (!row.vrsta && heuristic) stats.newly_suggested_greek_or_other++;
        }
    }

    const totalMatched = stats.matched_chap3_exact + stats.matched_chap3_variant + stats.matched_chap3_phonetic + stats.matched_wortregister;
    console.log('\n=== REZULTATI UPARIVANJA ===');
    console.log(`Ukupno redova u Excelu: ${stats.total}`);
    console.log(`Ukupno pronadjeno u Vasmerovoj knjizi: ${totalMatched}`);
    console.log(`  - Tacno poklapanje (Poglavlje III): ${stats.matched_chap3_exact}`);
    console.log(`  - Poklapanje osnove/varijante (Poglavlje III): ${stats.matched_chap3_variant}`);
    console.log(`  - Fonetsko/ortografsko poklapanje (Poglavlje III): ${stats.matched_chap3_phonetic}`);
    console.log(`  - Wortregister indeks: ${stats.matched_wortregister}`);
    console.log(`  - Sa izvucenim slovenskim/srpskim nazivom: ${stats.matched_with_slavic_name}`);
    console.log(`  - Gde Vasmer kaze da NIJE slovensko (tursko/grcko/albansko): ${stats.vasmer_says_non_slavic}`);
    console.log(`Postojeca kolona 'vrsta' sacuvana: ${stats.existing_vrsta_kept}`);
    console.log(`Novopredlozeno 'Серби / Словенски (Vasmer)' (gde je vrsta bila prazna): ${stats.newly_suggested_slavic}`);
    console.log(`Novopredlozeno 'Турци' (po turskim sufiksima/osnovama): ${stats.newly_suggested_turkish}`);

    // Upisi u output2_vasmer.xlsx
    const outWb = xlsx.utils.book_new();
    const outWs = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(outWb, outWs, 'Renamings');

    // Dodaj i originalni Sheet1 ako postoji u ulaznom fajlu
    if (wb.Sheets['Sheet1']) {
        xlsx.utils.book_append_sheet(outWb, wb.Sheets['Sheet1'], 'Sheet1');
    }

    // Dodaj Summary list
    const summaryRows = [
        { Pokazatelj: 'Ukupno redova u Renamings', Vrednost: stats.total },
        { Pokazatelj: 'Ukupno pronađeno u Vasmerovoj knjizi', Vrednost: totalMatched },
        { Pokazatelj: '  - Tačno poklapanje (Poglavlje III)', Vrednost: stats.matched_chap3_exact },
        { Pokazatelj: '  - Poklapanje osnove/varijante (Poglavlje III)', Vrednost: stats.matched_chap3_variant },
        { Pokazatelj: '  - Fonetsko/ortografsko poklapanje (Poglavlje III)', Vrednost: stats.matched_chap3_phonetic },
        { Pokazatelj: '  - Poklapanje u registru (Wortregister I)', Vrednost: stats.matched_wortregister },
        { Pokazatelj: 'Pronađeno sa izvučenom slovenskom/srpskom rekonstrukcijom', Vrednost: stats.matched_with_slavic_name },
        { Pokazatelj: 'Odrednice koje Vasmer ocenjuje kao neslovenske (turske/grčke/albanske)', Vrednost: stats.vasmer_says_non_slavic },
        { Pokazatelj: 'Već klasifikovano u originalnoj koloni vrsta', Vrednost: stats.existing_vrsta_kept },
        { Pokazatelj: 'Novi predlozi: Серби / Словенски (Vasmer)', Vrednost: stats.newly_suggested_slavic },
        { Pokazatelj: 'Novi predlozi: Турци (turska osnova/sufiks)', Vrednost: stats.newly_suggested_turkish },
        { Pokazatelj: 'Ukupno izvučenih odrednica iz Vasmerove knjige (vasmer_knjiga_izvuceno.xlsx)', Vrednost: descriptiveEntries.length },
    ];
    const summaryWs = xlsx.utils.json_to_sheet(summaryRows);
    xlsx.utils.book_append_sheet(outWb, summaryWs, 'Vasmer Statistika');

    xlsx.writeFile(outWb, OUT_ENRICHED_EXCEL);
    console.log(`\nUspesno sacuvan obogaceni Excel: ${OUT_ENRICHED_EXCEL}`);

    // Prikazi 15 primera iz razlicitih oblasti (ukljucujuci Makedoniju i Epir)
    console.log('\n=== PRIMERI UPARENIH REDOVA ===');
    const samples = rows.filter(r => r.vasmer_slovenski_naziv && r.vasmer_oblast.includes('Mazedonien')).slice(0, 10);
    for (const s of samples) {
        console.log(`- ${s.old_name_gr} -> ${s.new_name_gr} | Vasmer gr: ${s.vasmer_grcki_naziv} | Slovenski: ${s.vasmer_slovenski_naziv} | ${s.vasmer_oblast} | ${s.vasmer_strana_i_red}`);
    }
}

main().catch(err => {
    console.error('Greska:', err);
    process.exit(1);
});
