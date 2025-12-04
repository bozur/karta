# Uputstvo (Instructions) Tab - Feature Documentation

This document describes all features and behaviors of the "uputstvo" (instructions) tab for displaying user guide and help content.

**Last Updated:** 2025-12-04  
**Files:** `sections/uputstvo.html`, `sections/uputstvo.js`, `uputstvo.txt`

---

## Overview

The uputstvo tab displays instructions and help content for using the application. Content is loaded from an external text file and displayed in a simple, readable format.

---

## 1. Tab Structure

### HTML Structure

**File:** `uputstvo.html`

```html
<!-- Uputstvo content will be loaded from uputstvo.txt -->
<div id="uputstvo_content"></div>
```

**Content Container:** `#uputstvo_content`  
**Initial State:** Empty (populated by JavaScript)

---

## 2. Content Loading

### Source File

**File:** `uputstvo.txt`  
**Location:** Root directory  
**Format:** Plain text or HTML

### Loading Mechanism

**Function:** jQuery `.load()`  
**Trigger:** Section initialization  
**Target:** `#uputstvo_content`

**Code:**
```javascript
$("#uputstvo_content").load("uputstvo.txt");
```

### Loading Behavior

**On First Load:**
- `initUputstvoSection()` called
- Content loaded from `uputstvo.txt`
- Displayed in `#uputstvo_content`

**On Subsequent Loads:**
- `initUputstvoSection()` called again
- Content reloaded (fresh copy)
- Previous content replaced

---

## 3. JavaScript Functionality

### File: `uputstvo.js`

**Implementation:**
```javascript
function initUputstvoSection() {
    console.log('Uputstvo section initialized');
    $("#uputstvo_content").load("uputstvo.txt");
}

$(document).ready(function () {
    initUputstvoSection();
});
```

### Initialization Function

**Function:** `initUputstvoSection()`  
**Purpose:** Load instructions content  
**Called By:**
- `$(document).ready()` on first load
- Section reload mechanism on subsequent loads

---

## 4. Content File (uputstvo.txt)

### Current Content

The file contains comprehensive instructions in Serbian covering:

1. **Introduction**
   - Purpose of the application
   - Target audience
   - Main features overview

2. **Navigation**
   - Tab descriptions
   - Icon meanings
   - How to switch between sections

3. **Map Usage**
   - Zoom controls
   - Pan/drag
   - Marker interactions
   - Layer toggle

4. **Search Features**
   - Theme selection
   - Filter usage
   - Result interpretation

5. **Data Entry**
   - Adding events
   - Uploading files
   - Form requirements

6. **User Account**
   - Profile management
   - Password changes
   - Statistics viewing

### Content Format

**Language:** Serbian (Cyrillic)  
**Style:** Informative, user-friendly  
**Structure:** Sections with headings  
**Length:** Approximately 6,673 bytes (current)

### Recommended Structure

```html
<h3>Добродошли</h3>
<p>Introduction text...</p>

<h3>Навигација</h3>
<ul>
  <li><strong>Теме:</strong> Description...</li>
  <li><strong>Догађаји:</strong> Description...</li>
  ...
</ul>

<h3>Коришћење карте</h3>
<p>Map instructions...</p>

<h3>Претрага</h3>
<p>Search instructions...</p>

<h3>Унос података</h3>
<p>Data entry instructions...</p>
```

---

## 5. Styling

### Default Styling

**Container:** `#uputstvo_content`  
**Inherited From:** Parent panel styles  
**No Custom CSS:** Uses default Bootstrap/custom.css styles

### Content Styling

**Headings:** Standard `<h3>`, `<h4>` tags  
**Paragraphs:** Standard `<p>` tags  
**Lists:** `<ul>`, `<ol>` for organized content  
**Emphasis:** `<strong>`, `<em>` for important points

---

## 6. Future Enhancements

### Recommended Improvements

1. **Interactive Tutorials**
   - Step-by-step walkthroughs
   - Highlight relevant UI elements
   - Progress tracking

2. **Video Tutorials**
   - Embed video demonstrations
   - Screen recordings of features
   - Narrated explanations

3. **Searchable Help**
   - Search box for finding topics
   - Table of contents with anchors
   - Keyword highlighting

4. **Contextual Help**
   - Help icons next to features
   - Tooltips with quick tips
   - "Learn more" links to detailed help

5. **Multi-Language Support**
   - Latin script version
   - English translation
   - Language toggle

6. **FAQ Section**
   - Common questions
   - Troubleshooting guide
   - Quick answers

7. **Dynamic Content**
   - Load from database
   - Admin-editable content
   - Version control for updates

---

## 7. Content Guidelines

### Writing Style

**Tone:** Friendly and helpful  
**Language:** Clear, simple Serbian  
**Audience:** Non-technical users

**Best Practices:**
- Use short sentences
- Explain technical terms
- Provide examples
- Include screenshots (if possible)
- Step-by-step instructions
- Highlight important warnings

### Structure

**Organization:**
- Logical flow (basic → advanced)
- Clear section headings
- Numbered steps for procedures
- Bullet points for lists
- Visual hierarchy

### Maintenance

**Updates:**
- Review after feature changes
- Keep synchronized with UI
- Test all instructions
- Update screenshots
- Version tracking

---

## 8. Error Handling

### Loading Errors

**Current:** No error handling  
**Issue:** If `uputstvo.txt` fails to load, content area remains empty

**Recommended:**
```javascript
function initUputstvoSection() {
    console.log('Uputstvo section initialized');
    
    $("#uputstvo_content").load("uputstvo.txt", function(response, status, xhr) {
        if (status === "error") {
            $("#uputstvo_content").html(
                '<p style="color: orange;">Грешка при учитавању упутства. ' +
                'Молимо покушајте поново касније.</p>'
            );
        }
    });
}
```

---

## 9. Accessibility

### Current State

**Screen Readers:** Content is readable  
**Keyboard Navigation:** Standard HTML navigation  
**Contrast:** Depends on content styling

### Improvements

**Recommendations:**
- Add ARIA labels where needed
- Ensure proper heading hierarchy
- Provide alt text for images
- Ensure sufficient color contrast
- Support keyboard-only navigation

---

## 10. Performance

### Loading

**Current:** Synchronous load via jQuery  
**Size:** ~6.7 KB (small, fast)  
**Caching:** Browser caches `uputstvo.txt`

### Optimization

**Not Critical:** File is small  
**If Needed:**
- Minify HTML in `uputstvo.txt`
- Enable gzip compression
- Use CDN for large media
- Lazy load images/videos

---

## 11. Database Integration (Optional)

### If Moving to Database

**Table Schema:**
```sql
CREATE TABLE uputstvo_sadrzaj (
    id INT IDENTITY(1,1) PRIMARY KEY,
    sekcija NVARCHAR(100) NOT NULL,
    naslov NVARCHAR(255) NOT NULL,
    sadrzaj NVARCHAR(MAX) NOT NULL,
    redosled INT NOT NULL,
    aktivan BIT DEFAULT 1,
    azurirano DATETIME2 DEFAULT GETDATE()
);

CREATE INDEX idx_uputstvo_redosled ON uputstvo_sadrzaj(redosled);
```

**API Endpoint:**
```
GET /api/uputstvo
Response: {
  "success": true,
  "sekcije": [
    {
      "sekcija": "uvod",
      "naslov": "Добродошли",
      "sadrzaj": "<p>...</p>"
    }
  ]
}
```

---

## 12. Critical Behaviors Summary

### ✅ DO:
- Load content on every section open (fresh copy)
- Use clear, simple language
- Organize content logically
- Keep instructions up-to-date
- Test all procedures described
- Provide visual aids when possible

### ❌ DON'T:
- Don't assume technical knowledge
- Don't use jargon without explanation
- Don't skip error handling
- Don't forget to update after UI changes
- Don't make instructions too verbose
- Don't ignore accessibility

---

## 13. Content Maintenance Checklist

### When Adding New Features

- [ ] Update uputstvo.txt with new feature description
- [ ] Add step-by-step instructions
- [ ] Include screenshots if helpful
- [ ] Test instructions with real users
- [ ] Update table of contents (if exists)

### Regular Reviews

- [ ] Check for outdated information
- [ ] Verify all links work
- [ ] Test all procedures
- [ ] Update screenshots
- [ ] Check for typos/grammar
- [ ] Ensure consistency with UI

---

## Version History

| Date | Changes | Modified By |
|------|---------|-------------|
| 2025-12-04 | Initial documentation created | AI Assistant |
