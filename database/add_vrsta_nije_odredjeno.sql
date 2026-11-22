-- Dodavanje nove opcije "није одређено" (redosled = 6, tj. vrsta = '6')
-- za temu 2 ("промјена назива") u tabelu `teme_opcije`

INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost)
SELECT 2, 'vrsta', 6, 'није одређено'
WHERE NOT EXISTS (
    SELECT 1 FROM teme_opcije
    WHERE tema_id = 2 AND tip = 'vrsta' AND (redosled = 6 OR vrednost = 'није одређено')
);
