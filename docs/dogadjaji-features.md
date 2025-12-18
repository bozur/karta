# Dogadjaji (События) Tab - Feature Documentation

This document describes all features and behaviors of the "dogadjaji" (events) tab.

**Last Updated:** 2025-12-04  
**Files:** `sections/dogadjaji.html`, `sections/dogadjaji.js`

---

## Overview

The dogadjaji tab allows users to insert, search, and view historical events on the map. Events can have temporal (start/end dates) and spatial (coordinates) attributes.

---

## 1. Database Schema

### Table: `dogadjaji`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, IDENTITY(1,1) | Unique event identifier |
| `pocetak` | DATETIME2 | NOT NULL | Event start date/time (required) |
| `kraj` | DATETIME2 | NULL | Event end date/time (defaults to pocetak via trigger) |
| `opis` | NVARCHAR(255) | NOT NULL | Event description (10-255 characters) |
| `izvor` | NVARCHAR(50) | NULL | Source description |
| `korisnik_id` | INT | NOT NULL, FK → `korisnik.id` | User who created the event |
| `zapis` | INT | NULL | Reference to zapisi table (no FK constraint) |
| `koordinate` | NVARCHAR(100) | NULL | Coordinates in WKT POINT format: "POINT(lng lat)" |
| `unos` | DATETIME2 | DEFAULT GETDATE() | Insertion timestamp |

### Indexes:
- `idx_dogadjaji_korisnik` on `korisnik_id`
- `idx_dogadjaji_pocetak` on `pocetak`
- `idx_dogadjaji_unos` on `unos`

### Database Trigger:
**`trg_dogadjaji_default_kraj`** - Automatically sets `kraj = pocetak` when `kraj` is NULL on INSERT

---

## 2. Data Insertion (унос)

### Form Fields

| Field | ID | Type | Required | Validation | Notes |
|-------|-----|------|----------|------------|-------|
| Корисник | `dogadjaji_unos_korisnik` | Hidden | Yes | Auto-populated | Current username from session |
| Опис | `dogadjaji_unos_opis` | Textarea | Yes | Min 10 chars, Max 255 chars | Event description |
| Почетак | `dogadjaji_unos_pocetak` | datetime-local | Yes | Valid datetime | Event start time |
| Крај | `dogadjaji_unos_kraj` | datetime-local | No | Valid datetime | Event end time |
| Координате | `dogadjaji_unos_koordinate` | Text | No | WKT POINT format | Auto-populated by marker tool |
| Извор | `dogadjaji_unos_izvor` | Text | Yes | Max 50 chars | Source reference |
| Запис | `dogadjaji_unos_zapis` | Text | No | - | Record reference |

### Validation Rules

1. **Опис (Description)**
   - Must not be empty
   - Minimum 10 characters
   - Maximum 255 characters
   - Error: "попуните поље (опис)" or "опис мора имати најмање 10 карактера"

2. **Почетак (Start)**
   - Must not be empty
   - Error: "попуните поље (почетак)"

3. **Извор (Source)**
   - Must not be empty
   - Error: "попуните поље (извор)"

### Error Display

- **Location:** `#dogadjaji_unos_error` div
- **Color:** Orange (default), Green (success)
- **Behavior:** 
  - Invalid fields get red border
  - Error message shows first validation failure
  - Success message shows for 3 seconds then auto-hides

### Success Behavior

- Message: "догађај је додат" (green color)
- Form resets after successful insertion
- Username field repopulated automatically
- Success message disappears after 3 seconds

---

## 2. Marker Tool (алат)

### Checkbox Behavior

**Element:** `#dogadjaji_marker_tool`

#### When Checked:
- Leaflet drawing control appears on map
- `drawnItems` layer added to map
- `drawnControl` added to map
- User can place markers

#### When Unchecked:
- Drawing control removed from map
- Marker placement disabled

#### State Synchronization:
- On tab open, checkbox syncs with current drawing control visibility
- If drawing control already visible → checkbox auto-checks
- If drawing control hidden → checkbox remains unchecked

### Marker Placement

#### Zoom Validation:
- **Minimum Zoom Level:** 13
- **Validation Trigger:** When user clicks to place marker
- **If zoom < 13:**
  - Error message: "Приближите карту ради тачности уноса!"
  - Error displays in `#dogadjaji_unos_error` div
  - Checkbox stays checked
  - Tool remains active
  - User can zoom in and try again
  - No marker placed

#### Successful Placement (zoom ≥ 13):
1. Marker coordinates captured
2. Coordinates formatted as WKT: `POINT(lng lat)`
3. Coordinates populated in `#dogadjaji_unos_koordinate` field
4. Precision: 6 decimal places
5. Any previous error messages cleared
6. Checkbox automatically unchecked
7. Drawing control automatically removed
8. Ready for next use

### Event Flow:
```
User checks "алат" 
  → Drawing toolbar appears
  → User clicks marker tool
  → User clicks map location
    → IF zoom < 13:
        → Show error "Приближите карту ради тачности уноса!"
        → Keep tool active
    → IF zoom ≥ 13:
        → Capture coordinates
        → Populate coordinate field
        → Clear errors
        → Uncheck checkbox
        → Hide toolbar
```

---

## 3. Search Functionality (тражи)

### Search Fields

| Field | ID | Type | Options |
|-------|-----|------|---------|
| Опис | `dogadjaji_trazi_opis` | Text | Free text search |
| Почетак | `dogadjaji_trazi_pocetak` | datetime-local | Date/time filter |
| Крај | `dogadjaji_trazi_kraj` | datetime-local | Date/time filter |
| Извор | `dogadjaji_trazi_izvor` | Dropdown | "", "одређено" (1), "неодређено" (0) |
| Просторно | `dogadjaji_trazi_prostorno` | Dropdown | "", "одређено" (1), "неодређено" (0) |
| Временски | `dogadjaji_trazi_vremenski` | Dropdown | "", "одређено" (1), "неодређено" (0) |

### Search Behavior

- **API Endpoint:** `/api/dogadjaji/search`
- **Method:** POST
- **Loading Indicator:** `#dogadjaji_trazi_cekanje` spinner
- **Error Display:** `#dogadjaji_trazi_error` div (orange text)

### Results Display

**Container:** `#dogadjaji_results`  
**Table Body:** `#dogadjaji_results_body`

#### Result Row Format:
| Column | Width | Content |
|--------|-------|---------|
| ID | 60px | Event ID number |
| Опис | Auto | Event description |
| Location Icon | 30px | 📍 icon if coordinates exist, empty otherwise |

#### Row Behavior:
- **Hover:** Light gray background (`rgba(0, 0, 0, 0.05)`)
- **Click:** Calls `viewDogadjaj(id)` function
- **Cursor:** Pointer

#### Empty Results:
- Message: "Нема резултата."
- Centered, gray text (`#666`)
- Spans all 3 columns

---

## 4. Map Marker Display

### Calendar Icon Marker

**Icon:** `/ikone/calendar.png`  
**Size:** 32x37 pixels  
**Anchor:** [16, 37] (bottom center)  
**Popup Anchor:** [0, -30]

### Marker Behavior

#### Global Variable:
```javascript
var currentDogadjajiMarker = null;
```

#### When Event Row Clicked:
1. **Always remove previous marker first**
   - If `currentDogadjajiMarker` exists → remove from map
   - Set to `null`

2. **If event has coordinates:**
   - Parse WKT format: `POINT(lng lat)`
   - Create calendar icon marker
   - Add to map
   - Bind popup with event description
   - **Pan to marker location (NO zoom change)**
   - Store in `currentDogadjajiMarker`

3. **If event has no coordinates:**
   - Previous marker already removed
   - No new marker added
   - Map position unchanged

### Coordinate Format:
- **Storage:** WKT format `POINT(longitude latitude)`
- **Parsing:** Regex `/POINT\s*\(\s*([\d.-]+)\s+([\d.-]+)\s*\)/i`
- **Display Precision:** 6 decimal places

---

## 5. Event Detail Layer (догађај layer)

### Layer Element
**ID:** `#dogadjaj_layer`  
**Position:** Top of screen  
**Initial Height:** 35px  
**Margin:** 0

### Display Fields

#### Row 1: Description Only
- **Element:** `#dogadjaj_opis`
- **Content:** Event description text
- **Fallback:** "Није наведено"

#### Row 2: Time Period (Combined)
- **Element:** `#dogadjaj_vrijeme`
- **Format:** `<b>Почетак:</b> DD.MM.YYYY. HH:MM - <b>Крај:</b> DD.MM.YYYY. HH:MM`
- **Labels:** Bold
- **Fallback:** "Није наведено" for missing dates

#### Row 3: Source
- **Element:** `#dogadjaj_izvor`
- **Format:** `<b>Извор:</b> source_text`
- **Label:** Bold
- **Fallback:** "Није наведено"

### Date/Time Formatting

**Function:** `formatDateTime(dateTimeStr)`

**Format:** `DD.MM.YYYY. HH:MM`

**Example:** `04.12.2025. 15:30`

### Layer Behavior

#### Opening:
- Triggered by `viewDogadjaj(id)` function
- Adds class `show` to `#dogadjaj_layer`
- Fetches event details via API

#### Closing:
- **Close Button:** `#dogadjaj_close`
- Removes class `show`
- Resets height to 35px

#### Resizing:
- **Resize Handle:** `.dogadjaj_resize_handle`
- **Drag Direction:** Vertical (bottom border)
- **Min Height:** 100px
- **Max Height:** 80% of window height
- **Behavior:** Drag down to expand and reveal hidden content
- **No vertical scrollbar** (content expands with layer)

---

## 6. API Endpoints

### Insert Event
- **Endpoint:** `/api/dogadjaji/insert`
- **Method:** POST
- **Payload:**
  ```json
  {
    "korisnik": "username",
    "opis": "description",
    "pocetak": "YYYY-MM-DDTHH:MM",
    "kraj": "YYYY-MM-DDTHH:MM",
    "koordinate": "POINT(lng lat)",
    "izvor": "source",
    "zapis": "record"
  }
  ```

### Search Events
- **Endpoint:** `/api/dogadjaji/search`
- **Method:** POST
- **Payload:**
  ```json
  {
    "id": 123,  // Optional: specific event
    "opis": "search text",
    "pocetak": "YYYY-MM-DDTHH:MM",
    "kraj": "YYYY-MM-DDTHH:MM",
    "izvor": "0|1",
    "prostorno": "0|1",
    "vremenski": "0|1"
  }
  ```

---

## 7. Integration with karta.js

### Custom Event
**Event Name:** `draw:created.dogadjaji`

**Fired By:** `karta.js` when marker created and `#dogadjaji_marker_tool` is checked

**Handled By:** `dogadjaji.js` `initializeMarkerTool()` function

### Global Variables Used
- `karta` - Leaflet map instance
- `drawnItems` - Feature group for drawn items
- `drawnControl` - Leaflet Draw control instance

---

## 8. Initialization

### On Document Ready:
1. Call `initializeDogadjaji()`
2. Call `initDogadjajLayer()`

### On Section Load:
- If section already loaded, calls `window.initDogadjajiSection()`

### Initialization Functions:
- `initializeDogadjaji()` - Sets up form handlers and marker tool
- `initializeMarkerTool()` - Configures marker placement functionality
- `initDogadjajLayer()` - Sets up detail layer resize and close handlers

---

## 9. Critical Behaviors Summary

### ✅ DO:
- Always remove previous dogadjaji marker before adding new one
- Validate zoom level (≥13) before accepting marker placement
- Keep marker tool active when zoom validation fails
- Show errors in form error div, not JS alerts
- Pan to marker without changing zoom level
- Clear error messages on successful coordinate capture
- Auto-populate username from session storage

### ❌ DON'T:
- Don't use JS `alert()` for validation errors
- Don't disable marker tool when zoom is insufficient
- Don't change zoom level when centering on marker
- Don't allow marker placement below zoom level 13
- Don't add dogadjaji markers to `drawnItems` layer

---

## 10. Error Messages Reference

| Scenario | Message | Display Location |
|----------|---------|------------------|
| Empty description | "попуните поље (опис)" | `#dogadjaji_unos_error` |
| Description too short | "опис мора имати најмање 10 карактера" | `#dogadjaji_unos_error` |
| Empty start date | "попуните поље (почетак)" | `#dogadjaji_unos_error` |
| Empty source | "попуните поље (извор)" | `#dogadjaji_unos_error` |
| Zoom too low | "Приближите карту ради тачности уноса!" | `#dogadjaji_unos_error` |
| Insert success | "догађај је додат" | `#dogadjaji_unos_error` (green) |
| Insert error | "Грешка при додавању догађаја" | `#dogadjaji_unos_error` |
| Search error | "Грешка при претрази" | `#dogadjaji_trazi_error` |
| No results | "Нема резултата." | Results table |
| Server error | "Грешка при комуникацији са сервером" | Respective error div |

---

## Version History

| Date | Changes | Modified By |
|------|---------|-------------|
| 2025-12-04 | Initial documentation created | AI Assistant |
| 2025-12-04 | Fixed marker tool: zoom validation (15), inline errors, tool stays active | AI Assistant |
| 2025-12-18 | Updated minimum zoom level to 13 for both dogadjaji and teme sections | AI Assistant |
