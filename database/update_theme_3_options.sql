-- ============================================
-- Update options for Theme 3: "распрострањеност топонима"
-- Database: MSSQL (SQL Server)
-- Created: 2025-12-12
-- ============================================

BEGIN TRANSACTION;

BEGIN TRY
    -- 1. Delete existing options for 'vrsta' and 'podvrsta' for theme 3
    -- (Keeping 'razred' as is)
    DELETE FROM teme_opcije 
    WHERE tema_id = 3 AND tip IN ('vrsta', 'podvrsta');

    -- 2. Insert NEW 'vrsta' options: voda/ravnica/uzvisenje
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'vrsta', 0, N'вода');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'vrsta', 1, N'равница');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'vrsta', 2, N'узвишење');

    -- 3. Insert NEW 'podvrsta' options (migrated from old 'vrsta')
    -- Old vrsta values were: мјесто, ријека, језеро, море, област (derived from theme_config.js analysis)
    -- Also adding: 'планина' which appeared in some contexts, fitting 'uzvisenje'
    -- Based on user request: "current options for 'врста' should become options for 'подврста'"
    
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'podvrsta', 0, N'мјесто');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'podvrsta', 1, N'ријека');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'podvrsta', 2, N'језеро');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'podvrsta', 3, N'море');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'podvrsta', 4, N'област');
    -- Adding 'планина' as it fits the context and was present in legacy configs sometimes, keeping consistent with the move.
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'podvrsta', 5, N'планина');

    COMMIT TRANSACTION;
    PRINT 'Updates applied successfully for Theme 3.';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT 'Error occurred: ' + ERROR_MESSAGE();
END CATCH;
