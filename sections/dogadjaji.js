// Dogadjaji (Events) section functionality

console.log('dogadjaji.js loaded successfully');

$(document).ready(function () {
    console.log('Dogadjaji section loaded');
    initializeDogadjaji();
    initDogadjajLayer();
});

function initializeDogadjaji() {
    const accordion = $('#dogadjaji_accordion');
    if (accordion.length === 0 || accordion.data('initialized')) {
        return;
    }
    accordion.data('initialized', true);

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

    // Initialize marker tool functionality
    initializeMarkerTool();

    // Initialize searchable zapis autocomplete
    initializeZapisAutocomplete();

    // Initialize character counters and paste-truncation warnings
    bindDogadjajCharCounter('#dogadjaji_unos_opis', '#dogadjaji_unos_opis_counter', 500);
    bindDogadjajCharCounter('#dogadjaji_unos_izvor', '#dogadjaji_unos_izvor_counter', 500);

    // Initialize Flatpickr for datetime inputs
    if (typeof flatpickr !== 'undefined') {
        // Search fields - forgiving (guessing enabled)
        flatpickr("#dogadjaji_trazi_pocetak, #dogadjaji_trazi_kraj", {
            enableTime: true,
            dateFormat: "Y-m-d H:i",
            locale: "sr",
            time_24hr: true,
            allowInput: true
        });

        // Entry fields - strict validation
        const strictConfig = {
            enableTime: true,
            dateFormat: "Y-m-d H:i",
            locale: "sr",
            time_24hr: true,
            allowInput: true,
            parseDate: (dateStr) => {
                const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
                if (!regex.test(dateStr)) return null;
                const d = new Date(dateStr.replace(' ', 'T'));
                return isNaN(d.getTime()) ? null : d;
            }
        };
        flatpickr("#dogadjaji_unos_pocetak, #dogadjaji_unos_kraj", strictConfig);

        // Add visual alarm on blur for entry fields
        $('#dogadjaji_unos_pocetak, #dogadjaji_unos_kraj').on('blur', function () {
            const val = $(this).val();
            const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
            if (val && !regex.test(val)) {
                $(this).css('border-color', 'red');
            } else {
                $(this).css('border-color', '');
            }
        });
    } else {
        console.error("Flatpickr not loaded!");
    }

    // Load latest 10 events automatically on tab open
    loadLatestDogadjaji();
}

window.initDogadjajiSection = initializeDogadjaji;

// Initialize marker tool functionality
function initializeMarkerTool() {
    console.log('Initializing marker tool...');

    // Synchronize checkbox state with current drawing control state
    const isDrawingControlVisible = karta._controlContainer.querySelector('.leaflet-draw') !== null;
    $('#dogadjaji_marker_tool').prop('checked', isDrawingControlVisible);
    console.log('Drawing control visible on init:', isDrawingControlVisible);

    // Handle checkbox toggle
    $('#dogadjaji_marker_tool').off('change').on('change', function () {
        const isChecked = $(this).is(':checked');
        console.log('Marker tool checkbox changed:', isChecked);

        if (isChecked) {
            // Enable drawing control
            if (!karta.hasLayer(drawnItems)) {
                drawnItems.addTo(karta);
            }
            if (!karta._controlContainer.querySelector('.leaflet-draw')) {
                drawnControl.addTo(karta);
            }
            console.log('Drawing control enabled');
        } else {
            // Disable drawing control
            if (karta._controlContainer.querySelector('.leaflet-draw')) {
                karta.removeControl(drawnControl);
            }
            console.log('Drawing control disabled');
        }
    });

    // Listen for marker creation events from karta.js
    karta.off('draw:created.dogadjaji').on('draw:created.dogadjaji', function (e) {
        console.log('Dogadjaji marker created event received');

        // Check zoom level - must be at least 13
        const currentZoom = karta.getZoom();
        const minZoom = 13;

        if (currentZoom < minZoom) {
            // Show error in the form's error div
            const errorDiv = $('#dogadjaji_unos_error');
            errorDiv.text('Приближите карту ради тачности уноса!').show();
            console.log('Zoom level too low:', currentZoom, '< minimum:', minZoom);

            // Keep checkbox checked and tool visible - do NOT disable
            return;
        }

        const layer = e.layer;
        const lat = parseFloat(layer.getLatLng().lat).toFixed(6);
        const lng = parseFloat(layer.getLatLng().lng).toFixed(6);

        // Populate coordinates field in WKT POINT format
        const coordinates = `POINT(${lng} ${lat})`;
        $('#dogadjaji_unos_koordinate').val(coordinates);

        console.log('Coordinates set:', coordinates, 'at zoom level:', currentZoom);

        // Clear any previous error messages
        $('#dogadjaji_unos_error').hide().text('');

        // Uncheck the marker tool checkbox to disable drawing mode
        $('#dogadjaji_marker_tool').prop('checked', false).trigger('change');
    });
}

// Searchable zapis autocomplete for dogadjaji insert form
var dogadjajiZapisiCache = null;
var dogadjajiZapisiLoading = false;

function escapeDogadjajHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDogadjajIzvor(text) {
    if (!text || !String(text).trim()) return 'Није наведено';
    const escaped = escapeDogadjajHtml(text);
    const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
    return escaped.replace(urlRegex, function (match) {
        let trailing = '';
        let url = match;
        while (url.length > 0 && /[.,;!?]$/.test(url)) {
            trailing = url.slice(-1) + trailing;
            url = url.slice(0, -1);
        }
        let href = url;
        if (!/^https?:\/\//i.test(href)) {
            href = 'http://' + href;
        }
        return '<a href="' + href + '" target="_blank" rel="noopener noreferrer" style="color: darkorange; text-decoration: underline; word-break: break-all;">' + url + '</a>' + trailing;
    });
}

function loadDogadjajiZapisiList(onLoaded) {
    if (Array.isArray(dogadjajiZapisiCache)) {
        if (onLoaded) onLoaded(dogadjajiZapisiCache);
        return;
    }
    if (dogadjajiZapisiLoading) return;
    dogadjajiZapisiLoading = true;

    fetch('/api/zapisi/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    })
        .then(res => res.json())
        .then(data => {
            dogadjajiZapisiLoading = false;
            dogadjajiZapisiCache = (data && data.success && Array.isArray(data.results)) ? data.results : [];
            if (onLoaded) onLoaded(dogadjajiZapisiCache);
        })
        .catch(err => {
            dogadjajiZapisiLoading = false;
            console.error('Error loading zapisi list:', err);
            if (onLoaded) onLoaded([]);
        });
}

function renderDogadjajiZapisDropdown(query) {
    const dropdown = $('#dogadjaji_unos_zapis_dropdown');
    if (!Array.isArray(dogadjajiZapisiCache)) {
        dropdown.html('<div class="zapis-autocomplete-empty">Учитавање записа...</div>').show();
        return;
    }

    const rawQuery = (query || '').trim();
    const lowerQuery = rawQuery.toLowerCase();
    const idQuery = lowerQuery.replace(/^#/, '');

    const matches = dogadjajiZapisiCache.filter(z => {
        if (!rawQuery) return true;
        const idMatch = String(z.id).includes(idQuery);
        const nameMatch = (z.naziv || '').toLowerCase().includes(lowerQuery);
        return idMatch || nameMatch;
    }).slice(0, 15);

    if (matches.length === 0) {
        dropdown.html('<div class="zapis-autocomplete-empty">Нема пронађених записа.</div>').show();
        return;
    }

    const itemsHtml = matches.map(z => {
        const title = escapeDogadjajHtml(z.naziv || ('Запис #' + z.id));
        return `<div class="zapis-autocomplete-item" data-id="${z.id}" data-label="#${z.id} – ${title}"><strong>#${z.id}</strong> – ${title}</div>`;
    }).join('');

    dropdown.html(itemsHtml).show();
}

function initializeZapisAutocomplete() {
    const searchInput = $('#dogadjaji_unos_zapis_search');
    const hiddenInput = $('#dogadjaji_unos_zapis');
    const clearBtn = $('#dogadjaji_unos_zapis_clear');
    const dropdown = $('#dogadjaji_unos_zapis_dropdown');

    if (searchInput.length === 0) return;

    searchInput.off('focus.zapis').on('focus.zapis', function () {
        if (!Array.isArray(dogadjajiZapisiCache)) {
            renderDogadjajiZapisDropdown($(this).val());
            loadDogadjajiZapisiList(() => {
                if (searchInput.is(':focus')) {
                    renderDogadjajiZapisDropdown(searchInput.val());
                }
            });
        } else {
            renderDogadjajiZapisDropdown($(this).val());
        }
    });

    searchInput.off('input.zapis').on('input.zapis', function () {
        const val = $(this).val();
        hiddenInput.val('');
        clearBtn.toggle(val.length > 0);
        if (!Array.isArray(dogadjajiZapisiCache)) {
            loadDogadjajiZapisiList(() => renderDogadjajiZapisDropdown(searchInput.val()));
        } else {
            renderDogadjajiZapisDropdown(val);
        }
    });

    searchInput.off('keydown.zapis').on('keydown.zapis', function (e) {
        if (e.key === 'Escape') {
            dropdown.hide();
        }
    });

    dropdown.off('mousedown.zapis').on('mousedown.zapis', '.zapis-autocomplete-item', function (e) {
        e.preventDefault();
        const id = $(this).attr('data-id');
        const label = $(this).attr('data-label');
        hiddenInput.val(id);
        searchInput.val(label).css('border-color', '');
        clearBtn.show();
        dropdown.hide();
    });

    clearBtn.off('click.zapis').on('click.zapis', function () {
        hiddenInput.val('');
        searchInput.val('').css('border-color', '').focus();
        clearBtn.hide();
        renderDogadjajiZapisDropdown('');
    });

    $(document).off('click.dogadjajiZapisOutside').on('click.dogadjajiZapisOutside', function (e) {
        if ($(e.target).closest('.zapis-autocomplete-wrapper').length === 0) {
            dropdown.hide();
        }
    });
}

function bindDogadjajCharCounter(inputSelector, counterSelector, maxLen) {
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

function handleDogadjajiInsert() {
    let selectedZapis = ($('#dogadjaji_unos_zapis').val() || '').trim();
    const rawZapisSearch = ($('#dogadjaji_unos_zapis_search').val() || '').trim();

    if (!selectedZapis && rawZapisSearch) {
        const numericMatch = rawZapisSearch.match(/^#?(\d+)$/);
        if (numericMatch) {
            selectedZapis = numericMatch[1];
        }
    }

    const formData = {
        korisnik: $('#dogadjaji_unos_korisnik').val(),
        opis: $('#dogadjaji_unos_opis').val(),
        pocetak: $('#dogadjaji_unos_pocetak').val(),
        kraj: $('#dogadjaji_unos_kraj').val(),
        koordinate: $('#dogadjaji_unos_koordinate').val(),
        izvor: $('#dogadjaji_unos_izvor').val(),
        zapis: selectedZapis
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
    } else if ($('#dogadjaji_unos_opis').val().length > 500) {
        $('#dogadjaji_unos_opis').css('border-color', 'red');
        errorMessage = 'опис може имати највише 500 карактера';
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
    } else if ($('#dogadjaji_unos_izvor').val().length > 500) {
        $('#dogadjaji_unos_izvor').css('border-color', 'red');
        errorMessage = errorMessage || 'извор може имати највише 500 карактера';
        isValid = false;
    }

    if (rawZapisSearch && !selectedZapis) {
        $('#dogadjaji_unos_zapis_search').css('border-color', 'red');
        errorMessage = errorMessage || 'изаберите запис из листе или унесите ID записа';
        isValid = false;
    }

    if (formData.pocetak && formData.kraj) {
        if (new Date(formData.kraj) < new Date(formData.pocetak)) {
            $('#dogadjaji_unos_kraj').css('border-color', 'red');
            errorMessage = 'Вријеме краја мора бити послије почетка!';
            isValid = false;
        }
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
                errorDiv.css('color', 'green').text(data.message || 'догађај је додат').show();
                $('#dogadjaji_unos_form')[0].reset();
                $('#dogadjaji_unos_zapis').val('');
                $('#dogadjaji_unos_zapis_search').val('');
                $('#dogadjaji_unos_zapis_clear').hide();
                $('#dogadjaji_unos_zapis_dropdown').hide();
                $('#dogadjaji_unos_opis_counter').css('color', '').text('0 / 500');
                $('#dogadjaji_unos_izvor_counter').css('color', '').text('0 / 500');
                $('#dogadjaji_unos_korisnik').val(sessionStorage.getItem('username') || 'TestUser');

                setTimeout(() => {
                    errorDiv.hide().css('color', 'orange');
                }, 3000);

                // Refresh latest events if no search filters are active
                if (!hasDogadjajiFilters()) {
                    loadLatestDogadjaji();
                }
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

function hasDogadjajiFilters() {
    return Boolean(
        ($('#dogadjaji_trazi_opis').val() || '').trim() ||
        ($('#dogadjaji_trazi_pocetak').val() || '').trim() ||
        ($('#dogadjaji_trazi_kraj').val() || '').trim() ||
        $('#dogadjaji_trazi_izvor').val() ||
        $('#dogadjaji_trazi_prostorno').val() ||
        $('#dogadjaji_trazi_vremenski').val()
    );
}

function loadLatestDogadjaji() {
    const errorDiv = $('#dogadjaji_trazi_error');
    const spinner = $('#dogadjaji_trazi_cekanje');

    errorDiv.hide().text('');
    spinner.css('visibility', 'visible');

    fetch('/api/dogadjaji/search', {
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
                displayDogadjajiResults(data.results, 'Последњих 10 догађаја');
            } else {
                errorDiv.text(data.error || 'Грешка при учитавању догађаја').show();
            }
        })
        .catch(error => {
            spinner.css('visibility', 'hidden');
            console.error('Error:', error);
            errorDiv.text('Грешка при учитавању догађаја').show();
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

    const filtered = hasDogadjajiFilters();
    const errorDiv = $('#dogadjaji_trazi_error');
    const spinner = $('#dogadjaji_trazi_cekanje');

    $('#dogadjaji_trazi_kraj').css('border-color', '');

    if (searchData.pocetak && searchData.kraj) {
        if (new Date(searchData.kraj) < new Date(searchData.pocetak)) {
            $('#dogadjaji_trazi_kraj').css('border-color', 'red');
            errorDiv.text('Вријеме краја мора бити послије почетка!').show();
            return;
        }
    }

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
                const title = filtered
                    ? `Резултати претраге (${data.results.length})`
                    : `Сви догађаји (${data.results.length})`;
                displayDogadjajiResults(data.results, title);
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

function displayDogadjajiResults(results, titleText) {
    const resultsBody = $('#dogadjaji_results_body');
    const resultsContainer = $('#dogadjaji_results');
    const resultsTitle = $('#dogadjaji_results_title');

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
            const hasCoordinates = result.koordinate && result.koordinate.trim() !== '';
            const locationIcon = hasCoordinates ? '<i class="bi bi-geo-alt-fill"></i>' : '';

            resultsBody.append(`
                <tr style="cursor: pointer;" onclick="viewDogadjaj(${result.id})">
                    <td style="padding: 5px 8px 5px 5px; width: 1%; white-space: nowrap; vertical-align: top;">${result.id}</td>
                    <td style="padding: 5px; vertical-align: top;">${result.opis || ''}</td>
                    <td style="padding: 5px; width: 1%; white-space: nowrap; text-align: center; vertical-align: top;">${locationIcon}</td>
                </tr>
            `);
        });
    }

    resultsContainer.show();
}

// Global variable to store the current dogadjaj marker (preserve across script reloads!)
window.currentDogadjajiMarker = window.currentDogadjajiMarker || null;
var currentDogadjajiMarker = window.currentDogadjajiMarker;

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

                // Debug: Log the raw date values
                console.log('Događaj data:', dogadjaj);
                console.log('Pocetak value:', dogadjaj.pocetak, 'Type:', typeof dogadjaj.pocetak);
                console.log('Kraj value:', dogadjaj.kraj, 'Type:', typeof dogadjaj.kraj);

                // Show dogadjaj details in top layer
                showDogadjajLayer(dogadjaj);

                // ALWAYS remove previous marker first (check both local and global refs)
                if (window.currentDogadjajiMarker) {
                    karta.removeLayer(window.currentDogadjajiMarker);
                    window.currentDogadjajiMarker = null;
                }
                if (currentDogadjajiMarker) {
                    karta.removeLayer(currentDogadjajiMarker);
                    currentDogadjajiMarker = null;
                }
                if (window.urednikDogadjajMarker) {
                    karta.removeLayer(window.urednikDogadjajMarker);
                    window.urednikDogadjajMarker = null;
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

                        // Sync with window variable for playback access
                        window.currentDogadjajiMarker = currentDogadjajiMarker;

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

// Expose globally for playback integration
window.viewDogadjaj = viewDogadjaj;

// Parse Serbian date format "DD. MM. YYYY. HH:MM:SS" to Date object
function parseSerbianDate(dateStr) {
    if (!dateStr) return null;

    // Match format: "14. 12. 1991. 18:23:00"
    const match = dateStr.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\.\s*(\d{1,2}):(\d{2}):(\d{2})/);
    if (!match) {
        console.warn('Could not parse Serbian date:', dateStr);
        return null;
    }

    const [, day, month, year, hours, minutes, seconds] = match;
    // Month is 0-indexed in JavaScript Date
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day),
        parseInt(hours), parseInt(minutes), parseInt(seconds));
}

// Expose globally for playback integration
window.parseSerbianDate = parseSerbianDate;

// Format datetime for display
function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return 'Није наведено';

    // If it's already in Serbian format, return as-is
    if (typeof dateTimeStr === 'string' && dateTimeStr.match(/\d{1,2}\.\s*\d{1,2}\.\s*\d{4}\.\s*\d{1,2}:\d{2}/)) {
        return dateTimeStr;
    }

    const date = new Date(dateTimeStr);

    // Check if date is valid
    if (isNaN(date.getTime())) return 'Није наведено';

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

    // Third row: Извор: value (with clickable web links)
    $('#dogadjaj_izvor').html('<b>Извор:</b> ' + formatDogadjajIzvor(dogadjaj.izvor));

    // Fourth row: Запис: link to uploaded file if present
    if (dogadjaj.zapis) {
        const zapisLabel = escapeDogadjajHtml(dogadjaj.zapis_naziv || ('Запис #' + dogadjaj.zapis));
        $('#dogadjaj_zapis')
            .html(`<b>Запис:</b> <a href="/api/zapisi/${encodeURIComponent(dogadjaj.zapis)}" target="_blank" rel="noopener noreferrer" style="color: darkorange; text-decoration: underline;">${zapisLabel}</a>`)
            .show();
    } else {
        $('#dogadjaj_zapis').hide().empty();
    }

    // Add comments container if not exists
    if ($('#dogadjaji_comments_container').length === 0) {
        $('.dogadjaj_content').append('<hr><div id="dogadjaji_comments_container"></div>');
    }

    // Initialize comments
    const userProfilePic = window.currentUserProfilePic || 'slike/user-icon.png';

    $('#dogadjaji_comments_container').comments({
        profilePictureURL: userProfilePic,
        fieldMappings: {
            id: 'id',
            parent: 'parent',
            created: 'created',
            modified: 'modified',
            content: 'content',
            file_url: 'file_url',
            file_mime_type: 'file_mime_type',
            creator: 'creator',
            fullname: 'fullname',
            profilePictureURL: 'profile_picture_url', // Map server response field
            is_new: 'is_new',
            createdByAdmin: 'created_by_admin',
            createdByCurrentUser: 'created_by_current_user',
            upvoteCount: 'upvote_count',
            userHasUpvoted: 'user_has_upvoted',
            downvoteCount: 'downvote_count', // Custom
            userHasDownvoted: 'user_has_downvoted' // Custom
        },
        timeFormatter: function (time) {
            return new Date(time).toLocaleDateString('sr-RS').replace(/\/$/, '') + '.';
        },
        currentUserId: window.currentUserId || 0,
        roundProfilePictures: true,
        textareaRows: 1,
        enableAttachments: false,
        enableHashtags: true,
        enablePinging: true,
        scrollContainer: $('#dogadjaj_layer'), // Scroll within the layer
        searchUsers: function (term, success, error) {
            $.ajax({
                type: 'get',
                dataType: 'json',
                url: '/api/users',
                success: function (usersArray) {
                    success(usersArray.filter(function (user) {
                        var containsSearchTerm = user.fullname.toLowerCase().indexOf(term.toLowerCase()) != -1;
                        var isNotSelf = user.id != window.currentUserId;
                        return containsSearchTerm && isNotSelf;
                    }));
                },
                error: error
            });
        },
        getComments: function (success, error) {
            $.ajax({
                type: 'get',
                dataType: 'json',
                contentType: 'application/json',
                url: '/api/comments',
                data: { table: 'dogadjaji', id: dogadjaj.id },
                success: function (commentsArray) {
                    // Manual mapping to ensure profile picture works
                    var mapped = commentsArray.map(function (c) {
                        c.profilePictureURL = c.profile_picture_url;
                        return c;
                    });
                    success(mapped);
                },
                error: error
            });
        },
        postComment: function (data, success, error) {
            data.table = 'dogadjaji';
            data.id = dogadjaj.id;
            $.ajax({
                type: 'post',
                dataType: 'json',
                contentType: 'application/json',
                url: '/api/comments',
                data: JSON.stringify(data),
                success: function (comment) {
                    success(comment);
                },
                error: error
            });
        },
        putComment: function (data, success, error) {
            $.ajax({
                type: 'put',
                dataType: 'json',
                contentType: 'application/json',
                url: '/api/comments/' + data.id,
                data: JSON.stringify(data),
                success: function (comment) {
                    success(comment);
                },
                error: error
            });
        },
        deleteComment: function (data, success, error) {
            $.ajax({
                type: 'delete',
                url: '/api/comments/' + data.id,
                success: function () {
                    success();
                },
                error: error
            });
        },
        upvoteComment: function (data, success, error) {
            $.ajax({
                type: 'post',
                dataType: 'json',
                contentType: 'application/json',
                url: '/api/comments/' + data.id + '/upvote',
                data: JSON.stringify(data),
                success: function (comment) {
                    success(comment);
                },
                error: error
            });
        },
        downvoteComment: function (data, success, error) {
            $.ajax({
                type: 'post',
                dataType: 'json',
                contentType: 'application/json',
                url: '/api/comments/' + data.id + '/downvote',
                data: JSON.stringify(data),
                success: function (comment) {
                    success(comment);
                },
                error: error
            });
        }
    });

    $('#dogadjaj_layer').addClass('show');
}

// Close dogadjaj layer
function closeDogadjajLayer() {
    $('#dogadjaj_layer').removeClass('show');
    // Reset height to initial 35px
    $('#dogadjaj_layer').css('height', '35px');

    // Also remove marker when closing layer
    if (window.currentDogadjajiMarker) {
        karta.removeLayer(window.currentDogadjajiMarker);
        window.currentDogadjajiMarker = null;
    }
    if (currentDogadjajiMarker) {
        karta.removeLayer(currentDogadjajiMarker);
        currentDogadjajiMarker = null;
    }
}

// Expose globally for playback integration
window.closeDogadjajLayer = closeDogadjajLayer;

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
