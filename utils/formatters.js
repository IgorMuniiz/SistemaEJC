const formatExportValue = (value) => {
  if (Array.isArray(value)) return value.join(' | ');
  return value;
};

const formatDateBR = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const truncateText = (value, max = 42) => {
  const text = String(value || '').trim();
  if (!text) return '-';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}...`;
};

const buildPdfDisplayName = (nomeCompleto, comoQuerSerChamado, max = 28) => {
  const normalizeTextInput = (v) => String(v || '').trim();
  const nome = normalizeTextInput(nomeCompleto) || 'Nao informado';
  const apelido = normalizeTextInput(comoQuerSerChamado);
  const parts = nome.split(/\s+/).filter(Boolean);

  const abbreviateSurnames = () => {
    if (parts.length <= 2) return nome;

    const firstToken = normalizeTextInput(parts[0]).toLowerCase();
    const preserveCount = ['tio', 'tia'].includes(firstToken)
      ? Math.min(parts.length >= 5 ? 3 : 2, parts.length)
      : Math.min(2, parts.length);

    return parts.map((part, index) => {
      if (index < preserveCount) return part;
      const initial = normalizeTextInput(part).charAt(0);
      return initial ? `${initial.toUpperCase()}.` : '';
    }).filter(Boolean).join(' ');
  };

  if (!apelido) {
    if (nome.length <= max) return nome;
    const abbreviatedName = abbreviateSurnames();
    if (abbreviatedName.length <= max) return abbreviatedName;
    return truncateText(abbreviatedName, max);
  }

  const render = (baseName) => `${baseName} (${apelido})`;
  let composed = render(nome);
  if (composed.length <= max) return composed;

  if (parts.length > 2) {
    composed = render(abbreviateSurnames());
    if (composed.length <= max) return composed;
  }

  const fallbackBaseMax = Math.max(8, max - apelido.length - 4);
  return `${truncateText(nome, fallbackBaseMax)} (${truncateText(apelido, 10)})`;
};

module.exports = {
  formatExportValue,
  formatDateBR,
  truncateText,
  buildPdfDisplayName,
};
