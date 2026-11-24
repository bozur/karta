-- Табела за минималну евиденцију послатих порука са контакт стране
-- Чувају се искључиво: ID, наслов, исечак (првих 10 карактера + '...') и време слања

CREATE TABLE IF NOT EXISTS kontakt_poruke (
    id SERIAL PRIMARY KEY,
    naslov VARCHAR(150) NOT NULL,
    isecak VARCHAR(20) NOT NULL,
    poslato_u TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kontakt_poruke_poslato_u
    ON kontakt_poruke (poslato_u DESC, id DESC);
