const { poolPromise, sql } = require('../db');

async function createTable() {
    try {
        const pool = await poolPromise;
        const request = new sql.Request();

        console.log('--- CLEANING AND CREATING table_7 ---');
        console.log('Dropping all variations of table_7...');
        await request.query(`DROP TABLE IF EXISTS "Table_7" CASCADE;`);
        await request.query(`DROP TABLE IF EXISTS "table_7" CASCADE;`);

        console.log('Creating table "table_7" (lowercase) with EXACT table_1 schema...');
        await request.query(`
            CREATE TABLE "table_7" (
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
        `);

        console.log('Table "table_7" created successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error creating table:', err);
        process.exit(1);
    }
}

createTable();
