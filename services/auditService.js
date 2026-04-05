const AdminAuditLog = require('../models/AdminAuditLog');
const { getClientIp } = require('../utils/security');

const logAdminAction = async (req, payload) => {
  try {
    await AdminAuditLog.create({
      adminId: req.session?.adminId || null,
      adminUsername: req.session?.adminUsername || 'desconhecido',
      action: payload.action,
      targetType: payload.targetType || '',
      targetId: payload.targetId ? String(payload.targetId) : '',
      status: payload.status || 'success',
      ip: getClientIp(req),
      userAgent: String(req.headers['user-agent'] || ''),
      metadata: payload.metadata || {},
    });
  } catch (err) {
    console.error('Falha ao registrar auditoria:', err.message);
  }
};

module.exports = { logAdminAction };
