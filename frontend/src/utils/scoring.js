/**
 * Client-side scoring engine (mirrors backend scoring.js)
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

export function calculateScores(bidAmount, bidType, bidWon, numPartners = 1) {
  const winAmount         = getWinAmount(bidAmount, bidType)
  const bidderScore       = bidWon ? winAmount    : -2 * winAmount
  const partnerTotalScore = bidWon ? winAmount    : -2 * winAmount
  const partnerScoreEach  = numPartners > 0
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
