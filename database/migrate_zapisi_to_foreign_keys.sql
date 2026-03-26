-- ============================================
-- Migrate zapisi table to use foreign keys
-- Database: MSSQL (SQL Server)
-- Created: 2025-11-30
-- ============================================

-- IMPORTANT: Run this script AFTER creating and populating the teme table
-- IMPORTANT: Ensure no uploads are happening during this migration

PRINT 'Starting migration of zapisi table to use foreign keys...';
GO

-- Step 1: Add new columns for foreign keys
PRINT 'Step 1: Adding new columns tema_id and korisnik_id...';
ALTER TABLE zapisi ADD tema_id INT NULL;
ALTER TABLE zapisi ADD korisnik_id INT NULL;
GO

-- Step 2: Populate tema_id by matching tema string to teme.naziv
PRINT 'Step 2: Populating tema_id from existing tema values...';
UPDATE z
SET z.tema_id = t.id
FROM zapisi z
INNER JOIN teme t ON z.tema = t.naziv;
GO

-- Check for any records that couldn't be matched
DECLARE @unmatchedTema INT;
SELECT @unmatchedTema = COUNT(*) FROM zapisi WHERE tema IS NOT NULL AND tema_id IS NULL;
IF @unmatchedTema > 0
BEGIN
    PRINT 'WARNING: ' + CAST(@unmatchedTema AS VARCHAR) + ' records have tema values that do not match any entry in teme table!';
    SELECT DISTINCT tema FROM zapisi WHERE tema IS NOT NULL AND tema_id IS NULL;
    -- Note: We don't raise error here to allow manual fix, or you can uncomment next line
    -- RAISERROR('Migration halted: unmatched tema values found.', 16, 1);
END
GO

-- Step 3: Populate korisnik_id by matching korisnik string to korisnik.korisnik
PRINT 'Step 3: Populating korisnik_id from existing korisnik values...';
UPDATE z
SET z.korisnik_id = k.id
FROM zapisi z
INNER JOIN korisnik k ON z.korisnik = k.korisnik;
GO

-- Check for any records that couldn't be matched
DECLARE @unmatchedKorisnik INT;
SELECT @unmatchedKorisnik = COUNT(*) FROM zapisi WHERE korisnik IS NOT NULL AND korisnik_id IS NULL;
IF @unmatchedKorisnik > 0
BEGIN
    PRINT 'WARNING: ' + CAST(@unmatchedKorisnik AS VARCHAR) + ' records have korisnik values that do not match any entry in korisnik table!';
    SELECT DISTINCT korisnik FROM zapisi WHERE korisnik IS NOT NULL AND korisnik_id IS NULL;
END
GO

-- Step 4: Make the new columns NOT NULL (now that they're populated)
-- Only proceed if we have data (or if table is empty)
IF NOT EXISTS (SELECT * FROM zapisi WHERE tema_id IS NULL OR korisnik_id IS NULL)
BEGIN
    PRINT 'Step 4: Making new columns NOT NULL...';
    ALTER TABLE zapisi ALTER COLUMN tema_id INT NOT NULL;
    ALTER TABLE zapisi ALTER COLUMN korisnik_id INT NOT NULL;
END
ELSE
BEGIN
    PRINT 'WARNING: Skipping NOT NULL constraint because some records have NULL values.';
END
GO

-- Step 5: Drop old indexes on tema and korisnik columns
PRINT 'Step 5: Dropping old indexes...';
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_tema' AND object_id = OBJECT_ID('zapisi'))
    DROP INDEX idx_tema ON zapisi;
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_korisnik' AND object_id = OBJECT_ID('zapisi'))
    DROP INDEX idx_korisnik ON zapisi;
GO

-- Step 6: Drop old columns
-- Only proceed if we successfully migrated data
IF NOT EXISTS (SELECT * FROM zapisi WHERE tema_id IS NULL OR korisnik_id IS NULL)
BEGIN
    PRINT 'Step 6: Dropping old tema and korisnik columns...';
    ALTER TABLE zapisi DROP COLUMN tema;
    ALTER TABLE zapisi DROP COLUMN korisnik;
END
ELSE
BEGIN
    PRINT 'WARNING: Skipping column drop because migration was not fully successful.';
END
GO

-- Step 7: Add foreign key constraints
PRINT 'Step 7: Adding foreign key constraints...';
ALTER TABLE zapisi 
    ADD CONSTRAINT FK_zapisi_tema 
    FOREIGN KEY (tema_id) REFERENCES teme(id);

ALTER TABLE zapisi 
    ADD CONSTRAINT FK_zapisi_korisnik 
    FOREIGN KEY (korisnik_id) REFERENCES korisnik(id);
GO

-- Step 8: Create new indexes on foreign key columns
PRINT 'Step 8: Creating new indexes...';
CREATE INDEX idx_tema_id ON zapisi(tema_id);
CREATE INDEX idx_korisnik_id ON zapisi(korisnik_id);
GO

-- Step 9: Verify the migration
PRINT 'Step 9: Verifying migration...';
DECLARE @totalRecords INT, @recordsWithFK INT;
SELECT @totalRecords = COUNT(*) FROM zapisi;
SELECT @recordsWithFK = COUNT(*) FROM zapisi WHERE tema_id IS NOT NULL AND korisnik_id IS NOT NULL;

PRINT 'Total records: ' + CAST(@totalRecords AS VARCHAR);
PRINT 'Records with valid foreign keys: ' + CAST(@recordsWithFK AS VARCHAR);

IF @totalRecords = @recordsWithFK
BEGIN
    PRINT 'SUCCESS: Migration completed successfully!';
END
ELSE
BEGIN
    PRINT 'WARNING: Some records may not have valid foreign keys!';
END
GO

-- Display sample of migrated data
PRINT 'Sample of migrated data:';
SELECT TOP 5 
    z.id, 
    z.naziv, 
    t.naziv AS tema_naziv, 
    k.korisnik AS korisnik_username,
    z.created_at
FROM zapisi z
INNER JOIN teme t ON z.tema_id = t.id
INNER JOIN korisnik k ON z.korisnik_id = k.id
ORDER BY z.id;
GO

PRINT 'Migration script completed.';
