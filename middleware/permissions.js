const bcryptjs = require('bcryptjs');
const {
  ADMIN_LEVEL_RANK,
} = require('../constants/admin');
const { normalizeAdminAccessLevel } = require('../utils/normalization');

const getAdminLevelRank = (nivelAcesso) => ADMIN_LEVEL_RANK[normalizeAdminAccessLevel(nivelAcesso, 'consulta')] || 0;

const canManageAdminWithHierarchy = (actingAdmin, targetAdmin) => {
  const actingLevel = normalizeAdminAccessLevel(actingAdmin?.nivelAcesso, 'consulta');
  if (actingLevel === 'super_admin') return true;
  const actingRank = getAdminLevelRank(actingAdmin?.nivelAcesso);
  const targetRank = getAdminLevelRank(targetAdmin?.nivelAcesso);
  return actingRank > targetRank;
};

const BCRYPT_PREFIX_REGEX = /^\$2[aby]\$\d{2}\$/;

const validateAdminPassword = async (admin, plainPassword) => {
  const currentSenha = typeof admin.senha === 'string' ? admin.senha : '';
  const legacyPassword = typeof admin.password === 'string' ? admin.password : '';
  const candidates = [currentSenha, legacyPassword].filter(Boolean);

  for (const candidate of candidates) {
    if (BCRYPT_PREFIX_REGEX.test(candidate)) {
      try {
        const ok = await bcryptjs.compare(plainPassword, candidate);
        if (ok) {
          if (candidate !== currentSenha) {
            admin.senha = candidate;
            await admin.save();
          }
          return true;
        }
      } catch (_) {
        // Ignore malformed legacy hash and keep trying remaining formats.
      }
      continue;
    }

    // Compatibilidade com registros antigos salvos em texto puro.
    if (plainPassword === candidate) {
      admin.senha = await bcryptjs.hash(plainPassword, 10);
      await admin.save();
      return true;
    }
  }

  return false;
};

module.exports = {
  getAdminLevelRank,
  canManageAdminWithHierarchy,
  validateAdminPassword,
};
