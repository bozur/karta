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

// Ensure the function is checking on global scope if needed - though karta.js calls it directly from window
window.initUrednikSection = initUrednikSection;
