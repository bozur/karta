# Korisnik (User Profile) Tab - Feature Documentation

This document describes all features and behaviors of the "korisnik" (user profile) tab for viewing and editing user information.

**Last Updated:** 2025-12-04  
**Files:** `sections/korisnik.html`, `sections/korisnik.js`

---

## Overview

The korisnik tab allows logged-in users to view their profile statistics and edit their personal information including name, email, profile picture URL, and password. The system includes comprehensive validation, password strength requirements, and real-time error feedback.

---

## 1. Database Schema

### Table: `korisnik`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, IDENTITY(1,1) | Unique user identifier |
| `ime` | NVARCHAR(20) | NULL | First name (4-20 chars) |
| `prezime` | NVARCHAR(20) | NULL | Last name (4-20 chars) |
| `korisnik` | NVARCHAR(20) | NULL | Username (4-20 chars) |
| `eposta` | NVARCHAR(50) | NOT NULL, UNIQUE | Email address (7-50 chars) |
| `lozinka` | NVARCHAR(255) | NOT NULL | Bcrypt hashed password |
| `slika_url` | NVARCHAR(255) | NULL | Profile picture URL (min 5 chars) |
| `pristup0` | DATETIME2 | NULL | First login timestamp |
| `pristup1` | DATETIME2 | NULL | Last login timestamp |
| `brojac_pristupa` | INT | DEFAULT 0 | Total login count |
| `moze_ucitati` | BIT | DEFAULT 0 | Upload permission flag |

---

## 2. User Information Display

### Title Display

**Element:** `#user-display`  
**Priority:** Username > Email > "Корисник"  
**Format:** Plain text next to "Корисник" title

### Statistics Panel ("Преглед")

**Container:** Gray background box with rounded corners

| Field | Element ID | Format | Source |
|-------|-----------|--------|--------|
| Прва посјета | `#first-visit` | DD.MM.YYYY HH:MM | `pristup0` |
| Посљедња посјета | `#last-visit` | DD.MM.YYYY HH:MM | `pristup1` |
| Број пријава | `#login-count` | Integer | `brojac_pristupa` |
| Ставки | `#items-count` | Integer | (Placeholder - not implemented) |
| Записа | `#records-count` | Integer | (Placeholder - not implemented) |
| Примједби | `#comments-count` | Integer | (Placeholder - not implemented) |

### Activity Panel ("Од посљедње посјете")

**Container:** Gray background box with rounded corners

| Field | Element ID | Description |
|-------|-----------|-------------|
| Новости | `#news-since-last` | (Placeholder - not implemented) |
| Тема | `#topics-since-last` | (Placeholder - not implemented) |
| Ставки | `#items-since-last` | (Placeholder - not implemented) |
| Записа | `#records-since-last` | (Placeholder - not implemented) |
| Примједби | `#comments-since-last` | (Placeholder - not implemented) |

**Note:** Activity tracking fields are UI placeholders for future implementation.

---

## 3. Edit Profile Form

### Collapsible Section

**Toggle Element:** `#korisnik_izmjeni`  
**Label:** "измјени" with expand icon  
**Content:** `#korisnik_izmjeni_podaci` (Bootstrap collapse)

### Form Fields

| Field | ID | Type | Required | Validation |
|-------|-----|------|----------|------------|
| Име | `edit_ime` | Text | No | 4-20 chars (if provided) |
| Презиме | `edit_prezime` | Text | No | 4-20 chars (if provided) |
| Корисник | `edit_korisnik` | Text | No | 4-20 chars (if provided) |
| Е-пошта | `edit_eposta` | Email | **Yes** | 7-50 chars, valid email format |
| Слика УРЛ | `edit_slika_url` | Text | No | Min 5 chars (if provided) |
| Лозинка | `edit_lozinka` | Password | **Yes** | Current password for verification |
| Нова лозинка | `edit_nova_lozinka` | Password | No | 7-50 chars, strength requirements |
| Поново нова лозинка | `edit_potvrdi_lozinka` | Password | No | Must match nova_lozinka |

### Password Visibility Toggle

**Icons:** Bootstrap Icons `bi-eye` / `bi-eye-slash`  
**Behavior:** Click to toggle between password/text input type

**Toggle Elements:**
- `#toggle_lozinka` - Current password
- `#toggle_nova_lozinka` - New password
- `#toggle_potvrdi_lozinka` - Confirm new password

---

## 4. Validation Rules

### Email Validation

**Regex:** `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

**Trigger:** On blur and on form submit  
**Error Message:** "неисправна е-пошта"  
**Visual:** Red border on field

### Password Strength Requirements

**Function:** `validatePasswordStrength(password)`

**Requirements:**
- Minimum 7 characters
- Maximum 50 characters
- At least one number (0-9)
- At least one capital letter (A-Z)
- At least one special character: `!@#$%^&*()_+-=[]{}`;':"\\|,.<>/?`

**Error Message:** "лозинка је преслаба (мин. 7 карактера, број, велико слово, специјални карактер)"

### Password Confirmation

**Validation:** `nova_lozinka` must equal `potvrdi_lozinka`

**Trigger:** On blur of confirm field and on form submit  
**Error Message:** "нова лозинка мора да буде иста у оба поља"  
**Visual:** Red border on both password fields

### Required Fields

**Mandatory:**
- `eposta` - Email address
- `lozinka` - Current password (for verification)

**Error Messages:**
- Both missing: "лозинка/е-пошта су обавезни"
- Email missing: "е-пошта је обавезно поље"
- Password missing: "лозинка је обавезно поље"

---

## 5. Form Submission

### API Endpoint

**Endpoint:** `/api/user/update`  
**Method:** PUT  
**Content-Type:** `application/json`

### Request Payload

```json
{
  "ime": "First Name",
  "prezime": "Last Name",
  "korisnik": "username",
  "eposta": "email@example.com",
  "slika_url": "https://example.com/image.jpg",
  "lozinka": "current_password",
  "nova_lozinka": "new_password"
}
```

**Note:** `null` sent for empty optional fields

### Server-Side Validation

1. **Authentication check** - User must be logged in
2. **Current password verification** - Bcrypt compare
3. **Email format validation** - Regex check
4. **Email uniqueness check** - Must not be used by another user
5. **New password hashing** - Bcrypt with salt rounds = 10

### Response Handling

**Success (200):**
```json
{
  "success": true,
  "message": "Подаци су успјешно ажурирани"
}
```

**Actions:**
- Show success message (green, 3 seconds)
- Clear password fields
- Reload user info from server
- Update cached data in `window.korisnikUserData`
- Update session data if email/username changed

**Error (400/401/409/500):**
```json
{
  "error": "Error message in Serbian"
}
```

**Actions:**
- Show error message in `#form_error` div
- Keep form data intact
- Re-enable submit button

---

## 6. Error Display

### Error Element

**ID:** `#form_error`  
**Default Color:** Orange  
**Success Color:** Green  
**Display:** Hidden by default, shown on validation errors

### Field Error Styling

**Visual:** Red border on invalid fields  
**Clearing:** Automatically cleared on input/blur

### Real-Time Validation

**Email:**
- Validated on blur
- Error cleared on input

**Password Confirmation:**
- Validated on blur of confirm field
- Error cleared on input of either password field

---

## 7. Data Persistence

### Global Cache

**Variable:** `window.korisnikUserData`  
**Purpose:** Persist user data across tab switches  
**Scope:** Window-level (survives section navigation)

### Cache Behavior

**On first load:**
- Fetch from `/api/user-info`
- Store in `window.korisnikUserData`
- Populate display and form

**On subsequent loads:**
- Check if cache exists
- Use cached data if available
- Skip API call for faster display

**On successful update:**
- Refresh cache from server
- Update display with new data

---

## 8. API Endpoints

### GET /api/user-info

**Authentication:** Required (session-based)

**Response:**
```json
{
  "user": {
    "id": 1,
    "ime": "First",
    "prezime": "Last",
    "username": "user123",
    "email": "user@example.com",
    "slika_url": "https://example.com/pic.jpg",
    "pristup0": "2025-01-01T10:00:00.000Z",
    "pristup1": "2025-12-04T12:00:00.000Z",
    "brojac_pristupa": 42
  }
}
```

**Errors:**
- 401: Not authenticated
- 404: User not found
- 500: Internal server error

### PUT /api/user/update

**Authentication:** Required (session-based)

**Request:** See section 5

**Response:** See section 5

**Errors:**
- 400: Validation error (missing fields, invalid format)
- 401: Invalid current password
- 409: Email already in use by another user
- 500: Internal server error

---

## 9. Initialization

### On Document Ready:
- Call `initKorisnikSection()`

### On Section Load (if already loaded):
- Calls `initKorisnikSection()` via section reload

### Initialization Steps:
1. Check for cached user data in `window.korisnikUserData`
2. If cached: Restore display from cache
3. If not cached: Fetch from `/api/user-info`
4. Populate form fields with user data
5. Attach event handlers:
   - Password visibility toggles
   - Email validation (blur/input)
   - Password confirmation validation (blur/input)
   - Form submission

---

## 10. Date/Time Formatting

**Function:** `formatDate(dateString)`

**Input:** ISO 8601 datetime string  
**Output:** `DD.MM.YYYY HH:MM`  
**Example:** `04.12.2025 15:30`

**Fallback:** Returns `-` if date is null/undefined

---

## 11. Critical Behaviors Summary

### ✅ DO:
- Require current password for any profile update
- Validate email format on both client and server
- Enforce password strength requirements for new passwords
- Hash passwords with bcrypt before storing
- Clear password fields after successful update
- Show success message for 3 seconds then hide
- Cache user data for faster subsequent loads
- Update session if email/username changes
- Prioritize username over email in display

### ❌ DON'T:
- Don't allow updates without current password verification
- Don't accept weak passwords (enforce strength rules)
- Don't allow duplicate email addresses
- Don't show passwords in plain text by default
- Don't lose form data on validation errors
- Don't submit form if validation fails
- Don't forget to re-enable submit button after error
- Don't trust client-side validation alone (validate on server)

---

## 12. Error Messages Reference

| Scenario | Message | Display Location |
|----------|---------|------------------|
| Email and password missing | "лозинка/е-пошта су обавезни" | `#form_error` |
| Email missing | "е-пошта је обавезно поље" | `#form_error` |
| Password missing | "лозинка је обавезно поље" | `#form_error` |
| Invalid email format | "неисправна е-пошта" | `#form_error` |
| Passwords don't match | "нова лозинка мора да буде иста у оба поља" | `#form_error` |
| Weak password | "лозинка је преслаба (мин. 7 карактера, број, велико слово, специјални карактер)" | `#form_error` |
| Update success | "Подаци су успјешно ажурирани" | `#form_error` (green) |
| Wrong current password | "Неисправна лозинка" | `#form_error` |
| Email already exists | "Е-пошта је већ у употреби" | `#form_error` |
| Server error | "Грешка при ажурирању података" | `#form_error` |
| Not authenticated | "Not authenticated" | HTTP 401 |
| User not found | "User not found" | HTTP 404 |

---

## 13. Security Features

### Password Hashing
- **Algorithm:** Bcrypt
- **Salt Rounds:** 10
- **Storage:** Hashed password only (never plain text)

### Authentication
- **Method:** Session-based (`req.session.user`)
- **Verification:** Current password required for updates
- **Session Update:** Email/username changes reflected in session

### Input Validation
- **Client-side:** Real-time validation with visual feedback
- **Server-side:** Comprehensive validation before database update
- **SQL Injection:** Protected by parameterized queries (`mssql` library)

### Email Uniqueness
- **Check:** Query database for existing email (excluding current user)
- **Error:** 409 Conflict if email already in use

---

## 14. UI/UX Features

### Collapsible Form
- **Default State:** Collapsed (hidden)
- **Toggle:** Click "измјени" to expand/collapse
- **Icon:** `bi-arrows-expand` (Bootstrap Icons)

### Password Visibility
- **Icons:** Eye (hidden) / Eye-slash (visible)
- **Toggle:** Click icon to show/hide password
- **Fields:** All three password fields independently toggleable

### Loading Indicator
- **Element:** `#form_izmjeni_cekanje` spinner
- **Visibility:** Hidden by default, shown during submission
- **Button State:** Disabled during submission

### Error Feedback
- **Visual:** Red borders on invalid fields
- **Text:** Error message in orange (errors) or green (success)
- **Clearing:** Automatic on input/blur events

---

## Version History

| Date | Changes | Modified By |
|------|---------|-------------|
| 2025-12-04 | Initial documentation created | AI Assistant |
