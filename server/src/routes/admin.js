const express = require('express');
const Player = require('../models/Player');
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');
const EventState = require('../models/EventState');
const config = require('../config');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { adminActionLimiter } = require('../middleware/rateLimiters');
const { getEventState } = require('../services/eventState');
const { audit } = require('../services/audit');
const { serializeAdminPlayer, serializePlayer, elapsedMs } = require('../services/playerState');
const { normalizeRollNo } = require('../utils/security');

const router = express.Router();

router.use(requireAuth, requireAdmin, adminActionLimiter);

function serializeEvent(event) {
  return {
    state: event.state,
    pausedAt: event.pausedAt,
    totalPausedMs: event.totalPausedMs,
    updatedByRollNo: event.updatedByRollNo,
    updatedAt: event.updatedAt
  };
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const str = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function durationText(ms) {
  if (!ms) return '';
  const totalSeconds = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

async function findParticipant(rollNo) {
  const normalized = normalizeRollNo(rollNo);
  if (!normalized) return null;
  return Player.findOne({ rollNo: normalized, role: 'participant' });
}

router.get('/dashboard', async (req, res, next) => {
  try {
    const now = new Date();
    const event = await getEventState();
    const players = await Player.find({
  role: 'participant'
})
  .sort({
    score: -1,
    completedAt: 1
  })
  .lean();
    const staleCutoff = new Date(now.getTime() - config.ACTIVE_SESSION_STALE_MS);
    const rows = players.map((player) => serializeAdminPlayer(player, {
      now,
      event,
      staleMs: config.ACTIVE_SESSION_STALE_MS
    }));

    const stats = {
      totalParticipants: players.length,
      ready: players.filter((p) => p.status === 'READY').length,
      loggedIn: players.filter((p) => p.status === 'LOGGED_IN').length,
      playing: players.filter((p) => p.status === 'PLAYING').length,
      completed: players.filter((p) => p.status === 'COMPLETED').length,
      timedOut: players.filter((p) => p.status === 'TIMED_OUT').length,
      disqualified: players.filter((p) => p.status === 'DISQUALIFIED').length,
      disconnectedStale: players.filter((p) =>
        p.activeSessionId &&
        p.lastSeenAt &&
        new Date(p.lastSeenAt) < staleCutoff &&
        ['LOGGED_IN', 'PLAYING'].includes(p.status)
      ).length
    };

    res.json({
      stats,
      players: rows,
      event: serializeEvent(event),
      serverTime: now
    });
  } catch (err) {
    next(err);
  }
});

router.get('/players/:rollNo', async (req, res, next) => {
  try {
    const now = new Date();
    const event = await getEventState();
    const player = await findParticipant(req.params.rollNo);
    if (!player) return res.status(404).json({ error: 'Participant not found.' });
    res.json({
      player: serializePlayer(player, { now, event }),
      event: serializeEvent(event),
      serverTime: now
    });
  } catch (err) {
    next(err);
  }
});

router.post('/players/:rollNo/reset-session', async (req, res, next) => {
  try {
    const now = new Date();
    const reason = String(req.body.reason || '').trim().slice(0, 500) || 'Admin reset';
    const player = await findParticipant(req.params.rollNo);
    if (!player) return res.status(404).json({ error: 'Participant not found.' });

    const oldValue = {
      activeSessionId: player.activeSessionId,
      activeSessionExpiresAt: player.activeSessionExpiresAt,
      status: player.status
    };
    const nextStatus = player.status === 'LOGGED_IN' ? 'READY' : player.status;

    await Session.updateMany(
      { playerId: player._id, revokedAt: null },
      { $set: { revokedAt: now, revokedReason: 'ADMIN_RESET' } }
    );
    player.activeSessionId = null;
    player.activeSessionExpiresAt = null;
    player.status = nextStatus;
    await player.save();

    await audit(req.player, 'RESET_SESSION', {
      rollNo: player.rollNo,
      reason,
      oldValue,
      newValue: { activeSessionId: null, activeSessionExpiresAt: null, status: nextStatus }
    });

    res.json({ ok: true, player: serializePlayer(player, { now, event: await getEventState() }) });
  } catch (err) {
    next(err);
  }
});

router.post('/players/:rollNo/extend-time', async (req, res, next) => {
  try {
    const now = new Date();
    const reason = String(req.body.reason || '').trim().slice(0, 500);
    const minutes = Number(req.body.minutes);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 120) {
      return res.status(400).json({ error: 'minutes must be between 1 and 120.' });
    }
    if (!reason) return res.status(400).json({ error: 'A reason is required.' });

    const player = await findParticipant(req.params.rollNo);
    if (!player) return res.status(404).json({ error: 'Participant not found.' });
    if (!player.startedAt || !player.expiresAt) {
      return res.status(409).json({ error: 'This participant has not started the game.' });
    }
    if (player.status === 'COMPLETED' || player.status === 'DISQUALIFIED') {
      return res.status(409).json({ error: 'Cannot extend this participant.' });
    }

    const oldValue = { expiresAt: player.expiresAt, status: player.status };
    player.expiresAt = new Date(new Date(player.expiresAt).getTime() + minutes * 60 * 1000);
    if (player.status === 'TIMED_OUT' && player.expiresAt > now) {
      player.status = 'PLAYING';
    }
    await player.save();

    await audit(req.player, 'EXTEND_TIME', {
      rollNo: player.rollNo,
      reason,
      oldValue,
      newValue: { expiresAt: player.expiresAt, status: player.status, minutes }
    });

    res.json({ ok: true, player: serializePlayer(player, { now, event: await getEventState() }) });
  } catch (err) {
    next(err);
  }
});

router.post('/players/:rollNo/disqualify', async (req, res, next) => {
  try {
    const now = new Date();
    const reason = String(req.body.reason || '').trim().slice(0, 500);
    if (!reason) return res.status(400).json({ error: 'A reason is required.' });

    const player = await findParticipant(req.params.rollNo);
    if (!player) return res.status(404).json({ error: 'Participant not found.' });
    const oldValue = { status: player.status, activeSessionId: player.activeSessionId };

    await Session.updateMany(
      { playerId: player._id, revokedAt: null },
      { $set: { revokedAt: now, revokedReason: 'DISQUALIFIED' } }
    );
    player.status = 'DISQUALIFIED';
    player.disqualifiedAt = now;
    player.disqualifiedReason = reason;
    player.activeSessionId = null;
    player.activeSessionExpiresAt = null;
    await player.save();

    await audit(req.player, 'DISQUALIFY', {
      rollNo: player.rollNo,
      reason,
      oldValue,
      newValue: { status: player.status, disqualifiedAt: player.disqualifiedAt }
    });

    res.json({ ok: true, player: serializePlayer(player, { now, event: await getEventState() }) });
  } catch (err) {
    next(err);
  }
});

router.post('/event/start', async (req, res, next) => {
  try {
    const now = new Date();

    const reason =
      String(req.body.reason || '').trim().slice(0, 500) ||
      'Event started';

    const event = await getEventState();

    /*
     * A new event can start when:
     * - the system has never started an event
     * - the previous event has finished
     *
     * Do NOT allow starting while RUNNING or PAUSED.
     */
    if (event.state === 'RUNNING') {
      return res.status(409).json({
        error: 'Event is already running.'
      });
    }

    if (event.state === 'PAUSED') {
      return res.status(409).json({
        error: 'Event is paused. Resume it instead.'
      });
    }

    const oldValue = serializeEvent(event);

    /*
     * If the previous event was FINISHED,
     * prepare all participants for a completely new event.
     *
     * This reuses the same reset logic as /reset-all,
     * but happens automatically when the new event starts.
     */
    if (event.state === 'FINISHED') {
      const players = await Player.find({
        role: 'participant'
      });

      const playerIds = players.map((player) => player._id);

      /*
       * Revoke all old participant sessions.
       *
       * This is important because we don't want a session
       * from the previous event to remain valid.
       */
      if (playerIds.length) {
        await Session.updateMany(
          {
            playerId: { $in: playerIds },
            role: 'participant',
            revokedAt: null
          },
          {
            $set: {
              revokedAt: now,
              revokedReason: 'NEW_EVENT_STARTED'
            }
          }
        );

        /*
         * Reset gameplay data.
         *
         * Account information such as:
         * rollNo
         * name
         * pinHash
         * role
         *
         * is NOT changed.
         */
        await Player.updateMany(
          {
            role: 'participant'
          },
          {
            $set: {
              status: 'READY',

              cwd: [],

              unlockedKeys: [],

              unlockedCommands: [
                ...require('../gameData/commands')
              ]
                .filter((c) => !c.requiresKey)
                .map((c) => c.name),

              completedLevels: [],

              score: 0,

              hintProgress: {},

              startedAt: null,
              expiresAt: null,
              completedAt: null,

              lastCommandAt: null,

              activeSessionId: null,
              activeSessionExpiresAt: null,

              disqualifiedAt: null,
              disqualifiedReason: null
            }
          }
        );

        await audit(req.player, 'RESET_ALL_PLAYERS', {
          reason: 'Automatic reset for new event',
          playerCount: players.length,
          oldValue: {
            playerCount: players.length
          },
          newValue: {
            status: 'READY',
            completedLevels: [],
            score: 0,
            sessionsRevoked: true
          }
        });
      }
    }

    /*
     * Start the new event.
     */
    event.state = 'RUNNING';
    event.pausedAt = null;
    event.totalPausedMs = 0;

    event.updatedBy = req.player._id;
    event.updatedByRollNo = req.player.rollNo;

    await event.save();

    await audit(req.player, 'START_EVENT', {
      reason,
      oldValue,
      newValue: serializeEvent(event)
    });

    res.json({
      ok: true,
      event: serializeEvent(event),
      serverTime: now
    });
  } catch (err) {
    next(err);
  }
});

router.post('/event/pause', async (req, res, next) => {
  try {
    const now = new Date();
    const reason = String(req.body.reason || '').trim().slice(0, 500);
    if (!reason) return res.status(400).json({ error: 'A reason is required.' });
    const event = await getEventState();
    if (event.state !== 'RUNNING') return res.status(409).json({ error: `Event is ${event.state}.` });
    const oldValue = serializeEvent(event);
    event.state = 'PAUSED';
    event.pausedAt = now;
    event.updatedBy = req.player._id;
    event.updatedByRollNo = req.player.rollNo;
    await event.save();
    await audit(req.player, 'PAUSE_EVENT', { reason, oldValue, newValue: serializeEvent(event) });
    res.json({ ok: true, event: serializeEvent(event), serverTime: now });
  } catch (err) {
    next(err);
  }
});

router.post('/event/resume', async (req, res, next) => {
  try {
    const now = new Date();
    const reason = String(req.body.reason || '').trim().slice(0, 500);
    if (!reason) return res.status(400).json({ error: 'A reason is required.' });
    const event = await getEventState();
    if (event.state !== 'PAUSED' || !event.pausedAt) {
      return res.status(409).json({ error: `Event is ${event.state}.` });
    }

    const oldValue = serializeEvent(event);
    const pausedAt = new Date(event.pausedAt);
    const pauseMs = Math.max(0, now - pausedAt);
    const playing = await Player.find({
      role: 'participant',
      status: 'PLAYING',
      expiresAt: { $gt: pausedAt }
    }).select('expiresAt');

    if (playing.length) {
      await Player.bulkWrite(playing.map((player) => ({
        updateOne: {
          filter: { _id: player._id },
          update: { $set: { expiresAt: new Date(new Date(player.expiresAt).getTime() + pauseMs) } }
        }
      })));
    }

    event.state = 'RUNNING';
    event.totalPausedMs = (event.totalPausedMs || 0) + pauseMs;
    event.pausedAt = null;
    event.updatedBy = req.player._id;
    event.updatedByRollNo = req.player.rollNo;
    await event.save();

    await audit(req.player, 'RESUME_EVENT', {
      reason,
      oldValue,
      newValue: { ...serializeEvent(event), extendedPlayers: playing.length, pauseMs }
    });

    res.json({ ok: true, event: serializeEvent(event), extendedPlayers: playing.length, serverTime: now });
  } catch (err) {
    next(err);
  }
});

router.post('/event/end', async (req, res, next) => {
  try {
    const now = new Date();
    const reason = String(req.body.reason || '').trim().slice(0, 500);
    if (!reason) return res.status(400).json({ error: 'A reason is required.' });
    const event = await getEventState();
    if (event.state === 'FINISHED') return res.status(409).json({ error: 'Event is already finished.' });
    const oldValue = serializeEvent(event);
    event.state = 'FINISHED';
    event.pausedAt = null;
    event.updatedBy = req.player._id;
    event.updatedByRollNo = req.player.rollNo;
    await event.save();
    await audit(req.player, 'END_EVENT', { reason, oldValue, newValue: serializeEvent(event) });
    res.json({ ok: true, event: serializeEvent(event), serverTime: now });
  } catch (err) {
    next(err);
  }
});

router.get('/audit', async (req, res, next) => {
  try {
    const logs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

router.get('/export', async (req, res, next) => {
  try {
    const now = new Date();
    const players = await Player.find({ role: 'participant' }).lean();
    players.sort((a, b) => {
      if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
      if ((b.completedLevels?.length || 0) !== (a.completedLevels?.length || 0)) {
        return (b.completedLevels?.length || 0) - (a.completedLevels?.length || 0);
      }
      return elapsedMs(a, now) - elapsedMs(b, now);
    });

    const header = [
      'Rank',
      'Roll Number',
      'Participant Name',
      'Completed Levels',
      'Score',
      'Started At',
      'Completed At',
      'Duration',
      'Status'
    ];
    const rows = players.map((player, index) => [
      index + 1,
      player.rollNo,
      player.name,
      player.completedLevels?.length || 0,
      player.score || 0,
      player.startedAt ? new Date(player.startedAt).toISOString() : '',
      player.completedAt ? new Date(player.completedAt).toISOString() : '',
      durationText(elapsedMs(player, now)),
      player.status
    ]);

    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="hackers-terminal-results.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});


router.post('/reset-all', async (req, res, next) => {
  try {
    const now = new Date();
    const reason =
      String(req.body.reason || '').trim().slice(0, 500) ||
      'Admin reset all players';

    // Only participants are affected.
    const players = await Player.find({ role: 'participant' });

    if (!players.length) {
      await audit(req.player, 'RESET_ALL_PLAYERS', {
        reason,
        playerCount: 0,
        oldValue: {},
        newValue: { reset: true }
      });

      return res.json({
        ok: true,
        resetCount: 0,
        message: 'No participants to reset.'
      });
    }

    const playerIds = players.map((player) => player._id);

    // Kill every active session belonging to participants.
    await Session.updateMany(
      {
        playerId: { $in: playerIds },
        role: 'participant',
        revokedAt: null
      },
      {
        $set: {
          revokedAt: now,
          revokedReason: 'ADMIN_RESET_ALL'
        }
      }
    );

    // Reset only gameplay state.
    await Player.updateMany(
      {
        role: 'participant'
      },
      {
        $set: {
          status: 'READY',

          cwd: [],
          unlockedKeys: [],
          unlockedCommands: [...require('../gameData/commands')]
            .filter((c) => !c.requiresKey)
            .map((c) => c.name),
          completedLevels: [],
          score: 0,
          hintProgress: {},

          startedAt: null,
          expiresAt: null,
          completedAt: null,
          lastCommandAt: null,

          activeSessionId: null,
          activeSessionExpiresAt: null,

          disqualifiedAt: null,
          disqualifiedReason: null
        }
      }
    );

    await audit(req.player, 'RESET_ALL_PLAYERS', {
      reason,
      playerCount: players.length,
      oldValue: {
        playerCount: players.length
      },
      newValue: {
        status: 'READY',
        completedLevels: [],
        score: 0,
        sessionsRevoked: true
      }
    });

    const event = await getEventState();

    res.json({
      ok: true,
      resetCount: players.length,
      event: serializeEvent(event),
      serverTime: now,
      message: `Reset ${players.length} participant(s).`
    });
  } catch (err) {
    next(err);
  }
});

router.post('/extend-all-time', requireAuth, async (req, res, next) => {
  try {
    if (req.player.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required.'
      });
    }

    const minutes = parseInt(req.body.minutes, 10);

    if (Number.isNaN(minutes) || minutes <= 0 || minutes > 120) {
      return res.status(400).json({
        error: 'Minutes must be a number between 1 and 120.'
      });
    }

    const extensionMs = minutes * 60 * 1000;

    const result = await Player.updateMany(
      {
        role: 'participant',
        status: 'PLAYING',
        expiresAt: { $ne: null }
      },
      [
        {
          $set: {
            expiresAt: {
              $add: [
                '$expiresAt',
                extensionMs
              ]
            }
          }
        }
      ]
    );

    res.json({
      ok: true,
      minutesAdded: minutes,
      playersExtended: result.modifiedCount
    });

  } catch (err) {
    console.error('EXTEND ALL TIME ERROR:', err);
    next(err);
  }
});

module.exports = router;
