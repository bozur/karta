# Zapisi (Records/Documents) Tab - Feature Documentation

This document describes all features and behaviors of the "zapisi" (records/documents) tab for file uploads and management.

**Last Updated:** 2025-12-31  
**Files:** `sections/zapisi.html`, `sections/zapisi.js`, `database/postgresql_schema.sql`

---

## Overview

The zapisi tab allows approved users to upload PDF and image files (JPG, PNG) with metadata, search for existing records, and download files. The system includes comprehensive security features including rate limiting, file validation, and virus scanning.

---

## 1. Database Schema

### Table: `zapisi`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, IDENTITY(1,1) | Unique record identifier |
| `naziv` | NVARCHAR(255) | NOT NULL | File/record name |
| `opis` | NVARCHAR(MAX) | NULL | Description of the file/record |
| `tema_id` | INT | NOT NULL, FK → `teme.id` | Theme/category ID (foreign key) |
| `korisnik_id` | INT | NOT NULL, FK → `korisnik.id` | User ID who uploaded (foreign key) |
| `tagovi` | NVARCHAR(MAX) | NULL | Comma-separated tags |
| `file_path` | VARCHAR(500) | NOT NULL | Server path to uploaded file |
| `file_type` | VARCHAR(10) | NOT NULL | File extension (pdf, jpg, png) |
| `file_size` | INTEGER | NULL | File size in bytes |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Upload timestamp |
| `stanje` | VARCHAR(2) | DEFAULT '0' | Approval status: '0' = pending, '1' = approved |

### Indexes:
- `idx_naziv` on `naziv`
- `idx_tema` on `tema_id`
- `idx_korisnik` on `korisnik_id`
- `idx_created` on `created_at`

### Related Tables:
- **`teme`**: Stores theme/category names
  - `id` INT PRIMARY KEY
  - `naziv` NVARCHAR(50) UNIQUE
- **`korisnik`**: User table with `moze_ucitati` permission flag

---

## 2. File Upload (унос)

### Form Fields

| Field | ID | Type | Required | Validation |
|-------|-----|------|----------|------------|
| Корисник | `unos_korisnik` | Hidden | Yes | Auto-populated from session |
| Назив | `unos_naziv` | Text | Yes | Must not be empty |
| Тема | `unos_tema` | Dropdown | Yes | Must select valid theme from `teme` table |
| Опис | `unos_opis` | Textarea | Yes | Must not be empty |
| Тагови | `unos_tagovi` | Text | Yes | Must not be empty |
| Запис | `unos_file` | File | Yes | PDF, JPG, or PNG only |

### Security Features

#### 1. Authentication
- User must be logged in (`req.session.user`)
- Error: "Морате бити пријављени"

#### 2. Upload Permission
- Checks `korisnik.moze_ucitati` flag
- Only users with `moze_ucitati = 1` can upload
- Error: "Немате дозволу за учитавање записа!"

#### 3. Rate Limiting
- **Limit:** 5 uploads per day per user
- **Window:** 24 hours (86400000ms)
- **Implementation:** `express-rate-limit` with `uploadLimiter`
- **Error:** "Превише захтјева, покушајте поново касније"

#### 4. File Type Validation (Client-Side)
- **Allowed MIME types:** `application/pdf`, `image/jpeg`, `image/jpg`, `image/png`
- **Allowed extensions:** `.pdf`, `.jpg`, `.jpeg`, `.png`
- **Error:** "Дозвољене врсте записа су: PDF, JPG, PNG"

#### 5. File Content Validation (Server-Side)
- Uses `file-type` library to verify actual file content
- Checks magic numbers, not just extension
- **Allowed MIME types:** `application/pdf`, `image/jpeg`, `image/png`
- **Error:** "Дозвољене врсте записа су: PDF, JPG, PNG"
- **Purpose:** Prevents malicious files with fake extensions

#### 6. Virus Scanning
- Uses ClamAV (`clamscan` library) if available
- Scans file before database insertion
- **If infected:**
  - File deleted immediately
  - Upload rejected
  - Error: "Фајл садржи вирус и није могао бити учитан"
  - Virus names logged to console
- **If scanner unavailable:** Upload proceeds (scan error logged)

### Upload Process Flow

```
1. User submits form
2. Client-side validation (required fields, file type)
3. Server receives upload via multer
4. Authentication check → reject if not logged in
5. Permission check (moze_ucitati) → reject if not approved
6. Rate limit check → reject if exceeded
7. Required fields validation → reject if missing
8. Theme ID validation → reject if invalid
9. File content validation → reject if wrong type
10. Virus scan → reject if infected
11. Save to database
12. Return success
```

### Error Display

- **Location:** `#unos_error` div
- **Color:** Orange (errors), Green (success)
- **Behavior:**
  - Invalid fields get red border
  - First validation error shown
  - Success message varies based on approval status

### Success Messages

**Conditional based on `moze_ucitati`:**
- If user has `moze_ucitati = 1`: "подаци су учитани" (green) - Auto-approved
- If user has `moze_ucitati = 0`: "запис је учитан" (green) - Pending approval

**Message duration:** 3 seconds

### Approval Workflow

**Conditional Insertion:**
- If user has `moze_ucitati = 1`: Insert with `stanje = '1'` (auto-approved)
- If user has `moze_ucitati = 0`: Insert with `stanje = '0'` (pending approval)

**Visibility:**
- Only records with `stanje = '1'` appear in search results
- Pending records reviewed in urednik tab

### File Storage

- **Directory:** `uploads/`
- **Filename:** Generated by multer (timestamp + random string)
- **Path stored in DB:** Full server path (`file_path` column)

---

## 3. Search Functionality (тражи)

### Search Fields

| Field | ID | Type | Search Type |
|-------|-----|------|-------------|
| Назив | `trazi_naziv` | Text | LIKE `%naziv%` |
| Тема | `trazi_tema` | Dropdown | Exact match on `tema_id` |
| Корисник | `trazi_korisnik` | Text | LIKE `%korisnik%` |
| Опис | `trazi_opis` | Text | LIKE `%opis%` |
| Тагови | `trazi_tagovi` | Text | LIKE `%tagovi%` |

### Search Behavior

- **API Endpoint:** `/api/zapisi/search`
- **Method:** POST
- **All fields optional** - empty search returns all records
- **Multiple criteria:** Combined with AND
- **Sort order:** `created_at DESC` (newest first)
- **Loading indicator:** `#trazi_cekanje` spinner
- **Error display:** `#trazi_error` div

### Results Display

**Container:** `#zapisi_results`  
**Table Body:** `#zapisi_results_body`

#### Result Row Format:

| Column | Width | Content |
|--------|-------|---------|
| ID | 60px | Record ID |
| Назив | 200px | **Clickable link** (darkorange color) |
| Опис | Auto | Description |

#### Link Functionality:

**Naziv as Download Link:**
- Class: `zapis-link`
- Color: `darkorange`
- Hover: Underline, darkorange
- Click: Triggers `viewZapis(id)` → downloads file
- **Only naziv triggers download**, not the entire row

**CSS:**
```css
.zapis-link {
    color: darkorange;
    text-decoration: none;
    cursor: pointer;
}
.zapis-link:hover {
    text-decoration: underline;
    color: darkorange;
}
```

#### Row Behavior:
- **Hover:** Light gray background (entire row)
- **Click naziv:** Downloads file
- **Click elsewhere:** No action

#### Empty Results:
- Message: "Нема резултата."
- Centered, gray text
- Spans all 3 columns

### Search Query Structure

```sql
SELECT z.id, z.naziv, z.opis, t.naziv AS tema, k.korisnik, 
       z.tagovi, z.file_type, z.file_size, z.created_at
FROM zapisi z
INNER JOIN teme t ON z.tema_id = t.id
INNER JOIN korisnik k ON z.korisnik_id = k.id
WHERE [conditions]
ORDER BY z.created_at DESC
```

---

## 4. File Download

### Download Function

**Function:** `viewZapis(id)`  
**Behavior:** Opens file in new tab/window

### API Endpoint

- **Endpoint:** `/api/zapisi/:id`
- **Method:** GET
- **Parameter:** Record ID
- **Response:** File download with original name + extension

### Download Process

1. Fetch record from database by ID
2. Check if record exists → 404 if not found
3. Check if file exists on disk → 404 if missing
4. Send file with `res.download()`
5. Filename: `{naziv}.{file_type}`

### Error Messages

| Scenario | HTTP Status | Message |
|----------|-------------|---------|
| Record not found | 404 | "Запис није пронађен" |
| File not found on disk | 404 | "Фајл није пронађен" |
| Server error | 500 | "Грешка при преузимању фајла" |

---

## 5. Theme Management

### Theme Loading

**Function:** `loadThemes()`  
**Trigger:** On section initialization

### API Endpoint

- **Endpoint:** `/api/v2/themes`
- **Method:** GET
- **Response:**
  ```json
  {
    "themes": [
      {"id": 1, "naziv": "Theme Name"},
      ...
    ]
  }
  ```

### Dropdown Population

- **Insert dropdown:** `#unos_tema`
- **Search dropdown:** `#trazi_tema`
- **First option:** Placeholder (empty value)
- **Subsequent options:** Populated from API
- **Sort order:** By theme ID

---

## 6. API Endpoints Summary

### POST /api/zapisi/upload

**Middleware:** `uploadLimiter`, `upload.single('file')`

**Request:** `multipart/form-data`
- `naziv` (string, required)
- `opis` (string, required)
- `tema_id` (int, required)
- `tagovi` (string, required)
- `file` (file, required)

**Response (Success):**
```json
{
  "success": true,
  "message": "Фајл је успјешно додат",
  "id": 123
}
```

**Response (Error):**
```json
{
  "error": "Error message in Serbian"
}
```

### POST /api/zapisi/search

**Request:** `application/json`
```json
{
  "naziv": "search term",
  "tema_id": 1,
  "korisnik": "username",
  "opis": "description",
  "tagovi": "tags"
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": 1,
      "naziv": "Record Name",
      "opis": "Description",
      "tema": "Theme Name",
      "korisnik": "username",
      "tagovi": "tag1, tag2",
      "file_type": "pdf",
      "file_size": 12345,
      "created_at": "2025-12-04T10:00:00.000Z"
    }
  ]
}
```

### GET /api/zapisi/:id

**Response:** File download (binary)

---

## 7. Initialization

### On Document Ready:
- Call `initializeZapisi()`

### On Section Load:
- If already loaded, calls `window.initZapisiSection()`

### Initialization Steps:
1. Populate username from session storage
2. Load themes from API
3. Attach file input change handler (update label)
4. Attach form submit handlers

---

## 8. Critical Behaviors Summary

### ✅ DO:
- Validate file content (magic numbers), not just extension
- Check user permission (`moze_ucitati`) before upload
- Scan files for viruses if ClamAV available
- Delete uploaded file if any validation fails
- Enforce rate limiting (5 uploads/day)
- Validate theme_id exists in database
- Show success message for 3 seconds then hide

### ❌ DON'T:
- Don't trust client-side file type validation alone
- Don't allow uploads without authentication
- Don't allow uploads from unapproved users
- Don't skip virus scanning if available
- Don't leave orphaned files on disk after validation failure
- Don't use JS `alert()` for errors (use inline error div)

---

## 9. Error Messages Reference

| Scenario | Message | Display Location |
|----------|---------|------------------|
| Not logged in | "Морате бити пријављени" | HTTP 401 |
| No upload permission | "Немате дозволу за учитавање записа!" | `#unos_error` |
| Rate limit exceeded | "Превише захтјева, покушајте поново касније" | HTTP 429 |
| Empty naziv | "попуните поље (назив)" | `#unos_error` |
| No theme selected | "изаберите (тема)" | `#unos_error` |
| Empty opis | "попуните поље (опис)" | `#unos_error` |
| Empty tagovi | "попуните поље (тагови)" | `#unos_error` |
| No file selected | "запис није изабран" | `#unos_error` |
| Invalid file type | "Дозвољене врсте записа су: PDF, JPG, PNG" | `#unos_error` |
| Invalid theme ID | "Неисправна тема" | `#unos_error` |
| Virus detected | "Фајл садржи вирус и није могао бити учитан" | `#unos_error` |
| Upload success | "запис је учитан" | `#unos_error` (green) |
| Upload error | "Грешка при додавању фајла" | `#unos_error` |
| Search error | "Грешка при претрази" | `#trazi_error` |
| Server error | "Грешка при комуникацији са сервером" | Respective error div |

---

## 10. Dependencies

### Server-Side:
- `multer` - File upload handling
- `express-rate-limit` - Rate limiting
- `file-type` - File content validation
- `clamscan` - Virus scanning (optional)
- `mssql` - Database connection

### Client-Side:
- jQuery - DOM manipulation and AJAX
- Bootstrap - Form styling and components

---

## Version History

| Date | Changes | Modified By |
|------|---------|-------------|
| 2025-12-04 | Initial documentation created | AI Assistant |
| 2025-12-31 | Added stanje column for approval workflow, link functionality (naziv as clickable download link with darkorange styling), conditional insertion logic based on moze_ucitati, updated database schema to PostgreSQL | AI Assistant |
