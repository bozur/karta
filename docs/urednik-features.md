# Urednik (Editor/Admin) Tab - Feature Documentation

This document describes all features and behaviors of the "urednik" (editor/admin) tab for managing content approval, user administration, and system maintenance.

**Last Updated:** 2025-12-31  
**Files:** `sections/urednik.html`, `sections/urednik.js`

---

## Overview

The urednik tab is an administrative interface accessible only to users with editor privileges (`urednik` field in `korisnik` table). It provides tools for content moderation, user management, and system maintenance.

---

## 1. Access Control

### Authorization

**Check:** `urednik` column in `korisnik` table  
**Values:** NULL (no access) or role identifier (e.g., "admin", "moderator")  
**Frontend:** Tab icon only visible if user has `urednik` privilege  
**Backend:** All API endpoints validate editor status

---

## 2. Unos Novosti (News Insertion)

### Purpose
Insert news items that appear in the "Opste" tab.

### Form Fields

| Field | ID | Type | Required | Validation |
|-------|-----|------|----------|------------|
| Опис | `novosti_opis` | Textarea | Yes | Min 10 chars, Max 4000 chars |

### Behavior

**Submit Button:** `#btn_unesi_novosti`  
**API Endpoint:** `POST /api/novosti`

**Validation:**
- Minimum 10 characters
- Maximum 4000 characters
- Error: "Опис мора имати најмање 10 карактера."

**Success:**
- Message: "Новости успјешно додате!" (green)
- Form clears automatically
- News appears in Opste tab

**Database:**
```sql
INSERT INTO novosti (opis, vrijeme, uneo)
VALUES (@opis, CURRENT_TIMESTAMP, @user_id)
```

---

## 3. Nova Tema (New Theme)

### Status
**Placeholder** - Not yet implemented

**Purpose:** Create new themes for the teme system

---

## 4. Zakljucavanje Tema (Theme Locking)

### Purpose
Lock/unlock themes to prevent new submissions.

### Display

**Container:** `#theme_lock_list`  
**Loading:** `#theme_lock_loading`  
**Alerts:** `#theme_lock_alerts`

### Behavior

**On Section Expand:**
- Loads all themes from `/api/v2/themes`
- Displays each theme with lock toggle

**Theme Row Format:**
- Theme name
- Lock icon (🔒 locked / 🔓 unlocked)
- Click to toggle

**API Endpoint:** `PUT /api/themes/:id/lock`

**Database:**
```sql
UPDATE teme
SET zakljucano = @locked
WHERE id = @theme_id
```

---

## 5. Prijavljene Primjedbe (Reported Comments)

### Purpose
Review and moderate user-reported comments.

### Display

**Container:** `#primedbe_body`  
**Loading:** `#primedbe_loading`  
**Alerts:** `#primedbe_alerts`

### Behavior

**On Section Expand:**
- Loads reported comments
- Displays comment content, reporter, reason

**Actions:**
- View comment context
- Delete comment
- Dismiss report

---

## 6. Pretraga Korisnika (User Search)

### Purpose
Search and manage user accounts.

### Search Form

**Input:** `#user_search_input` - Username or email  
**Button:** `#btn_user_search`

### Search Results

**Table:** `#user_search_body`

**Columns:**
- ID
- Корисник (username)
- Е-пошта (email)

**Click Behavior:** Opens user detail panel

### User Detail Panel

**Container:** `#user_detail_panel`

#### Display Fields

**Profile Section:**
- Profile picture (`u_detail_img`)
- Full name (`u_detail_name`)
- Username (`u_detail_username`)
- Email (`u_detail_email`)

**Access Statistics:**
- Прва посјета (`u_detail_p0`) - First login
- Задња посјета (`u_detail_p1`) - Last login
- Пријава (`u_detail_count`) - Login count

**Activity Statistics:**
- Ставки (`u_detail_stavki`) - Items count
- Догађаја (`u_detail_dogadjaja`) - Events count
- Записа (`u_detail_zapisa`) - Records count

#### Edit Fields

**Checkboxes:**
- `u_detail_urednik` - Editor privileges
- `u_detail_moze_ucitati` - Upload permission (auto-approve)
- `u_detail_blokiran` - **BLOCKED** status (red)

**Textarea:**
- `u_detail_napomena` - Admin notes

**Save Button:** `#btn_update_user`

### API Endpoints

**Search:** `GET /api/urednik/users/search?query=username`  
**Get Details:** `GET /api/urednik/users/:id`  
**Update:** `PUT /api/urednik/users/:id`

---

## 7. Pretraga Stavki (Item Search)

### Status
**Placeholder** - Not yet implemented

**Purpose:** Advanced search for map items across all themes

---

## 8. Odobravanje Stavki (Item Approval)

### Purpose
Approve or delete pending map items (teme submissions with `stanje='0'`).

### Two-View System

#### Summary View

**Container:** `#stavke_approval_summary`

**Display:**
- List of themes with pending items
- Count of pending items per theme
- Click theme to view details

#### Detail View

**Container:** `#stavke_approval_detail`

**Table Columns:**
- Опис (description)
- Разред (class)
- Врста (type)
- Подврста (subtype)
- Почетак (start time)
- Крај (end time)
- Корисник (username)
- Извор (source)
- Запис (record reference)
- ✓ Approve checkbox (green background)
- ✗ Delete checkbox (red background)

**Header Checkboxes:**
- `#stavke_approve_all` - Select all for approval
- `#stavke_delete_all` - Select all for deletion

**Validation:**
- Cannot approve and delete same item
- Checking one unchecks the other

**Execute Button:** `#btn_izvrsi_stavke`

### API Endpoints

**Load Summary:** `GET /api/urednik/stavke/pending-summary`  
**Load Details:** `GET /api/urednik/stavke/pending/:tema_id`  
**Process:** `POST /api/urednik/stavke/process`

**Request Payload:**
```json
{
  "approve": [1, 2, 3],
  "delete": [4, 5, 6],
  "tema_id": 1
}
```

**Database Actions:**
```sql
-- Approve
UPDATE table_X
SET stanje = '1', odobrio = @admin_id, odobrio_vrijeme = CURRENT_TIMESTAMP
WHERE id IN (@approve_ids)

-- Delete
DELETE FROM table_X
WHERE id IN (@delete_ids)
```

---

## 9. Odobravanje Događaja (Event Approval)

### Purpose
Approve or delete pending events (dogadjaji with `stanje='0'`).

### Display

**Container:** `#dogadjaji_approval_results`  
**Table Body:** `#dogadjaji_approval_body`

### Table Columns

- ID
- Опис (description)
- Почетак (start time)
- Крај (end time)
- Корисник (username)
- 📍 Location icon (if coordinates exist)
- ✓ Approve checkbox (green)
- ✗ Delete checkbox (red)

### Header Checkboxes

- `#dogadjaji_approve_all`
- `#dogadjaji_delete_all`

### Map Integration

**On Section Expand:**
- Clears all map layers from other tabs
- Loads pending dogadjaji on map (orange markers)
- Loads approved dogadjaji for comparison (calendar icons)

**On Row Click:**
- Centers map on event location
- Highlights event marker
- Opens popup with event details

**On Section Collapse:**
- Clears all dogadjaji approval markers

### Execute Button

**ID:** `#btn_izvrsi_dogadjaji`

**Process:**
1. Collect checked approve/delete IDs
2. Validate no conflicts
3. Send to `/api/urednik/dogadjaji/process`
4. Reload pending list
5. Update map display

### API Endpoints

**Load Pending:** `GET /api/urednik/dogadjaji/pending`  
**Process:** `POST /api/urednik/dogadjaji/process`

**Database Actions:**
```sql
-- Approve
UPDATE dogadjaji
SET stanje = '1'
WHERE id IN (@approve_ids)

-- Delete
DELETE FROM dogadjaji
WHERE id IN (@delete_ids)
```

---

## 10. Odobravanje Zapisa (Record Approval)

### Purpose
Approve or delete pending file uploads (zapisi with `stanje='0'`).

### Display

**Container:** `#zapisi_approval_results`  
**Table Body:** `#zapisi_approval_body`

### Table Columns

- ID
- Назив (filename) - clickable link to preview
- Опис (description)
- Тема (theme name)
- Корисник (username)
- ✓ Approve checkbox (green)
- ✗ Delete checkbox (red)

### Header Checkboxes

- `#zapisi_approve_all`
- `#zapisi_delete_all`

### Execute Button

**ID:** `#btn_izvrsi_zapisi`

### API Endpoints

**Load Pending:** `GET /api/urednik/zapisi/pending`  
**Process:** `POST /api/urednik/zapisi/process`

**Database Actions:**
```sql
-- Approve
UPDATE zapisi
SET stanje = '1'
WHERE id IN (@approve_ids)

-- Delete (also removes file from disk)
DELETE FROM zapisi
WHERE id IN (@delete_ids)
```

---

## 11. Pokretanje Bekapa (Backup Trigger)

### Status
**Placeholder** - Not yet implemented

**Purpose:** Manually trigger database backup

---

## 12. Pokretanje Brojača (Counter Sync)

### Purpose
Manually synchronize user contribution counters.

### Behavior

**Button:** `#btn_sync_counters`  
**API Endpoint:** `POST /api/urednik/sync-counters`

**Process:**
1. Counts all contributions per user:
   - `brojac_stavki` - Items in table_1 through table_6
   - `brojac_dogadjaja` - Events in dogadjaji
   - `brojac_zapisa` - Records in zapisi
   - `brojac_primjedbi` - Comments in comments
2. Updates `korisnik` table
3. Returns success message

**Success Message:** "Бројачи су успјешно синхронизовани!" (green, auto-hide after 5s)

**Database:**
```sql
UPDATE korisnik
SET brojac_stavki = (SELECT COUNT(*) FROM table_X WHERE dodao = korisnik.id),
    brojac_dogadjaja = (SELECT COUNT(*) FROM dogadjaji WHERE korisnik_id = korisnik.id),
    brojac_zapisa = (SELECT COUNT(*) FROM zapisi WHERE korisnik_id = korisnik.id),
    brojac_primjedbi = (SELECT COUNT(*) FROM comments WHERE creator = korisnik.id)
WHERE id = @user_id
```

---

## 13. Global Functions

### showAlert(container, message, type)

**Purpose:** Display styled alert messages

**Parameters:**
- `container` - jQuery element
- `message` - Alert text
- `type` - 'success' (green) or 'danger' (orange)

**Usage:**
```javascript
showAlert($('#novosti_alerts'), 'Success!', 'success');
```

---

## 14. Critical Behaviors Summary

### ✅ DO:
- Verify editor privileges before showing tab
- Validate all inputs before submission
- Prevent approve + delete conflicts
- Clear map layers when switching sections
- Provide clear success/error feedback
- Auto-hide success messages after 3-5 seconds
- Reload data after processing actions

### ❌ DON'T:
- Don't allow non-editors to access any urednik endpoints
- Don't approve and delete same item
- Don't forget to clear map when closing dogadjaji approval
- Don't skip validation on bulk operations
- Don't leave orphaned files when deleting zapisi

---

## 15. Error Messages Reference

| Scenario | Message | Display Location |
|----------|---------|------------------|
| News too short | "Опис мора имати најмање 10 карактера." | `#novosti_alerts` |
| News too long | "Опис не смије бити дужи од 4000 карактера." | `#novosti_alerts` |
| News success | "Новости успјешно додате!" | `#novosti_alerts` (green) |
| Counter sync success | "Бројачи су успјешно синхронизовани!" | `#brojaca_alerts` (green) |
| Approval conflict | "Не можете одобрити и обрисати исту ставку." | Respective alerts div |
| Server error | "Грешка при комуникацији са сервером" | Respective alerts div |

---

## Version History

| Date | Changes | Modified By |
|------|---------|-------------|
| 2025-12-31 | Initial documentation created | AI Assistant |
