// Korisnik (User) section functionality

// Function to format date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
}

// Store user data globally for persistence across panel switches
if (typeof window.korisnikUserData === 'undefined') {
    window.korisnikUserData = null;
}

// Load user information
function loadUserInfo() {
    $.get('/api/user-info', function (data) {
        console.log('User info received:', data);
        if (data.user) {
            // Store globally for persistence
            window.korisnikUserData = data.user;

            // Display username or email (prioritize username)
            const displayName = data.user.username || data.user.email || 'Корисник';
            console.log('Setting display name to:', displayName);
            $('#user-display').text(displayName);

            // Display statistics
            $('#first-visit').text(formatDate(data.user.pristup0));
            $('#last-visit').text(formatDate(data.user.pristup1));
            $('#login-count').text(data.user.brojac_pristupa || 0);

            // Populate form fields with existing data
            populateEditForm(data.user);
        }
    }).fail(function () {
        console.error('Failed to load user information');
    });
}

// Populate edit form with user data
function populateEditForm(user) {
    // Use val() to set values, placeholder will show if empty
    $('#edit_ime').val(user.ime || '');
    $('#edit_prezime').val(user.prezime || '');
    $('#edit_korisnik').val(user.username || user.korisnik || '');
    $('#edit_eposta').val(user.email || user.eposta || '');
    $('#edit_slika_url').val(user.slika_url || '');
    // Password fields remain empty
    $('#edit_lozinka').val('');
    $('#edit_nova_lozinka').val('');
    $('#edit_potvrdi_lozinka').val('');
}

// Email validation function
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Password strength validation
// Min 7 chars, max 50, at least one number, one capital letter, one special char
function validatePasswordStrength(password) {
    if (password.length < 7) return false;
    if (password.length > 50) return false;

    const hasNumber = /\d/.test(password);
    const hasCapital = /[A-Z]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return hasNumber && hasCapital && hasSpecial;
}

// Clear error styling
function clearError(fieldId) {
    $(`#${fieldId}`).css('border-color', '');
}

// Show error styling
function showError(fieldId) {
    $(`#${fieldId}`).css('border-color', 'red');
}

// Initialization function that runs each time section is loaded
function initKorisnikSection() {
    console.log('Korisnik section initialized');

    // Restore user display if data exists
    if (window.korisnikUserData) {
        const displayName = window.korisnikUserData.username || window.korisnikUserData.email || 'Корисник';
        $('#user-display').text(displayName);
        $('#first-visit').text(formatDate(window.korisnikUserData.pristup0));
        $('#last-visit').text(formatDate(window.korisnikUserData.pristup1));
        $('#login-count').text(window.korisnikUserData.brojac_pristupa || 0);
        populateEditForm(window.korisnikUserData);
    } else {
        // Load fresh data if not in cache
        loadUserInfo();
    }

    // Password visibility toggle handlers
    $('#toggle_lozinka').off('click').on('click', function () {
        const passwordField = $('#edit_lozinka');
        const type = passwordField.attr('type') === 'password' ? 'text' : 'password';
        passwordField.attr('type', type);
        $(this).toggleClass('bi-eye bi-eye-slash');
    });

    $('#toggle_nova_lozinka').off('click').on('click', function () {
        const passwordField = $('#edit_nova_lozinka');
        const type = passwordField.attr('type') === 'password' ? 'text' : 'password';
        passwordField.attr('type', type);
        $(this).toggleClass('bi-eye bi-eye-slash');
    });

    $('#toggle_potvrdi_lozinka').off('click').on('click', function () {
        const passwordField = $('#edit_potvrdi_lozinka');
        const type = passwordField.attr('type') === 'password' ? 'text' : 'password';
        passwordField.attr('type', type);
        $(this).toggleClass('bi-eye bi-eye-slash');
    });

    // Email validation on blur
    $('#edit_eposta').off('blur').on('blur', function () {
        const email = $(this).val().trim();
        if (email && !validateEmail(email)) {
            showError('edit_eposta');
            $('#eposta_error').show();
        } else {
            clearError('edit_eposta');
            $('#eposta_error').hide();
        }
    });

    // Clear email error on input
    $('#edit_eposta').off('input').on('input', function () {
        clearError('edit_eposta');
        $('#eposta_error').hide();
    });

    // Password confirmation validation
    $('#edit_potvrdi_lozinka').off('blur').on('blur', function () {
        const novaLozinka = $('#edit_nova_lozinka').val();
        const potvrdiLozinka = $(this).val();

        if (novaLozinka || potvrdiLozinka) {
            if (novaLozinka !== potvrdiLozinka) {
                showError('edit_nova_lozinka');
                showError('edit_potvrdi_lozinka');
                $('#potvrdi_lozinka_error').show();
            } else {
                clearError('edit_nova_lozinka');
                clearError('edit_potvrdi_lozinka');
                $('#potvrdi_lozinka_error').hide();
            }
        }
    });

    // Clear password confirmation error on input
    $('#edit_nova_lozinka, #edit_potvrdi_lozinka').off('input').on('input', function () {
        clearError('edit_nova_lozinka');
        clearError('edit_potvrdi_lozinka');
        $('#potvrdi_lozinka_error').hide();
        $('#nova_lozinka_error').hide();
    });

    // Form submission
    $('#form_izmjeni_korisnik').off('submit').on('submit', function (e) {
        e.preventDefault();

        // Clear all previous errors
        $('#form_error').hide();
        $('#eposta_error').hide();
        $('#nova_lozinka_error').hide();
        $('#potvrdi_lozinka_error').hide();
        clearError('edit_eposta');
        clearError('edit_lozinka');
        clearError('edit_nova_lozinka');
        clearError('edit_potvrdi_lozinka');

        // Get form values
        const ime = $('#edit_ime').val().trim();
        const prezime = $('#edit_prezime').val().trim();
        const korisnik = $('#edit_korisnik').val().trim();
        const eposta = $('#edit_eposta').val().trim();
        const slika_url = $('#edit_slika_url').val().trim();
        const lozinka = $('#edit_lozinka').val();
        const nova_lozinka = $('#edit_nova_lozinka').val();
        const potvrdi_lozinka = $('#edit_potvrdi_lozinka').val();

        let hasError = false;

        // Validate mandatory fields
        if (!eposta || !lozinka) {
            if (!eposta && !lozinka) {
                $('#form_error').text('лозинка/е-пошта су обавезни').show();
            } else if (!eposta) {
                $('#form_error').text('е-пошта је обавезно поље').show();
            } else if (!lozinka) {
                $('#form_error').text('лозинка је обавезно поље').show();
            }
            if (!eposta) showError('edit_eposta');
            if (!lozinka) showError('edit_lozinka');
            hasError = true;
        }

        // Validate email format
        if (eposta && !validateEmail(eposta)) {
            showError('edit_eposta');
            $('#form_error').text('неисправна е-пошта').show();
            hasError = true;
        }

        // Validate new password if provided
        if (nova_lozinka || potvrdi_lozinka) {
            // Check if passwords match
            if (nova_lozinka !== potvrdi_lozinka) {
                showError('edit_nova_lozinka');
                showError('edit_potvrdi_lozinka');
                $('#form_error').text('нова лозинка мора да буде иста у оба поља').show();
                hasError = true;
            } else if (nova_lozinka) {
                // Check password strength
                if (!validatePasswordStrength(nova_lozinka)) {
                    showError('edit_nova_lozinka');
                    showError('edit_potvrdi_lozinka');
                    $('#form_error').text('лозинка је преслаба (мин. 7 карактера, број, велико слово, специјални карактер)').show();
                    hasError = true;
                }
            }
        }

        // If there are errors, don't submit
        if (hasError) {
            return false;
        }

        // Show loading spinner
        $('#form_izmjeni_cekanje').css('visibility', 'visible');
        $('#submit_izmjeni').prop('disabled', true);

        // Prepare data for submission
        const formData = {
            ime: ime || null,
            prezime: prezime || null,
            korisnik: korisnik || null,
            eposta: eposta,
            slika_url: slika_url || null,
            lozinka: lozinka,
            nova_lozinka: nova_lozinka || null
        };

        // Submit to server
        $.ajax({
            url: '/api/user/update',
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function (response) {
                console.log('User updated successfully:', response);

                // Hide loading spinner
                $('#form_izmjeni_cekanje').css('visibility', 'hidden');
                $('#submit_izmjeni').prop('disabled', false);

                // Show success message
                $('#form_error').css('color', 'green').text('Подаци су успјешно ажурирани').show();

                // Clear password fields
                $('#edit_lozinka').val('');
                $('#edit_nova_lozinka').val('');
                $('#edit_potvrdi_lozinka').val('');

                // Reload user info
                loadUserInfo();

                // Hide success message after 3 seconds
                setTimeout(function () {
                    $('#form_error').hide().css('color', 'orange');
                }, 3000);
            },
            error: function (xhr) {
                console.error('Error updating user:', xhr);

                // Hide loading spinner
                $('#form_izmjeni_cekanje').css('visibility', 'hidden');
                $('#submit_izmjeni').prop('disabled', false);

                // Show error message
                let errorMessage = 'Грешка при ажурирању података';
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMessage = xhr.responseJSON.error;
                }
                $('#form_error').text(errorMessage).show();
            }
        });

        return false;
    });
}

// This code is executed when korisnik section is loaded
$(document).ready(function () {
    initKorisnikSection();
});
