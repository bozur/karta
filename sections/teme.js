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

// Global variable to cache theme options for popup/sidebar display
if (typeof window.themeOptionsCache === 'undefined') {
    window.themeOptionsCache = {};
}

if (typeof window.playbackState === 'undefined') {
    window.playbackState = {
        intervalId: null,
        isRunning: false,
        allMarkers: null,
        currentStep: 0,
        totalSteps: 100,
        stepSizeDays: 0,
        minDate: null,
        maxDate: null
    };
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




                console.log('Theme options loaded from API:', options);

                // Cache the options for use in karta.js (popups/sidebar)
                // Structure matches the old 'table' array: [razred, vrsta, podvrsta]
                window.themeOptionsCache[valueSelected] = [
                    options.razred,   // index 0
                    options.vrsta,    // index 1
                    options.podvrsta  // index 2
                ];
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
        opis: $('#opis').val(),
        od: $('#od').val(),
        do: $('#do').val()
    };

    if (searchData.od && searchData.do) {
        if (new Date(searchData.do) < new Date(searchData.od)) {
            $('#do').css('border-color', 'red');
            $('#teme_alert_area').text('Вријеме краја мора бити послије почетка!').show();
            return;
        }
    }

    // Store time span for validation
    window.temeSearchTimeSpan = {
        od: $('#od').val(),
        do: $('#do').val()
    };

    const spinner = $('#form_trazi_cekanje');
    spinner.css('visibility', 'visible');

    // Clear alert area
    // Clear alert area
    $('#teme_alert_area').hide().text('');

    // Stop playback if running first (prevents it from restoring old markers later)
    if (window.playbackState && window.playbackState.isRunning) {
        if (typeof stopPlayback === 'function') {
            stopPlayback();
        } else {
            if (window.playbackState.intervalId) clearInterval(window.playbackState.intervalId);
            window.playbackState.isRunning = false;
            $('#playback_start_btn').removeClass('bi-stop-btn-fill').addClass('bi-play-btn-fill');
        }
    }

    // Clear search results state to prevent any async restoration
    if (typeof window.temeState !== 'undefined') {
        window.temeState.searchResults = null;
        window.temeState.dogadjajiResults = null;
    }

    // Clear any playback alerts
    $('#playback_alert_row').hide();
    $('#playback_alert_msg').text('');

    // Clear all existing map objects (Requirement 1)
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
    if (typeof window.currentDogadjajiMarker !== 'undefined' && window.currentDogadjajiMarker) {
        karta.removeLayer(window.currentDogadjajiMarker);
        window.currentDogadjajiMarker = null;
    }
    if (typeof closeDogadjajLayer === 'function') {
        closeDogadjajLayer();
    }
    if (typeof drawnItems !== 'undefined') {
        drawnItems.clearLayers();
    }
    if (typeof window.dogadjajiApprovalMarkers !== 'undefined' && window.dogadjajiApprovalMarkers) {
        window.dogadjajiApprovalMarkers.forEach(m => karta.removeLayer(m));
        window.dogadjajiApprovalMarkers = [];
    }
    if (typeof window.stavkeApprovalMarkers !== 'undefined' && window.stavkeApprovalMarkers) {
        window.stavkeApprovalMarkers.forEach(m => karta.removeLayer(m));
        window.stavkeApprovalMarkers = [];
    }

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


            // Remove submitted objects layer from previous sessions (redundant but kept for safety)
            if (typeof window.submittedObjectsLayer !== 'undefined' && window.submittedObjectsLayer) {
                karta.removeLayer(window.submittedObjectsLayer);
                window.submittedObjectsLayer = null;
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

            // Fit map bounds to show all markers (only if there are layers)
            if (window.addedGeoJSON && !$.isEmptyObject(window.addedGeoJSON)) {
                try {
                    const bounds = window.addedGeoJSON.getBounds();
                    if (bounds.isValid()) {
                        karta.fitBounds(bounds);
                    }
                } catch (err) {
                    console.log("Could not fit bounds (empty or invalid):", err);
                }
            }

            // Show the алат checkbox after successful search
            $('#teme_alat_container').show();

            // Novo section should only expand if alat is checked (Requirement changed)
            if ($('#teme_alat_checkbox').is(':checked')) {
                $('#teme_novo_podaci').collapse('show');
            }

            // Search for događaji regardless of time span
            const od = $('#od').val();
            const doDate = $('#do').val();
            searchDogadjajiForTeme(od, doDate);

            // Update playback date range if playback section exists
            if (typeof calculatePlaybackRange === 'function') {
                calculatePlaybackRange();
            }
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

    // Check if we have search results (Requirement: Drawing only allowed after search)
    const hasResults = (window.temeState && window.temeState.searchResults);

    if (hasResults) {
        // Show container if we have results
        $('#teme_alat_container').show();

        // Synchronize checkbox state with current drawing control state
        const isDrawingControlVisible = (typeof karta !== 'undefined' && karta._controlContainer && karta._controlContainer.querySelector('.leaflet-draw') !== null);
        $('#teme_alat_checkbox').prop('checked', isDrawingControlVisible);
        console.log('Teme drawing control visible on init (with results):', isDrawingControlVisible);

        // If control is visible, ensure section is expanded
        if (isDrawingControlVisible) {
            $('#teme_novo_podaci').collapse('show');
        }
    } else {
        // NO RESULTS: User should NOT be able to draw (Requirement)
        console.log('No search results in Teme tab - removing drawing tool if active');

        // Hide container
        $('#teme_alat_container').hide();

        // Uncheck
        $('#teme_alat_checkbox').prop('checked', false);

        // DEACTIVATE TOOL (Removes from map if it was active from another tab)
        if (typeof karta !== 'undefined' && karta._controlContainer && karta._controlContainer.querySelector('.leaflet-draw')) {
            if (typeof drawnControl !== 'undefined') {
                karta.removeControl(drawnControl);
            }
        }

        // Ensure novo section is collapsed
        $('#teme_novo_podaci').collapse('hide');
    }

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
            $('#teme_novo_podaci').collapse('show');
            console.log('Drawing control enabled from teme');
        } else {
            // Disable drawing control
            if (karta._controlContainer.querySelector('.leaflet-draw')) {
                karta.removeControl(drawnControl);
            }
            $('#teme_novo_podaci').collapse('hide');
            console.log('Drawing control disabled from teme');
        }
    });

    // Listen for draw:created events
    karta.off('draw:created.teme').on('draw:created.teme', function (e) {
        console.log('Teme draw created event received');

        const layer = e.layer;
        const layerType = e.layerType;

        // Check zoom level - must be at least 13
        const currentZoom = karta.getZoom();
        const minZoom = 13;

        if (currentZoom < minZoom) {
            // Show error in the novo alert area
            $('#teme_novo_alert_area').text('Приближите карту ради тачности уноса!').show();
            console.log('Zoom level too low for teme:', currentZoom, '< minimum:', minZoom);

            // Remove the temporary layer from the map
            if (typeof drawnItems !== 'undefined') {
                drawnItems.removeLayer(layer);
            }
            karta.removeLayer(layer);
            return;
        }

        // Clear any previous error messages
        $('#teme_novo_alert_area').hide().text('');

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
            <input type="text" class="form-control flatpickr-input" data-field="pocetak" style="min-width: 180px;" placeholder="почетак">
            <input type="text" class="form-control flatpickr-input" data-field="kraj" style="min-width: 180px;" placeholder="крај">
            <input type="text" class="form-control" placeholder="извор" data-field="izvor" style="min-width: 120px;">
            <select class="form-control" data-field="zapis" style="min-width: 100px;">
                <option value="">запис</option>
            </select>
            <button type="button" class="btn btn-sm btn-danger" onclick="removeInsertRow(${rowIndex})">×</button>
        </div>
    `;

    $('#teme_insert_rows_container').append(rowHtml);

    // Initialize Flatpickr for the new row
    if (typeof flatpickr !== 'undefined') {
        const rowSelector = `.teme_insert_row[data-row-index="${rowIndex}"]`;
        flatpickr(`${rowSelector} input[data-field="pocetak"], ${rowSelector} input[data-field="kraj"]`, {
            enableTime: true,
            dateFormat: "Y-m-d H:i",
            locale: "sr",
            time_24hr: true
        });
    }

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
                <input type="text" class="form-control form-control-sm popup-input flatpickr-input" style="height: 30px !important; font-size: 13px !important; padding: 2px 5px !important; line-height: normal !important; box-sizing: border-box !important;" data-field="pocetak" placeholder="почетак">
            </div>
            <div class="form-group mb-1" style="margin-bottom: 4px !important; line-height: 1 !important;">
                <input type="text" class="form-control form-control-sm popup-input flatpickr-input" style="height: 30px !important; font-size: 13px !important; padding: 2px 5px !important; line-height: normal !important; box-sizing: border-box !important;" data-field="kraj" placeholder="крај">
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
        // Initialize Flatpickr for popup inputs
        if (typeof flatpickr !== 'undefined') {
            flatpickr($(popupContent).find('input[data-field="pocetak"], input[data-field="kraj"]'), {
                enableTime: true,
                dateFormat: "Y-m-d H:i",
                locale: "sr",
                time_24hr: true
            });
        }
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





// Function to validate a single insert row
function validateInsertRow(rowIndex) {
    const row = window.temeInsertRows[rowIndex];
    const rowElement = $(`.teme_insert_row[data-row-index="${rowIndex}"]`);
    const data = row.data;
    let isValid = true;
    let errorMsg = null; // Store only the FIRST error message

    // Reset styles
    rowElement.find('input, select').css('border', '');

    // 1. Validate Opis (Required, max 255) - First visually
    if (!data.opis || data.opis.trim() === "") {
        rowElement.find('input[data-field="opis"]').css('border', '1px solid red');
        isValid = false;
        if (!errorMsg) errorMsg = "Унесите опис.";
    } else if (data.opis.length > 255) {
        rowElement.find('input[data-field="opis"]').css('border', '1px solid red');
        isValid = false;
        if (!errorMsg) errorMsg = "Опис је предугачак (макс 255).";
    }

    // 2. Validate Razred (Required)
    if (!data.razred || data.razred === "") {
        rowElement.find('select[data-field="razred"]').css('border', '1px solid red');
        isValid = false;
        if (!errorMsg) errorMsg = "Изаберите разред.";
    }

    // 3. Validate Vrsta (Required if options exist)
    const vrstaSelect = rowElement.find('select[data-field="vrsta"]');
    if (vrstaSelect.find('option').length > 1 && (!data.vrsta || data.vrsta === "")) {
        vrstaSelect.css('border', '1px solid red');
        isValid = false;
        if (!errorMsg) errorMsg = "Изаберите врсту.";
    }

    // 4. Validate Podvrsta (Required if options exist)
    const podvrstaSelect = rowElement.find('select[data-field="podvrsta"]');
    if (podvrstaSelect.find('option').length > 1 && (!data.podvrsta || data.podvrsta === "")) {
        podvrstaSelect.css('border', '1px solid red');
        isValid = false;
        if (!errorMsg) errorMsg = "Изаберите подврсту.";
    }

    // 5. Validate Pocetak (Required)
    if (!data.pocetak || data.pocetak === "") {
        rowElement.find('input[data-field="pocetak"]').css('border', '1px solid red');
        isValid = false;
        if (!errorMsg) errorMsg = "Унесите вријеме почетка.";
    }

    // Helper to parse "YYYY-MM-DD HH:mm" or standard ISO
    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        // Try standard Date constructor first (ISO 8601)
        let d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d;

        // Try parsing "YYYY-MM-DD HH:mm" manually if Date() fails (e.g. cross-browser safety)
        // Example: "2025-01-15 12:30"
        const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2})$/);
        if (parts) {
            return new Date(parts[1], parts[2] - 1, parts[3], parts[4], parts[5]);
        }
        return null;
    };

    // 6. Validate Time Window
    // Ensure we have search parameters to validate against
    if (window.temeSearchTimeSpan && window.temeSearchTimeSpan.od && window.temeSearchTimeSpan.do) {
        const searchOd = parseDate(window.temeSearchTimeSpan.od);
        const searchDo = parseDate(window.temeSearchTimeSpan.do);

        let timeError = false;

        if (searchOd && searchDo) {
            if (data.pocetak) {
                const pocetak = parseDate(data.pocetak);
                // Check for valid date
                if (pocetak) {
                    if (pocetak < searchOd || pocetak > searchDo) {
                        rowElement.find('input[data-field="pocetak"]').css('border', '1px solid red');
                        isValid = false;
                        timeError = true;
                    }
                }
            }

            if (data.kraj) {
                const kraj = parseDate(data.kraj);
                if (kraj) {
                    if (kraj < searchOd || kraj > searchDo) {
                        rowElement.find('input[data-field="kraj"]').css('border', '1px solid red');
                        isValid = false;
                        timeError = true;
                    }
                }
            }

            if (timeError && !errorMsg) {
                errorMsg = "Временски распон мора бити унутар изабраног у претрази!";
            }
        }
    }

    // 7. Validate kraj >= pocetak
    if (data.pocetak && data.kraj) {
        const pocetak = parseDate(data.pocetak);
        const kraj = parseDate(data.kraj);
        if (pocetak && kraj && kraj < pocetak) {
            rowElement.find('input[data-field="kraj"]').css('border', '1px solid red');
            isValid = false;
            if (!errorMsg) errorMsg = "Вријеме краја мора бити послије почетка!";
        }
    }

    return { isValid, errorMsg: errorMsg || "" };
}

// Function to handle предложи button click
function handlePredloziSubmit() {
    console.log('Предложи clicked');

    // Clear previous alerts
    $('#teme_novo_alert_area').hide().text('');

    if (!window.temeInsertRows || window.temeInsertRows.length === 0) {
        return;
    }

    let allValid = true;
    let firstError = null;

    // Validate all rows
    for (let i = 0; i < window.temeInsertRows.length; i++) {
        const result = validateInsertRow(i);
        if (!result.isValid) {
            allValid = false;
            if (!firstError) firstError = result.errorMsg;
        }
    }

    if (!allValid) {
        $('#teme_novo_alert_area').text(firstError || "Попуните недостајуће вредности").show();
        return;
    }

    // Prepare data for submission
    const rowsToSubmit = window.temeInsertRows.map(row => {
        // Prepare WKT or GeoJSON geometry for backend to handle
        // We send the GeoJSON geometry object directly
        return {
            geometry: row.geometry,
            ...row.data
        };
    });

    // Disable button
    $('#teme_predlozi_button').prop('disabled', true).text('Слање...');

    // Post to API
    $.ajax({
        url: '/api/teme/insert',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            temaId: window.tabela || window.lastSelectedTeme,
            rows: rowsToSubmit
        }),
        success: function (response) {
            // Success handling

            // 1. Show success message
            const message = response.message || 'Подаци су послати';
            $('#teme_novo_alert_area').css('color', 'green').text(message).show();

            // Close any open popup globally
            karta.closePopup();

            // Initialize global submitted objects layer if not exists
            if (typeof window.submittedObjectsLayer === 'undefined' || !window.submittedObjectsLayer) {
                window.submittedObjectsLayer = L.featureGroup().addTo(karta);
            }

            // 2. Update map objects visual style (grey, non-interactive)
            window.temeInsertRows.forEach(row => {
                if (row.layer) {
                    // Update style based on layer type
                    if (row.geometryType === 'marker' && row.layer instanceof L.Marker) {
                        const latLng = row.layer.getLatLng();
                        // Remove original from map/drawnItems
                        karta.removeLayer(row.layer);
                        if (typeof drawnItems !== 'undefined') drawnItems.removeLayer(row.layer);

                        // Create grey persistent marker
                        const greyMarker = L.circleMarker(latLng, {
                            radius: 8,
                            fillColor: 'grey',
                            color: 'grey',
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.8
                        }); // .addTo(window.submittedObjectsLayer); added below

                        window.submittedObjectsLayer.addLayer(greyMarker);

                    } else {
                        // Polyline / Polygon
                        if (row.layer.setStyle) {
                            row.layer.setStyle({ color: 'grey', fillColor: 'grey' });
                        }

                        // Remove from map/drawnItems
                        karta.removeLayer(row.layer);
                        if (typeof drawnItems !== 'undefined') drawnItems.removeLayer(row.layer);

                        // Add clone or same layer to persistent group
                        window.submittedObjectsLayer.addLayer(row.layer);
                    }
                }
            });

            // 3. Clear insert rows data
            window.temeInsertRows = [];
            $('#teme_insert_rows_container').empty();
            $('#teme_predlozi_button').hide(); // Hide the button instead of row to keep success msg

            // 4. Fade out success message and restore UI state
            setTimeout(() => {
                $('#teme_novo_alert_area').fadeOut(function () {
                    $(this).css('color', 'orange').text('');
                    $('#teme_predlozi_row').hide();
                    $('#teme_predlozi_button').show().prop('disabled', false).text('предложи');
                });
            }, 3000);

        },
        error: function (err) {
            console.error('Error submitting data:', err);
            $('#teme_novo_alert_area').text('Грешка при слању података: ' + (err.responseJSON?.error || err.statusText)).show();
            $('#teme_predlozi_button').prop('disabled', false).text('предложи');
        }
    });
}






// Initialization function
function initTemeSection() {
    console.log('Teme.js loaded, initializing section...');

    // Load themes from database
    loadThemesDropdown();

    // Initialize Flatpickr (Global Library) - robust init with retry
    function ensureFlatpickr() {
        if (typeof flatpickr === 'undefined') {
            console.warn("Flatpickr lib not loaded yet?");
            return;
        }

        const inputs = $(".flatpickr-datetime");
        if (inputs.length === 0) {
            console.warn("Flatpickr inputs not found in DOM yet. Retrying...");
            setTimeout(ensureFlatpickr, 200);
            return;
        }

        // Manually define Serbian Cyrillic to be safe
        const SerbianCyrillic = {
            weekdays: {
                shorthand: ["Нед", "Пон", "Уто", "Сре", "Чет", "Пет", "Суб"],
                longhand: ["Недеља", "Понедељак", "Уторак", "Среда", "Четвртак", "Петак", "Субота"]
            },
            months: {
                shorthand: ["Јан", "Феб", "Мар", "Апр", "Мај", "Јун", "Јул", "Авг", "Сеп", "Окт", "Нов", "Дец"],
                longhand: ["Јануар", "Фебруар", "Март", "Април", "Мај", "Јун", "Јул", "Август", "Септембар", "Октобар", "Новембар", "Децембар"]
            },
            firstDayOfWeek: 1,
            weekAbbreviation: "Нед.",
            rangeSeparator: " до ",
            time_24hr: true
        };

        inputs.flatpickr({
            enableTime: true,
            dateFormat: "Y-m-d H:i",
            time_24hr: true,
            locale: SerbianCyrillic,
            disableMobile: true, // Force custom picker even on touch devices
            onReady: function () { console.log("Flatpickr READY and mounted"); }
        });
        console.log(`Flatpickr initialized on ${inputs.length} inputs in teme.js`);
    }

    // Call it
    ensureFlatpickr();

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
    // Initialize playback UI
    if (typeof initPlaybackUI === 'function') {
        initPlaybackUI();
    }
}

// Export for dynamic section loading
window.initTemeSection = initTemeSection;

// ==========================================
// Playback (Time Lapse) Functionality
// ==========================================

if (typeof window.playbackState === 'undefined') {
    window.playbackState = {
        intervalId: null,
        isRunning: false,
        allMarkers: null,
        currentStep: 0,
        totalSteps: 100,
        stepSizeDays: 0,
        minDate: null,
        maxDate: null
    };
}

function initPlaybackUI() {
    console.log('Initializing Playback UI events');

    // Listen for collapse show to calculate min/max
    $('#teme_playback_podaci').off('show.bs.collapse').on('show.bs.collapse', function () {
        calculatePlaybackRange();
    });

    // Start button
    $('#playback_start_btn').off('click').on('click', function () {
        startPlayback();
    });

    // Close layer button
    $(document).off('click', '#playback_close').on('click', '#playback_close', function () {
        stopPlayback();
    });

    // Pause/Resume button
    $(document).off('click', '#playback_pause_btn').on('click', '#playback_pause_btn', function () {
        togglePausePlayback();
    });

    // Stop button
    $(document).off('click', '#playback_stop_btn').on('click', '#playback_stop_btn', function () {
        stopPlayback();
    });
}

function calculatePlaybackRange() {
    if (!window.temeState || !window.temeState.searchResults || !window.temeState.searchResults.features) {
        // No search results - show empty state labels
        $('#playback_min_val').text('-');
        $('#playback_max_val').text('-');
        window.playbackState.minDate = null;
        window.playbackState.maxDate = null;
        return;
    }

    const features = window.temeState.searchResults.features;

    // Check if there are any features
    if (features.length === 0) {
        $('#playback_min_val').text('-');
        $('#playback_max_val').text('-');
        window.playbackState.minDate = null;
        window.playbackState.maxDate = null;
        return;
    }

    let minTime = null;
    let maxTime = null;

    features.forEach(f => {
        const v0 = f.properties.v0; // vrijeme0
        const v1 = f.properties.v1; // vrijeme1

        if (v0) {
            const d = new Date(v0).getTime();
            if (!isNaN(d)) {
                if (minTime === null || d < minTime) minTime = d;
                if (maxTime === null || d > maxTime) maxTime = d;
            }
        }
        if (v1) {
            const d = new Date(v1).getTime();
            if (!isNaN(d)) {
                if (minTime === null || d < minTime) minTime = d;
                if (maxTime === null || d > maxTime) maxTime = d;
            }
        }
    });

    if (minTime !== null && maxTime !== null) {
        // We have valid time data - show controls
        $('#playback_alert_row').hide();
        $('#playback_controls_container').show();

        window.playbackState.minDate = minTime;
        window.playbackState.maxDate = maxTime;

        // Format dates for display
        const minDateObj = new Date(minTime);
        const maxDateObj = new Date(maxTime);

        $('#playback_min_val').text(formatDateForDisplay(minDateObj));
        $('#playback_max_val').text(formatDateForDisplay(maxDateObj));
    } else {
        $('#playback_min_val').text('-');
        $('#playback_max_val').text('-');
        window.playbackState.minDate = null;
        window.playbackState.maxDate = null;
    }
}

function formatDateForDisplay(date) {
    return date.getDate() + '.' + (date.getMonth() + 1) + '.' + date.getFullYear() + '.';
}

function startPlayback() {
    console.log('--- startPlayback called ---');

    // Safety check: if already running, stop it first to reset
    if (window.playbackState.isRunning) {
        console.warn('Playback already running, stopping first...');
        stopPlayback();
    }

    // Recalculate to be sure
    calculatePlaybackRange();

    if (window.playbackState.minDate === null || window.playbackState.maxDate === null || !window.temeState || !window.temeState.searchResults || !window.temeState.searchResults.features || window.temeState.searchResults.features.length === 0) {
        $('#playback_alert_msg').text("Нема ставки за приказ!");
        $('#playback_alert_row').show();
        return;
    }

    if (window.playbackState.minDate === window.playbackState.maxDate) {
        $('#playback_alert_msg').text("Вријеме почетка и краја је исто!");
        $('#playback_alert_row').show();
        return;
    }

    // Check for searchData availability (needed for icons)
    if (!window.temeState || !window.temeState.searchData) {
        $('#playback_alert_msg').text('Подаци о претрази недостају. Молимо поновите претрагу.');
        $('#playback_alert_row').show();
        return;
    }

    // Clear any previous alerts
    $('#playback_alert_row').hide();

    // Prepare state
    window.playbackState.isRunning = true;
    window.playbackState.isPaused = false;
    window.playbackState.currentStep = 0;
    window.playbackState.currentDogadjajId = null;

    // Read step count from dropdown
    const selectedSteps = parseInt($('#playback_steps_select').val()) || 100;
    window.playbackState.totalSteps = selectedSteps;

    // Reset Pause icon to Pause state (in case it was Play)
    $('#playback_pause_btn').removeClass('bi-play-btn-fill').addClass('bi-pause-btn-fill').attr('title', 'заустави');

    // Calculate step size: (max - min) / totalSteps
    const diff = window.playbackState.maxDate - window.playbackState.minDate;
    window.playbackState.stepSizeDays = diff / window.playbackState.totalSteps;

    console.log('Starting playback: Steps', window.playbackState.totalSteps, 'Step Size', window.playbackState.stepSizeDays);

    try {
        // Close teme tab content (RIGHT PANEL)
        $('#section-content').removeClass('in');

        // Close sidebar (LEFT PANEL)
        if (typeof window.sidebarControl !== 'undefined') {
            window.sidebarControl.hide();
        } else if (typeof sidebar !== 'undefined') {
            sidebar.hide();
        }

        // Show bottom layer - Force visible styles just in case
        $('#playback_info_layer').css({
            'display': 'block',
            'z-index': 2000,
            'top': 'auto',
            'bottom': '0'
        }).show();

        console.log('Layer shown');

        // Start loop
        // Run first step immediately
        try {
            updatePlaybackStep();
        } catch (e) {
            console.error('Error in initial updatePlaybackStep:', e);
            throw e; // Re-throw to trigger stopPlayback
        }

        window.playbackState.intervalId = setInterval(function () {
            window.playbackState.currentStep++;
            if (window.playbackState.currentStep >= window.playbackState.totalSteps) {
                // End of show
                stopPlayback();
            } else {
                try {
                    updatePlaybackStep();
                } catch (e) {
                    console.error('Error in playback loop:', e);
                    stopPlayback();
                }
            }
        }, 3000); // 3 seconds per step

        console.log('Interval started');

    } catch (err) {
        console.error('Critical error in startPlayback:', err);
        alert('Дошло је до грешке при покретању репродукције: ' + err.message);
        stopPlayback();
    }
}

function updatePlaybackStep() {
    // Check state validity
    if (!window.playbackState.isRunning) return;

    const start = window.playbackState.minDate + (window.playbackState.currentStep * window.playbackState.stepSizeDays);
    const end = start + window.playbackState.stepSizeDays;

    // Update layer text
    const startStr = formatDateForDisplay(new Date(start));
    const endStr = formatDateForDisplay(new Date(end));
    const infoText = `${startStr} - ${endStr}`;

    const layer = $('#playback_time_window');
    if (layer.length) {
        layer.text(infoText);
    } else {
        console.warn('Playback info layer text element not found!');
    }

    // Update markers on map
    if (!window.temeState || !window.temeState.searchResults || !window.temeState.searchResults.features) return;

    // Filter features
    const matchingFeatures = window.temeState.searchResults.features.filter(f => isFeatureInWindow(f, start, end));

    // console.log(`Step ${window.playbackState.currentStep}: showing ${matchingFeatures.length} features for range ${infoText}`);

    // Display
    const tabelaId = window.temeState.searchData ? window.temeState.searchData.tabela : null;

    if (window.temeClusterLayer) {
        // Using clustering
        window.temeClusterLayer.clearLayers();

        if (matchingFeatures.length > 0) {
            const geoJsonLayer = L.geoJSON({
                type: "FeatureCollection",
                features: matchingFeatures
            }, {
                pointToLayer: function (feature, latlng) {
                    return L.marker(latlng, {
                        icon: typeof window.createIcon === 'function' && tabelaId
                            ? window.createIcon(feature.properties.r, tabelaId)
                            : new L.Icon.Default()
                    });
                },
                onEachFeature: typeof window.onEachFeature === 'function' ? window.onEachFeature : function () { }
            });
            window.temeClusterLayer.addLayer(geoJsonLayer);
        }

    } else if (window.addedGeoJSON) {
        // Standard Layer
        window.addedGeoJSON.clearLayers();
        if (matchingFeatures.length > 0) {
            window.addedGeoJSON.addData({
                type: "FeatureCollection",
                features: matchingFeatures
            });
        }
    }

    // Check for događaji in current time window
    if (window.temeState && window.temeState.dogadjajiResults && window.temeState.dogadjajiResults.length > 0) {
        let matchingDogadjaj = null;

        for (const dogadjaj of window.temeState.dogadjajiResults) {
            // Use parseSerbianDate to handle Serbian date format
            let pocetakTime = null;
            let krajTime = null;

            if (dogadjaj.pocetak) {
                const pocetakDate = typeof window.parseSerbianDate === 'function'
                    ? window.parseSerbianDate(dogadjaj.pocetak)
                    : new Date(dogadjaj.pocetak);
                pocetakTime = pocetakDate ? pocetakDate.getTime() : null;
            }

            if (dogadjaj.kraj) {
                const krajDate = typeof window.parseSerbianDate === 'function'
                    ? window.parseSerbianDate(dogadjaj.kraj)
                    : new Date(dogadjaj.kraj);
                krajTime = krajDate ? krajDate.getTime() : null;
            }

            // Check if događaj overlaps with current window
            const overlaps = (pocetakTime && pocetakTime >= start && pocetakTime < end) ||
                (krajTime && krajTime >= start && krajTime < end) ||
                (pocetakTime && krajTime && pocetakTime <= start && krajTime >= end);

            if (overlaps) {
                matchingDogadjaj = dogadjaj;
                break; // Show first matching događaj
            }
        }

        if (matchingDogadjaj && matchingDogadjaj.id !== window.playbackState.currentDogadjajId) {
            // New događaj in window - show it
            console.log('Showing događaj:', matchingDogadjaj.id, matchingDogadjaj.opis);
            window.playbackState.currentDogadjajId = matchingDogadjaj.id;

            // Call the global viewDogadjaj function
            if (typeof window.viewDogadjaj === 'function') {
                window.viewDogadjaj(matchingDogadjaj.id);
            } else {
                console.error('window.viewDogadjaj function not found');
            }
        } else if (!matchingDogadjaj && window.playbackState.currentDogadjajId !== null) {
            // No događaj in current window - close layer and remove marker
            console.log('Closing događaj layer and removing marker - no events in window');
            window.playbackState.currentDogadjajId = null;

            // Close layer using global function (also removes marker)
            if (typeof window.closeDogadjajLayer === 'function') {
                window.closeDogadjajLayer();
            } else {
                $('#dogadjaj_layer').removeClass('show');
            }

            // Remove marker (fallback if closeDogadjajLayer didn't handle it)
            if (typeof window.currentDogadjajiMarker !== 'undefined' && window.currentDogadjajiMarker !== null) {
                karta.removeLayer(window.currentDogadjajiMarker);
                window.currentDogadjajiMarker = null;
            }
        }
    }
}

function isFeatureInWindow(feature, start, end) {
    // If the "vrijme0" or "vrijeme1" of particular object are inside one of the calculated time windows
    // "vrijme0" or "vrijeme1" ... equal or higher of time when specific time window starts and less than end

    const v0 = feature.properties.v0 ? new Date(feature.properties.v0).getTime() : null;
    const v1 = feature.properties.v1 ? new Date(feature.properties.v1).getTime() : null;

    if (!v0 && !v1) return false;

    // Determine the feature's full span
    const featStart = v0 || v1;
    const featEnd = v1 || v0;

    // Requirement: Object should be visible throughout all time windows until playback stops
    // This means we show it if there is ANY overlap between the feature span and the current window
    // Overlap condition: (featStart < end) && (featEnd >= start)
    return (featStart < end) && (featEnd >= start);
}

function stopPlayback() {
    console.log('--- stopPlayback called ---');
    if (window.playbackState.intervalId) {
        clearInterval(window.playbackState.intervalId);
    }
    window.playbackState.isRunning = false;
    window.playbackState.isPaused = false;
    window.playbackState.intervalId = null;

    // Hide layer
    $('#playback_info_layer').hide();

    // Close događaj layer if open
    if (window.playbackState.currentDogadjajId !== null) {
        window.playbackState.currentDogadjajId = null;
        if (typeof closeDogadjajLayer === 'function') {
            closeDogadjajLayer();
        } else {
            $('#dogadjaj_layer').removeClass('show');
        }
    }

    // Restore UI: Open teme tab content
    $('#section-content').addClass('in');

    // Restore Sidebar if it was closed? 
    // User requested: "right-side layer visible". This usually means the 'teme' content panel.
    // If we want to be safe, we might show the sidebar too if it was previously open, but requirements say "right-side layer visible".

    // Restore all markers
    if (window.temeState && window.temeState.searchResults) {
        const tabelaId = window.temeState.searchData ? window.temeState.searchData.tabela : null;

        if (window.temeClusterLayer) {
            window.temeClusterLayer.clearLayers();
            const geoJsonLayer = L.geoJSON(window.temeState.searchResults, {
                pointToLayer: function (feature, latlng) {
                    return L.marker(latlng, {
                        icon: typeof window.createIcon === 'function' && tabelaId
                            ? window.createIcon(feature.properties.r, tabelaId)
                            : new L.Icon.Default()
                    });
                },
                onEachFeature: typeof window.onEachFeature === 'function' ? window.onEachFeature : function () { }
            });
            window.temeClusterLayer.addLayer(geoJsonLayer);
        } else if (window.addedGeoJSON) {
            window.addedGeoJSON.clearLayers();
            window.addedGeoJSON.addData(window.temeState.searchResults);
        }
    }
}

function togglePausePlayback() {
    if (!window.playbackState.isRunning) return;

    const btn = $('#playback_pause_btn');

    if (window.playbackState.isPaused) {
        // RESUME
        window.playbackState.isPaused = false;
        btn.removeClass('bi-play-btn-fill').addClass('bi-pause-btn-fill').attr('title', 'заустави');

        // Restart interval
        window.playbackState.intervalId = setInterval(function () {
            window.playbackState.currentStep++;
            if (window.playbackState.currentStep >= window.playbackState.totalSteps) {
                stopPlayback();
            } else {
                updatePlaybackStep();
            }
        }, 3000);

    } else {
        // PAUSE
        window.playbackState.isPaused = true;
        btn.removeClass('bi-pause-btn-fill').addClass('bi-play-btn-fill').attr('title', 'настави');

        if (window.playbackState.intervalId) {
            clearInterval(window.playbackState.intervalId);
            window.playbackState.intervalId = null;
        }
    }
}
