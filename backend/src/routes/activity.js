const router = require('express').Router();
const { pool } = require('../db');
const { requireUser } = require('../middleware/auth');

const BID_TYPE_LABELS = {
  normal: 'Normal',
  honors: 'Honors',
  initial_56: 'Initial 56',
  upgraded_56: 'Upgraded 56',
  midgame_changed: 'Mid-game Changed',
};

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function signed(value) {
  const num = toNumber(value, 0);
  return num >= 0 ? `+${num}` : `${num}`;
}

function toPct(value) {
  const num = toNumber(value, 0);
  return Number.isInteger(num) ? String(num) : num.toFixed(1).replace(/\.0$/, '');
}

function parseLimit(raw) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed)) return 25;
  return Math.max(10, Math.min(parsed, 100));
}

function toIso(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

function buildRoundEvent(row) {
  const bidTypeLabel = BID_TYPE_LABELS[row.bid_type] || row.bid_type;

  if (row.bid_amount >= 40 && row.bid_won) {
    return {
      id: `round-high-win-${row.round_id}`,
      type: 'high_bid_won',
      icon: 'mdi-rocket-launch',
      color: 'success',
      title: `${row.bidder_name} won high bid ${row.bid_amount}`,
      subtitle: `${row.game_name} · ${bidTypeLabel} · Bid score ${signed(row.bidder_score)}`,
      occurred_at: toIso(row.occurred_at),
      route: `/games/${row.game_id}`,
      player_name: row.bidder_name,
      player_color: row.bidder_color,
    };
  }

  if (row.bid_amount >= 40 && !row.bid_won) {
    return {
      id: `round-high-loss-${row.round_id}`,
      type: 'high_bid_lost',
      icon: 'mdi-alert-circle-outline',
      color: 'warning',
      title: `${row.bidder_name} missed high bid ${row.bid_amount}`,
      subtitle: `${row.game_name} · ${bidTypeLabel} · Bid score ${signed(row.bidder_score)}`,
      occurred_at: toIso(row.occurred_at),
      route: `/games/${row.game_id}`,
      player_name: row.bidder_name,
      player_color: row.bidder_color,
    };
  }

  return {
    id: `round-${row.round_id}`,
    type: 'round_recorded',
    icon: row.bid_won ? 'mdi-check-circle-outline' : 'mdi-timeline-alert-outline',
    color: row.bid_won ? 'info' : 'warning',
    title: `Round ${row.round_number} recorded in ${row.game_name}`,
    subtitle: `${row.bidder_name} bid ${row.bid_amount} (${bidTypeLabel}) and ${row.bid_won ? 'won' : 'lost'} · ${signed(row.bidder_score)}`,
    occurred_at: toIso(row.occurred_at),
    route: `/games/${row.game_id}`,
    player_name: row.bidder_name,
    player_color: row.bidder_color,
  };
}

function buildGameStartedEvent(row) {
  return {
    id: `game-started-${row.game_id}`,
    type: 'game_started',
    icon: 'mdi-cards-outline',
    color: 'info',
    title: `${row.game_name} started`,
    subtitle: `${row.num_players} players · Owner ${row.owner_username || 'admin'}`,
    occurred_at: toIso(row.created_at),
    route: `/games/${row.game_id}`,
    player_name: row.owner_username || 'admin',
    player_color: null,
  };
}

function buildGameCompletedEvent(row) {
  return {
    id: `game-completed-${row.game_id}`,
    type: 'game_completed',
    icon: 'mdi-trophy-outline',
    color: 'primary',
    title: `${row.game_name} completed`,
    subtitle: row.winner_name
      ? `Winner ${row.winner_name} · Final ${signed(row.winner_score)} · ${row.current_round} rounds`
      : `Completed after ${row.current_round} rounds`,
    occurred_at: toIso(row.completed_at),
    route: `/games/${row.game_id}`,
    player_name: row.winner_name || null,
    player_color: row.winner_color || null,
  };
}

function buildPlayerPerformanceEvent(row, rank) {
  const isLeader = rank === 1;

  if (toNumber(row.games_played) >= 6 && toNumber(row.win_rate) >= 70) {
    return {
      id: `player-hot-${row.player_id}`,
      type: 'player_hot_streak',
      icon: 'mdi-fire',
      color: 'error',
      title: `${row.player_name} is on a hot streak`,
      subtitle: `${toPct(row.win_rate)}% win rate in ${row.games_played} games`,
      occurred_at: toIso(row.occurred_at),
      route: '/leaderboard',
      player_name: row.player_name,
      player_color: row.player_color,
    };
  }

  return {
    id: `player-form-${row.player_id}`,
    type: 'player_performance',
    icon: isLeader ? 'mdi-crown-outline' : 'mdi-account-star-outline',
    color: isLeader ? 'secondary' : 'primary',
    title: isLeader
      ? `${row.player_name} leads the leaderboard`
      : `${row.player_name} is trending up`,
    subtitle: `Total ${signed(row.total_score)} · Wins ${row.games_won}/${row.games_played} · Bid success ${toPct(row.bid_win_rate)}%`,
    occurred_at: toIso(row.occurred_at),
    route: '/leaderboard',
    player_name: row.player_name,
    player_color: row.player_color,
  };
}

// GET /api/activity?limit=25
// Activity feed derived from game events, round outcomes, and player performance.
router.get('/', requireUser, async (req, res, next) => {
  const limit = parseLimit(req.query.limit);

  try {
    const [roundRes, gameRes, playerRes] = await Promise.all([
      pool.query(
        `SELECT
           r.id AS round_id,
           r.game_id,
           g.name AS game_name,
           r.round_number::int,
           r.bid_amount::int,
           r.bid_type,
           r.bid_won,
           r.bidder_score::int,
           r.created_at AS occurred_at,
           p.name AS bidder_name,
           p.avatar_color AS bidder_color
         FROM rounds r
         JOIN games g   ON g.id = r.game_id
         JOIN players p ON p.id = r.bidder_id
         ORDER BY r.created_at DESC
         LIMIT $1`,
        [limit * 2]
      ),
      pool.query(
        `SELECT
           g.id AS game_id,
           g.name AS game_name,
           g.num_players::int,
           g.current_round::int,
           g.created_at,
           g.completed_at,
           winner.name AS winner_name,
           winner.avatar_color AS winner_color,
           winner_gp.current_score::int AS winner_score,
           owner.username AS owner_username
         FROM games g
         LEFT JOIN players winner ON winner.id = g.winner_id
         LEFT JOIN game_players winner_gp
           ON winner_gp.game_id = g.id AND winner_gp.player_id = g.winner_id
         LEFT JOIN users owner ON owner.id = g.owner_user_id
         ORDER BY GREATEST(g.created_at, COALESCE(g.completed_at, g.created_at)) DESC
         LIMIT $1`,
        [limit]
      ),
      pool.query(
        `SELECT
           p.id AS player_id,
           p.name AS player_name,
           p.avatar_color AS player_color,
           p.total_score::int,
           p.games_played::int,
           p.games_won::int,
           p.rounds_as_bidder::int,
           p.rounds_won_as_bidder::int,
           p.updated_at AS occurred_at,
           CASE WHEN p.games_played > 0
             THEN ROUND(p.games_won::numeric / p.games_played * 100, 1)
             ELSE 0
           END AS win_rate,
           CASE WHEN p.rounds_as_bidder > 0
             THEN ROUND(p.rounds_won_as_bidder::numeric / p.rounds_as_bidder * 100, 1)
             ELSE 0
           END AS bid_win_rate
         FROM players p
         WHERE p.games_played > 0 OR p.rounds_as_bidder > 0 OR p.total_score <> 0
         ORDER BY p.total_score DESC, p.games_won DESC, p.updated_at DESC
         LIMIT 5`
      ),
    ]);

    const events = [];

    for (const row of roundRes.rows) {
      events.push(buildRoundEvent(row));
    }

    for (const row of gameRes.rows) {
      events.push(buildGameStartedEvent(row));
      if (row.completed_at) {
        events.push(buildGameCompletedEvent(row));
      }
    }

    playerRes.rows.forEach((row, idx) => {
      events.push(buildPlayerPerformanceEvent(row, idx + 1));
    });

    const sorted = events
      .filter((event) => event.occurred_at)
      .sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at))
      .slice(0, limit);

    res.json({
      events: sorted,
      total: sorted.length,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
