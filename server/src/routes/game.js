const express = require('express');
const Player = require('../models/Player');
const CommandResult = require('../models/CommandResult');
const config = require('../config');
const { requireAuth, requireParticipant } = require('../middleware/auth');
const { gameCommandLimiter } = require('../middleware/rateLimiters');
const { getEventState } = require('../services/eventState');
const { withPlayerLock } = require('../services/playerLocks');
const { enforceDeadline, serializePlayer } = require('../services/playerState');
const { runCommand } = require('../engine/gameEngine');

const router = express.Router();

function serializeEvent(event) {
  return {
    state: event.state,
    pausedAt: event.pausedAt,
    totalPausedMs: event.totalPausedMs
  };
}

function validateCommandId(commandId) {
  if (commandId === undefined || commandId === null || commandId === '') return null;
  const value = String(commandId).trim();
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(value)) return false;
  return value;
}

async function processInput({ playerId, input, commandId, receivedAt }) {
  return withPlayerLock(playerId, async () => {
    if (commandId) {
      const existing = await CommandResult.findOne({ playerId, commandId }).lean();
      if (existing) return existing.response;
    }

    const now = receivedAt;
    const event = await getEventState();
    const player = await Player.findById(playerId);
    if (!player) {
      const err = new Error('Participant not found.');
      err.status = 404;
      throw err;
    }

    if (event.state !== 'RUNNING') {
      const err = new Error(event.state === 'PAUSED' ? 'Event is paused.' : 'Event is not running.');
      err.status = 409;
      throw err;
    }

    await enforceDeadline(player, now, event);
    if (player.status !== 'PLAYING') {
      const response = {
        output: player.status === 'TIMED_OUT' ? ["TIME'S UP", `Final Score: ${player.score || 0}`] : ['Game is not accepting commands.'],
        events: [player.status],
        player: serializePlayer(player, { now, event }),
        event: serializeEvent(event),
        serverTime: now
      };
      if (commandId) {
        await CommandResult.create({
          playerId,
          commandId,
          response,
          expiresAt: new Date(now.getTime() + config.COMMAND_RESULT_TTL_MS)
        }).catch(() => {});
      }
      return response;
    }

    const { output, events } = runCommand(player, input);
    player.lastSeenAt = now;
    player.lastCommandAt = now;
    if (events.includes('GAME_COMPLETE')) {
      player.status = 'COMPLETED';
      player.completedAt = now;
    }
    player.markModified('hintProgress');
    await player.save();

    const response = {
      output,
      events,
      player: serializePlayer(player, { now, event }),
      event: serializeEvent(event),
      serverTime: now
    };

    if (commandId) {
      await CommandResult.create({
        playerId,
        commandId,
        response,
        expiresAt: new Date(now.getTime() + config.COMMAND_RESULT_TTL_MS)
      }).catch(() => {});
    }

    return response;
  });
}

router.use(requireAuth, requireParticipant);

router.get('/state', async (req, res, next) => {
  try {
    const now = new Date();
    const event = await getEventState();
    const player = await enforceDeadline(req.player, now, event);
    res.json({
      player: serializePlayer(player, { now, event }),
      event: serializeEvent(event),
      serverTime: now
    });
  } catch (err) {
    next(err);
  }
});

router.post('/start', async (req, res, next) => {
  try {
    const now = new Date();
    const event = await getEventState();
    if (event.state !== 'RUNNING') {
      return res.status(409).json({ error: event.state === 'PAUSED' ? 'Event is paused.' : 'Event is not running.' });
    }

    if (req.player.status === 'COMPLETED') {
      return res.status(409).json({ error: 'Game already completed.', player: serializePlayer(req.player, { now, event }) });
    }
    if (req.player.status === 'TIMED_OUT') {
      return res.status(410).json({ error: "TIME'S UP", player: serializePlayer(req.player, { now, event }) });
    }
    if (req.player.status === 'DISQUALIFIED') {
      return res.status(403).json({ error: 'This participant has been disqualified.' });
    }

    const expiresAt = new Date(now.getTime() + config.GAME_DURATION_MS);
    const player = await Player.findOneAndUpdate(
      {
        _id: req.player._id,
        role: 'participant',
        startedAt: null,
        status: { $in: ['READY', 'LOGGED_IN'] }
      },
      {
        $set: {
          status: 'PLAYING',
          startedAt: now,
          expiresAt,
          lastSeenAt: now
        }
      },
      { new: true }
    );

    if (!player) {
      const current = await Player.findById(req.player._id);
      return res.json({
        player: serializePlayer(current, { now, event }),
        event: serializeEvent(event),
        serverTime: now
      });
    }

    res.json({
      player: serializePlayer(player, { now, event }),
      event: serializeEvent(event),
      serverTime: now
    });
  } catch (err) {
    next(err);
  }
});

router.post('/command', gameCommandLimiter, async (req, res, next) => {
  const receivedAt = new Date();
  try {
    const input = req.body.input;
    if (typeof input !== 'string') return res.status(400).json({ error: 'input must be a string.' });
    if (input.length > 300) return res.status(400).json({ error: 'Command too long.' });
    const commandId = validateCommandId(req.body.commandId);
    if (commandId === false) return res.status(400).json({ error: 'Invalid commandId.' });

    const response = await processInput({
      playerId: req.player._id,
      input,
      commandId,
      receivedAt
    });

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.post('/hint', gameCommandLimiter, async (req, res, next) => {
  const receivedAt = new Date();

  try {
    const commandId = validateCommandId(
      req.body.commandId
    );

    if (commandId === false) {
      return res.status(400).json({
        error: 'Invalid commandId.'
      });
    }

    /*
     * The actual hint operation is still handled
     * by the same game engine.
     *
     * confirm=true:
     *     hint confirm
     *
     * confirm=false:
     *     hint
     */
    const input =
      req.body.confirm === true
        ? 'hint confirm'
        : 'hint';

    const response =
      await processInput({
        playerId: req.player._id,

        input,

        commandId,

        receivedAt
      });

    res.json(response);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
