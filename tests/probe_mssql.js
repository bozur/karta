const sql = require('mssql/msnodesqlv8');

const configs = [
    {
        server: '.\\SQLEXPRESS',
        database: 'map',
        options: { trustedConnection: true }
    },
    {
        server: 'localhost\\SQLEXPRESS',
        database: 'map',
        options: { trustedConnection: true }
    },
    {
        server: '(local)\\SQLEXPRESS',
        database: 'map',
        options: { trustedConnection: true }
    },
    {
        connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=.\\SQLEXPRESS;Database=map;Trusted_Connection=yes;'
    },
    {
        connectionString: 'Driver={SQL Server};Server=.\\SQLEXPRESS;Database=map;Trusted_Connection=yes;'
    }
];

async function probe() {
    for (const [i, config] of configs.entries()) {
        console.log(`Attempt ${i + 1}:`, config);
        try {
            const pool = new sql.ConnectionPool(config);
            await pool.connect();
            console.log(`✅ Success with config ${i + 1}`);
            const result = await pool.request().query('SELECT 1 as val');
            console.log('Query result:', result.recordset);
            await pool.close();
            return;
        } catch (err) {
            console.log(`❌ Failed: ${err.message}`);
        }
    }
    console.log('All attempts failed.');
}

probe();
