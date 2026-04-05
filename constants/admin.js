const APPROVAL_STATUSES = ['pendente', 'aprovado', 'reprovado', 'pendente_contato', 'documentacao_pendente', 'desistiu', 'remanejado'];
const PENDING_APPROVAL_STATUSES = ['pendente', 'pendente_contato', 'documentacao_pendente', 'remanejado'];
const LGPD_RETENTION_DAYS_DEFAULT = 730;

const ADMIN_ACCESS_LEVELS = ['super_admin', 'coordenador', 'operador', 'consulta'];
const ADMIN_PERMISSION_OPTIONS = [
  { key: 'painel.visualizar', label: 'Visualizar painel', description: 'Permite acessar o painel administrativo.' },
  { key: 'cadastros.visualizar', label: 'Visualizar cadastros', description: 'Permite ver listas de encontristas e encontreiros.' },
  { key: 'cadastros.editar', label: 'Editar cadastros', description: 'Permite editar, transferir e ajustar cadastros.' },
  { key: 'cadastros.aprovar', label: 'Aprovar cadastros', description: 'Permite aprovar/reprovar e alterar status.' },
  { key: 'cadastros.excluir', label: 'Excluir cadastros', description: 'Permite deletar cadastros e limpezas em lote.' },
  { key: 'encontros.gerenciar', label: 'Gerenciar encontros', description: 'Permite criar/deletar encontro, círculos e vínculos.' },
  { key: 'equipes.gerenciar', label: 'Gerenciar equipes', description: 'Permite criar/editar/excluir equipes e vincular pessoas.' },
  { key: 'importacao.executar', label: 'Importar dados', description: 'Permite executar importação de cadastros externos.' },
  { key: 'bloqueio.gerenciar', label: 'Gerenciar bloqueios', description: 'Permite configurar bloqueio dos formulários.' },
  { key: 'lgpd.executar', label: 'Executar LGPD', description: 'Permite rodar anonimização/retencão LGPD.' },
  { key: 'admins.gerenciar', label: 'Gerenciar admins', description: 'Permite criar, editar e deletar administradores.' },
];
const ADMIN_PERMISSION_KEYS = ADMIN_PERMISSION_OPTIONS.map((item) => item.key);
const ADMIN_ROLE_DEFAULT_PERMISSIONS = {
  super_admin: [...ADMIN_PERMISSION_KEYS],
  coordenador: [
    'painel.visualizar',
    'cadastros.visualizar',
    'cadastros.editar',
    'cadastros.aprovar',
    'encontros.gerenciar',
    'equipes.gerenciar',
    'importacao.executar',
    'bloqueio.gerenciar',
    'lgpd.executar',
  ],
  operador: [
    'painel.visualizar',
    'cadastros.visualizar',
    'cadastros.editar',
    'cadastros.aprovar',
  ],
  consulta: [
    'painel.visualizar',
    'cadastros.visualizar',
  ],
};
const ADMIN_LEVEL_RANK = {
  consulta: 1,
  operador: 2,
  coordenador: 3,
  super_admin: 4,
};

module.exports = {
  APPROVAL_STATUSES,
  PENDING_APPROVAL_STATUSES,
  LGPD_RETENTION_DAYS_DEFAULT,
  ADMIN_ACCESS_LEVELS,
  ADMIN_PERMISSION_OPTIONS,
  ADMIN_PERMISSION_KEYS,
  ADMIN_ROLE_DEFAULT_PERMISSIONS,
  ADMIN_LEVEL_RANK,
};
