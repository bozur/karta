// Dogadjaji (Events) section functionality

console.log('dogadjaji.js loaded successfully');

$(document).ready(function () {
    console.log('Dogadjaji section loaded');
    initializeDogadjaji();
    initDogadjajLayer();
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
        koordinate: $('#dogadjaji_unos_koordinate').val(),
        izvor: $('#dogadjaji_unos_izvor').val(),
        zapis: $('#dogadjaji_unos_zapis').val()
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
    } else if ($('#dogadjaji_unos_opis').val().trim().length < 10) {
        $('#dogadjaji_unos_opis').css('border-color', 'red');
        errorMessage = 'опис мора имати најмање 10 карактера';
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
                errorDiv.css('color', 'green').text('догађај је додат').show();
                $('#dogadjaji_unos_form')[0].reset();
                $('#dogadjaji_unos_korisnik').val(sessionStorage.getItem('username') || 'TestUser');

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
        izvor: $('#dogadjaji_trazi_izvor').val(),
        prostorno: $('#dogadjaji_trazi_prostorno').val(),
        vremenski: $('#dogadjaji_trazi_vremenski').val()
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
                <td colspan="3" style="padding: 10px; text-align: center; color: #666;">
                    Нема резултата.
                </td>
            </tr>
        `);
    } else {
        results.forEach(result => {
            const hasCoordinates = result.koordinate && result.koordinate.trim() !== '';
            const locationIcon = hasCoordinates ? '<i class="bi bi-geo-alt-fill"></i>' : '';

            resultsBody.append(`
                <tr style="cursor: pointer;" onclick="viewDogadjaj(${result.id})">
                    <td style="padding: 5px; width: 60px;">${result.id}</td>
                    <td style="padding: 5px;">${result.opis || ''}</td>
                    <td style="padding: 5px; width: 30px; text-align: center;">${locationIcon}</td>
                </tr>
            `);
        });
    }

    resultsContainer.show();
}

// Global variable to store the current dogadjaj marker
var currentDogadjajiMarker = null;

function viewDogadjaj(id) {
    console.log('Viewing dogadjaj with ID:', id);

    fetch('/api/dogadjaji/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: id })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.results && data.results.length > 0) {
                const dogadjaj = data.results[0];

                // Show dogadjaj details in top layer
                showDogadjajLayer(dogadjaj);

                // ALWAYS remove previous marker first
                if (currentDogadjajiMarker) {
                    karta.removeLayer(currentDogadjajiMarker);
                    currentDogadjajiMarker = null;
                    console.log('Previous marker removed');
                }

                // If this dogadjaj has coordinates, show NEW marker
                if (dogadjaj.koordinate && dogadjaj.koordinate.trim() !== '') {
                    const coordMatch = dogadjaj.koordinate.match(/POINT\s*\(\s*([\d.-]+)\s+([\d.-]+)\s*\)/i);

                    if (coordMatch) {
                        const lng = parseFloat(coordMatch[1]);
                        const lat = parseFloat(coordMatch[2]);

                        console.log('Showing marker at:', lat, lng);

                        var calendarIcon = L.icon({
                            iconUrl: '/ikone/calendar.png',
                            iconSize: [32, 37],
                            iconAnchor: [16, 37],
                            popupAnchor: [0, -30]
                        });

                        currentDogadjajiMarker = L.marker([lat, lng], { icon: calendarIcon })
                            .addTo(karta)
                            .bindPopup(dogadjaj.opis);

                        // Pan to marker without changing zoom
                        karta.panTo([lat, lng]);
                    } else {
                        console.error('Could not parse coordinates:', dogadjaj.koordinate);
                    }
                } else {
                    console.log('No coordinates - marker already removed');
                }
            }
        })
        .catch(error => {
            console.error('Error fetching dogadjaj details:', error);
        });
}

// Format datetime for display
function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return 'Није наведено';
    const date = new Date(dateTimeStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year}. ${hours}:${minutes}`;
}

// Show dogadjaj layer with data
function showDogadjajLayer(dogadjaj) {
    // First row: only opis
    $('#dogadjaj_opis').text(dogadjaj.opis || 'Није наведено');

    // Second row: Почетак: date - Крај: date (with bold labels)
    const pocetakText = formatDateTime(dogadjaj.pocetak);
    const krajText = formatDateTime(dogadjaj.kraj);
    $('#dogadjaj_vrijeme').html('<b>Почетак:</b> ' + pocetakText + ' - <b>Крај:</b> ' + krajText);

    // Third row: Извор: value (with bold label)
    const izvorText = dogadjaj.izvor || 'Није наведено';
    $('#dogadjaj_izvor').html('<b>Извор:</b> ' + izvorText);

    $('#dogadjaj_layer').addClass('show');
}

// Close dogadjaj layer
function closeDogadjajLayer() {
    $('#dogadjaj_layer').removeClass('show');
    // Reset height to initial 35px
    $('#dogadjaj_layer').css('height', '35px');
}

// Initialize dogadjaj layer functionality
function initDogadjajLayer() {
    // Close button handler
    $('#dogadjaj_close').off('click').on('click', function () {
        closeDogadjajLayer();
    });

    // Draggable resize functionality
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;

    $('.dogadjaj_resize_handle').off('mousedown').on('mousedown', function (e) {
        isResizing = true;
        startY = e.clientY;
        startHeight = $('#dogadjaj_layer').outerHeight();
        e.preventDefault();
    });

    $(document).on('mousemove', function (e) {
        if (!isResizing) return;
        const deltaY = e.clientY - startY;
        const newHeight = startHeight + deltaY;
        if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
            $('#dogadjaj_layer').css('height', newHeight + 'px');
        }
    });

    $(document).on('mouseup', function () {
        if (isResizing) {
            isResizing = false;
        }
    });
}
