const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const { waitForDB, runMigrations } = require('./db');

const authRouter        = require('./routes/auth');
const playersRouter     = require('./routes/players');
const gamesRouter       = require('./routes/games');
const roundsRouter      = require('./routes/rounds');
const leaderboardRouter = require('./routes/leaderboard');
const activityRouter    = require('./routes/activity');
const scoringRouter     = require('./routes/scoring');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

app.use('/api/auth',        authRouter);
app.use('/api/players',     playersRouter);
app.use('/api/games',       gamesRouter);
app.use('/api/rounds',      roundsRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/activity',    activityRouter);
app.use('/api/scoring',     scoringRouter);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

(async () => {
  await waitForDB();
  await runMigrations();
  app.listen(PORT, () => console.log(`🃏  Super Trump API running on port ${PORT}`));
})();

module.exports = app;
