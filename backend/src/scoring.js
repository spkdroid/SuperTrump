/**
 * Super Trump Scoring Engine
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

const MULTIPLIERS = { normal: 1, honors: 2, initial_56: 4, upgraded_56: 3 };

function getBidType(bidAmount, wasUpgradedTo56 = false) {
  if (bidAmount === 56) return wasUpgradedTo56 ? 'upgraded_56' : 'initial_56';
  if (bidAmount >= 40)  return 'honors';
  return 'normal';
}

function getWinAmount(bidAmount, bidType) {
  return (MULTIPLIERS[bidType] || 1) * Math.floor(bidAmount / 2);
}

function calculateScores(bidAmount, bidType, bidWon, numPartners = 0) {
  const winAmount = getWinAmount(bidAmount, bidType);

  // Win:  each side earns +winAmount
  // Loss: each side pays  −2×winAmount  (double penalty)
  const bidderScore       = bidWon ? winAmount : -(2 * winAmount);
  const partnerTotalScore = bidWon ? winAmount : -(2 * winAmount);

  // Divide partners' share evenly; ceil on negatives avoids over-penalising
  // individual partners due to integer rounding.
  const partnerScoreEach =
    numPartners > 0
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

  const lossAmount = 2 * winAmount;
  return {
    rule:           ruleLabels[bidType],
    formula:        formulaTexts[bidType],
    multiplier,
    winAmount,
    lossAmount,
    outcome:        bidWon ? 'WIN' : 'LOSS',
    bidderCalc:     bidWon ? `+${winAmount}` : `-${lossAmount}  (2× win amount)`,
    partnersCalc:   bidWon ? `+${winAmount} shared` : `-${lossAmount} shared  (2× win amount)`,
  };
}

module.exports = { MULTIPLIERS, getBidType, getWinAmount, calculateScores, describeScoringFormula };
