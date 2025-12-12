// Teme (Themes) section functionality

// Global variable to store the last selected theme
if (typeof window.lastSelectedTeme === 'undefined') {
    window.lastSelectedTeme = "0";
}

// Global variables for insert functionality
if (typeof window.temeInsertRows === 'undefined') {
    window.temeInsertRows = [];
}
if (typeof window.temeSearchTimeSpan === 'undefined') {
    window.temeSearchTimeSpan = { od: null, do: null };
}
// Global variable for theme metadata
if (typeof window.temeMetadata === 'undefined') {
    window.temeMetadata = {};
}

// Function to load teme content based on selected theme
function loadTemeContent(valueSelected, isRestoring = false) {
    // Check if there are pending inserts
    if (!isRestoring && window.temeInsertRows.length > 0) {
        $('#teme_alert_area').text("Нова претрага нија могућа док постоје приједлози за унос у дијелу 'ново'").show();
        setTimeout(function () { $('#teme_alert_area').fadeOut(); }, 3000);
        // Revert dropdown selection to previous valid theme
        if (window.lastSelectedTeme) {
            $('#teme_izbor').val(window.lastSelectedTeme);
        }
        return false;
    }

    // Store the selected value globally
    window.lastSelectedTeme = valueSelected;

    if (valueSelected == "0") {
        // Hide drawing tool and clear content
        $('#teme_alat_container').hide();
        $('#teme_alat_checkbox').prop('checked', false);
        if (typeof karta !== 'undefined' && typeof drawnItems !== 'undefined' && typeof drawnControl !== 'undefined') {
            if (karta.hasLayer(drawnItems)) {
                karta.removeLayer(drawnItems);
            }
            if (karta._controlContainer.querySelector('.leaflet-draw')) {
                karta.removeControl(drawnControl);
            }
        }
        clearInsertRows();
        if (typeof karta !== 'undefined' && typeof drawnItems !== 'undefined' && typeof drawnControl !== 'undefined') {
            if (karta.hasLayer(drawnItems)) {
                karta.removeLayer(drawnItems);
            }
            if (karta._controlContainer.querySelector('.leaflet-draw')) {
                karta.removeControl(drawnControl);
            }
        }
        clearInsertRows();
        $('#teme_dogadjaji_podaci').hide();
        $('#teme_objasnjenje_content').text("тема није изабрана");

        // Clear dropdown options

        // Clear dropdown options
        $('#razred').find('option:not(:first)').remove();
        $('#vrsta').find('option:not(:first)').remove();
        $('#podvrsta').find('option:not(:first)').remove();
    } else {
        // Fetch options from API
        return fetch(`/api/v2/theme-options/${valueSelected}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch theme options');
                }
                return response.json();
            })
            .then(data => {
                const options = data.options;

                // Clear existing options
                $('#razred').find('option:not(:first)').remove();
                $('#vrsta').find('option:not(:first)').remove();
                $('#podvrsta').find('option:not(:first)').remove();

                // Restore previous state if available
                if (window.temeState && window.temeState.searchData && window.temeState.searchData.tabela === valueSelected) {
                    // Restore dropdowns if we are restoring state (optional enhancement)
                }

                // Populate razred dropdown
                options.razred.forEach((value, index) => {
                    if (value) {
                        $('#razred').append(`<option value="${index}">${value}</option>`);
                    }
                });

                // Populate vrsta dropdown
                options.vrsta.forEach((value, index) => {
                    if (value) {
                        $('#vrsta').append(`<option value="${index}">${value}</option>`);
                    }
                });

                // Populate podvrsta dropdown
                options.podvrsta.forEach((value, index) => {
                    if (value) {
                        $('#podvrsta').append(`<option value="${index}">${value}</option>`);
                    }
                });

                options.podvrsta.forEach((value, index) => {
                    if (value) {
                        $('#podvrsta').append(`<option value="${index}">${value}</option>`);
                    }
                });

                console.log('Theme options loaded from API:', options);
            })
            .catch(error => {
                console.error('Error loading theme options from API:', error);
            });
    }
    return Promise.resolve(); // Default return
}

// Function to load themes from database into dropdown
function loadThemesDropdown() {
    fetch('/api/v2/themes')
        .then(response => response.json())
        .then(data => {
            const themes = data.themes;
            const select = $('#teme_izbor');

            // Remove all options except the first one
            select.find('option:not(:first)').remove();

            // Add themes from database
            themes.forEach(theme => {
                const id = theme.id || theme.ID;
                const naziv = theme.naziv || theme.NAZIV;
                const opis = theme.opis || theme.OPIS || "";
                if (id && naziv) {
                    select.append(`<option value="${id}">${naziv}</option>`);
                    // Store metadata
                    window.temeMetadata[id] = { naziv: naziv, opis: opis };
                }
            });

            // Restore previously selected theme if it exists
            if (window.lastSelectedTeme && window.lastSelectedTeme != "0") {
                select.val(window.lastSelectedTeme);
            }
        })
        .catch(error => {
            console.error('Error loading themes:', error);
        });
}

// Function to handle search form submission
function handleTemeSearch(e) {
    if (e) e.preventDefault();

    // Validate that a theme is selected
    if (!window.lastSelectedTeme || window.lastSelectedTeme === "0") {
        $('#teme_alert_area').text('Тема није изабрана').show();
        return;
    }

    // Check if there are pending inserts
    if (window.temeInsertRows.length > 0) {
        $('#teme_alert_area').text("Нова претрага нија могућа док постоје приједлози за унос у дијелу 'ново'").show();
        setTimeout(function () { $('#teme_alert_area').fadeOut(); }, 3000);
        return;
    }

    // Set global tabela variable
    if (typeof window.tabela === 'undefined') {
        window.tabela = null;
    }
    window.tabela = window.lastSelectedTeme;

    const searchData = {
        tabela: window.lastSelectedTeme,
        razred: $('#razred').val(),
        vrsta: $('#vrsta').val(),
        podvrsta: $('#podvrsta').val(),
        prostorno: $('#prostorno').val(),
        vremenski: $('#vremenski').val(),
        izvor: $('#izvor').val(),
        opis: $('#opis').val()
    };

    // Store time span for validation
    window.temeSearchTimeSpan = {
        od: $('#od').val(),
        do: $('#do').val()
    };

    const spinner = $('#form_trazi_cekanje');
    spinner.css('visibility', 'visible');

    // Clear alert area
    $('#teme_alert_area').hide().text('');

    // Update Clarification Section
    if (window.temeMetadata && window.temeMetadata[window.lastSelectedTeme] && window.temeMetadata[window.lastSelectedTeme].opis) {
        $('#teme_objasnjenje_content').text(window.temeMetadata[window.lastSelectedTeme].opis);
    } else {
        $('#teme_objasnjenje_content').text("тема није изабрана");
    }

    // Perform actual search via API
    $.ajax({
        url: 'api/search',
        type: 'post',
        dataType: 'json',
        data: searchData,
        success: function (data) {
            spinner.css('visibility', 'hidden');

            // Save state
            if (typeof window.temeState === 'undefined') window.temeState = {};
            window.temeState.searchData = searchData;
            window.temeState.searchResults = data;
            window.temeState.timeSpan = window.temeSearchTimeSpan;


            // Remove previous layers
            if (typeof window.addedGeoJSON !== 'undefined' && window.addedGeoJSON) {
                karta.removeLayer(window.addedGeoJSON);
                window.addedGeoJSON = null;
            }
            if (typeof window.temeClusterLayer !== 'undefined' && window.temeClusterLayer) {
                karta.removeLayer(window.temeClusterLayer);
                window.temeClusterLayer = null;
            }

            // Check if clustering is enabled
            const groupingEnabled = $('#gr_cluster_checkbox').is(':checked');

            if (groupingEnabled) {
                // Initialize MarkerClusterGroup
                window.temeClusterLayer = L.markerClusterGroup();

                const geoJsonLayer = L.geoJSON(data, {
                    pointToLayer: function (feature, latlng) {
                        return L.marker(latlng, {
                            icon: typeof window.createIcon === 'function'
                                ? window.createIcon(feature.properties.r, searchData.tabela)
                                : new L.Icon.Default()
                        });
                    },
                    onEachFeature: typeof window.onEachFeature === 'function' ? window.onEachFeature : function () { }
                });

                window.temeClusterLayer.addLayer(geoJsonLayer);
                karta.addLayer(window.temeClusterLayer);

                // Store reference for consistency
                window.addedGeoJSON = window.temeClusterLayer;
            } else {
                // Standard GeoJSON Layer
                window.addedGeoJSON = L.geoJSON(data, {
                    pointToLayer: function (feature, latlng) {
                        return L.marker(latlng, {
                            icon: typeof window.createIcon === 'function'
                                ? window.createIcon(feature.properties.r, searchData.tabela)
                                : new L.Icon.Default()
                        });
                    },
                    onEachFeature: typeof window.onEachFeature === 'function' ? window.onEachFeature : function () { }
                }).addTo(karta);
            }

            // Fit map bounds to show all markers
            if (window.addedGeoJSON && !$.isEmptyObject(window.addedGeoJSON)) {
                karta.fitBounds(window.addedGeoJSON.getBounds());
            }

            // Show the алат checkbox after successful search
            $('#teme_alat_container').show();

            // Search for događaji regardless of time span
            const od = $('#od').val();
            const doDate = $('#do').val();
            searchDogadjajiForTeme(od, doDate);
        },
        error: function () {
            spinner.css('visibility', 'hidden');
            $('#teme_alert_area').text('Грешка при претрази').show();
        }
    });
}

// Function to search for događaji that overlap with the time span
function searchDogadjajiForTeme(od, doDate) {
    const searchData = {
        pocetak: od,
        kraj: doDate
    };

    fetch('/api/dogadjaji/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchData)
    })
        .then(response => {
            if (!response.ok) {
                console.log('Događaji search not available');
                return null;
            }
            return response.json();
        })
        .then(data => {
            if (data && data.success && data.results && data.results.length > 0) {
                // Save results to state
                if (typeof window.temeState === 'undefined') window.temeState = {};
                window.temeState.dogadjajiResults = data.results;

                displayDogadjajiResults(data.results);
                // Use Bootstrap collapse method instead of show() to avoid breaking toggle
                $('#teme_dogadjaji_podaci').collapse('show');
            } else {
                if (typeof window.temeState !== 'undefined') window.temeState.dogadjajiResults = null;
                $('#teme_dogadjaji_results').hide();
            }
        })
        .catch(error => {
            console.log('Događaji search error (non-critical):', error);
            $('#teme_dogadjaji_results').hide();
        });
}

// Function to display događaji results
function displayDogadjajiResults(results) {
    const resultsBody = $('#teme_dogadjaji_results_body');
    const resultsContainer = $('#teme_dogadjaji_results');

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
                <tr style="cursor: pointer;" onclick="viewDogadjajFromTeme(${result.id})">
                    <td style="padding: 5px; width: 60px;">${result.id}</td>
                    <td style="padding: 5px;">${result.opis || ''}</td>
                    <td style="padding: 5px; width: 30px; text-align: center;">${locationIcon}</td>
                </tr>
            `);
        });
    }

    resultsContainer.show();
}

// Function to view događaj from teme tab
function viewDogadjajFromTeme(id) {
    if (typeof viewDogadjaj === 'function') {
        viewDogadjaj(id);
    } else {
        // Load dogadjaji.js if it's not loaded
        console.log('dogadjaji.js not loaded, loading dynamically...');
        $.getScript('sections/dogadjaji.js')
            .done(function () {
                console.log('dogadjaji.js loaded');
                // We also need to ensure initDogadjajLayer is called since it sets up the resize handles
                if (typeof initDogadjajLayer === 'function') {
                    initDogadjajLayer();
                }
                if (typeof viewDogadjaj === 'function') {
                    viewDogadjaj(id);
                }
            })
            .fail(function () {
                console.error('Failed to load dogadjaji.js');
                alert('Грешка при учитавању детаља догађаја.');
            });
    }
}

// Initialize drawing tool checkbox functionality
function initializeDrawingToolCheckbox() {
    console.log('Initializing teme drawing tool checkbox...');

    // Handle checkbox toggle
    $('#teme_alat_checkbox').off('change').on('change', function () {
        const isChecked = $(this).is(':checked');
        console.log('Teme drawing tool checkbox changed:', isChecked);

        // Update state
        if (typeof window.temeState === 'undefined') window.temeState = {};
        window.temeState.alatVisible = isChecked;

        if (isChecked) {
            // Enable drawing control
            if (!karta.hasLayer(drawnItems)) {
                drawnItems.addTo(karta);
            }
            if (!karta._controlContainer.querySelector('.leaflet-draw')) {
                drawnControl.addTo(karta);
            }
            console.log('Drawing control enabled from teme');
        } else {
            // Disable drawing control
            if (karta._controlContainer.querySelector('.leaflet-draw')) {
                karta.removeControl(drawnControl);
            }
            console.log('Drawing control disabled from teme');
        }
    });

    // Listen for draw:created events
    karta.off('draw:created.teme').on('draw:created.teme', function (e) {
        console.log('Teme draw created event received');

        const layer = e.layer;
        const layerType = e.layerType;

        // Get geometry in GeoJSON format
        let geometry = null;
        if (layerType === 'marker') {
            const latLng = layer.getLatLng();
            geometry = {
                type: 'Point',
                coordinates: [latLng.lng, latLng.lat]
            };
        } else if (layerType === 'polyline') {
            const latLngs = layer.getLatLngs();
            geometry = {
                type: 'LineString',
                coordinates: latLngs.map(ll => [ll.lng, ll.lat])
            };
        } else if (layerType === 'polygon') {
            const latLngs = layer.getLatLngs()[0];
            geometry = {
                type: 'Polygon',
                coordinates: [latLngs.map(ll => [ll.lng, ll.lat])]
            };
        }

        // Create new insert row (Data only)
        addNewInsertRow(geometry, layerType, layer);

        // Add layer to drawnItems so it stays visible
        if (typeof drawnItems !== 'undefined') {
            drawnItems.addLayer(layer);
        }

        // Bind popup to layer
        bindPopupToLayer(layer, window.temeInsertRows.length - 1);
    });
}

// Function to add new insert row data and trigger render
function addNewInsertRow(geometry, layerType, layer) {
    const rowIndex = window.temeInsertRows.length;

    // Store the row data with layer reference
    window.temeInsertRows.push({
        geometry: geometry,
        geometryType: layerType,
        layer: layer,
        data: {}
    });

    // Render the new row
    renderInsertRow(rowIndex);
}

// Function to render a specific insert row
function renderInsertRow(rowIndex) {
    // Get current dropdown values from search form or use cached logic if needed
    const razredOptions = $('#razred').html();
    const vrstaOptions = $('#vrsta').html();
    const podvrstaOptions = $('#podvrsta').html();

    // Create the row HTML
    const rowHtml = `
        <div class="teme_insert_row" data-row-index="${rowIndex}">
            <input type="text" class="form-control" placeholder="опис" data-field="opis" style="min-width: 150px;">
            <select class="form-control" data-field="razred" style="min-width: 120px;">
                ${razredOptions}
            </select>
            <select class="form-control" data-field="vrsta" style="min-width: 120px;">
                ${vrstaOptions}
            </select>
            <select class="form-control" data-field="podvrsta" style="min-width: 120px;">
                ${podvrstaOptions}
            </select>
            <select class="form-control" data-field="prostorno" style="min-width: 120px;">
                <option value="">просторно</option>
                <option value="одређено">одређено</option>
                <option value="неодређено">неодређено</option>
            </select>
            <select class="form-control" data-field="vremenski" style="min-width: 120px;">
                <option value="">временски</option>
                <option value="одређено">одређено</option>
                <option value="неодређено">неодређено</option>
            </select>
            <input type="datetime-local" class="form-control" data-field="pocetak" style="min-width: 180px;">
            <input type="datetime-local" class="form-control" data-field="kraj" style="min-width: 180px;">
            <input type="text" class="form-control" placeholder="извор" data-field="izvor" style="min-width: 120px;">
            <select class="form-control" data-field="zapis" style="min-width: 100px;">
                <option value="">запис</option>
            </select>
            <button type="button" class="btn btn-sm btn-danger" onclick="removeInsertRow(${rowIndex})">×</button>
        </div>
    `;

    $('#teme_insert_rows_container').append(rowHtml);

    // Populate zapis dropdown
    populateZapisDropdown(rowIndex, window.tabela || window.lastSelectedTeme);

    // Add highlighting and state management on focus
    const newRow = $(`.teme_insert_row[data-row-index="${rowIndex}"]`);

    newRow.find('input, select').on('focus', function () {
        const rowData = window.temeInsertRows[rowIndex];
        if (rowData && rowData.geometry) {
            highlightMapObject(rowData.geometry);

            // Open popup for this row, closing others
            if (rowData.layer) {
                rowData.layer.openPopup();
            }
        }
        // Highlight row style
        $('.teme_insert_row').removeClass('table-active'); // table-active is bootstrap gray bg
        $(this).closest('.teme_insert_row').addClass('table-active');
    });

    // Sync changes to data object
    newRow.find('input, select').on('change', function () {
        const field = $(this).data('field');
        const val = $(this).val();
        if (window.temeInsertRows[rowIndex]) {
            window.temeInsertRows[rowIndex].data[field] = val;

            // Update popup if exists
            const layer = window.temeInsertRows[rowIndex].layer;
            if (layer && layer.getPopup() && layer.getPopup().isOpen()) {
                updatePopupContent(layer, rowIndex);
            }
        }
    });

    // Show the предложи row if there are insert rows
    if (window.temeInsertRows.length > 0) {
        $('#teme_predlozi_row').show();
    }

    // Show the novo section if collapsed
    $('#teme_novo_podaci').collapse('show');
}

// Function to bind popup and sync logic
function bindPopupToLayer(layer, rowIndex) {
    if (!layer) return;

    // Get options for dropdowns
    const razredOptions = $('#razred').html();
    const vrstaOptions = $('#vrsta').html();
    const podvrstaOptions = $('#podvrsta').html();

    // Try to get Zapis options from the sidebar row if available
    const zapisOptions = $(`.teme_insert_row[data-row-index="${rowIndex}"] select[data-field="zapis"]`).html() || '<option value="">запис</option>';

    // Create popup content
    const popupContent = document.createElement('div');
    popupContent.className = 'teme-popup-form';
    popupContent.style.margin = '-5px';

    popupContent.innerHTML = `
        <div style="min-width: 260px; line-height: normal !important; font-size: 13px;">
            <div class="form-group mb-1" style="margin-bottom: 4px !important; line-height: 1 !important;">
                <input type="text" class="form-control form-control-sm popup-input" style="height: 30px !important; font-size: 13px !important; padding: 2px 5px !important; line-height: normal !important; box-sizing: border-box !important;" data-field="opis" placeholder="опис">
            </div>
            <div class="form-group mb-1" style="margin-bottom: 4px !important; line-height: 1 !important;">
                <select class="form-control form-control-sm popup-input" style="height: 30px !important; font-size: 13px !important; padding: 2px 5px !important; line-height: normal !important; box-sizing: border-box !important;" data-field="razred">${razredOptions}</select>
            </div>
            <div class="form-group mb-1" style="margin-bottom: 4px !important; line-height: 1 !important;">
                 <select class="form-control form-control-sm popup-input" style="height: 30px !important; font-size: 13px !important; padding: 2px 5px !important; line-height: normal !important; box-sizing: border-box !important;" data-field="vrsta">${vrstaOptions}</select>
            </div>
            <div class="form-group mb-1" style="margin-bottom: 4px !important; line-height: 1 !important;">
                 <select class="form-control form-control-sm popup-input" style="height: 30px !important; font-size: 13px !important; padding: 2px 5px !important; line-height: normal !important; box-sizing: border-box !important;" data-field="podvrsta">${podvrstaOptions}</select>
            </div>
            <div class="form-group mb-1" style="margin-bottom: 4px !important; line-height: 1 !important;">
                 <select class="form-control form-control-sm popup-input" style="height: 30px !important; font-size: 13px !important; padding: 2px 5px !important; line-height: normal !important; box-sizing: border-box !important;" data-field="prostorno">
                    <option value="">просторно</option>
                    <option value="одређено">одређено</option>
                    <option value="неодређено">неодређено</option>
                 </select>
            </div>
            <div class="form-group mb-1" style="margin-bottom: 4px !important; line-height: 1 !important;">
                 <select class="form-control form-control-sm popup-input" style="height: 30px !important; font-size: 13px !important; padding: 2px 5px !important; line-height: normal !important; box-sizing: border-box !important;" data-field="vremenski">
                    <option value="">временски</option>
                    <option value="одређено">одређено</option>
                    <option value="неодређено">неодређено</option>
                 </select>
            </div>
            <div class="form-group mb-1" style="margin-bottom: 4px !important; line-height: 1 !important;">
                <input type="datetime-local" class="form-control form-control-sm popup-input" style="height: 30px !important; font-size: 13px !important; padding: 2px 5px !important; line-height: normal !important; box-sizing: border-box !important;" data-field="pocetak" placeholder="почетак">
            </div>
            <div class="form-group mb-1" style="margin-bottom: 4px !important; line-height: 1 !important;">
                <input type="datetime-local" class="form-control form-control-sm popup-input" style="height: 30px !important; font-size: 13px !important; padding: 2px 5px !important; line-height: normal !important; box-sizing: border-box !important;" data-field="kraj" placeholder="крај">
            </div>
            <div class="form-group mb-1" style="margin-bottom: 4px !important; line-height: 1 !important;">
                 <input type="text" class="form-control form-control-sm popup-input" style="height: 30px !important; font-size: 13px !important; padding: 2px 5px !important; line-height: normal !important; box-sizing: border-box !important;" data-field="izvor" placeholder="извор">
            </div>
            <div class="form-group mb-1" style="margin-bottom: 4px !important; line-height: 1 !important;">
                 <select class="form-control form-control-sm popup-input" style="height: 30px !important; font-size: 13px !important; padding: 2px 5px !important; line-height: normal !important; box-sizing: border-box !important;" data-field="zapis">${zapisOptions}</select>
            </div>
            <div class="form-group mb-0" style="margin-bottom: 0px !important; line-height: 1 !important;">
                 <button class="btn btn-sm btn-light w-100 border py-0" style="height: 30px !important; line-height: 1.5 !important;" onclick="$('.teme_insert_row[data-row-index=${rowIndex}]').get(0).scrollIntoView({behavior: 'smooth', block: 'center'}); $('.teme_insert_row[data-row-index=${rowIndex}]').find('input').first().focus();">Иди на ред</button>
            </div>
        </div>
    `;

    // Bind events to popup inputs to sync back to row
    $(popupContent).find('.popup-input').on('change keyup', function () {
        const field = $(this).data('field');
        const val = $(this).val();

        // Update data
        if (window.temeInsertRows[rowIndex]) {
            window.temeInsertRows[rowIndex].data[field] = val;
        }

        // Update row input
        $(`.teme_insert_row[data-row-index="${rowIndex}"] [data-field="${field}"]`).val(val);
    });

    layer.bindPopup(popupContent);

    // On popup open, sync values from data
    layer.on('popupopen', function () {
        if (window.temeInsertRows[rowIndex]) {
            const data = window.temeInsertRows[rowIndex].data;
            $(popupContent).find('.popup-input').each(function () {
                const field = $(this).data('field');
                if (data[field]) $(this).val(data[field]);
                else $(this).val('');
            });

            // Also highlight row
            $('.teme_insert_row').removeClass('table-active');
            $(`.teme_insert_row[data-row-index="${rowIndex}"]`).addClass('table-active');

            highlightMapObject(window.temeInsertRows[rowIndex].geometry);
        }
    });
}

function updatePopupContent(layer, rowIndex) {
    if (layer.getPopup() && layer.getPopup().isOpen()) {
        const content = layer.getPopup().getContent();
        // content is the DOM element we passed
        const data = window.temeInsertRows[rowIndex].data;
        $(content).find('.popup-input').each(function () {
            const field = $(this).data('field');
            if (data[field]) $(this).val(data[field]);
        });
    }
}

// Function to populate zapis dropdown based on theme
function populateZapisDropdown(rowIndex, themeTable) {
    // Fetch zapisi from API
    $.ajax({
        url: '/api/zapisi/search',
        type: 'POST',
        data: JSON.stringify({ tema_id: themeTable }),
        contentType: 'application/json',
        success: function (response) {
            const select = $(`.teme_insert_row[data-row-index="${rowIndex}"] select[data-field="zapis"]`);

            select.empty();
            select.append('<option value="">запис</option>');

            if (response && response.results && response.results.length > 0) {
                response.results.forEach(zapis => {
                    select.append(`<option value="${zapis.id}">${zapis.naslov || zapis.opis || zapis.id}</option>`);
                });

                // Restore selected value if exists in data (handling async race condition)
                if (window.temeInsertRows[rowIndex] &&
                    window.temeInsertRows[rowIndex].data &&
                    window.temeInsertRows[rowIndex].data.zapis) {
                    select.val(window.temeInsertRows[rowIndex].data.zapis);
                }
            } else {
                // Strict filtering: if no results or not relevant, show nothing or "nema zapisa"
                // User requested strictly showing relevant options.
                select.append('<option value="0">нема записа</option>');
            }

            // Sync options to popup if it exists
            const rowData2 = window.temeInsertRows[rowIndex];
            if (rowData2 && rowData2.layer && rowData2.layer.getPopup()) {
                const popupContent = rowData2.layer.getPopup().getContent();
                // If content is string, we can't easily update. But we passed a DOM element in bindPopupToLayer?
                if (typeof popupContent === 'object') { // DOM element
                    const popupSelect = $(popupContent).find('select[data-field="zapis"]');
                    if (popupSelect.length > 0) {
                        // Copy options from sidebar select
                        popupSelect.html(select.html());
                        // Sync value
                        popupSelect.val(select.val());
                    }
                }
            }
        },
        error: function () {
            console.log('Error loading zapisi options');
            select.append('<option value="0">грешка</option>');
        }
    });
}


// Function to highlight map object
function highlightMapObject(geometry) {
    // Remove existing highlight if any
    if (window.temeHighlightLayer) {
        karta.removeLayer(window.temeHighlightLayer);
    }

    // Create highlight layer (yellow glow)
    if (geometry.type === 'Point') {
        window.temeHighlightLayer = L.circleMarker([geometry.coordinates[1], geometry.coordinates[0]], {
            radius: 15,
            color: '#ffcc00',
            fillColor: '#ffcc00',
            fillOpacity: 0.5,
            weight: 2
        }).addTo(karta);
    } else {
        window.temeHighlightLayer = L.geoJSON(geometry, {
            style: {
                color: '#ffcc00',
                weight: 8,
                opacity: 0.5
            }
        }).addTo(karta);
    }

    // Auto remove after 2 seconds
    setTimeout(() => {
        if (window.temeHighlightLayer) {
            karta.removeLayer(window.temeHighlightLayer);
            window.temeHighlightLayer = null;
        }
    }, 2000);
}

// Function to remove an insert row
function removeInsertRow(rowIndex) {
    try {
        // Remove from map
        const rowToRemove = window.temeInsertRows[rowIndex];
        if (rowToRemove && rowToRemove.layer) {
            try {
                // Ensure popup is closed
                karta.closePopup();

                if (typeof drawnItems !== 'undefined') drawnItems.removeLayer(rowToRemove.layer);
                if (typeof karta !== 'undefined') karta.removeLayer(rowToRemove.layer);
            } catch (e) {
                console.warn('Error removing layer from map:', e);
            }
            rowToRemove.layer = null;
        }

        // Remove from array
        window.temeInsertRows.splice(rowIndex, 1);

        // Re-render
        $('#teme_insert_rows_container').empty();

        // Safely re-render remaining rows
        window.temeInsertRows.forEach((row, index) => {
            try {
                // Re-render HTML with new index
                renderInsertRow(index);

                // Restore data into inputs
                const newRow = $(`.teme_insert_row[data-row-index="${index}"]`);
                if (row.data) {
                    Object.keys(row.data).forEach(key => {
                        newRow.find(`[data-field="${key}"]`).val(row.data[key]);
                    });
                }

                // Re-bind popup with new index
                if (row.layer) {
                    try {
                        row.layer.unbindPopup();
                        bindPopupToLayer(row.layer, index);
                    } catch (e) {
                        console.error('Error rebinding popup for row ' + index, e);
                    }
                }
            } catch (err) {
                console.error('Error re-rendering row ' + index, err);
            }
        });

        // Hide предложи row if no rows left
        if (window.temeInsertRows.length === 0) {
            $('#teme_predlozi_row').hide();
        }
    } catch (error) {
        console.error('Critical error in removeInsertRow:', error);
    }
}

// Function to clear all insert rows
function clearInsertRows() {
    window.temeInsertRows = [];
    $('#teme_insert_rows_container').empty();
    $('#teme_predlozi_row').hide();
    $('#teme_alert_area').hide().text('');

    // Clear drawn items from map
    if (typeof drawnItems !== 'undefined') {
        drawnItems.clearLayers();
    }
}





// Function to handle предложи button click
function handlePredloziSubmit() {
    console.log('Предложи clicked - functionality to be implemented');
    // TODO: Implement API call to submit proposals
}






// Initialization function
function initTemeSection() {
    console.log('Teme.js loaded, initializing section...');

    // Load themes from database
    loadThemesDropdown();

    // Restore the previously selected theme when section reloads
    if (window.lastSelectedTeme && window.lastSelectedTeme != "0") {
        setTimeout(() => {
            $('#teme_izbor').val(window.lastSelectedTeme);

            // We load theme options unconditionally and wait for it
            loadTemeContent(window.lastSelectedTeme, true).then(() => {
                // Restore search criteria values AFTER options are loaded
                if (window.temeState && window.temeState.searchData) {
                    $('#razred').val(window.temeState.searchData.razred);
                    $('#vrsta').val(window.temeState.searchData.vrsta);
                    $('#podvrsta').val(window.temeState.searchData.podvrsta);

                    // Also ensure global tabela is set
                    window.tabela = window.lastSelectedTeme;
                }

                // RESTORE INSERT ROWS
                // Now options are loaded so this will render correctly
                if (window.temeInsertRows && window.temeInsertRows.length > 0) {
                    $('#teme_insert_rows_container').empty();
                    window.temeInsertRows.forEach((row, index) => {
                        renderInsertRow(index);
                        // Restore data into inputs
                        const newRow = $(`.teme_insert_row[data-row-index="${index}"]`);
                        if (row.data) {
                            Object.keys(row.data).forEach(key => {
                                newRow.find(`[data-field="${key}"]`).val(row.data[key]);
                            });
                        }
                        // Re-bind popup
                        if (row.layer) {
                            row.layer.unbindPopup();
                            bindPopupToLayer(row.layer, index);
                        }
                    });
                    $('#teme_predlozi_row').show();
                    $('#teme_novo_podaci').collapse('show');
                }
            });

            if (window.temeState && window.temeState.searchResults) {
                // Restore map markers
                const data = window.temeState.searchResults;
                // Remove previous GeoJSON layer if exists
                if (typeof addedGeoJSON !== 'undefined' && !$.isEmptyObject(addedGeoJSON)) {
                    karta.removeLayer(addedGeoJSON);
                }
                window.addedGeoJSON = L.geoJSON(data, {
                    pointToLayer: function (feature, latlng) {
                        return L.marker(latlng, {
                            icon: typeof createIcon === 'function'
                                ? createIcon(feature.properties.r, window.temeState.searchData.tabela)
                                : new L.Icon.Default()
                        });
                    },
                    onEachFeature: typeof onEachFeature === 'function' ? onEachFeature : function () { }
                }).addTo(karta);

                if (window.addedGeoJSON && !$.isEmptyObject(window.addedGeoJSON)) {
                    karta.fitBounds(window.addedGeoJSON.getBounds());
                }

                $('#teme_alat_container').show();
            }

            if (window.temeState && window.temeState.alatVisible) {
                $('#teme_alat_checkbox').prop('checked', true).trigger('change');
            }

            // RESTORE DOGADJAJI RESULTS
            if (window.temeState && window.temeState.dogadjajiResults) {
                displayDogadjajiResults(window.temeState.dogadjajiResults);
                $('#teme_dogadjaji_podaci').collapse('show');
            }

            // RESTORE NOVO INSERT ROWS (Persistence Fix)
            if (window.temeInsertRows && window.temeInsertRows.length > 0) {
                for (let i = 0; i < window.temeInsertRows.length; i++) {
                    renderInsertRow(i);
                }
                $('#teme_predlozi_row').show();
                $('#teme_novo_podaci').collapse('show');
            }
        }, 300);
    }

    console.log('Initializing teme section...');

    // Event handler for theme selection
    $('#teme_izbor').off('change').on('change', function () {
        var valueSelected = $(this).find("option:selected").val();
        loadTemeContent(valueSelected);
    });

    // Event handler for search form
    $('#form_trazi').off('submit').on('submit', function (e) {
        handleTemeSearch(e);
    });

    // Initialize drawing tool checkbox
    initializeDrawingToolCheckbox();

    // Event handler for предложи button
    $('#teme_predlozi_button').off('click').on('click', function () {
        handlePredloziSubmit();
    });

    // Initialize Bootstrap collapse properly
    console.log('=== Initializing collapse ===');
    // toggle: false prevents auto-toggling on init
    $('#teme_dogadjaji_podaci, #teme_novo_podaci, #teme_objasnjenje_podaci').collapse({ toggle: false });

    // Ensure dogadjaji section does NOT have inline display: block from previous show() calls
    $('#teme_dogadjaji_podaci').css('display', '');

    // Attach handlers directly to each specific icon
    $('#teme_dogadjaji span[data-target="#teme_dogadjaji_podaci"]').off('click').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('događaji icon clicked!');
        $('#teme_dogadjaji_podaci').collapse('toggle');
    });

    $('#teme_novo span[data-target="#teme_novo_podaci"]').off('click').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('ново icon clicked!');
        $('#teme_novo_podaci').collapse('toggle');
    });

    console.log('Handlers attached');

    // --- SYNC DELETION: Removed from map -> Remove from sidebar ---
    karta.off('draw:deleted').on('draw:deleted', function (e) {
        var layers = e.layers;
        layers.eachLayer(function (layer) {
            // Find index in temeInsertRows
            // Because removing items shifts indices, we must be careful.
            // However, Leaflet ID should be unique.
            if (window.temeInsertRows && window.temeInsertRows.length > 0) {
                // Find the index. We iterate assuming unique layers.
                let foundIndex = -1;
                for (let i = 0; i < window.temeInsertRows.length; i++) {
                    if (window.temeInsertRows[i].layer === layer || window.temeInsertRows[i].layer._leaflet_id === layer._leaflet_id) {
                        foundIndex = i;
                        break;
                    }
                }

                if (foundIndex !== -1) {
                    console.log(`Sync deletion: Removing row ${foundIndex} for layer ${layer._leaflet_id}`);
                    removeInsertRow(foundIndex);
                }
            }
        });
    });

    // --- SYNC EDITING: Modified on map -> Update sidebar coordinates ---
    karta.off('draw:edited').on('draw:edited', function (e) {
        var layers = e.layers;
        layers.eachLayer(function (layer) {
            if (window.temeInsertRows && window.temeInsertRows.length > 0) {
                let foundRow = null;
                let foundIndex = -1;

                for (let i = 0; i < window.temeInsertRows.length; i++) {
                    if (window.temeInsertRows[i].layer === layer || window.temeInsertRows[i].layer._leaflet_id === layer._leaflet_id) {
                        foundRow = window.temeInsertRows[i];
                        foundIndex = i;
                        break;
                    }
                }

                if (foundRow) {
                    console.log(`Sync editing: Updating coords for row ${foundIndex}`);
                    // Update coordinates based on layer type
                    if (layer instanceof L.Marker) {
                        foundRow.tacke = JSON.stringify([layer.getLatLng().lat, layer.getLatLng().lng]);
                    } else if (layer instanceof L.Polyline || layer instanceof L.Polygon) {
                        // Simplify for storage: array of [lat, lng] arrays
                        const latlngs = layer.getLatLngs();
                        // Handle nested arrays (multipolygons) if necessary, strictly flattened for now as per previous logic
                        // Assuming simple polygon/polyline for basic implementation matching existing add logic
                        let points = [];
                        if (Array.isArray(latlngs[0])) { // Polygon default structure often nested
                            latlngs[0].forEach(ll => points.push([ll.lat, ll.lng]));
                        } else {
                            latlngs.forEach(ll => points.push([ll.lat, ll.lng]));
                        }
                        foundRow.tacke = JSON.stringify(points);
                    }

                    // Update the hidden input in the sidebar
                    const rowElement = $(`#teme_insert_row_${foundIndex}`);
                    if (rowElement.length) {
                        rowElement.find('input[data-field="koordinate"]').val(foundRow.tacke);
                        // Also highlight to indicate update
                        rowElement.css('background-color', '#fff3cd');
                        setTimeout(() => rowElement.css('background-color', ''), 500);
                    }
                }
            }
        });
    });

    // Initialize clustering toggle listener
    $('#gr_cluster_checkbox').off('change').on('change', function () {
        // If we have search results, re-render markers
        if (window.temeState && window.temeState.searchResults) {
            const data = window.temeState.searchResults;
            const searchData = window.temeState.searchData || { tabela: window.lastSelectedTeme }; // Use saved searchData or fallback

            // Remove previous layers
            if (typeof window.addedGeoJSON !== 'undefined' && window.addedGeoJSON) {
                karta.removeLayer(window.addedGeoJSON);
                window.addedGeoJSON = null;
            }
            if (typeof window.temeClusterLayer !== 'undefined' && window.temeClusterLayer) {
                karta.removeLayer(window.temeClusterLayer);
                window.temeClusterLayer = null;
            }

            const groupingEnabled = $(this).is(':checked');

            if (groupingEnabled) {
                // Initialize MarkerClusterGroup
                window.temeClusterLayer = L.markerClusterGroup();

                const geoJsonLayer = L.geoJSON(data, {
                    pointToLayer: function (feature, latlng) {
                        return L.marker(latlng, {
                            icon: typeof window.createIcon === 'function'
                                ? window.createIcon(feature.properties.r, searchData.tabela)
                                : new L.Icon.Default()
                        });
                    },
                    onEachFeature: typeof window.onEachFeature === 'function' ? window.onEachFeature : function () { }
                });

                window.temeClusterLayer.addLayer(geoJsonLayer);
                karta.addLayer(window.temeClusterLayer);
                window.addedGeoJSON = window.temeClusterLayer;
            } else {
                // Standard GeoJSON Layer
                window.addedGeoJSON = L.geoJSON(data, {
                    pointToLayer: function (feature, latlng) {
                        return L.marker(latlng, {
                            icon: typeof window.createIcon === 'function'
                                ? window.createIcon(feature.properties.r, searchData.tabela)
                                : new L.Icon.Default()
                        });
                    },
                    onEachFeature: typeof window.onEachFeature === 'function' ? window.onEachFeature : function () { }
                }).addTo(karta);
            }
        }
    });
}

// Export for dynamic section loading
window.initTemeSection = initTemeSection;
