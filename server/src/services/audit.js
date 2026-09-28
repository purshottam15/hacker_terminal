const AuditLog = require('../models/AuditLog');

async function audit(admin, action, details = {}) {
  if (!admin) return null;
  return AuditLog.create({
    adminPlayerId: admin._id,
    adminRollNo: admin.rollNo,
    action,
    rollNo: details.rollNo || null,
    reason: details.reason || null,
    oldValue: details.oldValue ?? null,
    newValue: details.newValue ?? null
  });
}

module.exports = { audit };
