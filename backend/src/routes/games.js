const router = require('express').Router();
const { pool } = require('../db');

const GAME_WITH_PLAYERS = `
  SELECT g.*,
    COALESCE(
      json_agg(
        json_build_object(
          'id',            p.id,
          'name',          p.name,
          'avatar_color',  p.avatar_color,
          'current_score', gp.current_score,
          'seat_number',   gp.seat_number,
          'final_rank',    gp.final_rank
        ) ORDER BY gp.seat_number
      ) FILTER (WHERE p.id IS NOT NULL),
      '[]'::json
    ) AS players
  FROM games g
  LEFT JOIN game_players gp ON gp.game_id = g.id
  LEFT JOIN players p       ON p.id = gp.player_id
`;

// GET /api/games
router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    const where  = status ? `WHERE g.status = '${status}'` : '';
    const result = await pool.query(
      `${GAME_WITH_PLAYERS} ${where} GROUP BY g.id ORDER BY g.updated_at DESC`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/games/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `${GAME_WITH_PLAYERS} WHERE g.id = $1 GROUP BY g.id`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Game not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// POST /api/games
router.post('/', async (req, res, next) => {
  const { name, playerIds } = req.body;
  if (!Array.isArray(playerIds) || playerIds.length < 3)
    return res.status(400).json({ error: 'At least 3 players are required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const gRes = await client.query(
      `INSERT INTO games (name, num_players) VALUES ($1, $2) RETURNING *`,
      [name?.trim() || `Game ${new Date().toLocaleDateString()}`, playerIds.length]
    );
    const game = gRes.rows[0];

    for (let i = 0; i < playerIds.length; i++) {
      await client.query(
        `INSERT INTO game_players (game_id, player_id, seat_number) VALUES ($1, $2, $3)`,
        [game.id, playerIds[i], i + 1]
      );
    }

    await client.query('COMMIT');

    const full = await pool.query(
      `${GAME_WITH_PLAYERS} WHERE g.id = $1 GROUP BY g.id`, [game.id]
    );
    res.status(201).json(full.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
});

// PUT /api/games/:id  (rename / status change only – scores are managed via rounds)
router.put('/:id', async (req, res, next) => {
  try {
    const { name } = req.body;
    const result = await pool.query(
      `UPDATE games SET name = COALESCE($1, name), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [name?.trim() || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Game not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/games/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `DELETE FROM games WHERE id = $1 RETURNING id`, [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Game not found' });
    res.json({ message: 'Game deleted' });
  } catch (err) { next(err); }
});

// POST /api/games/:id/complete
router.post('/:id/complete', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Assign final ranks
    await client.query(
      `UPDATE game_players gp
       SET final_rank = sub.rnk
       FROM (
         SELECT player_id,
                RANK() OVER (ORDER BY current_score DESC) AS rnk
         FROM game_players WHERE game_id = $1
       ) sub
       WHERE gp.game_id = $1 AND gp.player_id = sub.player_id`,
      [req.params.id]
    );

    // Find winner
    const winnerRes = await client.query(
      `SELECT player_id, current_score FROM game_players
       WHERE game_id = $1 ORDER BY current_score DESC LIMIT 1`,
      [req.params.id]
    );
    const winner = winnerRes.rows[0];

    // Mark game completed
    await client.query(
      `UPDATE games SET status = 'completed', winner_id = $1,
                        completed_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [winner?.player_id || null, req.params.id]
    );

    // Update global player stats
    const gpRes = await client.query(
      `SELECT player_id, current_score FROM game_players WHERE game_id = $1`,
      [req.params.id]
    );
    for (const row of gpRes.rows) {
      const isWinner = row.player_id === winner?.player_id ? 1 : 0;
      await client.query(
        `UPDATE players
         SET total_score  = total_score  + $1,
             games_played = games_played + 1,
             games_won    = games_won    + $2,
             updated_at   = NOW()
         WHERE id = $3`,
        [row.current_score, isWinner, row.player_id]
      );
    }

    await client.query('COMMIT');

    const full = await pool.query(
      `${GAME_WITH_PLAYERS} WHERE g.id = $1 GROUP BY g.id`, [req.params.id]
    );
    res.json(full.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
});

// GET /api/games/:id/leaderboard
router.get('/:id/leaderboard', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         RANK() OVER (ORDER BY gp.current_score DESC) AS rank,
         p.id   AS player_id,
         p.name AS player_name,
         p.avatar_color,
         gp.current_score,
         gp.final_rank,
         COUNT(rp.id)                                       AS rounds_played,
         COUNT(rp.id) FILTER (WHERE rp.role = 'bidder')    AS times_bidder,
         COUNT(rp.id) FILTER (WHERE rp.role = 'bidder' AND r.bid_won) AS bids_won
       FROM game_players gp
       JOIN players p ON p.id = gp.player_id
       LEFT JOIN round_players rp ON rp.player_id = p.id AND rp.game_id = gp.game_id
       LEFT JOIN rounds r         ON r.id = rp.round_id
       WHERE gp.game_id = $1
       GROUP BY p.id, p.name, p.avatar_color, gp.current_score, gp.final_rank
       ORDER BY rank`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/games/:id/rounds
router.get('/:id/rounds', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         r.*,
         p.name         AS bidder_name,
         p.avatar_color AS bidder_color,
         COALESCE(
           json_agg(
             json_build_object(
               'player_id',   rp_p.id,
               'player_name', rp_p.name,
               'team',        rp.team,
               'role',        rp.role,
               'score',       rp.score
             ) ORDER BY rp.role
           ) FILTER (WHERE rp_p.id IS NOT NULL),
           '[]'::json
         ) AS participants
       FROM rounds r
       JOIN players p          ON p.id  = r.bidder_id
       LEFT JOIN round_players rp  ON rp.round_id  = r.id
       LEFT JOIN players rp_p      ON rp_p.id       = rp.player_id
       WHERE r.game_id = $1
       GROUP BY r.id, p.name, p.avatar_color
       ORDER BY r.round_number`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

module.exports = router;
