# Google Autentifikacija (Google Sign-In) - Vodič i Dokumentacija

Ovaj dokument opisuje arhitekturu, konfiguraciju i održavanje Google OAuth 2.0 / OpenID Connect autentifikacije implementirane na projektu `karta`.

---

## 1. Pregled rešenja

Korisnicima je omogućena jednostavna registracija i prijava jednim klikom putem zvaničnog Google naloga.  
Rešenje kombinuje:
* **Frontend:** Google Identity Services (GSI) biblioteku sa **potpuno prilagođenim transparentnim dugmetom** koje se savršeno uklapa u tamni dizajn početne stranice.
* **Backend:** Express rutu `/api/auth/google` koja vrši verifikaciju tokena preko zvaničnih Google API servisa i upravlja korisničkim sesijama.
* **Baza:** PostgreSQL tabelu `korisnik` sa kolonom `google_id`.

---

## 2. Tok podataka (Data Flow)

```
[ Korisnik ] 
     │  1. Klikne na "#custom-google-btn" ("Настави са Google налогом")
     ▼
[ Google Popup (GIS) ] 
     │  2. Korisnik odabere svoj Google nalog
     ▼
[ Frontend (index.js) ] 
     │  3. Google SDK vraća access_token / credential
     │  4. Šalje se AJAX POST ka "/api/auth/google"
     ▼
[ Backend (server.js) ] 
     │  5. Verifikacija sa Google API-jem (tokeninfo / userinfo)
     │  6. Provera da li aud/azp odgovara GOOGLE_CLIENT_ID
     │  7. Pretraga baze:
     │     - Ako korisnik postoji (po google_id ili e-pošti): povezuje se i loguje.
     │     - Ako je novi korisnik: kreira se novi red u tabeli `korisnik`.
     │  8. Kreira se standardna express sesija (req.session.user)
     ▼
[ Browser ] 
        9. Automatsko preusmeravanje na "/karta.html"
```

---

## 3. Podešavanja u Google Cloud konzoli

* **Projekat:** `Karta` (ili `Karta SRB`) na [Google Cloud Console](https://console.cloud.google.com/)
* **Tip klijenta:** Web application
* **OAuth Client ID:** Nalazi se u `.env` pod `GOOGLE_CLIENT_ID`
* **OAuth Client Secret:** Nalazi se u `.env` pod `GOOGLE_CLIENT_SECRET`

### Dozvoljena porekla (Authorized JavaScript origins):
U podešavanjima klijenta na Google Cloud konzoli moraju biti navedene adrese:
1. `http://localhost:3000` (za lokalno testiranje i razvoj)
2. `https://tvoj-domen.com` (tvoj zvanični internet domen na produkciji)

> ⚠️ **Važno:** Adrese se unose bez kose crte `/` na kraju (npr. `http://localhost:3000`, a ne `http://localhost:3000/`).

---

## 4. Promenljive okruženja (`.env`)

U fajlu `.env` (i na produkcionom serveru npr. Render) neophodno je uneti sledeće promenljive:

```env
GOOGLE_CLIENT_ID=757790338568-trsirv20rq325n3skevc3mj0immi2q16.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

---

## 5. Baza podataka (PostgreSQL)

### Tabela `korisnik`
* **Dodata kolona:** `google_id VARCHAR(255) UNIQUE`
* **Kolona `lozinka`:** Postavljena kao opciona (`NULL`). Korisnici registrovani isključivo preko Google-a nemaju lozinku u bazi.
* **Automatska migracija:** U `db.js` je ugrađena provera:
  ```sql
  ALTER TABLE "korisnik" ADD COLUMN IF NOT EXISTS "google_id" VARCHAR(255) UNIQUE;
  ```
  Ovo garantuje da se tabela automatski ažurira pri svakom pokretanju servera i na lokalnom i na produkcionom okruženju.

---

## 6. Ključni fajlovi koda

| Fajl | Uloga |
|------|-------|
| `index.html` | Uključuje `<script src="https://accounts.google.com/gsi/client">` i sadrži dugme `#custom-google-btn`. |
| `css/custom.css` | Stilovi za `#custom-google-btn` (transparentna pozadina, beli okvir, hover efekat). |
| `index.js` | Inicijalizuje `google.accounts.oauth2.initTokenClient`, obrađuje klik i šalje token na backend. |
| `server.js` | Endpoint `POST /api/auth/google`: vrši validaciju, pronalazi/kreira korisnika i postavlja sesiju. Zaštita u `POST /api/login` za naloge bez lozinke. |
| `db.js` | Automatski obezbeđuje postojanje kolone `google_id` u bazi podataka. |
| `privatnost.html` | Sadrži usklađenu politiku privatnosti prema Google API Services pravilima. |
| `uslovi.html` | Uključuje Google prijavu kao validan način registracije i pristupa. |

---

## 7. Bezbednosne napomene

1. **Povezivanje naloga (Account Linking):** Ako korisnik koji se ranije registrovao lozinkom klikne na Google dugme sa istim email-om, backend bezbedno povezuje njegov `google_id` bez kreiranja duplikata.
2. **Korisnik bez lozinke:** Ako korisnik koji se registrovao preko Google-a pokuša da se prijavi standardnom formom za lozinku, server vraća prijateljsku poruku:  
   *„Овај налог је регистрован путем Google-а. Пријавите се преко Google дугмета.”*
3. **Zaštita od napada:** Endpoint `/api/auth/google` je zaštićen strogim `authLimiter` mehanizmom za sprečavanje prevelikog broja zahteva.
