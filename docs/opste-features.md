# Opste (General) Tab - Feature Documentation

This document describes all features and behaviors of the "opste" (general) tab for displaying news, statistics, and user rankings.

**Last Updated:** 2025-12-31  
**Files:** `sections/opste.html`, `sections/opste.js`

---

## Overview

The opste tab displays general information about the application including recent news/activity, overall statistics, and user ranking categories. Content is organized in three collapsible accordion sections.

---

## 1. Tab Structure

### Accordion Sections

**Container:** `#opste_accordion`  
**Behavior:** Bootstrap accordion (mutual exclusivity via `data-parent`)

**Sections:**
1. **Новости** (News) - Default open
2. **Преглед** (Overview/Statistics) - Default closed
3. **Избор сарадника** (Top Contributors) - Default closed
4. **Избор подршке** (Support Selection) - Default closed
5. **Начин сарадње** (Collaboration Guidelines) - Default closed

---

## 2. Новости (News) Section

### Purpose
Display recent activity and updates on the platform.

### Structure

**Toggle Element:** `#opste_novosti`  
**Content Container:** `#opste_novosti_sadrzaj`  
**Default State:** Expanded (`collapse show`)

### Content Format

**Display:** Table with two columns
- **Column 1:** Date (width: 120px)
- **Column 2:** News description (auto width)

**Hover Effect:** Light gray background (`rgba(0, 0, 0, 0.05)`)

### Sample Data

| Date | Description |
|------|-------------|
| 2.12.2025. | Додата је нова тема 'Мраморје' |
| 1.12.2025. | Нови корисник се регистровао |
| 30.11.2025. | Додат нови догађај 'Сусрет у парку' |
| 29.11.2025. | Нова ставка је одобрена |
| 28.11.2025. | Додата је нова примједба |

### Implementation

**Status:** **Fully Dynamic** - Loaded from database via API

**API Endpoint:** `GET /api/novosti`

**Database Table:**
```sql
CREATE TABLE novosti (
    id SERIAL PRIMARY KEY,
    vrijeme TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    opis VARCHAR(4000) NOT NULL,
    uneo INTEGER -- User ID who created the news
);
```

**JavaScript Function:** `ucitajNovosti()`

**Loading Process:**
1. Fetch news from `/api/novosti`
2. Format dates using `toLocaleDateString('sr-RS')`
3. Populate `#opste_novosti_tabela`
4. Show "Нема новости." if empty
5. Display error message on failure

---

## 3. Преглед (Overview) Section

### Purpose
Display overall platform statistics.

### Structure

**Toggle Element:** `#opste_pregled`  
**Content Container:** `#opste_pregled_sadrzaj`  
**Default State:** Collapsed

### Statistics Displayed

| Label | Element ID | Description |
|-------|-----------|-------------|
| новости | `#pregled-novosti` | Total news items from `novosti` table |
| тема | `#pregled-tema` | Total themes from `teme` table |
| ставки | `#pregled-stavki` | Total map items (sum of all table_1 through table_6) |
| догађаја | `#pregled-dogadjaja` | Total events from `dogadjaji` table (stanje='1') |
| записа | `#pregled-zapisa` | Total uploaded files from `zapisi` table (stanje='1') |
| корисника | `#pregled-korisnika` | Total registered users from `korisnik` table |

### Display Format

**Structure:**
```html
<span style="color: #666;">label:</span> <span id="element-id">value</span>
```

**Styling:**
- Labels in gray (`#666`)
- Values in default text color
- 5px margin between rows

### Implementation

**Status:** **Fully Dynamic** - Loaded from database via API

**API Endpoint:** `GET /api/opste/stats`

**Response Format:**
```json
{
  "pregled": {
    "novosti": 15,
    "tema": 6,
    "stavki": 456,
    "dogadjaja": 67,
    "zapisa": 543,
    "korisnika": 127
  },
  "izbor": [
    {
      "username": "user123",
      "points": 4580,
      "stavki": 456,
      "dogadjaja": 12,
      "zapisa": 8
    }
  ]
}
```

**JavaScript Function:** `ucitajStatistiku()`

---

## 4. Избор сарадника (Top Contributors) Section

### Purpose
Display top 5 contributors based on point calculation.

### Structure

**Toggle Element:** `#opste_izbor`  
**Content Container:** `#opste_izbor_sadrzaj`  
**List Container:** `#opste_izbor_lista`  
**Default State:** Collapsed

### Point Calculation Formula

```
Total Points = (stavki × 10) + dogadjaja + zapisa
```

**Where:**
- `stavki` = Total records in table_1 through table_6 inserted by user
- `dogadjaja` = Total records in dogadjaji inserted by user
- `zapisa` = Total records in zapisi inserted by user

### Display Format

**Format:** `{rank}. {points} {username} (ставки: {stavki}, догађаја: {dogadjaja}, записа: {zapisa})`

**Example:**
```
1. 4580 user123 (ставки: 456, догађаја: 12, записа: 8)
2. 3210 contributor2 (ставки: 320, догађаја: 5, записа: 5)
```

### Implementation

**Data Source:** Included in `/api/opste/stats` response  
**Limit:** Top 5 contributors  
**Sorting:** By total points (descending)

---

## 5. Избор подршке (Support Selection) Section

### Purpose
Display support/donation options (future feature).

### Structure

**Toggle Element:** `#opste_podrska`  
**Content Container:** `#opste_podrska_sadrzaj`  
**Default State:** Collapsed

### Current Status

**Implementation:** Placeholder  
**Content:** "Нема података."

---

## 6. Начин сарадње (Collaboration Guidelines) Section

### Purpose
Provide guidelines for contributors on how to collaborate effectively.

### Structure

**Toggle Element:** `#opste_nacin_saradnje`  
**Content Container:** `#opste_nacin_saradnje_sadrzaj`  
**Default State:** Collapsed

### Content

**Topics Covered:**
- How to coordinate work to avoid duplication
- Specific theme suggestions (e.g., "страдање објеката СПЦ")
- Source recommendations for different themes
- Contact information for collaboration

---

## 7. JavaScript Functionality

### File: `opste.js`

**Current Implementation:**
```javascript
$(document).ready(function () {
    console.log('Opste section loaded');
    // Bootstrap's data-parent handles accordion automatically
});
```

**Functionality:**
- Minimal JavaScript required
- Bootstrap handles accordion behavior via `data-parent="#opste_accordion"`
- No custom event handlers needed

### Accordion Behavior

**Mutual Exclusivity:**
- Clicking one section closes others
- Handled by Bootstrap's `data-parent` attribute
- Smooth collapse/expand animations

**Icons:**
- `bi-arrows-expand` icon on all section headers
- Indicates collapsible nature
- No rotation/change on expand (could be enhanced)

---

## 6. Styling

### Custom CSS

**Hover Effect:**
```css
#opste_novosti_sadrzaj table tr:hover {
    background-color: rgba(0, 0, 0, 0.05);
}
```

**Applied To:** News table rows  
**Effect:** Subtle gray background on hover

### Bootstrap Classes Used

- `mt-2` - Margin top (spacing between sections)
- `collapse` - Bootstrap collapse component
- `show` - Initially visible (for news section)
- `bi-arrows-expand` - Bootstrap icon

---

## 7. Future Enhancements

### Recommended Improvements

1. **Dynamic News Loading**
   - Create `novosti` database table
   - API endpoint: `GET /api/novosti`
   - Load recent 10-20 items
   - Pagination or "load more" button

2. **Real-Time Statistics**
   - API endpoint: `GET /api/statistics/overview`
   - Query database for actual counts
   - Auto-refresh every X minutes
   - Cache results for performance

3. **User Rankings**
   - Calculate user levels based on contributions
   - Display current user's rank
   - Leaderboard of top contributors
   - Badge/achievement system

4. **Activity Feed**
   - Real-time updates (WebSocket or polling)
   - Filter by activity type
   - User-specific activity view
   - Date range filtering

5. **Visual Enhancements**
   - Icons for different news types
   - Charts/graphs for statistics
   - Progress bars for user rankings
   - Animated counters for statistics

---

## 8. Database Schema Recommendations

### Table: `novosti` (News/Activity Feed)

```sql
CREATE TABLE novosti (
    id INT IDENTITY(1,1) PRIMARY KEY,
    datum DATETIME2 DEFAULT GETDATE(),
    tip NVARCHAR(50) NOT NULL, -- 'tema', 'korisnik', 'dogadjaj', etc.
    opis NVARCHAR(255) NOT NULL,
    korisnik_id INT NULL,
    referenca_id INT NULL, -- ID of related item (tema_id, dogadjaj_id, etc.)
    CONSTRAINT FK_novosti_korisnik FOREIGN KEY (korisnik_id) 
        REFERENCES korisnik(id)
);

CREATE INDEX idx_novosti_datum ON novosti(datum DESC);
CREATE INDEX idx_novosti_tip ON novosti(tip);
```

### Table: `statistika` (Cached Statistics)

```sql
CREATE TABLE statistika (
    id INT IDENTITY(1,1) PRIMARY KEY,
    kljuc NVARCHAR(50) UNIQUE NOT NULL, -- 'tema', 'stavki', 'dogadjaja', etc.
    vrednost INT NOT NULL,
    azurirano DATETIME2 DEFAULT GETDATE()
);
```

---

## 9. API Endpoints (Proposed)

### GET /api/novosti

**Purpose:** Fetch recent news/activity

**Query Parameters:**
- `limit` (default: 20) - Number of items
- `offset` (default: 0) - Pagination offset
- `tip` (optional) - Filter by activity type

**Response:**
```json
{
  "success": true,
  "novosti": [
    {
      "id": 1,
      "datum": "2025-12-02T10:00:00.000Z",
      "tip": "tema",
      "opis": "Додата је нова тема 'Мраморје'",
      "korisnik": "user123"
    }
  ],
  "total": 150
}
```

### GET /api/statistics/overview

**Purpose:** Fetch platform statistics

**Response:**
```json
{
  "success": true,
  "statistics": {
    "novosti": 15,
    "tema": 89,
    "stavki": 456,
    "dogadjaja": 67,
    "zapisa": 543,
    "primjedbi": 234,
    "korisnika": 127
  },
  "azurirano": "2025-12-04T12:00:00.000Z"
}
```

---

## 10. Critical Behaviors Summary

### ✅ DO:
- Use Bootstrap's accordion behavior (data-parent)
- Keep news items concise and readable
- Display dates in consistent format (DD.MM.YYYY.)
- Provide visual feedback on hover
- Load content dynamically when implementing API

### ❌ DON'T:
- Don't hardcode statistics (implement dynamic loading)
- Don't show stale data (implement refresh mechanism)
- Don't overwhelm with too many news items
- Don't forget to handle empty states
- Don't skip error handling when implementing API

---

## 11. Content Guidelines

### News Items

**Format:** `{Date}. {Description}`  
**Date Format:** DD.MM.YYYY.  
**Description:** Short, descriptive sentence

**Examples:**
- ✅ "Додата је нова тема 'Мраморје'"
- ✅ "Нови корисник се регистровао"
- ❌ "Корисник user123 је додао нову тему Мраморје у категорију историја у 14:35" (too verbose)

### Statistics

**Display:** Whole numbers only  
**Format:** No thousand separators (456, not 456,000)  
**Labels:** Lowercase, consistent terminology

### Rankings

**Categories:** Clear progression (почетник → напредни → експерт)  
**Thresholds:** Realistic and achievable  
**Display:** Consistent format across all levels

---

## Version History

| Date | Changes | Modified By |
|------|---------|-------------|
| 2025-12-04 | Initial documentation created | AI Assistant |
| 2025-12-31 | Major update: Replaced static content with dynamic API implementation, added contributor rankings with point calculation, added collaboration guidelines section, updated database schema to PostgreSQL | AI Assistant |

