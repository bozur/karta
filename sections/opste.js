// Opste (General) section functionality

// This code is executed when opste section is loaded
$(document).ready(function () {
    console.log('Opste section loaded');
    ucitajNovosti();
});

async function ucitajNovosti() {
    const tabela = document.getElementById('opste_novosti_tabela');
    if (!tabela) return;

    try {
        const response = await fetch('/api/novosti');
        if (!response.ok) throw new Error('Failed to fetch news');

        const data = await response.json();

        tabela.innerHTML = ''; // Clear loading/placeholder

        if (data.length === 0) {
            tabela.innerHTML = '<tr><td colspan="2" style="padding: 5px;">Нема новости.</td></tr>';
            return;
        }

        data.forEach(item => {
            const row = document.createElement('tr');

            // Format time (assuming datetime2 string from SQL)
            // Example: 2025-12-17T17:55:32.000Z
            const date = new Date(item.vrijeme);
            const dateStr = date.toLocaleDateString('sr-RS'); // e.g. 17.12.2025.

            row.innerHTML = `
                <td style="padding: 5px; width: 120px; border-bottom: 1px solid #eee;">${dateStr}</td>
                <td style="padding: 5px; border-bottom: 1px solid #eee;">${item.opis}</td>
            `;

            tabela.appendChild(row);
        });

    } catch (err) {
        console.error('Error loading novosti:', err);
        tabela.innerHTML = '<tr><td colspan="2" style="padding: 5px; color: red;">Грешка при учитавању новости.</td></tr>';
    }
}

// Ensure the function is checking on global scope if needed
window.ucitajNovosti = ucitajNovosti;
