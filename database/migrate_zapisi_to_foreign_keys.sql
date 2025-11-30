-- ============================================
-- Migrate zapisi table to use foreign keys
-- Database: MSSQL (SQL Server)
-- Created: 2025-11-30
-- ============================================

-- IMPORTANT: Run this script AFTER creating and populating the teme table
-- IMPORTANT: Ensure no uploads are happening during this migration

PRINT 'Starting migration of zapisi table to use foreign keys...';

-- Step 1: Add new columns for foreign keys
PRINT 'Step 1: Adding new columns tema_id and korisnik_id...';
ALTER TABLE zapisi ADD tema_id INT NULL;
ALTER TABLE zapisi ADD korisnik_id INT NULL;

-- Step 2: Populate tema_id by matching tema string to teme.naziv
PRINT 'Step 2: Populating tema_id from existing tema values...';
UPDATE z
SET z.tema_id = t.id
FROM zapisi z
INNER JOIN teme t ON z.tema = t.naziv;

-- Check for any records that couldn't be matched
DECLARE @unmatchedTema INT;
SELECT @unmatchedTema = COUNT(*) FROM zapisi WHERE tema IS NOT NULL AND tema_id IS NULL;
IF @unmatchedTema > 0
BEGIN
    PRINT 'WARNING: ' + CAST(@unmatchedTema AS VARCHAR) + ' records have tema values that do not match any entry in teme table!';
    SELECT DISTINCT tema FROM zapisi WHERE tema IS NOT NULL AND tema_id IS NULL;
    RAISERROR('Migration halted: unmatched tema values found. Please review and fix manually.', 16, 1);
    RETURN;
END

-- Step 3: Populate korisnik_id by matching korisnik string to korisnik.korisnik
PRINT 'Step 3: Populating korisnik_id from existing korisnik values...';
UPDATE z
SET z.korisnik_id = k.id
FROM zapisi z
INNER JOIN korisnik k ON z.korisnik = k.korisnik;

-- Check for any records that couldn't be matched
DECLARE @unmatchedKorisnik INT;
SELECT @unmatchedKorisnik = COUNT(*) FROM zapisi WHERE korisnik IS NOT NULL AND korisnik_id IS NULL;
IF @unmatchedKorisnik > 0
BEGIN
    PRINT 'WARNING: ' + CAST(@unmatchedKorisnik AS VARCHAR) + ' records have korisnik values that do not match any entry in korisnik table!';
    SELECT DISTINCT korisnik FROM zapisi WHERE korisnik IS NOT NULL AND korisnik_id IS NULL;
    RAISERROR('Migration halted: unmatched korisnik values found. Please review and fix manually.', 16, 1);
    RETURN;
END

-- Step 4: Make the new columns NOT NULL (now that they're populated)
PRINT 'Step 4: Making new columns NOT NULL...';
ALTER TABLE zapisi ALTER COLUMN tema_id INT NOT NULL;
ALTER TABLE zapisi ALTER COLUMN korisnik_id INT NOT NULL;

-- Step 5: Drop old indexes on tema and korisnik columns
PRINT 'Step 5: Dropping old indexes...';
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_tema' AND object_id = OBJECT_ID('zapisi'))
    DROP INDEX idx_tema ON zapisi;
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_korisnik' AND object_id = OBJECT_ID('zapisi'))
    DROP INDEX idx_korisnik ON zapisi;

-- Step 6: Drop old columns
PRINT 'Step 6: Dropping old tema and korisnik columns...';
ALTER TABLE zapisi DROP COLUMN tema;
ALTER TABLE zapisi DROP COLUMN korisnik;

-- Step 7: Add foreign key constraints
PRINT 'Step 7: Adding foreign key constraints...';
ALTER TABLE zapisi 
    ADD CONSTRAINT FK_zapisi_tema 
    FOREIGN KEY (tema_id) REFERENCES teme(id);

ALTER TABLE zapisi 
    ADD CONSTRAINT FK_zapisi_korisnik 
    FOREIGN KEY (korisnik_id) REFERENCES korisnik(id);

-- Step 8: Create new indexes on foreign key columns
PRINT 'Step 8: Creating new indexes...';
CREATE INDEX idx_tema_id ON zapisi(tema_id);
CREATE INDEX idx_korisnik_id ON zapisi(korisnik_id);

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

PRINT 'Migration script completed.';
