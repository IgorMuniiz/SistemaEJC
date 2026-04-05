const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const router = express.Router();

const IMPORT_PLACEHOLDER_IMAGE = 'import-placeholder.jpg';

const ensureImportPlaceholderImage = () => {
  const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
  const targetPath = path.join(uploadsDir, IMPORT_PLACEHOLDER_IMAGE);
  if (fs.existsSync(targetPath)) return IMPORT_PLACEHOLDER_IMAGE;

  const sourcePath = path.join(__dirname, '..', '..', 'public', 'images', 'tema.png');
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
    return IMPORT_PLACEHOLDER_IMAGE;
  }

  return '';
};

module.exports = (deps) => {
  const {
    mongoose,
    Cadastro,
    Encontro,
    Ejc,
    Equipe,
    Circulo,
    VinculoEncontro,
    getEncontroAtivo,
    invalidarCacheEncontroAtivo,
    checkAdminAuth,
    requireAdminPermission,
    importUploadSingle,
    normalizeTextInput,
    normalizeBooleanInput,
    normalizePhoneDigits,
    normalizeStringArrayInput,
    normalizeMultiField,
    normalizeTipoEncontro,
    normalizeGeneroEncontro,
    parseDateInput,
    normalizeApprovalStatusInput,
    mapToEncontroPayload,
    extractPdfField,
    findExistingByNameOrEmail,
    logAdminAction,
    clearTiosCoupleLink,
    linkTiosCouple,
    createTiosGroupId,
    buildPdfEntryFromVinculo,
    renderEstruturasPdf,
    renderCardGridPdf,
    drawPdfTitle,
    drawRegistrationCard,
    drawHeartBetweenCards,
    fitPdfTextToWidth,
    formatDateBR,
    buildPdfDisplayName,
    truncateText,
    PENDING_APPROVAL_STATUSES,
  } = deps;

  // POST /admin/gerar-link-encontreiro
  router.post('/gerar-link-encontreiro', checkAdminAuth, requireAdminPermission('cadastros.visualizar'), async (req, res) => {
    try {
      const encontroAtivo = await getEncontroAtivo();
      if (!encontroAtivo) {
        return res.status(404).json({ success: false, error: 'Nenhum encontro ativo encontrado. Ative um EJC primeiro.' });
      }

      const expDias = Number.parseInt(String(req.body.expDias || ''), 10);
      const token = crypto.randomBytes(24).toString('base64url');
      const tokenExp = (Number.isFinite(expDias) && expDias > 0)
        ? new Date(Date.now() + expDias * 86_400_000)
        : null;

      await Ejc.findByIdAndUpdate(encontroAtivo._id, {
        conviteEnconteiroToken: token,
        conviteEnconteiroTokenExp: tokenExp,
      });
      invalidarCacheEncontroAtivo();

      await logAdminAction(req, {
        action: 'gerar_link_encontreiro',
        targetType: 'ejc',
        targetId: String(encontroAtivo._id),
        metadata: { token, expDias: expDias || 'sem_validade' },
      });

      return res.json({ success: true, token, tokenExp });
    } catch (err) {
      console.error('[ERRO] Erro ao gerar link encontreiro:', err.message);
      return res.status(500).json({ success: false, error: 'Erro ao gerar link: ' + err.message });
    }
  });

  // POST /admin/revogar-link-encontreiro - Revoga o token de convite do formulário de encontreiros
  router.post('/revogar-link-encontreiro', checkAdminAuth, requireAdminPermission('cadastros.visualizar'), async (req, res) => {
    try {
      const encontroAtivo = await getEncontroAtivo();
      if (!encontroAtivo) {
        return res.status(404).json({ success: false, error: 'Nenhum encontro ativo encontrado.' });
      }

      await Ejc.findByIdAndUpdate(encontroAtivo._id, {
        conviteEnconteiroToken: '',
        conviteEnconteiroTokenExp: null,
      });
      invalidarCacheEncontroAtivo();

      await logAdminAction(req, {
        action: 'revogar_link_encontreiro',
        targetType: 'ejc',
        targetId: String(encontroAtivo._id),
      });

      return res.json({ success: true, message: 'Link de convite revogado com sucesso.' });
    } catch (err) {
      console.error('[ERRO] Erro ao revogar link encontreiro:', err.message);
      return res.status(500).json({ success: false, error: 'Erro ao revogar link: ' + err.message });
    }
  });

  // POST /admin/cadastrar-equipe - Cadastrar nova equipe
  router.post('/cadastrar-equipe', checkAdminAuth, requireAdminPermission('equipes.gerenciar'), async (req, res) => {
    try {
      const nome = normalizeTextInput(req.body.nome);
      const ejcId = normalizeTextInput(req.body.ejcId);

      if (!nome) {
        return res.status(400).json({ success: false, error: 'Nome da equipe e obrigatorio.' });
      }

      let ejcNome = '';
      if (ejcId) {
        if (!mongoose.Types.ObjectId.isValid(ejcId)) {
          return res.status(400).json({ success: false, error: 'EJC invalido.' });
        }

        const ejc = await Ejc.findById(ejcId);
        if (!ejc) {
          return res.status(404).json({ success: false, error: 'EJC nao encontrado.' });
        }
        ejcNome = ejc.nome;
      }

      const nomeReferencia = ejcNome ? `${ejcNome} - ${nome}` : nome;
      const nomeNormalizado = (ejcNome ? `${ejcNome}::${nome}` : nome).toLowerCase();

      const existente = await Equipe.findOne({ nomeNormalizado });
      if (existente) {
        return res.status(409).json({ success: false, error: 'Ja existe uma equipe com este nome.' });
      }

      await Equipe.create({ nome, ejcNome, nomeReferencia, nomeNormalizado, ejcId: ejcId || undefined });
      return res.json({ success: true, message: 'Equipe cadastrada com sucesso.' });
    } catch (err) {
      console.error('Erro ao cadastrar equipe:', err);
      return res.status(500).json({ success: false, error: 'Erro ao cadastrar equipe.' });
    }
  });

  // POST /admin/criar-ejc - Cadastrar novo EJC
  router.post('/criar-ejc', checkAdminAuth, requireAdminPermission('encontros.gerenciar'), async (req, res) => {
    try {
      const nome = normalizeTextInput(req.body.nome);

      if (!nome) {
        return res.status(400).json({ success: false, error: 'Nome do EJC e obrigatorio.' });
      }

      const nomeNormalizado = nome.toLowerCase();
      const existente = await Ejc.findOne({ nomeNormalizado });
      if (existente) {
        return res.status(409).json({ success: false, error: 'Ja existe um EJC com este nome.' });
      }

      const totalExistentes = await Ejc.countDocuments({});
      const novoEjc = await Ejc.create({ nome, nomeNormalizado, ativo: totalExistentes === 0 });
      await logAdminAction(req, {
        action: 'criar_ejc',
        targetType: 'ejc',
        targetId: novoEjc._id,
        metadata: { nome: novoEjc.nome, ativo: novoEjc.ativo === true },
      });
      return res.json({ success: true, message: 'EJC criado com sucesso.' });
    } catch (err) {
      await logAdminAction(req, {
        action: 'criar_ejc',
        targetType: 'ejc',
        status: 'error',
        metadata: { erro: err.message },
      });
      console.error('Erro ao criar EJC:', err);
      return res.status(500).json({ success: false, error: 'Erro ao criar EJC.' });
    }
  });

  // POST /admin/definir-ejc-ativo/:id - Define manualmente qual EJC e o encontro ativo
  router.post('/definir-ejc-ativo/:id', checkAdminAuth, requireAdminPermission('encontros.gerenciar'), async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, error: 'ID de EJC invalido.' });
      }

      const ejc = await Ejc.findById(id).lean();
      if (!ejc) {
        return res.status(404).json({ success: false, error: 'EJC nao encontrado.' });
      }

      await Ejc.updateMany({ ativo: true }, { $set: { ativo: false } });
      await Ejc.updateOne({ _id: id }, { $set: { ativo: true } });
      invalidarCacheEncontroAtivo();

      await logAdminAction(req, {
        action: 'definir_ejc_ativo',
        targetType: 'ejc',
        targetId: id,
        metadata: { nome: ejc.nome },
      });

      return res.json({ success: true, message: `Encontro ativo definido para ${ejc.nome}.` });
    } catch (err) {
      await logAdminAction(req, {
        action: 'definir_ejc_ativo',
        targetType: 'ejc',
        targetId: req.params.id,
        status: 'error',
        metadata: { erro: err.message },
      });
      console.error('Erro ao definir EJC ativo:', err);
      return res.status(500).json({ success: false, error: 'Erro ao definir encontro ativo.' });
    }
  });

  // POST /admin/deletar-ejc/:id - Remove EJC e estruturas vinculadas (circulos/equipes/vinculos)
  router.post('/deletar-ejc/:id', checkAdminAuth, requireAdminPermission('encontros.gerenciar'), async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, error: 'ID de EJC invalido.' });
      }

      const ejc = await Ejc.findById(id).lean();
      if (!ejc) {
        return res.status(404).json({ success: false, error: 'EJC nao encontrado.' });
      }

      const equipes = await Equipe.find({ ejcId: id }).select('nome nomeReferencia').lean();
      const nomesEquipes = equipes
        .map((eq) => normalizeTextInput(eq.nomeReferencia || eq.nome))
        .filter(Boolean);

      await VinculoEncontro.deleteMany({ ejcId: id });
      await Circulo.deleteMany({ ejcId: id });
      await Equipe.deleteMany({ ejcId: id });

      if (nomesEquipes.length) {
        await Encontro.updateMany(
          {},
          {
            $pullAll: {
              equipeServiu: nomesEquipes,
              equipeCoordenou: nomesEquipes,
            },
          }
        );
      }

      await Ejc.findByIdAndDelete(id);
      await logAdminAction(req, {
        action: 'deletar_ejc',
        targetType: 'ejc',
        targetId: id,
        metadata: { nome: ejc.nome, equipesRemovidas: nomesEquipes.length },
      });
      return res.json({ success: true, message: 'EJC excluido com sucesso.' });
    } catch (err) {
      await logAdminAction(req, {
        action: 'deletar_ejc',
        targetType: 'ejc',
        targetId: req.params.id,
        status: 'error',
        metadata: { erro: err.message },
      });
      console.error('Erro ao deletar EJC:', err);
      return res.status(500).json({ success: false, error: 'Erro ao deletar EJC.' });
    }
  });

  // GET /admin/encontros/:ejcId - Tela dedicada de encontro por EJC
  router.get('/encontros/:ejcId', checkAdminAuth, requireAdminPermission('encontros.gerenciar'), async (req, res) => {
    try {
      const { ejcId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(ejcId)) {
        return res.status(400).send('EJC inválido.');
      }

      const ejc = await Ejc.findById(ejcId).lean();
      if (!ejc) return res.status(404).send('EJC não encontrado.');

      const [circulos, equipes, encontristas, encontreiros, vinculos] = await Promise.all([
        Circulo.find({ ejcId }).sort({ nome: 1 }).lean(),
        Equipe.find({ ejcId }).sort({ nome: 1 }).lean(),
        Cadastro.find()
          .sort({ nomeCompleto: 1 })
          .select('nomeCompleto ejc telefone email bairro foto')
          .lean(),
        Encontro.find()
          .sort({ nomeCompleto: 1 })
          .select('nomeCompleto tipo ejc telefone email bairro foto')
          .lean(),
        VinculoEncontro.find({ ejcId }).lean(),
      ]);

      res.render('admin-encontro-ejc', {
        adminUsername: req.session.adminUsername,
        adminNivelAcesso: req.adminUser?.nivelAcesso || 'super_admin',
        adminPermissoes: req.adminUser?.permissoes || [],
        ejc,
        circulos,
        equipes,
        encontristas,
        encontreiros,
        vinculos,
      });
    } catch (err) {
      console.error('Erro ao carregar página de EJC:', err);
      res.status(500).send('Erro ao carregar página de EJC.');
    }
  });

  // POST /admin/criar-circulo - Criar circulo para um EJC
  router.post('/criar-circulo', checkAdminAuth, requireAdminPermission('encontros.gerenciar'), async (req, res) => {
    try {
      const nome = normalizeTextInput(req.body.nome);
      const ejcId = normalizeTextInput(req.body.ejcId);

      if (!nome || !ejcId || !mongoose.Types.ObjectId.isValid(ejcId)) {
        return res.status(400).json({ success: false, error: 'Nome do círculo e EJC são obrigatórios.' });
      }

      const ejc = await Ejc.findById(ejcId);
      if (!ejc) return res.status(404).json({ success: false, error: 'EJC não encontrado.' });

      const nomeNormalizado = `${ejc.nome}::${nome}`.toLowerCase();
      const existente = await Circulo.findOne({ nomeNormalizado });
      if (existente) return res.status(409).json({ success: false, error: 'Já existe esse círculo neste EJC.' });

      await Circulo.create({ nome, ejcId, nomeNormalizado });
      return res.json({ success: true });
    } catch (err) {
      console.error('Erro ao criar círculo:', err);
      return res.status(500).json({ success: false, error: 'Erro ao criar círculo.' });
    }
  });

  // POST /admin/editar-circulo/:id - Editar nome de circulo dentro do EJC
  router.post('/editar-circulo/:id', checkAdminAuth, requireAdminPermission('encontros.gerenciar'), async (req, res) => {
    try {
      const { id } = req.params;
      const ejcId = normalizeTextInput(req.body.ejcId);
      const nome = normalizeTextInput(req.body.nome);

      if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(ejcId)) {
        return res.status(400).json({ success: false, error: 'Dados invalidos para editar circulo.' });
      }
      if (!nome) {
        return res.status(400).json({ success: false, error: 'Nome do circulo e obrigatorio.' });
      }

      const ejc = await Ejc.findById(ejcId).lean();
      if (!ejc) {
        return res.status(404).json({ success: false, error: 'EJC nao encontrado.' });
      }

      const circulo = await Circulo.findOne({ _id: id, ejcId });
      if (!circulo) {
        return res.status(404).json({ success: false, error: 'Circulo nao encontrado neste EJC.' });
      }

      const nomeNormalizado = `${ejc.nome}::${nome}`.toLowerCase();
      const duplicado = await Circulo.findOne({ nomeNormalizado, _id: { $ne: id } }).lean();
      if (duplicado) {
        return res.status(409).json({ success: false, error: 'Ja existe esse circulo neste EJC.' });
      }

      circulo.nome = nome;
      circulo.nomeNormalizado = nomeNormalizado;
      await circulo.save();
      return res.json({ success: true, message: 'Circulo atualizado com sucesso.' });
    } catch (err) {
      console.error('Erro ao editar circulo:', err);
      return res.status(500).json({ success: false, error: 'Erro ao editar circulo.' });
    }
  });

  // POST /admin/excluir-circulo/:id - Excluir circulo e vinculos associados
  router.post('/excluir-circulo/:id', checkAdminAuth, requireAdminPermission('encontros.gerenciar'), async (req, res) => {
    try {
      const { id } = req.params;
      const ejcId = normalizeTextInput(req.body.ejcId);

      if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(ejcId)) {
        return res.status(400).json({ success: false, error: 'Dados invalidos para excluir circulo.' });
      }

      const circulo = await Circulo.findOne({ _id: id, ejcId }).lean();
      if (!circulo) {
        return res.status(404).json({ success: false, error: 'Circulo nao encontrado neste EJC.' });
      }

      await VinculoEncontro.deleteMany({
        ejcId,
        entidadeTipo: 'circulo',
        entidadeId: id,
      });
      await Circulo.deleteOne({ _id: id, ejcId });

      return res.json({ success: true, message: 'Circulo excluido com sucesso.' });
    } catch (err) {
      console.error('Erro ao excluir circulo:', err);
      return res.status(500).json({ success: false, error: 'Erro ao excluir circulo.' });
    }
  });

  // POST /admin/editar-equipe/:id - Editar nome de equipe dentro do EJC
  router.post('/editar-equipe/:id', checkAdminAuth, requireAdminPermission('equipes.gerenciar'), async (req, res) => {
    try {
      const { id } = req.params;
      const ejcId = normalizeTextInput(req.body.ejcId);
      const nome = normalizeTextInput(req.body.nome);

      if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(ejcId)) {
        return res.status(400).json({ success: false, error: 'Dados invalidos para editar equipe.' });
      }
      if (!nome) {
        return res.status(400).json({ success: false, error: 'Nome da equipe e obrigatorio.' });
      }

      const ejc = await Ejc.findById(ejcId).lean();
      if (!ejc) {
        return res.status(404).json({ success: false, error: 'EJC nao encontrado.' });
      }

      let equipe = await Equipe.findOne({ _id: id, ejcId });
      if (!equipe) {
        const equipeLegada = await Equipe.findById(id);
        if (equipeLegada && !equipeLegada.ejcId) {
          equipeLegada.ejcId = ejcId;
          await equipeLegada.save();
          equipe = equipeLegada;
        }
      }

      if (!equipe) {
        return res.status(404).json({ success: false, error: 'Equipe nao encontrada neste EJC.' });
      }

      const nomeReferenciaNovo = `${ejc.nome} - ${nome}`;
      const nomeNormalizadoNovo = `${ejc.nome}::${nome}`.toLowerCase();
      const duplicado = await Equipe.findOne({ nomeNormalizado: nomeNormalizadoNovo, _id: { $ne: id } }).lean();
      if (duplicado) {
        return res.status(409).json({ success: false, error: 'Ja existe essa equipe neste EJC.' });
      }

      const nomeReferenciaAntigo = normalizeTextInput(equipe.nomeReferencia || equipe.nome);
      equipe.nome = nome;
      equipe.ejcNome = ejc.nome;
      equipe.nomeReferencia = nomeReferenciaNovo;
      equipe.nomeNormalizado = nomeNormalizadoNovo;
      equipe.ejcId = ejcId;
      await equipe.save();

      if (nomeReferenciaAntigo && nomeReferenciaAntigo !== nomeReferenciaNovo) {
        await Encontro.updateMany(
          { equipeServiu: nomeReferenciaAntigo },
          { $set: { 'equipeServiu.$': nomeReferenciaNovo } }
        );
        await Encontro.updateMany(
          { equipeCoordenou: nomeReferenciaAntigo },
          { $set: { 'equipeCoordenou.$': nomeReferenciaNovo } }
        );
      }

      return res.json({ success: true, message: 'Equipe atualizada com sucesso.' });
    } catch (err) {
      console.error('Erro ao editar equipe:', err);
      return res.status(500).json({ success: false, error: 'Erro ao editar equipe.' });
    }
  });

  // POST /admin/excluir-equipe/:id - Excluir equipe e vinculos associados
  router.post('/excluir-equipe/:id', checkAdminAuth, requireAdminPermission('equipes.gerenciar'), async (req, res) => {
    try {
      const { id } = req.params;
      const ejcId = normalizeTextInput(req.body.ejcId);

      if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(ejcId)) {
        return res.status(400).json({ success: false, error: 'Dados invalidos para excluir equipe.' });
      }

      let equipe = await Equipe.findOne({ _id: id, ejcId }).lean();
      if (!equipe) {
        const equipeLegada = await Equipe.findById(id).lean();
        if (equipeLegada && !equipeLegada.ejcId) {
          await Equipe.updateOne({ _id: id }, { $set: { ejcId } });
          equipe = { ...equipeLegada, ejcId };
        }
      }

      if (!equipe) {
        return res.status(404).json({ success: false, error: 'Equipe nao encontrada neste EJC.' });
      }

      const nomeReferencia = normalizeTextInput(equipe.nomeReferencia || equipe.nome);

      await VinculoEncontro.deleteMany({
        ejcId,
        entidadeTipo: 'equipe',
        entidadeId: id,
      });

      if (nomeReferencia) {
        await Encontro.updateMany(
          {},
          {
            $pull: {
              equipeServiu: nomeReferencia,
              equipeCoordenou: nomeReferencia,
            },
          }
        );
      }

      await Equipe.deleteOne({ _id: id });
      return res.json({ success: true, message: 'Equipe excluida com sucesso.' });
    } catch (err) {
      console.error('Erro ao excluir equipe:', err);
      return res.status(500).json({ success: false, error: 'Erro ao excluir equipe.' });
    }
  });

  // POST /admin/vincular-encontro - Vincular pessoa em circulo/equipe de um EJC
  router.post('/vincular-encontro', checkAdminAuth, requireAdminPermission('encontros.gerenciar'), async (req, res) => {
    try {
      console.log('[VINCULAR] body recebido:', JSON.stringify(req.body));
      const ejcId = normalizeTextInput(req.body.ejcId);
      const entidadeTipo = normalizeTextInput(req.body.entidadeTipo).toLowerCase();
      const entidadeId = normalizeTextInput(req.body.entidadeId);
      const pessoaTipo = normalizeTextInput(req.body.pessoaTipo).toLowerCase();
      const pessoaIdsRaw = Array.isArray(req.body.pessoaIds)
        ? req.body.pessoaIds
        : normalizeTextInput(req.body.pessoaId)
          ? [req.body.pessoaId]
          : [];
      const pessoaIds = [...new Set(
        pessoaIdsRaw
          .map((id) => normalizeTextInput(id))
          .filter(Boolean)
      )];
      const papelRecebido = normalizeTextInput(req.body.papel).toLowerCase() || 'membro';
      const descricaoPapel = normalizeTextInput(req.body.descricaoPapel);

      if (!mongoose.Types.ObjectId.isValid(ejcId) || !mongoose.Types.ObjectId.isValid(entidadeId)) {
        return res.status(400).json({ success: false, error: 'Dados inválidos para vínculo.' });
      }
      if (!pessoaIds.length || pessoaIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
        return res.status(400).json({ success: false, error: 'Selecione ao menos uma pessoa valida para vincular.' });
      }
      if (!['circulo', 'equipe'].includes(entidadeTipo)) {
        return res.status(400).json({ success: false, error: 'Entidade inválida.' });
      }
      if (!['encontrista', 'encontreiro'].includes(pessoaTipo)) {
        return res.status(400).json({ success: false, error: 'Tipo de pessoa inválido.' });
      }

      if (entidadeTipo === 'circulo' && pessoaTipo !== 'encontrista') {
        return res.status(400).json({ success: false, error: 'Círculo aceita apenas encontristas.' });
      }

      let papel = 'membro';
      if (entidadeTipo === 'equipe') {
        if (['coordenador', 'coordenou'].includes(papelRecebido)) {
          papel = 'coordenador';
        } else if (['membro', 'serviu'].includes(papelRecebido)) {
          papel = 'membro';
        } else {
          return res.status(400).json({ success: false, error: 'Papel inválido para equipe.' });
        }
      } else {
        if (!['membro', 'moita'].includes(papelRecebido)) {
          return res.status(400).json({ success: false, error: 'Papel inválido para círculo.' });
        }
        papel = papelRecebido;
        if (papel === 'moita' && !descricaoPapel) {
          return res.status(400).json({ success: false, error: 'Informe qual papel a pessoa fará como moita.' });
        }
      }

      let entidade = entidadeTipo === 'circulo'
        ? await Circulo.findOne({ _id: entidadeId, ejcId })
        : await Equipe.findOne({ _id: entidadeId, ejcId });
      const ejc = await Ejc.findById(ejcId).select('nome').lean();

      console.log('[VINCULAR] entidade encontrada (1a tentativa):', entidade ? entidade._id : null);

      // Fallback para equipes legadas sem ejcId preenchido.
      if (!entidade && entidadeTipo === 'equipe') {
        const equipeLegada = await Equipe.findById(entidadeId);
        console.log('[VINCULAR] equipe legada (fallback):', equipeLegada ? { id: equipeLegada._id, ejcId: equipeLegada.ejcId } : null);
        if (equipeLegada && !equipeLegada.ejcId) {
          equipeLegada.ejcId = ejcId;
          await equipeLegada.save();
          entidade = equipeLegada;
        }
      }

      if (!entidade) {
        console.log('[VINCULAR] entidade nao encontrada para ejcId:', ejcId, 'entidadeId:', entidadeId);
        return res.status(404).json({ success: false, error: 'Entidade não encontrada neste EJC.' });
      }
      if (!ejc) {
        return res.status(404).json({ success: false, error: 'EJC não encontrado para este vínculo.' });
      }

      const ModelPessoa = pessoaTipo === 'encontrista' ? Cadastro : Encontro;
      const pessoas = await ModelPessoa.find({ _id: { $in: pessoaIds } });
      console.log('[VINCULAR] pessoas encontradas:', pessoas.length, 'de', pessoaIds.length, 'solicitadas');
      const pessoasMap = new Map(pessoas.map((p) => [String(p._id), p]));

      let vinculados = 0;
      let jaVinculados = 0;
      let naoEncontrados = 0;

      for (const pessoaId of pessoaIds) {
        const pessoa = pessoasMap.get(String(pessoaId));
        if (!pessoa) {
          naoEncontrados += 1;
          continue;
        }

        let shouldPersistPessoa = false;

        const existente = await VinculoEncontro.findOne({
          ejcId,
          entidadeTipo,
          entidadeId,
          pessoaTipo,
          pessoaId,
          papel,
          descricaoPapel: papel === 'moita' ? descricaoPapel : '',
        });
        if (!existente) {
          await VinculoEncontro.create({
            ejcId,
            entidadeTipo,
            entidadeId,
            pessoaTipo,
            pessoaId,
            papel,
            descricaoPapel: papel === 'moita' ? descricaoPapel : '',
          });
          vinculados += 1;
        } else {
          jaVinculados += 1;
        }

        if (entidadeTipo === 'equipe' && pessoaTipo === 'encontreiro') {
          const equipeNome = entidade.nomeReferencia || entidade.nome;
          const field = papel === 'coordenador' ? 'equipeCoordenou' : 'equipeServiu';
          const listaAtual = Array.isArray(pessoa[field]) ? pessoa[field] : [];
          if (!listaAtual.includes(equipeNome)) {
            listaAtual.push(equipeNome);
            pessoa[field] = listaAtual;
            shouldPersistPessoa = true;
          }
        }

        if (String(pessoa.ejcVinculadoId || '') !== String(ejc._id) || normalizeTextInput(pessoa.ejcVinculadoNome) !== normalizeTextInput(ejc.nome)) {
          pessoa.ejcVinculadoId = ejc._id;
          pessoa.ejcVinculadoNome = ejc.nome;
          shouldPersistPessoa = true;
        }

        if (shouldPersistPessoa) {
          await pessoa.save();
        }
      }

      return res.json({ success: true, vinculados, jaVinculados, naoEncontrados });
    } catch (err) {
      console.error('[VINCULAR] Erro ao vincular encontro:', err);
      return res.status(500).json({ success: false, error: 'Erro ao vincular.' });
    }
  });

  // GET /admin/encontros/:ejcId/export/:entidadeTipo/:entidadeId/:formato
  // Exporta vinculados de um circulo/equipe em Excel ou PDF.
  router.get('/encontros/:ejcId/export/:entidadeTipo/:entidadeId/:formato', checkAdminAuth, requireAdminPermission('encontros.gerenciar'), async (req, res) => {
    try {
      const ejcId = normalizeTextInput(req.params.ejcId);
      const entidadeTipo = normalizeTextInput(req.params.entidadeTipo).toLowerCase();
      const entidadeId = normalizeTextInput(req.params.entidadeId);
      const formato = normalizeTextInput(req.params.formato).toLowerCase();

      if (!mongoose.Types.ObjectId.isValid(ejcId) || !mongoose.Types.ObjectId.isValid(entidadeId)) {
        return res.status(400).send('Parametros invalidos para exportacao.');
      }
      if (!['circulo', 'equipe'].includes(entidadeTipo)) {
        return res.status(400).send('Tipo de entidade invalido.');
      }
      if (!['excel', 'pdf'].includes(formato)) {
        return res.status(400).send('Formato invalido. Use excel ou pdf.');
      }

      const ejc = await Ejc.findById(ejcId).lean();
      if (!ejc) return res.status(404).send('EJC nao encontrado.');

      const entidade = entidadeTipo === 'circulo'
        ? await Circulo.findOne({ _id: entidadeId, ejcId }).lean()
        : await Equipe.findOne({ _id: entidadeId, ejcId }).lean();
      if (!entidade) {
        return res.status(404).send('Entidade nao encontrada para este EJC.');
      }

      const vinculos = await VinculoEncontro.find({
        ejcId,
        entidadeTipo,
        entidadeId,
      }).sort({ dataCriacao: 1 }).lean();

      const idsEncontristas = vinculos
        .filter((v) => v.pessoaTipo === 'encontrista')
        .map((v) => v.pessoaId);
      const idsEncontreiros = vinculos
        .filter((v) => v.pessoaTipo === 'encontreiro')
        .map((v) => v.pessoaId);

      const [listaEncontristas, listaEncontreiros] = await Promise.all([
        idsEncontristas.length
          ? Cadastro.find({ _id: { $in: idsEncontristas } })
            .select('nomeCompleto telefone email ejc bairro foto logradouro dataNascimento instagram')
            .lean()
          : [],
        idsEncontreiros.length
          ? Encontro.find({ _id: { $in: idsEncontreiros } })
            .select('nomeCompleto tipo tiosCategoria tiosGrupoId telefone email ejc bairro foto logradouro dataNascimento instagram')
            .lean()
          : [],
      ]);

      const mapEncontristas = new Map(listaEncontristas.map((p) => [String(p._id), p]));
      const mapEncontreiros = new Map(listaEncontreiros.map((p) => [String(p._id), p]));

      const rows = vinculos.map((v) => {
        const pessoa = v.pessoaTipo === 'encontrista'
          ? mapEncontristas.get(String(v.pessoaId))
          : mapEncontreiros.get(String(v.pessoaId));

        const tipoPessoa = v.pessoaTipo === 'encontrista'
          ? 'Encontrista'
          : ((pessoa && pessoa.tipo === 'tios') ? 'Tios' : 'Encontreiro');

        return {
          nome: pessoa?.nomeCompleto || '-',
          tipoPessoa,
          papel: v.papel === 'coordenador' || v.papel === 'coordenou'
            ? 'Coordenador'
            : (v.papel === 'moita' ? `Moita${v.descricaoPapel ? ` - ${v.descricaoPapel}` : ''}` : 'Membro'),
          papelMoita: v.papel === 'moita' ? (v.descricaoPapel || '-') : '-',
          telefone: pessoa?.telefone || '-',
          email: pessoa?.email || '-',
          bairro: pessoa?.bairro || '-',
          ejc: pessoa?.ejc || '-',
          dataVinculo: formatDateBR(v.dataCriacao),
        };
      });

      const pdfEntries = vinculos.map((v) => {
        const pessoa = v.pessoaTipo === 'encontrista'
          ? mapEncontristas.get(String(v.pessoaId))
          : mapEncontreiros.get(String(v.pessoaId));

        return buildPdfEntryFromVinculo(v, pessoa, ejc.nome);
      });

      const entidadeNome = entidade.nome || 'Sem nome';
      const arquivoBase = `${entidadeTipo}_${entidadeNome}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .toLowerCase() || entidadeTipo;

      if (formato === 'excel') {
        const Excel = require('exceljs');
        const workbook = new Excel.Workbook();
        workbook.creator = 'EJC COP - Sistema de Gestao';
        workbook.company = 'EJC Comunidade de Oracao Pai';
        const generatedAt = new Date();
        workbook.created = generatedAt;
        workbook.modified = generatedAt;

        const isCirculo = entidadeTipo === 'circulo';
        const headerColor = isCirculo ? 'FF1B5FD1' : 'FF14805F';
        const stripeColor = isCirculo ? 'FFF4F8FF' : 'FFF2FCF8';
        const borderColor = isCirculo ? 'FFD5E3FB' : 'FFCBEBDD';
        const subtitleTipo = isCirculo ? 'CIRCULO' : 'EQUIPE';

        const sheet = workbook.addWorksheet('Vinculados', {
          views: [{ state: 'frozen', ySplit: 7, xSplit: 1 }],
        });
        sheet.properties.tabColor = { argb: headerColor };
        sheet.pageSetup = {
          paperSize: 9,
          orientation: 'landscape',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
        };

        sheet.columns = [
          { header: '', key: 'margem', width: 2 },
          { header: 'Nome', key: 'nome', width: 32 },
          { header: 'Tipo', key: 'tipoPessoa', width: 14 },
          { header: 'Papel', key: 'papel', width: 18 },
          { header: 'Papel Moita', key: 'papelMoita', width: 24 },
          { header: 'Telefone', key: 'telefone', width: 16 },
          { header: 'Email', key: 'email', width: 30 },
          { header: 'Bairro', key: 'bairro', width: 20 },
          { header: 'EJC', key: 'ejc', width: 22 },
          { header: 'Data do Vinculo', key: 'dataVinculo', width: 16 },
        ];

        sheet.mergeCells('A1:J1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = 'RELATORIO DE VINCULOS - EJC';
        titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI Semibold' };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getRow(1).height = 30;

        sheet.mergeCells('A2:J2');
        const subtitleCell = sheet.getCell('A2');
        subtitleCell.value = `${subtitleTipo}: ${entidadeNome} | EJC: ${ejc.nome}`;
        subtitleCell.font = { bold: true, size: 11, color: { argb: 'FF1A2332' }, name: 'Segoe UI' };
        subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFD' } };
        subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getRow(2).height = 22;

        sheet.mergeCells('A3:J3');
        const metaCell = sheet.getCell('A3');
        metaCell.value = `Gerado em: ${generatedAt.toLocaleDateString('pt-BR')} ${generatedAt.toLocaleTimeString('pt-BR')} | Total de vinculados: ${rows.length}`;
        metaCell.font = { italic: true, size: 9, color: { argb: 'FF5F6B7A' }, name: 'Segoe UI' };
        metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDFEFF' } };
        metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getRow(3).height = 20;

        const totalCoordenadores = rows.filter((item) => String(item.papel || '').toLowerCase().includes('coordenador')).length;
        const totalMoitas = rows.filter((item) => String(item.papel || '').toLowerCase().startsWith('moita')).length;
        const totalEncontristas = rows.filter((item) => String(item.tipoPessoa || '').toLowerCase() === 'encontrista').length;

        const drawKpi = (startCol, endCol, title, value, bgColor) => {
          const rangeTop = `${startCol}4:${endCol}4`;
          const rangeBottom = `${startCol}5:${endCol}5`;
          sheet.mergeCells(rangeTop);
          sheet.mergeCells(rangeBottom);

          const titleCellKpi = sheet.getCell(`${startCol}4`);
          titleCellKpi.value = title;
          titleCellKpi.font = { bold: true, size: 9, color: { argb: 'FF5F6B7A' }, name: 'Segoe UI' };
          titleCellKpi.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFD' } };
          titleCellKpi.alignment = { horizontal: 'center', vertical: 'middle' };

          const valueCellKpi = sheet.getCell(`${startCol}5`);
          valueCellKpi.value = String(value);
          valueCellKpi.font = { bold: true, size: 16, color: { argb: bgColor }, name: 'Segoe UI Semibold' };
          valueCellKpi.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
          valueCellKpi.alignment = { horizontal: 'center', vertical: 'middle' };
        };

        drawKpi('B', 'D', 'TOTAL DE VINCULADOS', rows.length, headerColor);
        drawKpi('E', 'G', 'COORDENADORES', totalCoordenadores, 'FF0E8A66');
        drawKpi('H', 'J', isCirculo ? 'MOITAS' : 'ENCONTRISTAS', isCirculo ? totalMoitas : totalEncontristas, 'FF9A6700');

        sheet.getRow(4).height = 18;
        sheet.getRow(5).height = 26;

        sheet.mergeCells('A6:J6');
        const spacerCell = sheet.getCell('A6');
        spacerCell.value = '';
        spacerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        sheet.getRow(6).height = 8;

        const headerRow = sheet.getRow(7);
        const tableHeaders = ['Nome', 'Tipo', 'Papel', 'Papel Moita', 'Telefone', 'Email', 'Bairro', 'EJC', 'Data do Vinculo'];
        for (let idx = 0; idx < tableHeaders.length; idx += 1) {
          headerRow.getCell(idx + 2).value = tableHeaders[idx];
        }
        headerRow.height = 26;
        for (let col = 2; col <= 10; col += 1) {
          const cell = headerRow.getCell(col);
          cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI Semibold' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.border = {
            top: { style: 'thin', color: { argb: headerColor } },
            bottom: { style: 'medium', color: { argb: headerColor } },
            left: { style: 'thin', color: { argb: headerColor } },
            right: { style: 'thin', color: { argb: headerColor } },
          };
        }

        sheet.autoFilter = {
          from: { row: 7, column: 2 },
          to: { row: 7, column: 10 },
        };

        rows.forEach((row, idx) => {
          const dataRow = sheet.addRow({ margem: '', ...row });
          dataRow.height = 22;

          const bgColor = idx % 2 === 0 ? stripeColor : 'FFFFFFFF';
          for (let col = 2; col <= 10; col += 1) {
            const cell = dataRow.getCell(col);
            cell.font = { size: 10, color: { argb: 'FF1A2332' }, name: 'Segoe UI' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
            cell.alignment = {
              horizontal: col === 10 ? 'center' : 'left',
              vertical: 'middle',
              wrapText: true,
            };
            cell.border = {
              top: { style: 'hair', color: { argb: borderColor } },
              bottom: { style: 'hair', color: { argb: borderColor } },
              left: { style: 'hair', color: { argb: borderColor } },
              right: { style: 'hair', color: { argb: borderColor } },
            };
          }
        });

        const summaryRow = sheet.addRow({
          margem: '',
          nome: `Total de vinculados em ${entidadeNome}: ${rows.length}`,
          tipoPessoa: '',
          papel: '',
          papelMoita: '',
          telefone: '',
          email: '',
          bairro: '',
          ejc: '',
          dataVinculo: '',
        });
        summaryRow.height = 24;
        for (let col = 2; col <= 10; col += 1) {
          const cell = summaryRow.getCell(col);
          cell.font = { bold: true, size: 10, color: { argb: 'FF1A2332' }, name: 'Segoe UI Semibold' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF3FF' } };
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
          cell.border = {
            top: { style: 'medium', color: { argb: headerColor } },
            bottom: { style: 'thin', color: { argb: headerColor } },
            left: { style: 'hair', color: { argb: borderColor } },
            right: { style: 'hair', color: { argb: borderColor } },
          };
        }

        const assinaturaRow = sheet.addRow({
          margem: '',
          nome: 'Documento oficial - Sistema de Gestao EJC',
          tipoPessoa: `Gerado em ${generatedAt.toLocaleDateString('pt-BR')}`,
          papel: '',
          papelMoita: '',
          telefone: '',
          email: '',
          bairro: '',
          ejc: '',
          dataVinculo: '',
        });
        assinaturaRow.height = 20;
        for (let col = 2; col <= 10; col += 1) {
          const cell = assinaturaRow.getCell(col);
          cell.font = { italic: true, size: 9, color: { argb: 'FF5F6B7A' }, name: 'Segoe UI' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }

        for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
          const cell = sheet.getCell(`A${rowNumber}`);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${arquivoBase}.xlsx"`);
        await workbook.xlsx.write(res);
        return res.end();
      }

      renderEstruturasPdf(res, {
        fileName: `${arquivoBase}.pdf`,
        mainTitle: `${entidadeTipo === 'circulo' ? 'Circulos' : 'Equipes'} - ${ejc.nome}`,
        groups: [
          {
            tipo: entidadeTipo,
            nome: entidadeNome,
            entries: pdfEntries,
          },
        ],
      });
      return;
    } catch (err) {
      console.error('Erro ao exportar vinculados de entidade:', err);
      return res.status(500).send('Erro ao exportar vinculados.');
    }
  });

  // GET /admin/encontros/:ejcId/quadrante/editor
  router.get('/encontros/:ejcId/quadrante/editor', checkAdminAuth, requireAdminPermission('encontros.gerenciar'), async (req, res) => {
    try {
      const ejcId = normalizeTextInput(req.params.ejcId);

      if (!mongoose.Types.ObjectId.isValid(ejcId)) {
        return res.status(400).send('EJC invalido para abrir o editor de quadrante.');
      }

      const ejc = await Ejc.findById(ejcId).lean();
      if (!ejc) {
        return res.status(404).send('EJC nao encontrado.');
      }

      const [circulos, equipes] = await Promise.all([
        Circulo.find({ ejcId }).sort({ nome: 1 }).select('nome').lean(),
        Equipe.find({ ejcId }).sort({ nome: 1 }).select('nome').lean(),
      ]);

      const quadranteSources = [
        ...circulos.map((item) => ({
          id: `circulo-${String(item._id)}`,
          tipo: 'circulo',
          nome: item.nome || 'Circulo sem nome',
          url: `/admin/encontros/${encodeURIComponent(ejcId)}/export/circulo/${encodeURIComponent(String(item._id))}/pdf`,
        })),
        ...equipes.map((item) => ({
          id: `equipe-${String(item._id)}`,
          tipo: 'equipe',
          nome: item.nome || 'Equipe sem nome',
          url: `/admin/encontros/${encodeURIComponent(ejcId)}/export/equipe/${encodeURIComponent(String(item._id))}/pdf`,
        })),
      ];

      return res.render('admin-quadrante-editor', {
        adminUsername: req.session.adminUsername,
        adminNivelAcesso: req.adminUser?.nivelAcesso || 'super_admin',
        adminPermissoes: req.adminUser?.permissoes || [],
        ejc,
        quadranteSources,
      });
    } catch (err) {
      console.error('Erro ao abrir editor de quadrante:', err);
      return res.status(500).send('Erro ao abrir editor de quadrante.');
    }
  });

  // GET /admin/encontros/:ejcId/export/quadrante/pdf
  router.get('/encontros/:ejcId/export/quadrante/pdf', checkAdminAuth, requireAdminPermission('encontros.gerenciar'), async (req, res) => {
    try {
      const ejcId = normalizeTextInput(req.params.ejcId);

      if (!mongoose.Types.ObjectId.isValid(ejcId)) {
        return res.status(400).send('EJC invalido para exportacao.');
      }

      const ejc = await Ejc.findById(ejcId).lean();
      if (!ejc) {
        return res.status(404).send('EJC nao encontrado.');
      }

      const [circulos, equipes, vinculos] = await Promise.all([
        Circulo.find({ ejcId }).sort({ nome: 1 }).lean(),
        Equipe.find({ ejcId }).sort({ nome: 1 }).lean(),
        VinculoEncontro.find({ ejcId }).sort({ entidadeTipo: 1, dataCriacao: 1 }).lean(),
      ]);

      const idsEncontristas = vinculos
        .filter((v) => v.pessoaTipo === 'encontrista')
        .map((v) => v.pessoaId);
      const idsEncontreiros = vinculos
        .filter((v) => v.pessoaTipo === 'encontreiro')
        .map((v) => v.pessoaId);

      const [listaEncontristas, listaEncontreiros] = await Promise.all([
        idsEncontristas.length
          ? Cadastro.find({ _id: { $in: idsEncontristas } })
            .select('nomeCompleto telefone email ejc bairro foto logradouro dataNascimento instagram')
            .lean()
          : [],
        idsEncontreiros.length
          ? Encontro.find({ _id: { $in: idsEncontreiros } })
            .select('nomeCompleto tipo tiosCategoria tiosGrupoId telefone email ejc bairro foto logradouro dataNascimento instagram')
            .lean()
          : [],
      ]);

      const mapEncontristas = new Map(listaEncontristas.map((p) => [String(p._id), p]));
      const mapEncontreiros = new Map(listaEncontreiros.map((p) => [String(p._id), p]));

      const groups = [
        ...circulos.map((c) => ({ tipo: 'circulo', id: String(c._id), nome: c.nome || 'Sem nome' })),
        ...equipes.map((e) => ({ tipo: 'equipe', id: String(e._id), nome: e.nome || 'Sem nome' })),
      ];

      const sanitizeFilePart = (value, fallback) => {
        const clean = String(value || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9_-]+/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '')
          .toLowerCase();
        return clean || fallback;
      };

      const fileName = `quadrante_${sanitizeFilePart(ejc.nome, 'ejc')}.pdf`;
      const groupsWithEntries = groups.map((group) => {
        const vinculosGrupo = vinculos.filter(
          (v) => v.entidadeTipo === group.tipo && String(v.entidadeId) === group.id
        );

        const entries = vinculosGrupo.map((v) => {
          const pessoa = v.pessoaTipo === 'encontrista'
            ? mapEncontristas.get(String(v.pessoaId))
            : mapEncontreiros.get(String(v.pessoaId));

          return buildPdfEntryFromVinculo(v, pessoa, ejc.nome);
        });

        return {
          tipo: group.tipo,
          nome: group.nome,
          entries,
        };
      });

      renderEstruturasPdf(res, {
        fileName,
        mainTitle: `Quadrante - ${ejc.nome}`,
        groups: groupsWithEntries,
      });
      return;
    } catch (err) {
      console.error('Erro ao exportar quadrante do EJC:', err);
      return res.status(500).send('Erro ao exportar quadrante.');
    }
  });

  // POST /admin/remover-vinculo/:id - Remove vinculo de pessoa em circulo/equipe
  router.post('/remover-vinculo/:id', checkAdminAuth, requireAdminPermission('encontros.gerenciar'), async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, error: 'ID do vínculo inválido.' });
      }

      const vinculo = await VinculoEncontro.findById(id);
      if (!vinculo) {
        return res.status(404).json({ success: false, error: 'Vínculo não encontrado.' });
      }

      if (vinculo.entidadeTipo === 'equipe' && vinculo.pessoaTipo === 'encontreiro') {
        const equipe = await Equipe.findById(vinculo.entidadeId).lean();
        const nomeEquipe = equipe?.nomeReferencia || equipe?.nome;
        if (nomeEquipe) {
          const field = ['coordenou', 'coordenador'].includes(vinculo.papel) ? 'equipeCoordenou' : 'equipeServiu';
          await Encontro.updateOne({ _id: vinculo.pessoaId }, { $pull: { [field]: nomeEquipe } });
        }
      }

      await VinculoEncontro.findByIdAndDelete(id);
      return res.json({ success: true });
    } catch (err) {
      console.error('Erro ao remover vínculo:', err);
      return res.status(500).json({ success: false, error: 'Erro ao remover vínculo.' });
    }
  });

  // POST /admin/deletar-equipe/:id - Deletar equipe e limpar vinculos
  router.post('/deletar-equipe/:id', checkAdminAuth, requireAdminPermission('equipes.gerenciar'), async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, error: 'ID da equipe invalido.' });
      }

      const equipe = await Equipe.findById(id);
      if (!equipe) {
        return res.status(404).json({ success: false, error: 'Equipe nao encontrada.' });
      }

      const nomeEquipe = equipe.nomeReferencia || equipe.nome;
      await Equipe.findByIdAndDelete(id);

      // Remove referencias da equipe nos encontreiros.
      await Encontro.updateMany(
        {},
        {
          $pull: {
            equipeServiu: nomeEquipe,
            equipeCoordenou: nomeEquipe,
          },
        }
      );

      return res.json({ success: true, message: 'Equipe deletada com sucesso.' });
    } catch (err) {
      console.error('Erro ao deletar equipe:', err);
      return res.status(500).json({ success: false, error: 'Erro ao deletar equipe.' });
    }
  });

  // POST /admin/vincular-encontreiro-equipe - Vincular encontreiro em equipe
  router.post('/vincular-encontreiro-equipe', checkAdminAuth, requireAdminPermission('equipes.gerenciar'), async (req, res) => {
    try {
      const encontreiroId = normalizeTextInput(req.body.encontreiroId || req.body.pessoaId);
      const equipeId = normalizeTextInput(req.body.equipeId);
      const equipeNome = normalizeTextInput(req.body.equipeNome);
      const papel = normalizeTextInput(req.body.papel).toLowerCase();

      if (!mongoose.Types.ObjectId.isValid(encontreiroId)) {
        return res.status(400).json({ success: false, error: 'Encontreiro invalido.' });
      }

      if (!equipeId && !equipeNome) {
        return res.status(400).json({ success: false, error: 'Equipe obrigatoria.' });
      }

      if (!['serviu', 'coordenou'].includes(papel)) {
        return res.status(400).json({ success: false, error: 'Papel invalido. Use serviu ou coordenou.' });
      }

      let equipe = null;
      if (equipeId && mongoose.Types.ObjectId.isValid(equipeId)) {
        equipe = await Equipe.findById(equipeId);
      }
      if (!equipe && equipeNome) {
        equipe = await Equipe.findOne({ nomeNormalizado: equipeNome.toLowerCase() });
      }
      if (!equipe) {
        return res.status(404).json({ success: false, error: 'Equipe nao encontrada.' });
      }

      const encontreiro = await Encontro.findById(encontreiroId);
      if (!encontreiro) {
        return res.status(404).json({ success: false, error: 'Encontreiro nao encontrado.' });
      }

      const field = papel === 'serviu' ? 'equipeServiu' : 'equipeCoordenou';
      const atual = Array.isArray(encontreiro[field]) ? encontreiro[field] : [];
      const nomeVinculo = equipe.nomeReferencia || equipe.nome;
      if (!atual.includes(nomeVinculo)) {
        atual.push(nomeVinculo);
        encontreiro[field] = atual;
        await encontreiro.save();
      }

      return res.json({ success: true, message: 'Encontreiro vinculado a equipe com sucesso.' });
    } catch (err) {
      console.error('Erro ao vincular equipe:', err);
      return res.status(500).json({ success: false, error: 'Erro ao vincular equipe.' });
    }
  });

  // POST /admin/importar-cadastros - Importar somente cadastros de encontreiros
  router.post('/importar-cadastros', checkAdminAuth, requireAdminPermission('importacao.executar'), importUploadSingle, async (req, res) => {
    const summary = {
      totalLidos: 0,
      importados: 0,
      atualizados: 0,
      ignoradosExistentes: 0,
      ignoradosDuplicadosImportacao: 0,
      ignoradosSemCampos: 0,
      ignoradosSemFoto: 0,
      ignoradosTipoInvalido: 0,
      placeholdersNome: 0,
      placeholdersEmail: 0,
      erros: 0,
    };

    const importRows = [];
    let externalConnection;
    let sqlConnection;

    const appendRowsFromPdf = async (buffer, fotoPadrao) => {
      let pdfParse;
      try {
        pdfParse = require('pdf-parse');
      } catch (err) {
        throw new Error('Leitura de PDF indisponivel. Instale a dependencia "pdf-parse".');
      }

      const data = await pdfParse(buffer);
      const text = String(data.text || '').replace(/\r/g, '');

      if (!text.trim()) {
        throw new Error('Nao foi possivel extrair texto do PDF. Verifique se o arquivo nao e imagem escaneada.');
      }

      const normalizePdfKey = (value) => String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');

      const mapPdfKeyToField = (rawKey) => {
        const key = normalizePdfKey(rawKey);
        if (['nome', 'nomecompleto'].includes(key)) return 'nomeCompleto';
        if (['logradouro', 'endereco', 'rua'].includes(key)) return 'logradouro';
        if (['bairro'].includes(key)) return 'bairro';
        if (['email', 'e-mail', 'mail'].includes(key)) return 'email';
        if (['telefone', 'celular', 'fone', 'whatsapp'].includes(key)) return 'telefone';
        if (['niver', 'nascimento', 'datanascimento'].includes(key)) return 'niver';
        if (['ejc', 'ejcpertence', 'qualejcpertence'].includes(key)) return 'ejc';
        if (['tipo', 'sexo', 'genero'].includes(key)) return 'tipo';
        return '';
      };

      const parseLabeledBlock = (block) => {
        const row = {
          nomeCompleto: '',
          logradouro: '',
          bairro: '',
          email: '',
          telefone: '',
          niver: '',
          ejc: '',
          tipo: '',
          foto: fotoPadrao,
        };

        const lines = block.split('\n').map((line) => normalizeTextInput(line)).filter(Boolean);
        lines.forEach((line) => {
          const match = line.match(/^([^:\n]{2,40})\s*:\s*(.+)$/);
          if (!match) return;
          const mappedField = mapPdfKeyToField(match[1]);
          if (!mappedField) return;
          row[mappedField] = normalizeTextInput(match[2]);
        });

        if (!row.nomeCompleto) {
          row.nomeCompleto = extractPdfField(block, ['Nome Completo', 'Nome']);
        }
        if (!row.logradouro) row.logradouro = extractPdfField(block, ['Logradouro', 'Endereco', 'Rua']);
        if (!row.bairro) row.bairro = extractPdfField(block, ['Bairro']);
        if (!row.email) row.email = extractPdfField(block, ['Email', 'E-mail']);
        if (!row.telefone) row.telefone = extractPdfField(block, ['Telefone', 'Celular']);
        if (!row.niver) row.niver = extractPdfField(block, ['Niver', 'Nascimento', 'Data Nascimento']);
        if (!row.ejc) row.ejc = extractPdfField(block, ['EJC', 'Qual EJC Pertence']);
        if (!row.tipo) row.tipo = extractPdfField(block, ['Tipo', 'Genero', 'Sexo']);

        return row;
      };

      const namedBlocks = text
        .split(/\n(?=\s*(?:Nome\s*:?|Nome Completo\s*:))/i)
        .map((item) => item.trim())
        .filter(Boolean);

      const genericBlocks = text
        .split(/\n\s*\n+/)
        .map((item) => item.trim())
        .filter(Boolean);

      const candidateBlocks = namedBlocks.length ? namedBlocks : genericBlocks;
      candidateBlocks.forEach((block) => {
        const row = parseLabeledBlock(block);
        if (!row.nomeCompleto) return;
        const hasAnySecondary = row.email || row.telefone || row.logradouro || row.bairro || row.niver || row.ejc || row.tipo;
        if (!hasAnySecondary) return;
        importRows.push(row);
      });

      if (importRows.length === 0) {
        const lines = text.split('\n').map((line) => normalizeTextInput(line)).filter(Boolean);
        const splitColumns = (line) => {
          if (line.includes(';')) return line.split(';').map((cell) => normalizeTextInput(cell));
          if (line.includes('|')) return line.split('|').map((cell) => normalizeTextInput(cell));
          if (line.includes('\t')) return line.split('\t').map((cell) => normalizeTextInput(cell));
          if (line.includes(',')) return line.split(',').map((cell) => normalizeTextInput(cell));
          return [];
        };

        const headerIndex = lines.findIndex((line) => {
          const cols = splitColumns(line).map((col) => normalizePdfKey(col));
          if (!cols.length) return false;
          const hasNome = cols.some((col) => col === 'nome' || col === 'nomecompleto');
          const hasEmail = cols.some((col) => col === 'email' || col === 'emailprincipal' || col === 'e-mail');
          return hasNome || hasEmail;
        });

        if (headerIndex >= 0) {
          const headers = splitColumns(lines[headerIndex]);
          for (let i = headerIndex + 1; i < lines.length; i += 1) {
            const cols = splitColumns(lines[i]);
            if (!cols.length) continue;
            const payload = { foto: fotoPadrao };

            headers.forEach((header, idx) => {
              const mappedField = mapPdfKeyToField(header);
              if (!mappedField) return;
              payload[mappedField] = normalizeTextInput(cols[idx]);
            });

            if (normalizeTextInput(payload.nomeCompleto)) {
              importRows.push(payload);
            }
          }
        }
      }
    };

    const appendRowsFromExcel = async (buffer) => {
      const Excel = require('exceljs');
      const workbook = new Excel.Workbook();
      await workbook.xlsx.load(buffer);

      const normalizeExcelKey = (value) => String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');

      const readExcelCellValue = (value) => {
        if (value instanceof Date) return value;
        if (value && typeof value === 'object') {
          if (Object.prototype.hasOwnProperty.call(value, 'result')) return value.result;
          if (Object.prototype.hasOwnProperty.call(value, 'text')) return value.text;
          if (Array.isArray(value.richText)) {
            return value.richText.map((item) => item && item.text ? item.text : '').join('');
          }
        }
        return value;
      };

      const mapExcelHeaderToField = (header) => {
        const key = normalizeExcelKey(header);
        if (!key) return '';

        if (['nome', 'nomecompleto'].includes(key)) return 'nomeCompleto';
        if (['logradouro', 'endereco', 'rua'].includes(key)) return 'logradouro';
        if (['bairro'].includes(key)) return 'bairro';
        if (['telefone', 'celular', 'fone', 'whatsapp'].includes(key)) return 'telefone';
        if (['email', 'mail', 'emailprincipal'].includes(key)) return 'email';
        if (['tipo', 'tipodeencontreiro', 'tipoencontreiro', 'tipodeinscricao'].includes(key)) return 'tipo';
        if (['genero', 'sexo'].includes(key)) return 'genero';
        if (['niver', 'nascimento', 'datanascimento'].includes(key)) return 'niver';
        if (['ejc', 'qualejcpertence', 'ejcpertence'].includes(key)) return 'ejc';
        if (['instagram', 'insta'].includes(key)) return 'instagram';
        if (['foto', 'photo', 'imagem'].includes(key)) return 'foto';
        if (['tioscategoria', 'categoriatios'].includes(key)) return 'tiosCategoria';
        if (['tiosgrupoid', 'grupoid'].includes(key)) return 'tiosGrupoId';
        if (['origemtios', 'origem'].includes(key)) return 'origemTios';
        return '';
      };

      const isPayloadEmpty = (payload) => !Object.values(payload).some((value) => normalizeTextInput(value));

      workbook.worksheets.forEach((sheet) => {
        if (sheet.rowCount < 2) return;

        // Formato tradicional: campos no cabecalho da primeira linha.
        const rowHeaderMap = {};
        const headerRow = sheet.getRow(1);
        for (let col = 1; col <= sheet.columnCount; col += 1) {
          const rawHeader = readExcelCellValue(headerRow.getCell(col).value);
          const mappedField = mapExcelHeaderToField(rawHeader);
          if (mappedField) rowHeaderMap[col] = mappedField;
        }

        let addedByRows = 0;
        if (Object.keys(rowHeaderMap).length >= 2) {
          for (let rowIdx = 2; rowIdx <= sheet.rowCount; rowIdx += 1) {
            const row = sheet.getRow(rowIdx);
            const payload = {};

            Object.entries(rowHeaderMap).forEach(([col, field]) => {
              const rawValue = readExcelCellValue(row.getCell(Number(col)).value);
              payload[field] = rawValue;
            });

            if (!isPayloadEmpty(payload)) {
              importRows.push(payload);
              addedByRows += 1;
            }
          }
        }

        if (addedByRows > 0) return;

        // Formato por coluna: campos na primeira coluna e cada coluna seguinte e um cadastro.
        const columnFieldMap = {};
        for (let rowIdx = 1; rowIdx <= sheet.rowCount; rowIdx += 1) {
          const fieldLabel = readExcelCellValue(sheet.getRow(rowIdx).getCell(1).value);
          const mappedField = mapExcelHeaderToField(fieldLabel);
          if (mappedField) columnFieldMap[rowIdx] = mappedField;
        }

        if (Object.keys(columnFieldMap).length < 2 || sheet.columnCount < 2) return;

        for (let col = 2; col <= sheet.columnCount; col += 1) {
          const payload = {};

          Object.entries(columnFieldMap).forEach(([rowIdx, field]) => {
            const rawValue = readExcelCellValue(sheet.getRow(Number(rowIdx)).getCell(col).value);
            payload[field] = rawValue;
          });

          if (!isPayloadEmpty(payload)) {
            importRows.push(payload);
          }
        }
      });
    };

    try {
      const sourceType = normalizeTextInput(req.body.sourceType || 'database').toLowerCase();
      const atualizarExistentes = normalizeBooleanInput(req.body.atualizarExistentes);
      const fotoPadrao = normalizeTextInput(req.body.fotoPadrao);

      const limiteInformado = Number.parseInt(req.body.limite, 10);
      const limite = Number.isFinite(limiteInformado)
        ? Math.min(Math.max(limiteInformado, 1), 5000)
        : 1000;

      if (!['database', 'excel', 'pdf'].includes(sourceType)) {
        return res.status(400).json({ success: false, error: 'Tipo de importacao invalido.' });
      }

      if (sourceType === 'database') {
        const dbEngine = normalizeTextInput(req.body.dbEngine || 'mongodb').toLowerCase();
        const connectionString = normalizeTextInput(req.body.connectionString || req.body.mongoUri);
        const databaseName = normalizeTextInput(req.body.databaseName);
        const colecaoEncontreiros = normalizeTextInput(req.body.colecaoEncontreiros || req.body.tableName) || 'Encontro';
        const sqlQuery = normalizeTextInput(req.body.sqlQuery);

        if (!connectionString) {
          return res.status(400).json({ success: false, error: 'A conexao com o banco externo e obrigatoria.' });
        }

        if (!['mongodb', 'postgresql', 'postgres', 'mysql'].includes(dbEngine)) {
          return res.status(400).json({ success: false, error: 'Banco nao suportado. Use MongoDB, PostgreSQL ou MySQL.' });
        }

        if (dbEngine === 'mongodb') {
          if (!/^mongodb(\+srv)?:\/\//i.test(connectionString)) {
            return res.status(400).json({ success: false, error: 'Para MongoDB use uma URI valida (mongodb:// ou mongodb+srv://).' });
          }

          externalConnection = await mongoose.createConnection(connectionString, {
            dbName: databaseName || undefined,
            serverSelectionTimeoutMS: 12000,
            maxPoolSize: 5,
          }).asPromise();

          const externalDb = externalConnection.db;
          const registros = await externalDb.collection(colecaoEncontreiros).find({}).limit(limite).toArray();
          registros.forEach((item) => importRows.push(item));
        }

        if (dbEngine === 'postgresql' || dbEngine === 'postgres') {
          let PgClient;
          try {
            ({ Client: PgClient } = require('pg'));
          } catch (err) {
            return res.status(500).json({ success: false, error: 'Dependencia "pg" nao instalada. Rode: npm install pg' });
          }

          if (!/^postgres(ql)?:\/\//i.test(connectionString)) {
            return res.status(400).json({ success: false, error: 'Para PostgreSQL use uma string de conexao valida (postgresql://).' });
          }

          sqlConnection = new PgClient({ connectionString });
          await sqlConnection.connect();

          const safeTable = colecaoEncontreiros;
          if (!sqlQuery && !/^[a-zA-Z0-9_.]+$/.test(safeTable)) {
            return res.status(400).json({ success: false, error: 'Nome da tabela invalido.' });
          }

          const queryResult = sqlQuery
            ? await sqlConnection.query(sqlQuery)
            : await sqlConnection.query(`SELECT * FROM ${safeTable} LIMIT $1`, [limite]);

          queryResult.rows.forEach((item) => importRows.push(item));
        }

        if (dbEngine === 'mysql') {
          let mysql;
          try {
            mysql = require('mysql2/promise');
          } catch (err) {
            return res.status(500).json({ success: false, error: 'Dependencia "mysql2" nao instalada. Rode: npm install mysql2' });
          }

          if (!/^mysql:\/\//i.test(connectionString)) {
            return res.status(400).json({ success: false, error: 'Para MySQL use uma string de conexao valida (mysql://).' });
          }

          sqlConnection = await mysql.createConnection(connectionString);

          const safeTable = colecaoEncontreiros;
          if (!sqlQuery && !/^[a-zA-Z0-9_.]+$/.test(safeTable)) {
            return res.status(400).json({ success: false, error: 'Nome da tabela invalido.' });
          }

          const [rows] = sqlQuery
            ? await sqlConnection.query(sqlQuery)
            : await sqlConnection.query(`SELECT * FROM ${safeTable} LIMIT ?`, [limite]);

          rows.forEach((item) => importRows.push(item));
        }
      } else {
        if (!req.file) {
          return res.status(400).json({ success: false, error: 'Envie um arquivo para importacao.' });
        }

        const ext = path.extname(req.file.originalname || '').toLowerCase();
        if (sourceType === 'excel') {
          if (!['.xlsx', '.xlsm', '.xls'].includes(ext)) {
            return res.status(400).json({ success: false, error: 'Arquivo invalido. Use .xlsx, .xlsm ou .xls.' });
          }
          await appendRowsFromExcel(req.file.buffer);
        } else if (sourceType === 'pdf') {
          if (ext !== '.pdf') {
            return res.status(400).json({ success: false, error: 'Arquivo invalido. Use .pdf.' });
          }
          await appendRowsFromPdf(req.file.buffer, fotoPadrao);
        }

        if (!importRows.length) {
          const baseError = 'Nenhum registro foi encontrado na origem informada.';
          const pdfHint = sourceType === 'pdf'
            ? ' Verifique se o PDF possui texto selecionavel e campos como Nome/Email.'
            : '';
          return res.status(400).json({
            success: false,
            error: `${baseError}${pdfHint}`,
          });
        }
      }

      summary.totalLidos = importRows.length;

      // Em importacao por arquivo, assume "jovens" quando o tipo nao vier informado.
      const defaultTipoImportacao = sourceType === 'database' ? '' : 'jovens';
      const fallbackFotoImportacao = normalizeTextInput(fotoPadrao) || ensureImportPlaceholderImage();
      const seenImportKeys = new Set();

      for (let index = 0; index < importRows.length; index += 1) {
        const rawRow = importRows[index];
        try {
          const row = mapToEncontroPayload(rawRow, fotoPadrao, {
            defaultTipo: defaultTipoImportacao,
            fallbackFoto: fallbackFotoImportacao,
          });

          if (!row.nomeCompleto) {
            row.nomeCompleto = `Importado sem nome #${index + 1}`;
            summary.placeholdersNome += 1;
          }

          if (!row.email) {
            row.email = `importado-sem-email-${Date.now()}-${index + 1}@pendente.local`;
            summary.placeholdersEmail += 1;
          }

          const dedupEmail = row.email && !String(row.email).includes('@pendente.local')
            ? String(row.email).toLowerCase()
            : '';
          const dedupPhone = normalizePhoneDigits(row.telefone);
          const dedupName = normalizeTextInput(row.nomeCompleto).toLowerCase();
          const dedupKey = [dedupEmail || '-', dedupPhone || '-', dedupName || '-'].join('|');

          if (seenImportKeys.has(dedupKey)) {
            summary.ignoradosDuplicadosImportacao += 1;
            continue;
          }
          seenImportKeys.add(dedupKey);

          if (!row.tipo) {
            summary.ignoradosTipoInvalido += 1;
            continue;
          }

          const existente = await findExistingByNameOrEmail(Encontro, row.nomeCompleto, row.email, row.telefone);

          if (existente) {
            if (!atualizarExistentes) {
              summary.ignoradosExistentes += 1;
              continue;
            }

            Object.assign(existente, row);
            if (!existente.foto) {
              summary.ignoradosSemFoto += 1;
              continue;
            }

            await existente.save();
            summary.atualizados += 1;
            continue;
          }

          if (!row.foto) {
            summary.ignoradosSemFoto += 1;
            continue;
          }

          await Encontro.create(row);
          summary.importados += 1;
        } catch (err) {
          summary.erros += 1;
        }
      }

      await logAdminAction(req, {
        action: 'importar_cadastros_encontreiros',
        targetType: 'encontreiro',
        metadata: {
          sourceType,
          dbEngine: sourceType === 'database' ? normalizeTextInput(req.body.dbEngine || 'mongodb').toLowerCase() : '',
          summary,
        },
      });

      return res.json({
        success: true,
        message: 'Importacao de encontreiros concluida.',
        sourceType,
        dbEngine: sourceType === 'database' ? normalizeTextInput(req.body.dbEngine || 'mongodb').toLowerCase() : null,
        summary,
      });
    } catch (err) {
      await logAdminAction(req, {
        action: 'importar_cadastros_encontreiros',
        targetType: 'encontreiro',
        status: 'error',
        metadata: {
          erro: err.message,
          sourceType: normalizeTextInput(req.body.sourceType),
        },
      });
      console.error('Erro ao importar encontreiros:', err);
      return res.status(500).json({
        success: false,
        error: 'Nao foi possivel importar os encontreiros. Verifique os dados informados.',
        details: process.env.NODE_ENV === 'development' ? String(err.message || err) : undefined,
      });
    } finally {
      if (externalConnection) {
        try {
          await externalConnection.close();
        } catch (closeErr) {
          console.error('Falha ao fechar conexao externa:', closeErr);
        }
      }

      if (sqlConnection && typeof sqlConnection.end === 'function') {
        try {
          await sqlConnection.end();
        } catch (closeErr) {
          console.error('Falha ao fechar conexao SQL externa:', closeErr);
        }
      }
    }
  });

  return router;
};
