// Teme (Themes) section functionality

// Global variable to store the last selected theme
// This persists across section navigations
if (typeof window.lastSelectedTeme === 'undefined') {
    window.lastSelectedTeme = "0";
}

// Function to load teme content based on selected theme
function loadTemeContent(valueSelected) {
    // Store the selected value globally
    window.lastSelectedTeme = valueSelected;

    if (valueSelected == "0") {
        if (typeof karta !== 'undefined' && typeof drawnItems !== 'undefined' && typeof drawnControl !== 'undefined') {
            karta.removeLayer(drawnItems);
            karta.removeControl(drawnControl);
        }
        $("#teme_trazi").html("<p>промјена теме брише приједлог за унос!</p>");
    } else {
        if (typeof karta !== 'undefined' && typeof drawnItems !== 'undefined' && typeof drawnControl !== 'undefined') {
            karta.addLayer(drawnItems);
            karta.addControl(drawnControl);
        }

        $.ajax({
            url: "../teme.html",
            cache: false,
            dataType: "html",
            success: function (data) {
                $("#teme_trazi").html(data);

                // Fetch options from API
                fetch(`/api/v2/theme-options/${valueSelected}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Failed to fetch theme options');
                        }
                        return response.json();
                    })
                    .then(data => {
                        const options = data.options;

                        // Populate razred dropdown
                        options.razred.forEach((value, index) => {
                            if (value) { // Only add non-empty values
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
                    })
                    .catch(error => {
                        console.error('Error loading theme options from API, using fallback:', error);

                        // FALLBACK: Use hardcoded table array if API fails
                        if (typeof table !== 'undefined' && table[valueSelected]) {
                            for (var i = 0; i < table[valueSelected][0].length; i++) {
                                if (table[valueSelected][0][i]) {
                                    $('#razred').append('<option value="' + i + '">' + table[valueSelected][0][i] + '</option>');
                                }
                            }
                            for (var i = 0; i < table[valueSelected][1].length; i++) {
                                if (table[valueSelected][1][i]) {
                                    $('#vrsta').append('<option value="' + i + '">' + table[valueSelected][1][i] + '</option>');
                                }
                            }
                            for (var i = 0; i < table[valueSelected][2].length; i++) {
                                if (table[valueSelected][2][i]) {
                                    $('#podvrsta').append('<option value="' + i + '">' + table[valueSelected][2][i] + '</option>');
                                }
                            }
                            console.log('Using fallback table array for theme', valueSelected);
                        }
                    });

                // Initialize search functionality if available
                if (typeof pretrazi === 'function') {
                    pretrazi();
                }
            }
        });
    }
}

// Function to load themes from database into dropdown
function loadThemesDropdown() {
    fetch('/api/v2/themes')
        .then(response => response.json())
        .then(data => {
            const themes = data.themes;
            const select = $('#teme_izbor');

            // Remove all options except the first one (изабери:)
            select.find('option:not(:first)').remove();

            // Add themes from database
            themes.forEach(theme => {
                const id = theme.id || theme.ID;
                const naziv = theme.naziv || theme.NAZIV;
                if (id && naziv) {
                    select.append(`<option value="${id}">${naziv}</option>`);
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

// Initialization function that can be called each time the section is loaded
function initTemeSection() {
    // Load themes from database
    loadThemesDropdown();

    // Restore the previously selected theme when section reloads
    if (window.lastSelectedTeme && window.lastSelectedTeme != "0") {
        // Wait a bit for themes to load, then trigger the change
        setTimeout(() => {
            $('#teme_izbor').val(window.lastSelectedTeme);
            loadTemeContent(window.lastSelectedTeme);
        }, 300);
    }

    // Event handler for theme selection
    // Remove any existing handlers to prevent duplicates
    $('#teme_izbor').off('change').on('change', function () {
        var valueSelected = $(this).find("option:selected").val();
        loadTemeContent(valueSelected);
    });
}

// This code is executed when teme section is loaded for the first time
$(document).ready(function () {
    initTemeSection();
});
