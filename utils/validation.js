const { normalizeTextInput, normalizePhoneDigits } = require('./normalization');

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePositiveInt = (value, fallback, min, max) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
};

const findExistingByNameOrEmail = async (Model, nomeCompleto, email, telefone = '', options = {}) => {
  const nome = String(nomeCompleto || '').trim();
  const mail = String(email || '').trim();
  const phoneDigits = normalizePhoneDigits(telefone);
  const ejcScope = normalizeTextInput(options.ejc);

  const filters = [];
  if (mail && !mail.includes('@pendente.local')) {
    filters.push({ email: new RegExp(`^${escapeRegExp(mail)}$`, 'i') });
  }
  if (phoneDigits) {
    filters.push({ telefone: new RegExp(escapeRegExp(phoneDigits.split('').join('\\D*')), 'i') });
  }
  if (nome) {
    filters.push({ nomeCompleto: new RegExp(`^${escapeRegExp(nome)}$`, 'i') });
  }

  if (filters.length === 0) return null;

  const query = { $or: filters };
  if (ejcScope) {
    query.ejc = new RegExp(`^${escapeRegExp(ejcScope)}$`, 'i');
  }

  return Model.findOne(query);
};

module.exports = {
  escapeRegExp,
  parsePositiveInt,
  findExistingByNameOrEmail,
};
