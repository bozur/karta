# Podrska (Support) Tab - Feature Documentation

This document describes all features and behaviors of the "podrska" (support) tab for supporting the project (`карта.срб`) through data entry, document uploads, social media sharing, and financial contributions.

**Last Updated:** 2026-11-22  
**Files:** `sections/podrska.html`, `sections/podrska.js`, `karta.html`, `karta.js`, `server.js`, `database/create_podrska_uplate_tables.sql`

---

## Overview

The `podrska` tab uses an accordion-style layout matching the `opste` tab. The introductory paragraph is always visible, followed by four collapsible sections (`унос података`, `унос записа`, `друштвене мреже`, and `новчана подршка`).

---

## 1. Accordion Structure

- **Introductory paragraph**: Always visible below the `"Подршка"` title.
- **Collapsible sections** (all collapsed by default, toggled via Bootstrap 4 `data-toggle="collapse"` with `bi-arrows-expand` icon):
  1. `унос података` (`#podrska_unos_podataka_sadrzaj`)
  2. `унос записа` (`#podrska_unos_zapisa_sadrzaj`)
  3. `друштвене мреже` (`#podrska_drustvene_mreze_sadrzaj`)
  4. `новчана подршка` (`#podrska_novcana_sadrzaj`) — includes a live inline status badge (`#podrska_novcana_status`) right next to the expand icon showing current month progress (e.g., `3.200 РСД / 5.500 РСД (58%)`), colored orange when below technical costs and green when covered.

---

## 2. Social Media Sharing & Map Export (`друштвене мреже`)

Allows users to export the currently visible Leaflet map area directly in platform-ready formats, branded with **`карта.срб`** and the default slogan `"карта кроз векове, изнад митова и легенди"` (or a custom/active-theme caption via `#podrska_mreze_natpis`).

### Supported Export Formats
- **Facebook / Viber / WhatsApp**: `1200×630` PNG (`karta-srb-facebook-viber.png`)
- **Instagram Post**: `1080×1080` PNG (`karta-srb-instagram.png`)
- **Story / TikTok**: `1080×1920` (9:16) PNG (`karta-srb-story-tiktok.png`)
- **TikTok / Reels Video**: `720×1280` (9:16) 10-second silent Ken Burns zoom + pan animation (`MediaRecorder` + `canvas.captureStream(30)`), ready for users to add background music inside TikTok/Instagram.

### Map Rendering Requirements
- All four Mapbox tile layers in `karta.js` use `crossOrigin: 'anonymous'` so map tiles, SVG overlays, marker icons, and marker clusters can be composited cleanly onto an HTML5 Canvas.
- When the right-side panel (`#section-content`) is open on desktop, cropping automatically centers on the visible portion of the map to the left of the panel.

### Quick Share Buttons
- **Viber**, **WhatsApp**, **Facebook**, and **Подели / Копирај** (uses native `navigator.share` on supported devices, with clipboard fallback).

---

## 3. Financial Support (`новчана подршка`)

### Payment Tabs (`#podrska_placanje_blok`)

1. **Динарске уплате** (default tab)
   - **Desktop**: Dynamically generates a **National Bank of Serbia (NBS) IPS QR code** (`qrcode-generator` loaded in `karta.html`) using Latin ASCII text (`Bozur Vujicic`, `podrska za razvoj karta.srb`, payment code `289`, and 18-digit account auto-formatted from `racunPrikaz`). Because NBS IPS `K:PR` requires an amount (`I:`), the QR code is blurred with a prompt until the user enters an amount or clicks one of the quick-pick chips (`500`, `1.000`, `2.000`, `5.000`), plus a toggle link to view manual payment details.
   - **Mobile**: Automatically displays formatted payment slip details with one-tap Copy buttons (copying Latin text without diacritics for banking app compatibility) and an inline amount input next to **"Преузми IPS QR код"** for m-banking gallery import, plus a toggle to view the QR code directly.

2. **Девизне уплате**
   - **Primary**: **Ko-fi** button (`https://ko-fi.com/kartasrb`) with inline Ko-fi SVG icon, recommended for donations up to ~400 € (card / PayPal, lowest fees).
   - **Secondary (collapsible)**: Direct international bank transfer (**IBAN / SWIFT**) recommended for amounts over 400 €, with one-tap Copy buttons for Beneficiary, IBAN, SWIFT/BIC, and Reference.

### Configuration
All payment details are centralized in `PODRSKA_CONFIG` at the top of `sections/podrska.js`:
- Domestic: `primalac`, `primalacLatinica`, `racunPrikaz`, `sifraPlacanja`, `svrhaPrikaz`, `svrhaLatinica`
- International (`inostranstvo`): `kofiUrl`, `primalac`, `iban`, `swift`, `banka`, `svrha`

---

## 4. 12-Month Transparency Chart

- Fetches live data from `GET /api/podrska/uplate` (with local fallback if unavailable).
- Displays a legend (`покривени трошкови`, `испод трошкова`, `технички мјесечни трошкови: ... (хостинг+база+домен)`) and the note: *"Уплате мање од 1.000 РСД ће бити приказане збирно на крају месеца."*
- Renders **12 stacked horizontal bars** for the past 12 months (current month highlighted at the top), scaled from `0 РСД` to `max(monthlyTechnicalCosts, maxMonthlyIncome)`, with a vertical dashed red reference line indicating monthly technical costs.

---

## 5. Database Tables & API Endpoints

### PostgreSQL Tables
Auto-created on first request by `ensurePodrskaTables(pool)` in `server.js` (SQL also saved in `database/create_podrska_uplate_tables.sql`):
- `podrska_podesavanja (kljuc VARCHAR(100) PRIMARY KEY, vrednost VARCHAR(255), azurirano TIMESTAMP)` — stores `mesecni_troskovi` (default `'5500'`).
- `uplate_mesecne (godina INTEGER, mesec INTEGER, iznos INTEGER, azurirano TIMESTAMP, PRIMARY KEY (godina, mesec))` — stores monthly donation totals in RSD.

### API Endpoints (`server.js`)
- `GET /api/podrska/uplate` — Public endpoint returning `{ success, mesecniTroskovi, meseci }` for the past 12 months.
- `POST /api/urednik/uplate` — Editor-only endpoint (managed from `Уредник → уплате`) to update `mesecniTroskovi` and monthly RSD totals.

---

## Version History

| Date | Changes | Modified By |
|------|---------|-------------|
| 2025-12-04 | Initial documentation created | AI Assistant |
| 2026-11-22 | Documented accordion layout, NBS IPS QR & Ko-fi/SWIFT payment tabs, 12-month chart, DB/API, and social media map image/video export | AI Assistant |
