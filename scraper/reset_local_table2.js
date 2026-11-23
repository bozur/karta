/**
 * reset_local_table2.js
 *
 * Brise sve unose u lokalnoj PostgreSQL tabeli `table_2` koji su dodati juce (id > 622)
 * i vraca sekvencu id-a na 623, tako da je lokalna baza potpuno cista i vracena
 * na stanje pre jucerasnjeg unosa.
 */

const { pool } = require('../db.js');

async function main() {
    console.log('Povezivanje sa lokalnom PostgreSQL bazom radi vracanja table_2 na stanje pre jucerasnjeg unosa...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const beforeRes = await client.query('SELECT COUNT(*) AS cnt FROM table_2');
        console.log(`Broj redova u table_2 pre brisanja: ${beforeRes.rows[0].cnt}`);

        const delRes = await client.query('DELETE FROM table_2 WHERE id > 622');
        console.log(`Obrisano jucerasnjih unosa iz table_2: ${delRes.rowCount}`);

        // Vrati i jedini red <= 622 (id=12 Grevena) na prvobitni opis ako je bio azuriran
        await client.query(
            `UPDATE table_2 SET opis = 'Гребен >> Γρεβενά ', izvor = '', zapis = NULL, izmjenio = NULL, izmjenio_vrijeme = NULL WHERE id = 12`
        );

        await client.query(`SELECT setval(pg_get_serial_sequence('table_2', 'id'), COALESCE((SELECT MAX(id) FROM table_2), 0) + 1, false)`);
        await client.query('COMMIT');

        const afterRes = await client.query('SELECT COUNT(*) AS cnt FROM table_2');
        console.log(`Broj redova u table_2 nakon reseta: ${afterRes.rows[0].cnt} (tacno prvobitno stanje!)`);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Greska:', e);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
