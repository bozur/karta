// Podrska (Support) section functionality

var PODRSKA_CONFIG = {
    // Подаци за НБС IPS QR код и уплатницу
    primalac: 'Божур Вујичић',
    primalacLatinica: 'Bozur Vujicic',             // За IPS QR код (латиница без квачица)
    racunPrikaz: '265-0000007648006-78',           // Динарски текући рачун (18 цифара за IPS се аутоматски генерише)
    sifraPlacanja: '289',
    svrhaPrikaz: 'подршка за развој карта.срб',    // Приказ на екрану
    svrhaLatinica: 'podrska za razvoj karta.srb',  // За копирање и IPS QR код (латиница без квачица)

    // Подаци за уплате из иностранства
    inostranstvo: {
        kofiUrl: 'https://ko-fi.com/kartasrb',
        primalac: 'Bozur Vujicic',
        iban: 'RS35265050000013318032',
        swift: 'RZBSRSBG',
        banka: 'Raiffeisen banka a.d. Beograd',
        svrha: 'podrska za razvoj karta.srb'
    },

    // Месечни трошкови у РСД (резервне вредности ако сервер није доступан)
    mesecniTroskovi: 5500,
    troskoviOdrzavanja: 30000,

    // Тестни подаци за протеклих 12 месеци (индекс 0 = текући месец, индекс 11 = пре 11 месеци)
    mesecniPrihodi: [
        3200, // текући месец
        6200,
        4800,
        5500,
        7400,
        3900,
        5900,
        4100,
        2600,
        6800,
        5200,
        4500
    ]
};

var PODRSKA_MESECI_KRATKO = [
    'јан', 'феб', 'мар', 'апр', 'мај', 'јун',
    'јул', 'авг', 'сеп', 'окт', 'нов', 'дец'
];

var PODRSKA_MESECI_PUNO = [
    'јануар', 'фебруар', 'март', 'април', 'мај', 'јун',
    'јул', 'август', 'септембар', 'октобар', 'новембар', 'децембар'
];

var podrskaTrenutniQrDataUrl = '';

function formatRsd(iznos) {
    return Number(iznos || 0).toLocaleString('sr-RS');
}

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth <= 768;
}

function formatirajIpsRacun(racun) {
    var delovi = String(racun || '').trim().split('-');
    if (delovi.length === 3) {
        var banka = delovi[0].replace(/\D/g, '').padStart(3, '0');
        var sredina = delovi[1].replace(/\D/g, '').padStart(13, '0');
        var kontrola = delovi[2].replace(/\D/g, '').padStart(2, '0');
        return banka + sredina + kontrola;
    }
    return String(racun || '').replace(/\D/g, '').padStart(18, '0');
}

function kreirajIpsQrString(iznosRsd) {
    var delovi = [
        'K:PR',
        'V:01',
        'C:1',
        'R:' + formatirajIpsRacun(PODRSKA_CONFIG.racunPrikaz),
        'N:' + (PODRSKA_CONFIG.primalacLatinica || PODRSKA_CONFIG.primalac)
    ];

    var num = parseFloat(iznosRsd);
    if (!isNaN(num) && num > 0) {
        var formatiranIznos = num.toFixed(2).replace('.', ',');
        delovi.push('I:RSD' + formatiranIznos);
    }

    delovi.push('SF:' + PODRSKA_CONFIG.sifraPlacanja);
    delovi.push('S:' + (PODRSKA_CONFIG.svrhaLatinica || PODRSKA_CONFIG.svrhaPrikaz));

    return delovi.join('|');
}

function generisiIpsQr(iznosRsd) {
    var kontejner = document.getElementById('podrska_qr_kontejner');
    if (!kontejner) return;

    var num = parseFloat(iznosRsd);
    var imaIznos = !isNaN(num) && num > 0;
    // За замућени преглед користимо примерак износа како би позадински QR изгледао реално, али га не шаљемо за преузимање
    var ipsTekst = kreirajIpsQrString(imaIznos ? num : 1000);

    if (typeof window.qrcode !== 'function') {
        kontejner.innerHTML = '<div style="font-size: 0.8rem; color: #666; padding: 12px;">QR библиотека се учитава...</div>';
        return;
    }

    try {
        if (window.qrcode.stringToBytesFuncs && window.qrcode.stringToBytesFuncs['UTF-8']) {
            window.qrcode.stringToBytes = window.qrcode.stringToBytesFuncs['UTF-8'];
        }
        var qr = window.qrcode(0, 'M');
        qr.addData(ipsTekst, 'Byte');
        qr.make();

        var dataUrl = qr.createDataURL(6, 4);

        if (imaIznos) {
            podrskaTrenutniQrDataUrl = dataUrl;
            kontejner.classList.remove('zamucen');
            kontejner.innerHTML = '<img src="' + dataUrl + '" alt="НБС IPS QR код за уплату">';
        } else {
            podrskaTrenutniQrDataUrl = '';
            kontejner.classList.add('zamucen');
            kontejner.innerHTML =
                '<img src="' + dataUrl + '" alt="Унесите износ за QR код">' +
                '<div class="podrska-qr-poruka" id="podrska_qr_poruka_overlay">Унесите износ да бисте приказали QR код</div>';
            var overlay = document.getElementById('podrska_qr_poruka_overlay');
            if (overlay) {
                overlay.onclick = function () {
                    var inp = document.getElementById('podrska_iznos_input');
                    if (inp) inp.focus();
                };
            }
        }
    } catch (err) {
        console.error('Грешка при генерисању QR кода:', err);
        kontejner.innerHTML = '<div style="font-size: 0.8rem; color: #dc3545; padding: 10px;">Није могуће генерисати QR код.</div>';
    }
}

function kopirajUTekst(tekst, dugme) {
    var potvrdi = function () {
        if (!dugme) return;
        var originalHtml = dugme.innerHTML;
        dugme.innerHTML = '<i class="bi bi-check2"></i> Копирано';
        dugme.classList.remove('btn-outline-secondary');
        dugme.classList.add('btn-success');
        setTimeout(function () {
            dugme.innerHTML = originalHtml;
            dugme.classList.remove('btn-success');
            dugme.classList.add('btn-outline-secondary');
        }, 1600);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(tekst).then(potvrdi).catch(function () {
            fallbackKopiranje(tekst, potvrdi);
        });
    } else {
        fallbackKopiranje(tekst, potvrdi);
    }
}

function fallbackKopiranje(tekst, callback) {
    var textarea = document.createElement('textarea');
    textarea.value = tekst;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        if (callback) callback();
    } catch (err) {
        console.error('Копирање није успело:', err);
    }
    document.body.removeChild(textarea);
}

function pripremiPlacanje() {
    var primalacEl = document.getElementById('podrska_primalac_tekst');
    var racunEl = document.getElementById('podrska_racun_tekst');
    var sifraEl = document.getElementById('podrska_sifra_tekst');
    var svrhaEl = document.getElementById('podrska_svrha_tekst');

    if (primalacEl) primalacEl.textContent = PODRSKA_CONFIG.primalac;
    if (racunEl) racunEl.textContent = PODRSKA_CONFIG.racunPrikaz;
    if (sifraEl) sifraEl.textContent = PODRSKA_CONFIG.sifraPlacanja;
    if (svrhaEl) svrhaEl.textContent = PODRSKA_CONFIG.svrhaPrikaz;

    var desktopDiv = document.getElementById('podrska_desktop_qr');
    var mobileDiv = document.getElementById('podrska_mobile_placanje');

    if (desktopDiv && mobileDiv) {
        if (isMobileDevice()) {
            desktopDiv.style.display = 'none';
            mobileDiv.style.display = 'block';
        } else {
            desktopDiv.style.display = 'flex';
            mobileDiv.style.display = 'none';
        }
    }

    generisiIpsQr('');

    var iznosInput = document.getElementById('podrska_iznos_input');
    var mobileIznosInput = document.getElementById('podrska_mobile_iznos_input');
    var mobileQrUpozorenje = document.getElementById('podrska_mobile_qr_upozorenje');
    var cipovi = document.querySelectorAll('.podrska-iznos-cip');

    function osveziAktivniCip(vrednost) {
        for (var i = 0; i < cipovi.length; i++) {
            if (cipovi[i].getAttribute('data-iznos') === String(vrednost).trim()) {
                cipovi[i].classList.add('aktivan');
            } else {
                cipovi[i].classList.remove('aktivan');
            }
        }
    }

    function postaviIznos(vrednost, izvor) {
        if (iznosInput && izvor !== iznosInput) iznosInput.value = vrednost;
        if (mobileIznosInput && izvor !== mobileIznosInput) mobileIznosInput.value = vrednost;
        if (mobileQrUpozorenje) mobileQrUpozorenje.style.display = 'none';
        osveziAktivniCip(vrednost);
        generisiIpsQr(vrednost);
    }

    if (iznosInput) {
        iznosInput.oninput = function () {
            postaviIznos(this.value, iznosInput);
        };
    }

    if (mobileIznosInput) {
        mobileIznosInput.oninput = function () {
            postaviIznos(this.value, mobileIznosInput);
        };
    }

    for (var c = 0; c < cipovi.length; c++) {
        cipovi[c].onclick = function () {
            postaviIznos(this.getAttribute('data-iznos'), null);
        };
    }

    var prikaziPodatkeBtn = document.getElementById('podrska_prikazi_podatke_btn');
    if (prikaziPodatkeBtn) {
        prikaziPodatkeBtn.onclick = function () {
            if (desktopDiv && mobileDiv) {
                desktopDiv.style.display = 'none';
                mobileDiv.style.display = 'block';
            }
        };
    }

    var prikaziQrBtn = document.getElementById('podrska_prikazi_qr_btn');
    if (prikaziQrBtn) {
        prikaziQrBtn.onclick = function () {
            if (desktopDiv && mobileDiv) {
                mobileDiv.style.display = 'none';
                desktopDiv.style.display = 'flex';
            }
        };
    }

    var kopirajPrimalacBtn = document.getElementById('podrska_kopiraj_primalac');
    if (kopirajPrimalacBtn) {
        kopirajPrimalacBtn.onclick = function () {
            kopirajUTekst(PODRSKA_CONFIG.primalacLatinica, kopirajPrimalacBtn);
        };
    }

    var kopirajRacunBtn = document.getElementById('podrska_kopiraj_racun');
    if (kopirajRacunBtn) {
        kopirajRacunBtn.onclick = function () {
            kopirajUTekst(PODRSKA_CONFIG.racunPrikaz, kopirajRacunBtn);
        };
    }

    var kopirajSvrhuBtn = document.getElementById('podrska_kopiraj_svrhu');
    if (kopirajSvrhuBtn) {
        kopirajSvrhuBtn.onclick = function () {
            kopirajUTekst(PODRSKA_CONFIG.svrhaLatinica, kopirajSvrhuBtn);
        };
    }

    var preuzmiQrBtn = document.getElementById('podrska_preuzmi_qr_btn');
    if (preuzmiQrBtn) {
        preuzmiQrBtn.onclick = function () {
            var trenutniIznos = (mobileIznosInput && mobileIznosInput.value) || (iznosInput && iznosInput.value) || '';
            var num = parseFloat(trenutniIznos);
            if (isNaN(num) || num <= 0) {
                if (mobileQrUpozorenje) mobileQrUpozorenje.style.display = 'block';
                if (mobileIznosInput) mobileIznosInput.focus();
                return;
            }
            if (!podrskaTrenutniQrDataUrl) {
                generisiIpsQr(num);
            }
            if (!podrskaTrenutniQrDataUrl) return;

            var link = document.createElement('a');
            link.href = podrskaTrenutniQrDataUrl;
            link.download = 'ips-qr-podrska-' + Math.round(num) + 'rsd.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
    }

    pripremiTaboveIInostranstvo();
}

function pripremiTaboveIInostranstvo() {
    var tabSrbija = document.getElementById('podrska_tab_srbija');
    var tabIno = document.getElementById('podrska_tab_inostranstvo');
    var sadrzajSrbija = document.getElementById('podrska_sadrzaj_srbija');
    var sadrzajIno = document.getElementById('podrska_sadrzaj_inostranstvo');

    if (tabSrbija && tabIno && sadrzajSrbija && sadrzajIno) {
        tabSrbija.onclick = function () {
            tabSrbija.classList.add('aktivan');
            tabSrbija.setAttribute('aria-selected', 'true');
            tabIno.classList.remove('aktivan');
            tabIno.setAttribute('aria-selected', 'false');
            sadrzajSrbija.style.display = 'block';
            sadrzajIno.style.display = 'none';
        };

        tabIno.onclick = function () {
            tabIno.classList.add('aktivan');
            tabIno.setAttribute('aria-selected', 'true');
            tabSrbija.classList.remove('aktivan');
            tabSrbija.setAttribute('aria-selected', 'false');
            sadrzajIno.style.display = 'block';
            sadrzajSrbija.style.display = 'none';
        };
    }

    var ino = PODRSKA_CONFIG.inostranstvo || {};

    var kofiBlok = document.getElementById('podrska_kofi_blok');
    var kofiLink = document.getElementById('podrska_kofi_link');
    if (kofiBlok && kofiLink) {
        if (ino.kofiUrl && ino.kofiUrl.trim() !== '') {
            kofiLink.href = ino.kofiUrl.trim();
            kofiBlok.style.display = 'block';
        } else {
            kofiBlok.style.display = 'none';
        }
    }

    var prikaziSwiftBtn = document.getElementById('podrska_prikazi_swift_btn');
    var swiftBlok = document.getElementById('podrska_ino_swift_blok');
    if (prikaziSwiftBtn && swiftBlok) {
        prikaziSwiftBtn.onclick = function () {
            var jeOtvoren = swiftBlok.style.display !== 'none';
            swiftBlok.style.display = jeOtvoren ? 'none' : 'block';
            prikaziSwiftBtn.textContent = jeOtvoren
                ? 'Непосредан банковни трансфер (IBAN / SWIFT) — преко 400 €'
                : 'Сакриј податке за банковни трансфер (IBAN / SWIFT)';
        };
    }

    var inoPrimalac = document.getElementById('podrska_ino_primalac');
    var inoIban = document.getElementById('podrska_ino_iban');
    var inoSwift = document.getElementById('podrska_ino_swift');
    var inoBanka = document.getElementById('podrska_ino_banka');
    var inoBankaRed = document.getElementById('podrska_ino_banka_red');
    var inoSvrha = document.getElementById('podrska_ino_svrha');

    if (inoPrimalac) inoPrimalac.textContent = ino.primalac || '';
    if (inoIban) inoIban.textContent = ino.iban || '';
    if (inoSwift) inoSwift.textContent = ino.swift || '';
    if (inoSvrha) inoSvrha.textContent = ino.svrha || '';

    if (inoBanka && inoBankaRed) {
        if (ino.banka && ino.banka.trim() !== '') {
            inoBanka.textContent = ino.banka;
            inoBankaRed.style.display = 'flex';
        } else {
            inoBankaRed.style.display = 'none';
        }
    }

    var btnInoPrimalac = document.getElementById('podrska_kopiraj_ino_primalac');
    if (btnInoPrimalac) {
        btnInoPrimalac.onclick = function () {
            kopirajUTekst(ino.primalac || '', btnInoPrimalac);
        };
    }

    var btnIban = document.getElementById('podrska_kopiraj_iban');
    if (btnIban) {
        btnIban.onclick = function () {
            kopirajUTekst((ino.iban || '').replace(/\s+/g, ''), btnIban);
        };
    }

    var btnSwift = document.getElementById('podrska_kopiraj_swift');
    if (btnSwift) {
        btnSwift.onclick = function () {
            kopirajUTekst((ino.swift || '').trim(), btnSwift);
        };
    }

    var btnInoSvrha = document.getElementById('podrska_kopiraj_ino_svrhu');
    if (btnInoSvrha) {
        btnInoSvrha.onclick = function () {
            kopirajUTekst(ino.svrha || '', btnInoSvrha);
        };
    }
}

function prikaziGrafikon12Meseci(podaciSaServera) {
    var kontejner = document.getElementById('podrska_grafikon_12m');
    var statusEl = document.getElementById('podrska_novcana_status');
    var legendaTroskoviEl = document.getElementById('podrska_legenda_troskovi');
    var legendaOdrzavanjeEl = document.getElementById('podrska_legenda_odrzavanje');
    if (!kontejner) return;

    var troskovi = (podaciSaServera && typeof podaciSaServera.mesecniTroskovi === 'number')
        ? podaciSaServera.mesecniTroskovi
        : PODRSKA_CONFIG.mesecniTroskovi;

    var troskoviOdrzavanja = (podaciSaServera && typeof podaciSaServera.troskoviOdrzavanja === 'number')
        ? podaciSaServera.troskoviOdrzavanja
        : PODRSKA_CONFIG.troskoviOdrzavanja;

    var meseciPodaci = [];

    if (podaciSaServera && Array.isArray(podaciSaServera.meseci) && podaciSaServera.meseci.length > 0) {
        for (var m = 0; m < podaciSaServera.meseci.length; m++) {
            var item = podaciSaServera.meseci[m];
            var mesecIdx = (parseInt(item.mesec, 10) || 1) - 1;
            meseciPodaci.push({
                oznaka: PODRSKA_MESECI_KRATKO[mesecIdx] + ' ' + item.godina,
                puniNaziv: PODRSKA_MESECI_PUNO[mesecIdx] + ' ' + item.godina,
                iznos: Number(item.iznos) || 0,
                jeTekuci: m === 0
            });
        }
    } else {
        var prihodi = PODRSKA_CONFIG.mesecniPrihodi.slice(0, 12);
        while (prihodi.length < 12) {
            prihodi.push(0);
        }
        var danas = new Date();
        for (var i = 0; i < 12; i++) {
            var d = new Date(danas.getFullYear(), danas.getMonth() - i, 1);
            meseciPodaci.push({
                oznaka: PODRSKA_MESECI_KRATKO[d.getMonth()] + ' ' + d.getFullYear(),
                puniNaziv: PODRSKA_MESECI_PUNO[d.getMonth()] + ' ' + d.getFullYear(),
                iznos: Number(prihodi[i]) || 0,
                jeTekuci: i === 0
            });
        }
    }

    // Распон скале: од 0 РСД до максимума између прихода, техничких трошкова и трошкова одржавања
    var maksPrihod = 0;
    for (var j = 0; j < meseciPodaci.length; j++) {
        if (meseciPodaci[j].iznos > maksPrihod) {
            maksPrihod = meseciPodaci[j].iznos;
        }
    }
    var maksSkala = Math.max(troskovi, troskoviOdrzavanja, maksPrihod, 1);
    var pozicijaTroskova = troskovi > 0 ? (troskovi / maksSkala) * 100 : 0;
    var pozicijaOdrzavanja = troskoviOdrzavanja > 0 ? (troskoviOdrzavanja / maksSkala) * 100 : 0;

    if (legendaTroskoviEl) {
        legendaTroskoviEl.textContent = 'технички мјесечни трошкови: ' + formatRsd(troskovi) + ' РСД (хостинг+база+домен)';
    }
    if (legendaOdrzavanjeEl) {
        legendaOdrzavanjeEl.textContent = 'минимални трошкови рада на одржавању: ' + formatRsd(troskoviOdrzavanja) + ' РСД';
    }

    // Статус за текући месец одмах поред иконице за отварање "новчана подршка"
    if (statusEl && meseciPodaci.length > 0) {
        var tekuci = meseciPodaci[0];
        var statusKlasa = 'ispod';
        var ciljniIznos = troskovi;

        if (troskoviOdrzavanja > 0 && tekuci.iznos >= troskoviOdrzavanja) {
            statusKlasa = 'odrzavanje';
            ciljniIznos = troskoviOdrzavanja;
        } else if (tekuci.iznos >= troskovi) {
            statusKlasa = 'pokriveno';
            ciljniIznos = troskoviOdrzavanja > troskovi ? troskoviOdrzavanja : troskovi;
        }

        var procenat = ciljniIznos > 0 ? Math.round((tekuci.iznos / ciljniIznos) * 100) : 100;

        statusEl.className = 'podrska-novcana-status ' + statusKlasa;
        statusEl.textContent = formatRsd(tekuci.iznos) + ' РСД / ' + formatRsd(ciljniIznos) +
            ' РСД (' + procenat + '%)';
    }

    var html = '';
    for (var k = 0; k < meseciPodaci.length; k++) {
        var stavka = meseciPodaci[k];
        var sirinaProcenat = Math.min(100, (stavka.iznos / maksSkala) * 100);
        var klasaBoje = 'ispod';
        if (troskoviOdrzavanja > 0 && stavka.iznos >= troskoviOdrzavanja) {
            klasaBoje = 'odrzavanje';
        } else if (stavka.iznos >= troskovi) {
            klasaBoje = 'pokriveno';
        }
        var klasaReda = stavka.jeTekuci ? 'podrska-mesec-red tekuci' : 'podrska-mesec-red';
        var razlika = stavka.iznos - troskovi;
        var tooltipTekst = stavka.puniNaziv + ': ' + formatRsd(stavka.iznos) + ' РСД (' +
            (razlika >= 0
                ? '+' + formatRsd(razlika) + ' РСД изнад техничких трошкова'
                : formatRsd(Math.abs(razlika)) + ' РСД до покрића техничких трошкова') + ')';

        html +=
            '<div class="' + klasaReda + '" title="' + tooltipTekst + '">' +
                '<span class="podrska-mesec-oznaka">' + stavka.oznaka + '</span>' +
                '<div class="podrska-traka-okvir">' +
                    '<div class="podrska-traka-ispuna ' + klasaBoje + '" style="width: ' + sirinaProcenat.toFixed(2) + '%;"></div>' +
                    (troskovi > 0
                        ? '<div class="podrska-troskovi-linija" style="left: ' + pozicijaTroskova.toFixed(2) + '%;" ' +
                          'title="Месечни технички трошкови: ' + formatRsd(troskovi) + ' РСД"></div>'
                        : '') +
                    (troskoviOdrzavanja > 0
                        ? '<div class="podrska-odrzavanje-linija" style="left: ' + pozicijaOdrzavanja.toFixed(2) + '%;" ' +
                          'title="Минимални трошкови рада на одржавању: ' + formatRsd(troskoviOdrzavanja) + ' РСД"></div>'
                        : '') +
                '</div>' +
                '<span class="podrska-mesec-iznos">' + formatRsd(stavka.iznos) + ' РСД</span>' +
            '</div>';
    }

    // Доња скала: 0 РСД, ознака техничких трошкова, ознака одржавања (ако не преклапа) и максимум
    var prikaziOznakuTroskova = troskovi > 0 && pozicijaTroskova > 14 && pozicijaTroskova < 84;
    var prikaziOznakuOdrzavanja = troskoviOdrzavanja > 0 && pozicijaOdrzavanja > 18 && pozicijaOdrzavanja < 84 &&
        Math.abs(pozicijaOdrzavanja - pozicijaTroskova) > 16;

    html +=
        '<div class="podrska-skala-red">' +
            '<span class="podrska-mesec-oznaka"></span>' +
            '<div class="podrska-skala-traka">' +
                '<span class="podrska-skala-nula">0 РСД</span>' +
                (prikaziOznakuTroskova
                    ? '<span class="podrska-skala-troskovi" style="left: ' + pozicijaTroskova.toFixed(2) + '%;">' +
                      formatRsd(troskovi) + '</span>'
                    : '') +
                (prikaziOznakuOdrzavanja
                    ? '<span class="podrska-skala-odrzavanje" style="left: ' + pozicijaOdrzavanja.toFixed(2) + '%;">' +
                      formatRsd(troskoviOdrzavanja) + '</span>'
                    : '') +
                '<span class="podrska-skala-maks">' + formatRsd(maksSkala) + ' РСД</span>' +
            '</div>' +
            '<span class="podrska-mesec-iznos"></span>' +
        '</div>';

    kontejner.innerHTML = html;
}

async function ucitajPodatkeUplata() {
    try {
        var response = await fetch('/api/podrska/uplate');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var data = await response.json();
        if (data && data.success) {
            prikaziGrafikon12Meseci(data);
            return;
        }
    } catch (err) {
        console.warn('Није могуће учитати податке о уплатама са сервера, користе се локални подаци:', err);
    }
    prikaziGrafikon12Meseci(null);
}

function initPodrskaSection() {
    console.log('Podrska section initialized');
    pripremiPlacanje();
    pripremiDrustveneMreze();
    ucitajPodatkeUplata();
}

// ============================================
// Друштвене мреже — генерисање слика и видеа карте
// ============================================

function dohvatiNazivAktivneTeme() {
    if (window.lastSelectedTeme && window.lastSelectedTeme !== '0' &&
        window.temeMetadata && window.temeMetadata[window.lastSelectedTeme]) {
        return window.temeMetadata[window.lastSelectedTeme].naziv || '';
    }
    return '';
}

function postaviMrezeStatus(poruka, jeGreska) {
    var el = document.getElementById('podrska_mreze_status');
    if (!el) return;
    el.style.color = jeGreska ? '#dc3545' : '#28a745';
    el.textContent = poruka || '';
}

function ucitajSvgKaoSliku(svgEl) {
    return new Promise(function (resolve) {
        try {
            var serializer = new XMLSerializer();
            var svgStr = serializer.serializeToString(svgEl);
            if (svgStr.indexOf('xmlns=') === -1) {
                svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
            }
            var img = new Image();
            img.onload = function () { resolve(img); };
            img.onerror = function () { resolve(null); };
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
        } catch (e) {
            resolve(null);
        }
    });
}

function nacrtajZaobljeniPravougaonik(ctx, x, y, w, h, r) {
    var rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
}

function prelomiTekst(ctx, tekst, maksSirina, maksLinija) {
    var linije = [];
    var paragrafi = String(tekst || '').split(/\r?\n/);
    for (var p = 0; p < paragrafi.length; p++) {
        var reci = paragrafi[p].trim().split(/\s+/);
        if (reci.length === 1 && reci[0] === '') continue;
        var trenutna = '';
        for (var i = 0; i < reci.length; i++) {
            var test = trenutna ? trenutna + ' ' + reci[i] : reci[i];
            if (ctx.measureText(test).width > maksSirina && trenutna) {
                linije.push(trenutna);
                trenutna = reci[i];
                if (maksLinija && linije.length >= maksLinija) {
                    linije[maksLinija - 1] = linije[maksLinija - 1].replace(/\s*\S*$/, '') + '…';
                    return linije;
                }
            } else {
                trenutna = test;
            }
        }
        if (trenutna) {
            linije.push(trenutna);
            if (maksLinija && linije.length >= maksLinija) {
                if (p < paragrafi.length - 1) {
                    linije[maksLinija - 1] = linije[maksLinija - 1] + '…';
                }
                return linije;
            }
        }
    }
    return linije;
}

function nacrtajLeafletPopup(ctx, popupEl, mapRect) {
    var wrapper = popupEl.querySelector('.leaflet-popup-content-wrapper');
    var content = popupEl.querySelector('.leaflet-popup-content');
    if (!wrapper || !content) return null;

    var wr = wrapper.getBoundingClientRect();
    if (wr.width <= 0 || wr.height <= 0) return null;

    var x = wr.left - mapRect.left;
    var y = wr.top - mapRect.top;
    var w = wr.width;
    var h = wr.height;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;

    // Бели заобљени балончић
    nacrtajZaobljeniPravougaonik(ctx, x, y, w, h, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Стрелица на дну балончића
    var tipX = x + w / 2;
    var tipY = y + h;
    ctx.beginPath();
    ctx.moveTo(tipX - 8, tipY - 1);
    ctx.lineTo(tipX + 8, tipY - 1);
    ctx.lineTo(tipX, tipY + 10);
    ctx.closePath();
    ctx.fill();

    // Танки оквир без сенке
    ctx.shadowColor = 'transparent';
    nacrtajZaobljeniPravougaonik(ctx, x, y, w, h, 8);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Текст унутар балончића
    var rawText = (content.innerText || content.textContent || '').trim();
    var padX = 14;
    var padY = 12;
    var fontSize = 12;
    var lineHeight = 16;

    ctx.fillStyle = '#222222';
    ctx.font = fontSize + 'px Lato, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    var maksLinija = Math.max(1, Math.floor((h - padY * 2) / lineHeight));
    var linije = prelomiTekst(ctx, rawText, Math.max(40, w - padX * 2), maksLinija);

    for (var i = 0; i < linije.length; i++) {
        ctx.fillText(linije[i], x + padX, y + padY + i * lineHeight);
    }

    ctx.restore();

    return {
        centerX: x + w / 2,
        centerY: y + h / 2 + 12
    };
}

function dohvatiInfoDogadjaja() {
    var dogadjajEl = document.getElementById('dogadjaj_layer');
    if (dogadjajEl && (dogadjajEl.classList.contains('show') || window.getComputedStyle(dogadjajEl).display !== 'none')) {
        var opisEl = document.getElementById('dogadjaj_opis');
        var vremeEl = document.getElementById('dogadjaj_vrijeme');
        var opis = opisEl ? (opisEl.innerText || opisEl.textContent || '').trim() : '';
        var vreme = vremeEl ? (vremeEl.innerText || vremeEl.textContent || '').trim() : '';
        if (opis || vreme) {
            return { opis: opis, vreme: vreme };
        }
    }

    var playbackEl = document.getElementById('playback_info_layer');
    if (playbackEl && window.getComputedStyle(playbackEl).display !== 'none') {
        var twEl = document.getElementById('playback_time_window');
        var tw = twEl ? (twEl.innerText || twEl.textContent || '').trim() : '';
        if (tw && tw !== '-') {
            return { opis: '', vreme: tw };
        }
    }

    return null;
}

async function snimiKartuKaoCanvas() {
    var mapEl = document.getElementById('kartaid');
    if (!mapEl) {
        throw new Error('Карта није пронађена.');
    }

    var mapRect = mapEl.getBoundingClientRect();
    var w = Math.max(1, Math.round(mapRect.width));
    var h = Math.max(1, Math.round(mapRect.height));
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    var srcCanvas = document.createElement('canvas');
    srcCanvas.width = Math.round(w * dpr);
    srcCanvas.height = Math.round(h * dpr);

    var ctx = srcCanvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#e5e3df';
    ctx.fillRect(0, 0, w, h);

    // 1. Плочице карте (tiles)
    var tiles = mapEl.querySelectorAll('.leaflet-tile-pane img.leaflet-tile-loaded');
    for (var i = 0; i < tiles.length; i++) {
        var tile = tiles[i];
        if (!tile.complete || tile.naturalWidth === 0) continue;
        var tr = tile.getBoundingClientRect();
        if (tr.width <= 0 || tr.height <= 0) continue;
        try {
            ctx.drawImage(tile, tr.left - mapRect.left, tr.top - mapRect.top, tr.width, tr.height);
        } catch (e) {
            // Игнориши појединачну плочицу ако није доступна
        }
    }

    // 2. Canvas слојеви (ако постоје)
    var overlayCanvases = mapEl.querySelectorAll('.leaflet-overlay-pane canvas');
    for (var c = 0; c < overlayCanvases.length; c++) {
        var oc = overlayCanvases[c];
        var ocr = oc.getBoundingClientRect();
        try {
            ctx.drawImage(oc, ocr.left - mapRect.left, ocr.top - mapRect.top, ocr.width, ocr.height);
        } catch (e) {}
    }

    // 3. SVG векторски слојеви (полигони, линије, кругови)
    var svgs = mapEl.querySelectorAll('.leaflet-overlay-pane svg');
    for (var s = 0; s < svgs.length; s++) {
        var svg = svgs[s];
        var sr = svg.getBoundingClientRect();
        if (sr.width <= 0 || sr.height <= 0) continue;
        var svgImg = await ucitajSvgKaoSliku(svg);
        if (svgImg) {
            try {
                ctx.drawImage(svgImg, sr.left - mapRect.left, sr.top - mapRect.top, sr.width, sr.height);
            } catch (e) {}
        }
    }

    // 4. Кластери маркера (.marker-cluster)
    var clusters = mapEl.querySelectorAll('.leaflet-marker-pane .marker-cluster');
    for (var cl = 0; cl < clusters.length; cl++) {
        var cluster = clusters[cl];
        var clr = cluster.getBoundingClientRect();
        if (clr.width <= 0 || clr.height <= 0) continue;
        var cx = clr.left - mapRect.left + clr.width / 2;
        var cy = clr.top - mapRect.top + clr.height / 2;
        var rad = Math.min(clr.width, clr.height) / 2;

        var outerColor = 'rgba(181, 226, 140, 0.7)';
        var innerColor = 'rgba(110, 204, 57, 0.85)';
        if (cluster.classList.contains('marker-cluster-medium')) {
            outerColor = 'rgba(241, 211, 87, 0.7)';
            innerColor = 'rgba(240, 194, 12, 0.85)';
        } else if (cluster.classList.contains('marker-cluster-large')) {
            outerColor = 'rgba(253, 156, 115, 0.7)';
            innerColor = 'rgba(241, 128, 23, 0.85)';
        }

        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fillStyle = outerColor;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, rad * 0.75, 0, Math.PI * 2);
        ctx.fillStyle = innerColor;
        ctx.fill();

        var countText = (cluster.textContent || '').trim();
        ctx.fillStyle = '#222';
        ctx.font = 'bold 12px Lato, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(countText, cx, cy);
    }

    // 5. Иконице маркера
    var markers = mapEl.querySelectorAll('.leaflet-marker-pane img.leaflet-marker-icon');
    for (var m = 0; m < markers.length; m++) {
        var marker = markers[m];
        if (!marker.complete || marker.naturalWidth === 0) continue;
        var mr = marker.getBoundingClientRect();
        if (mr.width <= 0 || mr.height <= 0) continue;
        try {
            ctx.save();
            if (marker.classList.contains('marker-orange')) {
                ctx.filter = 'hue-rotate(165deg) saturate(1.8) brightness(0.9)';
            }
            ctx.drawImage(marker, mr.left - mapRect.left, mr.top - mapRect.top, mr.width, mr.height);
            ctx.restore();
        } catch (e) {}
    }

    // 6. Отворени Leaflet балончић (popup) изнад маркера
    var focusPoint = null;
    var popups = mapEl.querySelectorAll('.leaflet-popup-pane .leaflet-popup');
    for (var p = 0; p < popups.length; p++) {
        var popupInfo = nacrtajLeafletPopup(ctx, popups[p], mapRect);
        if (popupInfo) {
            focusPoint = popupInfo;
        }
    }

    // Одреди видљиви део карте (лево од отвореног панела Подршка, ако има простора)
    var panelEl = document.getElementById('section-content');
    var vidljivaSirina = w;
    if (panelEl && panelEl.classList.contains('in')) {
        var panelRect = panelEl.getBoundingClientRect();
        if (panelRect.width > 0 && w - panelRect.width > 240) {
            vidljivaSirina = w - panelRect.width;
        }
    }

    return {
        canvas: srcCanvas,
        dpr: dpr,
        visibleWidth: vidljivaSirina * dpr,
        visibleHeight: h * dpr,
        focusX: focusPoint ? focusPoint.centerX * dpr : null,
        focusY: focusPoint ? focusPoint.centerY * dpr : null,
        dogadjajInfo: dohvatiInfoDogadjaja()
    };
}

function nacrtajFrejmZaMreze(outCanvas, snap, natpis, zoomFaktor, alphaNatpisa, panXRatio, panYRatio) {
    var outW = outCanvas.width;
    var outH = outCanvas.height;
    var ctx = outCanvas.getContext('2d');

    var visW = snap.visibleWidth;
    var visH = snap.visibleHeight;
    var targetRatio = outW / outH;
    var srcRatio = visW / visH;

    var cropW, cropH;
    if (srcRatio > targetRatio) {
        cropH = visH;
        cropW = visH * targetRatio;
    } else {
        cropW = visW;
        cropH = visW / targetRatio;
    }

    var z = zoomFaktor || 1;
    var zCropW = cropW / z;
    var zCropH = cropH / z;

    var px = typeof panXRatio === 'number' ? panXRatio : 0;
    var py = typeof panYRatio === 'number' ? panYRatio : 0;
    var baseCenterX = snap.focusX !== null && snap.focusX !== undefined ? snap.focusX : visW / 2;
    var baseCenterY = snap.focusY !== null && snap.focusY !== undefined ? snap.focusY : visH / 2;
    var centerX = baseCenterX + px * (cropW - zCropW) * 0.45;
    var centerY = baseCenterY + py * (cropH - zCropH) * 0.35;
    var sx = Math.max(0, Math.min(snap.canvas.width - zCropW, centerX - zCropW / 2));
    var sy = Math.max(0, Math.min(snap.canvas.height - zCropH, centerY - zCropH / 2));

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(snap.canvas, sx, sy, zCropW, zCropH, 0, 0, outW, outH);

    // Горња картица за отворени догађај (ако је слој догађаја отворен)
    if (snap.dogadjajInfo && (snap.dogadjajInfo.opis || snap.dogadjajInfo.vreme)) {
        var cardPadX = Math.round(outW * 0.045);
        var cardTop = Math.round(outH * 0.035);
        var cardW = outW - cardPadX * 2;
        var innerPad = Math.round(Math.min(outW, outH) * 0.024);
        var opisFont = Math.max(18, Math.round(Math.min(outW, outH) * 0.027));
        var vremeFont = Math.max(15, Math.round(opisFont * 0.85));
        var opisLH = Math.round(opisFont * 1.32);
        var vremeLH = Math.round(vremeFont * 1.3);

        ctx.save();
        ctx.globalAlpha = typeof alphaNatpisa === 'number' ? alphaNatpisa : 1;

        ctx.font = '600 ' + opisFont + 'px Lato, Arial, sans-serif';
        var opisLinije = snap.dogadjajInfo.opis
            ? prelomiTekst(ctx, snap.dogadjajInfo.opis, cardW - innerPad * 2, outH > outW ? 5 : 3)
            : [];

        ctx.font = '500 ' + vremeFont + 'px Lato, Arial, sans-serif';
        var vremeLinije = snap.dogadjajInfo.vreme
            ? prelomiTekst(ctx, snap.dogadjajInfo.vreme, cardW - innerPad * 2, 2)
            : [];

        var cardH = innerPad * 2 + opisLinije.length * opisLH +
            (opisLinije.length > 0 && vremeLinije.length > 0 ? Math.round(innerPad * 0.45) : 0) +
            vremeLinije.length * vremeLH;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 4;

        nacrtajZaobljeniPravougaonik(ctx, cardPadX, cardTop, cardW, cardH, 12);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        ctx.fill();

        ctx.shadowColor = 'transparent';
        nacrtajZaobljeniPravougaonik(ctx, cardPadX, cardTop, cardW, cardH, 12);
        ctx.strokeStyle = 'rgba(245, 166, 21, 0.85)';
        ctx.lineWidth = 2;
        ctx.stroke();

        var currY = cardTop + innerPad;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        if (opisLinije.length > 0) {
            ctx.fillStyle = '#1a1a1a';
            ctx.font = '600 ' + opisFont + 'px Lato, Arial, sans-serif';
            for (var oi = 0; oi < opisLinije.length; oi++) {
                ctx.fillText(opisLinije[oi], cardPadX + innerPad, currY);
                currY += opisLH;
            }
        }

        if (vremeLinije.length > 0) {
            if (opisLinije.length > 0) currY += Math.round(innerPad * 0.45);
            ctx.fillStyle = '#b57600';
            ctx.font = '600 ' + vremeFont + 'px Lato, Arial, sans-serif';
            for (var vi = 0; vi < vremeLinije.length; vi++) {
                ctx.fillText(vremeLinije[vi], cardPadX + innerPad, currY);
                currY += vremeLH;
            }
        }

        ctx.restore();
    }

    // Доња градијентна трака са потписом карта.срб
    var barH = Math.round(outH * (outH > outW ? 0.16 : 0.24));
    var grad = ctx.createLinearGradient(0, outH - barH, 0, outH);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.58)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.84)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, outH - barH, outW, barH);

    var padX = Math.round(outW * 0.045);
    var padY = Math.round(outH * 0.035);
    var titleSize = Math.round(Math.min(outW, outH) * 0.052);
    var subSize = Math.round(titleSize * 0.58);
    var attrSize = Math.max(12, Math.round(titleSize * 0.34));

    ctx.save();
    ctx.globalAlpha = typeof alphaNatpisa === 'number' ? alphaNatpisa : 1;

    // Златна вертикална црта лево
    var barTop = outH - padY - titleSize - subSize - 10;
    var barBottom = outH - padY + 4;
    ctx.fillStyle = '#f5a615';
    ctx.fillRect(padX, barTop, Math.max(4, Math.round(outW * 0.006)), barBottom - barTop);

    var textX = padX + Math.max(14, Math.round(outW * 0.02));

    // Назив сајта
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold ' + titleSize + 'px Lato, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('карта.срб', textX, outH - padY - subSize - 6);

    // Поднаслов (натпис корисника или активна тема)
    var podnaslov = (natpis && natpis.trim()) ? natpis.trim() : 'карта кроз векове, изнад митова и легенди';
    ctx.fillStyle = '#f5d28b';
    ctx.font = '600 ' + subSize + 'px Lato, Arial, sans-serif';
    ctx.fillText(podnaslov, textX, outH - padY);

    // Дискретна атрибуција доле десно
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = attrSize + 'px Lato, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('© OpenStreetMap / Mapbox', outW - padX, outH - padY);

    ctx.restore();
}

function preuzmiBlob(blob, nazivFajla) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nazivFajla;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
}

async function napraviSlikuZaMrezu(sirina, visina, sufiks, dugme) {
    if (dugme) dugme.disabled = true;
    postaviMrezeStatus('Припремам слику...', false);

    try {
        var snap = await snimiKartuKaoCanvas();
        var outCanvas = document.createElement('canvas');
        outCanvas.width = sirina;
        outCanvas.height = visina;

        var natpisInput = document.getElementById('podrska_mreze_natpis');
        var natpis = natpisInput ? natpisInput.value : '';
        nacrtajFrejmZaMreze(outCanvas, snap, natpis, 1, 1);

        var blob = await new Promise(function (resolve, reject) {
            try {
                outCanvas.toBlob(function (b) {
                    if (b) resolve(b);
                    else reject(new Error('Није могуће креирати слику.'));
                }, 'image/png');
            } catch (err) {
                reject(err);
            }
        });

        preuzmiBlob(blob, 'karta-srb-' + sufiks + '.png');
        postaviMrezeStatus('Слика је преузета (' + sirina + '×' + visina + ').', false);
    } catch (err) {
        console.error('Грешка при прављењу слике карте:', err);
        postaviMrezeStatus('Није могуће направити слику (освежите страницу Ctrl+F5 и покушајте поново).', true);
    } finally {
        if (dugme) dugme.disabled = false;
    }
}

async function napraviVideoZaTikTok(dugme) {
    if (typeof window.MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) {
        postaviMrezeStatus('Ваш прегледач не подржава снимање видеа — користите дугме „Story / TikTok“ за слику.', true);
        return;
    }

    if (dugme) dugme.disabled = true;
    postaviMrezeStatus('Снимање видеа... 0/10 сек', false);

    try {
        var snap = await snimiKartuKaoCanvas();
        var outCanvas = document.createElement('canvas');
        outCanvas.width = 720;
        outCanvas.height = 1280;

        var natpisInput = document.getElementById('podrska_mreze_natpis');
        var natpis = natpisInput ? natpisInput.value : '';

        var kandidati = [
            'video/mp4;codecs=avc1.42E01E',
            'video/mp4',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm'
        ];
        var mimeType = '';
        for (var i = 0; i < kandidati.length; i++) {
            if (MediaRecorder.isTypeSupported(kandidati[i])) {
                mimeType = kandidati[i];
                break;
            }
        }

        var stream = outCanvas.captureStream(30);
        var recorder = mimeType
            ? new MediaRecorder(stream, { mimeType: mimeType, videoBitsPerSecond: 3500000 })
            : new MediaRecorder(stream);

        var chunks = [];
        recorder.ondataavailable = function (e) {
            if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        var zavrseno = new Promise(function (resolve) {
            recorder.onstop = function () {
                var tip = mimeType || 'video/webm';
                var ext = tip.indexOf('mp4') !== -1 ? 'mp4' : 'webm';
                resolve({ blob: new Blob(chunks, { type: tip }), ext: ext });
            };
        });

        var trajanjeMs = 10000;
        var pocetak = performance.now();
        recorder.start();

        await new Promise(function (resolveAnim) {
            function frejm(sad) {
                var proteklo = sad - pocetak;
                var t = Math.min(1, proteklo / trajanjeMs);
                // Глатко убрзање/успорење (Ken Burns: лагани зум + благо клизање кадра)
                var ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                var zoom = 1.04 + ease * 0.18;
                var panX = -0.6 + ease * 1.2;
                var panY = 0.25 - ease * 0.5;
                var alpha = Math.min(1, t * 5);

                nacrtajFrejmZaMreze(outCanvas, snap, natpis, zoom, alpha, panX, panY);

                var sek = Math.min(10, Math.ceil(proteklo / 1000));
                postaviMrezeStatus('Снимање видеа... ' + sek + '/10 сек', false);

                if (t < 1) {
                    requestAnimationFrame(frejm);
                } else {
                    resolveAnim();
                }
            }
            requestAnimationFrame(frejm);
        });

        recorder.stop();
        var rezultat = await zavrseno;
        preuzmiBlob(rezultat.blob, 'karta-srb-tiktok.' + rezultat.ext);
        postaviMrezeStatus('Видео је преузет! Додајте музику по избору у TikTok / Instagram апликацији.', false);
    } catch (err) {
        console.error('Грешка при снимању видеа:', err);
        postaviMrezeStatus('Грешка при снимању видеа (освежите страницу Ctrl+F5 и покушајте поново).', true);
    } finally {
        if (dugme) dugme.disabled = false;
    }
}

function pripremiDrustveneMreze() {
    var natpisInput = document.getElementById('podrska_mreze_natpis');
    if (natpisInput && !natpisInput.value) {
        var aktivnaTema = dohvatiNazivAktivneTeme();
        if (aktivnaTema) {
            natpisInput.value = aktivnaTema;
        }
    }

    var btnFb = document.getElementById('podrska_btn_slika_fb');
    if (btnFb) {
        btnFb.onclick = function () { napraviSlikuZaMrezu(1200, 630, 'facebook-viber', btnFb); };
    }

    var btnIg = document.getElementById('podrska_btn_slika_ig');
    if (btnIg) {
        btnIg.onclick = function () { napraviSlikuZaMrezu(1080, 1080, 'instagram', btnIg); };
    }

    var btnStory = document.getElementById('podrska_btn_slika_story');
    if (btnStory) {
        btnStory.onclick = function () { napraviSlikuZaMrezu(1080, 1920, 'story-tiktok', btnStory); };
    }

    var btnVideo = document.getElementById('podrska_btn_video_tiktok');
    if (btnVideo) {
        btnVideo.onclick = function () { napraviVideoZaTikTok(btnVideo); };
    }

    var urlZaDeljenje = 'https://карта.срб';
    var tekstZaDeljenje = 'карта.срб — карта кроз векове, изнад митова и легенди: ' + urlZaDeljenje;

    var btnViber = document.getElementById('podrska_deli_viber');
    if (btnViber) {
        btnViber.onclick = function () {
            window.open('viber://forward?text=' + encodeURIComponent(tekstZaDeljenje), '_blank');
        };
    }

    var btnWa = document.getElementById('podrska_deli_wa');
    if (btnWa) {
        btnWa.onclick = function () {
            window.open('https://wa.me/?text=' + encodeURIComponent(tekstZaDeljenje), '_blank', 'noopener,noreferrer');
        };
    }

    var btnFbShare = document.getElementById('podrska_deli_fb');
    if (btnFbShare) {
        btnFbShare.onclick = function () {
            window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent('https://xn--80aa2azak.xn--90a3ac'), '_blank', 'noopener,noreferrer');
        };
    }

    var btnShareLink = document.getElementById('podrska_deli_link');
    if (btnShareLink) {
        btnShareLink.onclick = function () {
            if (navigator.share) {
                navigator.share({
                    title: 'карта.срб',
                    text: 'карта кроз векове, изнад митова и легенди',
                    url: urlZaDeljenje
                }).catch(function () {});
            } else {
                kopirajUTekst(urlZaDeljenje, btnShareLink);
                postaviMrezeStatus('Линк ' + urlZaDeljenje + ' је копиран!', false);
            }
        };
    }
}

window.initPodrskaSection = initPodrskaSection;
