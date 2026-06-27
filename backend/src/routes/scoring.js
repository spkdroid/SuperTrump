const router = require('express').Router();
const { calculateScores, describeScoringFormula } = require('../scoring');

// POST /api/scoring/calculate  – preview scores without saving
router.post('/calculate', (req, res) => {
  const { bidAmount, bidType, bidWon, numPartners } = req.body;

  const bid  = parseInt(bidAmount, 10);
  const won  = bidWon === true || bidWon === 'true';
  const nPrt = parseInt(numPartners, 10) || 0;

  if (isNaN(bid) || bid < 28 || bid > 56)
    return res.status(400).json({ error: 'bidAmount must be 28–56' });
  if (!bidType)
    return res.status(400).json({ error: 'bidType is required' });

  const scores  = calculateScores(bid, bidType, won, nPrt);
  const formula = describeScoringFormula(bid, bidType, won);

  res.json({ ...scores, formula });
});

module.exports = router;
