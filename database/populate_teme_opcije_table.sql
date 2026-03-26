-- ============================================
-- Populate teme_opcije table with existing hardcoded values
-- Migrated from karta.js table array
-- Database: MSSQL (SQL Server)
-- Created: 2025-11-30
-- Updated: 2025-12-06 (Reflected requested changes for IDs 4, 5, 6)
-- ============================================

-- Theme 1: напади на објекте СПЦ (ID=1)
-- razred options (index 0)
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (1, 'razred', 0, N'црква');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (1, 'razred', 1, N'конак');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (1, 'razred', 2, N'манастир');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (1, 'razred', 3, N'дом');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (1, 'razred', 4, N'капела');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (1, 'razred', 5, N'споменик');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (1, 'razred', 6, N'гробље');

-- vrsta options (index 1)
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (1, 'vrsta', 0, N'оштећено');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (1, 'vrsta', 1, N'уништено');

-- podvrsta options (index 2)
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (1, 'podvrsta', 0, N'спаљено');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (1, 'podvrsta', 1, N'опљачкано');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (1, 'podvrsta', 2, N'поломљено');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (1, 'podvrsta', 3, N'минирано');

-- Theme 2: промјена назива (ID=2)
-- razred options
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (2, 'razred', 0, N'задржано сопство');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (2, 'razred', 1, N'промјена сопства');

-- vrsta options
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (2, 'vrsta', 0, N'Серби');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (2, 'vrsta', 1, N'Славени');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (2, 'vrsta', 2, N'Грци');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (2, 'vrsta', 3, N'Турци');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (2, 'vrsta', 4, N'Нијемци');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (2, 'vrsta', 5, N'Маџари');

-- podvrsta options
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (2, 'podvrsta', 0, N'бријег');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (2, 'podvrsta', 1, N'језеро');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (2, 'podvrsta', 2, N'мјесто');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (2, 'podvrsta', 3, N'море');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (2, 'podvrsta', 4, N'област');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (2, 'podvrsta', 5, N'планина');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (2, 'podvrsta', 6, N'ријека');

-- Theme 3: распрострањеност топонима (ID=3)
-- razred options
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'razred', 0, N'с(е)рб');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'razred', 1, N'влах');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'razred', 2, N'венет/венд');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'razred', 3, N'илир');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'razred', 4, N'косово');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'razred', 5, N'сег/сиг');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'razred', 6, N'слат');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'razred', 7, N'вар');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'razred', 8, N'лоз');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'razred', 9, N'луг');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'razred', 10, N'тер');

-- vrsta options
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'vrsta', 0, N'мјесто');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'vrsta', 1, N'ријека');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'vrsta', 2, N'језеро');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'vrsta', 3, N'море');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (3, 'vrsta', 4, N'област');

-- podvrsta options: empty (no entries)

-- Theme 4: логори за Србе (ID=4)
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

-- Theme 5: страдања Срба (ID=5)
-- razred options: од Грка/од Турака/од Нијемаца/од Маџара/од Бугара/од Хрвата/од босанских муслимана/од Шиптара/од Талијана
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'razred', 0, N'од Грка');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'razred', 1, N'од Турака');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'razred', 2, N'од Нијемаца');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'razred', 3, N'од Маџара');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'razred', 4, N'од Бугара');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'razred', 5, N'од Хрвата');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'razred', 6, N'од босанских муслимана');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'razred', 7, N'од Шиптара');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'razred', 8, N'од Талијана');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'razred', 9, N'од комуниста');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'razred', 10, N'од Срба');

-- vrsta options
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'vrsta', 0, N'човјек');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'vrsta', 1, N'дијете');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'vrsta', 2, N'жена');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'vrsta', 3, N'старији');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'vrsta', 4, N'војник');

-- podvrsta options
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'podvrsta', 0, N'силовање');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'podvrsta', 1, N'мучење');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'podvrsta', 2, N'убиство');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'podvrsta', 3, N'рањавање');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (5, 'podvrsta', 4, N'протјеривање');

-- Theme 6: границе (ID=6)
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

-- podvrsta: плава/црвена/сива/црна/зелена/жута/наранџаста/бела
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'podvrsta', 0, N'плава');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'podvrsta', 1, N'црвена');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'podvrsta', 2, N'сива');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'podvrsta', 3, N'црна');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'podvrsta', 4, N'зелена');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'podvrsta', 5, N'жута');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'podvrsta', 6, N'наранџаста');
INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost) VALUES (6, 'podvrsta', 7, N'бела');

-- Verify insertion
SELECT 
    t.naziv AS tema,
    o.tip,
    COUNT(*) AS broj_opcija
FROM teme_opcije o
INNER JOIN teme t ON o.tema_id = t.id
GROUP BY t.id, t.naziv, o.tip
ORDER BY t.id, o.tip;

-- Show sample data
SELECT TOP 20
    t.naziv AS tema,
    o.tip,
    o.redosled,
    o.vrednost
FROM teme_opcije o
INNER JOIN teme t ON o.tema_id = t.id
ORDER BY t.id, o.tip, o.redosled;
