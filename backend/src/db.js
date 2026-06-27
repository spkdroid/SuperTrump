const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

async function waitForDB(retries = 20, delayMs = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅  Database ready');
      return;
    } catch (err) {
      console.log(`⏳  Waiting for database… (${i}/${retries}) – ${err.message}`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error('Could not connect to database after maximum retries');
}

module.exports = { pool, waitForDB };
