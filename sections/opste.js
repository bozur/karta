// Opste (General) section functionality

// This code is executed when opste section is loaded
$(document).ready(function () {
    console.log('Opste section loaded');
    ucitajNovosti();
    ucitajStatistiku();
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
            const vaznost = Number(item.vaznost) || 0;

            if (vaznost === 2) {
                row.className = 'novost-jako-vazna';
            } else if (vaznost === 1) {
                row.className = 'novost-vazna';
            } else {
                row.className = 'novost-obicna';
            }

            const date = new Date(item.vrijeme);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const dateStr = `${day}.${month}.${year}.`;

            const iconHtml = vaznost === 2
                ? '<i class="bi bi-star-fill mr-1" style="color: #e09100; font-size: 0.78rem;" title="јако важна новост"></i>'
                : (vaznost === 1
                    ? '<i class="bi bi-bookmark-fill mr-1" style="color: #2b7a78; font-size: 0.75rem;" title="важна новост"></i>'
                    : '');
            const opisStyle = vaznost === 2 ? 'font-weight: 500;' : '';

            row.innerHTML = `
                <td style="padding: 6px 10px 6px 6px; width: 1%; white-space: nowrap; vertical-align: top; color: #555; font-size: 0.85rem; border-bottom: 1px solid #eee;">${dateStr}</td>
                <td style="padding: 6px 6px 6px 4px; vertical-align: top; border-bottom: 1px solid #eee; ${opisStyle}">${iconHtml}${item.opis}</td>
            `;

            tabela.appendChild(row);
        });

    } catch (err) {
        console.error('Error loading novosti:', err);
        tabela.innerHTML = '<tr><td colspan="2" style="padding: 5px; color: red;">Грешка при учитавању новости.</td></tr>';
    }
}

async function ucitajStatistiku() {
    try {
        const response = await fetch('/api/opste/stats');
        if (!response.ok) throw new Error('Failed to fetch stats');

        const data = await response.json();

        // Populate Pregled section
        const pregled = data.pregled;
        document.getElementById('pregled-novosti').innerText = pregled.novosti;
        document.getElementById('pregled-tema').innerText = pregled.tema;
        document.getElementById('pregled-stavki').innerText = pregled.stavki;
        document.getElementById('pregled-dogadjaja').innerText = pregled.dogadjaja;
        document.getElementById('pregled-zapisa').innerText = pregled.zapisa;
        document.getElementById('pregled-korisnika').innerText = pregled.korisnika;

        // Populate Izbor Saradnika section
        const lista = document.getElementById('opste_izbor_lista');
        if (lista) {
            lista.innerHTML = '';
            data.izbor.forEach((u, index) => {
                const div = document.createElement('div');
                div.style.marginBottom = '5px';
                // User requirement format: (total points for best contributor) followed by username
                // (stavki:) with number of objects
                // (događaja:) with number of records in dogadjaji
                // (zapisa:) with number of records in zapisi
                div.innerHTML = `${index + 1}. <strong>${u.points}</strong> ${u.username} (ставки: ${u.stavki}, догађаја: ${u.dogadjaja}, записа: ${u.zapisa})`;
                lista.appendChild(div);
            });
        }

    } catch (err) {
        console.error('Error loading statistics:', err);
    }
}

// Ensure the functions are checking on global scope if needed
window.ucitajNovosti = ucitajNovosti;
window.ucitajStatistiku = ucitajStatistiku;
