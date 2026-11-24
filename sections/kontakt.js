// Kontakt (Contact) section functionality

// This code is executed when kontakt section is loaded
$(document).ready(function () {
    console.log('Kontakt section loaded');

    function formatirajVremePoruke(isoString) {
        if (!isoString) return '';
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return '';
        const dan = String(d.getDate()).padStart(2, '0');
        const mesec = String(d.getMonth() + 1).padStart(2, '0');
        const godina = d.getFullYear();
        const sati = String(d.getHours()).padStart(2, '0');
        const minuti = String(d.getMinutes()).padStart(2, '0');
        return `${dan}.${mesec}.${godina}. ${sati}:${minuti}`;
    }

    function prikaziPoslatePoruke(poruke, ukupno) {
        const listaEl = $('#kontakt-poslate-lista');
        const ukupnoEl = $('#kontakt-poslate-ukupno');

        if (!listaEl.length) return;

        if (typeof ukupno === 'number' && ukupno > 0) {
            ukupnoEl.text(`укупно: ${ukupno}`);
        } else {
            ukupnoEl.text('');
        }

        listaEl.empty();

        if (!Array.isArray(poruke) || poruke.length === 0) {
            listaEl.append($('<div class="text-muted small">').text('Још увек нема послатих порука.'));
            return;
        }

        poruke.forEach(function (poruka) {
            const stavka = $('<div class="kontakt-poruka-stavka">');
            const vrh = $('<div class="kontakt-poruka-vrh">');
            const idNaslov = $('<div class="kontakt-poruka-id-naslov">');

            idNaslov.append($('<span class="kontakt-poruka-id">').text(`#${poruka.id}`));
            idNaslov.append($('<span class="kontakt-poruka-naslov">').text(poruka.naslov || ''));

            vrh.append(idNaslov);
            vrh.append($('<span class="kontakt-poruka-vreme">').text(formatirajVremePoruke(poruka.poslato_u)));

            const isecak = $('<div class="kontakt-poruka-isecak">').text(poruka.isecak || '');

            stavka.append(vrh);
            stavka.append(isecak);
            listaEl.append(stavka);
        });
    }

    function ucitajPoslatePoruke() {
        const listaEl = $('#kontakt-poslate-lista');
        if (!listaEl.length) return;

        $.ajax({
            url: '/api/kontakt/poruke?limit=10',
            method: 'GET',
            cache: false,
            success: function (response) {
                prikaziPoslatePoruke(response.poruke || [], response.ukupno);
            },
            error: function () {
                listaEl.empty().append(
                    $('<div class="text-muted small">').text('Није могуће учитати листу порука.')
                );
            }
        });
    }

    // Event handler for contact subject selection
    $('#kontakt_izbor').on('change', function () {
        // Hide all description divs
        $('#kontakt_opis > div').hide();

        // Show the selected description div
        const selectedValue = this.value;
        $('#kontakt_p' + selectedValue).show();
    });

    $('#kontakt-form').on('submit', function (e) {
        e.preventDefault();

        const subjectVal = $('#kontakt_izbor').val();
        const subjectText = $('#kontakt_izbor option:selected').text();
        const message = $('#kontakt_poruka').val();
        const statusDiv = $('#kontakt-status');

        if (subjectVal === '0') {
            statusDiv.text('Молимо изаберите наслов поруке.').css('color', 'red').show();
            return;
        }

        // Disable button while sending
        const submitBtn = $(this).find('button[type="submit"]');
        submitBtn.prop('disabled', true).text('слање...');

        $.ajax({
            url: '/api/kontakt',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                subject: subjectText,
                message: message
            }),
            success: function (response) {
                const porukaBroj = response && response.poruka && response.poruka.id
                    ? ` (#${response.poruka.id})`
                    : '';
                statusDiv.text(`Порука је успјешно послата${porukaBroj}!`).css('color', 'green').show();
                setTimeout(function () {
                    statusDiv.fadeOut();
                }, 5000);
                $('#kontakt-form')[0].reset();
                $('#kontakt_opis > div').hide();
                submitBtn.prop('disabled', false).text('пошаљи');
                ucitajPoslatePoruke();
            },
            error: function (xhr) {
                const errorMsg = xhr.responseJSON ? xhr.responseJSON.error : 'Грешка при слању поруке.';
                statusDiv.text(errorMsg).css('color', 'red').show();
                submitBtn.prop('disabled', false).text('пошаљи');
            }
        });
    });

    // Load recent sent messages when Kontakt section opens
    ucitajPoslatePoruke();
});
