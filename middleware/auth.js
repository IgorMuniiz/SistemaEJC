const Admin = require('../models/Admin');
const { normalizeAdminAccessLevel, resolveAdminPermissions } = require('../utils/normalization');
const { normalizeTextInput } = require('../utils/normalization');

const buildAdminSessionData = (adminDoc) => {
  const nivelAcesso = normalizeAdminAccessLevel(adminDoc?.nivelAcesso, 'super_admin');
  const permissoes = resolveAdminPermissions(adminDoc);
  return {
    _id: adminDoc?._id,
    username: adminDoc?.username || '',
    nivelAcesso,
    permissoes,
  };
};

const checkAdminAuth = async (req, res, next) => {
  try {
    if (!req.session.adminId) {
      return res.redirect('/admin/login');
    }

    const admin = await Admin.findById(req.session.adminId).select('username nivelAcesso permissoes').lean();
    if (!admin) {
      req.session.destroy(() => {});
      return res.redirect('/admin/login');
    }

    const sessionData = buildAdminSessionData(admin);
    req.adminUser = sessionData;
    req.session.adminUsername = sessionData.username;
    req.session.adminNivelAcesso = sessionData.nivelAcesso;
    req.session.adminPermissoes = sessionData.permissoes;
    return next();
  } catch (err) {
    console.error('Erro ao validar sessão de admin:', err);
    return res.redirect('/admin/login');
  }
};

const denyAdminPermission = (req, res, permissionKey) => {
  const acceptsJson = req.xhr
    || String(req.headers.accept || '').includes('application/json')
    || req.method !== 'GET';

  if (acceptsJson) {
    return res.status(403).json({
      success: false,
      error: 'Sem permissão para executar esta ação.',
      permission: permissionKey,
    });
  }

  return res.status(403).send('Acesso negado: você não possui permissão para esta área.');
};

const requireAdminPermission = (permissionKey) => (req, res, next) => {
  const permissoes = Array.isArray(req.adminUser?.permissoes) ? req.adminUser.permissoes : [];
  if (permissoes.includes(permissionKey)) return next();
  return denyAdminPermission(req, res, permissionKey);
};

module.exports = {
  buildAdminSessionData,
  checkAdminAuth,
  denyAdminPermission,
  requireAdminPermission,
};
