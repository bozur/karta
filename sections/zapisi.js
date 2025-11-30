// Zapisi (Records/Documents) section functionality

$(document).ready(function () {
    console.log('Zapisi section loaded');
    initializeZapisi();
});

function initializeZapisi() {
    console.log('Initializing zapisi section...');

    const currentUser = sessionStorage.getItem('username') || 'TestUser';
    $('#unos_korisnik').val(currentUser);

    loadThemes();

    $('#unos_file').off('change').on('change', function () {
        const fileName = $(this).val().split('\\').pop();
        $(this).next('.custom-file-label').html(fileName || 'запис није изабран');
    });

    $('#zapisi_unos_form').off('submit').on('submit', function (e) {
        e.preventDefault();
        handleFileUpload();
    });

    $('#zapisi_trazi_form').off('submit').on('submit', function (e) {
        e.preventDefault();
        handleSearch();
    });
}

window.initZapisiSection = initializeZapisi;

function loadThemes() {
    fetch('/api/themes')
        .then(response => response.json())
        .then(data => {
            const themes = data.themes;
            const unosSelect = $('#unos_tema');
            const traziSelect = $('#trazi_tema');

            unosSelect.find('option:not(:first)').remove();
            traziSelect.find('option:not(:first)').remove();

            themes.forEach(theme => {
                unosSelect.append(`<option value="${theme.id}">${theme.naziv}</option>`);
                traziSelect.append(`<option value="${theme.id}">${theme.naziv}</option>`);
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
    }

    if (!$('#unos_tagovi').val().trim()) {
        $('#unos_tagovi').css('border-color', 'red');
        errorMessage = errorMessage || 'попуните поље (тагови)';
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

    fetch('/api/zapisi/upload', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            spinner.css('visibility', 'hidden');
            if (data.success) {
                // Show success message in the error div (styled green)
                errorDiv.css('color', 'green').text('запис је учитан').show();
                $('#zapisi_unos_form')[0].reset();
                $('#unos_korisnik').val(sessionStorage.getItem('username') || 'TestUser');
                $('.custom-file-label').html('запис није изабран');

                // Hide success message after 3 seconds
                setTimeout(() => {
                    errorDiv.hide().css('color', 'orange');
                }, 3000);
            } else {
                errorDiv.text(data.error || 'Грешка при додавању фајла').show();
            }
        })
        .catch(error => {
            spinner.css('visibility', 'hidden');
            console.error('Error:', error);
            errorDiv.text('Грешка при комуникацији са сервером').show();
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
                displaySearchResults(data.results);
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

function displaySearchResults(results) {
    const resultsBody = $('#zapisi_results_body');
    const resultsContainer = $('#zapisi_results');

    resultsBody.empty();

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
                <tr style="cursor: pointer;" onclick="viewZapis(${result.id})">
                    <td style="padding: 5px; width: 60px;">${result.id}</td>
                    <td style="padding: 5px; width: 200px;">${result.naziv}</td>
                    <td style="padding: 5px;">${result.opis || ''}</td>
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
