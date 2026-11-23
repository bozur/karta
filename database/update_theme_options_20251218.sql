-- ============================================
-- Add options to Theme 5: "страдања Срба"
-- Database: MSSQL (SQL Server)
-- Created: 2025-12-18
-- ============================================

BEGIN TRANSACTION;

BEGIN TRY
    -- Add new options to Theme 5: "страдања Срба"
    -- razred: од комуниста (redosled 9), од Срба (redosled 10)
    
    -- First check if they already exist to avoid duplicates if script is run twice
    IF NOT EXISTS (SELECT 1 FROM teme_opcije WHERE tema_id = 5 AND tip = 'razred' AND vrednost = N'од комуниста')
    BEGIN
        INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'razred', 9, N'од комуниста');
    END

    IF NOT EXISTS (SELECT 1 FROM teme_opcije WHERE tema_id = 5 AND tip = 'razred' AND vrednost = N'од Срба')
    BEGIN
        INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'razred', 10, N'од Срба');
    END

    COMMIT TRANSACTION;
    PRINT 'Updates applied successfully.';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT 'Error occurred: ' + ERROR_MESSAGE();
    THROW;
END CATCH;
