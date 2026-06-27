const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const { waitForDB } = require('./db');

const playersRouter     = require('./routes/players');
const gamesRouter       = require('./routes/games');
const roundsRouter      = require('./routes/rounds');
const leaderboardRouter = require('./routes/leaderboard');
const scoringRouter     = require('./routes/scoring');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

app.use('/api/players',     playersRouter);
app.use('/api/games',       gamesRouter);
app.use('/api/rounds',      roundsRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/scoring',     scoringRouter);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

(async () => {
  await waitForDB();
  app.listen(PORT, () => console.log(`🃏  Super Trump API running on port ${PORT}`));
})();

module.exports = app;
