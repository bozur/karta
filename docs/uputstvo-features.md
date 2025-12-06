# Uputstvo (Instructions) Tab - Feature Documentation

This document describes all features and behaviors of the "uputstvo" (instructions) tab for displaying user guide and help content.

**Last Updated:** 2025-12-06  
**Files:** `sections/uputstvo.html`, `sections/uputstvo.js`

---

## Overview

The uputstvo tab displays instructions and help content for using the application. Content is embedded directly within the HTML and organized into collapsible sections (accordion style) for better readability.

---

## 1. Tab Structure

### HTML Structure

**File:** `sections/uputstvo.html`

The content is organized into a Bootstrap accordion structure (`#uputstvo_accordion`).

```html
<!-- Main Container -->
<div id="uputstvo_accordion">

    <!-- Section Item -->
    <div id="uputstvo_teme">
        <strong>Title</strong> 
        <span class="bi bi-arrows-expand" data-toggle="collapse" data-target="#content_id"></span>
    </div>
    
    <!-- Collapsible Content -->
    <div id="content_id" class="collapse" data-parent="#uputstvo_accordion">
        <div>...Content...</div>
    </div>
    
    <!-- ... more sections ... -->

</div>
```

**Sections:**
1.  **Теме** (Themes)
2.  **Догађаји** (Events)
3.  **Записи** (Records)
4.  **Опште** (General)
5.  **Корисник** (User)
6.  **Подршка** (Support)
7.  **Контакт** (Contact)

### Initial State
- **Introduction:** visible at the top.
- **Sections:** All collapsed by default. Clicking a header expands that section and collapses others (accordion behavior).

---

## 2. Content Loading

### Static Content

The content is **static** and embedded directly in `uputstvo.html`.

**Previous Behavior (Deprecated):**
- Previously loaded dynamically from `uputstvo.txt`.
- This file and mechanism have been **removed**.

### JavaScript Functionality

**File:** `sections/uputstvo.js`

```javascript
function initUputstvoSection() {
    console.log('Uputstvo section initialized');
    // No dynamic loading logic required
}
```

The initialization function exists for consistency with the application's module loading system but performs no active content fetching.

---

## 3. Styling

### Accordion Styling

- **Headers:** Bold text (`<strong>`) with an expand icon (`.bi-arrows-expand`).
- **Icons:** Bootstrap Icons.
- **Behavior:** Standard Bootstrap collapse plugin.

---

## 4. Content Maintenance

### Editing Instructions

To update the instructions:
1.  Open `sections/uputstvo.html`.
2.  Locate the relevant section div (e.g., `#uputstvo_teme_sadrzaj`).
3.  Edit the text content directly within the HTML.
4.  **Note:** Ensure text remains within the inner `div` of the collapse container to ensure proper padding/margins.

### Adding New Sections

1.  Copy an existing section block (header `div` + content `div`).
2.  Update IDs to be unique (e.g., `#uputstvo_newsection` and `#uputstvo_newsection_sadrzaj`).
3.  Update `data-target` in the header to point to the new content ID.
4.  Keep `data-parent="#uputstvo_accordion"` to maintain accordion behavior.

---

## 5. Accessibility

- **Keyboard:** Standard HTML tab navigation.
- **Screen Readers:** Bootstrap collapse attributes (`aria-expanded`, etc.) should be managed by the Bootstrap JS library (ensure library version supports this or add manually if needed).
