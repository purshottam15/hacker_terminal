const express = require('express');
const Player = require('../models/Player');

const router = express.Router();

// GET /api/leaderboard
// Ordering: more levels unlocked first, then shorter completion/elapsed time.
router.get('/', async (req, res) => {
  try {
    const players = await Player.find({}).lean();

    const rows = players.map((p) => {
      const levelsCompleted = p.completedLevels.length;
      const endTime = p.completedAt || p.lastActiveAt || new Date();
      const elapsedMs = new Date(endTime) - new Date(p.startedAt);
      return {
        name: p.name,
        score: p.score,
        levelsCompleted,
        isComplete: !!p.completedAt,
        elapsedMs: Math.max(0, elapsedMs)
      };
    });

    rows.sort((a, b) => {
      if (b.levelsCompleted !== a.levelsCompleted) return b.levelsCompleted - a.levelsCompleted;
      return a.elapsedMs - b.elapsedMs;
    });

    res.json({ leaderboard: rows.slice(0, 50) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load leaderboard.' });
  }
});

module.exports = router;
