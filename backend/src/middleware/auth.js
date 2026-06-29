const { pool } = require('../db');

const USERNAME_HEADER = 'x-supertrump-user';

function normalizeUsername(value) {
  return String(value || '').trim();
}

async function fetchUserByUsername(username) {
  const result = await pool.query(
    `SELECT id, username, role FROM users WHERE username = $1`,
    [username]
  );
  return result.rows[0] || null;
}

async function requireUser(req, res, next) {
  try {
    const username = normalizeUsername(req.header(USERNAME_HEADER));
    if (!username) {
      return res.status(401).json({ error: 'Login required' });
    }

    const user = await fetchUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Session is invalid. Please login again.' });
    }

    req.authUser = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

function canManageGame(user, gameOwnerUserId) {
  return Boolean(user && (user.role === 'admin' || user.id === gameOwnerUserId));
}

module.exports = {
  USERNAME_HEADER,
  normalizeUsername,
  fetchUserByUsername,
  requireUser,
  canManageGame,
};
