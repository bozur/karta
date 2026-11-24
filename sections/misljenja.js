// Misljenja (Comments/Discussions) section functionality

$(document).ready(function () {
    console.log('Misljenja section loaded');
    initializeMisljenja();
});

function initializeMisljenja() {
    const accordion = $('#misljenja_accordion');
    if (accordion.length === 0 || accordion.data('initialized')) {
        return;
    }
    accordion.data('initialized', true);

    console.log('Initializing misljenja section...');

    loadMisljenjaThemes();

    $('#misljenja_trazi_form').off('submit').on('submit', function (e) {
        e.preventDefault();
        handleMisljenjaSearch();
    });

    $('#misljenja_trazi_tema, #misljenja_trazi_sort').off('change').on('change', function () {
        handleMisljenjaSearch();
    });

    // Load latest 100 comments automatically on tab open
    handleMisljenjaSearch(true);
}

window.initMisljenjaSection = initializeMisljenja;

function loadMisljenjaThemes() {
    fetch('/api/v2/themes')
        .then(response => response.json())
        .then(data => {
            const themes = data.themes || [];
            const select = $('#misljenja_trazi_tema');

            // Keep the first two options: "-- све теме --" and "Догађаји"
            select.find('option:gt(1)').remove();

            themes.forEach(theme => {
                const id = theme.id || theme.ID;
                const naziv = theme.naziv || theme.NAZIV;
                if (id && naziv) {
                    select.append(`<option value="${id}">${escapeMisljenjaHtml(naziv)}</option>`);
                }
            });
        })
        .catch(error => {
            console.error('Error loading themes for misljenja:', error);
        });
}

function escapeMisljenjaHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatMisljenjeDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}.`;
}

function hasMisljenjaFilters() {
    return Boolean(
        $('#misljenja_trazi_tema').val() ||
        ($('#misljenja_trazi_tekst').val() || '').trim() ||
        ($('#misljenja_trazi_korisnik').val() || '').trim() ||
        $('#misljenja_trazi_sort').val() !== 'newest'
    );
}

function handleMisljenjaSearch(isInitial) {
    const searchData = {
        tema: $('#misljenja_trazi_tema').val() || '',
        sort: $('#misljenja_trazi_sort').val() || 'newest',
        tekst: ($('#misljenja_trazi_tekst').val() || '').trim(),
        korisnik: ($('#misljenja_trazi_korisnik').val() || '').trim(),
        limit: 100
    };

    const errorDiv = $('#misljenja_trazi_error');
    const spinner = $('#misljenja_trazi_cekanje');

    errorDiv.hide().text('');
    spinner.css('visibility', 'visible');

    fetch('/api/misljenja/search', {
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
                const filtered = !isInitial && hasMisljenjaFilters();
                const title = filtered
                    ? `Приказано мишљења: ${data.results.length}`
                    : `Последњих ${Math.min(100, data.results.length)} мишљења`;
                displayMisljenjaResults(data.results, title);
            } else {
                errorDiv.text(data.error || 'Грешка при учитавању мишљења').show();
            }
        })
        .catch(error => {
            spinner.css('visibility', 'hidden');
            console.error('Error loading misljenja:', error);
            errorDiv.text('Грешка при учитавању мишљења').show();
        });
}

function displayMisljenjaResults(results, titleText) {
    const listContainer = $('#misljenja_results_list');
    const resultsWrapper = $('#misljenja_results');
    const resultsTitle = $('#misljenja_results_title');

    listContainer.empty();

    if (titleText) {
        resultsTitle.text(titleText).show();
    } else {
        resultsTitle.hide().text('');
    }

    if (!results || results.length === 0) {
        listContainer.append(`
            <div style="padding: 10px; text-align: center; color: #666;">
                Нема мишљења за изабране услове.
            </div>
        `);
    } else {
        results.forEach(item => {
            const safeAuthor = escapeMisljenjaHtml(item.author);
            const safeTema = escapeMisljenjaHtml(item.tema_naziv);
            const safeContent = escapeMisljenjaHtml(item.content);
            const dateText = formatMisljenjeDate(item.created);
            const replyBadge = item.parent ? ' <span class="text-muted">(одговор)</span>' : '';
            const repliesCountHtml = item.reply_count > 0
                ? `<span title="одговори"><i class="bi bi-chat-left-text"></i> ${item.reply_count}</span>`
                : '';

            const el = $(`
                <div class="misljenje-item" title="Прикажи ставку на карти и отвори мишљења">
                    <div class="misljenje-meta">
                        <span>
                            <span class="misljenje-tema">${safeTema} #${item.target_id}</span>${replyBadge}
                            &middot; <strong>${safeAuthor}</strong>
                            ${dateText ? '&middot; ' + dateText : ''}
                        </span>
                        <span class="misljenje-stats">
                            <span class="misljenje-up" title="одобравања"><i class="bi bi-hand-thumbs-up"></i> ${item.upvote_count}</span>
                            <span class="misljenje-down" title="неслагања"><i class="bi bi-hand-thumbs-down"></i> ${item.downvote_count}</span>
                            ${repliesCountHtml}
                        </span>
                    </div>
                    <div class="misljenje-content">${safeContent}</div>
                </div>
            `);

            el.on('click', function () {
                openMisljenjeTarget(item.target_type, item.target_id, item.id);
            });

            listContainer.append(el);
        });
    }

    resultsWrapper.show();
}

function openMisljenjeTarget(targetType, targetId, commentId) {
    if (window.innerWidth <= 768) {
        $('#section-content').removeClass('in');
    }

    if (targetType === 'dogadjaji') {
        if (typeof window.viewDogadjaj === 'function') {
            window.viewDogadjaj(targetId);
        } else {
            $.getScript('sections/dogadjaji.js?v=' + new Date().getTime())
                .done(function () {
                    if (typeof window.viewDogadjaj === 'function') {
                        window.viewDogadjaj(targetId);
                    }
                })
                .fail(function () {
                    console.error('Failed to load dogadjaji.js for viewing event');
                });
        }
        return;
    }

    if (typeof window.openPointOnMapAndSidebar === 'function') {
        window.openPointOnMapAndSidebar(targetType, targetId, commentId);
    }
}
