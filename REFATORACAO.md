# Refatoração do Sistema EJC — Modularização do `app.js`

## Problema

O arquivo `app.js` possuía **~7.450 linhas** com toda a aplicação em um único arquivo:
- 9 modelos de banco de dados (Mongoose schemas)
- 65+ rotas (públicas, exportação, admin, debug)
- 40+ funções auxiliares (normalização, formatação, validação)
- ~2.000 linhas de geração de PDF/Excel
- Lógica de importação de dados (~500 linhas)
- Middlewares customizados (auth, CSRF, rate limit, upload)
- Configuração de banco, sessão e ambiente
- Constantes de permissão/acesso admin
- Job agendado de LGPD

Isso tornava o código difícil de navegar, testar e manter.

---

## Estrutura Após Refatoração

```
app.js                              ← ~80 linhas (bootstrap, middleware global, mount de rotas)
│
├── config/
│   ├── database.js                 ← Conexão MongoDB, reconnect, cache de encontro ativo
│   ├── session.js                  ← express-session + MongoStore
│   └── environment.js              ← Validação de variáveis de ambiente, constantes globais
│
├── constants/
│   └── admin.js                    ← Níveis de acesso, permissões, defaults por role, ranking
│
├── models/
│   ├── Cadastro.js                 ← Schema + Model do Encontrista
│   ├── Encontro.js                 ← Schema + Model do Encontreiro/Tios
│   ├── Admin.js                    ← Schema + Model de Admin
│   ├── AdminAuditLog.js            ← Schema de auditoria
│   ├── Ejc.js                      ← Schema de Encontros (eventos)
│   ├── Equipe.js                   ← Schema de Equipes
│   ├── Circulo.js                  ← Schema de Círculos
│   ├── VinculoEncontro.js          ← Schema de vínculos pessoa↔estrutura
│   └── Subscription.js             ← Schema de push notifications
│
├── utils/
│   ├── normalization.js            ← normalizeTextInput, parseDateInput, normalizePhone, etc.
│   ├── formatters.js               ← formatDateBR, formatExportValue, truncateText
│   ├── validation.js               ← findExistingByNameOrEmail, parsePositiveInt, escapeRegExp
│   └── security.js                 ← getClientIp, isSafeFilePath
│
├── middleware/
│   ├── auth.js                     ← checkAdminAuth, buildAdminSessionData
│   ├── permissions.js              ← requireAdminPermission, canManageAdminWithHierarchy
│   ├── csrf.js                     ← ensureAdminCsrfToken, adminCsrfGuard
│   ├── rateLimiter.js              ← adminLoginLimiter, adminWriteLimiter
│   ├── upload.js                   ← Configuração multer (foto + import)
│   └── formBlock.js                ← Bloqueio de formulários encontrista/encontreiro
│
├── services/
│   ├── pdfExport.js                ← Geração de PDFs (cards, quadrante, estruturas)
│   ├── excelExport.js              ← Geração de planilhas Excel com dashboard
│   ├── importService.js            ← Importação multi-fonte (Excel, PDF, banco externo)
│   ├── lgpdService.js              ← Anonimização, retenção, job agendado
│   ├── tiosService.js              ← Link/unlink de casais, grupo de tios
│   └── auditService.js             ← logAdminAction
│
├── routes/
│   ├── public.js                   ← GET /, /inscricao, /encontro, /healthz, /readyz, etc.
│   ├── export.js                   ← /export-*, CSV, PDF, ZIP, Excel
│   ├── api.js                      ← /api/encontro-ativo, /api/tios-disponiveis
│   └── admin/
│       ├── auth.js                 ← login, logout
│       ├── dashboard.js            ← dashboard, gerenciar-cadastros, evento-scope
│       ├── registrations.js        ← aprovar, desaprovar, atualizar, deletar, transferir
│       ├── structures.js           ← EJCs, círculos, equipes, vínculos, quadrante
│       ├── users.js                ← cadastrar/atualizar/deletar admin
│       └── import.js               ← importar-cadastros
└
```

---

## O que mudou

### 1. `config/` — Configuração centralizada
- **database.js**: Conexão MongoDB com fallback, auto-reconnect, cache de encontro ativo
- **session.js**: Configuração do express-session com MongoStore
- **environment.js**: Validação de variáveis de ambiente, constantes globais (VAPID, etc.)

### 2. `constants/admin.js` — Constantes de admin
- Níveis de acesso (`super_admin`, `coordenador`, `operador`, `consulta`)
- Opções de permissão (11 tipos)
- Permissões padrão por role
- Ranking de hierarquia

### 3. `models/` — Schemas Mongoose separados
Cada model em seu próprio arquivo, exportando o model Mongoose pronto para uso.

### 4. `utils/` — Funções utilitárias
- **normalization.js**: `normalizeTextInput`, `parseDateInput`, `normalizeBooleanInput`, `normalizePhoneDigits`, `normalizeApprovalStatusInput`, `normalizeStringArrayInput`, `normalizeTipoEncontro`, `normalizeGeneroEncontro`, `normalizeAdminAccessLevel`, `sanitizeAdminPermissions`, `resolveAdminPermissions`, `resolveApprovalStatus`, `normalizeMultiField`, `normalizeAdminEventScopeInput`, `mapToEncontroPayload`, `extractPdfField`
- **formatters.js**: `formatDateBR`, `formatExportValue`, `truncateText`, `buildPdfDisplayName`
- **validation.js**: `findExistingByNameOrEmail`, `parsePositiveInt`, `escapeRegExp`
- **security.js**: `getClientIp`, `isSafeFilePath`

### 5. `middleware/` — Middlewares extraídos
- **auth.js**: `checkAdminAuth` com carregamento de permissões
- **permissions.js**: `requireAdminPermission`, `denyAdminPermission`, `canManageAdminWithHierarchy`
- **csrf.js**: Proteção CSRF para rotas admin
- **rateLimiter.js**: Rate limiting para login e operações de escrita
- **upload.js**: Configuração do multer para fotos e importação
- **formBlock.js**: Verificação de bloqueio de formulários

### 6. `services/` — Lógica de negócio extraída
- **pdfExport.js**: Toda a geração de PDF (cards, grids, estruturas, quadrante)
- **excelExport.js**: Geração de planilhas Excel com dashboard analítico
- **importService.js**: Importação de dados de Excel, PDF e banco externo
- **lgpdService.js**: Execução de anonimização LGPD e job agendado
- **tiosService.js**: Vinculação/desvinculação de casais de tios
- **auditService.js**: Registro de ações de admin para auditoria

### 7. `routes/` — Rotas organizadas por domínio
- **public.js**: Home, inscrição, encontro, health checks
- **export.js**: Todas as exportações (CSV, PDF, ZIP, Excel)
- **api.js**: Endpoints JSON públicos
- **admin/auth.js**: Login e logout
- **admin/dashboard.js**: Dashboard, gerenciar cadastros, escopo de evento
- **admin/registrations.js**: CRUD de cadastros, aprovação, transferência
- **admin/structures.js**: EJCs, círculos, equipes, vínculos, exportação de estruturas
- **admin/users.js**: Gestão de administradores
- **admin/import.js**: Importação de dados

### 8. `app.js` — Entrypoint enxuto
Agora contém apenas:
- Imports do express e módulos de config
- Middleware global (compression, helmet, static, session, CSRF, rate limit)
- Montagem das rotas via `app.use()`
- Startup e graceful shutdown

---

## Princípios seguidos

1. **Zero mudança de comportamento** — Apenas movemos código, sem alterar lógica
2. **Exports claros** — Cada módulo exporta apenas o necessário
3. **Dependência unidirecional** — routes → services → models/utils (nunca ao contrário)
4. **Nomes consistentes** — Arquivos nomeados conforme seu domínio

## Como validar

```bash
npm test
```

Os testes existentes (`tests/health.test.js`, `tests/admin-api.test.js`) devem continuar passando, pois o `app` exportado por `app.js` mantém a mesma interface.
