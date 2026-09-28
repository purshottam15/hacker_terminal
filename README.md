# Hacker's Terminal

A 45-60 minute browser-based CLI treasure hunt. Players get a fake Linux
shell into a recovered filesystem, explore, decode clues, and unlock their
way through 20 levels to a final story reveal. Built with React, Express,
and MongoDB.

## Running Locally

You need Node.js 18+ and a MongoDB instance, either local `mongod` or a
hosted MongoDB URI.

**Server**

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

The API runs on `http://localhost:4000`.

**Client**

```bash
cd client
npm install
npm run dev
```

The app runs on `http://localhost:5173` and proxies `/api` calls to the
server through `client/vite.config.js`.

## Event Setup

Participants log in with a roll number and private PIN. Seed them from a
CSV with `rollNo,name` columns:

```bash
cd server
npm run seed:participants -- --input participants.csv --output private-pins.csv
```

Keep the generated PIN CSV private and out of the frontend/public repo.
Re-run with `--replace-existing` only when you intentionally want to rotate
PINs for existing roll numbers.

Create an admin account before the event:

```bash
cd server
npm run create:admin -- --rollNo ADMIN --name "Event Admin" --pin "change-me-123"
```

Admins log in from the same login screen by switching to admin mode. The
admin console can start, pause, resume, and end the event; view participant
state; reset stale sessions; extend time; disqualify participants; and
export results as CSV.

Players can log in before the event starts, but they cannot start their
45-minute timer until an admin starts the event. Pausing the event freezes
active timers and resuming extends active deadlines by the pause duration.

## Project Layout

```text
server/src/
  config.js          <- environment-driven runtime config
  gameData/          <- all game content lives here
    filesystem.js    <- the virtual filesystem tree
    keys.js          <- code -> key id map, such as unlock 7F29
    levels.js        <- level metadata: points, hints, objective, story
    commands.js      <- command list and command unlock requirements
  engine/
    vfs.js           <- path resolution and lock checks
    gameEngine.js    <- parses commands and mutates player game state
  models/            <- Player, Session, EventState, AuditLog, CommandResult
  routes/            <- auth, game, session, admin, leaderboard, meta APIs
  scripts/           <- participant seeding, admin creation, load testing

client/src/
  api.js             <- HTTP client
  App.jsx            <- session routing and top-level app state
  components/        <- login, start screen, terminal, sidebar, admin UI
```

## How The Game Logic Works

- `filesystem.js` is one nested JS tree. Folders can declare
  `requiresKey: 'KEY_X'`; locked folders are shown but cannot be entered
  until that key is unlocked.
- `keys.js` maps the literal code a player types, such as `7F29`, to an
  internal key id, such as `KEY_1`.
- `levels.js` attaches points, hints, and completion metadata to key ids.
  A level completes the instant its key is unlocked.
- `commands.js` can also declare `requiresKey`. Unlocking `KEY_9`, for
  example, opens the deep logs and makes `grep` available.
- Large files can expose short `content` for `cat` and separate
  `fullContent` for `grep` or `head`, which teaches players to use newly
  unlocked commands without level-specific engine code.

## Common Content Edits

**Add Level 21**

1. Add a level object in `server/src/gameData/levels.js` with `key:
   'KEY_21'`.
2. Add `{ id: 'KEY_21', code: 'YOUR-CODE' }` in
   `server/src/gameData/keys.js`.
3. Add a folder, file, or command with `requiresKey: 'KEY_21'`.

**Change A Code**

Edit only the `code` field in `keys.js`. Other files reference key ids,
not literal code strings.

**Add Or Lock A Folder**

Edit `filesystem.js` and add a folder node anywhere in the tree. Add
`requiresKey` if it should stay locked until a key is unlocked.

**Change Hints Or Points**

Edit the matching level in `levels.js`. The `hint` command advances
through that level's hint array.

## Verification Helpers

Build the client:

```bash
cd client
npm run build
```

Check server syntax:

```powershell
Get-ChildItem server\src -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
Get-ChildItem server\scripts -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

Run a basic load test against a running server:

```bash
cd server
npm run load:test -- --credentials private-pins.csv --base-url http://localhost:4000 --count 150
```

## Scoring

Score is the sum of `points` for completed levels. The public leaderboard
excludes disqualified participants and sorts by score, then completed
levels, then elapsed time.

## Story

The player is exploring a recovered filesystem built by "Vektor", a
security researcher who discovered Project CHRYSALIS, an internal employee
surveillance program disguised as wellness telemetry. The story unfolds
through in-world files, logs, notes, and transcripts.
