/**
 * LEVELS
 * ------
 * Each level is associated with a specific folder.
 *
 * HINT SYSTEM
 * -----------
 * 2 hints per level:
 *
 * Hint 1 = 25% of level points
 * Hint 2 = 50% of level points
 *
 * Maximum deduction = 75% of level points.
 *
 * Hints are intended to be associated with the
 * folder/area where the player is currently working.
 *
 * IMPORTANT:
 * `folder` represents the filesystem location
 * associated with that level.
 */

const levels = [
  {
    id: 1,
    key: 'KEY_1',
    name: 'First Contact',
    folder: '/',
    objective: 'Find a way past the front door.',
    requiredCommand: null,
    points: 100,
    hints: [
      'The system has already given you everything you need at the starting location. Inspect the root carefully and look for small pieces of information that appear intentionally placed.',
      'Read the text files at the root and compare what they contain. One of them contains a short access value; use that value with the command that submits access keys.'
    ]
  },

  {
    id: 2,
    key: 'KEY_2',
    name: 'Alpha Wing',
    folder: '/alpha',
    objective: 'Find what alpha wing is hiding in its vault.',
    requiredCommand: null,
    points: 200,
    hints: [
      'The first access key opened several new areas. The objective points specifically toward the alpha wing, so begin by entering that directory and inspecting what was hidden there.',
      'Inside alpha, one of the files contains an access message. Read the entire file rather than stopping at the first useful-looking line; the information near the end gives you the value needed for the next unlock.'
    ]
  },

  {
    id: 3,
    key: 'KEY_3',
    name: 'A Number He Never Wrote Down',
    folder: '/beta',
    objective: 'Work out beta wing\'s access code from what people remember about him.',
    requiredCommand: null,
    points: 200,
    hints: [
      'The beta wing contains a note about two separate numerical details. Your task is not to find another hidden code, but to construct one from information already written there.',
      'Take the relevant year and the rack number from the note. Convert the year to its final two digits, keep the rack number in its displayed two-digit form, and join those two pieces in the same order they appear.'
    ]
  },

  {
    id: 4,
    key: 'KEY_4',
    name: 'The Batch Code',
    folder: '/gamma',
    objective: 'Cross-reference gamma wing\'s two files to build a single code.',
    requiredCommand: null,
    points: 200,
    hints: [
      'Gamma contains two pieces of information rather than one complete access key. Read both files and identify what each contributes to the final value.',
      'One file provides the alphabetic prefix while the other provides the numerical badge. Preserve the prefix formatting, including its separator, and place the badge immediately after it.'
    ]
  },

  {
    id: 5,
    key: 'KEY_5',
    name: 'The Filename Is The Code',
    folder: '/delta',
    objective: 'Get into delta wing\'s backup drive.',
    requiredCommand: null,
    points: 300,
    hints: [
      'Delta contains something that looks like an ordinary file but its name is more important than its contents. Pay attention to unusual filenames instead of only reading file contents.',
      'Find the filename beginning with the configuration-style prefix. The prefix is only a label; remove it and use the remaining portion of the filename as the access value.'
    ]
  },

  {
    id: 6,
    key: 'KEY_6',
    name: 'The Review Code',
    folder: '/archive',
    objective: 'Get proper access to the archive wing\'s internal logs.',
    requiredCommand: null,
    points: 300,
    hints: [
      'The information needed for this level is inside the review material. Read the available notes carefully and look for instructions describing how the numbers should be interpreted.',
      'The operators order is important: identify the room/reference number first and then the number associated with the operator\'s instruction. Combine the resulting pieces in that exact order rather than treating them as separate codes.'
    ]
  },

  {
    id: 7,
    key: 'KEY_7',
    name: 'A Wing That Isn\'t Nested Anywhere',
    folder: '/network',
    objective: 'Find the network wing — it was mounted outside the normal structure.',
    requiredCommand: null,
    points: 300,
    hints: [
      'The archive logs contain information about something that does not follow the normal folder structure. Read the access log and pay attention to where this new area was mounted.',
      'The log gives both the location of the unusual wing and the access value associated with it. Once you identify that value, return to the root and look for the newly available network area.'
    ]
  },

  {
    id: 8,
    key: 'KEY_8',
    name: 'The Flagged Record',
    folder: '/delta/backup',
    objective: 'Clear the access flag on the personnel record in delta/backup.',
    requiredCommand: null,
    points: 350,
    hints: [
      'The status file in delta/backup tells you that the procedure for clearing the flag is stored somewhere else. Follow that reference instead of trying to guess the access value.',
      'Search the archive area for the file specifically describing the flag-clearing procedure. It contains the required access value; use that value with the unlock command.'
    ]
  },

  {
    id: 9,
    key: 'KEY_9',
    name: 'A Sharper Tool',
    folder: '/network',
    objective: 'Recover access to the deep connection logs and discover what happened immediately before the system locked down.',
    requiredCommand: null,
    points: 350,
    hints: [
      'The network wing contains more information about the deeper connection logs. Inspect both available files and determine which one describes how those logs can be accessed.',
      'The access note identifies a special text-search tool that becomes available after this unlock. Find the access value in that note, use it to open the deep logs, and then check the available commands.'
    ]
  },

  {
    id: 10,
    key: 'KEY_10',
    name: 'Search, Don\'t Read',
    folder: '/network/deep',
    objective: 'Search the deep connection history and recover the code associated with the external access event.',
    requiredCommand: 'grep',
    points: 400,
    hints: [
      'The connection log is deliberately too large for `cat`. The message shown by the system is telling you that you need a different way to inspect its contents.',
      'Use the text-search command on the large log. Search for the event associated with external access rather than trying random words; the matching line contains the fragment needed to construct the next access value.'
    ]
  },

  {
    id: 11,
    key: 'KEY_11',
    name: 'Into The Mainframe',
    folder: '/forensics',
    objective: 'Follow the forensics trail to the mainframe.',
    requiredCommand: null,
    points: 400,
    hints: [
      'The forensics area contains multiple pieces of evidence. Read both files and identify which one points toward the mainframe and which tool will become useful there.',
      'The report contains an access value along with a reference to a command designed to inspect only the beginning of a file. Use the access value to reach the mainframe, then make note of that newly available command.'
    ]
  },

  {
    id: 12,
    key: 'KEY_12',
    name: 'Just The First Line',
    folder: '/mainframe',
    objective: 'Use the appropriate file-inspection tool to pull the init key from the mainframe\'s boot config.',
    requiredCommand: 'head',
    points: 450,
    hints: [
      'The mainframe configuration is intentionally too large for normal reading. The objective tells you that the information you need is near the beginning rather than somewhere deep inside the file.',
      'Use the file-inspection command designed to read the beginning of a file. Run it against the boot configuration and inspect the first line; that line contains the next access value.'
    ]
  },

  {
    id: 13,
    key: 'KEY_13',
    name: 'The Core',
    folder: '/core',
    objective: 'Reach the core and open both vaults inside it.',
    requiredCommand: null,
    points: 450,
    hints: [
      'The core contains personal notes that explain how the two vaults are related. Read the information there before trying to unlock either vault individually.',
      'The notes describe one access value that is shared by both vaults. Find that value in the core material and use it once; the resulting unlock should expose both vault areas.'
    ]
  },

  {
    id: 14,
    key: 'KEY_14',
    name: 'Who He Was',
    folder: '/core/vault_alpha',
    objective: 'Confirm the identity behind this system, using a number you already know.',
    requiredCommand: null,
    points: 500,
    hints: [
      'The identity clue is inside vault_alpha. Read the letter fragment and pay attention to its reference to an earlier part of the investigation.',
      'The letter points back to the number you constructed in the beta wing. Reuse that number and attach the identity prefix specified by the letter to form the new access value.'
    ]
  },

  {
    id: 15,
    key: 'KEY_15',
    name: 'Where He Went',
    folder: '/core/vault_beta',
    objective: 'Find the safehouse coordinates buried in raw sensor data.',
    requiredCommand: 'grep',
    points: 500,
    hints: [
      'The sensor dump is intentionally too large to read normally. Before searching it, inspect the smaller notice file in vault_beta for the specific marker associated with the location data.',
      'Use `grep` on the sensor dump with the marker mentioned in the notice. The matching record contains the location information and the access value you need to continue.'
    ]
  },

  {
    id: 16,
    key: 'KEY_16',
    name: 'Two Halves',
    folder: '/core',
    objective: 'Combine the identity and the location into one code.',
    requiredCommand: null,
    points: 550,
    hints: [
      'This level does not require discovering a completely new piece of information. Revisit the identity information from vault_alpha and the location information from vault_beta.',
      'Take the personal designator from the identity clue and the location number from the coordinates clue. Join them using the same prefix-dash-number structure used throughout the system.'
    ]
  },

  {
    id: 17,
    key: 'KEY_17',
    name: 'Core Access',
    folder: '/final_uplink',
    objective: 'Get through the last physical door before the black box.',
    requiredCommand: null,
    points: 550,
    hints: [
      'The final_uplink directory contains two files. One is specifically an access note, so start there instead of trying to derive the code from the surrounding story.',
      'Read the access note carefully. It contains the exact structure of the next access value; preserve its prefix and separator when submitting the value to the unlock command.'
    ]
  },

  {
    id: 18,
    key: 'KEY_18',
    name: 'Project Chrysalis',
    folder: '/final_uplink',
    objective: 'Search the recovered transcript and identify the project that Noah was investigating.',
    requiredCommand: 'grep',
    points: 600,
    hints: [
      'The recovered transcript is too large to read with `cat`. The notice beside it explains what kind of information you should search for.',
      'Use `grep` on the transcript and search for the project reference described by the notice. The matching record identifies the project and contains the information needed to construct the next access value.'
    ]
  },

  {
    id: 19,
    key: 'KEY_19',
    name: 'The Black Box',
    folder: '/black_box',
    objective: 'Read the final recording and find the last code.',
    requiredCommand: null,
    points: 650,
    hints: [
      'The black box contains a recording transcript rather than another puzzle requiring multiple files. Read it carefully from beginning to end.',
      'The important information appears at the end of the recording. The final lines explicitly describe the code used when the system recorded its shutdown; use that value with the unlock command.'
    ]
  },

  {
    id: 20,
    key: 'KEY_20',
    name: 'Shutdown',
    folder: '/the_truth',
    objective: 'Read the final message and close the system out for good.',
    requiredCommand: null,
    points: 700,
    completesGame: true,
    hints: [
      'The final message is inside the_truth. Open the directory and read the final message file rather than trying to guess what the shutdown code should be.',
      'Read the message all the way to its final lines. The last part explicitly identifies the shutdown value as the final thing entered into the system; submit that value to complete the investigation.'
    ]
  }
];

module.exports = levels;