const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// --- Local constants (mirrored from app.js until fully extracted) ---

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

module.exports = (deps) => {
  const {
    mongoose,
    Cadastro,
    Encontro,
    Admin,
    AdminAuditLog,
    Ejc,
    Equipe,
    getEncontroAtivo,
    invalidarCacheEncontroAtivo,
    checkAdminAuth,
    requireAdminPermission,
    upload,
    verificarFormularioBloqueado,
    normalizeTextInput,
    normalizeBooleanInput,
    normalizeApprovalStatusInput,
    resolveApprovalStatus,
    normalizePhoneDigits,
    normalizeStringArrayInput,
    normalizeMultiField,
    normalizeTipoEncontro,
    normalizeGeneroEncontro,
    parseDateInput,
    normalizeAdminEventScopeInput,
    parsePositiveInt,
    logAdminAction,
    clearTiosCoupleLink,
    linkTiosCouple,
    createTiosGroupId,
    executeLgpdRetention,
    PENDING_APPROVAL_STATUSES,
    APPROVAL_STATUSES,
    body,
    validationResult,
  } = deps;

  // --- Local helper functions ---

  const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

  const buildEventScopeFilter = (encontroAtivo) => {
    if (!encontroAtivo?._id || !encontroAtivo?.nome) return {};

    return {
      $or: [
        { ejcVinculadoId: encontroAtivo._id },
        { ejcVinculadoNome: encontroAtivo.nome },
        {
          $and: [
            { ejc: encontroAtivo.nome },
            {
              $or: [
                { ejcVinculadoId: { $exists: false } },
                { ejcVinculadoId: null },
              ],
            },
            {
              $or: [
                { ejcVinculadoNome: { $exists: false } },
                { ejcVinculadoNome: '' },
                { ejcVinculadoNome: null },
              ],
            },
          ],
        },
      ],
    };
  };

  const resolveAdminEventContext = async (req) => {
    const encontroAtivo = await getEncontroAtivo();
    const scope = normalizeAdminEventScopeInput(req.session?.adminEventScope || 'ativo');

    if (scope === 'todos' || !encontroAtivo?.nome) {
      return {
        scope,
        encontroAtivo,
        filtro: {},
        encontroNome: '',
      };
    }

    return {
      scope,
      encontroAtivo,
      filtro: buildEventScopeFilter(encontroAtivo),
      encontroNome: encontroAtivo.nome,
    };
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

  function normalizeApprovalTargetType(rawValue) {
    const tipoListaRaw = String(rawValue || '').trim().toLowerCase();
    if (tipoListaRaw === 'encontrista') return 'encontrista';
    if (['encontreiro', 'encontro', 'tios', 'casal'].includes(tipoListaRaw)) return 'encontreiro';
    return '';
  }

  function getApprovalUpdatePayload(action) {
    if (action === 'aprovar') {
      return {
        update: { aprovado: true, statusAprovacao: 'aprovado' },
        logAction: 'aprovar_cadastro',
        successMessage: 'Aprovado com sucesso!',
        pastTenseLabel: 'Aprovado',
      };
    }

    if (action === 'desaprovar') {
      return {
        update: { aprovado: false, statusAprovacao: 'reprovado' },
        logAction: 'reprovar_cadastro',
        successMessage: 'Desaprovado com sucesso!',
        pastTenseLabel: 'Desaprovado',
      };
    }

    return null;
  }

  async function applyApprovalUpdateToMany({ ids, tipoLista, action, baseFilter = {} }) {
    const config = getApprovalUpdatePayload(action);

    if (!config) {
      return {
        success: false,
        statusCode: 400,
        error: 'Ação inválida',
      };
    }

    const uniqueIds = [...new Set((Array.isArray(ids) ? ids : [ids])
      .map((item) => String(item || '').trim())
      .filter(Boolean))];

    if (uniqueIds.length === 0) {
      return {
        success: false,
        statusCode: 400,
        error: 'Nenhum cadastro selecionado',
      };
    }

    const invalidIds = uniqueIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return {
        success: false,
        statusCode: 400,
        error: 'Há IDs inválidos na seleção',
        invalidIds,
      };
    }

    const Model = tipoLista === 'encontrista' ? Cadastro : Encontro;
    const documentos = await Model.find({ ...baseFilter, _id: { $in: uniqueIds } }).select('_id nomeCompleto').lean();
    const encontrados = documentos.map((doc) => String(doc._id));
    const missingIds = uniqueIds.filter((id) => !encontrados.includes(id));

    if (documentos.length === 0) {
      return {
        success: false,
        statusCode: 404,
        error: 'Nenhum cadastro encontrado para atualizar',
        missingIds,
      };
    }

    await Model.updateMany(
      { ...baseFilter, _id: { $in: encontrados } },
      { $set: config.update }
    );

    return {
      success: true,
      updatedCount: encontrados.length,
      missingCount: missingIds.length,
      missingIds,
      nomes: documentos.map((doc) => doc.nomeCompleto).filter(Boolean),
      config,
    };
  }

  // --- Routes ---

  // POST /aprovacao-lote
  router.post('/aprovacao-lote', checkAdminAuth, requireAdminPermission('cadastros.aprovar'), async (req, res) => {
    const tipoListaRaw = req.body.tipoLista || req.body.tipo;
    const tipoLista = normalizeApprovalTargetType(tipoListaRaw);
    const action = String(req.body.action || req.body.acao || '').trim().toLowerCase();
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    const config = getApprovalUpdatePayload(action);

    try {
      const eventContext = await resolveAdminEventContext(req);

      if (!tipoLista) {
        return res.status(400).json({ success: false, error: 'Tipo inválido para atualização em lote' });
      }

      if (!config) {
        return res.status(400).json({ success: false, error: 'Ação inválida para atualização em lote' });
      }

      const result = await applyApprovalUpdateToMany({ ids, tipoLista, action, baseFilter: eventContext.filtro });

      if (!result.success) {
        await logAdminAction(req, {
          action: `${config.logAction}_lote`,
          targetType: tipoLista,
          status: 'error',
          metadata: {
            erro: result.error,
            totalRecebido: ids.length,
            invalidIds: result.invalidIds,
            missingIds: result.missingIds,
          },
        });

        return res.status(result.statusCode || 400).json({
          success: false,
          error: result.error,
          invalidIds: result.invalidIds,
          missingIds: result.missingIds,
        });
      }

      await logAdminAction(req, {
        action: `${config.logAction}_lote`,
        targetType: tipoLista,
        metadata: {
          totalAtualizado: result.updatedCount,
          totalNaoEncontrado: result.missingCount,
          ids: ids,
          nomes: result.nomes,
        },
      });

      return res.json({
        success: true,
        message: `${result.updatedCount} cadastro(s) atualizado(s) com sucesso!`,
        updatedCount: result.updatedCount,
        missingCount: result.missingCount,
        missingIds: result.missingIds,
      });
    } catch (err) {
      await logAdminAction(req, {
        action: `${config ? config.logAction : 'atualizar_cadastro'}_lote`,
        targetType: normalizeTextInput(tipoListaRaw),
        status: 'error',
        metadata: {
          erro: err.message,
          totalRecebido: ids.length,
        },
      });
      console.error('[ERRO] Erro na atualização em lote:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /aprovar - Aprovar um cadastro
  router.post('/aprovar', checkAdminAuth, requireAdminPermission('cadastros.aprovar'), async (req, res) => {
    try {
      const eventContext = await resolveAdminEventContext(req);
      const id = String(req.body.id || '').trim();
      const tipoListaRaw = String(req.body.tipoLista || req.body.tipo || '').trim().toLowerCase();
      const tipoLista = normalizeApprovalTargetType(tipoListaRaw);

      console.log(`[INFO] Aprovação: ${id} - tipo=${tipoLista}`);

      if (!id || !tipoLista) {
        await logAdminAction(req, {
          action: 'aprovar_cadastro',
          targetType: tipoListaRaw || 'desconhecido',
          targetId: id,
          status: 'error',
          metadata: { motivo: 'id_ou_tipo_invalido' },
        });
        console.error('[ERRO] ID ou tipo inválidos');
        return res.status(400).json({ success: false, error: 'ID e tipo obrigatórios' });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.error('[ERRO] ID ObjectId inválido');
        return res.status(400).json({ success: false, error: 'ID inválido' });
      }

      const Model = tipoLista === 'encontrista' ? Cadastro : Encontro;
      const exists = await Model.findOne({ ...eventContext.filtro, _id: id });
      
      if (!exists) {
        console.error('[ERRO] Cadastro não encontrado');
        return res.status(404).json({ success: false, error: 'Cadastro não encontrado' });
      }

      const result = await Model.findOneAndUpdate(
        { ...eventContext.filtro, _id: id },
        { aprovado: true, statusAprovacao: 'aprovado' },
        { new: true }
      );

      if (!result) {
        console.error('[ERRO] Erro ao atualizar');
        return res.status(500).json({ success: false, error: 'Erro ao atualizar' });
      }

      console.log(`[INFO] Aprovado: ${result.nomeCompleto}`);
      await logAdminAction(req, {
        action: 'aprovar_cadastro',
        targetType: tipoLista,
        targetId: id,
        metadata: { nomeCompleto: result.nomeCompleto },
      });
      return res.json({ success: true, message: 'Aprovado com sucesso!' });
    } catch (err) {
      await logAdminAction(req, {
        action: 'aprovar_cadastro',
        targetType: normalizeTextInput(req.body.tipoLista || req.body.tipo),
        targetId: normalizeTextInput(req.body.id),
        status: 'error',
        metadata: { erro: err.message },
      });
      console.error('[ERRO] Erro:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /desaprovar - Desaprovar um cadastro
  router.post('/desaprovar', checkAdminAuth, requireAdminPermission('cadastros.aprovar'), async (req, res) => {
    try {
      const eventContext = await resolveAdminEventContext(req);
      const id = String(req.body.id || '').trim();
      const tipoListaRaw = String(req.body.tipoLista || req.body.tipo || '').trim().toLowerCase();
      const tipoLista = normalizeApprovalTargetType(tipoListaRaw);

      console.log(`[INFO] Desaprovação: ${id} - tipo=${tipoLista}`);

      if (!id || !tipoLista) {
        await logAdminAction(req, {
          action: 'reprovar_cadastro',
          targetType: tipoListaRaw || 'desconhecido',
          targetId: id,
          status: 'error',
          metadata: { motivo: 'id_ou_tipo_invalido' },
        });
        console.error('[ERRO] ID ou tipo inválidos');
        return res.status(400).json({ success: false, error: 'ID e tipo obrigatórios' });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.error('[ERRO] ID ObjectId inválido');
        return res.status(400).json({ success: false, error: 'ID inválido' });
      }

      const Model = tipoLista === 'encontrista' ? Cadastro : Encontro;
      const result = await Model.findOneAndUpdate(
        { ...eventContext.filtro, _id: id },
        { aprovado: false, statusAprovacao: 'reprovado' },
        { new: true }
      );

      if (!result) {
        console.error('[ERRO] Cadastro não encontrado');
        return res.status(404).json({ success: false, error: 'Cadastro não encontrado' });
      }

      console.log(`[INFO] Desaprovado: ${result.nomeCompleto}`);
      await logAdminAction(req, {
        action: 'reprovar_cadastro',
        targetType: tipoLista,
        targetId: id,
        metadata: { nomeCompleto: result.nomeCompleto },
      });
      return res.json({ success: true, message: 'Desaprovado com sucesso!' });
    } catch (err) {
      await logAdminAction(req, {
        action: 'reprovar_cadastro',
        targetType: normalizeTextInput(req.body.tipoLista || req.body.tipo),
        targetId: normalizeTextInput(req.body.id),
        status: 'error',
        metadata: { erro: err.message },
      });
      console.error('[ERRO] Erro:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /alterar-status
  router.post('/alterar-status', checkAdminAuth, requireAdminPermission('cadastros.aprovar'), async (req, res) => {
    try {
      const eventContext = await resolveAdminEventContext(req);
      const id = normalizeTextInput(req.body.id);
      const tipoListaRaw = normalizeTextInput(req.body.tipoLista || req.body.tipo).toLowerCase();
      const statusAprovacao = normalizeApprovalStatusInput(req.body.statusAprovacao);

      const tipoLista = tipoListaRaw === 'encontrista' ? 'encontrista' :
        (['encontreiro', 'encontro', 'tios', 'casal'].includes(tipoListaRaw) ? 'encontreiro' : '');

      if (!id || !tipoLista || !statusAprovacao) {
        return res.status(400).json({ success: false, error: 'ID, tipo e status são obrigatórios.' });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, error: 'ID inválido.' });
      }

      const Model = tipoLista === 'encontrista' ? Cadastro : Encontro;
      const result = await Model.findOneAndUpdate(
        { ...eventContext.filtro, _id: id },
        { aprovado: statusAprovacao === 'aprovado', statusAprovacao },
        { new: true }
      );

      if (!result) {
        return res.status(404).json({ success: false, error: 'Cadastro não encontrado.' });
      }

      await logAdminAction(req, {
        action: 'alterar_status_cadastro',
        targetType: tipoLista,
        targetId: id,
        metadata: { statusAprovacao, nomeCompleto: result.nomeCompleto },
      });

      return res.json({ success: true, message: 'Status atualizado com sucesso.' });
    } catch (err) {
      await logAdminAction(req, {
        action: 'alterar_status_cadastro',
        targetType: normalizeTextInput(req.body.tipoLista || req.body.tipo),
        targetId: normalizeTextInput(req.body.id),
        status: 'error',
        metadata: { erro: err.message },
      });
      return res.status(500).json({ success: false, error: 'Erro ao atualizar status.' });
    }
  });

  // GET /gerenciar-cadastros - Página de gestão de cadastros
  router.get('/gerenciar-cadastros', checkAdminAuth, requireAdminPermission('painel.visualizar'), async (req, res) => {
    try {
      const eventContext = await resolveAdminEventContext(req);
      const baseFilter = eventContext.filtro;

      const encontristas = await Cadastro.find(baseFilter).sort({ dataCadastro: -1 }).lean();
      const encontreirosRaw = await Encontro.find(baseFilter).sort({ dataCadastro: -1 }).lean();
      const gruposTios = new Map();

      encontreirosRaw.forEach((item) => {
        if (item.tipo !== 'tios') return;
        const grupo = normalizeTextInput(item.tiosGrupoId);
        if (!grupo) return;
        gruposTios.set(grupo, (gruposTios.get(grupo) || 0) + 1);
      });

      const encontreiros = encontreirosRaw.map((item) => {
        if (item.tipo !== 'tios') return item;

        const grupo = normalizeTextInput(item.tiosGrupoId);
        const categoriaPersistida = normalizeTextInput(item.tiosCategoria).toLowerCase();
        const eCasalPorGrupo = !!grupo && (gruposTios.get(grupo) || 0) > 1;
        const tiosCategoria = (categoriaPersistida === 'casal' || eCasalPorGrupo) ? 'casal' : 'solo';

        return {
          ...item,
          tiosCategoria,
        };
      });
      const administradoresRaw = await Admin.find().sort({ dataCriacao: -1 }).select('username dataCriacao nivelAcesso permissoes').lean();
      const administradores = administradoresRaw.map((adminDoc) => ({
        ...adminDoc,
        nivelAcesso: normalizeAdminAccessLevel(adminDoc?.nivelAcesso, 'super_admin'),
        permissoesEfetivas: resolveAdminPermissions(adminDoc),
      }));
      const auditoriaLimite = parsePositiveInt(req.query.auditLimit, 40, 10, 100);
      const auditoriaTotal = await AdminAuditLog.countDocuments();
      const auditoriaTotalPaginas = Math.max(1, Math.ceil(auditoriaTotal / auditoriaLimite));
      const auditoriaPaginaAtual = Math.min(
        parsePositiveInt(req.query.auditPage, 1, 1, 9999),
        auditoriaTotalPaginas,
      );
      const auditoriaSkip = (auditoriaPaginaAtual - 1) * auditoriaLimite;
      const auditoriaLogs = await AdminAuditLog.find()
        .sort({ createdAt: -1 })
        .skip(auditoriaSkip)
        .limit(auditoriaLimite)
        .lean();
      const ejcs = await Ejc.find().sort({ nome: 1 }).select('nome dataCriacao ativo').lean();
      const encontroAtivo = await getEncontroAtivo();
      const equipes = await Equipe.find().sort({ ejcNome: 1, nome: 1 }).select('nome ejcNome nomeReferencia dataCriacao').lean();
      const ejcAtivoFull = encontroAtivo ? await Ejc.findById(encontroAtivo._id).select('conviteEnconteiroToken conviteEnconteiroTokenExp').lean() : null;
      const encontreirosParaEquipe = await Encontro.find({ tipo: { $in: ['jovens', 'tios', 'homem', 'mulher'] } })
        .sort({ nomeCompleto: 1 })
        .select('nomeCompleto tipo equipeServiu equipeCoordenou')
        .lean();

      res.render('gerenciar-cadastros', {
        adminUsername: req.session.adminUsername,
        adminNivelAcesso: req.adminUser?.nivelAcesso || 'super_admin',
        adminPermissoes: req.adminUser?.permissoes || [],
        adminPermissionOptions: ADMIN_PERMISSION_OPTIONS,
        adminRoleDefaultPermissions: ADMIN_ROLE_DEFAULT_PERMISSIONS,
        encontristas,
        encontreiros,
        administradores,
        auditoriaLogs,
        auditoriaPaginaAtual,
        auditoriaTotalPaginas,
        auditoriaTotal,
        auditoriaLimite,
        ejcs,
        encontroAtivoNome: encontroAtivo?.nome || '',
        conviteEnconteiroToken: ejcAtivoFull?.conviteEnconteiroToken || '',
        conviteEnconteiroTokenExp: ejcAtivoFull?.conviteEnconteiroTokenExp || null,
        appBaseUrl: `${req.protocol}://${req.get('host')}`,
        escopoEventoAdmin: eventContext.scope,
        eventoFiltroNome: eventContext.encontroNome,
        equipes,
        encontreirosParaEquipe,
      });
    } catch (err) {
      console.error('Erro ao carregar cadastros:', err);
      res.status(500).send('Erro ao carregar cadastros');
    }
  });

  // POST /evento-scope
  router.post('/evento-scope', checkAdminAuth, requireAdminPermission('painel.visualizar'), [
    body('scope').optional().isIn(['ativo', 'todos']).withMessage('Escopo de evento inválido.'),
  ], async (req, res) => {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return res.status(400).json({ success: false, error: validationErrors.array()[0].msg });
      }

      const scope = normalizeAdminEventScopeInput(req.body.scope);
      req.session.adminEventScope = scope;
      return res.json({ success: true, scope });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Erro ao atualizar escopo de evento.' });
    }
  });

  // GET /config-bloqueio - Obter configurações de bloqueio de formulários
  router.get('/config-bloqueio', checkAdminAuth, requireAdminPermission('bloqueio.gerenciar'), async (req, res) => {
    try {
      const admin = await Admin.findOne().select(
        'bloquearFormularioEncontrista bloquearFormularioEncontreiros ' +
        'dataInicioBloquearEncontrista dataFimBloquearEncontrista ' +
        'dataInicioBloquearEncontreiros dataFimBloquearEncontreiros ' +
        'motivoBloquearEncontrista motivoBloquearEncontreiros'
      ).lean();
      
      console.log('[CONFIG-BLOQUEIO-GET] Admin encontrado:', admin);

      res.json({
        success: true,
        bloquearEncontrista: admin?.bloquearFormularioEncontrista === true,
        bloquearEncontreiros: admin?.bloquearFormularioEncontreiros === true,
        dataInicioEncontrista: admin?.dataInicioBloquearEncontrista || null,
        dataFimEncontrista: admin?.dataFimBloquearEncontrista || null,
        dataInicioEncontreiros: admin?.dataInicioBloquearEncontreiros || null,
        dataFimEncontreiros: admin?.dataFimBloquearEncontreiros || null,
        motivoEncontrista: admin?.motivoBloquearEncontrista || '',
        motivoEncontreiros: admin?.motivoBloquearEncontreiros || '',
      });
    } catch (err) {
      console.error('Erro ao obter configurações de bloqueio:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // NOTE: Debug routes (/debug/status-bloqueio, /debug/testar-bloqueio, /debug/ativar-bloqueio)
  // are NOT under /admin prefix and were intentionally excluded from this router.
  // They should remain in the main app or be placed in a dedicated debug routes module.

  // POST /atualizar-config-bloqueio - Atualizar configurações de bloqueio
  router.post('/atualizar-config-bloqueio', checkAdminAuth, requireAdminPermission('bloqueio.gerenciar'), async (req, res) => {
    try {
      const {
        bloquearEncontrista,
        bloquearEncontreiros,
        dataInicioEncontrista,
        dataFimEncontrista,
        dataInicioEncontreiros,
        dataFimEncontreiros,
        motivoEncontrista,
        motivoEncontreiros,
      } = req.body;

      console.log('[CONFIG-BLOQUEIO] Recebido:', {
        bloquearEncontrista,
        bloquearEncontreiros,
        dataInicioEncontrista,
        dataFimEncontrista,
        dataInicioEncontreiros,
        dataFimEncontreiros,
        motivoEncontrista,
        motivoEncontreiros,
      });

      const updateData = {
        bloquearFormularioEncontrista: bloquearEncontrista === true || bloquearEncontrista === 'true',
        bloquearFormularioEncontreiros: bloquearEncontreiros === true || bloquearEncontreiros === 'true',
        dataInicioBloquearEncontrista: (dataInicioEncontrista && String(dataInicioEncontrista).trim()) ? new Date(dataInicioEncontrista) : null,
        dataFimBloquearEncontrista: (dataFimEncontrista && String(dataFimEncontrista).trim()) ? new Date(dataFimEncontrista) : null,
        dataInicioBloquearEncontreiros: (dataInicioEncontreiros && String(dataInicioEncontreiros).trim()) ? new Date(dataInicioEncontreiros) : null,
        dataFimBloquearEncontreiros: (dataFimEncontreiros && String(dataFimEncontreiros).trim()) ? new Date(dataFimEncontreiros) : null,
        motivoBloquearEncontrista: String(motivoEncontrista || '').trim(),
        motivoBloquearEncontreiros: String(motivoEncontreiros || '').trim(),
      };

      console.log('[CONFIG-BLOQUEIO] Dados a salvar:', updateData);

      // Encontrar e atualizar configuração (ou criar se não existir)
      let admin = await Admin.findOne();
      if (!admin) {
        console.log('[CONFIG-BLOQUEIO] Nenhum Admin encontrado. Criando novo...');
        admin = new Admin(updateData);
      } else {
        console.log('[CONFIG-BLOQUEIO] Admin encontrado. Atualizando...');
        Object.assign(admin, updateData);
      }
      await admin.save();

      console.log('[CONFIG-BLOQUEIO] Salvo com sucesso:', admin);

      res.json({ success: true, message: 'Configurações de bloqueio atualizadas com sucesso' });
    } catch (err) {
      console.error('Erro ao atualizar configurações de bloqueio:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /atualizar-cadastro/:tipo/:id - Atualizar cadastro
  router.post('/atualizar-cadastro/:tipo/:id', checkAdminAuth, requireAdminPermission('cadastros.editar'), upload.single('foto'), async (req, res) => {
    try {
      const { tipo, id } = req.params;
      
      // Validar tipo de cadastro
      if (tipo !== 'encontrista' && tipo !== 'encontreiro') {
        console.error('Tipo de cadastro inválido recebido:', tipo);
        return res.status(400).json({ 
          success: false, 
          error: 'Tipo de cadastro inválido. Use "encontrista" ou "encontreiro".' 
        });
      }

      // Validar ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.error('ID inválido recebido:', id);
        return res.status(400).json({ 
          success: false, 
          error: 'ID de cadastro inválido.' 
        });
      }

      const Model = tipo === 'encontrista' ? Cadastro : Encontro;
      const cadastroAtual = await Model.findById(id);
      if (!cadastroAtual) {
        console.error('Cadastro não encontrado para atualização:', id);
        return res.status(404).json({
          success: false,
          error: 'Cadastro não encontrado.'
        });
      }
      
      const statusAprovacao = normalizeApprovalStatusInput(req.body.statusAprovacao)
        || (req.body.aprovado === 'true' ? 'aprovado' : 'pendente');

      const updateData = {
        nomeCompleto: req.body.nomeCompleto,
        ejc: req.body.ejc,
        logradouro: req.body.logradouro,
        bairro: req.body.bairro,
        telefone: req.body.telefone,
        email: req.body.email,
        instagram: req.body.instagram,
        dataNascimento: req.body.dataNascimento,
        aprovado: statusAprovacao === 'aprovado',
        statusAprovacao,
      };

      if (tipo === 'encontrista') {
        updateData.cep = req.body.cep || '';
        updateData.estadoCivil = req.body.estadoCivil || '';
        updateData.nomeMae = req.body.nomeMae || '';
        updateData.telefoneMae = req.body.telefoneMae || '';
        updateData.nomePai = req.body.nomePai || '';
        updateData.telefonePai = req.body.telefonePai || '';
        updateData.paroquiaFrequenta = req.body.paroquiaFrequenta || '';
        updateData.participaMovimentoIgreja = req.body.participaMovimentoIgreja || '';
        updateData.conhecidoInscricaoHoje = req.body.conhecidoInscricaoHoje || '';
        updateData.conhecidoFezEjc = req.body.conhecidoFezEjc || '';
        updateData.inscricaoAnterior = req.body.inscricaoAnterior || '';
        updateData.instrumentoMusical = req.body.instrumentoMusical || '';
        updateData.expectativaXixEjcCop = req.body.expectativaXixEjcCop || '';
        updateData.intolerante = req.body.intolerante_encontrista || req.body.intolerante || '';
        updateData.ehAlergico = normalizeTextInput(req.body.ehAlergico_encontrista || req.body.ehAlergico).toLowerCase() === 'sim' ? 'sim' : 'nao';
        updateData.alergiaDescricao = updateData.ehAlergico === 'sim'
          ? normalizeTextInput(req.body.alergiaDescricao_encontrista || req.body.alergiaDescricao)
          : '';
        updateData.comoQuerSerChamado = req.body.comoQuerSerChamado || '';
      }

      // Campos específicos de encontreiros
      if (tipo === 'encontreiro') {
        updateData.tipo = normalizeTipoEncontro(req.body.tipo) || 'jovens';
        updateData.tiosCategoria = updateData.tipo === 'tios'
          ? (normalizeTextInput(req.body.tiosCategoria).toLowerCase() === 'casal' ? 'casal' : 'solo')
          : '';
        updateData.comoQuerSerChamado = req.body.comoQuerSerChamado || '';
        updateData.genero = normalizeGeneroEncontro(req.body.genero);
        updateData.qualEjcPertence = req.body.qualEjcPertence || '';
        // Converter origemTios para Boolean
        updateData.origemTios = req.body.origemTios === 'true' || req.body.origemTios === true;

        // Campo de grupo não é mais editado na UI. Mantemos/geramos para casal e limpamos para solo.
        const grupoIdRecebido = normalizeTextInput(req.body.tiosGrupoId);
        const grupoIdAtual = normalizeTextInput(cadastroAtual.tiosGrupoId);
        if (updateData.tipo === 'tios' && updateData.tiosCategoria === 'casal') {
          updateData.tiosGrupoId = grupoIdRecebido || grupoIdAtual || `tios-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        } else {
          updateData.tiosGrupoId = '';
        }
        updateData.tioParceiroId = (updateData.tipo === 'tios' && updateData.tiosCategoria === 'casal' && mongoose.Types.ObjectId.isValid(req.body.tioParceiroId))
          ? req.body.tioParceiroId
          : null;
        updateData.equipeServiu = req.body.equipeServiu ? req.body.equipeServiu.split(',').map(e => e.trim()).filter(e => e) : [];
        updateData.equipeCoordenou = req.body.equipeCoordenou ? req.body.equipeCoordenou.split(',').map(e => e.trim()).filter(e => e) : [];
        updateData.temVeiculoProprio = req.body.temVeiculoProprio === 'true' || req.body.temVeiculoProprio === true;
        updateData.intolerante = req.body.intolerante || '';
        updateData.ehAlergico = normalizeTextInput(req.body.ehAlergico).toLowerCase() === 'sim' ? 'sim' : 'nao';
        updateData.alergiaDescricao = updateData.ehAlergico === 'sim' ? normalizeTextInput(req.body.alergiaDescricao) : '';
        updateData.temRelacionamento = req.body.temRelacionamento || '';
        updateData.observacoes = req.body.observacoes || '';
      }

      // Se enviou nova foto
      if (req.file) {
        // Remove foto antiga se existir
        if (cadastroAtual && cadastroAtual.foto) {
          const oldPhotoPath = path.join(__dirname, '..', '..', 'uploads', cadastroAtual.foto);
          if (fs.existsSync(oldPhotoPath)) {
            fs.unlinkSync(oldPhotoPath);
          }
        }
        
        updateData.foto = req.file.filename;
      }

      const resultado = await Model.findByIdAndUpdate(id, updateData, { new: true });

      if (tipo === 'encontreiro') {
        const categoriaAtualAnterior = normalizeTextInput(cadastroAtual.tiosCategoria).toLowerCase();
        const parceiroAnterior = cadastroAtual.tioParceiroId ? String(cadastroAtual.tioParceiroId) : '';
        const categoriaAtualNova = normalizeTextInput(resultado?.tiosCategoria).toLowerCase();
        const parceiroNovo = resultado?.tioParceiroId ? String(resultado.tioParceiroId) : '';

        if (cadastroAtual.tipo === 'tios' && (categoriaAtualAnterior === 'casal' || parceiroAnterior)) {
          if (resultado?.tipo !== 'tios' || categoriaAtualNova !== 'casal' || parceiroAnterior !== parceiroNovo) {
            await clearTiosCoupleLink(id);
          }
        }

        if (resultado?.tipo === 'tios' && categoriaAtualNova === 'casal' && parceiroNovo) {
          await linkTiosCouple(resultado._id, parceiroNovo, resultado.tiosGrupoId);
        }
      }
      
      console.log(`Cadastro ${tipo} atualizado com sucesso:`, id);
      await logAdminAction(req, {
        action: 'atualizar_cadastro',
        targetType: tipo,
        targetId: id,
        metadata: { nomeCompleto: resultado?.nomeCompleto || '', statusAprovacao: updateData.statusAprovacao },
      });
      res.json({ success: true, message: 'Cadastro atualizado com sucesso!' });
    } catch (err) {
      await logAdminAction(req, {
        action: 'atualizar_cadastro',
        targetType: req.params.tipo,
        targetId: req.params.id,
        status: 'error',
        metadata: { erro: err.message },
      });
      console.error('Erro ao atualizar cadastro:', err);
      res.status(500).json({ success: false, error: 'Erro ao atualizar cadastro: ' + err.message });
    }
  });

  // POST /remover-foto/:tipo/:id - Remover foto de um cadastro
  router.post('/remover-foto/:tipo/:id', checkAdminAuth, requireAdminPermission('cadastros.editar'), async (req, res) => {
    try {
      const { tipo, id } = req.params;
      
      // Validar tipo de cadastro
      if (tipo !== 'encontrista' && tipo !== 'encontreiro') {
        console.error('Tipo de cadastro inválido recebido:', tipo);
        return res.status(400).json({ 
          success: false, 
          error: 'Tipo de cadastro inválido. Use "encontrista" ou "encontreiro".' 
        });
      }

      // Validar ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.error('ID inválido recebido:', id);
        return res.status(400).json({ 
          success: false, 
          error: 'ID de cadastro inválido.' 
        });
      }

      const Model = tipo === 'encontrista' ? Cadastro : Encontro;
      
      const cadastro = await Model.findById(id);
      
      if (!cadastro) {
        console.error('Cadastro não encontrado:', id);
        return res.status(404).json({ success: false, error: 'Cadastro não encontrado.' });
      }
      
      if (cadastro.foto) {
        const photoPath = path.join(__dirname, '..', '..', 'uploads', cadastro.foto);
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
          console.log('Foto removida do disco:', cadastro.foto);
        }
        
        await Model.findByIdAndUpdate(id, { foto: '' });
        console.log(`Foto removida do cadastro ${tipo}:`, id);
        res.json({ success: true, message: 'Foto removida com sucesso!' });
      } else {
        res.json({ success: false, error: 'Nenhuma foto encontrada para remover.' });
      }
    } catch (err) {
      console.error('Erro ao remover foto:', err);
      res.status(500).json({ success: false, error: 'Erro ao remover foto: ' + err.message });
    }
  });

  // POST /deletar-cadastro/:tipo/:id - Deletar um cadastro e sua foto
  router.post('/deletar-cadastro/:tipo/:id', checkAdminAuth, requireAdminPermission('cadastros.excluir'), async (req, res) => {
    try {
      const { tipo, id } = req.params;
      if (!['encontrista', 'encontreiro'].includes(tipo)) {
        return res.status(400).json({ success: false, error: 'Tipo de cadastro inválido.' });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, error: 'ID de cadastro inválido.' });
      }

      const Model = tipo === 'encontrista' ? Cadastro : Encontro;
      
      console.log(`[INFO] Deletando ${tipo} com ID: ${id}`);
      
      const cadastro = await Model.findById(id);
      
      if (!cadastro) {
        return res.status(404).json({ success: false, error: 'Cadastro não encontrado' });
      }
      
      // Remover foto se existir
      if (cadastro.foto) {
        const photoPath = path.join(__dirname, '..', '..', 'uploads', cadastro.foto);
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
          console.log(`[INFO] Foto deletada: ${cadastro.foto}`);
        }
      }
      
      // Deletar cadastro
      await Model.findByIdAndDelete(id);
      console.log(`[INFO] ${tipo} deletado com sucesso: ${cadastro.nomeCompleto}`);
      
      res.json({ success: true, message: `${tipo} deletado com sucesso!` });
    } catch (err) {
      console.error('[ERRO] Erro ao deletar cadastro:', err);
      res.status(500).json({ success: false, error: 'Erro ao deletar cadastro: ' + err.message });
    }
  });

  // POST /transferir-encontrista/:id - Move um encontrista para a lista de encontreiros
  router.post('/transferir-encontrista/:id', checkAdminAuth, requireAdminPermission('cadastros.editar'), async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, error: 'ID de cadastro invalido.' });
      }

      const encontrista = await Cadastro.findById(id);
      if (!encontrista) {
        return res.status(404).json({ success: false, error: 'Encontrista nao encontrado.' });
      }

      const existente = await findExistingByNameOrEmail(Encontro, encontrista.nomeCompleto, encontrista.email);
      if (existente) {
        return res.status(409).json({
          success: false,
          error: 'Ja existe um encontreiro com mesmo nome ou email. Ajuste os dados antes de transferir.',
        });
      }

      const payloadEncontro = {
        nomeCompleto: encontrista.nomeCompleto,
        comoQuerSerChamado: '',
        genero: 'outros',
        ejc: encontrista.ejc,
        ejcVinculadoId: encontrista.ejcVinculadoId || null,
        ejcVinculadoNome: encontrista.ejcVinculadoNome || '',
        qualEjcPertence: '',
        tipo: 'jovens',
        tiosCategoria: '',
        origemTios: false,
        tiosGrupoId: '',
        equipeServiu: [],
        equipeCoordenou: [],
        logradouro: encontrista.logradouro,
        bairro: encontrista.bairro,
        dataNascimento: encontrista.dataNascimento,
        telefone: encontrista.telefone,
        intolerante: '',
        ehAlergico: 'nao',
        alergiaDescricao: '',
        email: encontrista.email,
        temRelacionamento: '',
        instagram: encontrista.instagram || '',
        foto: encontrista.foto,
        observacoes: 'Transferido da lista de encontristas pelo painel admin.',
        aprovado: resolveApprovalStatus(encontrista) === 'aprovado',
        statusAprovacao: resolveApprovalStatus(encontrista),
        dataCadastro: encontrista.dataCadastro || new Date(),
      };

      await Encontro.create(payloadEncontro);
      await Cadastro.findByIdAndDelete(id);

      return res.json({
        success: true,
        message: 'Encontrista transferido para encontreiros com sucesso.',
      });
    } catch (err) {
      console.error('Erro ao transferir encontrista para encontreiro:', err);
      return res.status(500).json({
        success: false,
        error: 'Erro ao transferir encontrista: ' + err.message,
      });
    }
  });

  // POST /transferir-encontristas-lote - Move varios encontristas para encontreiros
  router.post('/transferir-encontristas-lote', checkAdminAuth, requireAdminPermission('cadastros.editar'), async (req, res) => {
    try {
      const idsRecebidos = Array.isArray(req.body && req.body.ids) ? req.body.ids : [];
      const idsUnicos = [...new Set(idsRecebidos.map((id) => String(id || '').trim()).filter(Boolean))];

      if (idsUnicos.length === 0) {
        return res.status(400).json({ success: false, error: 'Nenhum encontrista informado para transferencia.' });
      }

      const idsValidos = idsUnicos.filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (idsValidos.length === 0) {
        return res.status(400).json({ success: false, error: 'Nenhum ID valido foi informado.' });
      }

      const encontristas = await Cadastro.find({ _id: { $in: idsValidos } });
      const mapaEncontristas = new Map(encontristas.map((item) => [String(item._id), item]));

      const documentosParaInserir = [];
      const idsParaRemover = [];
      let duplicados = 0;

      for (const id of idsValidos) {
        const encontrista = mapaEncontristas.get(String(id));
        if (!encontrista) continue;

        // Evita criar cadastros duplicados em encontreiros.
        const existente = await findExistingByNameOrEmail(Encontro, encontrista.nomeCompleto, encontrista.email);
        if (existente) {
          duplicados += 1;
          continue;
        }

        documentosParaInserir.push({
          nomeCompleto: encontrista.nomeCompleto,
          comoQuerSerChamado: '',
          genero: 'outros',
          ejc: encontrista.ejc,
          ejcVinculadoId: encontrista.ejcVinculadoId || null,
          ejcVinculadoNome: encontrista.ejcVinculadoNome || '',
          qualEjcPertence: '',
          tipo: 'jovens',
          tiosCategoria: '',
          origemTios: false,
          tiosGrupoId: '',
          equipeServiu: [],
          equipeCoordenou: [],
          logradouro: encontrista.logradouro,
          bairro: encontrista.bairro,
          dataNascimento: encontrista.dataNascimento,
          telefone: encontrista.telefone,
          intolerante: '',
          ehAlergico: 'nao',
          alergiaDescricao: '',
          email: encontrista.email,
          temRelacionamento: '',
          instagram: encontrista.instagram || '',
          foto: encontrista.foto,
          observacoes: 'Transferido da lista de encontristas pelo painel admin (lote).',
          aprovado: resolveApprovalStatus(encontrista) === 'aprovado',
          statusAprovacao: resolveApprovalStatus(encontrista),
          dataCadastro: encontrista.dataCadastro || new Date(),
        });
        idsParaRemover.push(encontrista._id);
      }

      if (documentosParaInserir.length > 0) {
        await Encontro.insertMany(documentosParaInserir);
        await Cadastro.deleteMany({ _id: { $in: idsParaRemover } });
      }

      const naoEncontrados = idsUnicos.length - idsValidos.length + (idsValidos.length - encontristas.length);

      return res.json({
        success: true,
        resumo: {
          transferidos: documentosParaInserir.length,
          duplicados,
          naoEncontrados,
        },
      });
    } catch (err) {
      console.error('Erro ao transferir encontristas em lote:', err);
      return res.status(500).json({
        success: false,
        error: 'Erro ao transferir encontristas em lote: ' + err.message,
      });
    }
  });

  // POST /limpar-encontreiros - Deletar TODOS os encontreiros e suas fotos
  router.post('/limpar-encontreiros', checkAdminAuth, requireAdminPermission('cadastros.excluir'), async (req, res) => {
    try {
      console.log('[INFO] LIMPEZA TOTAL DE ENCONTREIROS INICIADA');
      
      const encontreiros = await Encontro.find().lean();
      let fotosDeleted = 0;
      
      // Deletar fotos
      encontreiros.forEach(encontreiro => {
        if (encontreiro.foto) {
          const photoPath = path.join(__dirname, '..', '..', 'uploads', encontreiro.foto);
          if (fs.existsSync(photoPath)) {
            fs.unlinkSync(photoPath);
            fotosDeleted++;
          }
        }
      });
      
      // Deletar todos os cadastros
      const result = await Encontro.deleteMany({});
      
      console.log(`[INFO] Limpeza concluída: ${result.deletedCount} encontreiros deletados, ${fotosDeleted} fotos removidas`);
      await logAdminAction(req, {
        action: 'limpar_encontreiros',
        targetType: 'encontreiro',
        metadata: { deletados: result.deletedCount, fotosDeletadas: fotosDeleted },
      });
      
      res.json({ 
        success: true, 
        message: `Limpeza concluída: ${result.deletedCount} encontreiros e ${fotosDeleted} fotos deletados permanentemente`,
        deletados: result.deletedCount,
        fotos: fotosDeleted
      });
    } catch (err) {
      await logAdminAction(req, {
        action: 'limpar_encontreiros',
        targetType: 'encontreiro',
        status: 'error',
        metadata: { erro: err.message },
      });
      console.error('[ERRO] Erro ao limpar encontreiros:', err);
      res.status(500).json({ success: false, error: 'Erro ao limpar encontreiros: ' + err.message });
    }
  });

  // POST /executar-retencao-lgpd
  router.post('/executar-retencao-lgpd', checkAdminAuth, requireAdminPermission('lgpd.executar'), async (req, res) => {
    try {
      const days = Number.parseInt(req.body.days, 10);
      const result = await executeLgpdRetention(days);

      await logAdminAction(req, {
        action: 'executar_retencao_lgpd',
        targetType: 'sistema',
        metadata: result,
      });

      return res.json({
        success: true,
        message: 'Política de retenção LGPD executada com sucesso.',
        result,
      });
    } catch (err) {
      await logAdminAction(req, {
        action: 'executar_retencao_lgpd',
        targetType: 'sistema',
        status: 'error',
        metadata: { erro: err.message },
      });
      return res.status(500).json({ success: false, error: 'Erro ao executar política LGPD.' });
    }
  });

  return router;
};
