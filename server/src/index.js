require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const mongoose = require('mongoose');
const connectDB = require('./db');
const config = require('./config');
const authRouter = require('./routes/auth');
const gameRouter = require('./routes/game');
const sessionRouter = require('./routes/session');
const adminRouter = require('./routes/admin');
const leaderboardRouter = require('./routes/leaderboard');
const metaRouter = require('./routes/meta');
const playersRouter = require('./routes/players');
const { getEventState } = require('./services/eventState');

const app = express();
const allowedOrigins = config.FRONTEND_URL.split(',').map((origin) => origin.trim()).filter(Boolean);

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: config.JSON_BODY_LIMIT }));
app.use(cookieParser(config.SESSION_SECRET));

async function healthPayload() {
  const event = await getEventState().catch(() => null);
  return {
    ok: mongoose.connection.readyState === 1,
    api: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    eventStatus: event?.state || 'UNKNOWN',
    serverTime: new Date()
  };
}

app.get('/health', async (req, res) => res.json(await healthPayload()));
app.get('/api/health', async (req, res) => res.json(await healthPayload()));

app.use('/api/auth', authRouter);
app.use('/api/game', gameRouter);
app.use('/api/session', sessionRouter);
app.use('/api/admin', adminRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/meta', metaRouter);
app.use('/api/players', playersRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || (err.name === 'ValidationError' ? 400 : 500);
  if (status >= 500) {
    console.error(err);
  } else {
    console.warn(err.message);
  }
  res.status(status).json({
    error: status >= 500 && config.isProduction ? 'Internal server error.' : err.message || 'Request failed.'
  });
});

connectDB(config.MONGODB_URI)
  .then(async () => {
    await getEventState();
    app.listen(config.PORT, () => console.log(`Hacker's Terminal server listening on port ${config.PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

module.exports = app;
