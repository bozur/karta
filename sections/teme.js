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

                // Add options to dropdowns based on selected theme
                if (typeof table !== 'undefined') {
                    for (var i = 0; i < table[valueSelected][0].length; i++) {
                        $('#razred').append('<option value="' + i + '">' + table[valueSelected][0][i] + '</option>');
                    }
                    for (var i = 0; i < table[valueSelected][1].length; i++) {
                        $('#vrsta').append('<option value="' + i + '">' + table[valueSelected][1][i] + '</option>');
                    }
                    for (var i = 0; i < table[valueSelected][2].length; i++) {
                        $('#podvrsta').append('<option value="' + i + '">' + table[valueSelected][2][i] + '</option>');
                    }
                }

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
    fetch('/api/themes')
        .then(response => response.json())
        .then(data => {
            const themes = data.themes;
            const select = $('#teme_izbor');

            // Remove all options except the first one (изабери:)
            select.find('option:not(:first)').remove();

            // Add themes from database
            themes.forEach(theme => {
                select.append(`<option value="${theme.id}">${theme.naziv}</option>`);
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
