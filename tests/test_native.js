const sql = require('msnodesqlv8');

const connString = "Driver={ODBC Driver 17 for SQL Server};Server=.\\SQLEXPRESS;Database=map;Trusted_Connection=yes;";

console.log("Testing msnodesqlv8 direct connection...");
console.log("String: " + connString);

sql.open(connString, (err, conn) => {
    if (err) {
        console.error("❌ Open Failed:", err);
        return;
    }
    console.log("✅ Open Success!");

    conn.query("SELECT 1 as val", (err, rows) => {
        if (err) {
            console.error("❌ Query Failed:", err);
        } else {
            console.log("✅ Query Success:", rows);
        }
        conn.close(() => {
            console.log("Closed.");
        });
    });
});
