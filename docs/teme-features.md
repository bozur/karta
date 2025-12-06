# Teme (Themes) Tab - Feature Documentation

This document describes all features and behaviors of the "teme" (themes) tab for searching, displaying, and managing map markers by theme categories.

**Last Updated:** 2025-12-06  
**Files:** `sections/teme.html`, `sections/teme.js`, `database/create_teme_table.sql`, `database/create_teme_opcije_table.sql`

---

## Overview

The teme tab allows users to select a theme/category, then search for map markers using hierarchical filters. It results in GeoJSON markers with custom icons. Key features include a completely dynamic "Novo" (Insert) section for proposing new data via map drawing, integration with "Dogadjaji" (Events) for temporal context, and strict state management to prevent data loss during theme switching.

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

### Table: `Table_{tema_id}`

**Dynamic tables** for each theme containing actual map data:
(Standard columns: ID, vrsta, podvrsta, razred, vrijeme0, vrijeme1, tacke, izvor, opis...)

---

## 2. Theme Selection

### Theme Dropdown
**Element:** `#teme_izbor`  
**Default Option:** "изабери:" (value = "0")

### Behavior
1. **Loading:** Fetches themes from `/api/v2/themes` on load.
2. **Persistence:** Selected theme ID is stored in `window.lastSelectedTeme`.
3. **Blocking:** If the user attempts to change the theme while there are unsaved rows in the "Novo" section:
    - The change is **blocked**.
    - The dropdown visually reverts to the previous selection.
    - An alert appears: "Нова претрага нија могућа док постоје приједлози за унос у дијелу 'ново'".
    - The alert auto-hides after 3 seconds.

---

## 3. Layer Visibility Toggle

### Checkbox Control
**Element:** `#switch_slojevi` ("слојеви")
- **Checked:** Default map styles (Standard/Satellite). `window.layersVisible = true`.
- **Unchecked:** Clean map styles (No roads/labels). `window.layersVisible = false`.

---

## 4. Search Functionality

### Dynamic Form Loading
**Function:** `loadTemeContent(valueSelected)`
- Injects `teme.html` template.
- Populates dropdowns (razred, vrsta, podvrsta) from `/api/v2/theme-options/:id`.

### Search Blocking
- Similar to theme selection, **searching is blocked** if there are unsaved rows in the "Novo" section.
- Displays the same blocking alert message to prevent data loss.

---

## 5. Map Search

### Form Fields
- **Разред/Врста/Подврста:** Dropdowns populated dynamically.
- **Просторно/Временски:** Accuracy toggles.
- **Извор:** Source filter.
- **Опис:** Text search (full row).
- **Почетак/Крај (од/до):** Time span range (also triggers Events search).

### Behavior
- **API:** POST `/api/search`
- **Result:** GeoJSON FeatureCollection.
- **Icons:** Uses `window.createIcon` to generate theme-specific markers (`ikone/{tema}/{razred}.png`).
- **Events:** Automatically triggers `searchDogadjajiForTeme(od, do)` to find overlapping events.

---

## 6. Map Markers & Popups

### Markers
- **Icons:** Dynamic based on `tema_id` and `razred`.
- **Global Access:** `createIcon` and `onEachFeature` are globally exposed in `karta.js` to ensure consistent rendering.

### Popups
- **Layout:**
    - Clean design with minimal padding.
    - **Header:** Link icon to details (`pointinfo`).
    - **Fields:** Razred, Vrsta, Podvrsta (Dropdowns), Opis, Izvor.
    - **Time:** `Pocetak` and `Kraj` fields are stacked vertically (separate rows) to fit narrow popup width.
    - **Zapis:** Dropdown synced with theme.
- **Data Binding:**
    - **Two-Way Sync:** Changes in the popup immediately reflect in the corresponding "Novo" sidebar row, and vice-versa.
    - **Focus Sync:** Clicking "Иди на ред" in the popup scrolls the sidebar to the relevant row.

---

## 7. Insert (Novo) Section & Drawing Tools

### Overview
A dynamic section that allows users to propose new data points, lines, or polygons for the selected theme.

### Drawing Tools
- **Visibility:** "Alat" checkbox appears only after a search is performed.
- **Toggle:** Checking "Alat" enables Leaflet Draw controls.
- **Creation:** Drawing a marker/shape automatically adds a new row to the "Novo" list and `window.temeInsertRows`.

### "Novo" Rows
- **Dynamic List:** Rows appear in `#teme_insert_rows_container`.
- **Fields per Row:**
    - Opis (Text)
    - Razred, Vrsta, Podvrsta (Dropdowns - synced with search options)
    - Pocetak, Kraj (Datetime-local)
    - Izvor (Text)
    - Zapis (Dropdown - Filtered by current theme)
- **Zapis Filtering:**
    - The "Zapis" dropdown fetches data from `/api/zapisi/search` filtering strictly by `tema_id`.
    - If no records match, shows "нема записа".
- **Interaction:**
    - **Focus:** Clicking a row input highlights the map object (yellow halo) and opens its popup.
    - **Deletion:** Clicking the red "x" removes the row **and** the map object. It also **force-closes** the popup to prevent ghost UI.

### State Persistence
- **Variable:** `window.temeInsertRows` stores all geometry and data.
- **Tab Switching:** Data persists when navigating away from and back to the Teme tab.

---

## 8. Events Integration

### Overview
The Teme tab automatically searches for and displays "Dogadjaji" (Events) that overlap with the selected time span (`od` - `do`).

### UI
- **Section:** Collapsible "Догађаји" section below the map/search tools.
- **Results:** List of events with ID, Description, and Geo-icon (if coordinates exist).
- **Interaction:** Clicking an event opens its detailed view (loading `dogadjaji.js` dynamically if needed).

---

## 9. Sidebar Panel (Details)

Displays full details when a search result marker key (anchored link) is clicked. Uses `pointinfo` attribute to fetch data from `/api/points/:id`.

---

## 10. API Endpoints Summary

- **GET `/api/v2/themes`**: List of themes.
- **GET `/api/v2/theme-options/:id`**: Options for a theme.
- **POST `/api/search`**: Main map search.
- **POST `/api/zapisi/search`**: Search for Zapis records (used for dropdown filtering).
- **POST `/api/dogadjaji/search`**: Search for overlapping events.

---

## 11. Critical Behaviors

### Blocking Logic
To prevent data loss, the system **strictly blocks** the following actions if `window.temeInsertRows` is not empty:
1.  Changing the Theme via dropdown.
2.  Submitting a new Search.

**User Feedback:** The UI shows a blocking alert ("Нова претрага нија могућа...") which clears after 3 seconds.

### State Consistency
- **`window.tabela`**: Strictly synchronized with `window.lastSelectedTeme` before any search/map operation.
- **Map Objects**: Markers and Popups use the global `window.tabela` to ensure they render with the correct context (icons/labels) even if specific local variables are stale.

---

## 12. Global Variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `window.lastSelectedTeme` | Global | Persists selected theme ID. |
| `window.temeInsertRows` | Global | Array of pending insert objects {geometry, layer, data}. |
| `window.temeState` | Global | Stores search results and time span for persistence. |
| `window.tabela` | Global | Active theme ID used by map renderers. |
| `window.createIcon` | Global | Helper to create theme-specific Leaflet icons. |
| `window.onEachFeature` | Global | Helper to bind popups to features. |

---

## 13. File Structure

```
sections/
  teme.html       - HTML template
  teme.js         - Logic: Search, Drawing, Sync, Persistence
  
docs/
  teme-features.md - This documentation
```
