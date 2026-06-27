const router = require('express').Router();
const { pool } = require('../db');

// GET /api/leaderboard  – overall rankings
router.get('/', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         RANK() OVER (ORDER BY p.total_score DESC) AS rank,
         p.id, p.name, p.avatar_color,
         p.total_score, p.games_played, p.games_won,
         p.rounds_played, p.rounds_as_bidder, p.rounds_won_as_bidder,
         CASE WHEN p.games_played  > 0
           THEN ROUND(p.games_won::numeric  / p.games_played  * 100, 1) ELSE 0
         END AS win_rate,
         CASE WHEN p.rounds_as_bidder > 0
           THEN ROUND(p.rounds_won_as_bidder::numeric / p.rounds_as_bidder * 100, 1) ELSE 0
         END AS bidder_success_rate
       FROM players p
       ORDER BY rank, p.name`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/leaderboard/stats  – aggregate stats for the dashboard
router.get('/stats', async (_req, res, next) => {
  try {
    const [players, games, rounds, bids] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total FROM players'),
      pool.query(`SELECT
                    COUNT(*) FILTER (WHERE status = 'active')    AS active,
                    COUNT(*) FILTER (WHERE status = 'completed') AS completed,
                    COUNT(*) AS total
                  FROM games`),
      pool.query('SELECT COUNT(*) AS total FROM rounds'),
      pool.query(`SELECT
                    COALESCE(ROUND(AVG(bid_amount),1), 0) AS avg_bid,
                    COALESCE(MAX(bid_amount), 0)          AS max_bid,
                    COUNT(*) FILTER (WHERE bid_won)       AS bids_won,
                    COUNT(*) FILTER (WHERE NOT bid_won)   AS bids_lost
                  FROM rounds`),
    ]);

    res.json({
      total_players:   parseInt(players.rows[0].total),
      active_games:    parseInt(games.rows[0].active),
      completed_games: parseInt(games.rows[0].completed),
      total_games:     parseInt(games.rows[0].total),
      total_rounds:    parseInt(rounds.rows[0].total),
      avg_bid:         parseFloat(bids.rows[0].avg_bid),
      max_bid:         parseInt(bids.rows[0].max_bid),
      bids_won:        parseInt(bids.rows[0].bids_won),
      bids_lost:       parseInt(bids.rows[0].bids_lost),
    });
  } catch (err) { next(err); }
});

module.exports = router;
