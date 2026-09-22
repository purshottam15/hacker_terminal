/**
 * LEVELS
 * ------
 * A level "completes" the instant its `key` is unlocked via the `unlock`
 * command — the engine never needs level-specific code for that. This
 * array only exists to (a) attach flavor/points/hints to a key and
 * (b) let the sidebar and `hint` command know what's "current."
 *
 * TO ADD LEVEL 21: add an object here with a new `key` id, then give
 * some folder/file/command in the other config files that requiresKey
 * of that id. That's the entire integration surface.
 *
 * requiredCommand is informational only (shown in the UI / used for
 * flavor) — actual enforcement happens naturally because the file that
 * contains the code is `large: true` and cat refuses to print it.
 */

const levels = [
  {
    id: 1,
    key: 'KEY_1',
    name: 'First Contact',
    objective: 'Find a way past the front door.',
    requiredCommand: null,
    points: 100,
    hints: [
      'Try `ls` to see what exists at the top level, then `cat` the files you find.',
      'There are two text files sitting right next to each other at the root. Read both.',
      'note.txt has a code in it. Feed it to the system with: unlock 7F29'
    ]
  },
  {
    id: 2,
    key: 'KEY_2',
    name: 'Alpha Wing',
    objective: 'Find what alpha wing is hiding in its vault.',
    requiredCommand: null,
    points: 200,
    hints: [
      'You unlocked three wings at once. Start with alpha — cd restricted_alpha',
      'cat the file you find there carefully, all the way to the end.',
      'access.txt ends with a code: B3D9'
    ]
  },
  {
    id: 3,
    key: 'KEY_3',
    name: 'A Number He Never Wrote Down',
    objective: 'Work out beta wing\'s access code from what people remember about him.',
    requiredCommand: null,
    points: 200,
    hints: [
      'cd restricted_beta and cat old_note.txt',
      'The note gives you two numbers: a year and a rack number. Combine them in the order they\'re mentioned.',
      'Year 2019 gives "19", rack 07 gives "07". Mashed together: unlock 1907'
    ]
  },
  {
    id: 4,
    key: 'KEY_4',
    name: 'The Batch Code',
    objective: 'Cross-reference gamma wing\'s two files to build a single code.',
    requiredCommand: null,
    points: 200,
    hints: [
      'cd restricted_gamma and read both files in there.',
      'One file gives you a prefix, the other gives you a recurring badge number.',
      'Prefix "K4-" plus badge "2091": unlock K4-2091'
    ]
  },
  {
    id: 5,
    key: 'KEY_5',
    name: 'The Filename Is The Code',
    objective: 'Get into delta wing\'s backup drive.',
    requiredCommand: null,
    points: 300,
    hints: [
      'cd restricted_delta, then ls again — look closely at every filename, even the odd-looking ones.',
      'One "file" isn\'t really meant to be read for its content — its name is the point. cat it anyway.',
      'Strip the "cfg_" label off the filename: unlock D5-77A1'
    ]
  },
  {
    id: 6,
    key: 'KEY_6',
    name: 'The Review Code',
    objective: 'Get proper access to the archive wing\'s internal logs.',
    requiredCommand: null,
    points: 300,
    hints: [
      'cd archive and read everything sitting there before going further.',
      'One file is explicitly labelled as an internal review note.',
      'unlock AR-6602'
    ]
  },
  {
    id: 7,
    key: 'KEY_7',
    name: 'A Wing That Isn\'t Nested Anywhere',
    objective: 'Find the network wing — it was mounted outside the normal structure.',
    requiredCommand: null,
    points: 300,
    hints: [
      'Once archive/logs is open, read what\'s inside it.',
      'The access log explicitly mentions a wing mounted at the top level, with its code attached.',
      'unlock N3T-7734, then check `ls` from the root again'
    ]
  },
  {
    id: 8,
    key: 'KEY_8',
    name: 'The Flagged Record',
    objective: 'Clear the access flag on the personnel record in delta/backup.',
    requiredCommand: null,
    points: 350,
    hints: [
      'delta/backup/status.txt told you the unlock procedure lives in the archive wing.',
      'Look for a file in archive specifically about clearing flags.',
      'flag_procedure.txt has it: unlock PR-5567'
    ]
  },
  {
    id: 9,
    key: 'KEY_9',
    name: 'A Sharper Tool',
    objective: 'Unlock the deep logs — and the tool you\'ll need to actually read them.',
    requiredCommand: null,
    points: 350,
    hints: [
      'cd network and read what\'s there.',
      'One file specifically talks about a search utility and gives you a code in the same breath.',
      'unlock DL-2205 — this should also make `grep` usable.'
    ]
  },
  {
    id: 10,
    key: 'KEY_10',
    name: 'Search, Don\'t Read',
    objective: 'Use grep to pull a hidden code out of a huge connection log.',
    requiredCommand: 'grep',
    points: 400,
    hints: [
      'cd into deep_logs. `cat` on connection_log.txt will refuse — it\'s too big.',
      'The file itself tells you what to search for.',
      'grep "ACCESS" connection_log.txt — look for "key_fragment=" in the results, then unlock FR-9182'
    ]
  },
  {
    id: 11,
    key: 'KEY_11',
    name: 'Into The Mainframe',
    objective: 'Follow the forensics trail to the mainframe.',
    requiredCommand: null,
    points: 400,
    hints: [
      'cd forensics and read both files there.',
      'report.txt has the code, and mentions a tool for reading just the top of a file.',
      'unlock MF-3300 — this should also make `head` usable.'
    ]
  },
  {
    id: 12,
    key: 'KEY_12',
    name: 'Just The First Line',
    objective: 'Use head to pull the init key out of the mainframe\'s boot config.',
    requiredCommand: 'head',
    points: 450,
    hints: [
      'cd mainframe. core_config.txt is too long for cat.',
      'You only need the very first line of it.',
      'head core_config.txt — then unlock C0R3-4415'
    ]
  },
  {
    id: 13,
    key: 'KEY_13',
    name: 'The Core',
    objective: 'Reach the core and open both vaults inside it.',
    requiredCommand: null,
    points: 450,
    hints: [
      'cd core and read the personal notes left there.',
      'One code opens both vault_alpha and vault_beta at once.',
      'unlock VX-8841'
    ]
  },
  {
    id: 14,
    key: 'KEY_14',
    name: 'Who He Was',
    objective: 'Confirm the identity behind this system, using a number you already know.',
    requiredCommand: null,
    points: 500,
    hints: [
      'cd vault_alpha and read the letter fragment.',
      'It references a number from way back in beta wing — the one you built yourself.',
      'That number was 1907. Add the prefix it tells you: unlock ID-1907'
    ]
  },
  {
    id: 15,
    key: 'KEY_15',
    name: 'Where He Went',
    objective: 'Find the safehouse coordinates buried in raw sensor data.',
    requiredCommand: 'grep',
    points: 500,
    hints: [
      'cd vault_beta. sensor_dump.txt is way too long to cat.',
      'Search it for the tag mentioned in coordinates_notice.txt.',
      'grep "SAFEHOUSE" sensor_dump.txt — then unlock CO-3391'
    ]
  },
  {
    id: 16,
    key: 'KEY_16',
    name: 'Two Halves',
    objective: 'Combine the identity and the location into one code.',
    requiredCommand: null,
    points: 550,
    hints: [
      'You now have a personal designator from vault_alpha/identity and a location number from vault_beta/coordinates.',
      'Every code on this system follows the same shape: short prefix, dash, the part that matters. These two pieces already fit that shape.',
      'unlock KA07-3391'
    ]
  },
  {
    id: 17,
    key: 'KEY_17',
    name: 'Core Access',
    objective: 'Get through the last physical door before the black box.',
    requiredCommand: null,
    points: 550,
    hints: [
      'cd final_uplink and read both files sitting there.',
      'One of them is explicitly labelled as an access note.',
      'unlock CA-5510'
    ]
  },
  {
    id: 18,
    key: 'KEY_18',
    name: 'Project Chrysalis',
    objective: 'Search the recovered transcript for the name of the project he found.',
    requiredCommand: 'grep',
    points: 600,
    hints: [
      'cd core_access. transcript.txt is far too long to cat.',
      'The notice file next to it tells you exactly what word to search for.',
      'grep "CHRYSALIS" transcript.txt — then unlock CH-8850'
    ]
  },
  {
    id: 19,
    key: 'KEY_19',
    name: 'The Black Box',
    objective: 'Read the final recording and find the last code.',
    requiredCommand: null,
    points: 650,
    hints: [
      'cd black_box and read the recording transcript.',
      'It ends with the exact code it used to log its own shutdown.',
      'unlock TRUTH-0001'
    ]
  },
  {
    id: 20,
    key: 'KEY_20',
    name: 'Shutdown',
    objective: 'Read the final message and close the system out for good.',
    requiredCommand: null,
    points: 700,
    completesGame: true,
    hints: [
      'cd the_truth and cat final_message.txt.',
      'It ends with a shutdown code, explicitly labelled as the last thing he ever typed.',
      'unlock END-0000'
    ]
  }
];

module.exports = levels;
