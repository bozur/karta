-- Widen dogadjaji.izvor column from VARCHAR(50) to VARCHAR(500) so full URLs can be stored
ALTER TABLE dogadjaji
    ALTER COLUMN izvor TYPE VARCHAR(500);
