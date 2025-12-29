-- Refined PostgreSQL Schema (Automated from MSSQL)
-- Use this to replace the previous schema

DROP TABLE IF EXISTS "novosti" CASCADE;
CREATE TABLE "novosti" (
  "id" SERIAL PRIMARY KEY,
  "vrijeme" TIMESTAMP WITH TIME ZONE,
  "opis" VARCHAR(4000),
  "uneo" INTEGER
);

DROP TABLE IF EXISTS "table_1" CASCADE;
CREATE TABLE "table_1" (
  "id" SERIAL PRIMARY KEY,
  "vrsta" VARCHAR(2),
  "podvrsta" VARCHAR(2),
  "razred" VARCHAR(2),
  "prostorno" TEXT,
  "prostorno2" TEXT,
  "tp" VARCHAR(2),
  "vrijeme0" TIMESTAMP WITH TIME ZONE,
  "vrijeme1" TIMESTAMP WITH TIME ZONE,
  "tv" VARCHAR(2),
  "opis" VARCHAR(255),
  "izvor" VARCHAR(255),
  "dodao" INTEGER,
  "dodao_vrijeme" TIMESTAMP WITH TIME ZONE,
  "odobrio" INTEGER,
  "odobrio_vrijeme" TIMESTAMP WITH TIME ZONE,
  "tacke" TEXT,
  "tacke0" VARCHAR(4000),
  "zapis" INTEGER,
  "stanje" VARCHAR(2),
  "izmjenio" INTEGER,
  "izmjenio_vrijeme" TIMESTAMP WITH TIME ZONE
);

DROP TABLE IF EXISTS "table_2" CASCADE;
CREATE TABLE "table_2" (
  "id" SERIAL PRIMARY KEY,
  "vrsta" VARCHAR(2),
  "podvrsta" VARCHAR(2),
  "razred" VARCHAR(2),
  "prostorno" TEXT,
  "prostorno2" TEXT,
  "tp" VARCHAR(2),
  "vrijeme0" TIMESTAMP WITH TIME ZONE,
  "vrijeme1" TIMESTAMP WITH TIME ZONE,
  "tv" VARCHAR(2),
  "opis" VARCHAR(255),
  "izvor" VARCHAR(255),
  "dodao" INTEGER,
  "dodao_vrijeme" TIMESTAMP WITH TIME ZONE,
  "odobrio" INTEGER,
  "odobrio_vrijeme" TIMESTAMP WITH TIME ZONE,
  "tacke" TEXT,
  "tacke0" VARCHAR(4000),
  "zapis" INTEGER,
  "stanje" VARCHAR(2),
  "izmjenio" INTEGER,
  "izmjenio_vrijeme" TIMESTAMP WITH TIME ZONE
);

DROP TABLE IF EXISTS "table_3" CASCADE;
CREATE TABLE "table_3" (
  "id" SERIAL PRIMARY KEY,
  "vrsta" VARCHAR(2),
  "podvrsta" VARCHAR(2),
  "razred" VARCHAR(2),
  "prostorno" TEXT,
  "prostorno2" TEXT,
  "tp" VARCHAR(2),
  "vrijeme0" TIMESTAMP WITH TIME ZONE,
  "vrijeme1" TIMESTAMP WITH TIME ZONE,
  "tv" VARCHAR(2),
  "opis" VARCHAR(255),
  "izvor" VARCHAR(255),
  "dodao" INTEGER,
  "dodao_vrijeme" TIMESTAMP WITH TIME ZONE,
  "odobrio" INTEGER,
  "odobrio_vrijeme" TIMESTAMP WITH TIME ZONE,
  "tacke" TEXT,
  "tacke0" VARCHAR(4000),
  "zapis" INTEGER,
  "stanje" VARCHAR(2),
  "izmjenio" INTEGER,
  "izmjenio_vrijeme" TIMESTAMP WITH TIME ZONE
);

DROP TABLE IF EXISTS "table_4" CASCADE;
CREATE TABLE "table_4" (
  "id" SERIAL PRIMARY KEY,
  "vrsta" VARCHAR(2),
  "podvrsta" VARCHAR(2),
  "razred" VARCHAR(2),
  "prostorno" TEXT,
  "prostorno2" TEXT,
  "tp" VARCHAR(2),
  "vrijeme0" TIMESTAMP WITH TIME ZONE,
  "vrijeme1" TIMESTAMP WITH TIME ZONE,
  "tv" VARCHAR(2),
  "opis" VARCHAR(255),
  "izvor" VARCHAR(255),
  "dodao" INTEGER,
  "dodao_vrijeme" TIMESTAMP WITH TIME ZONE,
  "odobrio" INTEGER,
  "odobrio_vrijeme" TIMESTAMP WITH TIME ZONE,
  "tacke" TEXT,
  "tacke0" VARCHAR(4000),
  "zapis" INTEGER,
  "stanje" VARCHAR(2),
  "izmjenio" INTEGER,
  "izmjenio_vrijeme" TIMESTAMP WITH TIME ZONE
);

DROP TABLE IF EXISTS "table_5" CASCADE;
CREATE TABLE "table_5" (
  "id" SERIAL PRIMARY KEY,
  "vrsta" VARCHAR(2),
  "podvrsta" VARCHAR(2),
  "razred" VARCHAR(2),
  "prostorno" TEXT,
  "prostorno2" TEXT,
  "tp" VARCHAR(2),
  "vrijeme0" TIMESTAMP WITH TIME ZONE,
  "vrijeme1" TIMESTAMP WITH TIME ZONE,
  "tv" VARCHAR(2),
  "opis" VARCHAR(255),
  "izvor" VARCHAR(255),
  "dodao" INTEGER,
  "dodao_vrijeme" TIMESTAMP WITH TIME ZONE,
  "odobrio" INTEGER,
  "odobrio_vrijeme" TIMESTAMP WITH TIME ZONE,
  "tacke" TEXT,
  "tacke0" VARCHAR(4000),
  "zapis" INTEGER,
  "stanje" VARCHAR(2),
  "izmjenio" INTEGER,
  "izmjenio_vrijeme" TIMESTAMP WITH TIME ZONE
);

DROP TABLE IF EXISTS "table_6" CASCADE;
CREATE TABLE "table_6" (
  "id" SERIAL PRIMARY KEY,
  "vrsta" VARCHAR(2),
  "podvrsta" VARCHAR(2),
  "razred" VARCHAR(2),
  "prostorno" TEXT,
  "prostorno2" TEXT,
  "tp" VARCHAR(2),
  "vrijeme0" TIMESTAMP WITH TIME ZONE,
  "vrijeme1" TIMESTAMP WITH TIME ZONE,
  "tv" VARCHAR(2),
  "opis" VARCHAR(255),
  "izvor" VARCHAR(255),
  "dodao" INTEGER,
  "dodao_vrijeme" TIMESTAMP WITH TIME ZONE,
  "odobrio" INTEGER,
  "odobrio_vrijeme" TIMESTAMP WITH TIME ZONE,
  "tacke" TEXT,
  "tacke0" VARCHAR(4000),
  "zapis" INTEGER,
  "stanje" VARCHAR(2),
  "izmjenio" INTEGER,
  "izmjenio_vrijeme" TIMESTAMP WITH TIME ZONE
);

DROP TABLE IF EXISTS "comments" CASCADE;
CREATE TABLE "comments" (
  "id" SERIAL PRIMARY KEY,
  "parent" INTEGER,
  "target_type" VARCHAR(50) NOT NULL,
  "target_id" INTEGER NOT NULL,
  "created" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "modified" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "content" TEXT,
  "creator" INTEGER,
  "fullname" VARCHAR(255),
  "profile_picture_url" VARCHAR(255),
  "upvote_count" INTEGER,
  "user_has_upvoted" BOOLEAN,
  "is_new" BOOLEAN,
  "created_by_admin" BOOLEAN,
  "created_by_current_user" BOOLEAN,
  "downvote_count" INTEGER
);

DROP TABLE IF EXISTS "comment_upvotes" CASCADE;
CREATE TABLE "comment_upvotes" (
  "id" SERIAL PRIMARY KEY,
  "comment_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL
);

DROP TABLE IF EXISTS "comment_downvotes" CASCADE;
CREATE TABLE "comment_downvotes" (
  "id" SERIAL PRIMARY KEY,
  "comment_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL
);

DROP TABLE IF EXISTS "korisnik" CASCADE;
CREATE TABLE "korisnik" (
  "id" SERIAL PRIMARY KEY,
  "ime" VARCHAR(20),
  "prezime" VARCHAR(20),
  "korisnik" VARCHAR(20),
  "eposta" VARCHAR(50) UNIQUE,
  "slika_url" VARCHAR(255),
  "lozinka" VARCHAR(255),
  "stavka" INTEGER,
  "stavka_cekanje" INTEGER,
  "stavka_obrisano" INTEGER,
  "dogadjaj" INTEGER,
  "dogadjaj_cekanje" INTEGER,
  "dogadjaj_obrisano" INTEGER,
  "primedba" INTEGER,
  "primedba_obrisano" TEXT,
  "pristup0" TIMESTAMP WITH TIME ZONE,
  "pristup1" TIMESTAMP WITH TIME ZONE,
  "urednik" VARCHAR(50),
  "zabranjen" BOOLEAN,
  "brojac_pristupa" INTEGER,
  "moze_ucitati" BOOLEAN,
  "brojac_poste" INTEGER,
  "brojac_stavki" INTEGER,
  "brojac_zapisa" INTEGER,
  "brojac_primjedbi" INTEGER,
  "brojac_dogadjaja" INTEGER,
  "obavjestenja" BOOLEAN,
  "blokiran" BOOLEAN,
  "napomena" TEXT
);

DROP TABLE IF EXISTS "zapisi" CASCADE;
CREATE TABLE "zapisi" (
  "id" SERIAL PRIMARY KEY,
  "naziv" VARCHAR(255) NOT NULL,
  "opis" TEXT,
  "tagovi" TEXT,
  "file_path" VARCHAR(500) NOT NULL,
  "file_type" VARCHAR(10) NOT NULL,
  "file_size" INTEGER,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "tema_id" INTEGER NOT NULL,
  "korisnik_id" INTEGER NOT NULL,
  "stanje" VARCHAR(2)
);

DROP TABLE IF EXISTS "teme" CASCADE;
CREATE TABLE "teme" (
  "id" SERIAL PRIMARY KEY,
  "naziv" VARCHAR(50) NOT NULL UNIQUE,
  "opis" VARCHAR(1000),
  "zakljucano" BOOLEAN
);

DROP TABLE IF EXISTS "teme_opcije" CASCADE;
CREATE TABLE "teme_opcije" (
  "id" SERIAL PRIMARY KEY,
  "tema_id" INTEGER NOT NULL,
  "tip" VARCHAR(20) NOT NULL,
  "redosled" INTEGER NOT NULL,
  "vrednost" VARCHAR(100) NOT NULL
);

DROP TABLE IF EXISTS "dogadjaji" CASCADE;
CREATE TABLE "dogadjaji" (
  "id" SERIAL PRIMARY KEY,
  "pocetak" TIMESTAMP WITH TIME ZONE NOT NULL,
  "kraj" TIMESTAMP WITH TIME ZONE,
  "opis" VARCHAR(255) NOT NULL,
  "izvor" VARCHAR(50),
  "korisnik_id" INTEGER NOT NULL,
  "zapis" INTEGER,
  "koordinate" VARCHAR(100),
  "unos" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "stanje" VARCHAR(2)
);

DROP TABLE IF EXISTS "podrska" CASCADE;
CREATE TABLE "podrska" (
  "id" SERIAL PRIMARY KEY,
  "id_korisnik" INTEGER,
  "iznos" TEXT,
  "valuta" TEXT,
  "datum" TIMESTAMP WITH TIME ZONE
);
