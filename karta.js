var tabela;
var addedGeoJSON;
var karta;
var tilelayer1;
var tilelayer2;
var drawnItems;
var drawnControl;

var table = [
    [
        [''],
        [''],
        ['']
    ],
    [
        ['црква', 'конак', 'манастир', 'дом', 'капела', 'споменик', 'гробље'],
        ['оштећено', 'уништено'],
        ['спаљено', 'опљачкано', 'поломљено', 'минирано']
    ], [
        ['задржано сопство', 'промјена сопства'],
        ['Серби', 'Славени', 'Грци', 'Турци', 'Нијемци', 'Маџари'],
        ['бријег', 'језеро', 'мјесто', 'море', 'област', 'планина', 'ријека']
    ], [
        ['с(е)рб', 'влах', 'венет/венд', 'илир', 'косово', 'сег/сиг', 'слат', 'вар', 'лоз', 'луг', 'тер'],
        ['мјесто', 'ријека', 'језеро', 'море', 'област'],
        ['']
    ], [
        ['радни', 'војни', 'за истребљење', 'дјечији'],
        [''],
        ['']
    ], [
        ['Србин', 'Шиптар', 'Турчин', 'Бугарин', 'Маџар', 'Циган', 'Хрват', 'Муслиман', 'Талијан', 'Нијемац'],
        ['човјек', 'дијете', 'жена', 'старији', 'војник'],
        ['силовање', 'мучење', 'убиство', 'рањавање', 'протјеривање']
    ], [
        ['царство', 'каљевство', 'кнежевина', 'војводство', 'репоблика'],
        ['сербско', 'маџарско', 'бугарско', 'грчко', 'турско'],
        ['']
    ]
];

//da se karta i sloj prilagode promenama
$(document).ready(function () {
    $('#kartaid').height(window.innerHeight)
    $('.sloj_vidi').height(window.innerHeight - 78)
    $(window).resize(function () {
        $('#kartaid').height(window.innerHeight)
        $('.sloj_vidi').height(window.innerHeight - 78)
    });
    //za gornji desni ugao tumačenja
    $('[data-toggle="tooltip"]').tooltip();

    // Initialize map after height is set
    karta = L.map('kartaid').setView([44, 21], 6);
    tilelayer1 = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia3JhamlzbmlrIiwiYSI6ImNrdnk1dGQ1ZTA4Mzkyb212anpteGJrY2UifQ.006iyvR0wTD7O-S6r4_4IQ', {
        maxZoom: 18,
        attribution: '<a target="_blank" href="https://mapicons.mapsmarker.com/">Map Icons Collection</a> | Map data &copy; <a target="_blank" href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
            'Imagery © <a target="_blank" href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1
    });
    tilelayer2 = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia3JhamlzbmlrIiwiYSI6ImNrdnk1dGQ1ZTA4Mzkyb212anpteGJrY2UifQ.006iyvR0wTD7O-S6r4_4IQ', {
        maxZoom: 18,
        attribution: '<a href="https://mapicons.mapsmarker.com/">Map Icons Collection</a> | Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
            'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1
    });

    tilelayer1.addTo(karta);

    var idpointinfo = 0;
    var sidebar = L.control.sidebar('sidebar', {
        position: 'left'
    });
    karta.addControl(sidebar);

    $(document).on('click', '.detalji', function () {
        var idpoint = $(this).attr("pointinfo");
        if (idpointinfo === idpoint) {
            sidebar.toggle();
        } else {
            if (idpointinfo === 0) { sidebar.toggle(); }
            if (idpointinfo != idpoint && !sidebar.isVisible()) { sidebar.show(); }


            $.getJSON('api/points/' + idpoint + '?table=' + tabela, function (data) {
                console.log(data);
                var vrem, pros;
                if (data.vremenski == '1') { vrem = "тачно"; } else { vrem = "оквирно"; }
                if (data.prostorno == '1') { pros = "тачно"; } else { pros = "оквирно"; }

                function formatDate(dateStr) {
                    if (!dateStr) return '';
                    var datePart = dateStr.split('T')[0];
                    var parts = datePart.split('-');
                    return parts[2] + '.' + parts[1] + '.' + parts[0] + '.';
                }

                var htmlContent = '<h1>' + table[tabela][1][data.vrs] + '</h1>' +
                    '<p><b>Подврста:</b> ' + table[tabela][2][data.pod] + '</p>' +
                    '<p><b>Разред:</b> ' + table[tabela][0][data.raz] + '</p>' +
                    '<p><b>Вријеме:</b> ' + formatDate(data.vri0) + ' - ' + formatDate(data.vri1) + ' (' + vrem + ')</p>' +
                    '<p><b>Опис:</b> ' + data.opi + '</p>' +
                    '<p><b>Извор:</b> ' + data.izv + '</p>' +
                    '<p><b>Просторно:</b> ' + pros + '</p>';

                $('#sidebar').html(htmlContent);
                if (!sidebar.isVisible()) { sidebar.show(); }
                idpointinfo = idpoint;
            });
        }
    });

    // Create feature group for drawn items
    drawnItems = L.featureGroup(); //.addTo(karta);

    // Add draw control
    drawnControl = new L.Control.Draw({
        draw: {
            circle: false,
            rectangle: false,
            circlemarker: false,
            polygon: {
                allowIntersection: false,
                drawError: {
                    message: 'није дозвољено преклапање површина' // Message that will show when intersect 
                }
            },
            polyline: {
                allowIntersection: false,
                drawError: {
                    message: 'није дозвољено пресијецање линија' // Message that will show when intersect 
                }
            },
        },
        edit: {
            featureGroup: drawnItems,
            poly: {
                allowIntersection: false
            }
        }
    }); // .addTo(karta);

    // On draw - add drawing to 'drawnItems'
    karta.on("draw:created", function (e) {
        e.layer.addTo(drawnItems);

        var type = e.layerType,
            layer = e.layer;
        if (type === 'marker') {
            layer.bindPopup('LatLng: ' + parseFloat(layer.getLatLng().lat).toFixed(5) + ',' + parseFloat(layer.getLatLng().lng.toFixed(5)).openPopup());
        }

    });

    var scale = L.control.scale(); // Creating scale control
    scale.addTo(karta); // Adding scale control to the map

    var iconcrkva = L.icon({
        iconUrl: '/ikone/crkva.png',
        iconSize: [32, 37], // size of the icon
        iconAnchor: [16, 37], // point of the icon which will correspond to marker's location
        popupAnchor: [0, -30] // point from which the popup should open relative to the iconAnchor
    });

    L.marker([44, 21], { icon: iconcrkva }).addTo(karta).bindPopup('trtrt')
    L.marker([44.5, 21.5], { icon: iconcrkva }).addTo(karta).bindPopup('trtrt2')

});

//za uvlacenje slojeva
$(document).on('click', '.izbor', function () {
    if ($($(this).attr('title2')).hasClass('in')) {
        $('.sloj_vidi').removeClass('in');
    } else {
        $('.sloj_vidi').removeClass('in');
        $($(this).attr('title2')).addClass('in')
    }
});

$(document).on('click', '#promjena_karte', function () {
    if (karta.hasLayer(tilelayer1)) {
        karta.addLayer(tilelayer2);
        karta.removeLayer(tilelayer1);
    } else {
        karta.addLayer(tilelayer1);
        karta.removeLayer(tilelayer2);
    }
});

$('#teme_izbor').on('change', function () {
    //LoadWithoutCache("teme.html", "teme_trazi");

    var valueSelected = $(this).find("option:selected").val();
    if (valueSelected == "0") {
        karta.removeLayer(drawnItems);
        karta.removeControl(drawnControl);
        $("#teme_trazi").html("<p>промјена теме брише приједлог за унос!</p>");

    } else {
        karta.addLayer(drawnItems);
        karta.addControl(drawnControl)

        $.ajax({
            url: "teme.html",
            cache: false,
            dataType: "html",
            success: function (data) {
                $("#teme_trazi").html(data);
                //dodati promene za padajuće liste
                for (var i = 0; i < table[valueSelected][0].length; i++) {
                    $('#razred').append('<option value="' + i + '">' + table[valueSelected][0][i] + '</option>');
                }
                for (var i = 0; i < table[valueSelected][1].length; i++) {
                    $('#vrsta').append('<option value="' + i + '">' + table[valueSelected][1][i] + '</option>');
                }
                for (var i = 0; i < table[valueSelected][2].length; i++) {
                    $('#podvrsta').append('<option value="' + i + '">' + table[valueSelected][2][i] + '</option>');
                }

                pretrazi();
            }
        });
    }
});
$('#kontakt_izbor').on('change', function () {
    //ovo je sa keširanjem!
    $("#kontakt_opis").load("kontakt.txt #kontakt_p" + this.value);
});
//ovo je sa keširanjem!
$("#uputstvo").load("uputstvo.txt");


function LoadWithoutCache(url, dest) {
    $.ajax({
        url: url,
        cache: false,
        dataType: "html",
        success: function (data) {
            $("#" + dest).html(data);
            return false;
        }
    });
}

function onEachFeature(feature, layer) {


    //alert (table[1][0][0]);

    // does this feature have a property named popupContent?
    if (feature.properties && feature.properties.v) {
        layer.bindPopup('<a href="#" class="detalji" pointinfo="' + feature.properties.id + '"><i class="bi bi-book"></i></a> ' + table[tabela][1][feature.properties.v]);
    }
}

var LeafIcon = L.Icon.extend({
    options: {
        iconSize: [32, 37], // size of the icon
        iconAnchor: [16, 37], // point of the icon which will correspond to marker's location
        popupAnchor: [0, -30] // point from which the popup should open relative to the iconAnchor
    }
});

function createIcon(r, tabela) {
    return new LeafIcon({
        iconUrl: 'ikone/' + tabela + '/' + r + '.png'
    });
}

function pretrazi() {
    $("#form_trazi").submit(function (e) {
        e.preventDefault();
        tabela = $('#teme_izbor').val();
        $("#form_trazi_cekanje").css('visibility', 'visible');
        var formData = {
            'tabela': tabela,
            'vrsta': $('#vrsta').val(),
            'podvrsta': $('#podvrsta').val(),
            'razred': $('#razred').val(),
            'prostorno': $('#prostorno').val(),
            'vremenski': $('#vremenski').val(),
            'izvor': $('#izvor').val(),
            'opis': $('#opis').val(),
        };
        $.ajax({
            url: 'api/search',
            type: 'post',
            dataType: 'json',
            data: formData,
            success: function (data) {
                $("#form_trazi_cekanje").css('visibility', 'hidden');
                if (!$.isEmptyObject(addedGeoJSON)) {
                    karta.removeLayer(addedGeoJSON);
                }
                addedGeoJSON = L.geoJSON(data, {
                    pointToLayer: function (feature, latlng) {
                        return L.marker(latlng, { icon: createIcon(feature.properties.r, tabela) });
                    },
                    onEachFeature: onEachFeature
                }).addTo(karta);

                if (!$.isEmptyObject(addedGeoJSON)) {
                    karta.fitBounds(addedGeoJSON.getBounds());
                }
            }
        });
    });
}
