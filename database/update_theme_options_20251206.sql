-- ============================================
-- Update Theme Options for IDs 4, 5, 6
-- Database: MSSQL (SQL Server)
-- Created: 2025-12-06
-- ============================================

BEGIN TRANSACTION;

BEGIN TRY
    -- 1. Rename Theme 5: "страдања људи" -> "страдања Срба"
    UPDATE teme
    SET naziv = N'страдања Срба'
    WHERE id = 5;

    -- 2. Delete existing options for themes 4, 5, 6
    DELETE FROM teme_opcije WHERE tema_id IN (4, 5, 6);

    -- 3. Insert new options for Theme 4: "логори за Србе"
    -- razred: хрватски/бугарски/њемачки/турски/шиптарски/талијански/комунистички
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (4, 'razred', 0, N'хрватски');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (4, 'razred', 1, N'бугарски');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (4, 'razred', 2, N'њемачки');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (4, 'razred', 3, N'турски');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (4, 'razred', 4, N'шиптарски');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (4, 'razred', 5, N'талијански');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (4, 'razred', 6, N'комунистички');

    -- vrsta: војни/политички/цивилни/општи
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (4, 'vrsta', 0, N'војни');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (4, 'vrsta', 1, N'политички');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (4, 'vrsta', 2, N'цивилни');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (4, 'vrsta', 3, N'општи');

    -- podvrsta: радни/сабирни/за истребљење
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (4, 'podvrsta', 0, N'радни');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (4, 'podvrsta', 1, N'сабирни');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (4, 'podvrsta', 2, N'за истребљење');


    -- 4. Insert new options for Theme 5: "страдања Срба"
    -- razred: од Грка/од Турака/од Нијемаца/од Маџара/од Бугара/од Хрвата/од босанских муслимана/од Шиптара/од Талијана
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'razred', 0, N'од Грка');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'razred', 1, N'од Турака');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'razred', 2, N'од Нијемаца');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'razred', 3, N'од Маџара');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'razred', 4, N'од Бугара');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'razred', 5, N'од Хрвата');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'razred', 6, N'од босанских муслимана');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'razred', 7, N'од Шиптара');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'razred', 8, N'од Талијана');

    -- vrsta and podvrsta not specified in basic request, so leaving empty or reusing previous? 
    -- The request said "For the theme 'страдања Срба': options for razred values should be..."
    -- It didn't specify vrsta/podvrsta changes for this theme. 
    -- However, the delete command removed ALL options for theme 5. 
    -- I will assume the user only wanted to change razred and maybe didn't mention others because they want them empty or reused.
    -- But since I deleted them, I should probably check if I should keep the old ones. 
    -- Looking at previous values in populate_teme_opcije_table.sql:
    -- Old `vrsta`: човјек, дијете, жена, старији, војник
    -- Old `podvrsta`: силовање, мучење, убиство, рањавање, протјеривање
    -- Given the user was very specific about lists for everything else, I will restore the old vrsta/podvrsta for theme 5 as a safe default, 
    -- OR leave them empty if the user intends to clear them. 
    -- Usually "instead of current options" implies replacement. 
    -- I'll re-insert the old `vrsta` and `podvrsta` for Theme 5 to be safe, as the user only explicitly redefined `razred`.
    
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'vrsta', 0, N'човјек');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'vrsta', 1, N'дијете');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'vrsta', 2, N'жена');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'vrsta', 3, N'старији');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'vrsta', 4, N'војник');

    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'podvrsta', 0, N'силовање');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'podvrsta', 1, N'мучење');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'podvrsta', 2, N'убиство');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'podvrsta', 3, N'рањавање');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'podvrsta', 4, N'протјеривање');


    -- 5. Insert new options for Theme 6: "границе"
    -- razred: царевина/краљевина/кнежевина/деспотовина/војводство/република
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'razred', 0, N'царевина');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'razred', 1, N'краљевина');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'razred', 2, N'кнежевина');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'razred', 3, N'деспотовина');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'razred', 4, N'војводство');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'razred', 5, N'република');

    -- vrsta: Србска/Руска/Немачка/Римска/Бугарска/Турска
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'vrsta', 0, N'Србска');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'vrsta', 1, N'Руска');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'vrsta', 2, N'Немачка');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'vrsta', 3, N'Римска');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'vrsta', 4, N'Бугарска');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'vrsta', 5, N'Турска');

    -- podvrsta: плава/црвена/сива/црна/зелена/сива(duplicate)/жута/наранџаста/бела
    -- Distinct values: плава, црвена, сива, црна, зелена, жута, наранџаста, бела
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'podvrsta', 0, N'плава');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'podvrsta', 1, N'црвена');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'podvrsta', 2, N'сива');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'podvrsta', 3, N'црна');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'podvrsta', 4, N'зелена');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'podvrsta', 5, N'жута');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'podvrsta', 6, N'наранџаста');
    INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'podvrsta', 7, N'бела');

    COMMIT TRANSACTION;
    PRINT 'Updates applied successfully.';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT 'Error occurred: ' + ERROR_MESSAGE();
END CATCH;
