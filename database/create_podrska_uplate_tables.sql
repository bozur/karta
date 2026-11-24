-- Табеле за евиденцију месечних уплата подршке и подешавање месечних техничких трошкова

CREATE TABLE IF NOT EXISTS podrska_podesavanja (
    kljuc VARCHAR(100) PRIMARY KEY,
    vrednost VARCHAR(255) NOT NULL,
    azurirano TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO podrska_podesavanja (kljuc, vrednost)
VALUES ('mesecni_troskovi', '5500'), ('troskovi_odrzavanja', '30000')
ON CONFLICT (kljuc) DO NOTHING;

CREATE TABLE IF NOT EXISTS uplate_mesecne (
    godina INTEGER NOT NULL,
    mesec INTEGER NOT NULL CHECK (mesec >= 1 AND mesec <= 12),
    iznos INTEGER NOT NULL DEFAULT 0 CHECK (iznos >= 0),
    azurirano TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (godina, mesec)
);
