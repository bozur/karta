// Uputstvo (Instructions) section functionality

// Initialization function that can be called each time the section is loaded
function initUputstvoSection() {
    console.log('Uputstvo section initialized');

    var cfg = window.INTRO_VIDEO_CONFIG || { ready: false };
    var media = typeof window.getIntroVideoMedia === 'function'
        ? window.getIntroVideoMedia()
        : { poster: '' };

    if (cfg.ready && media.poster) {
        $('#uputstvo_video_poster_img').attr('src', media.poster).show();
        $('#uputstvo_video_title').text('Покрени видео водич');
        $('#uputstvo_video_subtitle').text('Кликните за приказ преко цијелог екрана');
    } else {
        $('#uputstvo_video_poster_img').hide();
        $('#uputstvo_video_title').text('Уводни видео — ускоро');
        $('#uputstvo_video_subtitle').text('Брзи преглед основних могућности на Карта.СРБ');
    }

    $('#uputstvo_video_card')
        .off('click.uputstvoVideo keydown.uputstvoVideo')
        .on('click.uputstvoVideo keydown.uputstvoVideo', function (e) {
            if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            if (typeof window.openIntroVideoLightbox === 'function') {
                window.openIntroVideoLightbox();
            }
        });
}

// This code is executed when uputstvo section is loaded for the first time
$(document).ready(function () {
    initUputstvoSection();
});
