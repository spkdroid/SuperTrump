const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         SERIAL PRIMARY KEY,
        username   VARCHAR(64) NOT NULL UNIQUE,
        role       VARCHAR(16) NOT NULL DEFAULT 'user'
                     CHECK (role IN ('user', 'admin')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      ALTER TABLE games
      ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(id)
    `);

    await client.query(`
      ALTER TABLE games
      DROP CONSTRAINT IF EXISTS games_num_players_check
    `);

    await client.query(`
      ALTER TABLE games
      ADD CONSTRAINT games_num_players_check CHECK (num_players >= 3)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_games_owner_user_id
      ON games(owner_user_id)
    `);

    await client.query(`
      INSERT INTO users (username, role)
      VALUES ('admin', 'admin')
      ON CONFLICT (username) DO NOTHING
    `);

    await client.query(`
      UPDATE games
      SET owner_user_id = (SELECT id FROM users WHERE username = 'admin')
      WHERE owner_user_id IS NULL
    `);

    await client.query('COMMIT');
    console.log('✅  Database migrations ready');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

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

module.exports = { pool, waitForDB, runMigrations };
