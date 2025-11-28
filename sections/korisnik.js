// Korisnik (User) section functionality

// This code is executed when korisnik section is loaded
$(document).ready(function () {
    console.log('Korisnik section loaded');

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

    // Load user information
    function loadUserInfo() {
        $.get('/api/user-info', function (data) {
            console.log('User info received:', data);
            if (data.user) {
                // Display username or email
                const displayName = data.user.email || data.user.username || 'Корисник';
                console.log('Setting display name to:', displayName);
                $('#user-display').text(displayName);

                // Display statistics
                $('#first-visit').text(formatDate(data.user.pristup0));
                $('#last-visit').text(formatDate(data.user.pristup1));
                $('#login-count').text(data.user.brojac_pristupa || 0);
            }
        }).fail(function () {
            console.error('Failed to load user information');
        });
    }

    // Load user info when section is displayed
    loadUserInfo();
});
