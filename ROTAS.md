# Documentação de Rotas - Sistema EJC

Este documento lista todas as rotas disponíveis no sistema de gestão do EJC.

## 📋 Índice

- [Rotas Públicas](#rotas-públicas)
- [Rotas de API Pública](#rotas-de-api-pública)
- [Rotas de Health Check](#rotas-de-health-check)
- [Rotas de Exportação Pública](#rotas-de-exportação-pública)
- [Rotas de Admin - Autenticação](#rotas-de-admin---autenticação)
- [Rotas de Admin - Dashboard](#rotas-de-admin---dashboard)
- [Rotas de Admin - Gestão de Cadastros](#rotas-de-admin---gestão-de-cadastros)
- [Rotas de Admin - Gestão de EJC](#rotas-de-admin---gestão-de-ejc)
- [Rotas de Admin - Gestão de Círculos](#rotas-de-admin---gestão-de-círculos)
- [Rotas de Admin - Gestão de Equipes](#rotas-de-admin---gestão-de-equipes)
- [Rotas de Admin - Vínculos](#rotas-de-admin---vínculos)
- [Rotas de Admin - Exportações](#rotas-de-admin---exportações)
- [Rotas de Admin - Importação](#rotas-de-admin---importação)
- [Rotas de Admin - Configurações](#rotas-de-admin---configurações)
- [Rotas de Debug](#rotas-de-debug)

---

## Rotas Públicas

### `GET /`
- **Descrição**: Página inicial do sistema (escolha de tipo de inscrição)
- **Autenticação**: Não requerida
- **View**: `index.ejs`

### `GET /index`
- **Descrição**: Página inicial (alias)
- **Autenticação**: Não requerida
- **View**: `index.ejs`

### `GET /manifest.json`
- **Descrição**: Manifesto PWA
- **Autenticação**: Não requerida
- **Cache**: 24 horas

### `GET /sw.js`
- **Descrição**: Service Worker para PWA
- **Autenticação**: Não requerida
- **Cache**: No cache

### `GET /inscricao`
- **Descrição**: Formulário de inscrição para encontristas
- **Autenticação**: Não requerida
- **View**: `inscricao.ejs`
- **Verifica**: Bloqueio de formulário e EJC ativo

### `POST /inscricao`
- **Descrição**: Submissão de inscrição para encontrista
- **Autenticação**: Não requerida
- **Método**: POST
- **Validação**: Express-validator
- **Upload**: Foto (single file)
- **Campos obrigatórios**: 
  - nomeCompleto, logradouro, cep, estadoCivil
  - nomeMae, telefoneMae, nomePai, telefonePai
  - paroquiaFrequenta, participaMovimentoIgreja
  - conhecidoInscricaoHoje, conhecidoFezEjc
  - inscricaoAnterior, instrumentoMusical
  - expectativaXixEjcCop, bairro, dataNascimento
  - telefone, lgpdConsentimento

### `GET /encontro`
- **Descrição**: Formulário de inscrição para encontreiros
- **Autenticação**: Não requerida
- **Query Params**: `convite` (token de convite opcional)
- **View**: `encontro.ejs`
- **Verifica**: Bloqueio de formulário, token de convite e EJC ativo

### `POST /encontro`
- **Descrição**: Submissão de inscrição para encontreiro
- **Autenticação**: Não requerida
- **Método**: POST
- **Validação**: Express-validator
- **Upload**: Foto (single file)
- **Campos obrigatórios**:
  - nomeCompleto, genero, tipo, ejc
  - logradouro, bairro, dataNascimento
  - telefone, email, lgpdConsentimento

### `GET /img/:bucket/:file`
- **Descrição**: Servidor de imagens com otimização automática
- **Autenticação**: Não requerida
- **Parâmetros**: 
  - `bucket`: uploads ou images
  - `file`: nome do arquivo
- **Query Params**:
  - `w`: largura (padrão: 120, min: 16, max: 2400)
  - `h`: altura (padrão: 120, min: 16, max: 2400)
  - `q`: qualidade (padrão: 72, min: 30, max: 95)
  - `fit`: cover, contain, fill, inside, outside
  - `format`: webp (default se suportado)
- **Cache**: 30 dias

---

## Rotas de API Pública

### `GET /api/tios-disponiveis`
- **Descrição**: Lista todos os tios disponíveis para formação de casais
- **Autenticação**: Não requerida
- **Query Params**: `ignoreId` (ID para ignorar na listagem)
- **Retorno**: JSON com lista de tios

### `GET /api/encontro-ativo`
- **Descrição**: Retorna informações do EJC ativo no momento
- **Autenticação**: Não requerida
- **Retorno**: JSON com `ejcId` e `ejcNome`

### `GET /vapidPublicKey`
- **Descrição**: Retorna chave pública VAPID para push notifications
- **Autenticação**: Não requerida
- **Retorno**: String com chave pública

### `POST /subscribe`
- **Descrição**: Registra subscription de push notification
- **Autenticação**: Não requerida
- **Método**: POST
- **Content-Type**: application/json
- **Body**: Objeto de subscription

---

## Rotas de Health Check

### `GET /healthz`
- **Descrição**: Verificação de saúde básica do servidor
- **Autenticação**: Não requerida
- **Retorno**: JSON com status, uptime e timestamp

### `GET /readyz`
- **Descrição**: Verificação de prontidão do servidor (inclui MongoDB)
- **Autenticação**: Não requerida
- **Retorno**: JSON com status e estado do MongoDB

---

## Rotas de Exportação Pública

### `GET /export`
- **Descrição**: Exporta todos os cadastros de encontristas
- **Autenticação**: Não requerida
- **Query Params**: `format` (csv ou pdf)
- **Retorno**: Arquivo CSV ou PDF

### `GET /export-encontro`
- **Descrição**: Exporta todos os cadastros de encontreiros
- **Autenticação**: Não requerida
- **Query Params**: `format` (csv ou pdf)
- **Retorno**: Arquivo CSV ou PDF

### `GET /export-tios`
- **Descrição**: Exporta apenas cadastros de tios
- **Autenticação**: Não requerida
- **Query Params**: `format` (pdf)
- **Retorno**: Arquivo PDF

### `GET /export-images`
- **Descrição**: Exporta todas as imagens em arquivo ZIP
- **Autenticação**: Não requerida
- **Retorno**: Arquivo ZIP

### `GET /export-images-encontristas`
- **Descrição**: Exporta apenas imagens de encontristas
- **Autenticação**: Não requerida
- **Retorno**: Arquivo ZIP

### `GET /export-images-encontreiros`
- **Descrição**: Exporta apenas imagens de encontreiros
- **Autenticação**: Não requerida
- **Retorno**: Arquivo ZIP

### `GET /export-images-tios`
- **Descrição**: Exporta apenas imagens de tios
- **Autenticação**: Não requerida
- **Retorno**: Arquivo ZIP

### `GET /export-encontro-relatorio`
- **Descrição**: Exporta relatório detalhado de encontro em PDF
- **Autenticação**: Não requerida
- **Retorno**: Arquivo PDF

### `GET /export-encontro-excel`
- **Descrição**: Exporta dados de encontro em Excel
- **Autenticação**: Não requerida
- **Retorno**: Arquivo XLSX

### `GET /export-encontrista-excel`
- **Descrição**: Exporta dados de encontristas em Excel
- **Autenticação**: Não requerida
- **Retorno**: Arquivo XLSX

---

## Rotas de Admin - Autenticação

### `GET /admin/login`
- **Descrição**: Exibe formulário de login administrativo
- **Autenticação**: Não requerida
- **View**: `admin-login.ejs`
- **Redireciona**: Se já autenticado, vai para `/admin/gerenciar-cadastros`

### `POST /admin/login`
- **Descrição**: Processa login de administrador
- **Autenticação**: Não requerida
- **Método**: POST
- **Rate Limit**: 8 tentativas a cada 15 minutos
- **Campos**: username, senha
- **Redireciona**: Para `/admin/gerenciar-cadastros` em sucesso

### `GET /admin/logout`
- **Descrição**: Faz logout e destrói sessão
- **Autenticação**: Não requerida
- **Redireciona**: Para `/`

---

## Rotas de Admin - Dashboard

### `GET /admin/home`
- **Descrição**: Redireciona para gerenciar cadastros
- **Autenticação**: Requerida
- **Permissão**: `painel.visualizar`
- **Redireciona**: Para `/admin/gerenciar-cadastros`

### `GET /admin/dashboard`
- **Descrição**: Painel administrativo principal com estatísticas
- **Autenticação**: Requerida
- **Permissão**: `painel.visualizar`
- **View**: `admin-dashboard.ejs`
- **Dados**: Contagens de pendentes, aprovados e reprovados

### `GET /admin/gerenciar-cadastros`
- **Descrição**: Página de gerenciamento de todos os cadastros
- **Autenticação**: Requerida
- **Permissão**: `painel.visualizar`
- **View**: `gerenciar-cadastros.ejs`

---

## Rotas de Admin - Gestão de Cadastros

### `POST /admin/aprovacao-lote`
- **Descrição**: Aprova ou reprova múltiplos cadastros de uma vez
- **Autenticação**: Requerida
- **Permissão**: `cadastros.aprovar`
- **Método**: POST
- **Body**: `{ tipoLista, action, ids[] }`
- **Retorno**: JSON com resultado da operação

### `POST /admin/aprovar`
- **Descrição**: Aprova um cadastro individual
- **Autenticação**: Requerida
- **Permissão**: `cadastros.aprovar`
- **Método**: POST
- **Retorno**: JSON com resultado

### `POST /admin/desaprovar`
- **Descrição**: Reprova um cadastro individual
- **Autenticação**: Requerida
- **Permissão**: `cadastros.aprovar`
- **Método**: POST
- **Retorno**: JSON com resultado

### `POST /admin/alterar-status`
- **Descrição**: Altera status de aprovação de um cadastro
- **Autenticação**: Requerida
- **Permissão**: `cadastros.aprovar`
- **Método**: POST
- **Retorno**: JSON com resultado

### `POST /admin/atualizar-cadastro/:tipo/:id`
- **Descrição**: Atualiza dados de um cadastro específico
- **Autenticação**: Requerida
- **Permissão**: `cadastros.editar`
- **Método**: POST
- **Parâmetros**: `:tipo` (encontrista/encontreiro), `:id` (ID do cadastro)
- **Upload**: Foto (opcional)
- **Retorno**: JSON com resultado

### `POST /admin/remover-foto/:tipo/:id`
- **Descrição**: Remove foto de um cadastro
- **Autenticação**: Requerida
- **Permissão**: `cadastros.editar`
- **Método**: POST
- **Parâmetros**: `:tipo`, `:id`
- **Retorno**: JSON com resultado

### `POST /admin/deletar-cadastro/:tipo/:id`
- **Descrição**: Exclui permanentemente um cadastro
- **Autenticação**: Requerida
- **Permissão**: `cadastros.excluir`
- **Método**: POST
- **Parâmetros**: `:tipo`, `:id`
- **Retorno**: JSON com resultado

### `POST /admin/transferir-encontrista/:id`
- **Descrição**: Transfere encontrista para outro EJC
- **Autenticação**: Requerida
- **Permissão**: `cadastros.editar`
- **Método**: POST
- **Parâmetros**: `:id`
- **Retorno**: JSON com resultado

### `POST /admin/transferir-encontristas-lote`
- **Descrição**: Transfere múltiplos encontristas para outro EJC
- **Autenticação**: Requerida
- **Permissão**: `cadastros.editar`
- **Método**: POST
- **Body**: `{ ids[], ejcDestinoId }`
- **Retorno**: JSON com resultado

### `POST /admin/limpar-encontreiros`
- **Descrição**: Remove todos os encontreiros (ação perigosa)
- **Autenticação**: Requerida
- **Permissão**: `cadastros.excluir`
- **Método**: POST
- **Retorno**: JSON com resultado

### `POST /admin/executar-retencao-lgpd`
- **Descrição**: Executa política de retenção de dados LGPD
- **Autenticação**: Requerida
- **Permissão**: `lgpd.executar`
- **Método**: POST
- **Retorno**: JSON com estatísticas de remoção

---

## Rotas de Admin - Gestão de Administradores

### `POST /admin/cadastrar-admin`
- **Descrição**: Cadastra novo administrador
- **Autenticação**: Requerida
- **Permissão**: `admins.gerenciar`
- **Método**: POST
- **Retorno**: JSON com resultado

### `POST /admin/atualizar-admin/:id`
- **Descrição**: Atualiza dados de administrador
- **Autenticação**: Requerida
- **Permissão**: `admins.gerenciar`
- **Método**: POST
- **Parâmetros**: `:id`
- **Retorno**: JSON com resultado

### `POST /admin/deletar-admin/:id`
- **Descrição**: Exclui administrador
- **Autenticação**: Requerida
- **Permissão**: `admins.gerenciar`
- **Método**: POST
- **Parâmetros**: `:id`
- **Retorno**: JSON com resultado

---

## Rotas de Admin - Gestão de EJC

### `POST /admin/criar-ejc`
- **Descrição**: Cria novo evento EJC
- **Autenticação**: Requerida
- **Permissão**: `encontros.gerenciar`
- **Método**: POST
- **Body**: `{ nome }`
- **Retorno**: JSON com resultado

### `POST /admin/definir-ejc-ativo/:id`
- **Descrição**: Define qual EJC está ativo no momento
- **Autenticação**: Requerida
- **Permissão**: `encontros.gerenciar`
- **Método**: POST
- **Parâmetros**: `:id`
- **Retorno**: JSON com resultado

### `POST /admin/deletar-ejc/:id`
- **Descrição**: Exclui EJC e todas estruturas vinculadas
- **Autenticação**: Requerida
- **Permissão**: `encontros.gerenciar`
- **Método**: POST
- **Parâmetros**: `:id`
- **Retorno**: JSON com resultado

### `GET /admin/encontros/:ejcId`
- **Descrição**: Tela de gestão de um EJC específico
- **Autenticação**: Requerida
- **Permissão**: `encontros.gerenciar`
- **Parâmetros**: `:ejcId`
- **View**: `admin-encontro-ejc.ejs`

### `POST /admin/evento-scope`
- **Descrição**: Define escopo de visualização de eventos (ativo ou todos)
- **Autenticação**: Requerida
- **Permissão**: `painel.visualizar`
- **Método**: POST
- **Body**: `{ scope }`
- **Retorno**: JSON com resultado

---

## Rotas de Admin - Gestão de Círculos

### `POST /admin/criar-circulo`
- **Descrição**: Cria novo círculo em um EJC
- **Autenticação**: Requerida
- **Permissão**: `encontros.gerenciar`
- **Método**: POST
- **Body**: `{ nome, ejcId }`
- **Retorno**: JSON com resultado

### `POST /admin/editar-circulo/:id`
- **Descrição**: Edita nome de círculo
- **Autenticação**: Requerida
- **Permissão**: `encontros.gerenciar`
- **Método**: POST
- **Parâmetros**: `:id`
- **Body**: `{ nome, ejcId }`
- **Retorno**: JSON com resultado

### `POST /admin/excluir-circulo/:id`
- **Descrição**: Exclui círculo e vínculos associados
- **Autenticação**: Requerida
- **Permissão**: `encontros.gerenciar`
- **Método**: POST
- **Parâmetros**: `:id`
- **Body**: `{ ejcId }`
- **Retorno**: JSON com resultado

---

## Rotas de Admin - Gestão de Equipes

### `POST /admin/cadastrar-equipe`
- **Descrição**: Cadastra nova equipe
- **Autenticação**: Requerida
- **Permissão**: `equipes.gerenciar`
- **Método**: POST
- **Body**: `{ nome, ejcId }`
- **Retorno**: JSON com resultado

### `POST /admin/editar-equipe/:id`
- **Descrição**: Edita nome de equipe
- **Autenticação**: Requerida
- **Permissão**: `equipes.gerenciar`
- **Método**: POST
- **Parâmetros**: `:id`
- **Body**: `{ nome, ejcId }`
- **Retorno**: JSON com resultado

### `POST /admin/excluir-equipe/:id`
- **Descrição**: Exclui equipe e vínculos associados
- **Autenticação**: Requerida
- **Permissão**: `equipes.gerenciar`
- **Método**: POST
- **Parâmetros**: `:id`
- **Body**: `{ ejcId }`
- **Retorno**: JSON com resultado

### `POST /admin/deletar-equipe/:id`
- **Descrição**: Deleta equipe e limpa referências
- **Autenticação**: Requerida
- **Permissão**: `equipes.gerenciar`
- **Método**: POST
- **Parâmetros**: `:id`
- **Retorno**: JSON com resultado

### `POST /admin/vincular-encontreiro-equipe`
- **Descrição**: Vincula encontreiro a uma equipe (serviu/coordenou)
- **Autenticação**: Requerida
- **Permissão**: `equipes.gerenciar`
- **Método**: POST
- **Body**: `{ encontreiroId, equipeId, papel }`
- **Retorno**: JSON com resultado

---

## Rotas de Admin - Vínculos

### `POST /admin/vincular-encontro`
- **Descrição**: Vincula pessoas a círculos ou equipes
- **Autenticação**: Requerida
- **Permissão**: `encontros.gerenciar`
- **Método**: POST
- **Body**: `{ ejcId, entidadeTipo, entidadeId, pessoaTipo, pessoaIds[], papel, descricaoPapel }`
- **Retorno**: JSON com contadores de vinculados

### `POST /admin/remover-vinculo/:id`
- **Descrição**: Remove vínculo de pessoa em círculo/equipe
- **Autenticação**: Requerida
- **Permissão**: `encontros.gerenciar`
- **Método**: POST
- **Parâmetros**: `:id`
- **Retorno**: JSON com resultado

---

## Rotas de Admin - Exportações

### `GET /admin/encontros/:ejcId/export/:entidadeTipo/:entidadeId/:formato`
- **Descrição**: Exporta vinculados de um círculo ou equipe
- **Autenticação**: Requerida
- **Permissão**: `encontros.gerenciar`
- **Parâmetros**: 
  - `:ejcId` - ID do EJC
  - `:entidadeTipo` - circulo ou equipe
  - `:entidadeId` - ID do círculo/equipe
  - `:formato` - excel ou pdf
- **Retorno**: Arquivo Excel ou PDF

### `GET /admin/encontros/:ejcId/quadrante/editor`
- **Descrição**: Editor de quadrante do EJC
- **Autenticação**: Requerida
- **Permissão**: `encontros.gerenciar`
- **Parâmetros**: `:ejcId`
- **View**: `admin-quadrante-editor.ejs`

### `GET /admin/encontros/:ejcId/export/quadrante/pdf`
- **Descrição**: Exporta quadrante completo do EJC em PDF
- **Autenticação**: Requerida
- **Permissão**: `encontros.gerenciar`
- **Parâmetros**: `:ejcId`
- **Retorno**: PDF com todos círculos e equipes

---

## Rotas de Admin - Importação

### `POST /admin/importar-cadastros`
- **Descrição**: Importa cadastros de encontreiros de diversas fontes
- **Autenticação**: Requerida
- **Permissão**: `importacao.executar`
- **Método**: POST
- **Body**: Depende do `sourceType`:
  - **database**: `{ sourceType, dbEngine, connectionString, databaseName, colecaoEncontreiros, limite }`
  - **excel**: `{ sourceType, arquivo (file upload) }`
  - **pdf**: `{ sourceType, arquivo (file upload), fotoPadrao }`
- **Upload**: Arquivo (se sourceType for excel ou pdf)
- **Retorno**: JSON com estatísticas de importação

---

## Rotas de Admin - Configurações

### `GET /admin/config-bloqueio`
- **Descrição**: Página de configuração de bloqueio de formulários
- **Autenticação**: Requerida
- **Permissão**: `bloqueio.gerenciar`
- **Retorno**: JSON com configurações

### `POST /admin/atualizar-config-bloqueio`
- **Descrição**: Atualiza configurações de bloqueio
- **Autenticação**: Requerida
- **Permissão**: `bloqueio.gerenciar`
- **Método**: POST
- **Retorno**: JSON com resultado

### `POST /admin/gerar-link-encontreiro`
- **Descrição**: Gera link de convite para encontreiros
- **Autenticação**: Requerida
- **Permissão**: `cadastros.visualizar`
- **Método**: POST
- **Retorno**: JSON com token e URL

### `POST /admin/revogar-link-encontreiro`
- **Descrição**: Revoga link de convite ativo
- **Autenticação**: Requerida
- **Permissão**: `cadastros.visualizar`
- **Método**: POST
- **Retorno**: JSON com resultado

---

## Rotas de Debug

### `GET /debug/encontreiros`
- **Descrição**: Endpoint para debug de encontreiros
- **Autenticação**: Requerida (admin)
- **Retorno**: JSON com estatísticas e amostra

### `GET /debug/status-bloqueio`
- **Descrição**: Verifica status de bloqueio atual
- **Autenticação**: Não requerida
- **Retorno**: JSON com status de bloqueio

### `POST /debug/testar-bloqueio`
- **Descrição**: Testa sistema de bloqueio
- **Autenticação**: Não requerida
- **Método**: POST
- **Retorno**: JSON com resultado

### `POST /debug/ativar-bloqueio`
- **Descrição**: Ativa bloqueio via debug
- **Autenticação**: Não requerida
- **Método**: POST
- **Retorno**: JSON com resultado

---

## 🔧 Middlewares e Validações

### Middlewares de Autenticação
- `checkAdminAuth`: Verifica se usuário está autenticado como admin
- `requireAdminPermission(permissao)`: Verifica permissão específica do admin

### Middlewares de Validação
- `middlewareVerificaBloqueoEncontrista`: Verifica bloqueio do formulário de encontrista
- `middlewareVerificaBloqueoEncontreiro`: Verifica bloqueio do formulário de encontreiro

### Rate Limiters
- `adminLoginLimiter`: 8 tentativas a cada 15 minutos
- `adminWriteLimiter`: 260 operações de escrita a cada 15 minutos

### CSRF Protection
- `ensureAdminCsrfToken`: Garante token CSRF na sessão
- `adminCsrfGuard`: Valida token CSRF em requisições admin

---

## 📊 Códigos de Status HTTP

| Código | Significado |
|--------|-------------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Requisição inválida |
| 403 | Proibido / Sem permissão |
| 404 | Recurso não encontrado |
| 409 | Conflito (ex: duplicado) |
| 429 | Muitas requisições (rate limit) |
| 500 | Erro interno do servidor |
| 503 | Serviço indisponível |

---

## 🔐 Permissões do Sistema

- `painel.visualizar`: Visualizar painel administrativo
- `cadastros.visualizar`: Visualizar cadastros
- `cadastros.aprovar`: Aprovar/reprovar cadastros
- `cadastros.editar`: Editar cadastros
- `cadastros.excluir`: Excluir cadastros
- `encontros.gerenciar`: Gerenciar EJCs, círculos e equipes
- `equipes.gerenciar`: Gerenciar equipes
- `bloqueio.gerenciar`: Gerenciar bloqueios de formulários
- `admins.gerenciar`: Gerenciar administradores
- `importacao.executar`: Executar importações
- `lgpd.executar`: Executar políticas LGPD

---

## 📝 Notas Importantes

1. Todas as rotas de admin (exceto login/logout) requerem autenticação
2. O sistema implementa CSRF protection para rotas admin
3. Upload de imagens é processado com Sharp para otimização
4. Suporte a WebP automático baseado no header Accept
5. Cache headers configurados para arquivos estáticos
6. Sistema de vínculo relaciona pessoas (encontristas/encontreiros) com círculos/equipes
7. Importação suporta MongoDB, PostgreSQL, MySQL, Excel e PDF
8. Exportações disponíveis em CSV, Excel e PDF
9. Sistema de bloqueio pode desabilitar formulários temporariamente
10. Link de convite permite bypass do bloqueio de formulário

---

**Última atualização**: 28/03/2026
**Versão do Sistema**: 1.0.0
