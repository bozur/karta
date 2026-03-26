# System Overview & Main Pages - Documentation

This document describes the overall application architecture, authentication system, and main pages (index.html and karta.html).

**Last Updated:** 2025-12-31  
**Files:** `index.html`, `index.js`, `karta.html`, `karta.js`, `server.js`, `.env`, `render.yaml`

---

## 1. Application Overview

### Technology Stack

**Frontend:**
- **HTML5** - Semantic markup
- **CSS3** - Custom styles (`css/custom.css`)
- **JavaScript** - ES6+ with jQuery
- **Bootstrap 4.1.3** - UI framework
- **Leaflet 1.7.1** - Interactive maps
- **Leaflet.Draw 1.0.4** - Drawing tools
- **Bootstrap Icons 1.7** - Icon library
- **Flatpickr** - DateTime picker library

**Backend:**
- **Node.js** - Runtime environment
- **Express.js** - Web server framework
- **PostgreSQL** - Database (migrated from MSSQL)
- **pg** - PostgreSQL driver
- **express-session** - Session management
- **bcrypt** - Password hashing
- **express-rate-limit** - Rate limiting
- **multer** - File upload handling
- **file-type** - File content validation
- **clamscan** - Virus scanning (optional)
- **Resend API** - Email delivery service

**Deployment:**
- **Platform:** Render.com
- **Database:** PostgreSQL (managed)
- **Storage:** Persistent disk (15GB for uploads)
- **Environment:** Production

### Architecture

**Pattern:** Server-Side Rendered (SSR) with AJAX for dynamic content

**Structure:**
```
Client (Browser)
  ↓
index.html (Landing/Login)
  ↓ (After authentication)
karta.html (Main Application)
  ↓ (Dynamic content loading)
sections/*.html + sections/*.js
  ↓ (API calls)
server.js (Express Server)
  ↓
PostgreSQL Database
  ↓
Resend API (Email)
```

---

## 2. File Structure

```
karta/
├── index.html              # Landing page with login/register
├── index.js                # Landing page logic
├── karta.html              # Main application page
├── karta.js                # Main application logic
├── server.js               # Express server & API routes
├── .env                    # Environment variables (gitignored)
├── package.json            # Dependencies
│
├── css/
│   └── custom.css          # Custom styles
│
├── sections/               # Tab content (HTML + JS)
│   ├── teme.html/js
│   ├── dogadjaji.html/js
│   ├── zapisi.html/js
│   ├── opste.html/js
│   ├── korisnik.html/js
│   ├── urednik.html/js     # Admin/editor tab
│   ├── podrska.html/js
│   ├── kontakt.html/js
│   └── uputstvo.html/js
│
├── database/               # SQL schema files
│   ├── postgresql_schema.sql
│   ├── create_*.sql
│   └── populate_*.sql
│
├── email/                  # Email templates
│   └── dobrodosli.html     # Welcome email template
│
├── ikone/                  # Map marker icons
│   └── {tema_id}/
│       └── {razred}.png
│
├── uploads/                # User-uploaded files
│   └── zapisi/             # Uploaded documents
│
├── comments/               # User comment files (JSON)
│
├── docs/                   # Feature documentation
│   ├── system-overview.md
│   ├── dogadjaji-features.md
│   ├── zapisi-features.md
│   ├── teme-features.md
│   ├── korisnik-features.md
│   ├── urednik-features.md
│   ├── opste-features.md
│   ├── kontakt-features.md
│   ├── podrska-features.md
│   └── uputstvo-features.md
│
├── render.yaml             # Render.com deployment config
│
└── leaflet-sidebar-master/ # Sidebar plugin
```

---

## 3. Authentication System

### Session Management

**Library:** `express-session`  
**Store:** MemoryStore (default)  
**Cookie Settings:**
- **Name:** `connect.sid`
- **HttpOnly:** true
- **Secure:** false (dev), true (production with HTTPS)
- **SameSite:** 'lax'
- **MaxAge:** 24 hours (default), 30 days (with "remember me")

**Session Data:**
```javascript
req.session.user = {
  id: 123,
  username: "user123",
  email: "user@example.com"
}
```

### Login Flow

**Endpoint:** `POST /api/login`

**Process:**
1. User submits username/email + password
2. Server queries `korisnik` table
3. Bcrypt compares password with hash
4. If match:
   - Update `pristup1` (last login)
   - Increment `brojac_pristupa`
   - Set `pristup0` if first login
   - Create session
   - Extend cookie if "remember me" checked
   - Redirect to `/karta.html`
5. If no match:
   - Return 401 error

**Error Messages:**
- Invalid credentials: "погрешно корисничко име/е-пошта или лозинка"

### Registration Flow

**Endpoint:** `POST /api/register`

**Process:**
1. User submits email address
2. Server validates email format
3. Check if email already exists
4. If new:
   - Generate random 8-char password
   - Hash password with bcrypt
   - Create username from email (before @)
   - Insert into `korisnik` table
   - Log password to console (mock email)
   - Return success
5. If exists:
   - Return 409 Conflict

**Error Messages:**
- Invalid email: "неисправна адреса е-поште"
- Email exists: "предложена адреса већ постоји"
- Success: "лозинка је послата на е-пошту"

### Password Reset Flow

**Endpoint:** `POST /api/forgot-password`

**Process:**
1. User submits email address
2. Server validates email format
3. Check if user exists
4. If exists:
   - Generate new random 8-char password
   - Hash password with bcrypt
   - Update `korisnik` table
   - Log password to console (mock email)
   - Return success
5. If not found:
   - Return 404

**Error Messages:**
- Invalid email: "неисправна адреса е-поште"
- User not found: "корисник није пронађен"
- Success: "нова лозинка је прослијеђена на е-пошту"

### Logout Flow

**Endpoint:** `POST /api/logout`

**Process:**
1. User clicks logout icon
2. Confirmation dialog shown
3. If confirmed:
   - Destroy session
   - Redirect to `/index.html`

### Authentication Check

**Endpoint:** `GET /api/check-auth`

**Purpose:** Verify user is logged in  
**Used By:** `karta.html` on page load

**Process:**
1. Check if `req.session.user` exists
2. If yes: Return user data
3. If no: Return 401, redirect to login

---

## 4. Index.html (Landing Page)

### Page Structure

**Title:** "Карта"  
**Language:** Serbian (sr)  
**Viewport:** Responsive, user-scalable

### Header Section

**Heading 1:** "Кроз простор и вријеме!"  
**Heading 3:** "изнад митова и легенди"  
**Branding:** "КАРТА.СРБ" with icon  
**Tagline:** "тражи, додај, подијели, прати, откриј, учи, ..."

### Login/Register Box

**Container:** Centered, bordered with warning color  
**Width:** 400px  
**Background:** Transparent with border

**Sections (Toggle-able):**

1. **Login Form** (`#logging`)
   - Username/Email field
   - Password field
   - "Remember me" checkbox
   - Submit button: "улаз"
   - Error display: `#loggingenter0`

2. **Forgot Password** (`#passwordforgotten`)
   - Email field
   - Submit button: "пошаљи"
   - Error display: `#passwordforgottenenter0`

3. **New User Registration** (`#newuser`)
   - Email field
   - Submit button: "улаз"
   - Error display: `#newuserenter0`

**Toggle Links:**
- "пријава" - Show login form
- "заборављена лозинка" - Show forgot password
- "нови корисник" - Show registration

### Footer

**Copyright:** `© 2021-{current_year} сва права задржана`  
**Links:**
- [Услови коришћења](uslovi.html)
- [Приватност](privatnost.html)

### Cookie Consent

**Display:** Fixed bottom banner  
**Trigger:** First visit (no `cookieConsent` in localStorage)  
**Message:** "Ова страница користи колачиће за побољшање корисничког искуства. Да ли прихватате?"  
**Button:** "Прихватам"  
**Storage:** `localStorage.setItem('cookieConsent', 'true')`

### Validation

**Client-Side:**
- Empty field check (red border)
- Email format validation (regex)
- Real-time error messages

**Visual Feedback:**
- Red border on invalid fields
- Orange error text below forms
- Border cleared on valid input

---

## 5. Karta.html (Main Application)

### Page Structure

**Title:** "Карта"  
**Language:** Serbian (sr)

### Layout Components

#### 1. Sidebar (`#sidebar`)
- **Purpose:** Display marker details
- **Position:** Left side
- **Plugin:** Leaflet Sidebar
- **Toggle:** Click marker popup icon
- **Content:** Dynamic (loaded via AJAX)

#### 2. Map Controls (`#izbor_karte`)
- **Element:** Terrain/Satellite toggle
- **Text:** "терен/сателит"
- **Position:** Top-left corner
- **Function:** `#promjena_karte` click handler

#### 3. Navigation Bar (`#navodi`)
- **Position:** Top-right corner
- **Icons:** Bootstrap Icons
- **Items:**
  - `bi-layers` - Теме (teme)
  - `bi-calendar3` - Догађаји (dogadjaji)
  - `bi-folder` - Записи (zapisi)
  - `bi-lightbulb` - Опште (opste)
  - `bi-person` - Корисник (korisnik)
  - `bi-pencil-square` - Уредник (urednik) - **Admin only**
  - `bi-cash-coin` - Подршка (podrska)
  - `bi-envelope` - Контакт (kontakt)
  - `bi-question-circle` - Упутство (uputstvo)
  - `bi-box-arrow-right` - Излаз (logout)

**Behavior:**
- Click icon → Load corresponding section
- Tooltip on hover
- `title2` attribute contains section name

#### 4. Dogadjaj Detail Layer (`#dogadjaj_layer`)
- **Purpose:** Display event details
- **Position:** Top of screen, above map
- **Initial Height:** 35px
- **Resizable:** Drag bottom border to expand
- **Close Button:** X icon in header
- **Content:**
  - Event description
  - Time period (start - end)
  - Source reference

#### 5. Map Container (`#kartaid`)
- **Library:** Leaflet 1.7.1
- **Initial View:** [42.046475, 19.494058] (Skadar)
- **Initial Zoom:** 6
- **Zoom Control:** Custom with Serbian text ("Приближи" / "Удаљи")
- **Tile Layers:**
  - Terrain: Mapbox streets-v12
  - Satellite: Mapbox satellite-streets-v12
  - Clean Terrain: Custom Mapbox style
  - Clean Satellite: Custom Mapbox style

**Map Features:**
- Scale control
- Drawing tools (Leaflet.Draw) - localized to Serbian Cyrillic
- Custom marker icons
- GeoJSON layers
- Sidebar panel

#### 6. Section Content (`#section-content`)
- **Purpose:** Dynamic content container
- **Class:** `sloj_vidi`
- **Position:** Right side panel
- **Height:** Responsive (window height - 78px)
- **Content:** Loaded via AJAX from `sections/*.html`

### Dynamic Section Loading

**Function:** Click handler on `.izbor` icons

**Process:**
1. Get `title2` attribute (section name)
2. Check if same section already open
3. If same: Toggle panel closed
4. If different:
   - Load `sections/{name}.html` via AJAX
   - Inject into `#section-content`
   - Add class `in` to show panel
   - Load `sections/{name}.js` if not cached
   - Call `init{Name}Section()` if already loaded

**Caching:**
- JavaScript files loaded once
- Stored in `loadedScripts` object
- Re-initialization called on subsequent loads

---

## 6. Global Variables (karta.js)

| Variable | Type | Purpose |
|----------|------|---------|
| `karta` | Leaflet Map | Main map instance |
| `tilelayer1` | TileLayer | Terrain layer (with roads/labels) |
| `tilelayer2` | TileLayer | Satellite layer (with roads/labels) |
| `tilelayer1_clean` | TileLayer | Clean terrain (no roads/labels) |
| `tilelayer2_clean` | TileLayer | Clean satellite (no roads/labels) |
| `drawnItems` | FeatureGroup | Container for drawn shapes |
| `drawnControl` | L.Control.Draw | Drawing toolbar control |
| `addedGeoJSON` | L.GeoJSON | Current search results layer |
| `tabela` | Number | Currently selected theme ID |
| `table` | Array | Hardcoded dropdown options (fallback) |
| `window.layersVisible` | Boolean | Layer visibility state |
| `window.lastSelectedTeme` | String | Persisted theme selection |
| `window.korisnikUserData` | Object | Cached user profile data |
| `currentDogadjajiMarker` | L.Marker | Current event marker |
| `currentSection` | String | Currently loaded section name |
| `loadedScripts` | Object | Cache of loaded JS files |

---

## 7. Map Configuration

### Mapbox Access Token

**Location:** Hardcoded in `karta.js`  
**Token:** `pk.eyJ1Ijoia3JhamlzbmlrIiwiYSI6ImNrdnk1dGQ1ZTA4Mzkyb212anpteGJrY2UifQ.006iyvR0wTD7O-S6r4_4IQ`

**Tile Layers:**
1. **Terrain (Regular):** `mapbox/streets-v12`
2. **Satellite (Regular):** `mapbox/satellite-streets-v12`
3. **Terrain (Clean):** Custom style `cmioh6qyt00n601s96mry52fh`
4. **Satellite (Clean):** Custom style `cmiogi93c015f01s61utu9qg8`

### Layer Toggle Function

**Function:** `window.toggleMapLayers()`

**Behavior:**
- Checks `window.layersVisible` state
- Removes current layer
- Adds appropriate layer (regular or clean)
- Preserves terrain/satellite selection

### Drawing Tools

**Library:** Leaflet.Draw 1.0.4

**Available Tools:**
- Marker
- Polyline
- Polygon

**Disabled Tools:**
- Circle
- Rectangle
- CircleMarker

**Configuration:**
- No intersection allowed for polygons/polylines
- Custom error messages in Serbian
- Edit mode enabled for `drawnItems`

**Localization:**
All drawing tool tooltips and buttons are localized to Serbian Cyrillic via `L.drawLocal`:
- **Toolbar buttons:** "Нацртај показивач", "Нацртај полигон", "Нацртај линију"
- **Actions:** "Сачувај", "Поништи", "Обриши све", "Заврши"
- **Tooltips:** "Притисни на карту да ставиш показивач", "Притисни да почнеш да црташ", etc.
- **Edit mode:** "Измени слојеве", "Обриши слојеве", "Превуци ручице или показиваче ради измене"
- **No layers:** "Нема слоја за измену", "Нема слоја за брисање"

### Custom Marker

**Icon:** Skadar marker  
**Path:** `/ikone/skadar.png`  
**Location:** [42.046475, 19.494058]  
**Popup:** "Скадар - престони град!"

---

## 8. Database Connection

### Configuration

**File:** `.env` (gitignored)

**Required Variables:**
```
DATABASE_URL=postgresql://user:password@host:port/database
PORT=10000
SESSION_SECRET=your_secret_key
NODE_ENV=production
RESEND_API_KEY=re_xxxxxxxxx
```

**Connection Pool:**
```javascript
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
```

**Note:** PostgreSQL connection uses connection pooling for better performance.

---

## 9. Server Configuration

### Port

**Default:** 3000  
**Environment Variable:** `process.env.PORT`

### Middleware

1. **express.json()** - Parse JSON bodies
2. **express.urlencoded()** - Parse URL-encoded bodies
3. **express.static()** - Serve static files
4. **express-session** - Session management
5. **Rate limiters:**
   - `uploadLimiter` - 5 uploads per day
   - General rate limiting (if configured)

### File Upload

**Library:** multer  
**Destination:** `uploads/`  
**Filename:** Timestamp + random string  
**Size Limit:** Configured in multer options

### Security

**Password Hashing:**
- **Algorithm:** Bcrypt
- **Salt Rounds:** 10

**Session Secret:**
- **Source:** Environment variable or default
- **Recommendation:** Use strong random string in production

**CORS:** Not configured (same-origin only)

---

## 10. Error Handling

### Client-Side

**Visual Indicators:**
- Red borders on invalid fields
- Orange error text in dedicated divs
- Green success messages (auto-hide after 3s)

**Validation:**
- Real-time on blur/input events
- Pre-submission validation
- Prevent form submission if invalid

### Server-Side

**HTTP Status Codes:**
- **200** - Success
- **400** - Bad Request (validation error)
- **401** - Unauthorized (not logged in)
- **403** - Forbidden (no permission)
- **404** - Not Found
- **409** - Conflict (duplicate email)
- **429** - Too Many Requests (rate limit)
- **500** - Internal Server Error

**Error Response Format:**
```json
{
  "error": "Error message in Serbian"
}
```

**Success Response Format:**
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... }
}
```

---

## 11. Critical Behaviors Summary

### ✅ DO:
- Check authentication on every protected page load
- Validate input on both client and server
- Use parameterized queries to prevent SQL injection
- Hash passwords with bcrypt before storing
- Implement rate limiting on sensitive endpoints
- Clear sensitive data from forms after submission
- Provide user-friendly error messages in Serbian
- Use HTTPS in production
- Store session secret in environment variable
- Implement CSRF protection in production

### ❌ DON'T:
- Don't store passwords in plain text
- Don't trust client-side validation alone
- Don't expose database errors to users
- Don't hardcode credentials in code
- Don't allow unlimited login attempts
- Don't forget to destroy session on logout
- Don't skip authentication checks
- Don't use default session secret in production
- Don't expose API endpoints without authentication

---

## 12. Deployment Checklist

### Environment
- [ ] Set `NODE_ENV=production`
- [ ] Configure strong session secret
- [ ] Enable HTTPS
- [ ] Set `secure: true` for cookies
- [ ] Configure proper CORS if needed

### Database
- [ ] Use connection pooling
- [ ] Set appropriate timeout values
- [ ] Enable SSL/TLS for database connection
- [ ] Backup database regularly

### Security
- [ ] Implement CSRF protection
- [ ] Add helmet.js for security headers
- [ ] Configure rate limiting for all endpoints
- [ ] Set up virus scanning (ClamAV)
- [ ] Implement proper logging
- [ ] Monitor for suspicious activity

### Performance
- [ ] Enable gzip compression
- [ ] Implement caching headers
- [ ] Optimize database queries
- [ ] Use CDN for static assets
- [ ] Minify CSS/JS files

---

## 13. Email System

### Resend API Integration

**Service:** Resend (resend.com)  
**API Key:** Stored in `RESEND_API_KEY` environment variable

### Email Helper Function

**Function:** `sendEmail({ to, subject, html, bcc })`

**Usage:**
```javascript
await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to KARTA.SRB',
  html: emailTemplate,
  bcc: 'admin@karta.srb'
});
```

### Welcome Email

**Template:** `email/dobrodosli.html`  
**Trigger:** New user registration  
**Content:**
- Welcome message
- Auto-generated password
- Quick start guide
- Opt-out instructions

### Contact Form Email

**Endpoint:** `POST /api/kontakt`  
**Recipient:** `kontakt@karta.srb`  
**Content:** User-submitted message with subject

### Email Preferences

**Field:** `obavjestenja` in `korisnik` table  
**Default:** TRUE (enabled)  
**User Control:** Can disable in korisnik tab

---

## 14. Comments System

### Database Tables

**Main Table:** `comments`

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| parent | INTEGER | Parent comment ID (for threading) |
| target_type | VARCHAR(50) | 'table_X', 'dogadjaji', 'zapisi' |
| target_id | INTEGER | ID of target item |
| created | TIMESTAMP | Creation time |
| modified | TIMESTAMP | Last edit time |
| content | TEXT | Comment text |
| creator | INTEGER | User ID |
| fullname | VARCHAR(255) | Display name |
| profile_picture_url | VARCHAR(255) | User avatar |

**Voting Tables:**
- `comment_upvotes` - User upvotes
- `comment_downvotes` - User downvotes

### API Endpoints

**Get Comments:** `GET /api/comments?table=table_1&id=123`  
**Post Comment:** `POST /api/comments`  
**Upvote:** `POST /api/comments/:id/upvote`  
**Downvote:** `POST /api/comments/:id/downvote`  
**Report:** `POST /api/comments/:id/report`

### Features

- Threaded comments (parent-child relationships)
- Upvote/downvote system
- User reporting for moderation
- Admin review in urednik tab
- Real-time vote counts

---

## 15. Flatpickr Integration

### Library

**Name:** Flatpickr  
**Purpose:** Replace native datetime-local inputs  
**Locale:** Serbian (sr)

### Configuration

```javascript
flatpickr(".flatpickr-datetime", {
  enableTime: true,
  dateFormat: "Y-m-d H:i",
  locale: "sr",
  time_24hr: true
});
```

### Used In

- **Dogadjaji Tab:** pocetak, kraj fields (unos and trazi)
- **Teme Tab:** Novo section datetime inputs
- **Teme Popups:** pocetak, kraj fields
- **Urednik Tab:** Pretraga stavki datetime filters

### Benefits

- Consistent UI across browsers
- Better mobile experience
- Localized to Serbian
- Time picker included

---

## 16. Deployment (Render.com)

### Configuration File

**File:** `render.yaml`

### Services

**Web Service:**
- **Name:** karta
- **Runtime:** Node.js
- **Build:** `npm install`
- **Start:** `npm start`
- **Plan:** Starter

### Environment Variables

- `DATABASE_URL` - From managed PostgreSQL database
- `PORT` - 10000
- `SESSION_SECRET` - Auto-generated
- `NODE_ENV` - production
- `RESEND_API_KEY` - Manual configuration

### Persistent Disk

- **Name:** karta-uploads
- **Mount Path:** `/opt/render/project/src/uploads`
- **Size:** 15GB
- **Purpose:** Store user-uploaded files

### Database

- **Type:** PostgreSQL
- **Plan:** Basic (256MB)
- **Managed:** Yes (automatic backups)

---

## Version History

| Date | Changes | Modified By |
|------|---------|-------------|
| 2025-12-04 | Initial documentation created | AI Assistant |
| 2025-12-04 | Added Serbian Cyrillic localization for drawing tools and zoom controls | AI Assistant |
| 2025-12-31 | Major update: PostgreSQL migration, Render deployment, email system (Resend), comments system, Flatpickr integration, urednik tab, updated file structure | AI Assistant |

