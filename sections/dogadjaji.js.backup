// Dogadjaji (Events) section functionality

$(document).ready(function () {
    console.log('Dogadjaji section loaded');
    initializeDogadjaji();
});

function initializeDogadjaji() {
    console.log('Initializing dogadjaji section...');

    const currentUser = sessionStorage.getItem('username') || 'TestUser';
    $('#dogadjaji_unos_korisnik').val(currentUser);

    $('#dogadjaji_unos_form').off('submit').on('submit', function (e) {
        e.preventDefault();
        handleDogadjajiInsert();
    });

    $('#dogadjaji_trazi_form').off('submit').on('submit', function (e) {
        e.preventDefault();
        handleDogadjajiSearch();
    });
}

window.initDogadjajiSection = initializeDogadjaji;

function handleDogadjajiInsert() {
    const formData = {
        korisnik: $('#dogadjaji_unos_korisnik').val(),
        opis: $('#dogadjaji_unos_opis').val(),
        pocetak: $('#dogadjaji_unos_pocetak').val(),
        kraj: $('#dogadjaji_unos_kraj').val(),
        izvor: $('#dogadjaji_unos_izvor').val()
    };

    const errorDiv = $('#dogadjaji_unos_error');
    const spinner = $('#dogadjaji_unos_cekanje');

    errorDiv.hide().text('');
    $('#dogadjaji_unos_form .form-control, #dogadjaji_unos_form textarea').css('border-color', '');

    let isValid = true;
    let errorMessage = '';

    if (!$('#dogadjaji_unos_opis').val().trim()) {
        $('#dogadjaji_unos_opis').css('border-color', 'red');
        errorMessage = 'попуните поље (опис)';
        isValid = false;
    }

    if (!$('#dogadjaji_unos_pocetak').val().trim()) {
        $('#dogadjaji_unos_pocetak').css('border-color', 'red');
        errorMessage = errorMessage || 'попуните поље (почетак)';
        isValid = false;
    }

    if (!$('#dogadjaji_unos_izvor').val().trim()) {
        $('#dogadjaji_unos_izvor').css('border-color', 'red');
        errorMessage = errorMessage || 'попуните поље (извор)';
        isValid = false;
    }

    if (!isValid) {
        errorDiv.text(errorMessage).show();
        return;
    }

    spinner.css('visibility', 'visible');

    fetch('/api/dogadjaji/insert', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
        .then(response => response.json())
        .then(data => {
            spinner.css('visibility', 'hidden');
            if (data.success) {
                // Show success message in the error div (styled green)
                errorDiv.css('color', 'green').text('догађај је додат').show();
                $('#dogadjaji_unos_form')[0].reset();
                $('#dogadjaji_unos_korisnik').val(sessionStorage.getItem('username') || 'TestUser');

                // Hide success message after 3 seconds
                setTimeout(() => {
                    errorDiv.hide().css('color', 'orange');
                }, 3000);
            } else {
                errorDiv.text(data.error || 'Грешка при додавању догађаја').show();
            }
        })
        .catch(error => {
            spinner.css('visibility', 'hidden');
            console.error('Error:', error);
            errorDiv.text('Грешка при комуникацији са сервером').show();
        });
}

function handleDogadjajiSearch() {
    const searchData = {
        opis: $('#dogadjaji_trazi_opis').val(),
        pocetak: $('#dogadjaji_trazi_pocetak').val(),
        kraj: $('#dogadjaji_trazi_kraj').val(),
        izvor: $('#dogadjaji_trazi_izvor').val()
    };

    const errorDiv = $('#dogadjaji_trazi_error');
    const spinner = $('#dogadjaji_trazi_cekanje');

    errorDiv.hide().text('');
    spinner.css('visibility', 'visible');

    fetch('/api/dogadjaji/search', {
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
                displayDogadjajiResults(data.results);
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

function displayDogadjajiResults(results) {
    const resultsBody = $('#dogadjaji_results_body');
    const resultsContainer = $('#dogadjaji_results');

    resultsBody.empty();

    if (results.length === 0) {
        resultsBody.append(`
            <tr>
                <td colspan="4" style="padding: 10px; text-align: center; color: #666;">
                    Нема резултата.
                </td>
            </tr>
        `);
    } else {
        results.forEach(result => {
            resultsBody.append(`
                <tr style="cursor: pointer;" onclick="viewDogadjaj(${result.id})">
                    <td style="padding: 5px; width: 60px;">${result.id}</td>
                    <td style="padding: 5px; width: 200px;">${result.opis || ''}</td>
                    <td style="padding: 5px; width: 150px;">${result.pocetak || ''}</td>
                    <td style="padding: 5px;">${result.izvor || ''}</td>
                </tr>
            `);
        });
    }

    resultsContainer.show();
}

function viewDogadjaj(id) {
    console.log('Viewing dogadjaj with ID:', id);
    // TODO: Implement view functionality
    // This could open a modal or sidebar with full event details
}
