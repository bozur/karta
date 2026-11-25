// Urednik (Editor) section functionality

function initUrednikSection() {
    console.log('Urednik section initialized');
    initReportedComments();
    initNovaTema();
    initThemeLocking();
    initUplateAdmin();
    initUrednikBackup();
    loadUrednikSummaryCounts();

    // Novosti insertion & importance management logic
    const btnUnesi = document.getElementById('btn_unesi_novosti');
    const vaznostSelect = document.getElementById('novosti_vaznost');
    const posaljiCheckbox = document.getElementById('novosti_posalji_epostom');

    if (vaznostSelect && posaljiCheckbox) {
        vaznostSelect.addEventListener('change', () => {
            posaljiCheckbox.checked = (vaznostSelect.value === '2');
        });
    }

    if (btnUnesi) {
        btnUnesi.addEventListener('click', async () => {
            const opisArea = document.getElementById('novosti_opis');
            const alertsDiv = document.getElementById('novosti_alerts');
            const opis = opisArea.value.trim();
            const vaznost = vaznostSelect ? parseInt(vaznostSelect.value, 10) : 0;
            const posalji_epostom = posaljiCheckbox ? posaljiCheckbox.checked : (vaznost === 2);

            alertsDiv.innerHTML = ''; // Clear previous alerts

            // Frontend Validation
            if (opis.length < 10) {
                showAlert(alertsDiv, 'Опис мора имати најмање 10 карактера.', 'danger');
                return;
            }
            if (opis.length > 4000) {
                showAlert(alertsDiv, 'Опис не смије бити дужи од 4000 карактера.', 'danger');
                return;
            }

            try {
                const response = await fetch('/api/novosti', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ opis, vaznost, posalji_epostom })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    showAlert(alertsDiv, data.message || 'Новости успјешно додате!', 'success');
                    opisArea.value = '';
                    if (vaznostSelect) vaznostSelect.value = '0';
                    if (posaljiCheckbox) posaljiCheckbox.checked = false;
                    loadUrednikNovosti();
                } else {
                    showAlert(alertsDiv, data.error || 'Грешка при слању података.', 'danger');
                }
            } catch (error) {
                console.error('Error submitting novosti:', error);
                showAlert(alertsDiv, 'Грешка на серверу.', 'danger');
            }
        });
    }

    $('#urednik_novosti_podaci').off('shown.bs.collapse').on('shown.bs.collapse', function () {
        loadUrednikNovosti();
    });
}

function getNovostVaznostStyle(vaznost) {
    if (vaznost === 2) {
        return { border: '#f5a615', bg: '#fff8eb' };
    }
    if (vaznost === 1) {
        return { border: '#2b7a78', bg: '#f0f7f7' };
    }
    return { border: 'transparent', bg: 'transparent' };
}

async function loadUrednikNovosti() {
    const lista = document.getElementById('urednik_novosti_lista');
    const alertsDiv = document.getElementById('novosti_alerts');
    if (!lista) return;

    lista.innerHTML = '<div class="text-muted py-1">Учитавање...</div>';

    try {
        const response = await fetch('/api/novosti');
        if (!response.ok) throw new Error('Failed to fetch news');
        const items = await response.json();

        lista.innerHTML = '';
        if (!items || items.length === 0) {
            lista.innerHTML = '<div class="text-muted py-1">Нема новости.</div>';
            return;
        }

        items.forEach(item => {
            let currentVaznost = Number(item.vaznost) || 0;
            const style = getNovostVaznostStyle(currentVaznost);
            const date = new Date(item.vrijeme);
            const dateStr = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}.`;

            const row = document.createElement('div');
            row.className = 'd-flex align-items-center justify-content-between py-1 px-2 border-bottom';
            row.style.gap = '8px';
            row.style.borderLeft = `3px solid ${style.border}`;
            row.style.backgroundColor = style.bg;

            const textWrap = document.createElement('div');
            textWrap.style.minWidth = '0';
            textWrap.style.flex = '1';
            textWrap.title = item.opis || '';

            const dateSpan = document.createElement('span');
            dateSpan.className = 'text-muted mr-1';
            dateSpan.textContent = dateStr;

            const opisSpan = document.createElement('span');
            const fullText = item.opis || '';
            opisSpan.textContent = fullText.length > 70 ? fullText.slice(0, 70) + '…' : fullText;

            textWrap.appendChild(dateSpan);
            textWrap.appendChild(opisSpan);

            const select = document.createElement('select');
            select.className = 'form-control form-control-sm';
            select.style.width = 'auto';
            select.style.fontSize = '0.78rem';
            select.style.padding = '1px 4px';
            select.style.height = 'auto';
            select.innerHTML = `
                <option value="0">обична</option>
                <option value="1">важна</option>
                <option value="2">јако важна</option>
            `;
            select.value = String(currentVaznost);

            select.addEventListener('change', async () => {
                const newVaznost = parseInt(select.value, 10);
                select.disabled = true;
                try {
                    const res = await fetch(`/api/novosti/${item.id}/vaznost`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ vaznost: newVaznost })
                    });
                    const resData = await res.json();
                    if (res.ok && resData.success) {
                        currentVaznost = newVaznost;
                        const updatedStyle = getNovostVaznostStyle(newVaznost);
                        row.style.borderLeft = `3px solid ${updatedStyle.border}`;
                        row.style.backgroundColor = updatedStyle.bg;
                        if (alertsDiv) showAlert(alertsDiv, 'Важност новости је сачувана.', 'success');
                    } else {
                        select.value = String(currentVaznost);
                        if (alertsDiv) showAlert(alertsDiv, resData.error || 'Грешка при измјени важности.', 'danger');
                    }
                } catch (err) {
                    console.error('Error updating vaznost:', err);
                    select.value = String(currentVaznost);
                    if (alertsDiv) showAlert(alertsDiv, 'Грешка на серверу.', 'danger');
                } finally {
                    select.disabled = false;
                }
            });

            row.appendChild(textWrap);
            row.appendChild(select);
            lista.appendChild(row);
        });
    } catch (err) {
        console.error('Error loading urednik novosti:', err);
        lista.innerHTML = '<div class="text-danger py-1">Грешка при учитавању новости.</div>';
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
    // Load reported comments when section begins expanding (prevent duplicate bindings)
    $('#urednik_primedbe_podaci').off('show.bs.collapse shown.bs.collapse').on('show.bs.collapse', function () {
        loadReportedComments();
    });
}

function loadReportedComments() {
    const alertsDiv = $('#primedbe_alerts');
    const loadingDiv = $('#primedbe_loading');
    const resultsDiv = $('#primedbe_results');
    const hasExisting = $('#primedbe_body').children().length > 0;

    if (!hasExisting) {
        alertsDiv.hide().text('');
        loadingDiv.show();
        resultsDiv.hide();
    }

    fetch('/api/urednik/comments/reported', { cache: 'no-store' })
        .then(response => response.json())
        .then(data => {
            loadingDiv.hide();
            if (data.success) {
                alertsDiv.hide().text('');
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
        alertsDiv.css('color', 'green').text('Нема пријављених мишљења.').show();
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
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <i class="bi bi-check-circle text-success" style="cursor: pointer; font-size: 1.1rem; padding: 0 3px;" onclick="dismissReportedComment(${record.id})" title="прегледано (склони са листе)"></i>
                            <i class="bi bi-trash text-danger" style="cursor: pointer; font-size: 1.1rem; padding: 0 3px;" onclick="deleteReportedComment(${record.id})" title="обриши"></i>
                        </div>
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

function dismissReportedComment(id) {
    const alertsDiv = $('#primedbe_alerts');
    alertsDiv.hide().text('');

    fetch(`/api/urednik/comments/${id}/dismiss`, {
        method: 'POST'
    })
        .then(response => response.json().then(data => ({ ok: response.ok, data })))
        .then(({ ok, data }) => {
            if (ok && data.success) {
                alertsDiv.css('color', 'green').text(data.message || 'Мишљење је означено као прегледано.').show();
                loadReportedComments();
                loadUrednikSummaryCounts();
            } else {
                throw new Error(data.error || 'Грешка при означавању');
            }
        })
        .catch(error => {
            console.error('Error dismissing comment:', error);
            alertsDiv.css('color', 'orange').text(error.message).show();
        });
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
                if (typeof window.refreshCurrentPointDetails === 'function') {
                    window.refreshCurrentPointDetails();
                }
                setTimeout(() => {
                    loadReportedComments();
                    loadUrednikSummaryCounts();
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

// ============================================
// Nova Tema / Uređivanje Tema functionality
// ============================================

window.ntState = {
    mode: 'new',
    stavkiCount: 0,
    zapisiCount: 0,
    zakljucano: true,
    existingCounts: { razred: 0, vrsta: 0, podvrsta: 0 },
    razred: [],
    vrsta: [],
    podvrsta: [],
    galleryTargetIdx: null,
    galleryCache: null
};

function initNovaTema() {
    $('#urednik_nova_tema_podaci').off('show.bs.collapse.nt').on('show.bs.collapse.nt', function () {
        loadNovaTemaSelector();
    });

    $('#nt_tema_select').off('change.nt').on('change.nt', function () {
        const val = $(this).val();
        $('#nt_icon_gallery_panel').hide();
        if (val === 'new') {
            resetNovaTemaForm();
        } else {
            loadThemeForEdit(parseInt(val, 10));
        }
    });

    $('#nt_add_razred').off('click.nt').on('click.nt', function () {
        syncOptionInputsToState();
        if (window.ntState.razred.length >= 99) {
            showNtAlert('Максималан број опција за разред је 99.', 'orange');
            return;
        }
        window.ntState.razred.push({
            text: '',
            originalIdx: null,
            iconUrl: null,
            pendingFile: null,
            pendingGalleryPath: null
        });
        renderNtOptions('razred');
        $('#nt_razred_list input[type="text"]').last().focus();
    });

    $('#nt_add_vrsta').off('click.nt').on('click.nt', function () {
        syncOptionInputsToState();
        if (window.ntState.vrsta.length >= 99) {
            showNtAlert('Максималан број опција за врсту је 99.', 'orange');
            return;
        }
        window.ntState.vrsta.push({ text: '', originalIdx: null });
        renderNtOptions('vrsta');
        $('#nt_vrsta_list input[type="text"]').last().focus();
    });

    $('#nt_add_podvrsta').off('click.nt').on('click.nt', function () {
        syncOptionInputsToState();
        if (window.ntState.podvrsta.length >= 99) {
            showNtAlert('Максималан број опција за подврсту је 99.', 'orange');
            return;
        }
        window.ntState.podvrsta.push({ text: '', originalIdx: null });
        renderNtOptions('podvrsta');
        $('#nt_podvrsta_list input[type="text"]').last().focus();
    });

    $('#nt_close_gallery').off('click.nt').on('click.nt', function () {
        $('#nt_icon_gallery_panel').hide();
        window.ntState.galleryTargetIdx = null;
    });

    $('#nt_btn_save').off('click.nt').on('click.nt', saveNovaTema);
    $('#nt_btn_delete').off('click.nt').on('click.nt', deleteEmptyTheme);

    // Initialize default empty form for "new" mode
    resetNovaTemaForm();
}

function showNtAlert(msg, color) {
    const el = $('#nt_alerts');
    if (!msg) {
        el.hide().text('');
        return;
    }
    el.css('color', color || 'orange').text(msg).show();
}

function loadNovaTemaSelector(selectValueAfter) {
    const select = $('#nt_tema_select');
    const prevVal = selectValueAfter !== undefined ? String(selectValueAfter) : select.val();

    fetch('/api/v2/themes', { cache: 'no-store' })
        .then(r => r.json())
        .then(data => {
            if (!data.themes) return;
            select.find('option:not(:first)').remove();
            data.themes.forEach(t => {
                const isLocked = t.zakljucano === 1 || t.zakljucano === true;
                const label = isLocked ? `🔒 ${t.naziv}` : t.naziv;
                select.append($('<option></option>').val(String(t.id)).text(label));
            });
            if (prevVal && select.find(`option[value="${prevVal}"]`).length > 0) {
                select.val(prevVal);
            } else {
                select.val('new');
            }
        })
        .catch(err => console.error('Error loading themes for editor:', err));
}

function resetNovaTemaForm() {
    window.ntState.mode = 'new';
    window.ntState.stavkiCount = 0;
    window.ntState.zapisiCount = 0;
    window.ntState.zakljucano = true;
    window.ntState.existingCounts = { razred: 0, vrsta: 0, podvrsta: 0 };
    window.ntState.razred = [{
        text: '',
        originalIdx: null,
        iconUrl: null,
        pendingFile: null,
        pendingGalleryPath: null
    }];
    window.ntState.vrsta = [];
    window.ntState.podvrsta = [];
    window.ntState.galleryTargetIdx = null;

    $('#nt_naziv').val('');
    $('#nt_opis').val('');
    $('#nt_status_bar').hide();
    $('#nt_has_data_notice').hide();
    $('#nt_btn_delete').hide();
    $('#nt_icon_gallery_panel').hide();
    $('#nt_btn_save').text('направи тему');
    showNtAlert('');

    renderNtOptions('razred');
    renderNtOptions('vrsta');
    renderNtOptions('podvrsta');
}

function loadThemeForEdit(temaId) {
    showNtAlert('');
    $('#nt_loading').show();
    $('#nt_form_body').hide();

    fetch(`/api/urednik/teme/${temaId}`, { cache: 'no-store' })
        .then(r => r.json().then(body => ({ ok: r.ok, body })))
        .then(({ ok, body }) => {
            $('#nt_loading').hide();
            $('#nt_form_body').show();
            if (!ok || !body.theme) {
                showNtAlert(body.error || 'Грешка при учитавању теме.', 'red');
                return;
            }

            const t = body.theme;
            const opts = body.options || { razred: [], vrsta: [], podvrsta: [] };
            const icons = body.icons || [];

            window.ntState.mode = t.id;
            window.ntState.stavkiCount = body.stavkiCount || 0;
            window.ntState.zapisiCount = body.zapisiCount || 0;
            window.ntState.zakljucano = !!t.zakljucano;
            window.ntState.existingCounts = {
                razred: opts.razred.length,
                vrsta: opts.vrsta.length,
                podvrsta: opts.podvrsta.length
            };

            window.ntState.razred = opts.razred.map((val, idx) => ({
                text: val,
                originalIdx: idx,
                iconUrl: icons[idx] && icons[idx].exists ? icons[idx].url : null,
                pendingFile: null,
                pendingGalleryPath: null
            }));
            window.ntState.vrsta = opts.vrsta.map((val, idx) => ({ text: val, originalIdx: idx }));
            window.ntState.podvrsta = opts.podvrsta.map((val, idx) => ({ text: val, originalIdx: idx }));
            window.ntState.galleryTargetIdx = null;

            $('#nt_naziv').val(t.naziv || '');
            $('#nt_opis').val(t.opis || '');
            $('#nt_btn_save').text('сачувај измјене');

            updateNtStatusBar();
            renderNtOptions('razred');
            renderNtOptions('vrsta');
            renderNtOptions('podvrsta');
        })
        .catch(err => {
            $('#nt_loading').hide();
            $('#nt_form_body').show();
            console.error('Error loading theme for edit:', err);
            showNtAlert('Грешка при комуникацији са сервером.', 'red');
        });
}

function updateNtStatusBar() {
    if (window.ntState.mode === 'new') {
        $('#nt_status_bar').hide();
        $('#nt_has_data_notice').hide();
        $('#nt_btn_delete').hide();
        return;
    }

    const isLocked = window.ntState.zakljucano;
    const badgeHtml = isLocked
        ? '<span class="text-danger"><strong>🔒 закључана</strong></span>'
        : '<span class="text-success"><strong>🔓 откључана</strong></span>';
    $('#nt_status_badge').html(badgeHtml);
    $('#nt_counts_info').text(`ID: ${window.ntState.mode} | ставки: ${window.ntState.stavkiCount} | записа: ${window.ntState.zapisiCount}`);
    $('#nt_status_bar').show();

    if (window.ntState.stavkiCount > 0) {
        $('#nt_has_data_notice').show();
    } else {
        $('#nt_has_data_notice').hide();
    }

    if (isLocked && window.ntState.stavkiCount === 0 && window.ntState.zapisiCount === 0) {
        $('#nt_btn_delete').show();
    } else {
        $('#nt_btn_delete').hide();
    }
}

function syncOptionInputsToState() {
    ['razred', 'vrsta', 'podvrsta'].forEach(tip => {
        const list = window.ntState[tip];
        $(`#nt_${tip}_list .nt-opt-input`).each(function (idx) {
            if (list[idx]) {
                list[idx].text = $(this).val();
            }
        });
    });
}

function renderNtOptions(tip) {
    const container = $(`#nt_${tip}_list`);
    container.empty();
    const list = window.ntState[tip];
    const hasData = window.ntState.mode !== 'new' && window.ntState.stavkiCount > 0;

    if (list.length === 0) {
        container.append('<div class="text-muted" style="font-size: 0.78rem; padding: 2px 0;">нема унесених вриједности</div>');
        return;
    }

    list.forEach((item, idx) => {
        const isLockedExisting = hasData && item.originalIdx !== null;
        const canMoveUp = idx > 0 && !isLockedExisting && !(hasData && list[idx - 1].originalIdx !== null);
        const canMoveDown = idx < list.length - 1 && !isLockedExisting && !(hasData && list[idx + 1].originalIdx !== null);
        const canDelete = !isLockedExisting;

        const row = $('<div class="nt-option-row"></div>');
        row.append(`<span class="nt-idx-badge" title="индекс у бази">${idx}</span>`);

        if (tip === 'razred') {
            const preview = $('<img class="nt-icon-preview" alt="" title="преглед иконице (32×37)">');
            if (item.iconUrl) {
                preview.attr('src', item.iconUrl);
            } else {
                preview.attr('src', 'data:image/svg+xml;utf8,' + encodeURIComponent(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="28"><rect width="24" height="28" fill="#f5f5f5"/><text x="12" y="18" font-size="11" text-anchor="middle" fill="#bbb">?</text></svg>'
                ));
            }
            preview.on('click', () => openIconGalleryForRazred(idx));

            const fileInput = $('<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" style="display: none;">');
            fileInput.on('change', function () {
                const file = this.files && this.files[0];
                if (!file) return;
                if (file.size > 500 * 1024) {
                    showNtAlert('Иконица не смије бити већа од 500 KB.', 'red');
                    this.value = '';
                    return;
                }
                syncOptionInputsToState();
                window.ntState.razred[idx].pendingFile = file;
                window.ntState.razred[idx].pendingGalleryPath = null;
                window.ntState.razred[idx].iconUrl = URL.createObjectURL(file);
                renderNtOptions('razred');
                showNtAlert('');
            });

            const btnUpload = $('<button type="button" class="btn btn-outline-secondary nt-icon-btn" title="отпреми иконицу са рачунара"><i class="bi bi-upload"></i></button>');
            btnUpload.on('click', () => fileInput.trigger('click'));

            const btnGallery = $('<button type="button" class="btn btn-outline-secondary nt-icon-btn" title="изабери из галерије иконица"><i class="bi bi-grid"></i></button>');
            btnGallery.on('click', () => openIconGalleryForRazred(idx));

            row.append(preview, fileInput, btnUpload, btnGallery);
        }

        const input = $('<input type="text" class="form-control form-control-sm nt-opt-input" maxlength="100">')
            .val(item.text || '')
            .attr('placeholder', `назив (${tip})`);
        row.append(input);

        const btnUp = $('<button type="button" class="btn btn-outline-secondary nt-icon-btn" title="помјери горе">▲</button>')
            .prop('disabled', !canMoveUp)
            .on('click', () => {
                syncOptionInputsToState();
                const tmp = list[idx - 1];
                list[idx - 1] = list[idx];
                list[idx] = tmp;
                renderNtOptions(tip);
            });

        const btnDown = $('<button type="button" class="btn btn-outline-secondary nt-icon-btn" title="помјери доле">▼</button>')
            .prop('disabled', !canMoveDown)
            .on('click', () => {
                syncOptionInputsToState();
                const tmp = list[idx + 1];
                list[idx + 1] = list[idx];
                list[idx] = tmp;
                renderNtOptions(tip);
            });

        const btnDel = $('<button type="button" class="btn btn-outline-danger nt-icon-btn" title="уклони">×</button>')
            .prop('disabled', !canDelete)
            .on('click', () => {
                syncOptionInputsToState();
                list.splice(idx, 1);
                if (tip === 'razred' && window.ntState.galleryTargetIdx === idx) {
                    $('#nt_icon_gallery_panel').hide();
                    window.ntState.galleryTargetIdx = null;
                }
                renderNtOptions(tip);
            });

        row.append(btnUp, btnDown, btnDel);
        container.append(row);
    });
}

function openIconGalleryForRazred(idx) {
    syncOptionInputsToState();
    window.ntState.galleryTargetIdx = idx;
    const label = window.ntState.razred[idx]?.text?.trim() || `#${idx}`;
    $('#nt_gallery_target_label').text(`(за разред: ${label})`);
    $('#nt_icon_gallery_panel').show();

    if (window.ntState.galleryCache) {
        renderIconGallery(window.ntState.galleryCache);
        return;
    }

    $('#nt_gallery_loading').show();
    $('#nt_gallery_grid').empty();

    fetch('/api/urednik/ikone', { cache: 'no-store' })
        .then(r => r.json())
        .then(data => {
            $('#nt_gallery_loading').hide();
            window.ntState.galleryCache = data.icons || [];
            renderIconGallery(window.ntState.galleryCache);
        })
        .catch(err => {
            $('#nt_gallery_loading').hide();
            console.error('Error loading icon gallery:', err);
            $('#nt_gallery_grid').html('<div class="text-danger" style="font-size: 0.78rem;">Грешка при учитавању иконица.</div>');
        });
}

function renderIconGallery(icons) {
    const grid = $('#nt_gallery_grid');
    grid.empty();
    if (!icons || icons.length === 0) {
        grid.html('<div class="text-muted" style="font-size: 0.78rem;">Нема доступних иконица.</div>');
        return;
    }

    icons.forEach(ic => {
        const item = $('<div class="nt-gallery-item"></div>')
            .attr('title', ic.path)
            .append($('<img>').attr('src', ic.url).attr('alt', ic.name));
        item.on('click', () => {
            const targetIdx = window.ntState.galleryTargetIdx;
            if (targetIdx === null || !window.ntState.razred[targetIdx]) return;
            syncOptionInputsToState();
            window.ntState.razred[targetIdx].pendingGalleryPath = ic.path;
            window.ntState.razred[targetIdx].pendingFile = null;
            window.ntState.razred[targetIdx].iconUrl = ic.url;
            $('#nt_icon_gallery_panel').hide();
            window.ntState.galleryTargetIdx = null;
            renderNtOptions('razred');
        });
        grid.append(item);
    });
}

async function uploadPendingIcons(temaId, nonEmptyRazred) {
    for (let i = 0; i < nonEmptyRazred.length; i++) {
        const item = nonEmptyRazred[i];
        if (item.pendingFile) {
            const fd = new FormData();
            fd.append('ikona', item.pendingFile);
            const resp = await fetch(`/api/urednik/teme/${temaId}/ikona/${i}`, {
                method: 'POST',
                body: fd
            });
            if (!resp.ok) {
                const errBody = await resp.json().catch(() => ({}));
                throw new Error(errBody.error || `Грешка при чувању иконице за разред #${i}`);
            }
        } else if (item.pendingGalleryPath) {
            const resp = await fetch(`/api/urednik/teme/${temaId}/ikona/${i}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourcePath: item.pendingGalleryPath })
            });
            if (!resp.ok) {
                const errBody = await resp.json().catch(() => ({}));
                throw new Error(errBody.error || `Грешка при копирању иконице за разред #${i}`);
            }
        }
    }
}

function refreshAllThemeListsAfterChange(affectedTemaId) {
    // Clear cached options so next selection fetches fresh values
    if (typeof window.themeOptionsCache !== 'undefined' && affectedTemaId) {
        delete window.themeOptionsCache[affectedTemaId];
    }
    // Refresh teme tab dropdown & metadata
    if (typeof loadThemesDropdown === 'function') {
        loadThemesDropdown();
    }
    // Refresh theme locking list if already populated
    if ($('#theme_lock_list').children().length > 0) {
        loadThemesForLocking();
    }
    // Refresh urednik stavke search & zapisi theme dropdowns
    fetch('/api/v2/themes', { cache: 'no-store' })
        .then(r => r.json())
        .then(data => {
            if (!data.themes) return;
            const refreshSelect = (selId) => {
                const sel = $(selId);
                if (!sel.length) return;
                const cur = sel.val();
                sel.find('option:not(:first)').remove();
                data.themes.forEach(t => {
                    const isLocked = t.zakljucano === 1 || t.zakljucano === true;
                    const label = isLocked ? `🔒 ${t.naziv}` : t.naziv;
                    sel.append($('<option></option>').val(String(t.id)).text(label));
                });
                if (cur && sel.find(`option[value="${cur}"]`).length > 0) {
                    sel.val(cur);
                }
            };
            refreshSelect('#stavka_tabela');
            refreshSelect('#uz_zapis_tema');
            refreshSelect('#uz_edit_zapis_tema');

            // Update explanation immediately if user currently has this theme selected in Teme tab
            if (affectedTemaId && window.lastSelectedTeme && String(window.lastSelectedTeme) === String(affectedTemaId)) {
                const found = data.themes.find(t => String(t.id) === String(affectedTemaId));
                if (found) {
                    $('#teme_objasnjenje_content').text(found.opis || 'нема појашњења за изабрану тему');
                }
            }
        })
        .catch(() => {});

    // Invalidate icon gallery cache so new icons appear
    window.ntState.galleryCache = null;
}

async function saveNovaTema() {
    syncOptionInputsToState();
    showNtAlert('');

    const naziv = $('#nt_naziv').val().trim();
    const opis = $('#nt_opis').val().trim();
    const nonEmptyRazred = window.ntState.razred.filter(x => (x.text || '').trim().length > 0);
    const nonEmptyVrsta = window.ntState.vrsta.filter(x => (x.text || '').trim().length > 0);
    const nonEmptyPodvrsta = window.ntState.podvrsta.filter(x => (x.text || '').trim().length > 0);

    if (!naziv) {
        showNtAlert('Назив теме је обавезан.', 'red');
        $('#nt_naziv').focus();
        return;
    }
    if (nonEmptyRazred.length === 0) {
        showNtAlert('Морате унијети бар једну вриједност за разред.', 'red');
        return;
    }

    const isNew = window.ntState.mode === 'new';
    const payload = {
        naziv,
        opis,
        razred: nonEmptyRazred.map(x => x.text.trim()),
        vrsta: nonEmptyVrsta.map(x => x.text.trim()),
        podvrsta: nonEmptyPodvrsta.map(x => x.text.trim())
    };
    if (!isNew) {
        payload.razredIconMap = nonEmptyRazred.map(x => x.originalIdx);
    }

    const btn = $('#nt_btn_save');
    const spinner = $('#nt_saving_spinner');
    btn.prop('disabled', true);
    spinner.show();

    try {
        const url = isNew ? '/api/urednik/teme' : `/api/urednik/teme/${window.ntState.mode}`;
        const method = isNew ? 'POST' : 'PUT';
        const resp = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await resp.json();
        if (!resp.ok || !data.success) {
            showNtAlert(data.error || 'Грешка при чувању теме.', 'red');
            return;
        }

        const savedId = isNew ? data.id : window.ntState.mode;

        // Upload / copy any pending icons for razred rows
        await uploadPendingIcons(savedId, nonEmptyRazred);

        refreshAllThemeListsAfterChange(savedId);
        loadNovaTemaSelector(savedId);
        loadThemeForEdit(savedId);

        if (isNew) {
            showNtAlert('Тема је креирана као закључана 🔒. Можете наставити са измјенама или је откључати у „закључавање тема”.', 'green');
        } else {
            showNtAlert('Измјене теме су сачуване.', 'green');
        }
    } catch (err) {
        console.error('Error saving theme:', err);
        showNtAlert(err.message || 'Грешка на серверу при чувању теме.', 'red');
    } finally {
        btn.prop('disabled', false);
        spinner.hide();
    }
}

async function deleteEmptyTheme() {
    if (window.ntState.mode === 'new') return;
    const temaId = window.ntState.mode;
    const naziv = $('#nt_naziv').val().trim() || `#${temaId}`;

    if (!confirm(`Да ли сте сигурни да желите трајно обрисати празну закључану тему „${naziv}”?`)) {
        return;
    }

    showNtAlert('');
    $('#nt_btn_delete').prop('disabled', true);
    $('#nt_saving_spinner').show();

    try {
        const resp = await fetch(`/api/urednik/teme/${temaId}`, { method: 'DELETE' });
        const data = await resp.json();
        if (!resp.ok || !data.success) {
            showNtAlert(data.error || 'Грешка при брисању теме.', 'red');
            return;
        }

        refreshAllThemeListsAfterChange(temaId);
        resetNovaTemaForm();
        loadNovaTemaSelector('new');
        showNtAlert(`Тема „${naziv}” је обрисана.`, 'green');
    } catch (err) {
        console.error('Error deleting theme:', err);
        showNtAlert('Грешка на серверу при брисању теме.', 'red');
    } finally {
        $('#nt_btn_delete').prop('disabled', false);
        $('#nt_saving_spinner').hide();
    }
}

// Theme Locking functionality
function initThemeLocking() {
    // Load themes when section begins expanding (prevent duplicate bindings)
    $('#urednik_zakljucavanje_tema_podaci').off('show.bs.collapse shown.bs.collapse').on('show.bs.collapse', function () {
        loadThemesForLocking();
    });
}

function loadThemesForLocking() {
    const alertsDiv = $('#theme_lock_alerts');
    const loadingDiv = $('#theme_lock_loading');
    const listDiv = $('#theme_lock_list');
    const hasExisting = listDiv.children().length > 0;

    alertsDiv.hide().text('');
    if (!hasExisting) {
        loadingDiv.show();
    }

    fetch('/api/v2/themes', { cache: 'no-store' })
        .then(response => response.json())
        .then(data => {
            loadingDiv.hide();
            if (data.themes) {
                displayThemesForLocking(data.themes);
            } else {
                alertsDiv.text(data.error || 'Грешка при учитавању').show();
            }
        })
        .catch(error => {
            loadingDiv.hide();
            console.error('Error loading themes for locking:', error);
            alertsDiv.text('Грешка при комуникацији са сервером').show();
        });
}

function displayThemesForLocking(themes) {
    const listDiv = $('#theme_lock_list');
    listDiv.empty();

    themes.forEach(theme => {
        const isLocked = theme.zakljucano === 1 || theme.zakljucano === true;
        const iconClass = isLocked ? 'bi-lock-fill text-danger' : 'bi-unlock-fill text-success';
        const titleText = isLocked ? 'откључај' : 'закључај';

        const item = $(`
            <div class="list-group-item d-flex justify-content-between align-items-center theme-lock-row" style="padding: 2px 8px; line-height: 1.2; border: none; background: transparent;">
                <span style="font-size: 0.85rem;">${theme.naziv}</span>
                <i class="bi ${iconClass} btn-toggle-lock" data-id="${theme.id}" style="font-size: 0.95rem; line-height: 1; cursor: pointer;" title="${titleText}"></i>
            </div>
        `);

        item.find('.btn-toggle-lock').on('click', function () {
            toggleThemeLock(theme.id, $(this));
        });

        listDiv.append(item);
    });
}

async function toggleThemeLock(temaId, icon) {
    const alertsDiv = $('#theme_lock_alerts');
    alertsDiv.hide().text('');

    // Immediate visual feedback (opacity)
    icon.css('opacity', '0.5').css('pointer-events', 'none');

    try {
        const response = await fetch('/api/urednik/teme/toggle-lock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tema_id: temaId })
        });

        const data = await response.json();
        if (response.ok && data.success) {
            const isLocked = data.zakljucano === 1 || data.zakljucano === true;

            if (isLocked) {
                icon.removeClass('bi-unlock-fill text-success').addClass('bi-lock-fill text-danger');
                icon.attr('title', 'откључај');
            } else {
                icon.removeClass('bi-lock-fill text-danger').addClass('bi-unlock-fill text-success');
                icon.attr('title', 'закључај');
            }

            // Sync with global metadata if it exists
            if (window.temeMetadata && window.temeMetadata[temaId]) {
                window.temeMetadata[temaId].zakljucano = isLocked;
            }

            // Sync with Nova Tema editor if currently viewing this theme
            if (window.ntState && String(window.ntState.mode) === String(temaId)) {
                window.ntState.zakljucano = isLocked;
                if (typeof updateNtStatusBar === 'function') {
                    updateNtStatusBar();
                }
            }
            if (typeof loadNovaTemaSelector === 'function') {
                loadNovaTemaSelector();
            }

            // Re-fetch themes in dropdowns to update labels (with 🔒 icon)
            if (typeof loadThemesDropdown === 'function') {
                loadThemesDropdown();
            }
        } else {
            alertsDiv.text(data.error || 'Грешка при измјени статуса.').show();
        }
    } catch (error) {
        console.error('Error toggling theme lock:', error);
        alertsDiv.text('Грешка на серверу.').show();
    } finally {
        icon.css('opacity', '1').css('pointer-events', 'auto');
    }
}

// Zapisi Approval functionality
function initZapisiApproval() {
    // Load pending zapisi when section is expanded
    $('#urednik_odobravanje_zapisa_podaci').off('shown.bs.collapse').on('shown.bs.collapse', function () {
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
        const metaRow = $(`
            <tr style="background-color: #fafafa; border-top: 1px solid #ccc;">
                <td style="padding: 4px 3px;">${record.id}</td>
                <td style="padding: 4px 3px;">${escapeUrednikHtml(record.tema || '')}</td>
                <td style="padding: 4px 3px;">${escapeUrednikHtml(record.korisnik || '')}</td>
                <td style="padding: 4px 3px; text-align: center;">
                    <input type="checkbox" class="zapisi-approve-checkbox" data-id="${record.id}">
                </td>
                <td style="padding: 4px 3px; text-align: center;">
                    <input type="checkbox" class="zapisi-delete-checkbox" data-id="${record.id}">
                </td>
            </tr>
        `);
        const nazivRow = $(`
            <tr style="border-bottom: ${record.opis ? 'none' : '1px solid #ccc'};">
                <td colspan="5" style="padding: 3px 5px; word-break: break-word;">
                    <span class="text-muted" style="font-size: 0.8rem;">Назив:</span>
                    <a href="#" class="zapis-link" onclick="viewZapis(${record.id}); return false;">${escapeUrednikHtml(record.naziv || '')}</a>
                </td>
            </tr>
        `);
        tbody.append(metaRow);
        tbody.append(nazivRow);

        if (record.opis) {
            const opisRow = $(`
                <tr style="border-bottom: 1px solid #ccc;">
                    <td colspan="5" style="padding: 2px 5px 6px 5px; font-size: 0.85rem; color: #333; word-break: break-word;">
                        <span class="text-muted" style="font-size: 0.8rem;">Опис:</span> ${escapeUrednikHtml(record.opis)}
                    </td>
                </tr>
            `);
            tbody.append(opisRow);
        }
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
                    loadUrednikSummaryCounts();
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
    $('#urednik_odobravanje_dogadjaja_podaci').off('shown.bs.collapse').on('shown.bs.collapse', function () {
        loadPendingDogadjaji();
    });

    // Clear map when section is collapsed
    $('#urednik_odobravanje_dogadjaja_podaci').off('hidden.bs.collapse').on('hidden.bs.collapse', function () {
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

        const metaRow = $(`
            <tr style="background-color: #fafafa; border-top: 1px solid #ccc; cursor: ${hasCoordinates ? 'pointer' : 'default'};" data-id="${record.id}" data-has-coords="${hasCoordinates}">
                <td style="padding: 4px 3px;">${record.id}</td>
                <td style="padding: 4px 3px; font-size: 0.82rem;">${escapeUrednikHtml(record.pocetak || '')}</td>
                <td style="padding: 4px 3px; font-size: 0.82rem;">${escapeUrednikHtml(record.kraj || '')}</td>
                <td style="padding: 4px 3px; font-size: 0.82rem;">${escapeUrednikHtml(record.korisnik || '')}</td>
                <td style="padding: 4px 3px; width: 26px; text-align: center;">${locationIcon}</td>
                <td style="padding: 4px 3px; text-align: center;">
                    <input type="checkbox" class="dogadjaji-approve-checkbox" data-id="${record.id}">
                </td>
                <td style="padding: 4px 3px; text-align: center;">
                    <input type="checkbox" class="dogadjaji-delete-checkbox" data-id="${record.id}">
                </td>
            </tr>
        `);

        const opisRow = $(`
            <tr style="border-bottom: 1px solid #ccc; cursor: ${hasCoordinates ? 'pointer' : 'default'};" data-id="${record.id}" data-has-coords="${hasCoordinates}">
                <td colspan="7" style="padding: 3px 5px 6px 5px; font-size: 0.85rem; color: #333; word-break: break-word;">
                    <span class="text-muted" style="font-size: 0.8rem;">Опис:</span> ${escapeUrednikHtml(record.opis || '')}
                </td>
            </tr>
        `);

        // Add click handler for rows with coordinates
        if (hasCoordinates) {
            const onRowClick = function (e) {
                if ($(e.target).is('input[type="checkbox"]')) {
                    return;
                }
                const recordId = $(this).data('id');
                showPendingDogadjajOnMap(recordId, results);
            };
            metaRow.on('click', onRowClick);
            opisRow.on('click', onRowClick);
        }

        tbody.append(metaRow);
        tbody.append(opisRow);
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
                    loadUrednikSummaryCounts();
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
    $('#urednik_odobravanje_stavki_podaci').off('shown.bs.collapse').on('shown.bs.collapse', function () {
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
        const recordId = record.id || record.ID;
        const razredText = options.razred[record.razred] || record.razred || '';
        const vrstaText = options.vrsta[record.vrsta] || record.vrsta || '';
        const podvrstaText = options.podvrsta[record.podvrsta] || record.podvrsta || '';

        record.vrijeme0_fmt = formatDate(record.vrijeme0);
        record.vrijeme1_fmt = formatDate(record.vrijeme1);

        const metaRow = $(`
            <tr style="background-color: #fafafa; border-top: 1px solid #ccc; cursor: pointer;" data-id="${recordId}">
                <td style="padding: 4px 3px;">${escapeUrednikHtml(razredText)}</td>
                <td style="padding: 4px 3px;">${escapeUrednikHtml(vrstaText)}</td>
                <td style="padding: 4px 3px;">${escapeUrednikHtml(podvrstaText)}</td>
                <td style="padding: 4px 3px;">${escapeUrednikHtml(record.vrijeme0_fmt)}</td>
                <td style="padding: 4px 3px;">${escapeUrednikHtml(record.vrijeme1_fmt)}</td>
                <td style="padding: 4px 3px;">${escapeUrednikHtml(record.korisnik || '')}</td>
                <td style="padding: 4px 3px; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${window.formatIzvorLinks ? window.formatIzvorLinks(record.izvor) : escapeUrednikHtml(record.izvor || '')}</td>
                <td style="padding: 4px 3px;">
                    ${record.zapis ? `<a href="/api/zapisi/${record.zapis}" target="_blank" class="zapis-link-table">${escapeUrednikHtml(record.zapis_naziv || record.zapis)}</a>` : ''}
                </td>
                <td style="padding: 4px 3px; text-align: center;">
                    <input type="checkbox" class="stavke-approve-checkbox" data-id="${recordId}">
                </td>
                <td style="padding: 4px 3px; text-align: center;">
                    <input type="checkbox" class="stavke-delete-checkbox" data-id="${recordId}">
                </td>
            </tr>
        `);

        const opisRow = $(`
            <tr style="border-bottom: 1px solid #ccc; cursor: pointer;" data-id="${recordId}">
                <td colspan="10" style="padding: 3px 5px 6px 5px; font-size: 0.85rem; color: #333; word-break: break-word;">
                    <span class="text-muted" style="font-size: 0.8rem;">Опис:</span> ${escapeUrednikHtml(record.opis || '')}
                </td>
            </tr>
        `);

        const onRowClick = function (e) {
            if ($(e.target).is('input[type="checkbox"], a, a *')) return;
            showPendingStavkaOnMap(recordId);
        };
        metaRow.on('click', onRowClick);
        opisRow.on('click', onRowClick);

        tbody.append(metaRow);
        tbody.append(opisRow);
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
    if (!window.stavkeApprovalMarkers) return;

    // Use loose equality and convert to string for safe comparison
    const targetId = String(recordId);

    const marker = window.stavkeApprovalMarkers.find(m => {
        if (!m.options || !m.options.recordId) return false;
        return String(m.options.recordId) === targetId && m.options.isPending === true;
    });

    if (marker) {
        if (marker.getLatLng) {
            // Point marker
            karta.panTo(marker.getLatLng());
            // Small delay to ensure pan doesn't conflict with popup open
            setTimeout(() => {
                marker.openPopup();
            }, 50);
        } else if (marker.getBounds) {
            // Polyline/Polygon GeoJSON layer group
            const bounds = marker.getBounds();
            if (bounds.isValid()) {
                karta.fitBounds(bounds.pad(0.1));
                setTimeout(() => {
                    if (marker.openPopup) {
                        marker.openPopup(bounds.getCenter());
                    } else {
                        const layers = marker.getLayers ? marker.getLayers() : [];
                        if (layers.length > 0) layers[0].openPopup();
                    }
                }, 100);
            }
        }
    } else {
        console.warn('Marker not found for recordId:', recordId);
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
                        <div style="margin-bottom: 3px;"><b>Извор:</b> ${window.formatIzvorLinks ? window.formatIzvorLinks(record.izvor) : (record.izvor || '')}</div>
                        <div style="margin-bottom: 3px;"><b>Запис:</b> ${record.zapis ? `<a href="/api/zapisi/${record.zapis}" target="_blank" style="color: darkorange;">${record.zapis_naziv || record.zapis}</a>` : ''}</div>
                    </div>
                `;

                const recordId = record.id || record.ID;
                if (record.tacke0 === 'Point') {
                    const pos = getLatLng(record.tacke, record.tacke0);
                    if (pos) {
                        const marker = L.marker(pos, { icon: orangeIcon, recordId: recordId, isPending: true })
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
                            id: recordId
                        }
                    };

                    const layer = L.geoJSON(geojson, {
                        style: { color: "#d35400", weight: 5, opacity: 0.8 },
                        onEachFeature: function (feature, layer) {
                            layer.bindPopup(popupContent);
                        }
                    }).addTo(karta);

                    // Bind popup to the group so it can be opened at any LatLng (e.g. center)
                    layer.bindPopup(popupContent);

                    // Critical: Attach metadata to the group and each layer for identification
                    layer.options = layer.options || {};
                    layer.options.recordId = recordId;
                    layer.options.isPending = true;

                    layer.eachLayer(l => {
                        l.options = l.options || {};
                        l.options.recordId = recordId;
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
        const recordId = record.id || record.ID;
        const pos = getLatLng(record.tacke, record.tacke0);
        if (pos) {
            const icon = typeof window.createIcon === 'function' ? window.createIcon(record.razred, temaId) : new L.Icon.Default();
            const popupLabel = options.vrsta[record.vrsta] || record.vrsta || '';
            const popupContent = `<a href="#" class="detalji" pointinfo="${recordId}"><i class="bi bi-book"></i></a> ${popupLabel}`;

            const marker = L.marker(pos, { icon: icon, recordId: recordId, isPending: false })
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
                    loadUrednikSummaryCounts();
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
    initUrednikDogadjajiSearch();
    initUrednikZapisiSearch();
    initUrednikBackup();
    loadUrednikSummaryCounts();
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
            $('#u_detail_img').attr('src', u.slika_url || 'slike/user-icon.png');

            // Populate stats
            $('#u_detail_p0').text(u.pristup0 ? new Date(u.pristup0).toLocaleDateString('sr-RS') : '-');
            $('#u_detail_p1').text(u.pristup1 ? new Date(u.pristup1).toLocaleDateString('sr-RS') : '-');
            $('#u_detail_count').text(u.brojac_pristupa || 0);
            $('#u_detail_stavki').text(u.brojac_stavki || 0);
            $('#u_detail_dogadjaja').text(u.brojac_dogadjaja || 0);
            $('#u_detail_zapisa').text(u.brojac_zapisa || 0);
            $('#u_detail_misljenja').text(u.brojac_misljenja || 0);

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
                const id = theme.id || theme.ID;
                const naziv = theme.naziv || theme.NAZIV;
                const zakljucano = theme.zakljucano === 1 || theme.zakljucano === true;
                const label = zakljucano ? `🔒 ${naziv}` : naziv;
                select.append(`<option value="${id}">${label}</option>`);
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
            time_24hr: true,
            allowInput: true
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
            const fpConfig = {
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
            flatpickr('.edit-flatpickr', fpConfig);

            // Add visual alarm on blur
            $('.edit-flatpickr').on('blur', function () {
                const val = $(this).val();
                const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
                if (val && !regex.test(val)) {
                    $(this).css('border-color', 'red');
                } else {
                    $(this).css('border-color', '');
                }
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

// ============================================
// Uplate (Monthly Support Donations) Management
// ============================================

var UPLATE_MESECI_NAZIVI = [
    'јануар', 'фебруар', 'март', 'април', 'мај', 'јун',
    'јул', 'август', 'септембар', 'октобар', 'новембар', 'децембар'
];

function initUplateAdmin() {
    $('#urednik_uplate_podaci').off('shown.bs.collapse').on('shown.bs.collapse', function () {
        loadUplateAdmin();
    });

    const btnSacuvaj = document.getElementById('btn_sacuvaj_uplate');
    if (btnSacuvaj) {
        btnSacuvaj.onclick = saveUplateAdmin;
    }
}

async function loadUplateAdmin() {
    const loadingDiv = document.getElementById('uplate_loading');
    const formaDiv = document.getElementById('uplate_forma');
    const alertsDiv = document.getElementById('uplate_alerts');
    const troskoviInput = document.getElementById('uplate_troskovi_input');
    const odrzavanjeInput = document.getElementById('uplate_odrzavanje_input');
    const tbody = document.getElementById('uplate_meseci_body');

    if (!tbody) return;

    if (alertsDiv) {
        alertsDiv.innerText = '';
        alertsDiv.style.display = 'none';
    }
    if (loadingDiv) loadingDiv.style.display = 'block';
    if (formaDiv) formaDiv.style.display = 'none';

    try {
        const response = await fetch('/api/podrska/uplate');
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Грешка при учитавању уплата.');
        }

        if (troskoviInput) {
            troskoviInput.value = data.mesecniTroskovi;
        }
        if (odrzavanjeInput) {
            odrzavanjeInput.value = data.troskoviOdrzavanja !== undefined ? data.troskoviOdrzavanja : 30000;
        }

        tbody.innerHTML = '';
        (data.meseci || []).forEach((m, index) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #eee';
            if (index === 0) {
                tr.style.backgroundColor = 'rgba(245, 166, 21, 0.12)';
            }

            const mesecNaziv = UPLATE_MESECI_NAZIVI[(m.mesec || 1) - 1] || m.mesec;
            const oznaka = index === 0
                ? `<strong>${mesecNaziv} ${m.godina}</strong> <span style="color: #b57600; font-size: 0.78rem;">(текући)</span>`
                : `${mesecNaziv} ${m.godina}`;

            tr.innerHTML = `
                <td style="padding: 5px; text-align: left;">${oznaka}</td>
                <td style="padding: 4px 5px; text-align: right;">
                    <input type="number" class="form-control form-control-sm uplate-mesec-input"
                        data-godina="${m.godina}" data-mesec="${m.mesec}"
                        value="${m.iznos}" min="0" step="1"
                        style="width: 120px; display: inline-block; text-align: right; font-size: 0.85rem;">
                </td>
            `;
            tbody.appendChild(tr);
        });

        if (loadingDiv) loadingDiv.style.display = 'none';
        if (formaDiv) formaDiv.style.display = 'block';
    } catch (err) {
        console.error('Error loading uplate admin:', err);
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (alertsDiv) {
            showAlert(alertsDiv, err.message || 'Грешка при учитавању података.', 'danger');
        }
    }
}

async function saveUplateAdmin() {
    const alertsDiv = document.getElementById('uplate_alerts');
    const troskoviInput = document.getElementById('uplate_troskovi_input');
    const odrzavanjeInput = document.getElementById('uplate_odrzavanje_input');
    const inputs = document.querySelectorAll('.uplate-mesec-input');
    const btnSacuvaj = document.getElementById('btn_sacuvaj_uplate');

    const mesecniTroskovi = parseInt(troskoviInput ? troskoviInput.value : '', 10);
    if (isNaN(mesecniTroskovi) || mesecniTroskovi < 0) {
        showAlert(alertsDiv, 'Унесите исправан износ за месечне техничке трошкове (0 или више).', 'danger');
        return;
    }

    const troskoviOdrzavanja = parseInt(odrzavanjeInput ? odrzavanjeInput.value : '', 10);
    if (isNaN(troskoviOdrzavanja) || troskoviOdrzavanja < 0) {
        showAlert(alertsDiv, 'Унесите исправан износ за основне трошкове одржавања (0 или више).', 'danger');
        return;
    }

    const meseci = [];
    for (const input of inputs) {
        const godina = parseInt(input.getAttribute('data-godina'), 10);
        const mesec = parseInt(input.getAttribute('data-mesec'), 10);
        const iznos = parseInt(input.value === '' ? '0' : input.value, 10);

        if (isNaN(iznos) || iznos < 0) {
            showAlert(alertsDiv, 'Сви месечни износи морају бити ненегативни бројеви.', 'danger');
            return;
        }
        meseci.push({ godina, mesec, iznos });
    }

    if (btnSacuvaj) btnSacuvaj.disabled = true;

    try {
        const response = await fetch('/api/urednik/uplate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mesecniTroskovi, troskoviOdrzavanja, meseci })
        });
        const data = await response.json();

        if (response.ok && data.success) {
            showAlert(alertsDiv, data.message || 'Подаци су успешно сачувани.', 'success');
        } else {
            showAlert(alertsDiv, data.error || 'Грешка при чувању података.', 'danger');
        }
    } catch (err) {
        console.error('Error saving uplate:', err);
        showAlert(alertsDiv, 'Грешка на серверу при чувању података.', 'danger');
    } finally {
        if (btnSacuvaj) btnSacuvaj.disabled = false;
    }
}

// ============================================
// Helper: Escape HTML & Format Local DateTime
// ============================================

function escapeUrednikHtml(text) {
    return String(text == null ? '' : text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDateTimeForInput(dateVal) {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) {
        return String(dateVal).replace('T', ' ').substring(0, 16);
    }
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function refreshAllZapisiCache() {
    return fetch('/api/urednik/all-zapisi', { cache: 'no-store' })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                window.allZapisiCache = data.results || [];
            }
            return window.allZapisiCache || [];
        })
        .catch(() => window.allZapisiCache || []);
}

// ============================================
// Dogadjaji Search, Edit, Delete (Urednik)
// ============================================

function initUrednikDogadjajiSearch() {
    $('#form_pretraga_dogadjaja').off('submit').on('submit', handleUrednikDogadjajiSearch);

    $('#btn_back_to_dogadjaj_search').off('click').on('click', function () {
        $('#ud_dogadjaj_detail_panel').hide();
        $('#ud_dogadjaj_search_results').show();
    });

    $('#btn_update_urednik_dogadjaj').off('click').on('click', updateUrednikDogadjaj);
    $('#btn_delete_urednik_dogadjaj').off('click').on('click', deleteUrednikDogadjaj);

    $('#urednik_pretraga_dogadjaja_podaci').off('hidden.bs.collapse').on('hidden.bs.collapse', function () {
        if (window.urednikDogadjajMarker && typeof karta !== 'undefined') {
            karta.removeLayer(window.urednikDogadjajMarker);
            window.urednikDogadjajMarker = null;
        }
    });

    if (typeof flatpickr !== 'undefined') {
        flatpickr('.ud-dogadjaj-flatpickr', {
            enableTime: true,
            dateFormat: 'Y-m-d H:i',
            locale: 'sr',
            time_24hr: true,
            allowInput: true
        });
    }
}

function handleUrednikDogadjajiSearch(e) {
    if (e) e.preventDefault();

    const searchData = {
        id: $('#ud_dogadjaj_id').val(),
        korisnik: $('#ud_dogadjaj_korisnik').val(),
        opis: $('#ud_dogadjaj_opis').val(),
        pocetak: $('#ud_dogadjaj_od').val(),
        kraj: $('#ud_dogadjaj_do').val(),
        prostorno: $('#ud_dogadjaj_prostorno').val(),
        vremenski: $('#ud_dogadjaj_vremenski').val(),
        stanje: $('#ud_dogadjaj_stanje').val(),
        izvor: $('#ud_dogadjaj_izvor').val()
    };

    const spinner = $('#ud_dogadjaj_search_cekanje');
    const alertArea = $('#ud_dogadjaj_alert_area');
    const resultsDiv = $('#ud_dogadjaj_search_results');
    const detailPanel = $('#ud_dogadjaj_detail_panel');

    spinner.css('visibility', 'visible');
    alertArea.hide().text('');
    detailPanel.hide();

    fetch('/api/urednik/dogadjaji/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchData)
    })
        .then(r => r.json())
        .then(data => {
            spinner.css('visibility', 'hidden');
            if (data.success) {
                renderUrednikDogadjajiResults(data.results || []);
            } else {
                resultsDiv.hide();
                alertArea.css('color', 'orange').text(data.error || 'Грешка при претрази').show();
            }
        })
        .catch(err => {
            spinner.css('visibility', 'hidden');
            console.error('Error searching urednik dogadjaji:', err);
            alertArea.css('color', 'orange').text('Грешка при комуникацији са сервером').show();
        });
}

function renderUrednikDogadjajiResults(results) {
    const tbody = $('#ud_dogadjaj_search_body');
    const resultsDiv = $('#ud_dogadjaj_search_results');
    const alertArea = $('#ud_dogadjaj_alert_area');

    tbody.empty();

    if (results.length === 0) {
        resultsDiv.hide();
        alertArea.css('color', 'orange').text('Нема резултата').show();
        return;
    }

    results.forEach(item => {
        const shortOpis = item.opis && item.opis.length > 60 ? item.opis.slice(0, 60) + '…' : (item.opis || '');
        const pendingBadge = item.stanje === '0' ? ' <span class="badge badge-warning">чека</span>' : '';
        const dateShort = item.pocetak_fmt ? item.pocetak_fmt.split(',')[0] : '';

        const row = $(`
            <tr style="border-bottom: 1px solid #eee; cursor: pointer;">
                <td style="padding: 4px;">${item.id}</td>
                <td style="padding: 4px;" title="${escapeUrednikHtml(item.opis || '')}">${escapeUrednikHtml(shortOpis)}${pendingBadge}</td>
                <td style="padding: 4px; font-size: 0.78rem;">${escapeUrednikHtml(dateShort)}</td>
                <td style="padding: 4px; font-size: 0.78rem;">${escapeUrednikHtml(item.korisnik || '')}</td>
            </tr>
        `);

        row.on('click', () => openUrednikDogadjajDetail(item.id));
        tbody.append(row);
    });

    resultsDiv.show();
}

async function openUrednikDogadjajDetail(id) {
    const spinner = $('#ud_dogadjaj_search_cekanje');
    const alertArea = $('#ud_dogadjaj_alert_area');
    const resultsDiv = $('#ud_dogadjaj_search_results');
    const detailPanel = $('#ud_dogadjaj_detail_panel');

    spinner.css('visibility', 'visible');
    alertArea.hide().text('');
    $('#ud_edit_dogadjaj_msg').text('');

    try {
        const [res, zapisiList] = await Promise.all([
            fetch(`/api/urednik/dogadjaji/${id}`, { cache: 'no-store' }).then(r => r.json()),
            window.allZapisiCache ? Promise.resolve(window.allZapisiCache) : refreshAllZapisiCache()
        ]);

        spinner.css('visibility', 'hidden');

        if (!res.success || !res.dogadjaj) {
            alertArea.css('color', 'orange').text(res.error || 'Грешка при учитавању догађаја').show();
            return;
        }

        const d = res.dogadjaj;
        $('#ud_edit_dogadjaj_id_label').text(d.id);
        $('#ud_edit_dogadjaj_korisnik').text(d.korisnik || '-');
        $('#ud_edit_dogadjaj_opis').val(d.opis || '');
        $('#ud_edit_dogadjaj_pocetak').val(formatDateTimeForInput(d.pocetak));
        $('#ud_edit_dogadjaj_kraj').val(formatDateTimeForInput(d.kraj));
        $('#ud_edit_dogadjaj_izvor').val(d.izvor || '');
        $('#ud_edit_dogadjaj_koordinate').val(d.koordinate || '');
        $('#ud_edit_dogadjaj_stanje').val(d.stanje === '0' ? '0' : '1');

        const zapisSelect = $('#ud_edit_dogadjaj_zapis');
        zapisSelect.empty().append('<option value="">-- без записа --</option>');
        (zapisiList || []).forEach(z => {
            zapisSelect.append(`<option value="${z.id}">${escapeUrednikHtml('#' + z.id + ' - ' + z.naziv)}</option>`);
        });
        zapisSelect.val(d.zapis ? String(d.zapis) : '');

        $('#btn_update_urednik_dogadjaj').data('dogadjajId', d.id);
        $('#btn_delete_urednik_dogadjaj').data('dogadjajId', d.id);

        // Show on map if coordinates exist
        if (typeof karta !== 'undefined') {
            if (window.urednikDogadjajMarker) {
                karta.removeLayer(window.urednikDogadjajMarker);
                window.urednikDogadjajMarker = null;
            }
            if (d.koordinate) {
                const match = String(d.koordinate).match(/POINT\s*\(\s*([\d.-]+)\s+([\d.-]+)\s*\)/i);
                if (match) {
                    const lng = parseFloat(match[1]);
                    const lat = parseFloat(match[2]);
                    if (!isNaN(lat) && !isNaN(lng)) {
                        window.urednikDogadjajMarker = L.marker([lat, lng])
                            .addTo(karta)
                            .bindPopup(`<b>Догађај #${d.id}</b><br>${escapeUrednikHtml(d.opis || '')}`)
                            .openPopup();
                        karta.panTo([lat, lng]);
                    }
                }
            }
        }

        resultsDiv.hide();
        detailPanel.show();
    } catch (err) {
        spinner.css('visibility', 'hidden');
        console.error('Error loading urednik dogadjaj detail:', err);
        alertArea.css('color', 'orange').text('Грешка при комуникацији са сервером').show();
    }
}

async function updateUrednikDogadjaj() {
    const id = $('#btn_update_urednik_dogadjaj').data('dogadjajId');
    if (!id) return;

    const msgDiv = $('#ud_edit_dogadjaj_msg');
    const payload = {
        opis: $('#ud_edit_dogadjaj_opis').val(),
        pocetak: $('#ud_edit_dogadjaj_pocetak').val(),
        kraj: $('#ud_edit_dogadjaj_kraj').val(),
        izvor: $('#ud_edit_dogadjaj_izvor').val(),
        zapis: $('#ud_edit_dogadjaj_zapis').val(),
        koordinate: $('#ud_edit_dogadjaj_koordinate').val(),
        stanje: $('#ud_edit_dogadjaj_stanje').val()
    };

    msgDiv.css('color', 'orange').text('Чувам...');

    try {
        const res = await fetch(`/api/urednik/dogadjaji/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok && data.success) {
            msgDiv.css('color', 'green').text(data.message || 'Сачувано!');
            loadUrednikSummaryCounts();
            setTimeout(() => {
                handleUrednikDogadjajiSearch();
            }, 1000);
        } else {
            msgDiv.css('color', 'red').text(data.error || 'Грешка');
        }
    } catch (err) {
        console.error('Error updating urednik dogadjaj:', err);
        msgDiv.css('color', 'red').text('Грешка на серверу');
    }
}

async function deleteUrednikDogadjaj() {
    const id = $('#btn_delete_urednik_dogadjaj').data('dogadjajId');
    if (!id) return;

    if (!confirm(`Да ли сте сигурни да желите да обришете догађај #${id}?`)) return;

    const msgDiv = $('#ud_edit_dogadjaj_msg');
    msgDiv.css('color', 'orange').text('Бришем...');

    try {
        const res = await fetch(`/api/urednik/dogadjaji/${id}`, {
            method: 'DELETE'
        });
        const data = await res.json();

        if (res.ok && data.success) {
            msgDiv.css('color', 'green').text(data.message || 'Обрисано!');
            if (window.urednikDogadjajMarker && typeof karta !== 'undefined') {
                karta.removeLayer(window.urednikDogadjajMarker);
                window.urednikDogadjajMarker = null;
            }
            loadUrednikSummaryCounts();
            setTimeout(() => {
                $('#ud_dogadjaj_detail_panel').hide();
                handleUrednikDogadjajiSearch();
            }, 1000);
        } else {
            msgDiv.css('color', 'red').text(data.error || 'Грешка');
        }
    } catch (err) {
        console.error('Error deleting urednik dogadjaj:', err);
        msgDiv.css('color', 'red').text('Грешка на серверу');
    }
}

// ============================================
// Zapisi Search, Edit, Delete (Urednik)
// ============================================

function initUrednikZapisiSearch() {
    fetch('/api/v2/themes')
        .then(r => r.json())
        .then(data => {
            const themes = data.themes || [];
            const searchSelect = $('#uz_zapis_tema');
            const editSelect = $('#uz_edit_zapis_tema');
            searchSelect.find('option:not(:first)').remove();
            editSelect.empty();

            themes.forEach(theme => {
                const id = theme.id || theme.ID;
                const naziv = theme.naziv || theme.NAZIV;
                if (id && naziv) {
                    searchSelect.append(`<option value="${id}">${escapeUrednikHtml(naziv)}</option>`);
                    editSelect.append(`<option value="${id}">${escapeUrednikHtml(naziv)}</option>`);
                }
            });
        })
        .catch(err => console.error('Error loading themes for urednik zapisi search:', err));

    $('#form_pretraga_zapisa').off('submit').on('submit', handleUrednikZapisiSearch);

    $('#btn_back_to_zapis_search').off('click').on('click', function () {
        $('#uz_zapis_detail_panel').hide();
        $('#uz_zapis_search_results').show();
    });

    $('#btn_update_urednik_zapis').off('click').on('click', updateUrednikZapis);
    $('#btn_delete_urednik_zapis').off('click').on('click', deleteUrednikZapis);
}

function handleUrednikZapisiSearch(e) {
    if (e) e.preventDefault();

    const searchData = {
        id: $('#uz_zapis_id').val(),
        tema_id: $('#uz_zapis_tema').val(),
        naziv: $('#uz_zapis_naziv').val(),
        korisnik: $('#uz_zapis_korisnik').val(),
        opis: $('#uz_zapis_opis').val(),
        tagovi: $('#uz_zapis_tagovi').val(),
        stanje: $('#uz_zapis_stanje').val()
    };

    const spinner = $('#uz_zapis_search_cekanje');
    const alertArea = $('#uz_zapis_alert_area');
    const resultsDiv = $('#uz_zapis_search_results');
    const detailPanel = $('#uz_zapis_detail_panel');

    spinner.css('visibility', 'visible');
    alertArea.hide().text('');
    detailPanel.hide();

    fetch('/api/urednik/zapisi/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchData)
    })
        .then(r => r.json())
        .then(data => {
            spinner.css('visibility', 'hidden');
            if (data.success) {
                renderUrednikZapisiResults(data.results || []);
            } else {
                resultsDiv.hide();
                alertArea.css('color', 'orange').text(data.error || 'Грешка при претрази').show();
            }
        })
        .catch(err => {
            spinner.css('visibility', 'hidden');
            console.error('Error searching urednik zapisi:', err);
            alertArea.css('color', 'orange').text('Грешка при комуникацији са сервером').show();
        });
}

function renderUrednikZapisiResults(results) {
    const tbody = $('#uz_zapis_search_body');
    const resultsDiv = $('#uz_zapis_search_results');
    const alertArea = $('#uz_zapis_alert_area');

    tbody.empty();

    if (results.length === 0) {
        resultsDiv.hide();
        alertArea.css('color', 'orange').text('Нема резултата').show();
        return;
    }

    results.forEach(item => {
        const pendingBadge = item.stanje === '0' ? ' <span class="badge badge-warning">чека</span>' : '';
        const row = $(`
            <tr style="border-bottom: 1px solid #eee; cursor: pointer;">
                <td style="padding: 4px;">${item.id}</td>
                <td style="padding: 4px;">${escapeUrednikHtml(item.naziv || '')}${pendingBadge}</td>
                <td style="padding: 4px; font-size: 0.78rem;">${escapeUrednikHtml(item.tema || '')}</td>
                <td style="padding: 4px; font-size: 0.78rem;">${escapeUrednikHtml(item.korisnik || '')}</td>
            </tr>
        `);

        row.on('click', () => openUrednikZapisDetail(item.id));
        tbody.append(row);
    });

    resultsDiv.show();
}

async function openUrednikZapisDetail(id) {
    const spinner = $('#uz_zapis_search_cekanje');
    const alertArea = $('#uz_zapis_alert_area');
    const resultsDiv = $('#uz_zapis_search_results');
    const detailPanel = $('#uz_zapis_detail_panel');

    spinner.css('visibility', 'visible');
    alertArea.hide().text('');
    $('#uz_edit_zapis_msg').text('');

    try {
        const res = await fetch(`/api/urednik/zapisi/${id}`, { cache: 'no-store' }).then(r => r.json());
        spinner.css('visibility', 'hidden');

        if (!res.success || !res.zapis) {
            alertArea.css('color', 'orange').text(res.error || 'Грешка при учитавању записа').show();
            return;
        }

        const z = res.zapis;
        $('#uz_edit_zapis_id_label').text(z.id);
        $('#uz_edit_zapis_korisnik').text(z.korisnik || '-');
        $('#uz_edit_zapis_download').attr('href', `/api/zapisi/${z.id}`);
        $('#uz_edit_zapis_naziv').val(z.naziv || '');
        $('#uz_edit_zapis_tema').val(String(z.tema_id || ''));
        $('#uz_edit_zapis_stanje').val(z.stanje === '0' ? '0' : '1');
        $('#uz_edit_zapis_opis').val(z.opis || '');
        $('#uz_edit_zapis_tagovi').val(z.tagovi || '');

        $('#btn_update_urednik_zapis').data('zapisId', z.id);
        $('#btn_delete_urednik_zapis').data('zapisId', z.id);

        resultsDiv.hide();
        detailPanel.show();
    } catch (err) {
        spinner.css('visibility', 'hidden');
        console.error('Error loading urednik zapis detail:', err);
        alertArea.css('color', 'orange').text('Грешка при комуникацији са сервером').show();
    }
}

async function updateUrednikZapis() {
    const id = $('#btn_update_urednik_zapis').data('zapisId');
    if (!id) return;

    const msgDiv = $('#uz_edit_zapis_msg');
    const payload = {
        naziv: $('#uz_edit_zapis_naziv').val(),
        tema_id: $('#uz_edit_zapis_tema').val(),
        stanje: $('#uz_edit_zapis_stanje').val(),
        opis: $('#uz_edit_zapis_opis').val(),
        tagovi: $('#uz_edit_zapis_tagovi').val()
    };

    msgDiv.css('color', 'orange').text('Чувам...');

    try {
        const res = await fetch(`/api/urednik/zapisi/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok && data.success) {
            msgDiv.css('color', 'green').text(data.message || 'Сачувано!');
            refreshAllZapisiCache();
            loadUrednikSummaryCounts();
            setTimeout(() => {
                handleUrednikZapisiSearch();
            }, 1000);
        } else {
            msgDiv.css('color', 'red').text(data.error || 'Грешка');
        }
    } catch (err) {
        console.error('Error updating urednik zapis:', err);
        msgDiv.css('color', 'red').text('Грешка на серверу');
    }
}

async function deleteUrednikZapis() {
    const id = $('#btn_delete_urednik_zapis').data('zapisId');
    if (!id) return;

    if (!confirm(`Да ли сте сигурни да желите да обришете запис #${id}?`)) return;

    const msgDiv = $('#uz_edit_zapis_msg');
    msgDiv.css('color', 'orange').text('Бришем...');

    try {
        const res = await fetch(`/api/urednik/zapisi/${id}`, {
            method: 'DELETE'
        });
        const data = await res.json();

        if (res.ok && data.success) {
            msgDiv.css('color', 'green').text(data.message || 'Обрисано!');
            refreshAllZapisiCache();
            loadUrednikSummaryCounts();
            setTimeout(() => {
                $('#uz_zapis_detail_panel').hide();
                handleUrednikZapisiSearch();
            }, 1000);
        } else {
            msgDiv.css('color', 'red').text(data.error || 'Грешка');
        }
    } catch (err) {
        console.error('Error deleting urednik zapis:', err);
        msgDiv.css('color', 'red').text('Грешка на серверу');
    }
}

// ============================================
// Summary Counts & Backup Status (Urednik)
// ============================================

window.urednikLastFilesDeltaCount = 0;

function formatBytesSerbian(bytes) {
    const b = Number(bytes) || 0;
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
    return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatBackupDatePair(isoDate) {
    if (!isoDate) return { shortDate: 'нема', fullDate: 'није евидентиран' };
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return { shortDate: 'нема', fullDate: 'није евидентиран' };
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return {
        shortDate: `${dd}.${mm}.${yyyy}.`,
        fullDate: `${dd}.${mm}.${yyyy}. ${hh}:${mi}`
    };
}

function initUrednikBackup() {
    $('#btn_download_db_backup').off('click').on('click', downloadDbBackup);
    $('#btn_download_files_backup').off('click').on('click', downloadFilesBackup);
    $('#bekap_files_full_mode').off('change').on('change', function () {
        const isFull = $(this).is(':checked');
        $('#btn_download_files_backup').text(isFull ? 'преузми све фајлове (пун ZIP)' : 'преузми фајлове (делта ZIP)');
    });
}

function updateUrednikBadge(selector, count) {
    const el = $(selector);
    if (!el.length) return;
    if (count > 0) {
        el.text(count).show();
    } else {
        el.hide().text('');
    }
}

async function loadUrednikSummaryCounts() {
    try {
        const res = await fetch('/api/urednik/summary-counts', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success) return;

        updateUrednikBadge('#badge_reported_misljenja', data.reportedMisljenja || 0);
        updateUrednikBadge('#badge_pending_stavki', data.pendingStavki || 0);
        updateUrednikBadge('#badge_pending_dogadjaja', data.pendingDogadjaja || 0);
        updateUrednikBadge('#badge_pending_zapisa', data.pendingZapisa || 0);

        // Database backup status
        const b = data.backup || {};
        const totalNew = b.newEntriesSinceBackup || 0;
        const bd = b.breakdown || {};
        const breakdownText = `ставки: ${bd.stavki || 0}, догађаја: ${bd.dogadjaji || 0}, записа: ${bd.zapisi || 0}, мишљења: ${bd.misljenja || 0}`;
        const dbDate = formatBackupDatePair(b.lastBackupAt);

        let badgeStyle;
        if (totalNew >= 50) {
            badgeStyle = 'background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;';
        } else if (totalNew > 0) {
            badgeStyle = 'background-color: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb;';
        } else {
            badgeStyle = 'background-color: #e9ecef; color: #495057; border: 1px solid #ced4da;';
        }
        $('#badge_backup_info')
            .html(`(${dbDate.shortDate} <span class="badge badge-pill" style="${badgeStyle} font-weight: 600;" title="${breakdownText}">+${totalNew}</span>)`)
            .attr('title', `Последњи бекап базе: ${dbDate.fullDate} | Нових уноса: ${totalNew} (${breakdownText})`);

        $('#bekap_last_date').text(dbDate.fullDate);
        $('#bekap_new_total').text(totalNew);
        $('#bekap_new_breakdown').text(breakdownText);

        // Files backup status
        const fb = data.filesBackup || {};
        const filesDate = formatBackupDatePair(fb.lastFileBackupAt);
        const newFilesCount = fb.newFilesCount || 0;
        window.urednikLastFilesDeltaCount = newFilesCount;

        $('#bekap_files_last_date').text(filesDate.fullDate);
        $('#bekap_files_new_info').text(`${newFilesCount} (${formatBytesSerbian(fb.newFilesSizeBytes || 0)})`);
    } catch (err) {
        console.error('Error loading urednik summary counts:', err);
    }
}

function triggerDirectBackupDownload(url) {
    const a = document.createElement('a');
    a.href = url;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function downloadDbBackup() {
    const alertsDiv = document.getElementById('bekap_alerts');
    if (alertsDiv) showAlert(alertsDiv, 'Покренуто преузимање бекапа базе (.json.gz)...', 'success');
    triggerDirectBackupDownload('/api/urednik/backup/database');
    setTimeout(() => loadUrednikSummaryCounts(), 2500);
}

function downloadFilesBackup() {
    const alertsDiv = document.getElementById('bekap_alerts');
    const isFull = $('#bekap_files_full_mode').is(':checked');

    if (!isFull && window.urednikLastFilesDeltaCount === 0) {
        if (alertsDiv) showAlert(alertsDiv, 'Нема нових фајлова од последњег бекапа.', 'success');
        return;
    }

    const mode = isFull ? 'full' : 'delta';
    if (alertsDiv) {
        showAlert(alertsDiv, isFull ? 'Покренуто преузимање свих фајлова (ZIP)...' : 'Покренуто преузимање нових фајлова (делта ZIP)...', 'success');
    }
    triggerDirectBackupDownload(`/api/urednik/backup/files?mode=${mode}`);
    setTimeout(() => loadUrednikSummaryCounts(), 3000);
}
