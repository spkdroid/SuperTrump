/**
 * Super Trump Scoring Engine
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

function getScoreAmounts(bidAmount, bidType) {
  const halfBid = Math.floor(bidAmount / 2);
  switch (bidType) {
    case 'initial_56':  return { bidderWin: 112,       bidderLoss: 224,           partnerEach: 28      };
    case 'upgraded_56': return { bidderWin: 84,        bidderLoss: 168,           partnerEach: 28      };
    case 'honors':
    case 'midgame_changed': return { bidderWin: bidAmount, bidderLoss: 2 * bidAmount, partnerEach: halfBid };
    default:                return { bidderWin: bidAmount, bidderLoss: bidAmount,     partnerEach: halfBid };
  }
}

function getBidType(bidAmount, wasUpgradedTo56 = false) {
  if (bidAmount === 56) return wasUpgradedTo56 ? 'upgraded_56' : 'initial_56';
  if (bidAmount >= 40)  return 'honors';
  return 'normal';
}

// Legacy helper – returns the bidder's win score (positive).
function getWinAmount(bidAmount, bidType) {
  return getScoreAmounts(bidAmount, bidType).bidderWin;
}

function calculateScores(bidAmount, bidType, bidWon, numPartners = 0) {
  const { bidderWin, bidderLoss, partnerEach } = getScoreAmounts(bidAmount, bidType);

  const bidderScore       = bidWon ? bidderWin : -bidderLoss;
  // Each partner INDIVIDUALLY gets ±floor(bid/2) — NOT divided among partners.
  const partnerScoreEach  = numPartners > 0 ? (bidWon ? partnerEach : -partnerEach) : 0;
  const partnerTotalScore = numPartners * partnerScoreEach;

  return { bidderScore, partnerScoreEach, partnerTotalScore, winAmount: bidderWin };
}

function describeScoringFormula(bidAmount, bidType, bidWon) {
  const { bidderWin, bidderLoss, partnerEach } = getScoreAmounts(bidAmount, bidType);

  const ruleLabels = {
    normal:      'Normal (bid < 40) — win = +bid, loss = −bid',
    honors:      'Honors (40–55) — win = +bid, loss = −2×bid',
    initial_56:  'Initial 56 — win = +112, loss = −224',
    upgraded_56: 'Upgraded to 56 — win = +84, loss = −168',
  };

  return {
    rule:         ruleLabels[bidType] || bidType,
    bidderWin,
    bidderLoss,
    partnerEach,
    outcome:      bidWon ? 'WIN' : 'LOSS',
    bidderCalc:   bidWon ? `+${bidderWin}` : `−${bidderLoss}`,
    partnersCalc: bidWon ? `+${partnerEach} each` : `−${partnerEach} each`,
  };
}

module.exports = { getScoreAmounts, getBidType, getWinAmount, calculateScores, describeScoringFormula };
