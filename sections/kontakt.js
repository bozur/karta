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

    $('#kontakt-form').on('submit', function (e) {
        e.preventDefault();

        const subjectVal = $('#kontakt_izbor').val();
        const subjectText = $('#kontakt_izbor option:selected').text();
        const message = $('#kontakt_poruka').val();
        const statusDiv = $('#kontakt-status');

        if (subjectVal === '0') {
            statusDiv.text('Молимо изаберите наслов поруке.').css('color', 'red').show();
            return;
        }

        // Disable button while sending
        const submitBtn = $(this).find('button[type="submit"]');
        submitBtn.prop('disabled', true).text('слање...');

        $.ajax({
            url: '/api/kontakt',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                subject: subjectText,
                message: message
            }),
            success: function (response) {
                statusDiv.text('Порука је успјешно послата!').css('color', 'green').show();
                setTimeout(function () {
                    statusDiv.fadeOut();
                }, 5000);
                $('#kontakt-form')[0].reset();
                $('#kontakt_opis > div').hide();
                submitBtn.prop('disabled', false).text('пошаљи');
            },
            error: function (xhr) {
                const errorMsg = xhr.responseJSON ? xhr.responseJSON.error : 'Грешка при слању поруке.';
                statusDiv.text(errorMsg).css('color', 'red').show();
                submitBtn.prop('disabled', false).text('пошаљи');
            }
        });
    });
});
