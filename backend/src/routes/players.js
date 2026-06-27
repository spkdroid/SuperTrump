const router = require('express').Router();
const { pool } = require('../db');

const AVATAR_COLORS = [
  '#E91E63','#9C27B0','#3F51B5','#2196F3','#00BCD4',
  '#4CAF50','#FF9800','#F44336','#009688','#FF5722',
];

// GET /api/players
router.get('/', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, avatar_color, total_score, games_played, games_won,
              rounds_played, rounds_as_bidder, rounds_won_as_bidder, created_at
       FROM players ORDER BY total_score DESC, name`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/players/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const playerRes = await pool.query('SELECT * FROM players WHERE id = $1', [id]);
    if (!playerRes.rows.length) return res.status(404).json({ error: 'Player not found' });

    const gamesRes = await pool.query(
      `SELECT g.id, g.name, g.status, gp.current_score, gp.final_rank, g.created_at
       FROM game_players gp
       JOIN games g ON g.id = gp.game_id
       WHERE gp.player_id = $1 ORDER BY g.created_at DESC LIMIT 20`,
      [id]
    );

    res.json({ ...playerRes.rows[0], games: gamesRes.rows });
  } catch (err) { next(err); }
});

// POST /api/players
router.post('/', async (req, res, next) => {
  try {
    const { name, avatar_color } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    const color = avatar_color ||
      AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const result = await pool.query(
      `INSERT INTO players (name, avatar_color) VALUES ($1, $2) RETURNING *`,
      [name.trim(), color]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Player name already exists' });
    next(err);
  }
});

// PUT /api/players/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, avatar_color } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    const result = await pool.query(
      `UPDATE players SET name = $1, avatar_color = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [name.trim(), avatar_color, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Player not found' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Player name already exists' });
    next(err);
  }
});

// DELETE /api/players/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM players WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Player not found' });
    res.json({ message: 'Player deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
