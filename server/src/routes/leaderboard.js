const express = require('express');
const Player = require('../models/Player');
const { elapsedMs } = require('../services/playerState');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const now = new Date();
    const players = await Player.find({ role: 'participant', status: { $ne: 'DISQUALIFIED' } })
      .select('rollNo name score completedLevels status startedAt completedAt expiresAt lastSeenAt')
      .lean();

    const rows = players.map((player) => ({
      rollNo: player.rollNo,
      name: player.name,
      score: player.score || 0,
      levelsCompleted: player.completedLevels?.length || 0,
      status: player.status,
      isComplete: player.status === 'COMPLETED',
      elapsedMs: elapsedMs(player, now)
    }));

    rows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.levelsCompleted !== a.levelsCompleted) return b.levelsCompleted - a.levelsCompleted;
      return a.elapsedMs - b.elapsedMs;
    });

    res.json({ leaderboard: rows.slice(0, 50), serverTime: now });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
