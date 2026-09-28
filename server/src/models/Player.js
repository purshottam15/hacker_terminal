const mongoose = require('mongoose');
const commandDefs = require('../gameData/commands');

const BASE_COMMANDS = commandDefs.filter((c) => !c.requiresKey).map((c) => c.name);

const PLAYER_STATUSES = [
  'READY',
  'LOGGED_IN',
  'PLAYING',
  'COMPLETED',
  'TIMED_OUT',
  'DISQUALIFIED'
];

const PLAYER_ROLES = ['participant', 'admin'];

const playerSchema = new mongoose.Schema(
  {
    rollNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 32
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    pinHash: { type: String, required: true, select: false },
    role: { type: String, enum: PLAYER_ROLES, default: 'participant', index: true },
    status: { type: String, enum: PLAYER_STATUSES, default: 'READY', index: true },

    cwd: { type: [String], default: [] },
    unlockedKeys: { type: [String], default: [] },
    unlockedCommands: { type: [String], default: () => [...BASE_COMMANDS] },
    completedLevels: { type: [Number], default: [] },
    score: { type: Number, default: 0, min: 0 },
    hintProgress: { type: mongoose.Schema.Types.Mixed, default: {} },

    startedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null, index: true },
    completedAt: { type: Date, default: null },
    lastSeenAt: { type: Date, default: null, index: true },
    lastCommandAt: { type: Date, default: null },

    activeSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
    activeSessionExpiresAt: { type: Date, default: null },

    disqualifiedAt: { type: Date, default: null },
    disqualifiedReason: { type: String, trim: true, maxlength: 500, default: null }
  },
  { timestamps: true }
);

playerSchema.index({ rollNo: 1 }, { unique: true });
playerSchema.index({ role: 1, status: 1 });
playerSchema.index({ status: 1, score: -1 });
playerSchema.index({ role: 1, score: -1, completedAt: 1 });

module.exports = mongoose.model('Player', playerSchema);
module.exports.PLAYER_STATUSES = PLAYER_STATUSES;
module.exports.PLAYER_ROLES = PLAYER_ROLES;
module.exports.BASE_COMMANDS = BASE_COMMANDS;
