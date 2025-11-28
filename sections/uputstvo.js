// Uputstvo (Instructions) section functionality

// Initialization function that can be called each time the section is loaded
function initUputstvoSection() {
    console.log('Uputstvo section initialized');

    // Load instructions from uputstvo.txt
    $("#uputstvo_content").load("uputstvo.txt");
}

// This code is executed when uputstvo section is loaded for the first time
$(document).ready(function () {
    initUputstvoSection();
});
