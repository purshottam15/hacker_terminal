/**
 * COMMANDS
 * --------
 * Declares every command the terminal understands and, for the advanced
 * ones, which key unlocks them. Base commands (requiresKey: null) are
 * available to every new player from the start.
 *
 * TO ADD A NEW COMMAND: add it here with the key that should unlock it,
 * then implement its behavior once in engine/commandHandlers.js. The
 * sidebar and `help` output update automatically.
 */

const commands = [
  { name: 'ls', requiresKey: null, description: 'list the contents of the current directory' },
  { name: 'cd', requiresKey: null, description: 'change directory (cd .. to go up, cd / for root)' },
  { name: 'pwd', requiresKey: null, description: 'print the current directory path' },
  { name: 'cat', requiresKey: null, description: 'print a file\'s contents' },
  { name: 'clear', requiresKey: null, description: 'clear the terminal screen' },
  { name: 'help', requiresKey: null, description: 'list commands currently available to you' },
  { name: 'hint', requiresKey: null, description: 'get a nudge for your current objective' },
  { name: 'unlock', requiresKey: null, description: 'unlock <code> - submit a key/code you\'ve found' },
  { name: 'grep', requiresKey: 'KEY_9', description: 'grep "<pattern>" <file> - search a file\'s contents' },
  { name: 'head', requiresKey: 'KEY_11', description: 'head <file> [n] - print the first n lines of a file (default 10)' }
];

module.exports = commands;
