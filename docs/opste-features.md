# Opste (General) Tab - Feature Documentation

This document describes all features and behaviors of the "opste" (general) tab for displaying news, statistics, and user rankings.

**Last Updated:** 2025-12-04  
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
2. **Преглед** (Overview) - Default closed
3. **Избор** (Selection/Rankings) - Default closed

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

### Implementation Status

**Current:** Static HTML content (hardcoded)  
**Future:** Should be dynamically loaded from database

**Potential Database Table:**
```sql
CREATE TABLE novosti (
    id INT PRIMARY KEY IDENTITY(1,1),
    datum DATETIME2 DEFAULT GETDATE(),
    opis NVARCHAR(255) NOT NULL,
    tip NVARCHAR(50) -- 'tema', 'korisnik', 'dogadjaj', 'stavka', 'primjedba'
);
```

---

## 3. Преглед (Overview) Section

### Purpose
Display overall platform statistics.

### Structure

**Toggle Element:** `#opste_pregled`  
**Content Container:** `#opste_pregled_sadrzaj`  
**Default State:** Collapsed

### Statistics Displayed

| Label | Element ID | Sample Value | Description |
|-------|-----------|--------------|-------------|
| новости | `#pregled-novosti` | 15 | Total news items |
| тема | `#pregled-tema` | 89 | Total themes |
| ставки | `#pregled-stavki` | 456 | Total map items/points |
| догађаја | `#pregled-dogadjaja` | 67 | Total events |
| записа | `#pregled-zapisa` | 543 | Total uploaded files |
| примједби | `#pregled-primjedbi` | 234 | Total comments |
| корисника | `#pregled-korisnika` | 127 | Total registered users |

### Display Format

**Structure:**
```html
<span style="color: #666;">label:</span> <span id="element-id">value</span>
```

**Styling:**
- Labels in gray (`#666`)
- Values in default text color
- 5px margin between rows

### Implementation Status

**Current:** Static HTML content (hardcoded values)  
**Future:** Should be dynamically loaded via API

**Potential API Endpoint:**
```
GET /api/statistics/overview
Response: {
  "novosti": 15,
  "tema": 89,
  "stavki": 456,
  "dogadjaja": 67,
  "zapisa": 543,
  "primjedbi": 234,
  "korisnika": 127
}
```

---

## 4. Избор (Selection/Rankings) Section

### Purpose
Display user ranking categories based on contribution levels.

### Structure

**Toggle Element:** `#opste_izbor`  
**Content Container:** `#opste_izbor_sadrzaj`  
**Default State:** Collapsed

### Ranking Categories

**Three Levels:**

1. **Почетник (Beginner)**
   - ставки: `#izbor-stavki-1` (7)
   - догађаја: `#izbor-dogadjaja-1` (3)
   - записа: `#izbor-zapisa-1` (5)
   - примједби: `#izbor-primjedbi-1` (2)

2. **Напредни (Advanced)**
   - ставки: `#izbor-stavki-2` (12)
   - догађаја: `#izbor-dogadjaja-2` (5)
   - записа: `#izbor-zapisa-2` (8)
   - примједби: `#izbor-primjedbi-2` (4)

3. **Експерт (Expert)**
   - ставки: `#izbor-stavki-3` (20)
   - догађаја: `#izbor-dogadjaja-3` (10)
   - записа: `#izbor-zapisa-3` (15)
   - примједби: `#izbor-primjedbi-3` (7)

### Display Format

**Structure:**
```
{number}. {category_name} (ставки: X, догађаја: Y, записа: Z, примједби: W)
```

**Purpose:** Show contribution thresholds for each user level

### Implementation Status

**Current:** Static HTML content (hardcoded values)  
**Future:** Could be used for user gamification/badges

---

## 5. JavaScript Functionality

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
