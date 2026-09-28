const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    adminPlayerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
    adminRollNo: { type: String, required: true, trim: true, uppercase: true, index: true },
    action: { type: String, required: true, trim: true, maxlength: 80, index: true },
    rollNo: { type: String, trim: true, uppercase: true, maxlength: 32, default: null, index: true },
    reason: { type: String, trim: true, maxlength: 500, default: null },
    oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
