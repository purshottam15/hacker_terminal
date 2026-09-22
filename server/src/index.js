require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const playersRouter = require('./routes/players');
const leaderboardRouter = require('./routes/leaderboard');
const metaRouter = require('./routes/meta');

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hackers-terminal';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/players', playersRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/meta', metaRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

connectDB(MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`Hacker's Terminal server listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
