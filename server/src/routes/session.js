const express = require('express');
const Player = require('../models/Player');
const Session = require('../models/Session');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/heartbeat', requireAuth, async (req, res, next) => {
  try {
    const now = new Date();
    await Promise.all([
      Session.updateOne({ _id: req.sessionDoc._id, revokedAt: null }, { $set: { lastSeenAt: now } }),
      Player.updateOne({ _id: req.player._id }, { $set: { lastSeenAt: now } })
    ]);
    res.json({ ok: true, serverTime: now });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
