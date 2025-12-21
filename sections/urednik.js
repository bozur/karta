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

// Initialize zapisi approval when urednik section loads
$(document).ready(function () {
    initZapisiApproval();
});

// Ensure the function is checking on global scope if needed - though karta.js calls it directly from window
window.initUrednikSection = initUrednikSection;
