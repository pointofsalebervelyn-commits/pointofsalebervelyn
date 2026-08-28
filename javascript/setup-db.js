require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function setupDatabase() {
    const schema = fs.readFileSync(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('KoraPoint database schema is ready');
    await pool.end();
}

setupDatabase().catch(error => {
    console.error('Database setup failed:', error.message);
    process.exitCode = 1;
});