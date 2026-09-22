/**
 * KEYS
 * ----
 * Each entry maps the literal code a player types (`unlock <code>`) to an
 * internal key id. Nothing else references the code string directly —
 * filesystem.js and commands.js only ever reference the id (e.g. 'KEY_9'),
 * so changing what code unlocks something is a one-line edit here.
 *
 * TO CHANGE A LEVEL'S KEY: edit `code` below. Do not change `id` unless
 * you also update every requiresKey reference to it in filesystem.js,
 * commands.js and the matching entry in levels.js.
 */

const keys = [
  { id: 'KEY_1', code: '7F29' },
  { id: 'KEY_2', code: 'B3D9' },
  { id: 'KEY_3', code: '1907' },
  { id: 'KEY_4', code: 'K4-2091' },
  { id: 'KEY_5', code: 'D5-77A1' },
  { id: 'KEY_6', code: 'AR-6602' },
  { id: 'KEY_7', code: 'N3T-7734' },
  { id: 'KEY_8', code: 'PR-5567' },
  { id: 'KEY_9', code: 'DL-2205' },
  { id: 'KEY_10', code: 'FR-9182' },
  { id: 'KEY_11', code: 'MF-3300' },
  { id: 'KEY_12', code: 'C0R3-4415' },
  { id: 'KEY_13', code: 'VX-8841' },
  { id: 'KEY_14', code: 'ID-1907' },
  { id: 'KEY_15', code: 'CO-3391' },
  { id: 'KEY_16', code: 'KA07-3391' },
  { id: 'KEY_17', code: 'CA-5510' },
  { id: 'KEY_18', code: 'CH-8850' },
  { id: 'KEY_19', code: 'TRUTH-0001' },
  { id: 'KEY_20', code: 'END-0000' }
];

module.exports = keys;
