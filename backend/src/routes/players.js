const router = require('express').Router();
const { pool } = require('../db');

const AVATAR_COLORS = [
  '#E91E63','#9C27B0','#3F51B5','#2196F3','#00BCD4',
  '#4CAF50','#FF9800','#F44336','#009688','#FF5722',
];

const BID_TYPE_LABELS = {
  normal: 'Normal',
  honors: 'Honors',
  initial_56: 'Initial 56',
  upgraded_56: 'Upgraded 56',
  midgame_changed: 'Mid-game Changed',
};

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNum(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pct(value) {
  const num = toNum(value, 0);
  return Number.isInteger(num) ? num : Math.round(num * 10) / 10;
}

function signed(value) {
  const num = toInt(value, 0);
  return num >= 0 ? `+${num}` : `${num}`;
}

function buildStreakSummary(games) {
  const completed = games
    .filter((game) => game.result !== null)
    .slice()
    .sort((a, b) => new Date(a.sort_at) - new Date(b.sort_at));

  let currentType = null;
  let currentLength = 0;
  let bestWinStreak = 0;
  let bestLossStreak = 0;
  let runningType = null;
  let runningLength = 0;

  for (const game of completed) {
    const resultType = game.result ? 'win' : 'loss';
    if (resultType === runningType) {
      runningLength += 1;
    } else {
      runningType = resultType;
      runningLength = 1;
    }

    if (resultType === 'win') {
      bestWinStreak = Math.max(bestWinStreak, runningLength);
    } else {
      bestLossStreak = Math.max(bestLossStreak, runningLength);
    }
  }

  for (let i = completed.length - 1; i >= 0; i -= 1) {
    const resultType = completed[i].result ? 'win' : 'loss';
    if (currentType === null) {
      currentType = resultType;
      currentLength = 1;
      continue;
    }

    if (resultType === currentType) {
      currentLength += 1;
    } else {
      break;
    }
  }

  return {
    current: currentType ? { type: currentType, length: currentLength } : { type: 'neutral', length: 0 },
    best: {
      win: bestWinStreak,
      loss: bestLossStreak,
    },
  };
}

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

// GET /api/players/:id/analytics
router.get('/:id/analytics', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [playerRes, bidRes, partnerRes, gamesRes] = await Promise.all([
      pool.query('SELECT * FROM players WHERE id = $1', [id]),
      pool.query(
        `SELECT
           r.bid_type,
           COUNT(*)::int AS attempts,
           COUNT(*) FILTER (WHERE r.bid_won)::int AS wins,
           COALESCE(ROUND(AVG(rp.score)::numeric, 1), 0) AS avg_score,
           COALESCE(SUM(rp.score), 0)::int AS total_score
         FROM round_players rp
         JOIN rounds r ON r.id = rp.round_id
         WHERE rp.player_id = $1
           AND rp.role = 'bidder'
         GROUP BY r.bid_type
         ORDER BY attempts DESC, r.bid_type`,
        [id]
      ),
      pool.query(
        `SELECT
           partner.id AS player_id,
           partner.name AS player_name,
           partner.avatar_color,
           COUNT(*)::int AS rounds_together,
           COUNT(*) FILTER (WHERE r.bid_won)::int AS wins_together,
           COALESCE(ROUND(AVG(partner_rp.score)::numeric, 1), 0) AS avg_score,
           COALESCE(SUM(partner_rp.score), 0)::int AS total_score
         FROM round_players me
         JOIN rounds r ON r.id = me.round_id
         JOIN round_players partner_rp
           ON partner_rp.round_id = me.round_id
          AND partner_rp.player_id <> me.player_id
          AND partner_rp.team = me.team
         JOIN players partner ON partner.id = partner_rp.player_id
         WHERE me.player_id = $1
           AND me.team = 'bidding'
         GROUP BY partner.id, partner.name, partner.avatar_color
         ORDER BY rounds_together DESC, wins_together DESC, total_score DESC
         LIMIT 5`,
        [id]
      ),
      pool.query(
        `SELECT
           g.id,
           g.name,
           g.status,
           g.created_at,
           g.completed_at,
           g.updated_at,
           g.winner_id,
           gp.current_score::int,
           gp.final_rank,
           CASE
             WHEN g.status = 'completed' THEN (g.winner_id = $1::int)
             ELSE NULL
           END AS result
         FROM game_players gp
         JOIN games g ON g.id = gp.game_id
         WHERE gp.player_id = $1
         ORDER BY COALESCE(g.completed_at, g.updated_at, g.created_at) DESC`,
        [id]
      ),
    ]);

    if (!playerRes.rows.length) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const player = playerRes.rows[0];
    const games = gamesRes.rows.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      current_score: toInt(row.current_score),
      final_rank: row.final_rank,
      result: row.result === null ? null : Boolean(row.result),
      played_at: row.completed_at || row.updated_at || row.created_at,
      sort_at: row.completed_at || row.updated_at || row.created_at,
      winner_id: row.winner_id,
    }));

    const completedGames = games.filter((game) => game.result !== null);
    const scoredGames = completedGames.length ? completedGames : games;
    const totalScore = toInt(player.total_score);
    const gamesPlayed = toInt(player.games_played);
    const gamesWon = toInt(player.games_won);
    const roundsPlayed = toInt(player.rounds_played);
    const roundsAsBidder = toInt(player.rounds_as_bidder);
    const roundsWonAsBidder = toInt(player.rounds_won_as_bidder);
    const winningRate = gamesPlayed > 0 ? pct((gamesWon / gamesPlayed) * 100) : 0;
    const bidderSuccessRate = roundsAsBidder > 0 ? pct((roundsWonAsBidder / roundsAsBidder) * 100) : 0;
    const averageScorePerGame = gamesPlayed > 0 ? pct(totalScore / gamesPlayed) : 0;
    const bestGame = [...scoredGames].sort((a, b) => b.current_score - a.current_score)[0] || null;
    const worstGame = [...scoredGames].sort((a, b) => a.current_score - b.current_score)[0] || null;
    const streak = buildStreakSummary(completedGames);

    const bidBreakdown = bidRes.rows.map((row) => {
      const attempts = toInt(row.attempts);
      const wins = toInt(row.wins);
      return {
        bid_type: row.bid_type,
        label: BID_TYPE_LABELS[row.bid_type] || row.bid_type,
        attempts,
        wins,
        win_rate: attempts > 0 ? pct((wins / attempts) * 100) : 0,
        avg_score: toNum(row.avg_score, 0),
        total_score: toInt(row.total_score),
      };
    });

    const partnerSynergy = partnerRes.rows.map((row) => {
      const roundsTogether = toInt(row.rounds_together);
      const winsTogether = toInt(row.wins_together);
      return {
        player_id: row.player_id,
        player_name: row.player_name,
        avatar_color: row.avatar_color,
        rounds_together: roundsTogether,
        wins_together: winsTogether,
        win_rate: roundsTogether > 0 ? pct((winsTogether / roundsTogether) * 100) : 0,
        avg_score: toNum(row.avg_score, 0),
        total_score: toInt(row.total_score),
      };
    });

    res.json({
      player: {
        id: player.id,
        name: player.name,
        avatar_color: player.avatar_color,
        total_score: totalScore,
        games_played: gamesPlayed,
        games_won: gamesWon,
        rounds_played: roundsPlayed,
        rounds_as_bidder: roundsAsBidder,
        rounds_won_as_bidder: roundsWonAsBidder,
        winning_rate: winningRate,
        bidder_success_rate: bidderSuccessRate,
        average_score_per_game: averageScorePerGame,
      },
      streak,
      best_game: bestGame ? {
        id: bestGame.id,
        name: bestGame.name,
        status: bestGame.status,
        current_score: bestGame.current_score,
        final_rank: bestGame.final_rank,
        result: bestGame.result,
        played_at: bestGame.played_at,
      } : null,
      worst_game: worstGame ? {
        id: worstGame.id,
        name: worstGame.name,
        status: worstGame.status,
        current_score: worstGame.current_score,
        final_rank: worstGame.final_rank,
        result: worstGame.result,
        played_at: worstGame.played_at,
      } : null,
      bid_breakdown: bidBreakdown,
      partner_synergy: partnerSynergy,
      recent_games: games.slice(0, 8).map((game) => ({
        id: game.id,
        name: game.name,
        status: game.status,
        current_score: game.current_score,
        final_rank: game.final_rank,
        result: game.result,
        played_at: game.played_at,
      })),
      summary: {
        score_label: signed(totalScore),
        games_label: `${gamesPlayed} games`,
      },
    });
  } catch (err) {
    next(err);
  }
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
