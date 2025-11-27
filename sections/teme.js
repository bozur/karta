// Teme (Themes) section functionality

// This code is executed when teme section is loaded
$(document).ready(function () {
    // Event handler for theme selection
    $('#teme_izbor').on('change', function () {
        var valueSelected = $(this).find("option:selected").val();

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
    });
});
