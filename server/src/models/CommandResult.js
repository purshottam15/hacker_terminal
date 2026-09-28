const mongoose = require('mongoose');

const commandResultSchema = new mongoose.Schema(
  {
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
    commandId: { type: String, required: true, trim: true, maxlength: 100 },
    response: { type: mongoose.Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

commandResultSchema.index({ playerId: 1, commandId: 1 }, { unique: true });
commandResultSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('CommandResult', commandResultSchema);
