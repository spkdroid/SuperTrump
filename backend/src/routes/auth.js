const router = require('express').Router();
const { pool } = require('../db');
const { normalizeUsername, requireUser } = require('../middleware/auth');

function validateUsername(raw) {
  const username = normalizeUsername(raw);
  if (username.length < 3 || username.length > 32) {
    return { ok: false, error: 'Username must be 3 to 32 characters long' };
  }

  const valid = /^[a-zA-Z0-9_ .-]+$/.test(username);
  if (!valid) {
    return { ok: false, error: 'Username can only contain letters, numbers, spaces, dots, dashes, and underscores' };
  }

  return { ok: true, username };
}

// POST /api/auth/login
// Lightweight username session: creates user on first login.
router.post('/login', async (req, res, next) => {
  try {
    const check = validateUsername(req.body?.username);
    if (!check.ok) return res.status(400).json({ error: check.error });

    const { username } = check;
    const result = await pool.query(
      `INSERT INTO users (username, role)
       VALUES (
         $1::varchar(64),
         CASE WHEN LOWER($1::varchar(64)) = 'admin' THEN 'admin' ELSE 'user' END
       )
       ON CONFLICT (username)
       DO UPDATE SET updated_at = NOW()
       RETURNING id, username, role`,
      [username]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireUser, async (req, res) => {
  res.json(req.authUser);
});

module.exports = router;
