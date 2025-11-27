// Kontakt (Contact) section functionality

// This code is executed when kontakt section is loaded
$(document).ready(function () {
    console.log('Kontakt section loaded');

    // Event handler for contact subject selection
    $('#kontakt_izbor').on('change', function () {
        // Load description from kontakt.txt based on selection
        $("#kontakt_opis").load("kontakt.txt #kontakt_p" + this.value);
    });

    // TODO: Implement contact form submission
    // TODO: Add form validation
    // TODO: Send contact message to server
});
