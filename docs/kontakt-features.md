# Kontakt (Contact) Tab - Feature Documentation

This document describes all features and behaviors of the "kontakt" (contact) tab for user communication with administrators.

**Last Updated:** 2025-12-31  
**Files:** `sections/kontakt.html`, `sections/kontakt.js`

---

## Overview

The kontakt tab provides a contact form for users to send messages to administrators. Users can select a subject category and write a message. The tab also displays contextual information based on the selected subject.

---

## 1. Form Structure

### Contact Form

**Form Element:** Unnamed form (no ID)  
**Submit Handler:** Not implemented (TODO)

### Form Fields

| Field | Element | Type | Options |
|-------|---------|------|---------|
| Наслов | `#kontakt_izbor` | Dropdown | 6 predefined subjects |
| Напис | `#exampleFormControlTextarea1` | Textarea | 5 rows, free text |

### Submit Button

**Text:** "пошаљи"  
**Class:** `btn btn-white border border-dark`  
**Action:** Not implemented (form submission TODO)

---

## 2. Subject Categories

### Dropdown Options

**Element:** `#kontakt_izbor`  
**Label:** "наслов:"

**Options:**

| Value | Label | Description |
|-------|-------|-------------|
| 0 | изабери наслов | Default/placeholder |
| 1 | грешка на странама | Report bugs or errors |
| 2 | приједлог за нову тему | Suggest new theme/category |
| 3 | приједлог за побољшање | Suggest improvements |
| 4 | помоћ на странама | Request help/support |
| 5 | остало | Other topics |

---

## 3. Dynamic Content Loading

### Contextual Information

**Element:** `#kontakt_opis`  
**Source:** `kontakt.txt` file  
**Trigger:** Subject dropdown change

### Loading Mechanism

**Function:** jQuery `.load()`  
**Pattern:** `kontakt.txt #kontakt_p{value}`

**Example:**
```javascript
$("#kontakt_opis").load("kontakt.txt #kontakt_p1");
```

**Behavior:**
- User selects subject from dropdown
- Corresponding content section loaded from `kontakt.txt`
- Content displayed below form
- Previous content replaced

### Content File Structure

**File:** `kontakt.txt`  
**Format:** HTML with ID-based sections

**Expected Structure:**
```html
<div id="kontakt_p0">Placeholder content</div>
<div id="kontakt_p1">Information about reporting errors</div>
<div id="kontakt_p2">Information about suggesting themes</div>
<div id="kontakt_p3">Information about improvements</div>
<div id="kontakt_p4">Information about getting help</div>
<div id="kontakt_p5">Information about other topics</div>
```

---

## 4. JavaScript Functionality

### File: `kontakt.js`

**Current Implementation:**
```javascript
$(document).ready(function () {
    console.log('Kontakt section loaded');
    
    $('#kontakt_izbor').on('change', function () {
        $("#kontakt_opis").load("kontakt.txt #kontakt_p" + this.value);
    });
    
    // TODO: Implement contact form submission
    // TODO: Add form validation
    // TODO: Send contact message to server
});
```

### Event Handlers

**Subject Change:**
- Event: `change` on `#kontakt_izbor`
- Action: Load corresponding content from `kontakt.txt`
- No validation or error handling

---

## 5. Implementation Status

### Current Features ✅

- Subject dropdown with 6 categories
- Message textarea
- Dynamic content loading based on subject
- Basic form structure

### Missing Features ❌ (TODO)

1. **Form Validation**
   - Subject selection required
   - Message text required
   - Minimum message length
   - Maximum message length

2. **Form Submission**
   - API endpoint for sending messages
   - AJAX submission
   - Success/error feedback
   - Form reset after success

3. **User Information**
   - Auto-populate user email/name
   - Include user ID in submission
   - Session validation

4. **Error Handling**
   - Network errors
   - Server errors
   - Validation errors
   - User-friendly messages

---

## 6. Proposed Implementation

### Database Schema

```sql
CREATE TABLE kontakt_poruke (
    id INT IDENTITY(1,1) PRIMARY KEY,
    korisnik_id INT NOT NULL,
    naslov INT NOT NULL, -- 1-5 (subject category)
    poruka NVARCHAR(MAX) NOT NULL,
    datum DATETIME2 DEFAULT GETDATE(),
    status NVARCHAR(20) DEFAULT 'novo', -- 'novo', 'procitano', 'odgovoreno'
    odgovor NVARCHAR(MAX) NULL,
    odgovorio_korisnik_id INT NULL,
    datum_odgovora DATETIME2 NULL,
    
    CONSTRAINT FK_kontakt_korisnik FOREIGN KEY (korisnik_id) 
        REFERENCES korisnik(id),
    CONSTRAINT FK_kontakt_odgovorio FOREIGN KEY (odgovorio_korisnik_id) 
        REFERENCES korisnik(id),
    CONSTRAINT CK_kontakt_naslov CHECK (naslov BETWEEN 1 AND 5)
);

CREATE INDEX idx_kontakt_korisnik ON kontakt_poruke(korisnik_id);
CREATE INDEX idx_kontakt_datum ON kontakt_poruke(datum DESC);
CREATE INDEX idx_kontakt_status ON kontakt_poruke(status);
```

### API Endpoint

**POST /api/kontakt/send**

**Authentication:** Required

**Request:**
```json
{
  "naslov": 1,
  "poruka": "Message text here..."
}
```

**Validation:**
- User must be logged in
- `naslov` must be 1-5
- `poruka` must not be empty
- `poruka` minimum 10 characters
- `poruka` maximum 2000 characters

**Response (Success):**
```json
{
  "success": true,
  "message": "Порука је послата. Одговорићемо вам ускоро."
}
```

**Response (Error):**
```json
{
  "error": "Error message in Serbian"
}
```

### Enhanced JavaScript

```javascript
$(document).ready(function () {
    console.log('Kontakt section loaded');
    
    // Subject change handler
    $('#kontakt_izbor').on('change', function () {
        $("#kontakt_opis").load("kontakt.txt #kontakt_p" + this.value);
    });
    
    // Form submission
    $('form').on('submit', function(e) {
        e.preventDefault();
        
        const naslov = $('#kontakt_izbor').val();
        const poruka = $('#exampleFormControlTextarea1').val().trim();
        
        // Validation
        if (naslov === '0') {
            alert('Молимо изаберите наслов');
            $('#kontakt_izbor').css('border-color', 'red');
            return;
        }
        
        if (!poruka || poruka.length < 10) {
            alert('Порука мора имати најмање 10 карактера');
            $('#exampleFormControlTextarea1').css('border-color', 'red');
            return;
        }
        
        // Clear errors
        $('#kontakt_izbor, #exampleFormControlTextarea1').css('border-color', '');
        
        // Submit
        $.ajax({
            url: '/api/kontakt/send',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ naslov, poruka }),
            success: function(response) {
                alert('Порука је послата. Одговорићемо вам ускоро.');
                $('form')[0].reset();
                $('#kontakt_opis').empty();
            },
            error: function(xhr) {
                const error = xhr.responseJSON?.error || 'Грешка при слању поруке';
                alert(error);
            }
        });
    });
});
```

---

## 7. Validation Rules

### Subject (Наслов)

**Required:** Yes  
**Type:** Dropdown selection  
**Valid Values:** 1-5  
**Error Message:** "Молимо изаберите наслов"

### Message (Напис)

**Required:** Yes  
**Type:** Text  
**Min Length:** 10 characters  
**Max Length:** 2000 characters (recommended)  
**Error Messages:**
- Empty: "Молимо унесите поруку"
- Too short: "Порука мора имати најмање 10 карактера"
- Too long: "Порука може имати највише 2000 карактера"

---

## 8. User Experience

### Visual Feedback

**Validation Errors:**
- Red border on invalid fields
- Alert message with specific error
- Border cleared when corrected

**Success:**
- Success alert message
- Form reset to initial state
- Content area cleared

**Loading State:**
- Show spinner during submission (recommended)
- Disable submit button during submission
- Re-enable after response

### Error Messages

**Serbian Language:**
- All messages in Serbian Cyrillic
- Clear and concise
- User-friendly tone

---

## 9. Security Considerations

### Authentication

**Required:** User must be logged in  
**Check:** Server-side session validation  
**Error:** Redirect to login if not authenticated

### Rate Limiting

**Recommended:** Limit contact form submissions  
**Suggestion:** 5 messages per hour per user  
**Purpose:** Prevent spam/abuse

### Input Sanitization

**Server-Side:**
- Strip HTML tags from message
- Escape special characters
- Prevent SQL injection (use parameterized queries)
- Prevent XSS attacks

### Content Moderation

**Optional:**
- Flag messages with profanity
- Admin review queue
- Automatic spam detection

---

## 10. Admin Features (Recommended)

### Message Management

**Admin Panel Features:**
- View all contact messages
- Filter by status (new/read/answered)
- Filter by subject category
- Search by user or content
- Mark as read
- Reply to messages
- Archive old messages

### Notifications

**Email Notifications:**
- Send to admin on new message
- Send to user when replied
- Include message preview
- Link to admin panel

---

## 11. Critical Behaviors Summary

### ✅ DO:
- Validate all input on both client and server
- Require authentication for form submission
- Provide clear error messages in Serbian
- Reset form after successful submission
- Implement rate limiting to prevent spam
- Sanitize user input on server
- Log all contact messages to database

### ❌ DON'T:
- Don't allow unauthenticated submissions
- Don't skip server-side validation
- Don't expose user emails publicly
- Don't allow unlimited message length
- Don't forget to handle network errors
- Don't use alert() for production (use inline messages)
- Don't send sensitive data in error messages

---

## 12. Content File (kontakt.txt)

### Purpose

Provide contextual help/information for each subject category.

### Recommended Content

**#kontakt_p1 (грешка на странама):**
```html
<p>Молимо опишите грешку што детаљније. Укључите:</p>
<ul>
  <li>Која страна/функција не ради</li>
  <li>Шта сте покушали да урадите</li>
  <li>Шта се десило уместо тога</li>
  <li>Који прегледач користите</li>
</ul>
```

**#kontakt_p2 (приједлог за нову тему):**
```html
<p>Предложите нову тему која би била корисна. Наведите:</p>
<ul>
  <li>Назив теме</li>
  <li>Опис теме</li>
  <li>Зашто би била корисна</li>
</ul>
```

---

## 13. Current Implementation (2025-12-31)

### Resend API Integration

**Status:** ✅ IMPLEMENTED

**API Endpoint:** `POST /api/kontakt`

**Implementation:**
```javascript
app.post('/api/kontakt', async (req, res) => {
    const { subject, message } = req.body;
    
    if (!subject || !message) {
        return res.status(400).json({ error: 'Наслов и порука су обавезни.' });
    }
    
    try {
        const data = await sendEmail({
            to: 'kontakt@karta.srb',
            subject: `Контакт: ${subject}`,
            html: `<p><strong>Наслов:</strong> ${subject}</p><p><strong>Порука:</strong></p><p>${message}</p>`
        });
        
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: 'Грешка при слању е-поште.' });
    }
});
```

**Email Service:** Resend (resend.com)  
**Recipient:** kontakt@karta.srb  
**Format:** HTML email with subject and message

### Changes from Proposed Implementation

**Simplified Approach:**
- No database storage of contact messages
- Direct email sending via Resend API
- No admin panel (messages go to email)
- No message history tracking

**Benefits:**
- Simpler implementation
- No additional database tables needed
- Immediate delivery to administrators
- Standard email workflow

---

## Version History

| Date | Changes | Modified By |
|------|---------|-------------|
| 2025-12-04 | Initial documentation created | AI Assistant |
| 2025-12-31 | Implemented Resend API integration for contact form, direct email sending to kontakt@karta.srb, removed database storage proposal in favor of email-only approach | AI Assistant |

