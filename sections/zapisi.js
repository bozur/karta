// Zapisi (Records/Documents) section functionality

$(document).ready(function () {
    console.log('Zapisi section loaded');
    initializeZapisi();
});

function initializeZapisi() {
    const accordion = $('#zapisi_accordion');
    if (accordion.data('initialized')) {
        return;
    }
    accordion.data('initialized', true);

    console.log('Initializing zapisi section...');

    const currentUser = sessionStorage.getItem('username') || 'TestUser';
    $('#unos_korisnik').val(currentUser);

    loadThemes();

    $('#unos_file').off('change').on('change', function () {
        const fileName = $(this).val().split('\\').pop();
        $(this).next('.custom-file-label')
            .text(fileName || 'запис није изабран')
            .attr('title', fileName || '');
    });

    $('#zapisi_unos_form').off('submit').on('submit', function (e) {
        e.preventDefault();
        handleFileUpload();
    });

    $('#zapisi_trazi_form').off('submit').on('submit', function (e) {
        e.preventDefault();
        handleSearch();
    });

    // Initialize character counters and paste-truncation warnings
    bindZapisCharCounter('#unos_naziv', '#unos_naziv_counter', 255);
    bindZapisCharCounter('#unos_opis', '#unos_opis_counter', 500);
    bindZapisCharCounter('#unos_tagovi', '#unos_tagovi_counter', 255);

    // Load latest 10 records automatically on tab open
    loadLatestZapisi();
}

function bindZapisCharCounter(inputSelector, counterSelector, maxLen) {
    const input = $(inputSelector);
    const counter = $(counterSelector);
    if (input.length === 0 || counter.length === 0) return;

    function updateCounter(truncated) {
        const len = (input.val() || '').length;
        if (truncated) {
            counter.css('color', '#d9534f').text(`${len} / ${maxLen} — текст је скраћен на ${maxLen} карактера`);
        } else if (len >= maxLen) {
            counter.css('color', 'darkorange').text(`${len} / ${maxLen} (достигнут максимум)`);
        } else {
            counter.css('color', '').text(`${len} / ${maxLen}`);
        }
    }

    input.off('input.charcount').on('input.charcount', function () {
        updateCounter(false);
    });

    input.off('paste.charcount').on('paste.charcount', function (e) {
        const clipboardData = (e.originalEvent && e.originalEvent.clipboardData) || window.clipboardData;
        const pastedText = clipboardData ? clipboardData.getData('text') : '';
        const el = this;
        const currentLen = (el.value || '').length;
        const selectedLen = (el.selectionEnd || 0) - (el.selectionStart || 0);
        const projectedLen = currentLen - selectedLen + pastedText.length;
        if (projectedLen > maxLen) {
            setTimeout(() => updateCounter(true), 0);
        }
    });

    updateCounter(false);
}

window.initZapisiSection = initializeZapisi;

function loadThemes() {
    fetch('/api/v2/themes')
        .then(response => response.json())
        .then(data => {
            const themes = data.themes;
            const unosSelect = $('#unos_tema');
            const traziSelect = $('#trazi_tema');

            unosSelect.find('option:not(:first)').remove();
            traziSelect.find('option:not(:first)').remove();

            themes.forEach(theme => {
                const id = theme.id || theme.ID;
                const naziv = theme.naziv || theme.NAZIV;
                if (id && naziv) {
                    unosSelect.append(`<option value="${id}">${naziv}</option>`);
                    traziSelect.append(`<option value="${id}">${naziv}</option>`);
                } else {
                    console.warn('Invalid theme object:', theme);
                }
            });
        })
        .catch(error => {
            console.error('Error loading themes:', error);
        });
}

function handleFileUpload() {
    const formData = new FormData($('#zapisi_unos_form')[0]);
    const errorDiv = $('#unos_error');
    const spinner = $('#unos_cekanje');

    errorDiv.hide().text('');
    $('#zapisi_unos_form .form-control, #zapisi_unos_form .custom-file-input, #zapisi_unos_form textarea').css('border-color', '');

    let isValid = true;
    let errorMessage = '';

    if (!$('#unos_naziv').val().trim()) {
        $('#unos_naziv').css('border-color', 'red');
        errorMessage = 'попуните поље (назив)';
        isValid = false;
    } else if ($('#unos_naziv').val().length > 255) {
        $('#unos_naziv').css('border-color', 'red');
        errorMessage = 'назив може имати највише 255 карактера';
        isValid = false;
    }

    if (!$('#unos_tema').val()) {
        $('#unos_tema').css('border-color', 'red');
        errorMessage = errorMessage || 'изаберите (тема)';
        isValid = false;
    }

    if (!$('#unos_opis').val().trim()) {
        $('#unos_opis').css('border-color', 'red');
        errorMessage = errorMessage || 'попуните поље (опис)';
        isValid = false;
    } else if ($('#unos_opis').val().length > 500) {
        $('#unos_opis').css('border-color', 'red');
        errorMessage = errorMessage || 'опис може имати највише 500 карактера';
        isValid = false;
    }

    if (!$('#unos_tagovi').val().trim()) {
        $('#unos_tagovi').css('border-color', 'red');
        errorMessage = errorMessage || 'попуните поље (тагови)';
        isValid = false;
    } else if ($('#unos_tagovi').val().length > 255) {
        $('#unos_tagovi').css('border-color', 'red');
        errorMessage = errorMessage || 'тагови могу имати највише 255 карактера';
        isValid = false;
    }

    const fileInput = $('#unos_file')[0];
    if (fileInput.files.length === 0) {
        $('#unos_file').css('border-color', 'red');
        errorMessage = errorMessage || 'запис није изабран';
        isValid = false;
    }

    if (!isValid) {
        errorDiv.text(errorMessage).show();
        return;
    }

    const file = fileInput.files[0];
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        errorDiv.text('Дозвољене врсте записа су: PDF, JPG, PNG').show();
        $('#unos_file').css('border-color', 'red');
        return;
    }

    spinner.css('visibility', 'visible');

    // Show virus check message in the error div (left of button)
    errorDiv.css('color', 'orange').text('Провјера на вирусе ... ово може потрајати 1 min.').show();

    fetch('/api/zapisi/upload', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            spinner.css('visibility', 'hidden');
            if (data.success) {
                // Show success message in the error div (styled green)
                errorDiv.css('color', 'green').text(data.message || 'запис је учитан').show(); /**/
                $('#zapisi_unos_form')[0].reset();
                $('#unos_korisnik').val(sessionStorage.getItem('username') || 'TestUser');
                $('.custom-file-label').text('запис није изабран').attr('title', '');
                $('#unos_naziv_counter').css('color', '').text('0 / 255');
                $('#unos_opis_counter').css('color', '').text('0 / 500');
                $('#unos_tagovi_counter').css('color', '').text('0 / 255');

                // Hide success message after 3 seconds
                setTimeout(() => {
                    errorDiv.hide().css('color', 'orange');
                }, 3000);

                // Refresh latest records if no search filters are active
                if (!hasZapisiFilters()) {
                    loadLatestZapisi();
                }
            } else {
                errorDiv.css('color', 'orange').text(data.error || 'Грешка при додавању фајла').show();
            }
        })
        .catch(error => {
            spinner.css('visibility', 'hidden');
            console.error('Error:', error);
            errorDiv.css('color', 'orange').text('Грешка при комуникацији са сервером').show();
        });
}

function hasZapisiFilters() {
    return Boolean(
        ($('#trazi_naziv').val() || '').trim() ||
        $('#trazi_tema').val() ||
        ($('#trazi_korisnik').val() || '').trim() ||
        ($('#trazi_opis').val() || '').trim() ||
        ($('#trazi_tagovi').val() || '').trim()
    );
}

function loadLatestZapisi() {
    const errorDiv = $('#trazi_error');
    const spinner = $('#trazi_cekanje');

    errorDiv.hide().text('');
    spinner.css('visibility', 'visible');

    fetch('/api/zapisi/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ limit: 10 })
    })
        .then(response => response.json())
        .then(data => {
            spinner.css('visibility', 'hidden');
            if (data.success) {
                displaySearchResults(data.results, 'Последњих 10 записа');
            } else {
                errorDiv.text(data.error || 'Грешка при учитавању записа').show();
            }
        })
        .catch(error => {
            spinner.css('visibility', 'hidden');
            console.error('Error:', error);
            errorDiv.text('Грешка при учитавању записа').show();
        });
}

function handleSearch() {
    const searchData = {
        naziv: $('#trazi_naziv').val(),
        tema_id: $('#trazi_tema').val(),
        korisnik: $('#trazi_korisnik').val(),
        opis: $('#trazi_opis').val(),
        tagovi: $('#trazi_tagovi').val()
    };

    const filtered = hasZapisiFilters();
    const errorDiv = $('#trazi_error');
    const spinner = $('#trazi_cekanje');

    errorDiv.hide().text('');
    spinner.css('visibility', 'visible');

    fetch('/api/zapisi/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchData)
    })
        .then(response => response.json())
        .then(data => {
            spinner.css('visibility', 'hidden');
            if (data.success) {
                const title = filtered
                    ? `Резултати претраге (${data.results.length})`
                    : `Сви записи (${data.results.length})`;
                displaySearchResults(data.results, title);
            } else {
                errorDiv.text(data.error || 'Грешка при претрази').show();
            }
        })
        .catch(error => {
            spinner.css('visibility', 'hidden');
            console.error('Error:', error);
            errorDiv.text('Грешка при претрази').show();
        });
}

function displaySearchResults(results, titleText) {
    const resultsBody = $('#zapisi_results_body');
    const resultsContainer = $('#zapisi_results');
    const resultsTitle = $('#zapisi_results_title');

    resultsBody.empty();

    if (titleText) {
        resultsTitle.text(titleText).show();
    } else {
        resultsTitle.hide().text('');
    }

    if (results.length === 0) {
        resultsBody.append(`
            <tr>
                <td colspan="3" style="padding: 10px; text-align: center; color: #666;">
                    Нема резултата.
                </td>
            </tr>
        `);
    } else {
        results.forEach(result => {
            resultsBody.append(`
                <tr>
                    <td style="padding: 5px 8px 5px 5px; width: 1%; white-space: nowrap; vertical-align: top;">${result.id}</td>
                    <td style="padding: 5px; width: 35%; vertical-align: top;">
                        <a href="#" class="zapis-link" onclick="viewZapis(${result.id}); return false;">${result.naziv}</a>
                    </td>
                    <td style="padding: 5px; vertical-align: top;">${result.opis || ''}</td>
                </tr>
            `);
        });
    }

    resultsContainer.show();
}

function viewZapis(id) {
    console.log('Downloading zapis with ID:', id);
    window.open(`/api/zapisi/${id}`, '_blank');
}
