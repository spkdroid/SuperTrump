const router = require('express').Router();
const { pool } = require('../db');

// Round creation lives in games.js -> POST /api/games/:id/rounds
// This router handles individual round look-up and undo only.

// GET /api/rounds/:id
router.get('/:id', async (req, res, next) => {
  try {
    const rRes = await pool.query('SELECT * FROM rounds WHERE id = $1', [req.params.id]);
    if (!rRes.rows.length) return res.status(404).json({ error: 'Round not found' });
    const rpRes = await pool.query(
      `SELECT rp.*, p.name AS player_name, p.avatar_color
       FROM round_players rp JOIN players p ON p.id = rp.player_id
       WHERE rp.round_id = $1 ORDER BY rp.role`,
      [req.params.id]
    );
    res.json({ ...rRes.rows[0], participants: rpRes.rows });
  } catch (err) { next(err); }
});

// DELETE /api/rounds/:id  - undo a round and reverse all scores
router.delete('/:id', async (req, res, next) => {
  const rRes = await pool.query('SELECT * FROM rounds WHERE id = $1', [req.params.id]);
  if (!rRes.rows.length) return res.status(404).json({ error: 'Round not found' });
  const round = rRes.rows[0];

  const rpRes = await pool.query(
    'SELECT player_id, score FROM round_players WHERE round_id = $1',
    [req.params.id]
  );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const rp of rpRes.rows) {
      await client.query(
        `UPDATE game_players SET current_score = current_score - $1
         WHERE game_id = $2 AND player_id = $3`,
        [rp.score, round.game_id, rp.player_id]
      );
    }

    await client.query(
      `UPDATE players SET
         rounds_played        = GREATEST(0, rounds_played - 1),
         rounds_as_bidder     = GREATEST(0, rounds_as_bidder - 1),
         rounds_won_as_bidder = GREATEST(0, rounds_won_as_bidder - $1),
         updated_at = NOW()
       WHERE id = $2`,
      [round.bid_won ? 1 : 0, round.bidder_id]
    );

    for (const rp of rpRes.rows) {
      if (rp.player_id !== round.bidder_id) {
        await client.query(
          `UPDATE players SET rounds_played = GREATEST(0, rounds_played - 1), updated_at = NOW() WHERE id = $1`,
          [rp.player_id]
        );
      }
    }

    await client.query('DELETE FROM rounds WHERE id = $1', [req.params.id]);

    await client.query(
      `UPDATE games SET current_round = (
         SELECT COALESCE(MAX(round_number), 0) FROM rounds WHERE game_id = $1
       ), updated_at = NOW() WHERE id = $1`,
      [round.game_id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Round deleted and scores reversed' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
});

module.exports = router;
