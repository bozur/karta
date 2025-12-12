// Kontakt (Contact) section functionality

// This code is executed when kontakt section is loaded
$(document).ready(function () {
    console.log('Kontakt section loaded');

    // Event handler for contact subject selection
    $('#kontakt_izbor').on('change', function () {
        // Hide all description divs
        $('#kontakt_opis > div').hide();

        // Show the selected description div
        const selectedValue = this.value;
        $('#kontakt_p' + selectedValue).show();
    });

    // TODO: Implement contact form submission
    // TODO: Add form validation
    // TODO: Send contact message to server
});
