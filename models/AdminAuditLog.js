const mongoose = require('mongoose');

const adminAuditLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  adminUsername: { type: String, default: '' },
  action: { type: String, required: true },
  targetType: { type: String, default: '' },
  targetId: { type: String, default: '' },
  status: { type: String, enum: ['success', 'error'], default: 'success' },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  metadata: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AdminAuditLog', adminAuditLogSchema);
