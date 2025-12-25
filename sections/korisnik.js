// Korisnik (User) section functionality

// Function to format date
function formatDate(dateString) {
    if (!dateString) return '-';
    // Ensure date is treated as UTC from server
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    // Get timezone offset in hours
    const offset = -date.getTimezoneOffset() / 60;
    const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;

    return `${day}.${month}.${year} ${hours}:${minutes} (UTC${offsetStr})`;
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
            window.korisnikUserData = data;

            displayUserData(data);
        }
    }).fail(function () {
        console.error('Failed to load user information');
    });
}

// Function to display user data and stats
function displayUserData(data) {
    const user = data.user;
    const stats = data.stats;

    // Display username or email (prioritize username)
    const displayName = user.username || user.email || 'Корисник';
    $('#user-display').text(displayName);

    // Display profile picture
    if (user.slika_url) {
        $('#user-profile-img').attr('src', user.slika_url).show();
    } else {
        $('#user-profile-img').hide();
    }

    // Display statistics - Pregled
    $('#first-visit').text(formatDate(user.pristup0));
    $('#last-visit').text(formatDate(user.pristup1));
    $('#login-count').text(user.brojac_pristupa || 0);

    if (stats) {
        $('#items-count').text(stats.total.stavki || 0);
        $('#events-count').text(stats.total.dogadjaji || 0);
        $('#records-count').text(stats.total.zapisi || 0);

        // Display statistics - Od posljednje posjete
        $('#news-since-last').text(stats.sinceLast.novosti || 0);
        $('#topics-since-last').text(stats.sinceLast.teme || 0);
        $('#items-since-last').text(stats.sinceLast.stavki || 0);
        $('#events-since-last').text(stats.sinceLast.dogadjaji || 0);
        $('#records-since-last').text(stats.sinceLast.zapisi || 0);
    }

    // Populate form fields with existing data
    populateEditForm(user);
}

// Populate edit form with user data
function populateEditForm(user) {
    // Use val() to set values, placeholder will show if empty
    $('#edit_ime').val(user.ime || '');
    $('#edit_prezime').val(user.prezime || '');
    $('#edit_korisnik').val(user.username || user.korisnik || '');
    $('#edit_eposta').val(user.email || user.eposta || '');
    $('#edit_slika_url').val(user.slika_url || '');
    if (user.slika_url) {
        // Extract filename from URL for display
        const filename = user.slika_url.split('/').pop();
        $('#edit_slika_label').text(filename);
    } else {
        $('#edit_slika_label').text('Слика (max 100KB)');
    }
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

// Check username availability
function checkUsernameAvailability(username, callback) {
    if (!username) {
        if (callback) callback(true);
        return;
    }

    // Don't check if username hasn't changed from current user data
    if (window.korisnikUserData && window.korisnikUserData.username === username) {
        if (callback) callback(true);
        return;
    }

    $.post('/api/user/check-username', { username: username })
        .done(function (response) {
            if (response.available) {
                clearError('edit_korisnik');
                $('#form_error').hide();
                if (callback) callback(true);
            } else {
                showError('edit_korisnik');
                $('#form_error').text('Корисничко име је већ у употреби').show();
                if (callback) callback(false);
            }
        })
        .fail(function () {
            // If check fails, we generally allow submission and let backend handle it, or show error
            console.error('Failed to check username availability');
            if (callback) callback(true);
        });
}

// Check email availability
function checkEmailAvailability(email, callback) {
    if (!email || !validateEmail(email)) {
        if (callback) callback(true);
        return;
    }

    // Don't check if email hasn't changed from current user data
    if (window.korisnikUserData && window.korisnikUserData.user && window.korisnikUserData.user.email === email) {
        if (callback) callback(true);
        return;
    }

    $.post('/api/user/check-email', { email: email })
        .done(function (response) {
            if (response.available) {
                clearError('edit_eposta');
                $('#form_error').hide();
                if (callback) callback(true);
            } else {
                showError('edit_eposta');
                $('#form_error').text('Адреса е-поште се већ користи').show();
                if (callback) callback(false);
            }
        })
        .fail(function () {
            console.error('Failed to check email availability');
            if (callback) callback(true);
        });
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
        displayUserData(window.korisnikUserData);
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

    // Username validation on blur
    $('#edit_korisnik').off('blur').on('blur', function () {
        checkUsernameAvailability($(this).val().trim());
    });

    // Clear username error on input
    $('#edit_korisnik').off('input').on('input', function () {
        clearError('edit_korisnik');
        $('#form_error').hide();
    });

    // Email validation on blur
    $('#edit_eposta').off('blur').on('blur', function () {
        const email = $(this).val().trim();
        if (email && !validateEmail(email)) {
            showError('edit_eposta');
            $('#form_error').text('неисправна е-пошта').show();
        } else {
            checkEmailAvailability(email);
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

    // File Upload Handling
    $('#edit_slika_file').off('change').on('change', function () {
        const file = this.files[0];
        const label = $('#edit_slika_label');
        const hiddenInput = $('#edit_slika_url');
        const errorDiv = $('#form_error');

        // Reset
        errorDiv.hide();

        if (file) {
            // Validate size (100KB = 102400 bytes)
            if (file.size > 102400) {
                // Inline error instead of alert
                errorDiv.text('Слика је превелика, највише 100KB!').show();
                this.value = ''; // Clear selection
                label.text('Слика (max 100KB)');
                return;
            }

            // Update label
            label.text(file.name);

            // Create FormData
            const formData = new FormData();
            formData.append('profile_picture', file);

            // Show uploading state (optional, or just disable submit)
            $('#submit_izmjeni').prop('disabled', true).text('Отпремање...');

            // Upload
            $.ajax({
                url: '/api/upload-profile-picture',
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function (response) {
                    if (response.url) {
                        hiddenInput.val(response.url);
                        // Optional: Show success indicator
                        label.text(file.name + ' (Успјешно)');
                        $('#submit_izmjeni').prop('disabled', false).text('измјени');
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    console.error('Upload failed:', textStatus, errorThrown);
                    // Override specific error message if it matches server output
                    let msg = jqXHR.responseJSON && jqXHR.responseJSON.error ? jqXHR.responseJSON.error : 'Грешка при отпремању слике.';
                    if (msg.includes('Није дозвољен формат фајла')) {
                        msg = 'Само слике су дозвољене.';
                    }
                    // Inline error instead of alert
                    errorDiv.text(msg).show();

                    $('#submit_izmjeni').prop('disabled', false).text('измјени');
                    // Clear input on error
                    $('#edit_slika_file').val('');
                    label.text('Слика (max 100KB)');
                }
            });
        } else {
            label.text('Слика (max 100KB)');
        }
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

        // If basic validation errors, don't submit
        if (hasError) {
            return false;
        }

        // Check username availability before final submission
        checkUsernameAvailability(korisnik, function (isUserAvailable) {
            if (!isUserAvailable) {
                showError('edit_korisnik');
                $('#form_error').text('Корисничко име је већ у употреби').show();
                return;
            }

            // Check email availability before final submission
            checkEmailAvailability(eposta, function (isEmailAvailable) {
                if (!isEmailAvailable) {
                    showError('edit_eposta');
                    $('#form_error').text('Адреса е-поште се већ користи').show();
                    return;
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

                        // Highlight username field if that was the error (409 Conflict)
                        if (xhr.status === 409) {
                            if (errorMessage.includes('Корисничко')) {
                                showError('edit_korisnik');
                            } else if (errorMessage.includes('е-поште')) {
                                showError('edit_eposta');
                            }
                        }
                    }
                });
            });
        });
        return false;
    });
}

// This code is executed when korisnik section is loaded
$(document).ready(function () {
    initKorisnikSection();
});
