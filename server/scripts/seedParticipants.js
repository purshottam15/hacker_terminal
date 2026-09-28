require('dotenv').config();

const fs = require('fs');
const path = require('path');

const connectDB = require('../src/db');
const config = require('../src/config');
const Player = require('../src/models/Player');
const { BASE_COMMANDS } = require('../src/models/Player');

const {
  generatePin,
  hashPin,
  normalizeRollNo
} = require('../src/utils/security');

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function flag(name) {
  return process.argv.includes(`--${name}`);
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"' && quoted && line[i + 1] === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current.trim());

  return cells;
}

function readParticipants(filePath) {
  const text = fs
    .readFileSync(filePath, 'utf8')
    .replace(/^\uFEFF/, '');

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [rollNoRaw, nameRaw] = parseCsvLine(line);

      const rollNo = normalizeRollNo(rollNoRaw);
      const name = String(nameRaw || '').trim();

      // Skip CSV header
      if (index === 0 && rollNo === 'ROLLNO') {
        return null;
      }

      if (!rollNo || !name) {
        throw new Error(
          `Invalid participant row ${index + 1}. Expected: rollNo,name`
        );
      }

      if (rollNo.length > 32) {
        throw new Error(
          `Roll number too long on row ${index + 1}.`
        );
      }

      if (name.length > 80) {
        throw new Error(
          `Name too long on row ${index + 1}.`
        );
      }

      return {
        rollNo,
        name
      };
    })
    .filter(Boolean);
}

function csvCell(value) {
  const str = String(value ?? '');

  return /[",\n\r]/.test(str)
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

async function main() {
  const input = arg('input');

  const output = arg(
    'output',
    path.resolve(process.cwd(), 'participant-pins.csv')
  );

  // Optional shared PIN.
  // If --pin is not provided, a random PIN is generated for every participant.
  const sharedPin = arg('pin');

  const replaceExisting = flag('replace-existing');

  if (!input) {
    throw new Error(
      'Usage: npm run seed:participants -- --input participants.csv --output private-pins.csv [--pin 123456] [--replace-existing]'
    );
  }

  // Validate shared PIN if supplied.
  if (sharedPin !== null) {
    if (!/^\d{6}$/.test(sharedPin)) {
      throw new Error(
        'PIN must be exactly 6 digits.'
      );
    }
  }

  const participants = readParticipants(
    path.resolve(process.cwd(), input)
  );

  if (!participants.length) {
    throw new Error('No participants found in input CSV.');
  }

  // Check duplicate roll numbers inside CSV.
  const seen = new Set();

  for (const participant of participants) {
    if (seen.has(participant.rollNo)) {
      throw new Error(
        `Duplicate roll number in CSV: ${participant.rollNo}`
      );
    }

    seen.add(participant.rollNo);
  }

  await connectDB(config.MONGODB_URI);

  const existing = await Player.find({
    rollNo: {
      $in: participants.map((p) => p.rollNo)
    }
  }).lean();

  if (existing.length && !replaceExisting) {
    throw new Error(
      `Existing roll numbers found: ${existing
        .map((p) => p.rollNo)
        .join(', ')}. Re-run with --replace-existing to rotate their PINs.`
    );
  }

  const outputRows = [
    ['rollNo', 'name', 'PIN']
  ];

  for (const participant of participants) {

    // Use shared PIN when --pin is supplied.
    // Otherwise generate a different random PIN.
    const pin = sharedPin || generatePin();

    // Never store plaintext PIN in MongoDB.
    const pinHash = await hashPin(pin);

    await Player.updateOne(
      {
        rollNo: participant.rollNo
      },
      {
        $set: {
          rollNo: participant.rollNo,
          name: participant.name,
          pinHash,
          role: 'participant',
          status: 'READY',

          cwd: [],
          unlockedKeys: [],
          unlockedCommands: [...BASE_COMMANDS],
          completedLevels: [],

          score: 0,
          hintProgress: {},

          startedAt: null,
          expiresAt: null,
          completedAt: null,

          lastSeenAt: null,
          lastCommandAt: null,

          activeSessionId: null,
          activeSessionExpiresAt: null,

          disqualifiedAt: null,
          disqualifiedReason: null
        }
      },
      {
        upsert: true
      }
    );

    // Plaintext PIN is written ONLY to the private credential CSV.
    outputRows.push([
      participant.rollNo,
      participant.name,
      pin
    ]);
  }

  const outputPath = path.resolve(
    process.cwd(),
    output
  );

  fs.writeFileSync(
    outputPath,
    outputRows
      .map((row) => row.map(csvCell).join(','))
      .join('\n'),
    {
      encoding: 'utf8',
      mode: 0o600
    }
  );

  console.log('');
  console.log(`Seeded ${participants.length} participants.`);

  if (sharedPin) {
    console.log(
      `Shared PIN mode enabled. All participants use PIN: ${sharedPin}`
    );
  } else {
    console.log(
      'Random PIN mode enabled. Each participant received a unique PIN.'
    );
  }

  console.log(
    `Private PIN CSV written to: ${outputPath}`
  );

  console.log(
    'Keep this file out of the frontend and public repositories.'
  );

  process.exit(0);
}

main().catch((err) => {
  console.error('');
  console.error('Seed failed:');
  console.error(err.message);
  process.exit(1);
});