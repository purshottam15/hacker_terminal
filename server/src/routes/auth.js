const express = require('express');
const mongoose = require('mongoose');
const Player = require('../models/Player');
const Session = require('../models/Session');
const config = require('../config');
const { loginLimiter } = require('../middleware/rateLimiters');
const { requireAuth } = require('../middleware/auth');
const { getEventState } = require('../services/eventState');
const { enforceDeadline, serializePlayer } = require('../services/playerState');

const {
  normalizeRollNo,
  generateSessionToken,
  hashToken,
  verifyPin,
  sessionCookieOptions,
  clearSessionCookieOptions,
  safeUserAgent
} = require('../utils/security');

const router = express.Router();

const failedLogins = new Map();

const FAILURE_LIMIT = 6;
const FAILURE_WINDOW_MS = 10 * 60 * 1000;

function genericLoginFailure(res) {
  return res.status(401).json({
    error: 'Invalid roll number or PIN.'
  });
}

function failedKey(rollNo, ip) {
  return `${rollNo || 'unknown'}:${ip || 'unknown'}`;
}

function isBlocked(rollNo, ip, now) {
  const key = failedKey(rollNo, ip);
  const record = failedLogins.get(key);

  if (!record) return false;

  if (record.resetAt <= now) {
    failedLogins.delete(key);
    return false;
  }

  return record.count >= FAILURE_LIMIT;
}

function recordFailure(rollNo, ip, now) {
  const key = failedKey(rollNo, ip);
  const record = failedLogins.get(key);

  if (!record || record.resetAt <= now) {
    failedLogins.set(key, {
      count: 1,
      resetAt: now + FAILURE_WINDOW_MS
    });
    return;
  }

  record.count += 1;
}

function clearFailures(rollNo, ip) {
  failedLogins.delete(failedKey(rollNo, ip));
}

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const startedAt = Date.now();

    const now = new Date();

    const rollNo = normalizeRollNo(req.body.rollNo);
    const pin = String(req.body.pin || '');
    const ip = req.ip;

    if (
      !rollNo ||
      !pin ||
      rollNo.length > 32 ||
      pin.length > 64
    ) {
      return genericLoginFailure(res);
    }

    if (isBlocked(rollNo, ip, now.getTime())) {
      return res.status(429).json({
        error: 'Too many login attempts. Please wait and try again.'
      });
    }

    /*
     * ---------------------------------------------------------
     * 1. FIND PLAYER
     * ---------------------------------------------------------
     */

    // console.time(`LOGIN_FIND:${rollNo}`);

    const player = await Player
      .findOne({ rollNo })
      .select('+pinHash');

    // console.timeEnd(`LOGIN_FIND:${rollNo}`);

    /*
     * ---------------------------------------------------------
     * 2. VERIFY PIN
     * ---------------------------------------------------------
     */

    // console.time(`LOGIN_BCRYPT:${rollNo}`);

    const ok = player
      ? await verifyPin(pin, player.pinHash)
      : false;

    // console.timeEnd(`LOGIN_BCRYPT:${rollNo}`);

    if (!ok) {
      recordFailure(rollNo, ip, now.getTime());
      return genericLoginFailure(res);
    }

    if (player.status === 'DISQUALIFIED') {
      return res.status(403).json({
        error: 'This participant is not allowed to continue.'
      });
    }

    clearFailures(rollNo, ip);

    /*
     * ---------------------------------------------------------
     * 3. CREATE SESSION
     * ---------------------------------------------------------
     */

    const sessionId = new mongoose.Types.ObjectId();

    const rawToken = generateSessionToken();

    const expiresAt = new Date(
      now.getTime() + config.SESSION_DURATION_MS
    );

    const session = new Session({
      _id: sessionId,
      tokenHash: hashToken(rawToken),
      playerId: player._id,
      role: player.role,
      createdAt: now,
      lastSeenAt: now,
      expiresAt,
      ip,
      userAgent: safeUserAgent(req.get('user-agent'))
    });

    /*
     * ---------------------------------------------------------
     * 4. UPDATE PLAYER SESSION
     * ---------------------------------------------------------
     */

    const staleCutoff = new Date(
      now.getTime() - config.ACTIVE_SESSION_STALE_MS
    );

    const nextStatus =
      player.role === 'participant' &&
      player.status === 'READY'
        ? 'LOGGED_IN'
        : player.status;

    // console.time(`LOGIN_PLAYER_UPDATE:${rollNo}`);

    const updatedPlayer = await Player.findOneAndUpdate(
      {
        _id: player._id,
        $or: [
          { activeSessionId: null },
          { activeSessionId: { $exists: false } },
          { activeSessionExpiresAt: { $lte: now } },
          { lastSeenAt: { $lte: staleCutoff } }
        ]
      },
      {
        $set: {
          activeSessionId: sessionId,
          activeSessionExpiresAt: expiresAt,
          lastSeenAt: now,
          status: nextStatus
        }
      },
      {
        new: true
      }
    );

    // console.timeEnd(`LOGIN_PLAYER_UPDATE:${rollNo}`);

    /*
     * Another device/session is currently active.
     */

    if (!updatedPlayer) {
      return res.status(409).json({
        error: 'This participant is already active on another device.'
      });
    }

    /*
     * ---------------------------------------------------------
     * 5. SAVE SESSION
     * ---------------------------------------------------------
     */

    // console.time(`LOGIN_SESSION_SAVE:${rollNo}`);

    await session.save();

    // console.timeEnd(`LOGIN_SESSION_SAVE:${rollNo}`);

    /*
     * ---------------------------------------------------------
     * 6. REVOKE OLD SESSIONS
     * ---------------------------------------------------------
     */

    // console.time(`LOGIN_SESSION_UPDATE:${rollNo}`);

    await Session.updateMany(
      {
        playerId: player._id,
        _id: { $ne: sessionId },
        revokedAt: null
      },
      {
        $set: {
          revokedAt: now,
          revokedReason: 'REPLACED_STALE_OR_EXPIRED_SESSION'
        }
      }
    );

    // console.timeEnd(`LOGIN_SESSION_UPDATE:${rollNo}`);

    /*
     * ---------------------------------------------------------
     * 7. GET EVENT STATE
     * ---------------------------------------------------------
     */

    // console.time(`LOGIN_EVENT_STATE:${rollNo}`);

    const event = await getEventState();

    // console.timeEnd(`LOGIN_EVENT_STATE:${rollNo}`);

    /*
     * ---------------------------------------------------------
     * 8. CHECK DEADLINE
     * ---------------------------------------------------------
     */

    // console.time(`LOGIN_DEADLINE:${rollNo}`);

    await enforceDeadline(updatedPlayer, now, event);

    // console.timeEnd(`LOGIN_DEADLINE:${rollNo}`);

    /*
     * ---------------------------------------------------------
     * 9. COOKIE + RESPONSE
     * ---------------------------------------------------------
     */

    res.cookie(
      config.SESSION_COOKIE_NAME,
      rawToken,
      sessionCookieOptions(config.SESSION_DURATION_MS)
    );

    const totalTime = Date.now() - startedAt;

 
    res.json({
      player: serializePlayer(updatedPlayer, {
        now,
        event
      }),

      event: {
        state: event.state,
        pausedAt: event.pausedAt
      },

      serverTime: now
    });

  } catch (err) {
    next(err);
  }
});


/*
 * ============================================================
 * LOGOUT
 * ============================================================
 */

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const now = new Date();

    await Session.updateOne(
      { _id: req.sessionDoc._id },
      {
        $set: {
          revokedAt: now,
          revokedReason: 'LOGOUT'
        }
      }
    );

    const nextStatus =
      req.player.role === 'participant' &&
      req.player.status === 'LOGGED_IN'
        ? 'READY'
        : req.player.status;

    await Player.updateOne(
      { _id: req.player._id },
      {
        $set: {
          activeSessionId: null,
          activeSessionExpiresAt: null,
          status: nextStatus
        }
      }
    );

    res.clearCookie(
      config.SESSION_COOKIE_NAME,
      clearSessionCookieOptions()
    );

    res.json({
      ok: true
    });

  } catch (err) {
    next(err);
  }
});


/*
 * ============================================================
 * CURRENT USER
 * ============================================================
 */

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const now = new Date();

    const event = await getEventState();

    const player = await enforceDeadline(
      req.player,
      now,
      event
    );

    res.json({
      authenticated: true,

      player: serializePlayer(player, {
        now,
        event
      }),

      event: {
        state: event.state,
        pausedAt: event.pausedAt
      },

      serverTime: now
    });

  } catch (err) {
    next(err);
  }
});


module.exports = router;