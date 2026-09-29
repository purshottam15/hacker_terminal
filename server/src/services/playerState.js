const levels = require('../gameData/levels');
const { pathToString } = require('../engine/vfs');
const Player = require('../models/Player');

const TOTAL_LEVELS = levels.length;

/*
 * HINT SYSTEM
 * ------------
 * 2 hints PER LEVEL.
 *
 * Hint 1 = 25% of level points
 * Hint 2 = remaining 75% of level points
 *
 * Example:
 *
 * Level = 400 points
 *
 * Hint 1 = 100
 * Hint 2 = 300
 *
 * Total possible deduction = 400
 */
const MAX_HINTS = 2;

/*
 * Kept as a compatibility export.
 *
 * Do NOT use this as the actual cost calculation.
 * Hint costs depend on the current level's points.
 */
const HINT_COSTS = [0.25, 0.75];

/**
 * Returns the effective current time for the game clock.
 *
 * When the event is paused, the player's timer should
 * stop at event.pausedAt.
 */
function activeClockNow(now, event) {
  if (
    event?.state === 'PAUSED' &&
    event.pausedAt
  ) {
    return new Date(event.pausedAt);
  }

  return now;
}

/**
 * Returns remaining player time in seconds.
 */
function remainingSeconds(
  player,
  now = new Date(),
  event = null
) {
  if (!player.expiresAt) {
    return null;
  }

  const effectiveNow =
    activeClockNow(
      now,
      event
    );

  return Math.max(
    0,
    Math.ceil(
      (
        new Date(player.expiresAt) -
        effectiveNow
      ) / 1000
    )
  );
}

/**
 * Returns how long the player actually spent playing.
 */
function elapsedMs(
  player,
  now = new Date()
) {
  if (!player.startedAt) {
    return 0;
  }

  let end = now;

  if (player.completedAt) {
    end = player.completedAt;
  } else if (
    player.status === 'TIMED_OUT' &&
    player.expiresAt
  ) {
    end = player.expiresAt;
  }

  return Math.max(
    0,
    new Date(end) -
      new Date(player.startedAt)
  );
}

/**
 * Automatically marks a player as TIMED_OUT
 * when their deadline has passed.
 */
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

  /*
   * Do not expire players while the event
   * is globally paused.
   */
  if (
    event?.state === 'PAUSED'
  ) {
    return player;
  }

  if (
    receivedAt <
    new Date(player.expiresAt)
  ) {
    return player;
  }

  player.status =
    'TIMED_OUT';

  player.completedAt =
    player.completedAt || null;

  player.lastSeenAt =
    receivedAt;

  await player.save();

  return player;
}

/**
 * Same deadline enforcement but loads
 * the player from MongoDB first.
 */
async function enforceDeadlineById(
  playerId,
  receivedAt = new Date(),
  event = null
) {
  const player =
    await Player.findById(
      playerId
    );

  if (!player) {
    return null;
  }

  return enforceDeadline(
    player,
    receivedAt,
    event
  );
}

/**
 * Normalize hint progress.
 *
 * Current format:
 *
 * {
 *   totalUsed: 0,
 *   levels: {
 *     "1": 1,
 *     "2": 0
 *   },
 *   pending: null
 * }
 *
 * IMPORTANT:
 *
 * `levels[levelId]` is the actual source
 * for per-level hint usage.
 */
function normalizeHintProgress(
  player
) {
  let progress =
    player?.hintProgress;

  if (
    !progress ||
    typeof progress !== 'object' ||
    Array.isArray(progress)
  ) {
    progress = {
      totalUsed: 0,
      levels: {},
      pending: null
    };

    if (player) {
      player.hintProgress =
        progress;
    }

    return progress;
  }

  /*
   * Convert old format:
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
    const levelsProgress = {};

    let totalUsed = 0;

    for (
      const [levelId, value]
      of Object.entries(progress)
    ) {
      const count =
        Math.max(
          0,
          Math.min(
            MAX_HINTS,
            Number(value) || 0
          )
        );

      levelsProgress[levelId] =
        count;

      totalUsed += count;
    }

    progress = {
      totalUsed,
      levels:
        levelsProgress,
      pending: null
    };

    if (player) {
      player.hintProgress =
        progress;
    }

    return progress;
  }

  if (!progress.levels) {
    progress.levels = {};
  }

  if (
    progress.pending === undefined
  ) {
    progress.pending = null;
  }

  progress.totalUsed =
    Math.max(
      0,
      Number(
        progress.totalUsed
      ) || 0
    );

  return progress;
}

/**
 * Returns the current active level.
 */
function getCurrentLevel(
  player
) {
  const completed =
    player?.completedLevels || [];

  return (
    levels.find(
      (level) =>
        !completed.includes(
          level.id
        )
    ) || null
  );
}

/**
 * Returns number of hints used
 * on a particular level.
 *
 * Maximum = 2.
 */
function getLevelHintUsed(
  player,
  levelId
) {
  const progress =
    normalizeHintProgress(
      player
    );

  return Math.max(
    0,
    Math.min(
      MAX_HINTS,
      Number(
        progress.levels?.[levelId]
      ) || 0
    )
  );
}

/**
 * Returns total hints used across
 * all levels.
 *
 * This is informational only.
 *
 * It does NOT limit hint usage.
 */
function getHintUsed(
  player
) {
  const progress =
    normalizeHintProgress(
      player
    );

  /*
   * Calculate from per-level data
   * whenever possible.
   */
  if (
    progress.levels &&
    typeof progress.levels === 'object'
  ) {
    return Object.values(
      progress.levels
    ).reduce(
      (total, value) =>
        total +
        Math.max(
          0,
          Number(value) || 0
        ),
      0
    );
  }

  return Math.max(
    0,
    Number(
      progress.totalUsed
    ) || 0
  );
}

/**
 * Calculate hint cost for a level.
 *
 * Hint 1:
 * 25% of level points
 *
 * Hint 2:
 * remaining 75%
 *
 * This guarantees that:
 *
 * hint1 + hint2 = level.points
 */
function getHintCost(
  level,
  hintNumber
) {
  if (!level) {
    return null;
  }

  const points =
    Math.max(
      0,
      Number(level.points) || 0
    );

  if (
    hintNumber === 1
  ) {
    return Math.ceil(
      points * 0.25
    );
  }

  if (
    hintNumber === 2
  ) {
    const firstCost =
      Math.ceil(
        points * 0.25
      );

    return Math.max(
      0,
      points - firstCost
    );
  }

  return null;
}

/**
 * Returns hint information for
 * the CURRENT level.
 *
 * Example:
 *
 * Level 10 = 400 points
 *
 * {
 *   maxHints: 2,
 *   hintsUsed: 0,
 *   hintsRemaining: 2,
 *   nextHintCost: 100
 * }
 */
function getHintInfo(
  player
) {
  const currentLevel =
    getCurrentLevel(
      player
    );

  /*
   * Game finished.
   */
  if (!currentLevel) {
    return {
      maxHints: MAX_HINTS,
      hintsUsed: 0,
      hintsRemaining: 0,
      nextHintCost: null,
      currentLevel: null,
      levelPoints: 0
    };
  }

  const used =
    getLevelHintUsed(
      player,
      currentLevel.id
    );

  const remaining =
    Math.max(
      0,
      MAX_HINTS - used
    );

  const nextHintNumber =
    used + 1;

  const nextCost =
    remaining > 0
      ? getHintCost(
          currentLevel,
          nextHintNumber
        )
      : null;

  return {
    maxHints:
      MAX_HINTS,

    hintsUsed:
      used,

    hintsRemaining:
      remaining,

    nextHintCost:
      nextCost,

    currentLevel:
      currentLevel.id,

    levelPoints:
      Number(
        currentLevel.points
      ) || 0
  };
}

/**
 * Serialize player information
 * for the normal player frontend.
 */
function serializePlayer(
  player,
  options = {}
) {
  const now =
    options.now || new Date();

  const event =
    options.event || null;

  const completedLevels =
    player.completedLevels || [];

  const rem =
    remainingSeconds(
      player,
      now,
      event
    );

  const hintInfo =
    getHintInfo(
      player
    );

  return {
    id: player._id,

    rollNo:
      player.rollNo,

    name:
      player.name,

    role:
      player.role,

    status:
      player.status,

    cwd:
      pathToString(
        player.cwd || []
      ),

    score:
      player.score || 0,

    levelsCompleted:
      completedLevels.length,

    completedLevels,

    totalLevels:
      TOTAL_LEVELS,

    unlockedCommands:
      player.unlockedCommands || [],

    startedAt:
      player.startedAt,

    expiresAt:
      player.expiresAt,

    completedAt:
      player.completedAt,

    lastSeenAt:
      player.lastSeenAt,

    remainingSeconds:
      rem,

    timeExpired:
      player.status ===
        'TIMED_OUT' ||
      (
        player.status ===
          'PLAYING' &&
        rem === 0 &&
        event?.state !==
          'PAUSED'
      ),

    isComplete:
      player.status ===
      'COMPLETED',

    /*
     * --------------------------------
     * HINT INFORMATION
     * --------------------------------
     *
     * These values refer to the
     * CURRENT LEVEL.
     */

    hintProgress:
      player.hintProgress || {
        totalUsed: 0,
        levels: {},
        pending: null
      },

    maxHints:
      hintInfo.maxHints,

    hintsUsed:
      hintInfo.hintsUsed,

    hintsRemaining:
      hintInfo.hintsRemaining,

    nextHintCost:
      hintInfo.nextHintCost,

    currentHintLevel:
      hintInfo.currentLevel,

    currentLevelPoints:
      hintInfo.levelPoints
  };
}

/**
 * Serialize player information
 * for the admin dashboard.
 */
function serializeAdminPlayer(
  player,
  options = {}
) {
  const base =
    serializePlayer(
      player,
      options
    );

  return {
    rollNo:
      base.rollNo,

    name:
      base.name,

    status:
      base.status,

    score:
      base.score,

    currentLevel:
      Math.min(
        base.levelsCompleted + 1,
        base.totalLevels
      ),

    completedLevels:
      base.levelsCompleted,

    totalLevels:
      base.totalLevels,

    startedAt:
      base.startedAt,

    expiresAt:
      base.expiresAt,

    completedAt:
      base.completedAt,

    remainingSeconds:
      base.remainingSeconds,

    lastSeenAt:
      base.lastSeenAt,

    activeSession:
      !!player.activeSessionId,

    stale:
      !!player.lastSeenAt &&
      new Date(
        options.now || new Date()
      ) -
        new Date(
          player.lastSeenAt
        ) >
        (
          options.staleMs ||
          300000
        ),

    /*
     * --------------------------------
     * HINT INFORMATION
     * --------------------------------
     */

    hintsUsed:
      base.hintsUsed,

    hintsRemaining:
      base.hintsRemaining,

    nextHintCost:
      base.nextHintCost,

    currentHintLevel:
      base.currentHintLevel,

    currentLevelPoints:
      base.currentLevelPoints
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