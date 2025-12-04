# Teme (Themes) Tab - Feature Documentation

This document describes all features and behaviors of the "teme" (themes) tab for searching and displaying map markers by theme categories.

**Last Updated:** 2025-12-04  
**Files:** `sections/teme.html`, `sections/teme.js`, `database/create_teme_table.sql`, `database/create_teme_opcije_table.sql`

---

## Overview

The teme tab allows users to select a theme/category, then search for map markers using hierarchical filters (razred, vrsta, podvrsta). Results are displayed as GeoJSON markers on the map with custom icons. The system includes a layer visibility toggle and dynamic dropdown population from the database.

---

## 1. Database Schema

### Table: `teme`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, IDENTITY(1,1) | Unique theme identifier |
| `naziv` | NVARCHAR(50) | NOT NULL, UNIQUE | Theme name |

**Index:** `idx_naziv` on `naziv`

### Table: `teme_opcije`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, IDENTITY(1,1) | Unique option identifier |
| `tema_id` | INT | NOT NULL, FK → `teme.id` | Theme this option belongs to |
| `tip` | NVARCHAR(20) | NOT NULL, CHECK IN ('razred', 'vrsta', 'podvrsta') | Option type |
| `redosled` | INT | NOT NULL | Order/position in dropdown (0-based index) |
| `vrednost` | NVARCHAR(100) | NOT NULL | The actual option value/text |

**Constraints:**
- `FK_teme_opcije_tema`: Foreign key to `teme(id)` with CASCADE DELETE
- `CK_teme_opcije_tip`: Check constraint for valid tip values
- `UQ_teme_opcije_tema_tip_redosled`: Unique constraint on (tema_id, tip, redosled)

**Indexes:**
- `idx_tema_id` on `tema_id`
- `idx_tema_tip` on `(tema_id, tip)`

### Table: `Table_{tema_id}`

**Dynamic tables** for each theme containing actual map data:

| Column | Type | Description |
|--------|------|-------------|
| `ID` | INT | Record identifier |
| `vrsta` | NVARCHAR | Type index (maps to teme_opcije) |
| `podvrsta` | NVARCHAR | Subtype index (maps to teme_opcije) |
| `razred` | NVARCHAR | Class index (maps to teme_opcije) |
| `vrijeme0` | DATETIME | Start time |
| `vrijeme1` | DATETIME | End time |
| `tacke0` | NVARCHAR | Geometry type (Point, Polygon, etc.) |
| `tacke` | NVARCHAR | GeoJSON coordinates |
| `tp` | NVARCHAR | Spatial accuracy (тачно/оквирно) |
| `tv` | NVARCHAR | Temporal accuracy (тачно/оквирно) |
| `izvor` | NVARCHAR | Source reference |
| `opis` | NVARCHAR | Description |

---

## 2. Theme Selection

### Theme Dropdown

**Element:** `#teme_izbor`  
**Default Option:** "изабери:" (value = "0")

### Theme Loading

**Function:** `loadThemesDropdown()`  
**API Endpoint:** `/api/v2/themes`  
**Method:** GET

**Response:**
```json
{
  "themes": [
    {"id": 1, "naziv": "Theme Name"},
    {"id": 2, "naziv": "Another Theme"}
  ]
}
```

### Behavior

1. **On section load:**
   - Fetch themes from database
   - Populate dropdown (keeping first "изабери:" option)
   - Restore previously selected theme if exists

2. **Theme persistence:**
   - Selected theme stored in `window.lastSelectedTeme`
   - Persists across section navigations
   - Restored when returning to teme tab

3. **When theme = "0" (no selection):**
   - Drawing tools removed from map
   - Message: "промјена теме брише приједлог за унос!"

4. **When theme selected:**
   - Drawing tools added to map
   - Search form loaded
   - Dropdown options fetched from API

---

## 3. Layer Visibility Toggle

### Checkbox Control

**Element:** `#switch_slojevi`  
**Label:** "слојеви"  
**Default State:** Checked (layers visible)

### Behavior

**When checked:**
- `window.layersVisible = true`
- Map shows all default layers (roads, borders, POIs)
- Uses regular map styles (terrain/satellite)

**When unchecked:**
- `window.layersVisible = false`
- Map shows "clean" styles without roads/borders/POIs
- Uses custom clean map styles

### Persistence

- State saved to `localStorage.setItem('layersVisible', checked)`
- Restored on page reload
- Calls `window.toggleMapLayers()` to switch map styles

---

## 4. Search Functionality

### Dynamic Form Loading

**Function:** `loadTemeContent(valueSelected)`  
**Trigger:** Theme selection change

**Process:**
1. Load `teme.html` template via AJAX
2. Inject into `#teme_trazi` div
3. Fetch dropdown options from API
4. Populate razred, vrsta, podvrsta dropdowns
5. Initialize search form handler

### Dropdown Options API

**Endpoint:** `/api/v2/theme-options/:tema_id`  
**Method:** GET  
**Parameter:** `tema_id` (integer)

**Response:**
```json
{
  "options": {
    "razred": ["option1", "option2", ...],
    "vrsta": ["option1", "option2", ...],
    "podvrsta": ["option1", "option2", ...]
  }
}
```

### Dropdown Population

**Dropdowns:**
- `#razred` - Class/category
- `#vrsta` - Type
- `#podvrsta` - Subtype

**Population Logic:**
- Options added with index as value: `<option value="0">option text</option>`
- Empty strings skipped (not added to dropdown)
- Order preserved from `redosled` column

### Fallback Mechanism

**If API fails:**
- Falls back to hardcoded `table` array from `karta.js`
- Uses `table[tema_id][type][index]` structure
- Logs fallback usage to console
- Ensures backward compatibility

---

## 5. Map Search

### Search Form

**Form ID:** `#form_trazi` (loaded from `teme.html`)

**Search Fields:**
| Field | ID | Type | Description |
|-------|-----|------|-------------|
| Разред | `#razred` | Dropdown | Class/category filter |
| Врста | `#vrsta` | Dropdown | Type filter |
| Подврста | `#podvrsta` | Dropdown | Subtype filter |
| Просторно | `#prostorno` | Dropdown | Spatial accuracy (тачно/оквирно) |
| Временски | `#vremenski` | Dropdown | Temporal accuracy (тачно/оквирно) |
| Извор | `#izvor` | Dropdown | Source length filter |
| Опис | `#opis` | Text | Description search |

### Search API

**Endpoint:** `/api/search`  
**Method:** POST

**Request:**
```json
{
  "tabela": "1",
  "razred": "0",
  "vrsta": "1",
  "podvrsta": "",
  "prostorno": "тачно",
  "vremenski": "оквирно",
  "izvor": "0",
  "opis": "search text"
}
```

**Response:** GeoJSON FeatureCollection
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [lng, lat]
      },
      "properties": {
        "id": 123,
        "v": 1,
        "p": 2,
        "r": 0,
        "v0": "2020-01-01",
        "v1": "2020-12-31"
      }
    }
  ]
}
```

### Search Behavior

**Function:** `pretrazi()` (defined in `karta.js`)

**Process:**
1. User submits search form
2. Show loading spinner (`#form_trazi_cekanje`)
3. Build query with selected filters
4. Fetch GeoJSON from `/api/search`
5. Remove previous markers from map
6. Add new GeoJSON layer with custom icons
7. Fit map bounds to show all markers
8. Hide loading spinner

### Search Query Logic

**Filter Conditions:**
- All filters are optional (empty search returns all records)
- Multiple filters combined with AND
- Text fields use LIKE `%value%`
- Dropdown values match exactly
- `izvor` filter: checks source field length > selected value

---

## 6. Map Markers

### Marker Icons

**Icon Path:** `ikone/{tema_id}/{razred}.png`  
**Icon Size:** 32x37 pixels  
**Icon Anchor:** [16, 37] (bottom center)  
**Popup Anchor:** [0, -30]

### Icon Selection

**Function:** `createIcon(razred, tema_id)`  
**Logic:** Icon filename based on razred (class) value  
**Example:** Theme 1, razred 2 → `ikone/1/2.png`

### Marker Popups

**Content:**
- Info icon: `<i class="bi bi-book"></i>`
- Clickable link with `pointinfo` attribute
- Shows vrsta (type) text from dropdown options

**Click Behavior:**
- Opens sidebar panel
- Fetches full record details via `/api/points/:id?table={tema_id}`
- Displays formatted information

---

## 7. Sidebar Panel

### Panel Display

**Element:** Leaflet sidebar control  
**Position:** Left side of map

### Content Format

**Title:** Razred (class) name  
**Fields:**
- **Врста:** Type name
- **Подврста:** Subtype name
- **Вријеме:** Formatted date range (DD.MM.YYYY. - DD.MM.YYYY.) + accuracy
- **Опис:** Description text
- **Извор:** Source reference
- **Просторно:** Spatial accuracy (тачно/оквирно)

### Toggle Behavior

- **First click:** Opens sidebar
- **Same marker click:** Toggles sidebar
- **Different marker click:** Updates content, keeps sidebar open

---

## 8. API Endpoints Summary

### GET /api/v2/themes

**Response:**
```json
{
  "themes": [
    {"id": 1, "naziv": "Theme Name"}
  ]
}
```

### GET /api/v2/theme-options/:tema_id

**Parameters:** `tema_id` (integer)

**Validation:**
- tema_id must be numeric
- tema_id must exist in teme table

**Response:**
```json
{
  "options": {
    "razred": ["value1", "value2"],
    "vrsta": ["value1", "value2"],
    "podvrsta": ["value1", "value2"]
  }
}
```

**Errors:**
- 400: Invalid tema_id parameter
- 404: Theme not found
- 500: Internal server error

### POST /api/search

**Request:**
```json
{
  "tabela": "theme_id",
  "razred": "index",
  "vrsta": "index",
  "podvrsta": "index",
  "prostorno": "text",
  "vremenski": "text",
  "izvor": "length",
  "opis": "search_text"
}
```

**Response:** GeoJSON FeatureCollection

**Errors:**
- 400: Invalid table parameter
- 500: Database error

### GET /api/points/:id

**Parameters:**
- `id`: Point ID
- `table`: Theme ID (query parameter)

**Response:** Point details object

---

## 9. Initialization

### On Document Ready:
- Call `initTemeSection()`

### On Section Load (if already loaded):
- Calls `initTemeSection()` via `window.initTemeSection`

### Initialization Steps:
1. Load themes from database into dropdown
2. Restore previously selected theme from `window.lastSelectedTeme`
3. If theme was selected, reload search form after 300ms delay
4. Attach change handler to theme dropdown

### Event Handlers:
- `#teme_izbor change` → `loadTemeContent(valueSelected)`
- `#switch_slojevi change` → Toggle layer visibility
- `#form_trazi submit` → `pretrazi()` (search function)

---

## 10. Critical Behaviors Summary

### ✅ DO:
- Store selected theme in `window.lastSelectedTeme` for persistence
- Restore theme selection when returning to tab
- Use API for dropdown options with fallback to hardcoded table
- Remove previous map markers before adding new ones
- Fit map bounds to show all search results
- Validate tema_id parameter in API calls
- Use 0-based index for dropdown option values
- Skip empty option values when populating dropdowns

### ❌ DON'T:
- Don't lose theme selection when switching tabs
- Don't trust tema_id parameter without validation
- Don't add duplicate event handlers (use `.off()` before `.on()`)
- Don't fail if API is unavailable (use fallback)
- Don't show drawing tools when no theme selected
- Don't forget to update `window.layersVisible` when toggling layers
- Don't add markers without removing previous ones first

---

## 11. Global Variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `window.lastSelectedTeme` | Global | Persists selected theme across navigations |
| `window.layersVisible` | Global | Tracks layer visibility state |
| `table` | Global (karta.js) | Fallback hardcoded dropdown options |
| `addedGeoJSON` | Global (karta.js) | Current GeoJSON layer on map |
| `tabela` | Global (karta.js) | Currently selected theme ID |

---

## 12. Integration with karta.js

### Functions Called:
- `pretrazi()` - Search form handler
- `createIcon(razred, tema_id)` - Icon factory
- `onEachFeature(feature, layer)` - Popup binding
- `window.toggleMapLayers()` - Layer visibility toggle

### Variables Used:
- `karta` - Leaflet map instance
- `drawnItems` - Feature group for drawing
- `drawnControl` - Leaflet Draw control
- `table` - Hardcoded dropdown options (fallback)

---

## 13. Error Messages Reference

| Scenario | Message | Display Location |
|----------|---------|------------------|
| No theme selected | "промјена теме брише приједлог за унос!" | `#teme_trazi` |
| Invalid tema_id | "Invalid tema_id parameter" | HTTP 400 |
| Theme not found | "Theme not found" | HTTP 404 |
| Invalid table parameter | "Invalid table parameter" | HTTP 400 |
| API fetch error | Console error log | Browser console |
| Fallback activated | "Using fallback table array for theme X" | Browser console |

---

## 14. File Structure

```
sections/
  teme.html       - Main tab HTML with theme dropdown and layer toggle
  teme.js         - Theme selection and dropdown population logic
  
database/
  create_teme_table.sql         - Theme names table
  create_teme_opcije_table.sql  - Dropdown options table
  populate_teme_table.sql       - Initial theme data
  populate_teme_opcije_table.sql - Initial options data

ikone/
  {tema_id}/
    {razred}.png  - Custom marker icons per theme and class
```

---

## Version History

| Date | Changes | Modified By |
|------|---------|-------------|
| 2025-12-04 | Initial documentation created | AI Assistant |
