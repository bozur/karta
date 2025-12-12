const sql = require('mssql/msnodesqlv8');

const drivers = [
    '{ODBC Driver 17 for SQL Server}',
    '{SQL Server}',
    '{SQL Server Native Client 11.0}',
    '{ODBC Driver 13 for SQL Server}',
    '{ODBC Driver 11 for SQL Server}'
];

const servers = [
    '.\\SQLEXPRESS',
    '(local)\\SQLEXPRESS',
    'localhost\\SQLEXPRESS'
];

async function testConnection() {
    console.log("Starting connection tests...");

    for (const driver of drivers) {
        for (const server of servers) {
            const connString = `Driver=${driver};Server=${server};Database=map;Trusted_Connection=yes;`;
            console.log(`Trying: ${connString}`);

            try {
                const pool = new sql.ConnectionPool(connString);
                await pool.connect();
                console.log(`✅ SUCCESS! Connected with: ${connString}`);
                await pool.close();
                return; // Stop after first success
            } catch (err) {
                console.log(`❌ Failed: ${err.message}`);
            }
        }
    }
    console.log("All tests failed.");
}

testConnection();
