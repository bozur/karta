// Uputstvo (Instructions) section functionality

// This code is executed when uputstvo section is loaded
$(document).ready(function () {
    console.log('Uputstvo section loaded');

    // Load instructions from uputstvo.txt
    $("#uputstvo_content").load("uputstvo.txt");
});
