// Urednik (Editor) section functionality

function initUrednikSection() {
    console.log('Urednik section initialized');
    initReportedComments();

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

// Reported Comments (Primjedbe) functionality
function initReportedComments() {
    // Load reported comments when section is expanded
    $('#urednik_primedbe_podaci').on('shown.bs.collapse', function () {
        loadReportedComments();
    });
}

function loadReportedComments() {
    const alertsDiv = $('#primedbe_alerts');
    const loadingDiv = $('#primedbe_loading');
    const resultsDiv = $('#primedbe_results');

    alertsDiv.hide().text('');
    loadingDiv.show();
    resultsDiv.hide();

    fetch('/api/urednik/comments/reported')
        .then(response => response.json())
        .then(data => {
            loadingDiv.hide();
            if (data.success) {
                displayReportedComments(data.results);
            } else {
                alertsDiv.text(data.error || 'Грешка при учитавању').show();
            }
        })
        .catch(error => {
            loadingDiv.hide();
            console.error('Error loading reported comments:', error);
            alertsDiv.text('Грешка при комуникацији са сервером').show();
        });
}

function displayReportedComments(results) {
    const tbody = $('#primedbe_body');
    const resultsDiv = $('#primedbe_results');
    const alertsDiv = $('#primedbe_alerts');

    tbody.empty();

    if (results.length === 0) {
        alertsDiv.css('color', 'green').text('Нема пријављених примједби.').show();
        resultsDiv.hide();
        return;
    }

    results.forEach(record => {
        // Calculate display name (fullname fallback)
        const fullname = record.korisnik || (record.ime ? (record.ime + (record.prezime ? ' ' + record.prezime : '')) : (record.eposta ? record.eposta.split('@')[0] : 'Anonymous'));
        const profilePicture = record.author_picture_url || 'slike/user-icon.png';
        const formattedDate = new Date(record.created).toLocaleDateString('sr-RS').replace(/\/$/, '') + '.';

        // Metadata row (Row 1)
        const metadataRow = $(`
            <tr style="background-color: #f5f5f5; border-top: 1px solid #ddd;">
                <td style="padding: 5px; font-size: 0.8rem; color: #666;">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <div>
                            <b>ID:</b> ${record.id} | 
                            <b>запис ID:</b> ${record.target_id} | 
                            <b>тема:</b> ${record.theme_name || record.target_type}
                        </div>
                        <i class="bi bi-trash text-danger" style="cursor: pointer; font-size: 1.1rem; padding: 0 5px;" onclick="deleteReportedComment(${record.id})" title="обриши"></i>
                    </div>
                </td>
            </tr>
        `);

        // Comment row (Row 2) - Styled to match jquery-comments but simplified
        const commentRow = $(`
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;">
                    <div style="display: flex; gap: 10px;">
                        <img src="${profilePicture}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                <div style="font-weight: bold; font-size: 0.9rem;">${fullname}</div>
                                <div style="font-size: 0.8rem; color: #999; display: flex; align-items: center; gap: 12px;">
                                    <span>${formattedDate}</span>
                                    <span style="display: flex; align-items: center; gap: 3px;">
                                        <i class="bi bi-hand-thumbs-up" style="color: green;"></i> ${record.upvote_count || 0}
                                    </span>
                                    <span style="display: flex; align-items: center; gap: 3px;">
                                        <i class="bi bi-hand-thumbs-down" style="color: red;"></i> ${record.downvote_count || 0}
                                    </span>
                                </div>
                            </div>
                            <div style="font-size: 0.9rem; white-space: pre-wrap;">${record.content}</div>
                        </div>
                    </div>
                </td>
            </tr>
        `);

        tbody.append(metadataRow);
        tbody.append(commentRow);
    });

    resultsDiv.show();
}

function deleteReportedComment(id) {
    // Confirmation removed as per user request
    const alertsDiv = $('#primedbe_alerts');
    alertsDiv.hide().text('');

    fetch(`/api/comments/${id}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (response.ok) {
                alertsDiv.css('color', 'green').text('Коментар је успјешно обрисан.').show();
                setTimeout(() => {
                    loadReportedComments();
                }, 1000);
            } else {
                return response.json().then(data => {
                    throw new Error(data.error || 'Грешка при брисању');
                });
            }
        })
        .catch(error => {
            console.error('Error deleting comment:', error);
            alertsDiv.css('color', 'orange').text(error.message).show();
        });
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

                // Use standard marker assets with orange filter
                const orangeIcon = L.icon({
                    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41],
                    className: 'marker-orange'
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

                const marker = L.marker([lat, lng], { icon: orangeIcon })
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


// ============================================
// Stavke Approval functionality
// ============================================

function initStavkeApproval() {
    // Load pending summary when section is expanded or when returning from detail
    $('#urednik_odobravanje_stavki_podaci').on('shown.bs.collapse', function () {
        loadPendingStavkeSummary();
    });

    // Back to summary button
    $('#btn_back_to_stavke_summary').on('click', function () {
        loadPendingStavkeSummary();
    });

    // Header checkbox for "approve all"
    $('#stavke_approve_all').on('change', function () {
        const isChecked = $(this).is(':checked');
        if (isChecked) {
            $('#stavke_delete_all').prop('checked', false);
            $('.stavke-delete-checkbox').prop('checked', false);
        }
        $('.stavke-approve-checkbox').prop('checked', isChecked);
    });

    // Header checkbox for "delete all"
    $('#stavke_delete_all').on('change', function () {
        const isChecked = $(this).is(':checked');
        if (isChecked) {
            $('#stavke_approve_all').prop('checked', false);
            $('.stavke-approve-checkbox').prop('checked', false);
        }
        $('.stavke-delete-checkbox').prop('checked', isChecked);
    });

    // Execute button
    $('#btn_izvrsi_stavke').on('click', function () {
        processStavkeApproval();
    });
}

function loadPendingStavkeSummary() {
    const alertsDiv = $('#stavke_approval_alerts');
    const loadingDiv = $('#stavke_approval_loading');
    const summaryDiv = $('#stavke_approval_summary');
    const detailDiv = $('#stavke_approval_detail');

    alertsDiv.hide().text('');
    loadingDiv.show();
    summaryDiv.hide();
    detailDiv.hide();

    // Clear all existing map layers when entering approval section summary
    if (typeof clearAllMapLayers === 'function') clearAllMapLayers();
    if (typeof clearMapForStavkeApproval === 'function') clearMapForStavkeApproval();

    fetch('/api/v2/urednik/stavke/pending-summary')
        .then(response => response.json())
        .then(data => {
            loadingDiv.hide();
            if (data.success) {
                displayPendingStavkeSummary(data.results);
            } else {
                alertsDiv.text(data.error || 'Грешка при учитавању извјештаја').show();
            }
        })
        .catch(error => {
            loadingDiv.hide();
            console.error('Error loading stavke summary:', error);
            alertsDiv.text('Грешка при комуникацији са сервером').show();
        });
}

function displayPendingStavkeSummary(results) {
    const listGroup = $('#stavke_summary_list');
    const emptyMsg = $('#stavke_summary_empty');
    const summaryDiv = $('#stavke_approval_summary');

    listGroup.empty();
    if (!results || results.length === 0) {
        emptyMsg.show();
    } else {
        emptyMsg.hide();
        results.forEach(theme => {
            const item = $(`
                <a href="#" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" data-id="${theme.id}" data-name="${theme.naziv}">
                    ${theme.naziv}
                    <span class="badge badge-warning badge-pill">${theme.count}</span>
                </a>
            `);
            item.on('click', function (e) {
                e.preventDefault();
                loadStavkeApprovalDetail($(this).data('id'), $(this).data('name'));
            });
            listGroup.append(item);
        });
    }
    summaryDiv.show();
}

function loadStavkeApprovalDetail(temaId, themeName) {
    const alertsDiv = $('#stavke_approval_alerts');
    const loadingDiv = $('#stavke_approval_loading');
    const summaryDiv = $('#stavke_approval_summary');
    const detailDiv = $('#stavke_approval_detail');

    alertsDiv.hide().text('');
    loadingDiv.show();
    summaryDiv.hide();
    detailDiv.hide();

    // Store current theme ID for processing
    window.currentStavkeThemeId = temaId;

    fetch(`/api/v2/urednik/stavke/pending/${temaId}`)
        .then(response => response.json())
        .then(data => {
            loadingDiv.hide();
            if (data.success) {
                displayPendingStavke(data, temaId, themeName);
            } else {
                alertsDiv.text(data.error || 'Грешка при учитавању детаља').show();
            }
        })
        .catch(error => {
            loadingDiv.hide();
            console.error('Error loading stavke details:', error);
            alertsDiv.text('Грешка при комуникацији са сервером').show();
        });
}

function displayPendingStavke(data, temaId, themeName) {
    const tbody = $('#stavke_approval_body');
    const detailDiv = $('#stavke_approval_detail');
    const themeNameSpan = $('#stavke_detail_theme_name');

    themeNameSpan.text(themeName);
    tbody.empty();
    $('#stavke_approve_all').prop('checked', false);
    $('#stavke_delete_all').prop('checked', false);

    // CRITICAL: Populate themeOptionsCache for the left sidebar in karta.js
    // window.themeOptionsCache[tabela] = [razredArray, vrstaArray, podvrstaArray]
    if (typeof window.themeOptionsCache === 'undefined') window.themeOptionsCache = {};
    window.themeOptionsCache[temaId] = [
        data.options.razred || {},
        data.options.vrsta || {},
        data.options.podvrsta || {}
    ];

    const pending = data.pending;
    const options = data.options;

    // Date formatting: Backend returns ISO, we want DD.MM.YYYY HH:mm
    const formatDate = (isoStr) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr;
        return d.getDate().toString().padStart(2, '0') + '.' +
            (d.getMonth() + 1).toString().padStart(2, '0') + '.' +
            d.getFullYear() + ' ' +
            d.getHours().toString().padStart(2, '0') + ':' +
            d.getMinutes().toString().padStart(2, '0');
    };

    pending.forEach(record => {
        const razredText = options.razred[record.razred] || record.razred || '';
        const vrstaText = options.vrsta[record.vrsta] || record.vrsta || '';
        const podvrstaText = options.podvrsta[record.podvrsta] || record.podvrsta || '';

        record.vrijeme0_fmt = formatDate(record.vrijeme0);
        record.vrijeme1_fmt = formatDate(record.vrijeme1);

        const row = $(`
            <tr style="border-bottom: 1px solid #eee; cursor: pointer;" data-id="${record.ID}">
                <td style="padding: 3px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${record.opis || ''}</td>
                <td style="padding: 3px;">${razredText}</td>
                <td style="padding: 3px;">${vrstaText}</td>
                <td style="padding: 3px;">${podvrstaText}</td>
                <td style="padding: 3px;">${record.vrijeme0_fmt}</td>
                <td style="padding: 3px;">${record.vrijeme1_fmt}</td>
                <td style="padding: 3px;">${record.korisnik || ''}</td>
                <td style="padding: 3px; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${record.izvor || ''}</td>
                <td style="padding: 3px;">
                    ${record.zapis ? `<a href="/api/zapisi/${record.zapis}" target="_blank" class="zapis-link-table">${record.zapis_naziv || record.zapis}</a>` : ''}
                </td>
                <td style="padding: 3px; text-align: center;">
                    <input type="checkbox" class="stavke-approve-checkbox" data-id="${record.ID}">
                </td>
                <td style="padding: 3px; text-align: center;">
                    <input type="checkbox" class="stavke-delete-checkbox" data-id="${record.ID}">
                </td>
            </tr>
        `);

        row.on('click', function (e) {
            if ($(e.target).is('input[type="checkbox"]')) return;
            showPendingStavkaOnMap(record.ID);
        });

        tbody.append(row);
    });

    // Individual checkbox logic
    $('.stavke-approve-checkbox').on('change', function () {
        if ($(this).is(':checked')) {
            $(`.stavke-delete-checkbox[data-id="${$(this).data('id')}"]`).prop('checked', false);
        }
    });
    $('.stavke-delete-checkbox').on('change', function () {
        if ($(this).is(':checked')) {
            $(`.stavke-approve-checkbox[data-id="${$(this).data('id')}"]`).prop('checked', false);
        }
    });

    detailDiv.show();

    // Update markers on map
    updateMapForStavkeApproval(data, temaId);
}

function showPendingStavkaOnMap(recordId) {
    if (window.stavkeApprovalMarkers) {
        const marker = window.stavkeApprovalMarkers.find(m => m.options && m.options.recordId === recordId && m.options.isPending);
        if (marker) {
            if (marker.getLatLng) {
                // Point
                karta.panTo(marker.getLatLng());
                marker.openPopup();
            } else if (marker.getBounds) {
                // Polyline/Polygon GeoJSON layer group
                const bounds = marker.getBounds();
                if (bounds.isValid()) {
                    karta.fitBounds(bounds);
                    // For layers, we need to find a layer inside that has a popup or open at center
                    const layers = marker.getLayers ? marker.getLayers() : [];
                    if (layers.length > 0) {
                        layers[0].openPopup();
                    } else if (marker.openPopup) {
                        marker.openPopup(bounds.getCenter());
                    }
                }
            }
        }
    }
}

function updateMapForStavkeApproval(data, temaId) {
    clearMapForStavkeApproval();
    if (!window.stavkeApprovalMarkers) window.stavkeApprovalMarkers = [];

    const pending = data.pending;
    const existing = data.existing;
    const options = data.options;

    // Orange marker for pending
    const orangeIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
        className: 'marker-orange'
    });

    const getLatLng = (tacke, tacke0) => {
        try {
            const coords = typeof tacke === 'string' ? JSON.parse(tacke) : tacke;
            if (!coords) return null;
            let lat, lng;
            if (tacke0 === 'Point') {
                lat = coords[1];
                lng = coords[0];
            } else if (tacke0 === 'LineString' && Array.isArray(coords[0])) {
                lat = coords[0][1];
                lng = coords[0][0];
            } else if (tacke0 === 'Polygon' && Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
                lat = coords[0][0][1];
                lng = coords[0][0][0];
            }
            return (isNaN(lat) || isNaN(lng)) ? null : [lat, lng];
        } catch (e) { return null; }
    };

    pending.forEach(record => {
        if (record.tacke) {
            try {
                const razredText = options.razred[record.razred] || record.razred || '';
                const vrstaText = options.vrsta[record.vrsta] || record.vrsta || '';
                const podvrstaText = options.podvrsta[record.podvrsta] || record.podvrsta || '';

                const popupContent = `
                    <div style="min-width: 200px;">
                        <div style="font-weight: bold; margin-bottom: 5px; color: #d35400;">Предлог ставке</div>
                        <hr style="margin: 5px 0;">
                        <div style="margin-bottom: 3px;"><b>Опис:</b> ${record.opis || ''}</div>
                        <div style="margin-bottom: 3px;"><b>Разред:</b> ${razredText}</div>
                        <div style="margin-bottom: 3px;"><b>Врста:</b> ${vrstaText}</div>
                        <div style="margin-bottom: 3px;"><b>Подврста:</b> ${podvrstaText}</div>
                        <div style="margin-bottom: 3px;"><b>Почетак:</b> ${record.vrijeme0_fmt || ''}</div>
                        <div style="margin-bottom: 3px;"><b>Крај:</b> ${record.vrijeme1_fmt || ''}</div>
                        <div style="margin-bottom: 3px;"><b>Корисник:</b> ${record.korisnik || ''}</div>
                        <div style="margin-bottom: 3px;"><b>Извор:</b> ${record.izvor || ''}</div>
                        <div style="margin-bottom: 3px;"><b>Запис:</b> ${record.zapis ? `<a href="/api/zapisi/${record.zapis}" target="_blank" style="color: darkorange;">${record.zapis_naziv || record.zapis}</a>` : ''}</div>
                    </div>
                `;

                if (record.tacke0 === 'Point') {
                    const pos = getLatLng(record.tacke, record.tacke0);
                    if (pos) {
                        const marker = L.marker(pos, { icon: orangeIcon, recordId: record.ID, isPending: true })
                            .addTo(karta)
                            .bindPopup(popupContent);
                        window.stavkeApprovalMarkers.push(marker);
                    }
                } else {
                    const coords = JSON.parse(record.tacke);
                    const geojson = {
                        type: "Feature",
                        geometry: {
                            type: record.tacke0,
                            coordinates: coords
                        },
                        properties: {
                            id: record.ID
                        }
                    };

                    const layer = L.geoJSON(geojson, {
                        style: { color: "#d35400", weight: 5, opacity: 0.8 },
                        onEachFeature: function (feature, layer) {
                            layer.bindPopup(popupContent);
                        }
                    }).addTo(karta);

                    // Critical: Attach metadata to the group and each layer for identification
                    layer.options = layer.options || {};
                    layer.options.recordId = record.ID;
                    layer.options.isPending = true;

                    layer.eachLayer(l => {
                        l.options = l.options || {};
                        l.options.recordId = record.ID;
                        l.options.isPending = true;
                    });

                    window.stavkeApprovalMarkers.push(layer);
                }
            } catch (e) {
                console.error('Error rendering pending geometry', record.ID, e);
            }
        }
    });

    existing.forEach(record => {
        const pos = getLatLng(record.tacke, record.tacke0);
        if (pos) {
            const icon = typeof window.createIcon === 'function' ? window.createIcon(record.razred, temaId) : new L.Icon.Default();
            const popupLabel = options.vrsta[record.vrsta] || record.vrsta || '';
            const popupContent = `<a href="#" class="detalji" pointinfo="${record.ID}"><i class="bi bi-book"></i></a> ${popupLabel}`;

            const marker = L.marker(pos, { icon: icon, recordId: record.ID, isPending: false })
                .addTo(karta)
                .bindPopup(popupContent);

            marker.on('popupopen', function () {
                window.tabela = temaId;
            });

            window.stavkeApprovalMarkers.push(marker);
        }
    });

    if (window.stavkeApprovalMarkers.length > 0) {
        // filter for layers that can be added to featureGroup
        const group = new L.featureGroup(window.stavkeApprovalMarkers.filter(m => m.addTo || m.getBounds));
        try {
            const bounds = group.getBounds();
            if (bounds && bounds.isValid()) {
                karta.fitBounds(bounds.pad(0.1));
            }
        } catch (e) {
            console.warn('Could not fit bounds', e);
        }
    }
}

function openLeftSidebarForStavka(id, themeId) {
    // Replicate logic from karta.js to open sidebar for an existing object
    // We need to set window.tabela to themeId so the detail fetch knows which table to use
    const oldTabela = window.tabela;
    window.tabela = themeId;

    // Use a temporary link trick to trigger the delegated click handler in karta.js
    const tempLink = $(`<a href="#" class="detalji" pointinfo="${id}"></a>`).appendTo('body');
    tempLink.click();
    tempLink.remove();

    // Note: window.tabela might need to stay themeId if the sidebar detail fetch is async
    // In karta.js: $.getJSON('api/points/' + idpoint + '?table=' + tabela, ...)
}

function clearMapForStavkeApproval() {
    if (window.stavkeApprovalMarkers) {
        window.stavkeApprovalMarkers.forEach(m => karta.removeLayer(m));
        window.stavkeApprovalMarkers = [];
    }
}

function processStavkeApproval() {
    const approveIds = [];
    const deleteIds = [];

    $('.stavke-approve-checkbox:checked').each(function () {
        approveIds.push($(this).data('id'));
    });
    $('.stavke-delete-checkbox:checked').each(function () {
        deleteIds.push($(this).data('id'));
    });

    if (approveIds.length === 0 && deleteIds.length === 0) {
        const alertsDiv = $('#stavke_approval_alerts');
        alertsDiv.css('color', 'orange').text('Изаберите ставке за обраду').show();
        setTimeout(() => alertsDiv.hide(), 3000);
        return;
    }

    const alertsDiv = $('#stavke_approval_alerts');
    const loadingDiv = $('#stavke_approval_loading');
    const detailDiv = $('#stavke_approval_detail');

    alertsDiv.hide().text('');
    loadingDiv.show();

    fetch('/api/v2/urednik/stavke/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tema_id: window.currentStavkeThemeId,
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
                setTimeout(() => {
                    loadPendingStavkeSummary();
                }, 1500);
            } else {
                alertsDiv.css('color', 'orange').text(data.error || 'Грешка при обради').show();
            }
        })
        .catch(error => {
            loadingDiv.hide();
            console.error('Error processing stavke:', error);
            alertsDiv.css('color', 'orange').text('Грешка при комуникацији са сервером').show();
        });
}
window.initUrednikSection = initUrednikSection;

// Initialize approval systems when urednik section loads
$(document).ready(function () {
    initZapisiApproval();
    initDogadjajiApproval();
    initStavkeApproval();
    initCounterSync();
    initUserManagement();
    initUrednikStavkeSearch();
});

// ============================================
// User Management functionality
// ============================================

function initUserManagement() {
    // Search button click
    $('#btn_user_search').on('click', function () {
        searchUsers();
    });

    // Search on Enter key
    $('#user_search_input').on('keypress', function (e) {
        if (e.which === 13) {
            searchUsers();
        }
    });

    // Back to search list button
    $('#btn_back_to_user_search').on('click', function () {
        $('#user_detail_panel').hide();
        $('#user_search_results').show();
    });

    // Update user button
    $('#btn_update_user').on('click', function () {
        updateUserStatus();
    });
}

function searchUsers() {
    const query = $('#user_search_input').val().trim();
    if (query.length < 2) {
        return;
    }

    const loadingDiv = $('#user_management_loading');
    const resultsDiv = $('#user_search_results');
    const detailPanel = $('#user_detail_panel');
    const tbody = $('#user_search_body');

    loadingDiv.show();
    resultsDiv.hide();
    detailPanel.hide();

    fetch(`/api/urednik/users/search?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            loadingDiv.hide();
            if (data.success) {
                renderUserResults(data.results);
            } else {
                console.error('User search error:', data.error);
            }
        })
        .catch(error => {
            loadingDiv.hide();
            console.error('Error searching users:', error);
        });
}

function renderUserResults(results) {
    const resultsDiv = $('#user_search_results');
    const tbody = $('#user_search_body');
    tbody.empty();

    if (results.length === 0) {
        tbody.append('<tr><td colspan="3" style="text-align: center; padding: 10px;">Корисник није пронађен</td></tr>');
    } else {
        results.forEach(user => {
            const row = $(`
                <tr style="border-bottom: 1px solid #eee; cursor: pointer;">
                    <td style="padding: 5px;">${user.id}</td>
                    <td style="padding: 5px;">${user.korisnik}</td>
                    <td style="padding: 5px;">${user.eposta}</td>
                </tr>
            `);
            row.on('click', () => showUserDetails(user.id));
            tbody.append(row);
        });
    }

    resultsDiv.show();
}

async function showUserDetails(userId) {
    const loadingDiv = $('#user_management_loading');
    const resultsDiv = $('#user_search_results');
    const detailPanel = $('#user_detail_panel');

    loadingDiv.show();
    resultsDiv.hide();

    try {
        const response = await fetch(`/api/urednik/users/${userId}`);
        const data = await response.json();
        loadingDiv.hide();

        if (data.success) {
            const u = data.user;

            // Populate basic info
            $('#u_detail_name').text(`${u.ime || ''} ${u.prezime || ''}`.trim() || 'Без имена');
            $('#u_detail_username').text(u.korisnik);
            $('#u_detail_email').text(u.eposta);
            $('#u_detail_img').attr('src', u.slika_url || '');

            // Populate stats
            $('#u_detail_p0').text(u.pristup0 ? new Date(u.pristup0).toLocaleDateString('sr-RS') : '-');
            $('#u_detail_p1').text(u.pristup1 ? new Date(u.pristup1).toLocaleDateString('sr-RS') : '-');
            $('#u_detail_count').text(u.brojac_pristupa || 0);
            $('#u_detail_stavki').text(u.brojac_stavki || 0);
            $('#u_detail_dogadjaja').text(u.brojac_dogadjaja || 0);
            $('#u_detail_zapisa').text(u.brojac_zapisa || 0);

            // Populate editable fields
            $('#u_detail_urednik').prop('checked', u.urednik == 1 || u.urednik == true);
            $('#u_detail_moze_ucitati').prop('checked', u.moze_ucitati == 1 || u.moze_ucitati == true);
            $('#u_detail_blokiran').prop('checked', u.blokiran == 1 || u.blokiran == true);
            $('#u_detail_napomena').val(u.napomena || '');

            // Store ID on the update button
            $('#btn_update_user').data('userid', u.id);

            detailPanel.show();
        } else {
            alert(data.error || 'Грешка при учитавању података');
            resultsDiv.show();
        }
    } catch (error) {
        loadingDiv.hide();
        console.error('Error fetching user detail:', error);
        resultsDiv.show();
    }
}

async function updateUserStatus() {
    const userId = $('#btn_update_user').data('userid');
    const urednik = $('#u_detail_urednik').is(':checked');
    const moze_ucitati = $('#u_detail_moze_ucitati').is(':checked');
    const blokiran = $('#u_detail_blokiran').is(':checked');
    const napomena = $('#u_detail_napomena').val().trim();
    const alerts = $('#user_update_alerts');

    alerts.css('color', 'orange').text('Чувам...');

    try {
        const response = await fetch('/api/urednik/users/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: userId, urednik, moze_ucitati, blokiran, napomena })
        });

        const data = await response.json();
        if (data.success) {
            alerts.css('color', 'green').text('Сачувано!');
            setTimeout(() => alerts.text(''), 3000);
        } else {
            alerts.css('color', 'red').text(data.error || 'Грешка');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        alerts.css('color', 'red').text('Грешка на серверу');
    }
}

// ============================================
// Stavke Search and Edit functionality
// ============================================

function initUrednikStavkeSearch() {
    console.log('Initializing urednik stavke search...');

    // Load themes into dropdown
    fetch('/api/v2/themes')
        .then(response => response.json())
        .then(data => {
            const select = $('#stavka_tabela');
            select.find('option:not(:first)').remove();
            data.themes.forEach(theme => {
                select.append(`<option value="${theme.id || theme.ID}">${theme.naziv || theme.NAZIV}</option>`);
            });
        });

    // Load all zapisi for dropdown
    fetch('/api/urednik/all-zapisi')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.allZapisiCache = data.results;
            }
        });

    // Theme change handler
    $('#stavka_tabela').on('change', function () {
        const temaId = $(this).val();
        if (temaId == "0") {
            $('#stavka_razred, #stavka_vrsta, #stavka_podvrsta').find('option:not(:first)').remove();
            return;
        }

        fetch(`/api/v2/theme-options/${temaId}`)
            .then(response => response.json())
            .then(data => {
                const options = data.options;
                const r = $('#stavka_razred').find('option:not(:first)').remove();
                const v = $('#stavka_vrsta').find('option:not(:first)').remove();
                const p = $('#stavka_podvrsta').find('option:not(:first)').remove();

                options.razred.forEach((val, idx) => { if (val) r.append(`<option value="${idx}">${val}</option>`); });
                options.vrsta.forEach((val, idx) => { if (val) v.append(`<option value="${idx}">${val}</option>`); });
                options.podvrsta.forEach((val, idx) => { if (val) p.append(`<option value="${idx}">${val}</option>`); });

                // Cache for onEachFeature
                if (typeof window.themeOptionsCache === 'undefined') window.themeOptionsCache = {};
                window.themeOptionsCache[temaId] = [options.razred, options.vrsta, options.podvrsta];
            });
    });

    // Form submission
    $('#form_pretraga_stavki').on('submit', handleStavkaSearch);

    // Initialize Flatpickr
    if (typeof flatpickr !== 'undefined') {
        flatpickr('.flatpickr-datetime', {
            enableTime: true,
            dateFormat: "Y-m-d H:i",
            locale: "sr",
            time_24hr: true
        });
    }
}

function handleStavkaSearch(e) {
    if (e) e.preventDefault();

    const temaId = $('#stavka_tabela').val();
    if (temaId == "0") {
        $('#stavka_alert_area').text('Тема није изабрана').show();
        return;
    }

    const searchData = {
        tabela: temaId,
        id: $('#stavka_id').val(),
        razred: $('#stavka_razred').val(),
        vrsta: $('#stavka_vrsta').val(),
        podvrsta: $('#stavka_podvrsta').val(),
        od: $('#stavka_od').val(),
        do: $('#stavka_do').val(),
        prostorno: $('#stavka_prostorno').val(),
        vremenski: $('#stavka_vremenski').val(),
        izvor: $('#stavka_izvor').val(),
        opis: $('#stavka_opis').val()
    };

    const spinner = $('#stavka_search_cekanje');
    spinner.css('visibility', 'visible');
    $('#stavka_alert_area').hide();

    // Close sidebar to prevent editing records that might be removed
    if (window.sidebarControl) window.sidebarControl.hide();

    // Clear existing layers
    if (typeof clearAllMapLayers === 'function') clearAllMapLayers();

    $.ajax({
        url: 'api/search',
        type: 'post',
        dataType: 'json',
        data: searchData,
        success: function (data) {
            spinner.css('visibility', 'hidden');
            window.tabela = temaId;

            window.addedGeoJSON = L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    return L.marker(latlng, {
                        icon: typeof window.createIcon === 'function'
                            ? window.createIcon(feature.properties.r, temaId)
                            : new L.Icon.Default()
                    });
                },
                onEachFeature: function (feature, layer) {
                    if (feature.properties && feature.properties.v) {
                        const options = window.themeOptionsCache ? window.themeOptionsCache[temaId] : null;
                        const label = (options && options[1]) ? (options[1][feature.properties.v] || feature.properties.v) : feature.properties.v;
                        layer.bindPopup(`<a href="#" class="stavka-urednik-detalji" data-id="${feature.properties.id}" data-tabela="${temaId}"><i class="bi bi-book"></i></a> ${label}`);
                    }
                }
            }).addTo(karta);

            if (data.features && data.features.length > 0) {
                karta.fitBounds(window.addedGeoJSON.getBounds());
            } else {
                $('#stavka_alert_area').text('Нема резултата').show();
            }

            // Click handler for book icon
            $(document).off('click', '.stavka-urednik-detalji').on('click', '.stavka-urednik-detalji', function (e) {
                e.preventDefault();
                const id = $(this).data('id');
                const tabela = $(this).data('tabela');
                openStavkaEditForm(id, tabela);
            });
        },
        error: function () {
            spinner.css('visibility', 'hidden');
            $('#stavka_alert_area').text('Грешка при претрази').show();
        }
    });
}

function openStavkaEditForm(id, tabela) {
    if (typeof window.sidebarControl === 'undefined') return;

    window.sidebarControl.show();
    $('#sidebar').html('<div class="p-3">Учитавам...</div>');

    $.getJSON(`api/points/${id}?table=${tabela}`, function (data) {
        const options = window.themeOptionsCache ? window.themeOptionsCache[tabela] : [[], [], []];
        const zapisi = window.allZapisiCache || [];

        let html = `
            <div class="p-2" style="font-size: 0.9rem;">
                <div class="mb-2"><strong>Уреди ставку ID: ${id}</strong></div>
                
                <div class="form-group mb-1">
                    <label class="mb-0">Опис:</label>
                    <textarea class="form-control form-control-sm" id="edit_opis" rows="3">${data.opi || ''}</textarea>
                </div>
                <div class="form-group mb-1">
                    <label class="mb-0">Разред:</label>
                    <select class="form-control form-control-sm" id="edit_razred">
                        <option value="">изабери</option>
                        ${options[0].map((v, i) => v ? `<option value="${i}" ${i == data.raz ? 'selected' : ''}>${v}</option>` : '').join('')}
                    </select>
                </div>
                <div class="form-row">
                    <div class="col-6">
                        <div class="form-group mb-1">
                            <label class="mb-0">Врста:</label>
                            <select class="form-control form-control-sm" id="edit_vrsta">
                                <option value="">изабери</option>
                                ${options[1].map((v, i) => v ? `<option value="${i}" ${i == data.vrs ? 'selected' : ''}>${v}</option>` : '').join('')}
                            </select>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="form-group mb-1">
                            <label class="mb-0">Подврста:</label>
                            <select class="form-control form-control-sm" id="edit_podvrsta">
                                <option value="">изабери</option>
                                ${options[2].map((v, i) => v ? `<option value="${i}" ${i == data.pod ? 'selected' : ''}>${v}</option>` : '').join('')}
                            </select>
                        </div>
                    </div>
                </div>
                <div class="form-row">
                    <div class="col-6">
                        <div class="form-group mb-1">
                            <label class="mb-0">Просторно:</label>
                            <select class="form-control form-control-sm" id="edit_prostorno">
                                <option value="1" ${data.prostorno == '1' ? 'selected' : ''}>одређено</option>
                                <option value="0" ${data.prostorno == '0' ? 'selected' : ''}>неодређено</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="form-group mb-1">
                            <label class="mb-0">Временски:</label>
                            <select class="form-control form-control-sm" id="edit_vremenski">
                                <option value="1" ${data.vremenski == '1' ? 'selected' : ''}>одређено</option>
                                <option value="0" ${data.vremenski == '0' ? 'selected' : ''}>неодређено</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="form-row">
                    <div class="col-6">
                        <div class="form-group mb-1">
                            <label class="mb-0">Почетак:</label>
                            <input type="text" class="form-control form-control-sm edit-flatpickr" id="edit_v0" value="${data.vri0 ? data.vri0.replace('T', ' ').substring(0, 16) : ''}">
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="form-group mb-1">
                            <label class="mb-0">Крај:</label>
                            <input type="text" class="form-control form-control-sm edit-flatpickr" id="edit_v1" value="${data.vri1 ? data.vri1.replace('T', ' ').substring(0, 16) : ''}">
                        </div>
                    </div>
                </div>
                <div class="form-group mb-1">
                    <label class="mb-0">Извор:</label>
                    <input type="text" class="form-control form-control-sm" id="edit_izvor" value="${data.izv || ''}">
                </div>
                <div class="form-group mb-2">
                    <label class="mb-0">Запис:</label>
                    <select class="form-control form-control-sm" id="edit_zapis">
                        <option value="">изабери</option>
                        ${zapisi.filter(z => String(z.tema_id) === String(tabela)).map(z => `<option value="${z.id}" ${z.id == data.zapis ? 'selected' : ''}>${z.naziv}</option>`).join('')}
                    </select>
                </div>

                <div class="d-flex justify-content-between align-items-center mt-3" style="min-height: 31px;">
                    <button class="btn btn-sm btn-danger" onclick="deleteStavka(${id}, ${tabela})">Обриши</button>
                    <div id="edit_stavka_msg" style="font-size: 0.8rem; flex-grow: 1; text-align: center; margin: 0 5px; line-height: 1.2;"></div>
                    <button class="btn btn-sm btn-warning" onclick="updateStavka(${id}, ${tabela})">Измијени</button>
                </div>
                <hr>
                <div id="urednik_comments_container"></div>
            </div>
        `;

        $('#sidebar').html(html);

        if (typeof flatpickr !== 'undefined') {
            flatpickr('.edit-flatpickr', {
                enableTime: true,
                dateFormat: "Y-m-d H:i",
                locale: "sr",
                time_24hr: true
            });
        }

        // Initialize comments
        const userProfilePic = window.currentUserProfilePic || 'slike/user-icon.png';

        $('#urednik_comments_container').comments({
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
            scrollContainer: $('.leaflet-sidebar-content'),
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
                    data: { table: tabela, id: id },
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
                data.table = tabela;
                data.id = id;
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
    });
}

function updateStavka(id, tabela) {
    const data = {
        opis: $('#edit_opis').val(),
        razred: $('#edit_razred').val(),
        vrsta: $('#edit_vrsta').val(),
        podvrsta: $('#edit_podvrsta').val(),
        prostorno: $('#edit_prostorno').val(),
        vremenski: $('#edit_vremenski').val(),
        vrijeme0: $('#edit_v0').val(),
        vrijeme1: $('#edit_v1').val(),
        izvor: $('#edit_izvor').val(),
        zapis: $('#edit_zapis').val()
    };

    $('#edit_stavka_msg').css('color', 'orange').text('Чувам...');

    fetch(`/api/urednik/stavke/${tabela}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(res => {
            if (res.success) {
                $('#edit_stavka_msg').css('color', 'green').text(res.message);
                // Refresh marker details if possibly needed, or just allow manual re-search
                setTimeout(() => {
                    handleStavkaSearch(); // Re-run search to see changes
                }, 1500);
            } else {
                $('#edit_stavka_msg').css('color', 'red').text(res.error || 'Грешка');
            }
        });
}

function deleteStavka(id, tabela) {
    if (!confirm('Да ли сте сигурни да желите да обришете овај податак?')) return;

    $('#edit_stavka_msg').css('color', 'orange').text('Бришем...');

    fetch(`/api/urednik/stavke/${tabela}/${id}`, {
        method: 'DELETE'
    })
        .then(response => response.json())
        .then(res => {
            if (res.success) {
                $('#edit_stavka_msg').css('color', 'green').text(res.message);
                setTimeout(() => {
                    window.sidebarControl.hide();
                    handleStavkaSearch(); // Re-run search to remove marker
                }, 1500);
            } else {
                $('#edit_stavka_msg').css('color', 'red').text(res.error || 'Грешка');
            }
        });
}
