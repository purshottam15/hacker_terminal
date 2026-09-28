require('dotenv').config();
const connectDB = require('../src/db');
const config = require('../src/config');
const Player = require('../src/models/Player');
const { hashPin, normalizeRollNo } = require('../src/utils/security');

async function main() {
  const rollNo = normalizeRollNo(process.env.ADMIN_ROLL_NO || 'ADMIN');
  const name = process.env.ADMIN_NAME || 'Event Admin';
  const pin = process.env.ADMIN_PIN || 'Admin@2026';

  await connectDB(config.MONGODB_URI);

  const pinHash = await hashPin(pin);

  const existing = await Player.findOne({ rollNo });

  if (existing) {
    existing.name = name;
    existing.pinHash = pinHash;
    existing.role = 'admin';
    existing.status = 'READY';
    existing.activeSessionId = null;
    existing.activeSessionExpiresAt = null;

    await existing.save();

    console.log('Admin updated successfully.');
  } else {
    await Player.create({
      rollNo,
      name,
      pinHash,
      role: 'admin',
      status: 'READY',
      activeSessionId: null,
      activeSessionExpiresAt: null
    });

    console.log('Admin created successfully.');
  }

  console.log(`Username: ${rollNo}`);
  console.log(`Password: ${pin}`);

  process.exit(0);
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});