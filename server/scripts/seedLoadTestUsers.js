const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const Player = require('../src/models/Player');
const config = require('../src/config');

const CSV_PATH = path.join(
  __dirname,
  'test_participants_001_114.csv'
);

const TEST_PIN = '123456';
const BCRYPT_ROUNDS = 4;

function parseCSV(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').trim();

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('CSV is empty or contains no participant rows.');
  }

  const separator = lines[0].includes('\t') ? '\t' : ',';

  console.log(
    `Detected ${separator === '\t' ? 'TAB-separated' : 'CSV'} format.`
  );

  // Remove header
  lines.shift();

  return lines.map((line, index) => {
    const parts = line.split(separator);

    if (parts.length < 2) {
      throw new Error(`Invalid row ${index + 2}: "${line}"`);
    }

    const rollNo = parts[0]?.trim();
    const name = parts[1]?.trim();

    if (!rollNo) {
      throw new Error(`Missing rollNo at row ${index + 2}`);
    }

    if (!name) {
      throw new Error(`Missing name at row ${index + 2}`);
    }

    return {
      rollNo: rollNo.toUpperCase(),
      name
    };
  });
}

async function seed() {
  try {
    console.log('Connecting to MongoDB...');

    await mongoose.connect(config.MONGODB_URI);

    console.log('MongoDB connected.');
    console.log('');

    if (!fs.existsSync(CSV_PATH)) {
      throw new Error(`CSV not found: ${CSV_PATH}`);
    }

    const users = parseCSV(CSV_PATH);

    console.log(`Found ${users.length} users in CSV.`);
    console.log('');

    // Hash ONCE.
    // Cost 4 for load testing.
    console.log(`Hashing PIN with bcrypt cost ${BCRYPT_ROUNDS}...`);

    const pinHash = await bcrypt.hash(TEST_PIN, BCRYPT_ROUNDS);

    console.log('PIN hash generated.');
    console.log('');

    let updated = 0;
    let notFound = 0;

    for (const user of users) {
      const result = await Player.updateOne(
        { rollNo: user.rollNo },
        {
          $set: {
            pinHash: pinHash,
            name: user.name
          }
        }
      );

      if (result.matchedCount === 0) {
        console.log(`[NOT FOUND] ${user.rollNo}`);
        notFound++;
      } else {
        console.log(`[UPDATED] ${user.rollNo} - ${user.name}`);
        updated++;
      }
    }

    console.log('');
    console.log('======================================');
    console.log('PIN HASH UPDATE COMPLETE');
    console.log('======================================');
    console.log(`CSV users : ${users.length}`);
    console.log(`Updated   : ${updated}`);
    console.log(`Not found : ${notFound}`);
    console.log(`PIN       : ${TEST_PIN}`);
    console.log(`Bcrypt    : ${BCRYPT_ROUNDS}`);
    console.log('======================================');

  } catch (err) {
    console.error('');
    console.error('UPDATE FAILED');
    console.error(err);

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}

seed();