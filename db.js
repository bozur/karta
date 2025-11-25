const sql = require('msnodesqlv8');
require('dotenv').config();

const connString = "Driver={ODBC Driver 17 for SQL Server};Server=.\\SQLEXPRESS;Database=map;Trusted_Connection=yes;";

// Simple wrapper to mimic mssql interface used in server.js
class Request {
    constructor(conn) {
        this.conn = conn;
        this.params = {};
    }

    input(name, type, value) {
        // msnodesqlv8 doesn't use named parameters in the same way, 
        // but for simple queries we might need to handle this.
        // However, server.js uses @param syntax. 
        // msnodesqlv8 supports query(query, params, callback).
        // We'll store params and try to map them.
        this.params[name] = value;
        return this;
    }

    query(command) {
        return new Promise((resolve, reject) => {
            // Replace @param with ? for msnodesqlv8 if needed, or use its parameter support.
            // msnodesqlv8 supports prepared statements but the syntax is different.
            // For this migration, we'll try to use the direct query if no params, 
            // or basic parameter substitution if possible.
            // Actually, msnodesqlv8 supports @params if we use the right method.

            // For simplicity and compatibility with the existing server.js which uses
            // input('name', type, value) and @name in query:

            this.conn.query(command, Object.values(this.params), (err, rows) => {
                if (err) return reject(err);
                resolve({ recordset: rows });
            });
        });
    }
}

class Pool {
    constructor(conn) {
        this.conn = conn;
    }

    request() {
        return new Request(this.conn);
    }
}

const poolPromise = new Promise((resolve, reject) => {
    sql.open(connString, (err, conn) => {
        if (err) {
            console.error('Database Connection Failed!', err);
            reject(err);
            return;
        }
        console.log('Connected to SQL Server via Native Client (Direct)');
        resolve(new Pool(conn));
    });
});

// Mock sql types for server.js compatibility
const sqlTypes = {
    Int: 'Int',
    NVarChar: 'NVarChar',
    Bit: 'Bit'
};

module.exports = {
    poolPromise,
    sql: sqlTypes
};
