$(document).ready(function () {

    // Set current year in copyright
    const currentYear = new Date().getFullYear();
    $('#current-year').text(currentYear);

    // Cookie Consent
    if (!localStorage.getItem('cookieConsent')) {
        let consentHtml = `
        <div id="cookie-consent" style="position: fixed; bottom: 0; width: 100%; background: rgba(0,0,0,0.8); color: white; padding: 15px; text-align: center; z-index: 9999;">
            <p style="display: inline-block; margin: 0;">Ова страница користи колачиће за побољшање корисничког искуства. Да ли прихватате?</p>
            <button id="accept-cookies" class="btn btn-sm btn-warning ml-3">Прихватам</button>
        </div>
    `;
        $('body').append(consentHtml);

        $('#accept-cookies').click(function () {
            localStorage.setItem('cookieConsent', 'true');
            $('#cookie-consent').remove();
        });
    }

    // Password Visibility Toggle
    $('#togglePassword').click(function () {
        const passwordInput = $('#password');
        const type = passwordInput.attr('type') === 'password' ? 'text' : 'password';
        passwordInput.attr('type', type);

        // Toggle the eye icon
        $(this).toggleClass('bi-eye bi-eye-slash');
    });

    $("#logging").show();
    $("#passwordchange").hide();
    $("#passwordforgotten").hide();
    $("#newuser").hide();

    $("#logging0").click(function () {
        $("#logging").show();
        $("#passwordchange").hide();
        $("#passwordforgotten").hide();
        $("#newuser").hide();
    });
    $("#passwordchange0").click(function () {
        $("#logging").hide();
        $("#passwordchange").show();
        $("#passwordforgotten").hide();
        $("#newuser").hide();
    });
    $("#passwordforgotten0").click(function () {
        $("#logging").hide();
        $("#passwordchange").hide();
        $("#passwordforgotten").show();
        $("#newuser").hide();
    });
    $("#newuser0").click(function () {
        $("#logging").hide();
        $("#passwordchange").hide();
        $("#passwordforgotten").hide();
        $("#newuser").show();
    });

    // Login Form Submission
    // Login Form Submission
    $('#change-logging').submit(function (e) {
        e.preventDefault();
        const username = $('#username').val();
        const password = $('#password').val();
        const remember = $('#remember').is(':checked');

        // Validation first
        if (!username) {
            $('#username').css('border-color', 'red');
        } else {
            $('#username').css('border-color', '');
        }
        if (!password) {
            $('#password').css('border-color', 'red');
        } else {
            $('#password').css('border-color', '');
        }

        if (username && password) {
            // Helper function to submit login
            const submitLogin = (token) => {
                const _hp_check = $('#change-logging').find('input[name="_hp_check"]').val();
                const data = { username, password, remember, _hp_check };
                if (token) {
                    data['g-recaptcha-response'] = token;
                }

                $.post('/api/login', data, function (response) {
                    if (response.success) {
                        window.location.href = response.redirect;
                    }
                }).fail(function (xhr) {
                    let errorMsg = 'погрешно корисничко име/е-пошта или лозинка';
                    if (xhr.responseJSON && xhr.responseJSON.error) {
                        errorMsg = xhr.responseJSON.error;
                    }
                    $('#loggingenter0').text(errorMsg).css('color', '#f5a615');
                    $('#username').css('border-color', 'red');
                    $('#password').css('border-color', 'red');
                });
            };

            // Execute reCAPTCHA with fallback
            if (typeof grecaptcha !== 'undefined') {
                grecaptcha.ready(function () {
                    grecaptcha.execute('6LfZgTwsAAAAAHh1E-UJF5VokZKu2Ujh68gVaxVR', { action: 'login' })
                        .then(function (token) {
                            submitLogin(token);
                        })
                        .catch(function (err) {
                            console.warn('reCAPTCHA execution failed (likely domain mismatch), proceeding without it:', err);
                            submitLogin(null);
                        });
                });
            } else {
                // If script didn't load at all
                console.warn('reCAPTCHA library not loaded, proceeding without it');
                submitLogin(null);
            }
        }
    });

    // Registration Form Submission
    $('#change-newuser').submit(function (e) {
        e.preventDefault();
        const email = $('#asign').val();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email || !emailRegex.test(email)) {
            $('#asign').css('border-color', 'red');
            $('#newuserenter0').text('неисправна адреса е-поште').css('color', '#f5a615');
            return;
        } else {
            $('#asign').css('border-color', '');
            $('#newuserenter0').text('');
        }

        const _hp_check = $(this).find('input[name="_hp_check"]').val();
        $.post('/api/register', { email, _hp_check }, function (response) {
            if (response.success) {
                $('#newuserenter0').text('лозинка је послата на е-пошту').css('color', '#f5a615'); // Using orange
            }
        }).fail(function (xhr) {
            if (xhr.status === 409) {
                const errorMsg = xhr.responseJSON && xhr.responseJSON.error ? xhr.responseJSON.error : 'Адреса е-поште се већ користи';
                $('#newuserenter0').text(errorMsg).css('color', '#f5a615');
                $('#asign').css('border-color', 'red');
            } else {
                $('#newuserenter0').text('Грешка на серверу').css('color', '#f5a615');
            }
        });
    });

    // Forgot Password
    $('#change-forgotten').submit(function (e) {
        e.preventDefault();
        const email = $('#email2').val();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email || !emailRegex.test(email)) {
            $('#email2').css('border-color', 'red');
            $('#passwordforgottenenter0').text('неисправна адреса е-поште').css('color', '#f5a615');
            return;
        }

        const _hp_check = $(this).find('input[name="_hp_check"]').val();
        $.post('/api/forgot-password', { email, _hp_check }, function (response) {
            console.log('Forgot password response:', response);
            if (response.success) {
                $('#passwordforgottenenter0').text('нова лозинка је прослијеђена на е-пошту').css('color', '#f5a615');
                $('#email2').css('border-color', '');
            }
        }).fail(function (xhr) {
            console.log('Forgot password error:', xhr.status, xhr.responseJSON);
            $('#passwordforgottenenter0').text('корисник није пронађен').css('color', '#f5a615');
            $('#email2').css('border-color', 'red');
        });
    });

});
