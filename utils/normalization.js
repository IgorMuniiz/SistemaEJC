const {
  ADMIN_ACCESS_LEVELS,
  ADMIN_PERMISSION_KEYS,
  ADMIN_ROLE_DEFAULT_PERMISSIONS,
  ADMIN_LEVEL_RANK,
} = require('../constants/admin');

const normalizeTextInput = (value) => String(value || '').trim();

const parseDateInput = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const raw = String(value).trim();
  if (!raw) return null;

  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const [, dd, mm, yyyy] = brMatch;
    const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeBooleanInput = (value) => {
  if (typeof value === 'boolean') return value;
  const raw = String(value || '').trim().toLowerCase();
  return ['1', 'true', 'sim', 'yes', 'y', 'on'].includes(raw);
};

const normalizeApprovalStatusInput = (value) => {
  const raw = normalizeTextInput(value).toLowerCase();
  if (['aprovado', 'approved'].includes(raw)) return 'aprovado';
  if (['reprovado', 'desaprovado', 'rejected'].includes(raw)) return 'reprovado';
  if (['pendente_contato', 'pendentecontato', 'contato_pendente', 'aguardando_contato'].includes(raw)) return 'pendente_contato';
  if (['documentacao_pendente', 'documentacaopendente', 'doc_pendente'].includes(raw)) return 'documentacao_pendente';
  if (['desistiu', 'desistencia', 'desistente'].includes(raw)) return 'desistiu';
  if (['remanejado', 'remanejado_equipe', 'remanejadoequipe'].includes(raw)) return 'remanejado';
  if (['pendente', 'pending'].includes(raw)) return 'pendente';
  return '';
};

const resolveApprovalStatus = (doc) => {
  const fromField = normalizeApprovalStatusInput(doc && doc.statusAprovacao);
  if (fromField) return fromField;
  return doc && doc.aprovado ? 'aprovado' : 'pendente';
};

const normalizePhoneDigits = (value) => String(value || '').replace(/\D/g, '');

const normalizeStringArrayInput = (value) => {
  if (Array.isArray(value)) return value.map((item) => normalizeTextInput(item)).filter(Boolean);
  const text = normalizeTextInput(value);
  if (!text) return [];
  return text.split(',').map((item) => item.trim()).filter(Boolean);
};

const normalizeMultiField = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return [value];
};

const normalizeTipoEncontro = (value) => {
  const raw = normalizeTextInput(value).toLowerCase();
  if (['homem', 'mulher', 'jovens'].includes(raw)) return 'jovens';
  if (raw === 'casal' || raw === 'tio solo' || raw === 'tios') return 'tios';
  if (['jovens', 'tios'].includes(raw)) return raw;
  return null;
};

const normalizeGeneroEncontro = (value) => {
  const raw = normalizeTextInput(value).toLowerCase();
  if (raw === 'homem') return 'masculino';
  if (raw === 'mulher') return 'feminino';
  if (['masculino', 'feminino', 'outros'].includes(raw)) return raw;
  return 'outros';
};

const normalizeAdminAccessLevel = (value, fallback = 'super_admin') => {
  const raw = normalizeTextInput(value).toLowerCase();
  if (ADMIN_ACCESS_LEVELS.includes(raw)) return raw;
  return fallback;
};

const sanitizeAdminPermissions = (value) => {
  const raw = Array.isArray(value) ? value : [value];
  return [...new Set(
    raw
      .map((item) => normalizeTextInput(item))
      .filter((item) => ADMIN_PERMISSION_KEYS.includes(item))
  )];
};

const resolveAdminPermissions = (adminDoc) => {
  const nivelAcesso = normalizeAdminAccessLevel(adminDoc?.nivelAcesso, 'super_admin');
  const base = ADMIN_ROLE_DEFAULT_PERMISSIONS[nivelAcesso] || [];
  if (nivelAcesso === 'super_admin') return [...ADMIN_PERMISSION_KEYS];
  const extras = sanitizeAdminPermissions(adminDoc?.permissoes);
  return [...new Set([...base, ...extras])];
};

const normalizeAdminEventScopeInput = (value) => {
  const raw = normalizeTextInput(value).toLowerCase();
  return raw === 'todos' ? 'todos' : 'ativo';
};

const extractPdfField = (block, labels) => {
  for (const label of labels) {
    const rx = new RegExp(`${label}\\s*:\\s*([^\\n]+)`, 'i');
    const match = block.match(rx);
    if (match && match[1]) return normalizeTextInput(match[1]);
  }
  return '';
};

const mapToEncontroPayload = (row, fotoPadrao = '', options = {}) => {
  const defaultTipo = normalizeTipoEncontro(options.defaultTipo);
  const fallbackFoto = normalizeTextInput(options.fallbackFoto);
  const nomeCompleto = normalizeTextInput(row.nomeCompleto || row.nome_completo || row.nome || row['nome completo']);
  const email = normalizeTextInput(row.email || row.email_principal || row['e-mail'] || row['email principal']);
  const tipo = normalizeTipoEncontro(
    row.tipo
    || row['tipo de encontreiro']
    || row['tipo encontreiro']
    || row['tipo de inscricao']
    || row.genero
    || row.sexo
  ) || defaultTipo;
  const foto = normalizeTextInput(row.foto || row.photo || fotoPadrao || fallbackFoto);

  return {
    nomeCompleto,
    comoQuerSerChamado: normalizeTextInput(row.comoQuerSerChamado || row.apelido || row.nomeSocial),
    genero: normalizeGeneroEncontro(row.genero || row.sexo),
    email,
    tipo,
    tiosCategoria: normalizeTextInput(row.tiosCategoria || row.categoriaTios).toLowerCase() === 'casal' ? 'casal' : '',
    foto,
    ejc: normalizeTextInput(row.ejc) || 'Nao informado',
    qualEjcPertence: normalizeTextInput(row.qualEjcPertence || row.ejcPertence || row.ejc_pertence),
    logradouro: normalizeTextInput(row.logradouro || row.endereco) || 'Nao informado',
    bairro: normalizeTextInput(row.bairro) || 'Nao informado',
    dataNascimento: parseDateInput(row.dataNascimento || row.data_nascimento || row.nascimento || row.niver) || new Date('2000-01-01'),
    telefone: normalizeTextInput(row.telefone || row.celular) || 'Nao informado',
    instagram: normalizeTextInput(row.instagram),
    origemTios: normalizeBooleanInput(row.origemTios || row.origem),
    tiosGrupoId: normalizeTextInput(row.tiosGrupoId || row.tios_grupo_id || row.grupoId),
    equipeServiu: normalizeStringArrayInput(row.equipeServiu || row.equipe_serviu),
    equipeCoordenou: normalizeStringArrayInput(row.equipeCoordenou || row.equipe_coordenou),
    temVeiculoProprio: normalizeBooleanInput(row.temVeiculoProprio || row.tem_veiculo_proprio || row.veiculoProprio),
    intolerante: normalizeTextInput(row.intolerante || row.alergias),
    ehAlergico: normalizeTextInput(row.ehAlergico || row.e_alergico || row.alergico).toLowerCase() === 'sim' ? 'sim' : (normalizeTextInput(row.alergias) ? 'sim' : 'nao'),
    alergiaDescricao: normalizeTextInput(row.alergiaDescricao || row.alergia_descricao || row.alergias),
    temRelacionamento: normalizeTextInput(row.temRelacionamento || row.relacionamento),
    observacoes: normalizeTextInput(row.observacoes || row.obs),
    aprovado: normalizeBooleanInput(row.aprovado),
    statusAprovacao: normalizeApprovalStatusInput(row.statusAprovacao || row.status_aprovacao) || (normalizeBooleanInput(row.aprovado) ? 'aprovado' : 'pendente'),
    dataCadastro: parseDateInput(row.dataCadastro || row.data_cadastro) || new Date(),
  };
};

module.exports = {
  normalizeTextInput,
  parseDateInput,
  normalizeBooleanInput,
  normalizeApprovalStatusInput,
  resolveApprovalStatus,
  normalizePhoneDigits,
  normalizeStringArrayInput,
  normalizeMultiField,
  normalizeTipoEncontro,
  normalizeGeneroEncontro,
  normalizeAdminAccessLevel,
  sanitizeAdminPermissions,
  resolveAdminPermissions,
  normalizeAdminEventScopeInput,
  extractPdfField,
  mapToEncontroPayload,
};
