# Hacker's Terminal

A 45–60 minute browser-based CLI treasure hunt. Players get a fake Linux
shell into a dead hacker's filesystem, explore, decode clues, and unlock
their way through 20 levels to a final story reveal. Built on MERN.

## Running it locally

You need Node.js 18+ and a MongoDB instance (local `mongod`, or a free
MongoDB Atlas cluster — either works, just put the connection string in
`.env`).

**Server**
```bash
cd server
cp .env.example .env      # edit MONGODB_URI if not using local default
npm install
npm run dev                # or: npm start
```
Runs on `http://localhost:4000`.

**Client**
```bash
cd client
npm install
npm run dev
```
Runs on `http://localhost:5173` and proxies `/api` calls to the server
(see `client/vite.config.js`). Open that URL, enter a name, and play.

For the event itself: `npm run build` the client, serve the `dist/`
folder from any static host (or have Express serve it), and point
`MONGODB_URI` at a shared database so everyone's progress lands in one
leaderboard.

## Project layout

```
server/src/
  gameData/          <- ALL game content lives here. Edit freely.
    filesystem.js    <- the virtual filesystem tree
    keys.js          <- code -> key id map ("unlock 7F29" etc.)
    levels.js        <- level metadata: points, hints, objective, story
    commands.js       <- which commands exist / what unlocks them
  engine/
    vfs.js           <- path resolution, lock-checking (generic, no game knowledge)
    gameEngine.js     <- parses a command string, applies it against gameData
  models/Player.js   <- Mongo schema for a play session
  routes/            <- register, run-command, leaderboard, meta HTTP endpoints

client/src/
  components/
    Terminal.jsx     <- the CLI itself (all gameplay happens here)
    Sidebar.jsx       <- progress / score / timer / command list (read-only)
    Login.jsx, Leaderboard.jsx
```

## How the game logic actually works

- **Filesystem** is one nested JS tree. Every folder can carry
  `requiresKey: 'KEY_X'`. A folder is enterable only if the player has
  that key. Files can be `large: true`, which makes `cat` show a stub
  ("too big, use grep") while the real text only shows up through
  `grep`/`head`. This is how "you must use the new command" gets
  enforced — through content, not special-case code.
- **Keys** (`keys.js`) map a typed code (e.g. `"7F29"`) to an internal id
  (e.g. `"KEY_1"`). When a player runs `unlock <code>`, the engine adds
  that id to their unlocked-keys list, then scans the *entire*
  filesystem and command list for anything declaring that same
  `requiresKey` — all of it opens at once. That's the "one key, several
  doors" mechanic, and it's automatic; nothing hardcodes which folders
  a given key opens except the folders' own config.
- **Levels** (`levels.js`) just attach a name/points/hints to a key.
  A level completes the instant its key is unlocked. There's no
  separate "level engine" — `levels` is read by `hint` (to find the
  player's current objective) and by `unlock` (to award points).
- **Commands** (`commands.js`) work the same way as folders: optional
  `requiresKey`, and unlocking that key adds the command to the
  player's `unlockedCommands` automatically.

The engine (`gameEngine.js`) never mentions "vault" or "grep the
transcript" — it only ever reads `requiresKey` and `code` fields. That's
what makes it safe to edit content without touching engine code.

## Common edits

**Add Level 21**
1. Add an object to `levels.js` with a new `key: 'KEY_21'`, points, hints.
2. Add `{ id: 'KEY_21', code: 'YOUR-CODE' }` to `keys.js`.
3. Add a folder/file somewhere in `filesystem.js` with
   `requiresKey: 'KEY_21'` (or attach it to a new/existing command in
   `commands.js`).
That's the whole integration — no engine code changes.

**Change the key for Level 8**
Edit the `code` field for `KEY_8` in `keys.js`. Nothing else changes,
since every other file only references the id `'KEY_8'`.

**Add a new folder / branch**
Add a `{ type: 'folder', name, requiresKey, children: [...] }` object
anywhere inside `filesystem.js`'s tree, at any depth.

**Change a file's contents**
Edit the `content` (or `fullContent`, for large files) string in
`filesystem.js`.

**Change which key unlocks which folder**
Change the `requiresKey` value on the folder node in `filesystem.js`.

**Change a hint / add more hints**
Edit the `hints` array on the level in `levels.js`. `hint` cycles
through them in order and stops at the last one.

**Change when a command (grep/head) becomes available**
Change `requiresKey` on that command's entry in `commands.js`.

**Make one folder unlock from a different key than its level's own
key** (e.g. an early key that also opens something late-game as an
easter egg) — just set that folder's `requiresKey` to any existing key
id. Multiple unrelated folders can share the same `requiresKey`.

## Scoring & leaderboard

Score is the sum of `points` for every completed level (points scale up
per level, defined in `levels.js`). No penalties for hints, wrong
commands, or exploring. Leaderboard sorts by levels completed
(descending), then elapsed time (ascending) as a tie-breaker only —
see `routes/leaderboard.js`.

## Story

The player is exploring the recovered filesystem of a security
researcher ("K. Ashworth") who discovered an internal employee
surveillance program ("Project CHRYSALIS") at his company, was fired
after reporting it, and built this drive as a dead-man's switch. The
story unfolds entirely through in-world files — readmes, logs, sticky
notes, personnel records — never through separate instruction text.
