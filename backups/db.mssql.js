const sql = require('mssql/msnodesqlv8');
require('dotenv').config();

const config = {
    connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=.\\SQLEXPRESS;Database=map;Trusted_Connection=yes;'
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('Connected to SQL Server via mssql/msnodesqlv8');
        return pool;
    })
    .catch(err => {
        console.error('Database Connection Failed! Bad Config: ', err);
        throw err;
    });

module.exports = {
    sql,
    poolPromise
};
