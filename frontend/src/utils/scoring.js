/**
 * Super Trump – Client-side scoring engine (mirrors backend/src/scoring.js)
 *
 * ── Win-amount formula ───────────────────────────────────────────────────
 *   Bid type     Condition              Win amount
 *   -----------  ---------------------  ---------------------------------
 *   normal       bid < 40               1 × floor(bid / 2)
 *   honors       40 ≤ bid < 56          2 × floor(bid / 2)   (double)
 *   initial_56   bid = 56, first bid    4 × 28 = 112         (quadruple)
 *   upgraded_56  bid = 56, mid-game     3 × 28 = 84          (triple)
 *
 * ── Scoring outcome ──────────────────────────────────────────────────────
 *   Outcome  Bidder score       Partners total
 *   -------  -----------------  ----------------------------------------
 *   WIN      +winAmount         +winAmount  (shared among all partners)
 *   LOSS     −2 × winAmount     −2 × winAmount  (shared among all partners)
 *
 * ── Official examples ────────────────────────────────────────────────────
 *   Bid 36 won            → bidder +18,   partners share +18
 *   Bid 36 lost           → bidder −36,   partners share −36
 *   Bid 40 won  (honors)  → bidder +40,   partners share +40
 *   Bid 40 lost (honors)  → bidder −80,   partners share −80
 *   Bid 56 initial won    → bidder +112,  partners share +112
 *   Bid 56 initial lost   → bidder −224,  partners share −224
 *   Bid 56 upgraded won   → bidder +84,   partners share +84
 *   Bid 56 upgraded lost  → bidder −168,  partners share −168
 */
export const MULTIPLIERS = { normal: 1, honors: 2, initial_56: 4, upgraded_56: 3 }

export const BID_TYPE_LABELS = {
  normal:      'Normal',
  honors:      'Honors',
  initial_56:  'Initial 56',
  upgraded_56: 'Upgraded to 56',
}

export const SUIT_META = {
  hearts:   { icon: '♥', label: 'Hearts',   color: '#F87171' },
  diamonds: { icon: '♦', label: 'Diamonds', color: '#FB923C' },
  clubs:    { icon: '♣', label: 'Clubs',    color: '#E2F4E6' },
  spades:   { icon: '♠', label: 'Spades',   color: '#E2F4E6' },
  no_trump: { icon: '🚫', label: 'No Trump', color: '#9CA3AF' },
}

export function getBidType(bidAmount, wasUpgradedTo56 = false) {
  if (bidAmount === 56) return wasUpgradedTo56 ? 'upgraded_56' : 'initial_56'
  if (bidAmount >= 40)  return 'honors'
  return 'normal'
}

export function getWinAmount(bidAmount, bidType) {
  return (MULTIPLIERS[bidType] || 1) * Math.floor(bidAmount / 2)
}

export function calculateScores(bidAmount, bidType, bidWon, numPartners = 0) {
  const winAmount = getWinAmount(bidAmount, bidType)

  // Win:  each side earns +winAmount
  // Loss: each side pays  −2×winAmount  (double penalty)
  const bidderScore       = bidWon ? winAmount : -(2 * winAmount)
  const partnerTotalScore = bidWon ? winAmount : -(2 * winAmount)

  // Divide partners' share evenly; ceil on negatives avoids over-penalising
  // individual partners due to integer rounding.
  const partnerScoreEach =
    numPartners > 0
      ? (partnerTotalScore >= 0
          ? Math.floor(partnerTotalScore / numPartners)
          : Math.ceil(partnerTotalScore  / numPartners))
      : 0
  return { bidderScore, partnerScoreEach, partnerTotalScore, winAmount }
}

export function scoreColor(score) {
  if (score > 0)  return 'success'
  if (score < 0)  return 'error'
  return 'grey'
}

export function formatScore(score) {
  return score >= 0 ? `+${score}` : `${score}`
}

export function buildChartSeries(gamePlayers, rounds) {
  const map = {}
  for (const gp of gamePlayers) {
    map[gp.id] = { name: gp.name, color: gp.avatar_color, data: [0] }
  }
  for (const round of rounds) {
    const scoreMap = {}
    for (const p of (round.participants || [])) {
      scoreMap[p.player_id] = p.score
    }
    for (const gp of gamePlayers) {
      const prev  = map[gp.id].data.at(-1) ?? 0
      map[gp.id].data.push(prev + (scoreMap[gp.id] ?? 0))
    }
  }
  return {
    series:     Object.values(map).map(m => ({ name: m.name, data: m.data })),
    colors:     Object.values(map).map(m => m.color),
    categories: ['Start', ...rounds.map((_, i) => `R${i + 1}`)],
  }
}
