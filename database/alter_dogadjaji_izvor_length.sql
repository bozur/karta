-- Widen dogadjaji.izvor (from VARCHAR(50)) and dogadjaji.opis (from VARCHAR(255)) to VARCHAR(500)
ALTER TABLE dogadjaji
    ALTER COLUMN izvor TYPE VARCHAR(500),
    ALTER COLUMN opis TYPE VARCHAR(500);
