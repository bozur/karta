var tilelayer2;
var drawnItems;
var drawnControl;
var tilelayer1_clean;
var tilelayer2_clean;

window.layersVisible = true;

// LEGACY: Hardcoded dropdown options for themes
// This array is kept for backward compatibility and as a fallback if the API fails
// New implementation fetches options dynamically from /api/v2/theme-options/:tema_id
// Structure: table[tema_id][type][index] where type: 0=razred, 1=vrsta, 2=podvrsta
// Table definition moved to js/config/theme_config.js

//da se karta i sloj prilagode promenama
$(document).ready(function () {
    // Check authentication immediately
    $.get('api/check-auth')
        .done(function (data) {
            if (data.is_admin) {
                $('#urednik_tab_icon').show();
            }
            if (data.id) {
                window.currentUserId = data.id;
            }
        })
        .fail(function () {
            window.location.href = 'index.html';
        });

    // Logout handler
    $('#logout-link').click(function () {
        $.post('api/logout', function () {
            window.location.href = 'index.html';
        });
    });
    $('#kartaid').height(window.innerHeight)
    $('.sloj_vidi').height(window.innerHeight - 78)
    $(window).resize(function () {
        $('#kartaid').height(window.innerHeight)
        $('.sloj_vidi').height(window.innerHeight - 78)
    });
    //za gornji desni ugao tumačenja
    $('[data-toggle="tooltip"]').tooltip();

    // Initialize map after height is set - centered on Skadar
    // Disable default zoom control to add custom Serbian one
    karta = L.map('kartaid', {
        zoomControl: false
    }).setView([42.046475, 19.494058], 6);

    // Add custom zoom control with Serbian text
    L.control.zoom({
        zoomInTitle: 'Приближи',
        zoomOutTitle: 'Удаљи'
    }).addTo(karta);

    tilelayer1 = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia3JhamlzbmlrIiwiYSI6ImNrdnk1dGQ1ZTA4Mzkyb212anpteGJrY2UifQ.006iyvR0wTD7O-S6r4_4IQ', {
        maxZoom: 18,
        attribution: '<a target="_blank" href="https://mapicons.mapsmarker.com/">Map Icons Collection</a> | Map data &copy; <a target="_blank" href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
            'Imagery © <a target="_blank" href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1
    });
    tilelayer2 = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia3JhamlzbmlrIiwiYSI6ImNrdnk1dGQ1ZTA4Mzkyb212anpteGJrY2UifQ.006iyvR0wTD7O-S6r4_4IQ', {
        maxZoom: 18,
        attribution: '<a href="https://mapicons.mapsmarker.com/">Map Icons Collection</a> | Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
            'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1
    });

    // Clean terrain layer (terenx)
    tilelayer1_clean = L.tileLayer('https://api.mapbox.com/styles/v1/krajisnik/cmioh6qyt00n601s96mry52fh/tiles/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia3JhamlzbmlrIiwiYSI6ImNtaW44dHJiNjAzdmgzZXNhM2RoZDZydmwifQ.ZQ99gNhQJ-ZAJtmjLzogLQ', {
        maxZoom: 18,
        attribution: '<a target="_blank" href="https://mapicons.mapsmarker.com/">Map Icons Collection</a> | Map data &copy; <a target="_blank" href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
            'Imagery © <a target="_blank" href="https://www.mapbox.com/">Mapbox</a>',
        tileSize: 512,
        zoomOffset: -1
    });

    // Clean satellite layer (satelitx)
    tilelayer2_clean = L.tileLayer('https://api.mapbox.com/styles/v1/krajisnik/cmiogi93c015f01s61utu9qg8/tiles/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia3JhamlzbmlrIiwiYSI6ImNtaW44dHJiNjAzdmgzZXNhM2RoZDZydmwifQ.ZQ99gNhQJ-ZAJtmjLzogLQ', {
        maxZoom: 18,
        attribution: '<a href="https://mapicons.mapsmarker.com/">Map Icons Collection</a> | Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
            'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        tileSize: 512,
        zoomOffset: -1
    });

    // Toggle function
    window.toggleMapLayers = function () {
        if (!karta) return;
        var isSatellite = karta.hasLayer(tilelayer2) || karta.hasLayer(tilelayer2_clean);
        if (karta.hasLayer(tilelayer1)) karta.removeLayer(tilelayer1);
        if (karta.hasLayer(tilelayer1_clean)) karta.removeLayer(tilelayer1_clean);
        if (karta.hasLayer(tilelayer2)) karta.removeLayer(tilelayer2);
        if (karta.hasLayer(tilelayer2_clean)) karta.removeLayer(tilelayer2_clean);
        if (isSatellite) {
            karta.addLayer(window.layersVisible ? tilelayer2 : tilelayer2_clean);
        } else {
            karta.addLayer(window.layersVisible ? tilelayer1 : tilelayer1_clean);
        }
    };

    tilelayer1.addTo(karta);

    var idpointinfo = 0;
    var sidebar = L.control.sidebar('sidebar', {
        position: 'left'
    });
    karta.addControl(sidebar);
    window.sidebarControl = sidebar;


    $(document).on('click', '.detalji', function () {
        var idpoint = $(this).attr("pointinfo");
        if (idpointinfo === idpoint) {
            sidebar.toggle();
        } else {
            if (idpointinfo === 0) { sidebar.toggle(); }
            if (idpointinfo != idpoint && !sidebar.isVisible()) { sidebar.show(); }


            $.getJSON('api/points/' + idpoint + '?table=' + tabela, function (data) {
                console.log(data);
                var vrem, pros;
                if (data.vremenski == '1') { vrem = "одређено"; } else { vrem = "неодређено"; }
                if (data.prostorno == '1') { pros = "одређено"; } else { pros = "неодређено"; }

                function formatDate(dateStr) {
                    if (!dateStr) return '';
                    var datePart = dateStr.split('T')[0];
                    var parts = datePart.split('-');
                    return parts[2] + '.' + parts[1] + '.' + parts[0] + '.';
                }

                // Use cached theme options if available, otherwise fallback to index or empty
                // window.themeOptionsCache[tabela] = [razredArray, vrstaArray, podvrstaArray]
                var htmlContent = '';
                if (window.themeOptionsCache && window.themeOptionsCache[tabela]) {
                    htmlContent = '<div style="margin-bottom: 5px;"><b>ID:</b> ' + idpoint + ' &nbsp;&nbsp;<b>разред:</b> ' + (window.themeOptionsCache[tabela][0][data.raz] || data.raz) + '</div>';
                    htmlContent += '<div style="margin-bottom: 5px;"><b>врста:</b> ' + (window.themeOptionsCache[tabela][1][data.vrs] || data.vrs) + ' &nbsp;&nbsp;<b>подврста:</b> ' + (window.themeOptionsCache[tabela][2][data.pod] || data.pod) + '</div>';
                } else {
                    // Fallback to raw indices if cache not loaded (should not happen in normal flow)
                    htmlContent = '<div style="margin-bottom: 5px;"><b>ID:</b> ' + idpoint + ' &nbsp;&nbsp;<b>разред:</b> ' + data.raz + '</div>';
                    htmlContent += '<div style="margin-bottom: 5px;"><b>врста:</b> ' + data.vrs + ' &nbsp;&nbsp;<b>подврста:</b> ' + data.pod + '</div>';
                }

                htmlContent += '<div style="margin-bottom: 5px;"><b>просторно:</b> ' + pros + ' &nbsp;&nbsp;<b>временски:</b> ' + vrem + '</div>' +
                    '<div style="margin-bottom: 5px;"><b>вријеме:</b> ' + formatDate(data.vri0) + ' - ' + formatDate(data.vri1) + ' (' + vrem + ')</div>' +
                    '<div style="margin-bottom: 5px; background-color: #f0f0f0;"><b>опис:</b> ' + data.opi + '</div>' +
                    '<div style="margin-bottom: 5px;"><b>извор:</b> ' + data.izv + '</div>' +
                    '<div style="margin-bottom: 5px;"><b>запис:</b> ' + (data.zapis ? '<a href="/api/zapisi/' + data.zapis + '" target="_blank" style="color: darkorange;">' + (data.zapis_naziv || data.zapis) + '</a>' : '') + '</div>' +
                    '<div style="margin-bottom: 5px;"><b>унето:</b> ' + formatDate(data.dodao_vrijeme) + ' &nbsp;&nbsp;<b>измјењено:</b> ' + formatDate(data.izmjenio_vrijeme) + '</div>' +
                    '<hr style="border-top: 1px solid #ccc; margin-top: 10px;">' +
                    '<div id="teme_comments_container"></div>';

                $('#sidebar').html(htmlContent);
                if (!sidebar.isVisible()) { sidebar.show(); }
                idpointinfo = idpoint;

                // Initialize comments plugin
                $('#teme_comments_container').comments({
                    profilePictureURL: 'https://viima-app.s3.amazonaws.com/media/public/defaults/user-icon.png',
                    currentUserId: window.currentUserId || 0, // Need to ensure this is set in check-auth
                    roundProfilePictures: true,
                    textareaRows: 1,
                    enableAttachments: false,
                    enableHashtags: true,
                    enablePinging: true,
                    scrollContainer: $('.leaflet-sidebar-content'), // Important for scroll handling
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
                            data: { table: tabela, id: idpoint },
                            success: function (commentsArray) {
                                success(commentsArray)
                            },
                            error: error
                        });
                    },
                    postComment: function (data, success, error) {
                        data.table = tabela;
                        data.id = idpoint;
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
    });

    // Create feature group for drawn items
    drawnItems = L.featureGroup(); //.addTo(karta);

    // Draw configuration moved to js/config/draw_config.js

    // Add draw control
    // Configure featureGroup dynamically
    if (window.drawControlOptions && window.drawControlOptions.edit) {
        window.drawControlOptions.edit.featureGroup = drawnItems;
        drawnControl = new L.Control.Draw(window.drawControlOptions);
    } else {
        console.error('Draw control options not loaded!');
        // Fallback or empty initialization to prevent crash
        drawnControl = new L.Control.Draw({ edit: { featureGroup: drawnItems } });
    }
    // .addTo(karta);

    // On draw - add drawing to 'drawnItems'
    karta.on("draw:created", function (e) {
        var type = e.layerType;
        var layer = e.layer;

        // Check if događaji marker tool is active
        var dogadjajiMarkerActive = $('#dogadjaji_marker_tool').is(':checked');

        // Check if teme drawing tool is active
        var temeDrawingActive = $('#teme_alat_checkbox').is(':checked');

        if (dogadjajiMarkerActive && type === 'marker') {
            // Let događaji.js handle this marker
            console.log('Marker created - događaji tool active, skipping default handling');
            // Fire custom event for događaji section
            karta.fire('draw:created.dogadjaji', e);
            return; // Don't add to drawnItems or show popup
        } else if (temeDrawingActive) {
            // Let teme.js handle this drawing
            console.log('Drawing created - teme tool active, firing teme event');
            karta.fire('draw:created.teme', e);
            return; // Don't add to drawnItems
        } else if (type === 'marker') {
            // Default marker handling
            var lat = parseFloat(layer.getLatLng().lat).toFixed(5);
            var lng = parseFloat(layer.getLatLng().lng).toFixed(5);
            layer.bindPopup('LatLng: ' + lat + ',' + lng).openPopup();
        }

        // Add to drawnItems (except for događaji markers and teme drawings)
        if (!dogadjajiMarkerActive && !temeDrawingActive) {
            e.layer.addTo(drawnItems);
        }
    });

    var scale = L.control.scale(); // Creating scale control
    scale.addTo(karta); // Adding scale control to the map

    // Skadar marker with custom icon
    var iconSkadar = L.icon({
        iconUrl: '/ikone/skadar.png',
        iconSize: [32, 37], // size of the icon
        iconAnchor: [16, 37], // point of the icon which will correspond to marker's location
        popupAnchor: [0, -30] // point from which the popup should open relative to the iconAnchor
    });

    L.marker([42.046475, 19.494058], { icon: iconSkadar }).addTo(karta).bindPopup('Скадар - престони град!')
    var currentSection = null;
    var loadedScripts = {};

    $(document).on('click', '.izbor', function () {
        var sectionName = $(this).attr('title2');

        if (currentSection === sectionName && $('#section-content').hasClass('in')) {
            // Toggle off if clicking the same section
            $('#section-content').removeClass('in');
            currentSection = null;
        } else {
            // Load new section
            currentSection = sectionName;

            // Load HTML content
            $.ajax({
                url: 'sections/' + sectionName + '.html?v=' + new Date().getTime(),
                cache: false,
                dataType: 'html',
                success: function (html) {
                    $('#section-content').html(html);
                    $('#section-content').addClass('in');

                    // Debug: Check if col-auto exists
                    console.log('Teme HTML loaded. col-auto divs found:', $('#section-content').find('.col-auto').length);
                    console.log('Search button parent classes:', $('#section-content').find('button[type="submit"]').parent().attr('class'));

                    // Load and execute section-specific JavaScript
                    if (!loadedScripts[sectionName]) {
                        $.getScript('sections/' + sectionName + '.js?v=' + new Date().getTime())
                            .done(function () {
                                loadedScripts[sectionName] = true;
                                console.log(sectionName + '.js loaded successfully');

                                // Call init function after a short delay to ensure DOM is ready
                                setTimeout(function () {
                                    var initFunctionName = 'init' + sectionName.charAt(0).toUpperCase() + sectionName.slice(1) + 'Section';
                                    if (typeof window[initFunctionName] === 'function') {
                                        window[initFunctionName]();
                                    }
                                }, 100);
                            })
                            .fail(function () {
                                console.error('Failed to load ' + sectionName + '.js');
                            });
                    } else {
                        // Force reload the script to get latest changes
                        delete loadedScripts[sectionName];
                        $.getScript('sections/' + sectionName + '.js?v=' + new Date().getTime())
                            .done(function () {
                                loadedScripts[sectionName] = true;
                                console.log(sectionName + '.js reloaded successfully');

                                // Re-trigger initialization for reloaded scripts
                                setTimeout(function () {
                                    var initFunctionName = 'init' + sectionName.charAt(0).toUpperCase() + sectionName.slice(1) + 'Section';
                                    if (typeof window[initFunctionName] === 'function') {
                                        window[initFunctionName]();
                                    }
                                }, 100);
                            })
                            .fail(function () {
                                console.error('Failed to reload ' + sectionName + '.js');
                            });
                    }
                },
                error: function () {
                    console.error('Failed to load section: ' + sectionName);
                    $('#section-content').html('<p>Грешка при учитавању садржаја.</p>');
                    $('#section-content').addClass('in');
                }
            });
        }
    });

    $(document).on('click', '#promjena_karte', function () {
        if (karta.hasLayer(tilelayer1) || karta.hasLayer(tilelayer1_clean)) {
            karta.removeLayer(tilelayer1);
            karta.removeLayer(tilelayer1_clean);
            karta.addLayer(window.layersVisible ? tilelayer2 : tilelayer2_clean);
        } else {
            karta.removeLayer(tilelayer2);
            karta.removeLayer(tilelayer2_clean);
            karta.addLayer(window.layersVisible ? tilelayer1 : tilelayer1_clean);
        }
    });

    // Section-specific event handlers are now in individual section JS files
    // (teme.js, kontakt.js, uputstvo.js, etc.)


    function LoadWithoutCache(url, dest) {
        $.ajax({
            url: url,
            cache: false,
            dataType: "html",
            success: function (data) {
                $("#" + dest).html(data);
                return false;
            }
        });
    }

    window.onEachFeature = function (feature, layer) {
        // Use global window.tabela if available to ensure sync with teme.js, otherwise fallback to local closure
        var currentTabela = (typeof window.tabela !== 'undefined' && window.tabela !== null) ? window.tabela : tabela;

        // does this feature have a property named popupContent?
        if (feature.properties && feature.properties.v) {
            var popupLabel = feature.properties.v; // Default to raw value/index
            // Try to resolve using dynamic cache
            if (typeof window.themeOptionsCache !== 'undefined' &&
                window.themeOptionsCache[currentTabela] &&
                window.themeOptionsCache[currentTabela][1]) {
                popupLabel = window.themeOptionsCache[currentTabela][1][feature.properties.v] || feature.properties.v;
            }

            layer.bindPopup('<a href="#" class="detalji" pointinfo="' + feature.properties.id + '"><i class="bi bi-book"></i></a> ' + popupLabel);
        }
    }

    var LeafIcon = L.Icon.extend({
        options: {
            iconSize: [32, 37], // size of the icon
            iconAnchor: [16, 37], // point of the icon which will correspond to marker's location
            popupAnchor: [0, -30] // point from which the popup should open relative to the iconAnchor
        }
    });

    window.createIcon = function (r, tabela) {
        return new LeafIcon({
            iconUrl: 'ikone/' + tabela + '/' + r + '.png'
        });
    }

    function pretrazi() {
        $("#form_trazi").submit(function (e) {
            e.preventDefault();
            tabela = $('#teme_izbor').val();
            $("#form_trazi_cekanje").css('visibility', 'visible');
            var formData = {
                'tabela': tabela,
                'vrsta': $('#vrsta').val(),
                'podvrsta': $('#podvrsta').val(),
                'razred': $('#razred').val(),
                'prostorno': $('#prostorno').val(),
                'vremenski': $('#vremenski').val(),
                'izvor': $('#izvor').val(),
                'opis': $('#opis').val(),
            };
            $.ajax({
                url: 'api/search',
                type: 'post',
                dataType: 'json',
                data: formData,
                success: function (data) {
                    $("#form_trazi_cekanje").css('visibility', 'hidden');
                    if (!$.isEmptyObject(addedGeoJSON)) {
                        karta.removeLayer(addedGeoJSON);
                    }
                    addedGeoJSON = L.geoJSON(data, {
                        pointToLayer: function (feature, latlng) {
                            return L.marker(latlng, { icon: window.createIcon(feature.properties.r, tabela) });
                        },
                        onEachFeature: window.onEachFeature
                    }).addTo(karta);

                    if (!$.isEmptyObject(addedGeoJSON)) {
                        karta.fitBounds(addedGeoJSON.getBounds());
                    }
                }
            });
        });
    }
});
