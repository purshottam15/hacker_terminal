const { getFolderAtPath, resolvePath, findChild, pathToString, isAccessible } = require('./vfs');
const keys = require('../gameData/keys');
const levels = require('../gameData/levels');
const commandDefs = require('../gameData/commands');

const BASE_COMMANDS = commandDefs.filter((c) => !c.requiresKey).map((c) => c.name);

function tokenize(input) {
  const tokens = [];
  const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = regex.exec(input)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}

function levelForKey(keyId) {
  return levels.find((l) => l.key === keyId) || null;
}

function commandDef(name) {
  return commandDefs.find((c) => c.name === name) || null;
}

function isCommandUnlocked(player, name) {
  const def = commandDef(name);
  if (!def) return false;
  if (!def.requiresKey) return true;
  return player.unlockedKeys.includes(def.requiresKey);
}

/** Folders/commands newly opened by a given key id, formatted for display. */
function describeUnlocksForKey(keyId) {
  const newFolders = [];
  const walk = (node, pathSegs) => {
    if (node.type === 'folder' && node.children) {
      for (const child of node.children) {
        if (child.type === 'folder' && child.requiresKey === keyId) {
          newFolders.push(child.name);
        }
        walk(child, [...pathSegs, child.name]);
      }
    }
  };
  walk(require('./vfs').filesystem, []);
  const newCommands = commandDefs.filter((c) => c.requiresKey === keyId).map((c) => c.name);
  return { newFolders, newCommands };
}

function listing(folderNode, unlockedKeys) {
  if (!folderNode.children || folderNode.children.length === 0) {
    return ['(empty)'];
  }
  return folderNode.children.map((child) => {
    if (child.type === 'folder') {
      const locked = !isAccessible(child, unlockedKeys);
      return locked ? `[LOCKED] ${child.name}` : `${child.name}/`;
    }
    return child.name;
  });
}

function ensureCwdValid(player) {
  // Defensive: if cwd points somewhere no longer accessible (shouldn't normally happen), snap to root.
  const folder = getFolderAtPath(player.cwd, player.unlockedKeys);
  if (!folder) player.cwd = [];
}

/**
 * Executes one raw command string against a player's current state.
 * Mutates `player` (a Mongoose document or plain object with the right
 * shape) in place and returns { output: string[], events: string[] }.
 */
function runCommand(player, rawInput) {
  ensureCwdValid(player);
  const input = (rawInput || '').trim();
  const output = [];
  const events = [];

  if (!input) return { output: [''], events };

  const tokens = tokenize(input);
  const cmd = tokens[0].toLowerCase();
  const args = tokens.slice(1);

  if (!BASE_COMMANDS.includes(cmd) && !isCommandUnlocked(player, cmd)) {
    if (commandDef(cmd)) {
      output.push(`${cmd}: command not found. This tool hasn't been discovered yet.`);
    } else {
      output.push(`${cmd}: command not found. Type 'help' to see what's available.`);
    }
    return { output, events };
  }

  const currentFolder = getFolderAtPath(player.cwd, player.unlockedKeys);

  switch (cmd) {
    case 'help': {
      output.push('AVAILABLE COMMANDS');
      for (const name of player.unlockedCommands) {
        const def = commandDef(name);
        output.push(`  ${name.padEnd(8)} - ${def ? def.description : ''}`);
      }
      break;
    }

    case 'pwd': {
      output.push(pathToString(player.cwd));
      break;
    }

    case 'ls': {
      output.push(...listing(currentFolder, player.unlockedKeys));
      break;
    }

    case 'cd': {
      if (args.length === 0) {
        player.cwd = [];
        break;
      }
      const targetSegs = resolvePath(player.cwd, args[0]);
      const targetFolder = getFolderAtPath(targetSegs, player.unlockedKeys);
      if (!targetFolder) {
        // Distinguish "locked" from "doesn't exist" for a better hint, without leaking locked contents.
        const parentSegs = targetSegs.slice(0, -1);
        const name = targetSegs[targetSegs.length - 1];
        const parentFolder = getFolderAtPath(parentSegs, player.unlockedKeys);
        const rawChild = parentFolder ? findChild(parentFolder, name) : null;
        if (rawChild && rawChild.type === 'folder') {
          output.push(`Permission denied: '${name}' is locked. You'll need the right code first.`);
        } else {
          output.push(`No such directory: ${args[0]}`);
        }
      } else {
        player.cwd = targetSegs;
      }
      break;
    }

    case 'cat': {
      if (args.length === 0) {
        output.push('Usage: cat <file>');
        break;
      }
      const file = findChild(currentFolder, args[0]);
      if (!file || file.type !== 'file') {
        output.push(`cat: ${args[0]}: No such file`);
      } else if (file.large) {
        output.push(file.content);
      } else {
        output.push(file.content);
      }
      break;
    }

    case 'grep': {
      if (args.length < 2) {
        output.push('Usage: grep "<pattern>" <file>');
        break;
      }
      const pattern = args[0];
      const filename = args[1];
      const file = findChild(currentFolder, filename);
      if (!file || file.type !== 'file') {
        output.push(`grep: ${filename}: No such file`);
        break;
      }
      const text = file.fullContent || file.content;
      const matches = text
        .split('\n')
        .filter((line) => line.toLowerCase().includes(pattern.toLowerCase()));
      output.push(...(matches.length ? matches : [`grep: no matches for "${pattern}" in ${filename}`]));
      break;
    }

    case 'head': {
      if (args.length === 0) {
        output.push('Usage: head <file> [lines]');
        break;
      }
      const filename = args[0];
      const n = args[1] ? Math.max(1, parseInt(args[1], 10) || 10) : 10;
      const file = findChild(currentFolder, filename);
      if (!file || file.type !== 'file') {
        output.push(`head: ${filename}: No such file`);
        break;
      }
      const text = file.fullContent || file.content;
      output.push(...text.split('\n').slice(0, n));
      break;
    }

    case 'clear': {
      events.push('CLEAR_SCREEN');
      break;
    }

    case 'hint': {
      const nextLevel = levels.find((l) => !player.completedLevels.includes(l.id));
      if (!nextLevel) {
        output.push('No active objective. You\'ve completed everything.');
        break;
      }
      const shown = player.hintProgress?.[nextLevel.id] || 0;
      const hintList = nextLevel.hints || [];
      const idx = Math.min(shown, hintList.length - 1);
      output.push(`[Level ${nextLevel.id}: ${nextLevel.name}]`);
      output.push(hintList[idx] || 'No hints available for this objective.');
      if (!player.hintProgress) player.hintProgress = {};
      player.hintProgress[nextLevel.id] = Math.min(shown + 1, hintList.length - 1 + 1);
      player.markModified && player.markModified('hintProgress');
      break;
    }

    case 'unlock': {
      if (args.length === 0) {
        output.push('Usage: unlock <code>');
        break;
      }
      const code = args[0];
      const keyDef = keys.find((k) => k.code.toLowerCase() === code.toLowerCase());
      if (!keyDef) {
        output.push('ACCESS DENIED: invalid key.');
        break;
      }
      if (player.unlockedKeys.includes(keyDef.id)) {
        output.push('This key has already been used.');
        break;
      }

      player.unlockedKeys.push(keyDef.id);
      const { newFolders, newCommands } = describeUnlocksForKey(keyDef.id);

      output.push('ACCESS KEY ACCEPTED.');
      if (newFolders.length > 0) {
        output.push(`${newFolders.length} director${newFolders.length === 1 ? 'y' : 'ies'} unlocked: ${newFolders.join(', ')}`);
      }
      for (const cName of newCommands) {
        if (!player.unlockedCommands.includes(cName)) {
          player.unlockedCommands.push(cName);
          output.push(`NEW COMMAND DISCOVERED: ${cName}`);
          events.push(`COMMAND_UNLOCKED:${cName}`);
        }
      }

      const level = levelForKey(keyDef.id);
      if (level && !player.completedLevels.includes(level.id)) {
        player.completedLevels.push(level.id);
        player.score = (player.score || 0) + level.points;
        output.push(`LEVEL COMPLETE: ${level.name} (+${level.points} points)`);
        events.push(`LEVEL_COMPLETE:${level.id}`);
        if (level.completesGame) {
          player.completedAt = new Date();
          events.push('GAME_COMPLETE');
          output.push('');
          output.push('=========================================');
          output.push(' SYSTEM SHUTDOWN INITIATED. INVESTIGATION COMPLETE.');
          output.push('=========================================');
        }
      }
      break;
    }

    default: {
      output.push(`${cmd}: command not found. Type 'help' to see what's available.`);
    }
  }

  return { output, events };
}

module.exports = { runCommand, levelForKey, commandDef };
