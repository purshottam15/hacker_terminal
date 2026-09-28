const mongoose = require('mongoose');

const EVENT_STATES = ['NOT_STARTED', 'RUNNING', 'PAUSED', 'FINISHED'];

const eventStateSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'event' },
    state: { type: String, enum: EVENT_STATES, default: 'NOT_STARTED', index: true },
    pausedAt: { type: Date, default: null },
    totalPausedMs: { type: Number, default: 0, min: 0 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    updatedByRollNo: { type: String, trim: true, uppercase: true, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('EventState', eventStateSchema);
module.exports.EVENT_STATES = EVENT_STATES;
