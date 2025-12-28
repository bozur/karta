const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection configuration
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/map';

const pool = new Pool({
    connectionString: connectionString
});

// Helper to convert MSSQL params (@foo) to Postgres params ($1)
function prepareQuery(text, inputs) {
    let paramIndex = 1;
    const params = [];
    const sortedKeys = Object.keys(inputs).sort((a, b) => b.length - a.length);

    let processedText = text;
    for (const key of sortedKeys) {
        const regex = new RegExp('@' + key + '\\b', 'g');
        if (regex.test(processedText)) {
            processedText = processedText.replace(regex, `$${paramIndex++}`);
            params.push(inputs[key]);
        }
    }

    processedText = processedText
        .replace(/GETDATE\(\)/gi, 'CURRENT_TIMESTAMP')
        .replace(/GETUTCDATE\(\)/gi, 'CURRENT_TIMESTAMP')
        .replace(/ISNULL\(/gi, 'COALESCE(')
        .replace(/LEN\(/gi, 'LENGTH(')
        //.replace(/OUTPUT INSERTED\.id/gi, 'RETURNING id') // Disabled: handled manually in server.js
        //.replace(/TOP\s+(\d+)/gi, 'LIMIT $1') // Disabled: This naive replace breaks 'SELECT TOP' queries. Using complex logic below instead.
        .replace(/DATETIME2/gi, 'TIMESTAMP')
        .replace(/CAST\((.*?) AS N?VARCHAR(\(\d+\))?\)/gi, 'CAST($1 AS VARCHAR)');

    // Handle initial TOP N if not caught by simple regex (e.g. combined with SELECT)
    const topMatch = processedText.match(/SELECT\s+TOP\s+(\d+)\s+([\s\S]*)/i);
    if (topMatch) {
        processedText = `SELECT ${topMatch[2]} LIMIT ${topMatch[1]}`;
    }

    return { text: processedText, params };
}

// MSSQL Compatibility Layer with Transaction Support
const sql = {
    Int: 'int',
    NVarChar: 'varchar',
    DateTime2: 'timestamp',
    VarChar: 'varchar',
    Text: 'text',
    Bit: 'boolean',

    Transaction: class {
        constructor(poolWrapper) {
            // Ignore poolWrapper, use global pg pool
            this.client = null;
        }

        async begin() {
            this.client = await pool.connect();
            await this.client.query('BEGIN');
        }

        async commit() {
            if (this.client) {
                await this.client.query('COMMIT');
                this.client.release();
                this.client = null;
            }
        }

        async rollback() {
            if (this.client) {
                try {
                    await this.client.query('ROLLBACK');
                } catch (err) {
                    console.error('Error rolling back transaction', err);
                } finally {
                    this.client.release();
                    this.client = null;
                }
            }
        }
    },

    Request: class {
        constructor(transactionOrConnection) {
            this.transaction = transactionOrConnection instanceof sql.Transaction ? transactionOrConnection : null;
            this.inputs = {};
        }

        input(name, type, value) {
            this.inputs[name] = value;
            return this;
        }

        async query(text) {
            const { text: processedText, params } = prepareQuery(text, this.inputs);

            try {
                let result;
                if (this.transaction && this.transaction.client) {
                    result = await this.transaction.client.query(processedText, params);
                } else {
                    result = await pool.query(processedText, params);
                }

                return {
                    recordset: result.rows,
                    rowsAffected: [result.rowCount],
                    rows: result.rows
                };
            } catch (err) {
                console.error('PostgreSQL Query Error:', err.message);
                console.error('Query:', processedText);
                console.error('Params:', params);
                throw err;
            }
        }
    }
};

const poolPromise = (async () => {
    try {
        // Test connection
        const client = await pool.connect();
        console.log('Connected to PostgreSQL');
        client.release();

        // Return a mock pool object that server.js expects
        return {
            request: () => new sql.Request(),
            query: async (text) => {
                const { text: processedText, params } = prepareQuery(text, {}); // No inputs for raw query
                const result = await pool.query(processedText, params);
                return {
                    recordset: result.rows,
                    rowsAffected: [result.rowCount]
                };
            }
        };
    } catch (err) {
        console.error('PostgreSQL Connection Failed!', err);
        throw err;
    }
})();

module.exports = {
    sql,
    poolPromise,
    pool
};
