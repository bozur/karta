# Podrska (Support) Tab - Feature Documentation

This document describes all features and behaviors of the "podrska" (support) tab for displaying donation and support information.

**Last Updated:** 2025-12-04  
**Files:** `sections/podrska.html`, `sections/podrska.js`

---

## Overview

The podrska tab displays information about supporting the project, including contribution methods, donation options, and the project's mission. It's a static informational page with no interactive elements.

---

## 1. Tab Structure

### HTML Structure

**File:** `podrska.html`

**Layout:**
- Title: "Подршка"
- Three informational paragraphs
- Static content (no forms or interactive elements)

---

## 2. Content

### Paragraph 1: Project Mission

**Theme:** Community contribution and data preservation

**Key Points:**
- Project is independent and unbiased
- Community support is welcome
- Data contribution is the most valuable support
- Focus on preserving heritage
- Educating new generations

**Text:**
```
Овај подухват је покренут самостално како би превасходно био непристрасан 
и слободан у представљању тако да је свака подршка добродошла а највише 
се радујемо подршци која се огледа у Вашем уносу података те чувању наших 
тековина од заборава и васпитању нових нараштаја!
```

### Paragraph 2: Non-Financial Support

**Theme:** Sharing and recommendations

**Key Points:**
- Recommend to friends and acquaintances
- Share on social media
- Spread awareness

**Text:**
```
Додатно, можете нас подржати тако што ћете нас препоручити вашим познаницима 
и пријатељима којима би ово могло да буде занимљиво или поделом адресе 
стране на друштвеним мрежама.
```

### Paragraph 3: Financial Support (Placeholder)

**Theme:** Future donation options

**Key Points:**
- Placeholder for donation instructions
- Server costs, domain, hosting
- Internet and development costs
- Currently self-funded
- Reserved for future needs

**Text:**
```
На овој страни би требало да стоји упутство на који начин можете да новчано 
подржите рад страна. Плаћање трошкова у вези сервера, домена, меморије, 
интернета и надокнаде људима који раде на развоју и одржавању програма 
тренутно можемо да покријемо из личних средстава али ако дође до већих 
потреба просто смо предвидјели да би можда и оваква могућност била од 
користи у даљем раду па смо оставили овај дио за ту намјену.
```

---

## 3. JavaScript Functionality

### File: `podrska.js`

**Implementation:**
```javascript
function initPodrskaSection() {
    console.log('Podrska section initialized');
}
```

**Current State:**
- Minimal implementation
- No interactive features
- Only console logging
- No event handlers

---

## 4. Styling

### Default Styling

**Container:** Standard panel styling  
**Paragraphs:** Default `<p>` tags with 10px top margin  
**No Custom CSS:** Uses inherited styles

### Text Formatting

**Font:** Inherited from parent  
**Alignment:** Left-aligned  
**Spacing:** 10px margin-top on container  
**Line Height:** Default

---

## 5. Future Enhancements

### Recommended Additions

#### 1. Donation Integration

**Payment Methods:**
- PayPal integration
- Stripe payment gateway
- Bank transfer details
- Cryptocurrency options
- Local payment methods (Serbia-specific)

**Implementation:**
```html
<div class="donation-section mt-3">
    <h4>Новчана подршка</h4>
    <p>Изаберите начин плаћања:</p>
    
    <button class="btn btn-primary" id="paypal-donate">
        PayPal
    </button>
    <button class="btn btn-primary" id="stripe-donate">
        Картица
    </button>
    
    <div class="bank-details mt-3">
        <h5>Банковни подаци:</h5>
        <p>IBAN: ...</p>
        <p>SWIFT: ...</p>
    </div>
</div>
```

#### 2. Donation Tiers

**Levels:**
- **Подржавалац** (Supporter): 5-10 EUR/month
- **Донатор** (Donor): 10-25 EUR/month
- **Покровитељ** (Patron): 25+ EUR/month

**Benefits:**
- Recognition on website
- Special badge/icon
- Early access to features
- Priority support

#### 3. Progress Tracking

**Display:**
- Monthly funding goal
- Current amount raised
- Progress bar
- Transparent expense breakdown

**Example:**
```html
<div class="funding-progress">
    <h4>Месечни циљ: 100 EUR</h4>
    <div class="progress">
        <div class="progress-bar" style="width: 65%">65 EUR</div>
    </div>
    <p>35 EUR до циља</p>
</div>
```

#### 4. Expense Transparency

**Categories:**
- Server hosting
- Domain registration
- Database storage
- Development tools
- Maintenance costs

**Display:**
```html
<div class="expenses">
    <h4>Месечни трошкови:</h4>
    <ul>
        <li>Сервер: 30 EUR</li>
        <li>Домен: 5 EUR</li>
        <li>База података: 20 EUR</li>
        <li>Развој: 45 EUR</li>
    </ul>
    <p><strong>Укупно: 100 EUR</strong></p>
</div>
```

#### 5. Donor Recognition

**Options:**
- Public donor list (with permission)
- Thank you messages
- Donor wall/hall of fame
- Monthly highlights

#### 6. Social Sharing

**Features:**
- Share buttons for social media
- Pre-filled share text
- Referral tracking
- Social proof (X people shared)

**Implementation:**
```html
<div class="social-share mt-3">
    <h4>Подијелите са другима:</h4>
    <button class="btn btn-outline-primary" onclick="shareOnFacebook()">
        <i class="bi bi-facebook"></i> Facebook
    </button>
    <button class="btn btn-outline-info" onclick="shareOnTwitter()">
        <i class="bi bi-twitter"></i> Twitter
    </button>
</div>
```

---

## 6. Database Schema (Optional)

### Donation Tracking

```sql
CREATE TABLE donacije (
    id INT IDENTITY(1,1) PRIMARY KEY,
    korisnik_id INT NULL,
    iznos DECIMAL(10,2) NOT NULL,
    valuta NVARCHAR(3) DEFAULT 'EUR',
    nacin_placanja NVARCHAR(50), -- 'paypal', 'stripe', 'bank'
    datum DATETIME2 DEFAULT GETDATE(),
    status NVARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    poruka NVARCHAR(500) NULL,
    javno_prikazati BIT DEFAULT 0,
    
    CONSTRAINT FK_donacije_korisnik FOREIGN KEY (korisnik_id) 
        REFERENCES korisnik(id)
);

CREATE INDEX idx_donacije_datum ON donacije(datum DESC);
CREATE INDEX idx_donacije_status ON donacije(status);
```

### Expense Tracking

```sql
CREATE TABLE troskovi (
    id INT IDENTITY(1,1) PRIMARY KEY,
    kategorija NVARCHAR(50) NOT NULL,
    opis NVARCHAR(255) NOT NULL,
    iznos DECIMAL(10,2) NOT NULL,
    valuta NVARCHAR(3) DEFAULT 'EUR',
    datum DATETIME2 DEFAULT GETDATE(),
    period NVARCHAR(20) -- 'mesecno', 'godisnje', 'jednokratno'
);
```

---

## 7. API Endpoints (Proposed)

### POST /api/donacije/create

**Purpose:** Process donation

**Request:**
```json
{
  "iznos": 10.00,
  "nacin_placanja": "paypal",
  "poruka": "Optional message",
  "javno_prikazati": true
}
```

**Response:**
```json
{
  "success": true,
  "payment_url": "https://paypal.com/...",
  "donation_id": 123
}
```

### GET /api/donacije/stats

**Purpose:** Get donation statistics

**Response:**
```json
{
  "success": true,
  "mesecni_cilj": 100.00,
  "prikupljeno": 65.00,
  "broj_donatora": 12,
  "top_donatori": [...]
}
```

### GET /api/troskovi/mesecni

**Purpose:** Get monthly expenses

**Response:**
```json
{
  "success": true,
  "troskovi": [
    {"kategorija": "server", "iznos": 30.00},
    {"kategorija": "domain", "iznos": 5.00}
  ],
  "ukupno": 100.00
}
```

---

## 8. Legal Considerations

### Required Information

**If Accepting Donations:**
- Legal entity information
- Tax ID / Registration number
- Terms and conditions
- Refund policy
- Privacy policy for donor data
- GDPR compliance (if EU donors)

### Transparency

**Best Practices:**
- Clear expense breakdown
- Regular financial reports
- Donor acknowledgment
- Audit trail
- Public accountability

---

## 9. Payment Integration

### PayPal

**Library:** PayPal JavaScript SDK  
**Flow:** Redirect to PayPal → Return to site  
**Fees:** ~2.9% + fixed fee

### Stripe

**Library:** Stripe.js  
**Flow:** On-site payment form  
**Fees:** ~2.9% + fixed fee  
**Benefits:** Better UX, more payment methods

### Bank Transfer

**Information Needed:**
- Bank name
- Account holder
- IBAN
- SWIFT/BIC
- Reference number

---

## 10. Critical Behaviors Summary

### ✅ DO (When Implementing Donations):
- Use secure payment gateways
- Comply with financial regulations
- Provide receipts/confirmations
- Protect donor privacy
- Be transparent about expenses
- Thank donors appropriately
- Keep accurate records
- Follow GDPR/privacy laws

### ❌ DON'T:
- Don't store credit card details
- Don't make false promises
- Don't hide expenses
- Don't spam donors
- Don't share donor info without permission
- Don't forget tax implications
- Don't skip legal requirements

---

## 11. Content Guidelines

### Tone

**Current:** Humble and grateful  
**Maintain:** Appreciation for support  
**Avoid:** Aggressive fundraising, guilt-tripping

### Messaging

**Emphasize:**
- Community value
- Transparency
- Non-profit nature
- Voluntary support
- Multiple ways to help

**De-emphasize:**
- Financial need (unless critical)
- Pressure to donate
- Comparison with others

---

## 12. Analytics (Recommended)

### Track:
- Page views
- Donation conversion rate
- Average donation amount
- Donor retention
- Referral sources
- Social shares

### Tools:
- Google Analytics
- Custom event tracking
- Donation funnel analysis
- A/B testing for messaging

---

## Version History

| Date | Changes | Modified By |
|------|---------|-------------|
| 2025-12-04 | Initial documentation created | AI Assistant |
