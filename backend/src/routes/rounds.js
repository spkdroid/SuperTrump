const router = require('express').Router();
const { pool } = require('../db');
const { calculateScores, getBidType } = require('../scoring');

// POST /api/games/:gameId/rounds  – record a new round and update scores
router.post('/:gameId/rounds', async (req, res, next) => {
  const { gameId } = req.params;
  const {
    bidderId,
    bidAmount,
    bidType,            // 'normal' | 'honors' | 'initial_56' | 'upgraded_56'
    trumpSuit,          // hearts | diamonds | clubs | spades | no_trump | null
    partnerIds,         // array of player IDs on bidding team (excluding bidder)
    opponentIds,        // array of player IDs on opposing team
    pointsWonByBiddingTeam,
    partnerCardsAsked,  // free-text e.g. "Jack of Hearts"
    notes,
  } = req.body;

  // ── Validation ──────────────────────────────────────────
  if (!bidderId) return res.status(400).json({ error: 'bidderId is required' });
  const bid = parseInt(bidAmount, 10);
  if (isNaN(bid) || bid < 28 || bid > 56)
    return res.status(400).json({ error: 'bidAmount must be between 28 and 56' });
  if (!bidType) return res.status(400).json({ error: 'bidType is required' });
  if (!Array.isArray(partnerIds)) return res.status(400).json({ error: 'partnerIds must be an array' });
  if (!Array.isArray(opponentIds)) return res.status(400).json({ error: 'opponentIds must be an array' });

  const pts = parseInt(pointsWonByBiddingTeam, 10);
  if (isNaN(pts) || pts < 0 || pts > 56)
    return res.status(400).json({ error: 'pointsWonByBiddingTeam must be 0–56' });

  const bidWon = pts >= bid;
  const { bidderScore, partnerScoreEach, partnerTotalScore } = calculateScores(
    bid, bidType, bidWon, partnerIds.length
  );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Next round number
    const rnRes = await client.query(
      `SELECT COALESCE(MAX(round_number), 0) + 1 AS next_round FROM rounds WHERE game_id = $1`,
      [gameId]
    );
    const roundNumber = rnRes.rows[0].next_round;

    // Insert round
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

    // Insert round_players
    const insertRP = (pid, team, role, score) =>
      client.query(
        `INSERT INTO round_players (round_id, player_id, game_id, team, role, score)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [round.id, pid, gameId, team, role, score]
      );

    await insertRP(bidderId, 'bidding', 'bidder', bidderScore);
    for (const pid of partnerIds)  await insertRP(pid, 'bidding', 'partner',  partnerScoreEach);
    for (const pid of opponentIds) await insertRP(pid, 'opposing','opponent', 0);

    // Update game_players cumulative scores
    const updateGP = (pid, score) =>
      client.query(
        `UPDATE game_players SET current_score = current_score + $1
         WHERE game_id = $2 AND player_id = $3`,
        [score, gameId, pid]
      );

    await updateGP(bidderId, bidderScore);
    for (const pid of partnerIds) await updateGP(pid, partnerScoreEach);

    // Update global player round stats
    const updateBidderStats = () =>
      client.query(
        `UPDATE players SET
           rounds_played        = rounds_played + 1,
           rounds_as_bidder     = rounds_as_bidder + 1,
           rounds_won_as_bidder = rounds_won_as_bidder + $1,
           updated_at = NOW()
         WHERE id = $2`,
        [bidWon ? 1 : 0, bidderId]
      );

    const updatePartnerStats = (pid) =>
      client.query(
        `UPDATE players SET rounds_played = rounds_played + 1, updated_at = NOW() WHERE id = $1`,
        [pid]
      );

    await updateBidderStats();
    for (const pid of [...partnerIds, ...opponentIds]) await updatePartnerStats(pid);

    // Bump game round counter
    await client.query(
      `UPDATE games SET current_round = $1, updated_at = NOW() WHERE id = $2`,
      [roundNumber, gameId]
    );

    await client.query('COMMIT');
    res.status(201).json(round);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
});

// DELETE /api/rounds/:id  – undo a round and reverse scores
router.delete('/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch round + participants before deletion
    const rRes = await pool.query('SELECT * FROM rounds WHERE id = $1', [req.params.id]);
    if (!rRes.rows.length) return res.status(404).json({ error: 'Round not found' });
    const round = rRes.rows[0];

    const rpRes = await pool.query(
      'SELECT player_id, score FROM round_players WHERE round_id = $1',
      [req.params.id]
    );

    // Reverse game_players scores
    for (const rp of rpRes.rows) {
      await client.query(
        `UPDATE game_players SET current_score = current_score - $1
         WHERE game_id = $2 AND player_id = $3`,
        [rp.score, round.game_id, rp.player_id]
      );
    }

    // Reverse global player round stats for bidder
    await client.query(
      `UPDATE players SET
         rounds_played        = GREATEST(0, rounds_played - 1),
         rounds_as_bidder     = GREATEST(0, rounds_as_bidder - 1),
         rounds_won_as_bidder = GREATEST(0, rounds_won_as_bidder - $1),
         updated_at = NOW()
       WHERE id = $2`,
      [round.bid_won ? 1 : 0, round.bidder_id]
    );

    // Delete round (cascades to round_players)
    await client.query('DELETE FROM rounds WHERE id = $1', [req.params.id]);

    // Recalculate current_round for the game
    await client.query(
      `UPDATE games SET current_round = (
         SELECT COALESCE(MAX(round_number),0) FROM rounds WHERE game_id = $1
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

module.exports = router;
