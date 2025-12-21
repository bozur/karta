// Urednik (Editor) section functionality

function initUrednikSection() {
    console.log('Urednik section initialized');

    // Novosti insertion logic
    const btnUnesi = document.getElementById('btn_unesi_novosti');
    if (btnUnesi) {
        btnUnesi.addEventListener('click', async () => {
            const opisArea = document.getElementById('novosti_opis');
            const alertsDiv = document.getElementById('novosti_alerts');
            const opis = opisArea.value.trim();

            alertsDiv.innerHTML = ''; // Clear previous alerts

            // Frontend Validation
            if (opis.length < 10) {
                showAlert(alertsDiv, 'Опис мора имати најмање 10 карактера.', 'danger');
                return;
            }
            if (opis.length > 255) {
                showAlert(alertsDiv, 'Опис не смије бити дужи од 255 карактера.', 'danger'); // Although maxlength prevents typing, good specific check
                return;
            }

            try {
                const response = await fetch('/api/novosti', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ opis })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    showAlert(alertsDiv, 'Новости успјешно додате!', 'success');
                    opisArea.value = ''; // Clear input
                    // Optionally refresh Opste news if needed imediately, but it fetches on load
                } else {
                    showAlert(alertsDiv, data.error || 'Грешка при слању података.', 'danger');
                }
            } catch (error) {
                console.error('Error submitting novosti:', error);
                showAlert(alertsDiv, 'Грешка на серверу.', 'danger');
            }
        });
    }
}

function showAlert(container, message, type) {
    // Set color based on type
    if (type === 'success') {
        container.style.color = 'green';
    } else {
        container.style.color = 'orange'; // Default for error/warning
    }

    container.innerText = message;
    container.style.display = 'block';

    // Auto-hide after a few seconds
    setTimeout(() => {
        container.innerText = '';
        container.style.display = 'none';
        // Reset color to default just in case
        container.style.color = 'orange';
    }, 3000);
}

// Zapisi Approval functionality
function initZapisiApproval() {
    // Load pending zapisi when section is expanded
    $('#urednik_odobravanje_zapisa_podaci').on('shown.bs.collapse', function () {
        loadPendingZapisi();
    });

    // Header checkbox for "approve all"
    $('#zapisi_approve_all').on('change', function () {
        const isChecked = $(this).is(':checked');

        // Uncheck delete all header if approve all is checked
        if (isChecked) {
            $('#zapisi_delete_all').prop('checked', false);
            // Uncheck all delete checkboxes
            $('.zapisi-delete-checkbox').prop('checked', false);
        }

        // Check/uncheck all approve checkboxes
        $('.zapisi-approve-checkbox').prop('checked', isChecked);
    });

    // Header checkbox for "delete all"
    $('#zapisi_delete_all').on('change', function () {
        const isChecked = $(this).is(':checked');

        // Uncheck approve all header if delete all is checked
        if (isChecked) {
            $('#zapisi_approve_all').prop('checked', false);
            // Uncheck all approve checkboxes
            $('.zapisi-approve-checkbox').prop('checked', false);
        }

        // Check/uncheck all delete checkboxes
        $('.zapisi-delete-checkbox').prop('checked', isChecked);
    });

    // Execute button
    $('#btn_izvrsi_zapisi').on('click', function () {
        processZapisiApproval();
    });
}

function loadPendingZapisi() {
    const alertsDiv = $('#zapisi_approval_alerts');
    const loadingDiv = $('#zapisi_approval_loading');
    const resultsDiv = $('#zapisi_approval_results');

    alertsDiv.hide().text('');
    loadingDiv.show();
    resultsDiv.hide();

    fetch('/api/urednik/zapisi/pending')
        .then(response => response.json())
        .then(data => {
            loadingDiv.hide();

            if (data.success) {
                displayPendingZapisi(data.results);
            } else {
                alertsDiv.text(data.error || 'Грешка при учитавању').show();
            }
        })
        .catch(error => {
            loadingDiv.hide();
            console.error('Error loading pending zapisi:', error);
            alertsDiv.text('Грешка при комуникацији са сервером').show();
        });
}

function displayPendingZapisi(results) {
    const tbody = $('#zapisi_approval_body');
    const resultsDiv = $('#zapisi_approval_results');
    const alertsDiv = $('#zapisi_approval_alerts');

    tbody.empty();
    $('#zapisi_approve_all').prop('checked', false);
    $('#zapisi_delete_all').prop('checked', false);

    if (results.length === 0) {
        alertsDiv.css('color', 'green').text('Нема записа на чекању').show();
        resultsDiv.hide();
        return;
    }

    results.forEach(record => {
        const row = $(`
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 3px;">${record.id}</td>
                <td style="padding: 3px;">
                    <a href="#" class="zapis-link" onclick="viewZapis(${record.id}); return false;">${record.naziv}</a>
                </td>
                <td style="padding: 3px;">${record.opis || ''}</td>
                <td style="padding: 3px;">${record.tema || ''}</td>
                <td style="padding: 3px;">${record.korisnik || ''}</td>
                <td style="padding: 3px; text-align: center;">
                    <input type="checkbox" class="zapisi-approve-checkbox" data-id="${record.id}">
                </td>
                <td style="padding: 3px; text-align: center;">
                    <input type="checkbox" class="zapisi-delete-checkbox" data-id="${record.id}">
                </td>
            </tr>
        `);
        tbody.append(row);
    });

    // Add event listeners for individual checkboxes
    $('.zapisi-approve-checkbox').on('change', function () {
        const recordId = $(this).data('id');
        const deleteCheckbox = $(`.zapisi-delete-checkbox[data-id="${recordId}"]`);

        if ($(this).is(':checked')) {
            // Uncheck delete if approve is checked
            deleteCheckbox.prop('checked', false);
        }
    });

    $('.zapisi-delete-checkbox').on('change', function () {
        const recordId = $(this).data('id');
        const approveCheckbox = $(`.zapisi-approve-checkbox[data-id="${recordId}"]`);

        if ($(this).is(':checked')) {
            // Uncheck approve if delete is checked
            approveCheckbox.prop('checked', false);
        }
    });

    resultsDiv.show();
}

function processZapisiApproval() {
    const approveIds = [];
    const deleteIds = [];

    $('.zapisi-approve-checkbox:checked').each(function () {
        approveIds.push($(this).data('id'));
    });

    $('.zapisi-delete-checkbox:checked').each(function () {
        deleteIds.push($(this).data('id'));
    });

    if (approveIds.length === 0 && deleteIds.length === 0) {
        const alertsDiv = $('#zapisi_approval_alerts');
        alertsDiv.css('color', 'orange').text('Изаберите записе за обраду').show();
        setTimeout(() => alertsDiv.hide(), 3000);
        return;
    }

    const alertsDiv = $('#zapisi_approval_alerts');
    const loadingDiv = $('#zapisi_approval_loading');

    alertsDiv.hide().text('');
    loadingDiv.show();

    fetch('/api/urednik/zapisi/process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            approve: approveIds,
            delete: deleteIds
        })
    })
        .then(response => response.json())
        .then(data => {
            loadingDiv.hide();

            if (data.success) {
                const message = `Одобрено: ${data.approved}, Обрисано: ${data.deleted}`;
                alertsDiv.css('color', 'green').text(message).show();

                // Reload the list after 2 seconds
                setTimeout(() => {
                    loadPendingZapisi();
                }, 2000);
            } else {
                alertsDiv.css('color', 'orange').text(data.error || 'Грешка при обради').show();
            }
        })
        .catch(error => {
            loadingDiv.hide();
            console.error('Error processing zapisi:', error);
            alertsDiv.css('color', 'orange').text('Грешка при комуникацији са сервером').show();
        });
}

// Function to download zapis file
function viewZapis(id) {
    console.log('Downloading zapis with ID:', id);
    window.open(`/api/zapisi/${id}`, '_blank');
}

// ============================================
// Dogadjaji Approval functionality
// ============================================

function initDogadjajiApproval() {
    // Load pending dogadjaji when section is expanded
    $('#urednik_odobravanje_dogadjaja_podaci').on('shown.bs.collapse', function () {
        loadPendingDogadjaji();
    });

    // Clear map when section is collapsed
    $('#urednik_odobravanje_dogadjaja_podaci').on('hidden.bs.collapse', function () {
        clearMapForDogadjajiApproval();
    });

    // Header checkbox for "approve all"
    $('#dogadjaji_approve_all').on('change', function () {
        const isChecked = $(this).is(':checked');

        // Uncheck delete all header if approve all is checked
        if (isChecked) {
            $('#dogadjaji_delete_all').prop('checked', false);
            // Uncheck all delete checkboxes
            $('.dogadjaji-delete-checkbox').prop('checked', false);
        }

        // Check/uncheck all approve checkboxes
        $('.dogadjaji-approve-checkbox').prop('checked', isChecked);
    });

    // Header checkbox for "delete all"
    $('#dogadjaji_delete_all').on('change', function () {
        const isChecked = $(this).is(':checked');

        // Uncheck approve all header if delete all is checked
        if (isChecked) {
            $('#dogadjaji_approve_all').prop('checked', false);
            // Uncheck all approve checkboxes
            $('.dogadjaji-approve-checkbox').prop('checked', false);
        }

        // Check/uncheck all delete checkboxes
        $('.dogadjaji-delete-checkbox').prop('checked', isChecked);
    });

    // Execute button
    $('#btn_izvrsi_dogadjaji').on('click', function () {
        processDogadjajiApproval();
    });
}

function loadPendingDogadjaji() {
    const alertsDiv = $('#dogadjaji_approval_alerts');
    const loadingDiv = $('#dogadjaji_approval_loading');
    const resultsDiv = $('#dogadjaji_approval_results');

    alertsDiv.hide().text('');
    loadingDiv.show();
    resultsDiv.hide();

    // Clear ALL existing map layers from other tabs
    clearAllMapLayers();

    fetch('/api/urednik/dogadjaji/pending')
        .then(response => response.json())
        .then(data => {
            loadingDiv.hide();

            if (data.success) {
                displayPendingDogadjaji(data.results);
            } else {
                alertsDiv.text(data.error || 'Грешка при учитавању').show();
            }
        })
        .catch(error => {
            loadingDiv.hide();
            console.error('Error loading pending dogadjaji:', error);
            alertsDiv.text('Грешка при комуникацији са сервером').show();
        });
}

// Clear all map layers from other tabs (teme, dogadjaji, etc.)
function clearAllMapLayers() {
    console.log('Clearing all map layers for dogadjaji approval...');

    // Clear teme layers
    if (typeof window.addedGeoJSON !== 'undefined' && window.addedGeoJSON) {
        karta.removeLayer(window.addedGeoJSON);
        window.addedGeoJSON = null;
    }
    if (typeof window.temeClusterLayer !== 'undefined' && window.temeClusterLayer) {
        karta.removeLayer(window.temeClusterLayer);
        window.temeClusterLayer = null;
    }
    if (typeof window.submittedObjectsLayer !== 'undefined' && window.submittedObjectsLayer) {
        karta.removeLayer(window.submittedObjectsLayer);
        window.submittedObjectsLayer = null;
    }

    // Clear dogadjaji layer (current dogadjaj marker)
    if (typeof window.currentDogadjajiMarker !== 'undefined' && window.currentDogadjajiMarker) {
        karta.removeLayer(window.currentDogadjajiMarker);
        window.currentDogadjajiMarker = null;
    }

    // Close dogadjaj detail layer if open
    if (typeof closeDogadjajLayer === 'function') {
        closeDogadjajLayer();
    }

    console.log('Map layers from other tabs cleared (dogadjaji approval markers will be added by updateMapForDogadjajiApproval)');
}

function displayPendingDogadjaji(results) {
    const tbody = $('#dogadjaji_approval_body');
    const resultsDiv = $('#dogadjaji_approval_results');
    const alertsDiv = $('#dogadjaji_approval_alerts');

    tbody.empty();
    $('#dogadjaji_approve_all').prop('checked', false);
    $('#dogadjaji_delete_all').prop('checked', false);

    if (results.length === 0) {
        alertsDiv.css('color', 'green').text('Нема догађаја на чекању').show();
        resultsDiv.hide();
        clearMapForDogadjajiApproval();
        return;
    }

    results.forEach(record => {
        const hasCoordinates = record.koordinate && record.koordinate.trim() !== '';
        const locationIcon = hasCoordinates ? '<i class="bi bi-geo-alt-fill"></i>' : '';

        const row = $(`
            <tr style="border-bottom: 1px solid #eee; cursor: ${hasCoordinates ? 'pointer' : 'default'};" data-id="${record.id}" data-has-coords="${hasCoordinates}">
                <td style="padding: 3px;">${record.id}</td>
                <td style="padding: 3px;">${record.opis || ''}</td>
                <td style="padding: 3px;">${record.pocetak || ''}</td>
                <td style="padding: 3px;">${record.kraj || ''}</td>
                <td style="padding: 3px;">${record.korisnik || ''}</td>
                <td style="padding: 3px; width: 30px; text-align: center;">${locationIcon}</td>
                <td style="padding: 3px; text-align: center;">
                    <input type="checkbox" class="dogadjaji-approve-checkbox" data-id="${record.id}">
                </td>
                <td style="padding: 3px; text-align: center;">
                    <input type="checkbox" class="dogadjaji-delete-checkbox" data-id="${record.id}">
                </td>
            </tr>
        `);

        // Add click handler for rows with coordinates
        if (hasCoordinates) {
            row.on('click', function (e) {
                // Don't trigger if clicking on checkbox
                if ($(e.target).is('input[type="checkbox"]')) {
                    return;
                }

                const recordId = $(this).data('id');
                showPendingDogadjajOnMap(recordId, results);
            });
        }

        tbody.append(row);
    });

    // Add event listeners for individual checkboxes
    $('.dogadjaji-approve-checkbox').on('change', function () {
        const recordId = $(this).data('id');
        const deleteCheckbox = $(`.dogadjaji-delete-checkbox[data-id="${recordId}"]`);

        if ($(this).is(':checked')) {
            // Uncheck delete if approve is checked
            deleteCheckbox.prop('checked', false);
        }
    });

    $('.dogadjaji-delete-checkbox').on('change', function () {
        const recordId = $(this).data('id');
        const approveCheckbox = $(`.dogadjaji-approve-checkbox[data-id="${recordId}"]`);

        if ($(this).is(':checked')) {
            // Uncheck approve if delete is checked
            approveCheckbox.prop('checked', false);
        }
    });

    resultsDiv.show();

    // Update map with pending dogadjaji
    updateMapForDogadjajiApproval(results);
}

// Show specific pending dogadjaj on map when row is clicked
function showPendingDogadjajOnMap(recordId, allRecords) {
    const record = allRecords.find(r => r.id === recordId);
    if (!record || !record.koordinate || record.koordinate.trim() === '') {
        return;
    }

    const coordMatch = record.koordinate.match(/POINT\s*\(\s*([\d.-]+)\s+([\d.-]+)\s*\)/i);
    if (!coordMatch) {
        return;
    }

    const lng = parseFloat(coordMatch[1]);
    const lat = parseFloat(coordMatch[2]);

    // Pan to the marker
    karta.panTo([lat, lng]);

    // Find and open the popup for this marker
    if (window.dogadjajiApprovalMarkers) {
        window.dogadjajiApprovalMarkers.forEach(marker => {
            const markerLatLng = marker.getLatLng();
            if (Math.abs(markerLatLng.lat - lat) < 0.000001 && Math.abs(markerLatLng.lng - lng) < 0.000001) {
                marker.openPopup();
            }
        });
    }
}

function processDogadjajiApproval() {
    const approveIds = [];
    const deleteIds = [];

    $('.dogadjaji-approve-checkbox:checked').each(function () {
        approveIds.push($(this).data('id'));
    });

    $('.dogadjaji-delete-checkbox:checked').each(function () {
        deleteIds.push($(this).data('id'));
    });

    if (approveIds.length === 0 && deleteIds.length === 0) {
        const alertsDiv = $('#dogadjaji_approval_alerts');
        alertsDiv.css('color', 'orange').text('Изаберите догађаје за обраду').show();
        setTimeout(() => alertsDiv.hide(), 3000);
        return;
    }

    const alertsDiv = $('#dogadjaji_approval_alerts');
    const loadingDiv = $('#dogadjaji_approval_loading');

    alertsDiv.hide().text('');
    loadingDiv.show();

    fetch('/api/urednik/dogadjaji/process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            approve: approveIds,
            delete: deleteIds
        })
    })
        .then(response => response.json())
        .then(data => {
            loadingDiv.hide();

            if (data.success) {
                const message = `Одобрено: ${data.approved}, Обрисано: ${data.deleted}`;
                alertsDiv.css('color', 'green').text(message).show();

                // Reload the list after 1 second (keeping section open)
                setTimeout(() => {
                    // Check if section is still expanded
                    if ($('#urednik_odobravanje_dogadjaja_podaci').hasClass('show')) {
                        console.log('Reloading pending dogadjaji after approval/deletion...');
                        loadPendingDogadjaji();
                    }
                }, 1000);
            } else {
                alertsDiv.css('color', 'orange').text(data.error || 'Грешка при обради').show();
            }
        })
        .catch(error => {
            loadingDiv.hide();
            console.error('Error processing dogadjaji:', error);
            alertsDiv.css('color', 'orange').text('Грешка при комуникацији са сервером').show();
        });
}

// Update map to show pending dogadjaji and approved ones within time window
function updateMapForDogadjajiApproval(pendingDogadjaji) {
    // Clear existing map layers
    clearMapForDogadjajiApproval();

    if (!pendingDogadjaji || pendingDogadjaji.length === 0) {
        return;
    }

    // Calculate time window from pending dogadjaji
    let minPocetak = null;
    let maxKraj = null;

    pendingDogadjaji.forEach(record => {
        if (record.pocetak) {
            const pocetakDate = parseSerbianDateString(record.pocetak);
            if (!minPocetak || pocetakDate < minPocetak) {
                minPocetak = pocetakDate;
            }
        }
        if (record.kraj) {
            const krajDate = parseSerbianDateString(record.kraj);
            if (!maxKraj || krajDate > maxKraj) {
                maxKraj = krajDate;
            }
        }
    });

    // Initialize global storage for approval markers
    if (!window.dogadjajiApprovalMarkers) {
        window.dogadjajiApprovalMarkers = [];
    }

    // Add pending dogadjaji markers (only those with coordinates)
    pendingDogadjaji.forEach(record => {
        if (record.koordinate && record.koordinate.trim() !== '') {
            const coordMatch = record.koordinate.match(/POINT\s*\(\s*([\d.-]+)\s+([\d.-]+)\s*\)/i);
            if (coordMatch) {
                const lng = parseFloat(coordMatch[1]);
                const lat = parseFloat(coordMatch[2]);

                const predlogIcon = L.icon({
                    iconUrl: '/ikone/dogadjaj-predlog.png',
                    iconSize: [32, 37],
                    iconAnchor: [16, 37],
                    popupAnchor: [0, -30]
                });

                // Create detailed popup content
                const popupContent = `
                    <div style="min-width: 200px;">
                        <div style="font-weight: bold; margin-bottom: 5px; color: #d35400;">Предлог догађаја</div>
                        <div style="margin-bottom: 3px;"><b>ID:</b> ${record.id}</div>
                        <div style="margin-bottom: 3px;"><b>Опис:</b> ${record.opis || ''}</div>
                        <div style="margin-bottom: 3px;"><b>Почетак:</b> ${record.pocetak || ''}</div>
                        <div style="margin-bottom: 3px;"><b>Крај:</b> ${record.kraj || ''}</div>
                        <div style="margin-bottom: 3px;"><b>Корисник:</b> ${record.korisnik || ''}</div>
                    </div>
                `;

                const marker = L.marker([lat, lng], { icon: predlogIcon })
                    .addTo(karta)
                    .bindPopup(popupContent);

                window.dogadjajiApprovalMarkers.push(marker);
            }
        }
    });

    // Fetch and display approved dogadjaji within time window
    if (minPocetak && maxKraj) {
        console.log('Fetching approved dogadjaji within time window:', minPocetak, 'to', maxKraj);
        fetchApprovedDogadjajiInWindow(minPocetak, maxKraj);
    } else {
        console.log('No time window calculated - no pending dogadjaji with dates');
    }
}

// Parse Serbian date string "DD. MM. YYYY. HH:MM:SS" to Date object
function parseSerbianDateString(dateStr) {
    if (!dateStr) return null;

    // Match format: "14. 12. 1991. 18:23:00" or "14. 12. 1991, 18:23:00"
    const match = dateStr.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})[.,]\s*(\d{1,2}):(\d{2}):(\d{2})/);
    if (!match) {
        console.warn('Could not parse Serbian date:', dateStr);
        return null;
    }

    const [, day, month, year, hours, minutes, seconds] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day),
        parseInt(hours), parseInt(minutes), parseInt(seconds));
}

// Fetch approved dogadjaji within the time window
function fetchApprovedDogadjajiInWindow(minDate, maxDate) {
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    };

    const searchData = {
        pocetak: formatDate(minDate),
        kraj: formatDate(maxDate)
    };

    fetch('/api/dogadjaji/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchData)
    })
        .then(response => response.json())
        .then(data => {
            console.log('Approved dogadjaji search response:', data);
            if (data.success && data.results && data.results.length > 0) {
                console.log(`Found ${data.results.length} approved dogadjaji in time window`);
                let markersAdded = 0;
                data.results.forEach(record => {
                    console.log('Processing approved dogadjaj:', record.id, 'koordinate:', record.koordinate);
                    if (record.koordinate && record.koordinate.trim() !== '') {
                        const coordMatch = record.koordinate.match(/POINT\s*\(\s*([\d.-]+)\s+([\d.-]+)\s*\)/i);
                        if (coordMatch) {
                            const lng = parseFloat(coordMatch[1]);
                            const lat = parseFloat(coordMatch[2]);

                            const calendarIcon = L.icon({
                                iconUrl: '/ikone/calendar.png',
                                iconSize: [32, 37],
                                iconAnchor: [16, 37],
                                popupAnchor: [0, -30]
                            });

                            // Create detailed popup content for approved dogadjaji
                            const popupContent = `
                                <div style="min-width: 200px;">
                                    <div style="font-weight: bold; margin-bottom: 5px; color: #27ae60;">Одобрен догађај</div>
                                    <div style="margin-bottom: 3px;"><b>ID:</b> ${record.id}</div>
                                    <div style="margin-bottom: 3px;"><b>Опис:</b> ${record.opis || ''}</div>
                                    <div style="margin-bottom: 3px;"><b>Почетак:</b> ${record.pocetak || ''}</div>
                                    <div style="margin-bottom: 3px;"><b>Крај:</b> ${record.kraj || ''}</div>
                                    <div style="margin-bottom: 3px;"><b>Корисник:</b> ${record.korisnik || ''}</div>
                                </div>
                            `;

                            const marker = L.marker([lat, lng], { icon: calendarIcon })
                                .addTo(karta)
                                .bindPopup(popupContent);

                            window.dogadjajiApprovalMarkers.push(marker);
                            markersAdded++;
                            console.log('Added approved dogadjaj marker at:', lat, lng);
                        } else {
                            console.log('Could not parse coordinates for approved dogadjaj:', record.id);
                        }
                    } else {
                        console.log('No coordinates for approved dogadjaj:', record.id);
                    }
                });
                console.log(`Total approved dogadjaji markers added: ${markersAdded}`);
            } else {
                console.log('No approved dogadjaji found in time window or request failed');
            }
        })
        .catch(error => {
            console.error('Error fetching approved dogadjaji:', error);
        });
}

// Clear all dogadjaji approval markers and overlays
function clearMapForDogadjajiApproval() {
    // Remove all markers
    if (window.dogadjajiApprovalMarkers && window.dogadjajiApprovalMarkers.length > 0) {
        window.dogadjajiApprovalMarkers.forEach(marker => {
            karta.removeLayer(marker);
        });
        window.dogadjajiApprovalMarkers = [];
    }
}

// ============================================
// Counter Sync functionality
// ============================================

function initCounterSync() {
    $('#btn_sync_counters').on('click', function () {
        syncCounters();
    });
}

function syncCounters() {
    const alertsDiv = $('#brojaca_alerts');
    const loadingDiv = $('#brojaca_loading');

    alertsDiv.hide().text('');
    loadingDiv.show();

    fetch('/api/urednik/sync-counters', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            loadingDiv.hide();

            if (data.success) {
                alertsDiv.css('color', 'green').text(data.message).show();

                // Hide message after 5 seconds
                setTimeout(() => {
                    alertsDiv.fadeOut();
                }, 5000);
            } else {
                alertsDiv.css('color', 'orange').text(data.error || 'Грешка при синхронизацији').show();
            }
        })
        .catch(error => {
            loadingDiv.hide();
            console.error('Error syncing counters:', error);
            alertsDiv.css('color', 'orange').text('Грешка при комуникацији са сервером').show();
        });
}


// Ensure the function is checking on global scope if needed - though karta.js calls it directly from window
window.initUrednikSection = initUrednikSection;

// Initialize approval systems when urednik section loads
$(document).ready(function () {
    initZapisiApproval();
    initDogadjajiApproval();
    initCounterSync();
});
