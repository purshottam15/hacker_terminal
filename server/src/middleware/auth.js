const Session = require('../models/Session');
const Player = require('../models/Player');
const config = require('../config');
const { hashToken } = require('../utils/security');

function readSessionToken(req) {
  const signed = req.signedCookies?.[config.SESSION_COOKIE_NAME];
  if (signed === false) return null;
  return signed || req.cookies?.[config.SESSION_COOKIE_NAME] || null;
}

async function requireAuth(req, res, next) {
  try {
    const token = readSessionToken(req);
    if (!token) return res.status(401).json({ error: 'Unauthorized.' });

    const now = new Date();
    const tokenHash = hashToken(token);
    const session = await Session.findOne({
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: now }
    });

    if (!session) return res.status(401).json({ error: 'Unauthorized.' });

    const player = await Player.findById(session.playerId);
    if (!player) return res.status(401).json({ error: 'Unauthorized.' });
    if (!player.activeSessionId || String(player.activeSessionId) !== String(session._id)) {
      return res.status(401).json({ error: 'Session is no longer active.' });
    }

    const shouldTouch = !session.lastSeenAt || now - new Date(session.lastSeenAt) > 15000;
    if (shouldTouch) {
      session.lastSeenAt = now;
      player.lastSeenAt = now;
      await Promise.all([session.save(), player.save()]);
    }

    req.sessionDoc = session;
    req.player = player;
    next();
  } catch (err) {
    next(err);
  }
}

function requireAdmin(req, res, next) {
  if (!req.player || req.player.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

function requireParticipant(req, res, next) {
  if (!req.player || req.player.role !== 'participant') {
    return res.status(403).json({ error: 'Participant access required.' });
  }
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireParticipant,
  readSessionToken
};
