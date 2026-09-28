const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
    role: { type: String, enum: ['participant', 'admin'], required: true, index: true },
    createdAt: { type: Date, required: true, default: Date.now },
    lastSeenAt: { type: Date, required: true, default: Date.now, index: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null, index: true },
    revokedReason: { type: String, trim: true, maxlength: 120, default: null },
    ip: { type: String, trim: true, maxlength: 80, default: null },
    userAgent: { type: String, trim: true, maxlength: 300, default: null }
  },
  { timestamps: true }
);

sessionSchema.index({ playerId: 1, revokedAt: 1, expiresAt: 1 });

module.exports = mongoose.model('Session', sessionSchema);
