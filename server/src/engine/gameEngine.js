const {
  getFolderAtPath,
  resolvePath,
  findChild,
  pathToString,
  isAccessible
} = require('./vfs');

const keys = require('../gameData/keys');
const levels = require('../gameData/levels');
const commandDefs = require('../gameData/commands');

const BASE_COMMANDS = commandDefs
  .filter((c) => !c.requiresKey)
  .map((c) => c.name);

const MAX_HINTS = 3;

const HINT_COSTS = [80, 120, 150];

function tokenize(input) {
  const tokens = [];

  const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;

  let match;

  while ((match = regex.exec(input)) !== null) {
    tokens.push(
      match[1] ??
      match[2] ??
      match[3]
    );
  }

  return tokens;
}

function levelForKey(keyId) {
  return levels.find(
    (l) => l.key === keyId
  ) || null;
}

function commandDef(name) {
  return commandDefs.find(
    (c) => c.name === name
  ) || null;
}

function isCommandUnlocked(player, name) {
  const def = commandDef(name);

  if (!def) return false;

  if (!def.requiresKey) {
    return true;
  }

  return player.unlockedKeys.includes(
    def.requiresKey
  );
}

/**
 * Makes sure old players using the previous
 * hintProgress format don't break.
 *
 * Old:
 * {
 *   "1": 1,
 *   "2": 0
 * }
 *
 * New:
 * {
 *   totalUsed: 0,
 *   levels: {},
 *   pending: null
 * }
 */
function normalizeHintProgress(player) {
  let progress = player.hintProgress;

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

    player.hintProgress = progress;

    return progress;
  }

  /*
   * Convert old format.
   */
  if (
    progress.totalUsed === undefined &&
    !progress.levels
  ) {
    const levelsProgress = {};

    let totalUsed = 0;

    for (const [levelId, value] of Object.entries(progress)) {
      const count = Math.max(
        0,
        Number(value) || 0
      );

      levelsProgress[levelId] = count;

      totalUsed += count;
    }

    progress = {
      totalUsed: Math.min(
        MAX_HINTS,
        totalUsed
      ),

      levels: levelsProgress,

      pending: null
    };

    player.hintProgress = progress;

    return progress;
  }

  if (!progress.levels) {
    progress.levels = {};
  }

  if (progress.pending === undefined) {
    progress.pending = null;
  }

  progress.totalUsed = Math.min(
    MAX_HINTS,
    Math.max(
      0,
      Number(progress.totalUsed) || 0
    )
  );

  return progress;
}

/**
 * Folders/commands newly opened by a given key id.
 */
function describeUnlocksForKey(keyId) {
  const newFolders = [];

  const walk = (node, pathSegs) => {
    if (
      node.type === 'folder' &&
      node.children
    ) {
      for (const child of node.children) {
        if (
          child.type === 'folder' &&
          child.requiresKey === keyId
        ) {
          newFolders.push(child.name);
        }

        walk(
          child,
          [...pathSegs, child.name]
        );
      }
    }
  };

  walk(
    require('./vfs').filesystem,
    []
  );

  const newCommands = commandDefs
    .filter((c) => c.requiresKey === keyId)
    .map((c) => c.name);

  return {
    newFolders,
    newCommands
  };
}

function listing(folderNode, unlockedKeys) {
  if (
    !folderNode.children ||
    folderNode.children.length === 0
  ) {
    return ['(empty)'];
  }

  return folderNode.children.map((child) => {
    if (child.type === 'folder') {
      const locked = !isAccessible(
        child,
        unlockedKeys
      );

      return locked
        ? `🔒 ${child.name}`
        : `${child.name}/`;
    }

    return child.name;
  });
}

function ensureCwdValid(player) {
  const folder = getFolderAtPath(
    player.cwd,
    player.unlockedKeys
  );

  if (!folder) {
    player.cwd = [];
  }
}

/**
 * Returns the next active level.
 */
function getCurrentLevel(player) {
  return (
    levels.find(
      (l) =>
        !player.completedLevels.includes(l.id)
    ) || null
  );
}

/**
 * Returns the number of hints already revealed
 * for a specific level.
 */
function getLevelHintCount(progress, levelId) {
  return Math.max(
    0,
    Number(progress.levels[levelId]) || 0
  );
}

/**
 * HINT SYSTEM
 *
 * 3 hints per event:
 *
 * Hint 1 = 10 points
 * Hint 2 = 20 points
 * Hint 3 = 30 points
 *
 * "hint"
 *      -> shows cost and asks for confirmation
 *
 * "hint confirm"
 *      -> actually consumes the hint
 *
 * "hint cancel"
 *      -> cancels pending hint
 */
function handleHintCommand(
  player,
  args,
  output
) {
  const progress =
    normalizeHintProgress(player);

  const currentLevel =
    getCurrentLevel(player);

  if (!currentLevel) {
    output.push(
      'No active objective. You\'ve completed everything.'
    );

    return;
  }

  const used = Math.min(
    MAX_HINTS,
    progress.totalUsed || 0
  );

  /*
   * Cancel pending request.
   */
  if (
    args.length === 1 &&
    args[0].toLowerCase() === 'cancel'
  ) {
    if (!progress.pending) {
      output.push(
        'No pending hint request.'
      );

      return;
    }

    progress.pending = null;

    output.push(
      'HINT REQUEST CANCELLED.'
    );

    output.push(
      `Hints remaining: ${MAX_HINTS - used}/${MAX_HINTS}`
    );

    return;
  }

  /*
   * CONFIRM
   */
  if (
    args.length === 1 &&
    args[0].toLowerCase() === 'confirm'
  ) {
    if (!progress.pending) {
      output.push(
        'No pending hint request.'
      );

      output.push(
        'Type "hint" first.'
      );

      return;
    }

    const pending =
      progress.pending;

    /*
     * Make sure the pending request still
     * belongs to the current level.
     */
    if (
      pending.levelId !== currentLevel.id
    ) {
      progress.pending = null;

      output.push(
        'The pending hint is no longer valid.'
      );

      output.push(
        'Request a new hint for the current objective.'
      );

      return;
    }

    /*
     * Recalculate everything on confirmation.
     */
    const currentUsed =
      Math.min(
        MAX_HINTS,
        progress.totalUsed || 0
      );

    if (currentUsed >= MAX_HINTS) {
      progress.pending = null;

      output.push(
        'HINT LIMIT REACHED.'
      );

      output.push(
        'You have used all 3 available hints.'
      );

      return;
    }

    const cost =
      HINT_COSTS[currentUsed];

    const score =
      Number(player.score) || 0;

    if (score < cost) {
      progress.pending = null;

      output.push(
        'HINT UNAVAILABLE.'
      );

      output.push(
        `This hint costs ${cost} points.`
      );

      output.push(
        `Current score: ${score}`
      );

      output.push(
        `You need ${cost - score} more points.`
      );

      return;
    }

    const levelHintCount =
      getLevelHintCount(
        progress,
        currentLevel.id
      );

    const hintList =
      currentLevel.hints || [];

    /*
     * No hint available for this level.
     */
    if (
      hintList.length === 0 ||
      levelHintCount >= hintList.length
    ) {
      progress.pending = null;

      output.push(
        'No more hints are available for this objective.'
      );

      return;
    }

    /*
     * Deduct points.
     */
    player.score =
      score - cost;

    /*
     * Increase global usage.
     */
    progress.totalUsed =
      currentUsed + 1;

    /*
     * Increase level hint usage.
     */
    progress.levels[currentLevel.id] =
      levelHintCount + 1;

    /*
     * Clear confirmation state.
     */
    progress.pending = null;

    const hint =
      hintList[levelHintCount];

    output.push(
      `[Level ${currentLevel.id}: ${currentLevel.name}]`
    );

    output.push('');

    output.push(
      '========== SYSTEM HINT =========='
    );

    output.push(hint);

    output.push(
      '=================================='
    );

    output.push('');

    output.push(
      `HINT USED: ${progress.totalUsed}/${MAX_HINTS}`
    );

    output.push(
      `POINTS DEDUCTED: -${cost}`
    );

    output.push(
      `CURRENT SCORE: ${player.score}`
    );

    if (
      progress.totalUsed < MAX_HINTS
    ) {
      const nextCost =
        HINT_COSTS[progress.totalUsed];

      output.push(
        `HINTS REMAINING: ${MAX_HINTS - progress.totalUsed}`
      );

      output.push(
        `NEXT HINT COST: ${nextCost} points`
      );
    } else {
      output.push(
        'HINTS REMAINING: 0'
      );

      output.push(
        'No further hints are available.'
      );
    }

    return;
  }

  /*
   * Anything other than plain "hint",
   * "hint confirm", or "hint cancel".
   */
  if (args.length > 0) {
    output.push(
      'Usage: hint'
    );

    output.push(
      '       hint confirm'
    );

    output.push(
      '       hint cancel'
    );

    return;
  }

  /*
   * Already used all hints.
   */
  if (used >= MAX_HINTS) {
    output.push(
      'HINT LIMIT REACHED.'
    );

    output.push(
      'You have used all 3 available hints.'
    );

    return;
  }

  const hintList =
    currentLevel.hints || [];

  const levelHintCount =
    getLevelHintCount(
      progress,
      currentLevel.id
    );

  /*
   * Current level has no more hints.
   */
  if (
    hintList.length === 0 ||
    levelHintCount >= hintList.length
  ) {
    output.push(
      'No more hints are available for this objective.'
    );

    return;
  }

  const cost =
    HINT_COSTS[used];

  const score =
    Number(player.score) || 0;

  /*
   * Create pending request.
   */
  progress.pending = {
    levelId: currentLevel.id,

    requestedAt: new Date(),

    cost,

    hintNumber: used + 1
  };

  output.push(
    '========== HINT REQUEST =========='
  );

  output.push('');

  output.push(
    `LEVEL: ${currentLevel.id} - ${currentLevel.name}`
  );

  output.push(
    `HINT: ${used + 1}/${MAX_HINTS}`
  );

  output.push(
    `HINTS REMAINING: ${MAX_HINTS - used}`
  );

  output.push('');

  output.push(
    `CURRENT SCORE: ${score}`
  );

  output.push(
    `THIS HINT COSTS: ${cost} POINTS`
  );

  output.push(
    `SCORE AFTER USE: ${score >= cost ? score - cost : 'INSUFFICIENT POINTS'}`
  );

  output.push('');

  if (score < cost) {
    output.push(
      `You need ${cost - score} more points to use this hint.`
    );

    progress.pending = null;
  } else {
    output.push(
      'Type "hint confirm" to reveal it.'
    );

    output.push(
      'Type "hint cancel" to continue without using it.'
    );
  }

  output.push('');

  output.push(
    '=================================='
  );
}

/**
 * Executes one raw command string.
 *
 * Mutates player in place and returns:
 *
 * {
 *   output: string[],
 *   events: string[]
 * }
 */
function runCommand(player, rawInput) {
  ensureCwdValid(player);

  const input =
    (rawInput || '').trim();

  const output = [];

  const events = [];

  if (!input) {
    return {
      output: [''],
      events
    };
  }

  const tokens =
    tokenize(input);

  const cmd =
    tokens[0].toLowerCase();

  const args =
    tokens.slice(1);

  if (
    !BASE_COMMANDS.includes(cmd) &&
    !isCommandUnlocked(player, cmd)
  ) {
    if (commandDef(cmd)) {
      output.push(
        `${cmd}: command not found. This tool hasn't been discovered yet.`
      );
    } else {
      output.push(
        `${cmd}: command not found. Type 'help' to see what's available.`
      );
    }

    return {
      output,
      events
    };
  }

  const currentFolder =
    getFolderAtPath(
      player.cwd,
      player.unlockedKeys
    );

  switch (cmd) {
    case 'help': {
      output.push(
        'AVAILABLE COMMANDS'
      );

      for (
        const name of player.unlockedCommands
      ) {
        const def =
          commandDef(name);

        output.push(
          `  ${name.padEnd(8)} - ${
            def ? def.description : ''
          }`
        );
      }

      break;
    }

    case 'pwd': {
      output.push(
        pathToString(player.cwd)
      );

      break;
    }

    case 'ls': {
      output.push(
        ...listing(
          currentFolder,
          player.unlockedKeys
        )
      );

      break;
    }

    case 'cd': {
      if (args.length === 0) {
        player.cwd = [];

        break;
      }

      const targetSegs =
        resolvePath(
          player.cwd,
          args[0]
        );

      const targetFolder =
        getFolderAtPath(
          targetSegs,
          player.unlockedKeys
        );

      if (!targetFolder) {
        const parentSegs =
          targetSegs.slice(0, -1);

        const name =
          targetSegs[
            targetSegs.length - 1
          ];

        const parentFolder =
          getFolderAtPath(
            parentSegs,
            player.unlockedKeys
          );

        const rawChild =
          parentFolder
            ? findChild(
                parentFolder,
                name
              )
            : null;

        if (
          rawChild &&
          rawChild.type === 'folder'
        ) {
          output.push(
            `Permission denied: '${name}' is locked. You'll need the right code first.`
          );
        } else {
          output.push(
            `No such directory: ${args[0]}`
          );
        }
      } else {
        player.cwd = targetSegs;
      }

      break;
    }

    case 'cat': {
      if (args.length === 0) {
        output.push(
          'Usage: cat <file>'
        );

        break;
      }

      const file =
        findChild(
          currentFolder,
          args[0]
        );

      if (
        !file ||
        file.type !== 'file'
      ) {
        output.push(
          `cat: ${args[0]}: No such file`
        );
      } else {
        output.push(
          file.content
        );
      }

      break;
    }

    case 'grep': {
      if (args.length < 2) {
        output.push(
          'Usage: grep "<pattern>" <file>'
        );

        break;
      }

      const pattern =
        args[0];

      const filename =
        args[1];

      const file =
        findChild(
          currentFolder,
          filename
        );

      if (
        !file ||
        file.type !== 'file'
      ) {
        output.push(
          `grep: ${filename}: No such file`
        );

        break;
      }

      const text =
        file.fullContent ||
        file.content;

      const matches =
        text
          .split('\n')
          .filter((line) =>
            line
              .toLowerCase()
              .includes(
                pattern.toLowerCase()
              )
          );

      output.push(
        ...(
          matches.length
            ? matches
            : [
                `grep: no matches for "${pattern}" in ${filename}`
              ]
        )
      );

      break;
    }

    case 'head': {
      if (args.length === 0) {
        output.push(
          'Usage: head <file> [lines]'
        );

        break;
      }

      const filename =
        args[0];

      const n =
        args[1]
          ? Math.max(
              1,
              parseInt(args[1], 10) || 10
            )
          : 10;

      const file =
        findChild(
          currentFolder,
          filename
        );

      if (
        !file ||
        file.type !== 'file'
      ) {
        output.push(
          `head: ${filename}: No such file`
        );

        break;
      }

      const text =
        file.fullContent ||
        file.content;

      output.push(
        ...text
          .split('\n')
          .slice(0, n)
      );

      break;
    }

    case 'clear': {
      events.push(
        'CLEAR_SCREEN'
      );

      break;
    }

    case 'hint': {
      handleHintCommand(
        player,
        args,
        output
      );

      player.markModified &&
        player.markModified(
          'hintProgress'
        );

      break;
    }

    case 'unlock': {
      if (args.length === 0) {
        output.push(
          'Usage: unlock <code>'
        );

        break;
      }

      const code =
        args[0];

      const keyDef =
        keys.find(
          (k) =>
            k.code.toLowerCase() ===
            code.toLowerCase()
        );

      if (!keyDef) {
        output.push(
          'ACCESS DENIED: invalid key.'
        );

        break;
      }

      if (
        player.unlockedKeys.includes(
          keyDef.id
        )
      ) {
        output.push(
          'This key has already been used.'
        );

        break;
      }

      player.unlockedKeys.push(
        keyDef.id
      );

      const {
        newFolders,
        newCommands
      } =
        describeUnlocksForKey(
          keyDef.id
        );

      output.push(
        'ACCESS KEY ACCEPTED.'
      );

      if (newFolders.length > 0) {
        output.push(
          `${newFolders.length} director${
            newFolders.length === 1
              ? 'y'
              : 'ies'
          } unlocked: ${newFolders.join(', ')}`
        );
      }

      for (
        const cName of newCommands
      ) {
        if (
          !player.unlockedCommands.includes(
            cName
          )
        ) {
          player.unlockedCommands.push(
            cName
          );

          output.push(
            `NEW COMMAND DISCOVERED: ${cName}`
          );

          events.push(
            `COMMAND_UNLOCKED:${cName}`
          );
        }
      }

      const level =
        levelForKey(
          keyDef.id
        );

      if (
        level &&
        !player.completedLevels.includes(
          level.id
        )
      ) {
        player.completedLevels.push(
          level.id
        );

        player.score =
          (player.score || 0) +
          level.points;

        output.push(
          `LEVEL COMPLETE: ${level.name} (+${level.points} points)`
        );

        events.push(
          `LEVEL_COMPLETE:${level.id}`
        );

        if (level.completesGame) {
          player.completedAt =
            new Date();

          events.push(
            'GAME_COMPLETE'
          );

          output.push('');

          output.push(
            '========================================='
          );

          output.push(
            ' SYSTEM SHUTDOWN INITIATED. INVESTIGATION COMPLETE.'
          );

          output.push(
            '========================================='
          );
        }
      }

      break;
    }

    default: {
      output.push(
        `${cmd}: command not found. Type 'help' to see what's available.`
      );
    }
  }

  return {
    output,
    events
  };
}

module.exports = {
  runCommand,
  levelForKey,
  commandDef
};