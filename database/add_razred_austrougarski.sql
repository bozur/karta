-- Dodavanje nove opcije "аустроугарски" (redosled = 7, tj. razred = '7')
-- za temu 4 ("логори за Србе") u tabelu `teme_opcije`

INSERT INTO teme_opcije (tema_id, tip, redosled, vrednost)
SELECT 4, 'razred', 7, 'аустроугарски'
WHERE NOT EXISTS (
    SELECT 1 FROM teme_opcije
    WHERE tema_id = 4 AND tip = 'razred' AND (redosled = 7 OR vrednost = 'аустроугарски')
);
