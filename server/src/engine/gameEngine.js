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

const MAX_HINTS = 2;

/*
 * ============================================================
 * TOKENIZER
 * ============================================================
 */

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

/*
 * ============================================================
 * LEVEL HELPERS
 * ============================================================
 */

function levelForKey(keyId) {
  return (
    levels.find(
      (l) => l.key === keyId
    ) || null
  );
}

function commandDef(name) {
  return (
    commandDefs.find(
      (c) => c.name === name
    ) || null
  );
}

function isCommandUnlocked(player, name) {
  const def = commandDef(name);

  if (!def) {
    return false;
  }

  if (!def.requiresKey) {
    return true;
  }

  return player.unlockedKeys.includes(
    def.requiresKey
  );
}

/*
 * ============================================================
 * HINT PROGRESS NORMALIZATION
 * ============================================================
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
      const count = Math.max(
        0,
        Math.min(
          MAX_HINTS,
          Number(value) || 0
        )
      );

      levelsProgress[levelId] = count;

      totalUsed += count;
    }

    progress = {
      totalUsed,
      levels: levelsProgress,
      pending: null
    };

    player.hintProgress = progress;

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

/*
 * ============================================================
 * UNLOCK HELPERS
 * ============================================================
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
          [
            ...pathSegs,
            child.name
          ]
        );
      }
    }
  };

  walk(
    require('./vfs').filesystem,
    []
  );

  const newCommands = commandDefs
    .filter(
      (c) => c.requiresKey === keyId
    )
    .map(
      (c) => c.name
    );

  return {
    newFolders,
    newCommands
  };
}

/*
 * ============================================================
 * FILESYSTEM HELPERS
 * ============================================================
 */

function listing(folderNode, unlockedKeys) {
  if (
    !folderNode ||
    !folderNode.children ||
    folderNode.children.length === 0
  ) {
    return ['(empty)'];
  }

  return folderNode.children.map(
    (child) => {
      if (child.type === 'folder') {
        const locked =
          !isAccessible(
            child,
            unlockedKeys
          );

        return locked
          ? `🔒 ${child.name}`
          : `${child.name}/`;
      }

      return child.name;
    }
  );
}

function ensureCwdValid(player) {
  const folder =
    getFolderAtPath(
      player.cwd,
      player.unlockedKeys
    );

  if (!folder) {
    player.cwd = [];
  }
}

/*
 * ============================================================
 * PATH HELPERS
 * ============================================================
 */

/*
 * Converts:
 *
 * []
 * -> "/"
 *
 * ["alpha"]
 * -> "/alpha"
 *
 * ["core", "vault_alpha"]
 * -> "/core/vault_alpha"
 */

function normalizePath(path) {
  if (!path) {
    return '/';
  }

  if (Array.isArray(path)) {
    return path.length
      ? `/${path.join('/')}`
      : '/';
  }

  let value = String(path);

  if (!value.startsWith('/')) {
    value = `/${value}`;
  }

  if (
    value.length > 1 &&
    value.endsWith('/')
  ) {
    value = value.slice(0, -1);
  }

  return value;
}

/*
 * Returns true when currentPath is:
 *
 * exactly targetPath
 *
 * OR
 *
 * inside targetPath.
 *
 * Example:
 *
 * target = /network
 *
 * current = /network
 * current = /network/deep
 *
 * both match.
 */

function isPathInside(
  currentPath,
  targetPath
) {
  const current =
    normalizePath(
      currentPath
    );

  const target =
    normalizePath(
      targetPath
    );

  if (target === '/') {
    return true;
  }

  return (
    current === target ||
    current.startsWith(
      `${target}/`
    )
  );
}

/*
 * ============================================================
 * FIND LEVEL FOR CURRENT FOLDER
 * ============================================================
 *
 * IMPORTANT:
 *
 * The hint system is based on the player's
 * CURRENT LOCATION, NOT the first incomplete level.
 *
 * Example:
 *
 * Player:
 *
 * /beta
 *
 * Level 2 (alpha) incomplete
 * Level 3 (beta) incomplete
 *
 * hint
 *
 * -> Beta hint
 *
 * NOT Alpha hint.
 *
 * When multiple levels belong to the same
 * area, the deepest matching folder is used.
 */

function getLevelForCurrentFolder(
  player
) {
  const currentPath =
    normalizePath(
      player.cwd
    );

  const candidates =
    levels.filter(
      (level) =>
        level.folder &&
        isPathInside(
          currentPath,
          level.folder
        ) &&
        !player.completedLevels.includes(
          level.id
        )
    );

  if (
    candidates.length === 0
  ) {
    return null;
  }

  /*
   * Prefer the deepest folder match.
   *
   * Example:
   *
   * /network
   * /network/deep
   *
   * At /network/deep,
   * Level 10 should win over
   * Level 7.
   */

  candidates.sort(
    (a, b) => {
      const aDepth =
        normalizePath(
          a.folder
        )
          .split('/')
          .filter(Boolean)
          .length;

      const bDepth =
        normalizePath(
          b.folder
        )
          .split('/')
          .filter(Boolean)
          .length;

      return bDepth - aDepth;
    }
  );

  return candidates[0];
}

/*
 * ============================================================
 * LEVEL HINT COUNT
 * ============================================================
 */

function getLevelHintCount(
  progress,
  levelId
) {
  return Math.max(
    0,
    Math.min(
      MAX_HINTS,
      Number(
        progress.levels[levelId]
      ) || 0
    )
  );
}

/*
 * ============================================================
 * HINT COST
 * ============================================================
 *
 * Hint 1 = 25%
 * Hint 2 = 50%
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

  if (hintNumber === 1) {
    return Math.ceil(
      points * 0.25
    );
  }

  if (hintNumber === 2) {
    return Math.ceil(
      points * 0.50
    );
  }

  return null;
}

/*
 * ============================================================
 * HINT COMMAND
 * ============================================================
 */

function handleHintCommand(
  player,
  args,
  output
) {
  const progress =
    normalizeHintProgress(
      player
    );

  /*
   * ==========================================================
   * FIND LEVEL FROM CURRENT FOLDER
   * ==========================================================
   */

  const currentLevel =
    getLevelForCurrentFolder(
      player
    );

  /*
   * No hint associated with
   * current location.
   */

  if (!currentLevel) {
    output.push(
      'No hint is available for this location.'
    );

    output.push(
      `CURRENT LOCATION: ${normalizePath(player.cwd)}`
    );

    return;
  }

  /*
   * Current level usage.
   */

  const used =
    getLevelHintCount(
      progress,
      currentLevel.id
    );

  /*
   * ==========================================================
   * CANCEL
   * ==========================================================
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
      `Hints used this level: ${used}/${MAX_HINTS}`
    );

    output.push(
      `Hints remaining this level: ${
        MAX_HINTS - used
      }`
    );

    return;
  }

  /*
   * ==========================================================
   * CONFIRM
   * ==========================================================
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
     * IMPORTANT:
     *
     * Re-check the player's CURRENT
     * location when confirming.
     *
     * This prevents:
     *
     * hint
     * cd ../beta
     * hint confirm
     *
     * from revealing the old area's hint.
     */

    const currentPath =
      normalizePath(
        player.cwd
      );

    if (
      !isPathInside(
        currentPath,
        currentLevel.folder
      )
    ) {
      progress.pending = null;

      output.push(
        'The pending hint is no longer valid.'
      );

      output.push(
        'You changed location. Request a new hint here.'
      );

      return;
    }

    if (
      pending.levelId !==
      currentLevel.id
    ) {
      progress.pending = null;

      output.push(
        'The pending hint is no longer valid.'
      );

      output.push(
        'Request a new hint for the current location.'
      );

      return;
    }

    /*
     * Recalculate actual usage.
     */

    const currentUsed =
      getLevelHintCount(
        progress,
        currentLevel.id
      );

    if (
      currentUsed >= MAX_HINTS
    ) {
      progress.pending = null;

      output.push(
        'HINT LIMIT REACHED FOR THIS LEVEL.'
      );

      output.push(
        'You have used all 2 hints for this objective.'
      );

      return;
    }

    /*
     * Determine next hint.
     */

    const hintNumber =
      currentUsed + 1;

    const cost =
      getHintCost(
        currentLevel,
        hintNumber
      );

    const score =
      Number(player.score) || 0;

    /*
     * Check score.
     */

    if (
      score < cost
    ) {
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

    /*
     * Get hints.
     */

    const hintList =
      currentLevel.hints || [];

    if (
      hintList.length === 0 ||
      currentUsed >= hintList.length
    ) {
      progress.pending = null;

      output.push(
        'No more hints are available for this objective.'
      );

      return;
    }

    /*
     * ========================================================
     * DEDUCT SCORE
     * ========================================================
     */

    player.score =
      score - cost;

    /*
     * ========================================================
     * UPDATE HINT USAGE
     * ========================================================
     */

    progress.levels[
      currentLevel.id
    ] =
      currentUsed + 1;

    progress.totalUsed =
      Math.max(
        0,
        Number(
          progress.totalUsed
        ) || 0
      ) + 1;

    progress.pending = null;

    /*
     * ========================================================
     * GET HINT
     * ========================================================
     */

    const hint =
      hintList[currentUsed];

    output.push(
      `[Level ${currentLevel.id}: ${currentLevel.name}]`
    );

    output.push('');

    output.push(
      '========== SYSTEM HINT =========='
    );

    output.push(
      hint
    );

    output.push(
      '=================================='
    );

    output.push('');

    output.push(
      `HINT USED THIS LEVEL: ${
        progress.levels[
          currentLevel.id
        ]
      }/${MAX_HINTS}`
    );

    output.push(
      `POINTS DEDUCTED: -${cost}`
    );

    output.push(
      `CURRENT SCORE: ${player.score}`
    );

    /*
     * ========================================================
     * NEXT HINT
     * ========================================================
     */

    const hintsRemaining =
      MAX_HINTS -
      progress.levels[
        currentLevel.id
      ];

    if (
      hintsRemaining > 0
    ) {
      const nextHintNumber =
        progress.levels[
          currentLevel.id
        ] + 1;

      const nextCost =
        getHintCost(
          currentLevel,
          nextHintNumber
        );

      output.push(
        `HINTS REMAINING THIS LEVEL: ${hintsRemaining}`
      );

      output.push(
        `NEXT HINT COST: ${nextCost} points`
      );
    } else {
      output.push(
        'HINTS REMAINING THIS LEVEL: 0'
      );

      output.push(
        'No further hints are available for this level.'
      );
    }

    return;
  }

  /*
   * ==========================================================
   * INVALID HINT COMMAND
   * ==========================================================
   */

  if (
    args.length > 0
  ) {
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
   * ==========================================================
   * HINT LIMIT
   * ==========================================================
   */

  if (
    used >= MAX_HINTS
  ) {
    output.push(
      'HINT LIMIT REACHED FOR THIS LEVEL.'
    );

    output.push(
      'You have used all 2 hints for this objective.'
    );

    return;
  }

  /*
   * ==========================================================
   * GET CONFIGURED HINTS
   * ==========================================================
   */

  const hintList =
    currentLevel.hints || [];

  const levelHintCount =
    getLevelHintCount(
      progress,
      currentLevel.id
    );

  if (
    hintList.length === 0 ||
    levelHintCount >= hintList.length
  ) {
    output.push(
      'No more hints are available for this objective.'
    );

    return;
  }

  /*
   * ==========================================================
   * NEXT HINT
   * ==========================================================
   */

  const hintNumber =
    levelHintCount + 1;

  const cost =
    getHintCost(
      currentLevel,
      hintNumber
    );

  const score =
    Number(player.score) || 0;

  /*
   * ==========================================================
   * CREATE PENDING REQUEST
   * ==========================================================
   */

  progress.pending = {
    levelId:
      currentLevel.id,

    folder:
      normalizePath(
        player.cwd
      ),

    requestedAt:
      new Date(),

    cost,

    hintNumber
  };

  /*
   * ==========================================================
   * SHOW CONFIRMATION
   * ==========================================================
   */

  output.push(
    '========== HINT REQUEST =========='
  );

  output.push('');

  output.push(
    `LEVEL: ${currentLevel.id} - ${currentLevel.name}`
  );

  output.push(
    `LOCATION: ${normalizePath(player.cwd)}`
  );

  output.push(
    `HINT: ${hintNumber}/${MAX_HINTS}`
  );

  output.push(
    `HINTS REMAINING THIS LEVEL: ${
      MAX_HINTS - levelHintCount
    }`
  );

  output.push('');

  output.push(
    `LEVEL POINTS: ${
      Number(currentLevel.points) || 0
    }`
  );

  output.push(
    `CURRENT SCORE: ${score}`
  );

  output.push(
    `THIS HINT COSTS: ${cost} POINTS`
  );

  output.push(
    `SCORE AFTER USE: ${
      score >= cost
        ? score - cost
        : 'INSUFFICIENT POINTS'
    }`
  );

  output.push('');

  if (
    score < cost
  ) {
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

/*
 * ============================================================
 * MAIN COMMAND ENGINE
 * ============================================================
 */

function runCommand(
  player,
  rawInput
) {
  ensureCwdValid(
    player
  );

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

  /*
   * ==========================================================
   * COMMAND ACCESS CONTROL
   * ==========================================================
   */

  if (
    !BASE_COMMANDS.includes(cmd) &&
    !isCommandUnlocked(
      player,
      cmd
    )
  ) {
    if (
      commandDef(cmd)
    ) {
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

  /*
   * ==========================================================
   * COMMAND SWITCH
   * ==========================================================
   */

  switch (cmd) {

    case 'help': {

      output.push(
        'AVAILABLE COMMANDS'
      );

      for (
        const name of
        player.unlockedCommands
      ) {
        const def =
          commandDef(name);

        output.push(
          `  ${name.padEnd(8)} - ${
            def
              ? def.description
              : ''
          }`
        );
      }

      break;
    }

    case 'pwd': {

      output.push(
        pathToString(
          player.cwd
        )
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

      if (
        args.length === 0
      ) {
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
          targetSegs.slice(
            0,
            -1
          );

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

        player.cwd =
          targetSegs;

      }

      break;
    }

    case 'cat': {

      if (
        args.length === 0
      ) {
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

      if (
        args.length < 2
      ) {
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
          .filter(
            (line) =>
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

      if (
        args.length === 0
      ) {
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
              parseInt(
                args[1],
                10
              ) || 10
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
          .slice(
            0,
            n
          )
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

      if (
        player.markModified
      ) {
        player.markModified(
          'hintProgress'
        );
      }

      break;
    }

    case 'unlock': {

      if (
        args.length === 0
      ) {
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

      if (
        newFolders.length > 0
      ) {
        output.push(
          `${newFolders.length} director${
            newFolders.length === 1
              ? 'y'
              : 'ies'
          } unlocked: ${newFolders.join(
            ', '
          )}`
        );
      }

      for (
        const cName of
        newCommands
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

        if (
          level.completesGame
        ) {
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

      break;
    }
  }

  return {
    output,
    events
  };
}

/*
 * ============================================================
 * EXPORTS
 * ============================================================
 */

module.exports = {
  runCommand,
  levelForKey,
  commandDef
};