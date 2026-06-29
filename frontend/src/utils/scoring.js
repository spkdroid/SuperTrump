/**
 * Super Trump – Client-side scoring engine (mirrors backend/src/scoring.js)
 *
 * ── Bidder score rules ───────────────────────────────────────────────────
 *   Bid type     Win                Loss
 *   -----------  -----------------  ---------------------------------
 *   normal       +bid               −bid
 *   honors       +bid               −2 × bid
 *   initial_56   +112               −224
 *   upgraded_56  +84                −168
 *
 * ── Partner score rules (each partner INDIVIDUALLY) ──────────────────────
 *   All types    +floor(bid/2)      −floor(bid/2)
 *   Partners are NOT split among themselves — each gets the same flat amount.
 *
 * ── Official examples ────────────────────────────────────────────────────
 *   Bid 32 won            → bidder +32,   each partner +16
 *   Bid 32 lost           → bidder −32,   each partner −16
 *   Bid 40 won  (honors)  → bidder +40,   each partner +20
 *   Bid 40 lost (honors)  → bidder −80,   each partner −20
 *   Bid 56 initial won    → bidder +112,  each partner +28
 *   Bid 56 initial lost   → bidder −224,  each partner −28
 *   Bid 56 upgraded won   → bidder +84,   each partner +28
 *   Bid 56 upgraded lost  → bidder −168,  each partner −28
 */
export const MULTIPLIERS = { normal: 1, honors: 2, initial_56: 4, upgraded_56: 3 }

export const BID_TYPE_LABELS = {
  normal:          'Normal',
  honors:          'Honors',
  initial_56:      'Initial 56',
  upgraded_56:     'Upgraded to 56',
  midgame_changed: 'Mid-game Change',
}

export const SUIT_META = {
  hearts:   { icon: '♥', label: 'Hearts',   color: '#F87171' },
  diamonds: { icon: '♦', label: 'Diamonds', color: '#FB923C' },
  clubs:    { icon: '♣', label: 'Clubs',    color: '#1D4ED8' },
  spades:   { icon: '♠', label: 'Spades',   color: '#0F172A' },
  no_trump: { icon: '🚫', label: 'No Trump', color: '#64748B' },
}

export function getBidType(bidAmount, wasUpgradedTo56 = false) {
  if (bidAmount === 56) return wasUpgradedTo56 ? 'upgraded_56' : 'initial_56'
  if (bidAmount >= 40)  return 'honors'
  return 'normal'
}

export function getScoreAmounts(bidAmount, bidType) {
  const halfBid = Math.floor(bidAmount / 2)
  switch (bidType) {
    case 'initial_56':  return { bidderWin: 112,       bidderLoss: 224,           partnerEach: 28      }
    case 'upgraded_56': return { bidderWin: 84,        bidderLoss: 168,           partnerEach: 28      }
    case 'honors':
    case 'midgame_changed': return { bidderWin: bidAmount, bidderLoss: 2 * bidAmount, partnerEach: halfBid }
    default:                return { bidderWin: bidAmount, bidderLoss: bidAmount,     partnerEach: halfBid }
  }
}

// Legacy helper – returns the bidder's win score (positive).
export function getWinAmount(bidAmount, bidType) {
  return getScoreAmounts(bidAmount, bidType).bidderWin
}

export function calculateScores(bidAmount, bidType, bidWon, numPartners = 0, isLastRound = false) {
  const { bidderWin, bidderLoss, partnerEach } = getScoreAmounts(bidAmount, bidType)
  // Last Round: every score is doubled (win or loss).
  const multiplier = isLastRound ? 2 : 1

  const bidderScore       = (bidWon ? bidderWin : -bidderLoss) * multiplier
  // Each partner INDIVIDUALLY gets ±floor(bid/2) — NOT divided among partners.
  const partnerScoreEach  = numPartners > 0 ? (bidWon ? partnerEach : -partnerEach) * multiplier : 0
  const partnerTotalScore = numPartners * partnerScoreEach

  return { bidderScore, partnerScoreEach, partnerTotalScore, winAmount: bidderWin * multiplier }
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
