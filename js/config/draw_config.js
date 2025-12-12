// Localize Leaflet.draw to Serbian Cyrillic
if (L.drawLocal) {
    L.drawLocal.draw.toolbar.buttons.polyline = 'Нацртај линију';
    L.drawLocal.draw.toolbar.buttons.polygon = 'Нацртај полигон';
    L.drawLocal.draw.toolbar.buttons.marker = 'Нацртај показивач';

    L.drawLocal.draw.toolbar.actions.title = 'Поништи цртање';
    L.drawLocal.draw.toolbar.actions.text = 'Поништи';

    L.drawLocal.draw.toolbar.finish.title = 'Заврши цртање';
    L.drawLocal.draw.toolbar.finish.text = 'Заврши';

    L.drawLocal.draw.toolbar.undo.title = 'Обриши задњу тачку';
    L.drawLocal.draw.toolbar.undo.text = 'Обриши задњу тачку';

    L.drawLocal.draw.handlers.marker.tooltip.start = 'Притисни на карту да ставиш показивач';

    L.drawLocal.draw.handlers.polyline.tooltip.start = 'Притисни да почнеш да црташ';
    L.drawLocal.draw.handlers.polyline.tooltip.cont = 'Притисни да наставиш цртање';
    L.drawLocal.draw.handlers.polyline.tooltip.end = 'Притисни задњу тачку да завршиш';

    L.drawLocal.draw.handlers.polygon.tooltip.start = 'Притисни да почнеш да црташ';
    L.drawLocal.draw.handlers.polygon.tooltip.cont = 'Притисни да наставиш цртање';
    L.drawLocal.draw.handlers.polygon.tooltip.end = 'Притисни прву тачку да завршиш';

    L.drawLocal.edit.toolbar.actions.save.title = 'Сачувај измене';
    L.drawLocal.edit.toolbar.actions.save.text = 'Сачувај';
    L.drawLocal.edit.toolbar.actions.cancel.title = 'Поништи измене';
    L.drawLocal.edit.toolbar.actions.cancel.text = 'Поништи';
    L.drawLocal.edit.toolbar.actions.clearAll.title = 'Обриши све';
    L.drawLocal.edit.toolbar.actions.clearAll.text = 'Обриши све';

    L.drawLocal.edit.toolbar.buttons.edit = 'Измени слојеве';
    L.drawLocal.edit.toolbar.buttons.editDisabled = 'Нема слоја за измену';
    L.drawLocal.edit.toolbar.buttons.remove = 'Обриши слојеве';
    L.drawLocal.edit.toolbar.buttons.removeDisabled = 'Нема слоја за брисање';

    L.drawLocal.edit.handlers.edit.tooltip.text = 'Превуци ручице или показиваче ради измене';
    L.drawLocal.edit.handlers.edit.tooltip.subtext = 'Притисни Поништи да вратиш измене';

    L.drawLocal.edit.handlers.remove.tooltip.text = 'Притисни слој да обришеш';
}

// Draw Control Options
window.drawControlOptions = {
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
        // featureGroup will be assigned in karta.js as it depends on drawnItems
        poly: {
            allowIntersection: false
        }
    }
};
