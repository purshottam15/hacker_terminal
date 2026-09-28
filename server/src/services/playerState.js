const levels = require('../gameData/levels');
const { pathToString } = require('../engine/vfs');
const Player = require('../models/Player');

const TOTAL_LEVELS = levels.length;

const MAX_HINTS = 3;

const HINT_COSTS = [10, 20, 30];

function activeClockNow(now, event) {
  if (event?.state === 'PAUSED' && event.pausedAt) {
    return new Date(event.pausedAt);
  }

  return now;
}

function remainingSeconds(player, now = new Date(), event = null) {
  if (!player.expiresAt) return null;

  const effectiveNow = activeClockNow(now, event);

  return Math.max(
    0,
    Math.ceil(
      (new Date(player.expiresAt) - effectiveNow) / 1000
    )
  );
}

function elapsedMs(player, now = new Date()) {
  if (!player.startedAt) return 0;

  let end = now;

  if (player.completedAt) {
    end = player.completedAt;
  } else if (player.status === 'TIMED_OUT' && player.expiresAt) {
    end = player.expiresAt;
  }

  return Math.max(
    0,
    new Date(end) - new Date(player.startedAt)
  );
}

async function enforceDeadline(
  player,
  receivedAt = new Date(),
  event = null
) {
  if (
    !player ||
    player.status !== 'PLAYING' ||
    !player.expiresAt
  ) {
    return player;
  }

  if (event?.state === 'PAUSED') {
    return player;
  }

  if (receivedAt < new Date(player.expiresAt)) {
    return player;
  }

  player.status = 'TIMED_OUT';
  player.completedAt = player.completedAt || null;
  player.lastSeenAt = receivedAt;

  await player.save();

  return player;
}

async function enforceDeadlineById(
  playerId,
  receivedAt = new Date(),
  event = null
) {
  const player = await Player.findById(playerId);

  if (!player) return null;

  return enforceDeadline(player, receivedAt, event);
}

function getHintUsed(player) {
  const progress = player?.hintProgress;

  if (!progress || typeof progress !== 'object') {
    return 0;
  }

  /*
   * Supports the old format temporarily.
   * Old format looked like:
   *
   * {
   *   "1": 1,
   *   "2": 0
   * }
   */
  if (
    progress.totalUsed === undefined &&
    !progress.levels
  ) {
    return Object.values(progress).reduce((total, value) => {
      return total + (Number.isFinite(Number(value)) ? Number(value) : 0);
    }, 0);
  }

  return Math.min(
    MAX_HINTS,
    Math.max(0, Number(progress.totalUsed) || 0)
  );
}

function getHintCost(used) {
  if (used >= MAX_HINTS) {
    return null;
  }

  return HINT_COSTS[used];
}

function getHintInfo(player) {
  const used = getHintUsed(player);
  const remaining = Math.max(0, MAX_HINTS - used);
  const nextCost = getHintCost(used);

  return {
    maxHints: MAX_HINTS,
    hintsUsed: used,
    hintsRemaining: remaining,
    nextHintCost: nextCost
  };
}

function serializePlayer(player, options = {}) {
  const now = options.now || new Date();
  const event = options.event || null;

  const completedLevels = player.completedLevels || [];

  const rem = remainingSeconds(
    player,
    now,
    event
  );

  const hintInfo = getHintInfo(player);

  return {
    id: player._id,

    rollNo: player.rollNo,

    name: player.name,

    role: player.role,

    status: player.status,

    cwd: pathToString(player.cwd || []),

    score: player.score || 0,

    levelsCompleted: completedLevels.length,

    completedLevels,

    totalLevels: TOTAL_LEVELS,

    unlockedCommands: player.unlockedCommands || [],

    startedAt: player.startedAt,

    expiresAt: player.expiresAt,

    completedAt: player.completedAt,

    lastSeenAt: player.lastSeenAt,

    remainingSeconds: rem,

    timeExpired:
      player.status === 'TIMED_OUT' ||
      (
        player.status === 'PLAYING' &&
        rem === 0 &&
        event?.state !== 'PAUSED'
      ),

    isComplete: player.status === 'COMPLETED',

    /*
     * HINT INFORMATION
     */
    hintProgress: player.hintProgress || {
      totalUsed: 0,
      levels: {},
      pending: null
    },

    maxHints: hintInfo.maxHints,

    hintsUsed: hintInfo.hintsUsed,

    hintsRemaining: hintInfo.hintsRemaining,

    nextHintCost: hintInfo.nextHintCost
  };
}

function serializeAdminPlayer(player, options = {}) {
  const base = serializePlayer(player, options);

  return {
    rollNo: base.rollNo,

    name: base.name,

    status: base.status,

    score: base.score,

    currentLevel: Math.min(
      base.levelsCompleted + 1,
      base.totalLevels
    ),

    completedLevels: base.levelsCompleted,

    totalLevels: base.totalLevels,

    startedAt: base.startedAt,

    expiresAt: base.expiresAt,

    completedAt: base.completedAt,

    remainingSeconds: base.remainingSeconds,

    lastSeenAt: base.lastSeenAt,

    activeSession: !!player.activeSessionId,

    stale:
      !!player.lastSeenAt &&
      new Date(options.now || new Date()) -
        new Date(player.lastSeenAt) >
        (options.staleMs || 300000),

    /*
     * HINT INFORMATION
     */
    hintsUsed: base.hintsUsed,

    hintsRemaining: base.hintsRemaining,

    nextHintCost: base.nextHintCost
  };
}

module.exports = {
  TOTAL_LEVELS,

  MAX_HINTS,

  HINT_COSTS,

  remainingSeconds,

  elapsedMs,

  enforceDeadline,

  enforceDeadlineById,

  getHintUsed,

  getHintCost,

  getHintInfo,

  serializePlayer,

  serializeAdminPlayer
};