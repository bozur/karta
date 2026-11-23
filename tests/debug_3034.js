const { poolPromise, sql } = require('./db');

(async () => {
    try {
        const pool = await poolPromise;
        const tableName = 'Table_1';
        const targetId = 3034;

        console.log(`--- INSPECTING ID ${targetId} in ${tableName} ---`);

        // 1. Fetch the raw row
        const result = await pool.request().query(`SELECT * FROM ${tableName} WHERE ID = ${targetId}`);

        if (result.recordset.length === 0) {
            console.log("Record not found!");
        } else {
            const row = result.recordset[0];
            console.log("Row found:");
            console.log(`ID: ${row.ID}`);
            console.log(`stanje: '${row.stanje}' (Type: ${typeof row.stanje})`);

            // Check hex of stanje to catch invisible chars
            if (row.stanje) {
                const hex = Buffer.from(row.stanje).toString('hex');
                console.log(`stanje hex: ${hex}`);
            }

            // 2. Test the specific filter condition
            console.log("\nTesting Filter Condition: stanje = '1'");
            const filteredResult = await pool.request().query(`SELECT ID FROM ${tableName} WHERE ID = ${targetId} AND stanje = '1'`);
            if (filteredResult.recordset.length > 0) {
                console.log("MATCHES filter (Should NOT occur if stanje is '0')");
            } else {
                console.log("DOES NOT MATCH filter (Correct behavior)");
            }
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
})();
