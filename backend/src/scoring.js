/**
 * Super Trump Scoring Engine
 *
 * Multipliers per bid type:
 *   normal       (bid <  40)  → 1× (bid/2)
 *   honors       (40 ≤ bid < 56) → 2× (bid/2)  = bid
 *   initial_56   (56, first bid)  → 4× (56/2)  = 112
 *   upgraded_56  (56, mid-game)   → 3× (56/2)  = 84
 *
 * Win:  bidder = +winAmount, partners_total = +winAmount
 * Lose: bidder = −2×winAmount, partners_total = −2×winAmount
 */

const MULTIPLIERS = { normal: 1, honors: 2, initial_56: 4, upgraded_56: 3 };

function getBidType(bidAmount, wasUpgradedTo56 = false) {
  if (bidAmount === 56) return wasUpgradedTo56 ? 'upgraded_56' : 'initial_56';
  if (bidAmount >= 40)  return 'honors';
  return 'normal';
}

function getWinAmount(bidAmount, bidType) {
  return (MULTIPLIERS[bidType] || 1) * Math.floor(bidAmount / 2);
}

function calculateScores(bidAmount, bidType, bidWon, numPartners = 1) {
  const winAmount = getWinAmount(bidAmount, bidType);
  const bidderScore        = bidWon ? winAmount     : -2 * winAmount;
  const partnerTotalScore  = bidWon ? winAmount     : -2 * winAmount;
  const partnerScoreEach   = numPartners > 0
    ? (partnerTotalScore >= 0
        ? Math.floor(partnerTotalScore / numPartners)
        : Math.ceil(partnerTotalScore  / numPartners))
    : 0;

  return { bidderScore, partnerScoreEach, partnerTotalScore, winAmount };
}

function describeScoringFormula(bidAmount, bidType, bidWon) {
  const winAmount   = getWinAmount(bidAmount, bidType);
  const multiplier  = MULTIPLIERS[bidType] || 1;

  const ruleLabels = {
    normal:      'Normal bid (< 40)',
    honors:      'Honors bid (40+) — 2× normal',
    initial_56:  'Initial 56 bid — 4× normal',
    upgraded_56: 'Mid-game upgrade to 56 — 3× normal',
  };

  const formulaTexts = {
    normal:      `1 × (${bidAmount}/2) = ${winAmount}`,
    honors:      `2 × (${bidAmount}/2) = ${winAmount}`,
    initial_56:  `4 × (56/2) = 4 × 28 = ${winAmount}`,
    upgraded_56: `3 × (56/2) = 3 × 28 = ${winAmount}`,
  };

  return {
    rule:           ruleLabels[bidType],
    formula:        formulaTexts[bidType],
    multiplier,
    winAmount,
    outcome:        bidWon ? 'WIN' : 'LOSS',
    bidderCalc:     bidWon ? `+${winAmount}` : `-${2 * winAmount}  (2× win amount)`,
    partnersCalc:   bidWon ? `+${winAmount} shared` : `-${2 * winAmount} shared  (2× win amount)`,
  };
}

module.exports = { getBidType, getWinAmount, calculateScores, describeScoringFormula };
