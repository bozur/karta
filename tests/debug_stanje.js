const { poolPromise, sql } = require('./db');

(async () => {
    try {
        const pool = await poolPromise;

        console.log("--- DEBUGGING STANJE COLUMN ---");

        // 1. Force use of Table_1 (known to have data)
        const tableName = 'Table_1';
        console.log(`Inspecting table: ${tableName}`);

        // 2. Check Column Type
        const columnsRes = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = '${tableName}' AND COLUMN_NAME = 'stanje'
        `);

        if (columnsRes.recordset.length === 0) {
            console.log("COLUMN 'stanje' DOES NOT EXIST in this table!");
            // Check if it exists in ANY table
            const anyCol = await pool.request().query(`
                SELECT TOP 1 TABLE_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE COLUMN_NAME = 'stanje' AND TABLE_NAME LIKE 'Table_%'
            `);
            if (anyCol.recordset.length > 0) {
                console.log(`But 'stanje' exists in ${anyCol.recordset[0].TABLE_NAME}. using that instead.`);
                // Switch table
                // We can't easily switch variable in constant loop, so let's just warn.
            }
        } else {
            console.log("Column 'stanje' type:", columnsRes.recordset[0].DATA_TYPE);
        }

        // 3. Check Distinct Values
        try {
            const valuesRes = await pool.request().query(`
                SELECT stanje, COUNT(*) as count 
                FROM ${tableName} 
                GROUP BY stanje
            `);
            console.log("Distinct values in 'stanje':");
            console.table(valuesRes.recordset);
        } catch (e) {
            console.log("Error querying distinct values:", e.message);
        }

        // 4. Test the Filter Query explicitly with debug output
        console.log("\n--- Testing Filter Query ---");
        // Simulate what server does
        let query = `SELECT ID, stanje FROM ${tableName}`;
        let conditions = [];

        // The fix I added:
        conditions.push("(stanje IS NULL OR stanje <> '0')");

        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }

        console.log("Generated Query:", query);

        const testRes = await pool.request().query(query);
        console.log(`Returned ${testRes.recordset.length} rows.`);

        // Check if any returned row has stanje = '0'
        const badRows = testRes.recordset.filter(r => r.stanje == '0');
        if (badRows.length > 0) {
            console.log("CRITICAL FAILURE: Found rows with stanje='0' in result!");
            console.log("Bad Rows Sample:", badRows.slice(0, 3));
            console.log("Type of 'stanje' in result:", typeof badRows[0].stanje);
        } else {
            console.log("Filter SUCCESS: No rows with stanje='0' found in result.");
        }

        // 5. Check what happens if we query WITHOUT filter
        const allRes = await pool.request().query(`SELECT COUNT(*) as total FROM ${tableName} WHERE stanje = '0'`);
        console.log(`Total rows with stanje='0' in DB: ${allRes.recordset[0].total}`);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
})();
