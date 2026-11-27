# Urednik (Editor/Admin) Tab - Feature Documentation

This document describes all features and behaviors of the "urednik" (editor/admin) tab for managing content approval, user administration, and system maintenance.

**Last Updated:** 2026-11-25  
**Files:** `sections/urednik.html`, `sections/urednik.js`, `server.js`

---

## Overview

The urednik tab is an administrative interface accessible only to users with editor privileges (`urednik` field in `korisnik` table). It provides tools for content moderation, search/editing of existing records, user management, and system maintenance.

### Accordion & Live Header Indicators
- **Accordion ("harmonika"):** All collapsible sections inside `#urednik_content` use `data-parent="#urednik_content"`, so only one subsection can be open at a time to reduce accidental admin edits.
- **Live Summary Counts (`GET /api/urednik/summary-counts`):** Loaded automatically when the Urednik tab opens and refreshed after moderation/edit/delete/backup actions. Displays pill badges next to headings before expanding:
  - `пријављена мишљења`: red badge (`#badge_reported_misljenja`) when reported opinions > 0
  - `одобравање ставки`: yellow badge (`#badge_pending_stavki`) when pending items > 0
  - `одобравање догађаја`: yellow badge (`#badge_pending_dogadjaja`) when pending events > 0
  - `одобравање записа`: yellow badge (`#badge_pending_zapisa`) when pending records > 0
  - `покретање бекапа`: compact date of last backup + `+N` new entries badge (`#badge_backup_info`) with breakdown tooltip

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
**API Endpoints:** `POST /api/novosti`, `PUT /api/novosti/:id` (edit `opis`, `vrijeme`, `vaznost` without re-sending email), `PUT /api/novosti/:id/vaznost`, `DELETE /api/novosti/:id`

**Existing News List (`#urednik_novosti_lista`):**
- Each row displays date, truncated text, importance selector, pencil icon (`✎`) for inline editing of date/time (`vrijeme`) and text (`opis`), and trash icon (`🗑`) to delete with confirmation.

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

## 5. Prijavljena Mišljenja (Reported Opinions)

### Purpose
Review and moderate user-reported opinions (comments with `downvote_count > 0`).

### Display

**Header Badge:** `#badge_reported_misljenja` (red pill badge shown when count > 0)  
**Container:** `#primedbe_body`  
**Loading:** `#primedbe_loading`  
**Alerts:** `#primedbe_alerts` (shows `"Нема пријављених мишљења."` when empty)

### Behavior

**On Section Expand:**
- Loads reported comments from `GET /api/urednik/comments/reported`
- Displays comment content, author, target ID/theme, upvotes/downvotes

**Actions:**
- Mark as reviewed (`✓`, `POST /api/urednik/comments/:id/dismiss`) — sets `pregledano_downvotes = downvote_count` on `comments` so the comment leaves the queue (without altering user votes) and only reappears if it receives new downvotes later.
- Delete comment (`DELETE /api/comments/:id`) and refresh summary counts.

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
- Ставки (`u_detail_stavki`) - Items count (`brojac_stavki`)
- Догађаја (`u_detail_dogadjaja`) - Events count (`brojac_dogadjaja`)
- Записа (`u_detail_zapisa`) - Records count (`brojac_zapisa`)
- Мишљења (`u_detail_misljenja`) - Opinions/comments count (`brojac_misljenja`, counted live from `comments WHERE creator = k.id`)

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

## 7. Pretraga Stavki (Item Search & Edit)

### Purpose
Search existing map items across themes and edit or delete them via the left sidebar (`openStavkaEditForm`).

### API Endpoints
- **Search:** `POST /api/search`
- **Update:** `PUT /api/urednik/stavke/:tabela/:id`
- **Delete:** `DELETE /api/urednik/stavke/:tabela/:id`

---

## 7b. Pretraga Događaja (Event Search, Edit & Delete)

### Purpose
Allow editors to search all events (both approved `stanje='1'` and pending `stanje='0'`), inspect details, edit fields, or delete inaccurate events.

### Search Form (`#form_pretraga_dogadjaja`)
- Filters: `ID`, `корисник`, `опис`, `од` / `до` (flatpickr datetime), `просторно`, `временски`, `стање`, `извор`
- Results table (`#ud_dogadjaj_search_body`): shows ID, truncated description (with yellow `чека` badge for pending rows), start date, username.

### Detail / Edit Panel (`#ud_dogadjaj_detail_panel`)
- Clicking a row opens the inline edit form (and pans the map to a marker if coordinates exist).
- Editable fields: `опис`, `почетак`, `крај`, `извор`, `запис`, `стање`, `координате`.
- Actions: **Измијени** (`#btn_update_urednik_dogadjaj`) and **Обриши** (`#btn_delete_urednik_dogadjaj`, with confirmation; also decrements user's `brojac_dogadjaja`).

### API Endpoints
- **Search:** `POST /api/urednik/dogadjaji/search`
- **Get Details:** `GET /api/urednik/dogadjaji/:id`
- **Update:** `PUT /api/urednik/dogadjaji/:id`
- **Delete:** `DELETE /api/urednik/dogadjaji/:id`

---

## 7c. Pretraga Zapisa (Record Search, Edit & Delete)

### Purpose
Allow editors to search all uploaded records (both approved and pending), download/inspect the attached file, edit metadata, or delete records.

### Search Form (`#form_pretraga_zapisa`)
- Filters: `ID`, `тема`, `назив`, `корисник`, `опис`, `тагови`, `стање`
- Results table (`#uz_zapis_search_body`): shows ID, title (with yellow `чека` badge for pending rows), theme, username.

### Detail / Edit Panel (`#uz_zapis_detail_panel`)
- Clicking a row opens the inline edit form with a direct file download link (`/api/zapisi/:id`).
- Editable fields: `назив`, `тема`, `стање`, `опис`, `тагови`.
- Actions: **Измијени** (`#btn_update_urednik_zapis`) and **Обриши** (`#btn_delete_urednik_zapis`, with confirmation; deletes physical file from disk, nulls `dogadjaji.zapis` references, and decrements user's `brojac_zapisa`).

### API Endpoints
- **Search:** `POST /api/urednik/zapisi/search`
- **Get Details:** `GET /api/urednik/zapisi/:id`
- **Update:** `PUT /api/urednik/zapisi/:id`
- **Delete:** `DELETE /api/urednik/zapisi/:id`

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

## 11. Pokretanje Bekapa (Streaming DB & Delta File Backups)

### Purpose
Download streaming backups of both the PostgreSQL database and uploaded files (`uploads/`), track the last backup timestamps independently, and monitor how many new database entries and files have been added since the last backup.

### Header Indicator
- `#badge_backup_info` next to `покретање бекапа` displays `(<db_date> +<count>)` (blue badge when > 0, red when >= 50, tooltip with breakdown).

### Expanded Panel (`#urednik_pokretanje_bekapa_podaci`)
- **База података:** Shows last DB backup date (`#bekap_last_date`), new entries count (`#bekap_new_total`), and breakdown (`#bekap_new_breakdown`: `ставки`, `догађаја`, `записа`, `мишљења`).
- **Фајлови записа (`uploads/`):** Shows last file backup date (`#bekap_files_last_date`) and count + size of new files (`#bekap_files_new_info`).
- **Buttons:**
  - `#btn_download_db_backup` (`преузми бекап базе`) — streams gzip-compressed JSON of all public tables (`karta-baza-YYYY-MM-DD_HH-mm.json.gz`) directly to disk and logs `tip = 'baza'` in `bekap_log`.
  - `#btn_download_files_backup` (`преузми фајлове (делта ZIP)`) — streams a store-only (`store: true`, low RAM/CPU) ZIP archive of only new/modified files in `uploads/` since the last file backup (plus `manifest.json`), or all files when `#bekap_files_full_mode` is checked, and logs `tip = 'fajlovi'` in `bekap_log`.

### API Endpoints & Database
- **Summary:** `GET /api/urednik/summary-counts`
- **Database Backup Stream:** `GET /api/urednik/backup/database`
- **Files Backup Stream (Delta/Full):** `GET /api/urednik/backup/files?mode=delta|full`
- **Manual Mark Backup:** `POST /api/urednik/backup/mark`
- **Database Table:** `bekap_log (id, created_at, korisnik_id, tip, napomena)` (auto-created via `ensureBekapLogTable(pool)`)

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

## 12b. Uplate (Monthly Support Donations & Technical Costs)

### Purpose
Manage the monthly technical cost threshold (RSD) and monthly collected donation totals for the past 12 months (including the current month), which directly drive the progress badge and 12-month bar chart in the `Podrska` tab.

### UI Elements (`sections/urednik.html`)
- **Collapse section:** `#urednik_uplate` / `#urednik_uplate_podaci`
- **Technical costs input:** `#uplate_troskovi_input` (`Месечни технички трошкови (РСД)`)
- **12-month table:** `#uplate_meseci_body` (current month highlighted at the top with `(текући)`)
- **Save button:** `#btn_sacuvaj_uplate` (`сачувај`)
- **Alerts / Loading:** `#uplate_alerts`, `#uplate_loading`

### Behavior (`sections/urednik.js`)
- `initUplateAdmin()` binds `shown.bs.collapse` to `loadUplateAdmin()` (`GET /api/podrska/uplate`) and click handler to `saveUplateAdmin()` (`POST /api/urednik/uplate`).
- Validates non-negative integer amounts on both frontend and backend.
- Database tables `podrska_podesavanja` and `uplate_mesecne` are auto-created via `ensurePodrskaTables(pool)` in `server.js` (also documented in `database/create_podrska_uplate_tables.sql`).

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
| 2026-11-22 | Added Uplate (monthly donations & technical costs) admin section | AI Assistant |
| 2026-11-25 | Added accordion behavior, live summary badges, user opinions count, Pretraga Događaja/Zapisa (search/edit/delete), renamed Prijavljena Mišljenja, and backup tracking (`bekap_log`) | AI Assistant |
