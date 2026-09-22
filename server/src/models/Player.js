const mongoose = require('mongoose');
const commandDefs = require('../gameData/commands');

const BASE_COMMANDS = commandDefs.filter((c) => !c.requiresKey).map((c) => c.name);

const playerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    cwd: { type: [String], default: [] },
    unlockedKeys: { type: [String], default: [] },
    unlockedCommands: { type: [String], default: () => [...BASE_COMMANDS] },
    completedLevels: { type: [Number], default: [] },
    score: { type: Number, default: 0 },
    hintProgress: { type: mongoose.Schema.Types.Mixed, default: {} },
    startedAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Player', playerSchema);
