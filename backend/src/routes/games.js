const router = require('express').Router();
const { pool } = require('../db');
const { calculateScores } = require('../scoring');
const { requireUser, canManageGame } = require('../middleware/auth');

const GAME_WITH_PLAYERS = `
  SELECT g.*,
    ou.username AS owner_username,
    ou.role AS owner_role,
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
  LEFT JOIN users ou        ON ou.id = g.owner_user_id
  LEFT JOIN game_players gp ON gp.game_id = g.id
  LEFT JOIN players p       ON p.id = gp.player_id
`;

async function getGameOwner(gameId) {
  const result = await pool.query(
    `SELECT id, owner_user_id FROM games WHERE id = $1`,
    [gameId]
  );
  return result.rows[0] || null;
}

function denyIfCannotManage(req, res, game) {
  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return true;
  }

  if (!canManageGame(req.authUser, game.owner_user_id)) {
    res.status(403).json({ error: 'Only the game owner or admin can modify this game' });
    return true;
  }

  return false;
}

// GET /api/games
router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    const values = [];
    const where  = status ? 'WHERE g.status = $1' : '';
    if (status) values.push(status);

    const result = await pool.query(
      `${GAME_WITH_PLAYERS} ${where} GROUP BY g.id, ou.id ORDER BY g.updated_at DESC`,
      values
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/games/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `${GAME_WITH_PLAYERS} WHERE g.id = $1 GROUP BY g.id, ou.id`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Game not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// POST /api/games
router.post('/', requireUser, async (req, res, next) => {
  const { name, playerIds } = req.body;
  if (!Array.isArray(playerIds)) {
    return res.status(400).json({ error: 'playerIds must be an array' });
  }

  const normalizedPlayerIds = [...new Set(
    playerIds
      .map((id) => Number.parseInt(id, 10))
      .filter((id) => Number.isInteger(id) && id > 0)
  )];

  if (normalizedPlayerIds.length !== playerIds.length) {
    return res.status(400).json({ error: 'playerIds must contain unique numeric IDs' });
  }

  if (normalizedPlayerIds.length < 3) {
    return res.status(400).json({ error: 'Game must have at least 3 players' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingPlayersRes = await client.query(
      `SELECT COUNT(*)::int AS count FROM players WHERE id = ANY($1::int[])`,
      [normalizedPlayerIds]
    );
    if (existingPlayersRes.rows[0].count !== normalizedPlayerIds.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'One or more selected players do not exist' });
    }

    const gRes = await client.query(
      `INSERT INTO games (name, num_players, owner_user_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        name?.trim() || `Game ${new Date().toLocaleDateString()}`,
        normalizedPlayerIds.length,
        req.authUser.id,
      ]
    );
    const game = gRes.rows[0];

    for (let i = 0; i < normalizedPlayerIds.length; i++) {
      await client.query(
        `INSERT INTO game_players (game_id, player_id, seat_number) VALUES ($1, $2, $3)`,
        [game.id, normalizedPlayerIds[i], i + 1]
      );
    }

    await client.query('COMMIT');

    const full = await pool.query(
      `${GAME_WITH_PLAYERS} WHERE g.id = $1 GROUP BY g.id, ou.id`,
      [game.id]
    );
    res.status(201).json(full.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23514' && err.constraint === 'games_num_players_check') {
      return res.status(400).json({
        error: 'Game player count is invalid for this database. Choose at least 3 players. If you already did, recreate the DB volume to refresh schema.'
      });
    }
    next(err);
  } finally { client.release(); }
});

// PUT /api/games/:id  (rename / status change only – scores are managed via rounds)
router.put('/:id', requireUser, async (req, res, next) => {
  try {
    const game = await getGameOwner(req.params.id);
    if (denyIfCannotManage(req, res, game)) return;

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
router.delete('/:id', requireUser, async (req, res, next) => {
  try {
    const game = await getGameOwner(req.params.id);
    if (denyIfCannotManage(req, res, game)) return;

    const result = await pool.query(
      `DELETE FROM games WHERE id = $1 RETURNING id`, [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Game not found' });
    res.json({ message: 'Game deleted' });
  } catch (err) { next(err); }
});

// POST /api/games/:id/complete
router.post('/:id/complete', requireUser, async (req, res, next) => {
  try {
    const game = await getGameOwner(req.params.id);
    if (denyIfCannotManage(req, res, game)) return;

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
        `${GAME_WITH_PLAYERS} WHERE g.id = $1 GROUP BY g.id, ou.id`,
        [req.params.id]
      );
      res.json(full.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/games/:id/rounds  – record a new round and update scores
router.post('/:id/rounds', requireUser, async (req, res, next) => {
  try {
    const gameId = req.params.id;
    const game = await getGameOwner(gameId);
    if (denyIfCannotManage(req, res, game)) return;

    const {
      bidderId, bidAmount, bidType, trumpSuit,
      partnerIds, opponentIds,
      pointsWonByBiddingTeam, partnerCardsAsked, notes, isLastRound,
    } = req.body;

    if (!bidderId)                        return res.status(400).json({ error: 'bidderId is required' });
    const bid = parseInt(bidAmount, 10);
    if (isNaN(bid) || bid < 28 || bid > 56) return res.status(400).json({ error: 'bidAmount must be between 28 and 56' });
    if (!bidType)                          return res.status(400).json({ error: 'bidType is required' });
    if (!Array.isArray(partnerIds))        return res.status(400).json({ error: 'partnerIds must be an array' });
    if (!Array.isArray(opponentIds))       return res.status(400).json({ error: 'opponentIds must be an array' });

    const pts = parseInt(pointsWonByBiddingTeam, 10);
    if (isNaN(pts) || pts < 0 || pts > 56) return res.status(400).json({ error: 'pointsWonByBiddingTeam must be 0–56' });

    const bidWon = pts >= bid;
    const { bidderScore, partnerScoreEach, partnerTotalScore } =
      calculateScores(bid, bidType, bidWon, partnerIds.length, !!isLastRound);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

    const rnRes = await client.query(
      `SELECT COALESCE(MAX(round_number), 0) + 1 AS next_round FROM rounds WHERE game_id = $1`,
      [gameId]
    );
    const roundNumber = rnRes.rows[0].next_round;

    const roundRes = await client.query(
      `INSERT INTO rounds
         (game_id, round_number, bidder_id, bid_amount, bid_type, trump_suit,
          partner_cards_asked, points_won_by_bidding_team, bid_won,
          bidder_score, partner_score_each, partner_total_score, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        gameId, roundNumber, bidderId, bid, bidType, trumpSuit || null,
        partnerCardsAsked || null, pts, bidWon,
        bidderScore, partnerScoreEach, partnerTotalScore, notes || null,
      ]
    );
    const round = roundRes.rows[0];

    const insertRP = (pid, team, role, score) =>
      client.query(
        `INSERT INTO round_players (round_id, player_id, game_id, team, role, score)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [round.id, pid, gameId, team, role, score]
      );

    await insertRP(bidderId, 'bidding', 'bidder', bidderScore);
    for (const pid of partnerIds)  await insertRP(pid, 'bidding',  'partner',  partnerScoreEach);
    for (const pid of opponentIds) await insertRP(pid, 'opposing', 'opponent', 0);

    const updateGP = (pid, score) =>
      client.query(
        `UPDATE game_players SET current_score = current_score + $1
         WHERE game_id = $2 AND player_id = $3`,
        [score, gameId, pid]
      );

    await updateGP(bidderId, bidderScore);
    for (const pid of partnerIds) await updateGP(pid, partnerScoreEach);

    await client.query(
      `UPDATE players SET
         rounds_played        = rounds_played + 1,
         rounds_as_bidder     = rounds_as_bidder + 1,
         rounds_won_as_bidder = rounds_won_as_bidder + $1,
         updated_at = NOW()
       WHERE id = $2`,
      [bidWon ? 1 : 0, bidderId]
    );
    for (const pid of [...partnerIds, ...opponentIds]) {
      await client.query(
        `UPDATE players SET rounds_played = rounds_played + 1, updated_at = NOW() WHERE id = $1`,
        [pid]
      );
    }

    await client.query(
      `UPDATE games SET current_round = $1, updated_at = NOW() WHERE id = $2`,
      [roundNumber, gameId]
    );

      await client.query('COMMIT');
      res.status(201).json(round);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
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
         COUNT(rp.id)::int                                       AS rounds_played,
         COUNT(rp.id) FILTER (WHERE rp.role = 'bidder')::int    AS times_bidder,
         COUNT(rp.id) FILTER (WHERE rp.role = 'bidder' AND r.bid_won)::int AS bids_won
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
