const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const webpush = require('web-push');

const PENDING_APPROVAL_STATUSES = ['pendente', 'pendente_contato', 'documentacao_pendente', 'remanejado'];

const buildEventLinkPayload = (ejc) => {
  if (!ejc?._id) {
    return {
      ejcVinculadoId: null,
      ejcVinculadoNome: '',
    };
  }

  return {
    ejcVinculadoId: ejc._id,
    ejcVinculadoNome: normalizeTextInput(ejc.nome),
  };
};

module.exports = (deps) => {
  const {
    vapidKeys,
    Subscription,
    Cadastro,
    Encontro,
    Ejc,
    Admin,
    getEncontroAtivo,
    invalidarCacheEncontroAtivo,
    upload,
    checkAdminAuth,
    verificarFormularioBloqueado,
    normalizeTextInput,
    normalizeBooleanInput,
    normalizePhoneDigits,
    normalizeStringArrayInput,
    normalizeTipoEncontro,
    normalizeGeneroEncontro,
    normalizeMultiField,
    parseDateInput,
    findExistingByNameOrEmail,
    logAdminAction,
    clearTiosCoupleLink,
    linkTiosCouple,
    createTiosGroupId,
    getClientIp,
  } = deps;

  // Middleware para verificar bloqueio de formulário encontrista
  const middlewareVerificaBloqueoEncontrista = async (req, res, next) => {
    try {
      console.log('[MIDDLEWARE] Verificando bloqueio de encontrista...');
      const bloqueio = await verificarFormularioBloqueado('encontrista');
      console.log('[MIDDLEWARE] Resultado do bloqueio:', bloqueio);
      
      if (bloqueio.bloqueado) {
        console.log('[MIDDLEWARE] Encontrista bloqueado!');
        const isJson = req.headers.accept && req.headers.accept.includes('application/json');
        const allErrors = [{ msg: bloqueio.motivo || 'Formulário de encontrista está bloqueado temporariamente' }];
        
        if (isJson) {
          return res.status(403).json({ success: false, errors: allErrors });
        }
        return res.render('inscricao', {
          errors: allErrors,
          formData: req.body,
          bloqueado: true,
          motivoBloqueio: bloqueio.motivo || 'Formulário de encontrista está bloqueado temporariamente',
        });
      }

      next();
    } catch (err) {
      console.error('[MIDDLEWARE] Erro ao verificar bloqueio:', err);
      next();
    }
  };

  // Middleware para verificar bloqueio de formulário encontreiro
  const middlewareVerificaBloqueoEncontreiro = async (req, res, next) => {
    try {
      console.log('[MIDDLEWARE] Verificando bloqueio de encontreiro...');
      const bloqueio = await verificarFormularioBloqueado('encontreiro');
      console.log('[MIDDLEWARE] Resultado do bloqueio:', bloqueio);
      
      if (bloqueio.bloqueado) {
        console.log('[MIDDLEWARE] Encontreiro bloqueado!');
        const isJson = req.headers.accept && req.headers.accept.includes('application/json');
        const allErrors = [{ msg: bloqueio.motivo || 'Formulário de encontreiro está bloqueado temporariamente' }];
        
        if (isJson) {
          return res.status(403).json({ success: false, errors: allErrors });
        }
        return res.render('encontro', {
          errors: allErrors,
          formData: req.body,
          bloqueado: true,
          motivoBloqueio: bloqueio.motivo || 'Formulário de encontreiro está bloqueado temporariamente',
        });
      }

      next();
    } catch (err) {
      console.error('[MIDDLEWARE] Erro ao verificar bloqueio:', err);
      next();
    }
  };

  router.get('/', (req, res) => {
    // renderizar tela de escolha de tipo de inscrição
    res.render('index');
  });

  router.get('/index', (req, res) => {
    res.render('index');
  });

  // expose VAPID public key to clients
  router.get('/vapidPublicKey', (req, res) => {
    res.send(vapidKeys.publicKey);
  });

  // store push subscription from client
  router.post('/subscribe', express.json(), async (req, res) => {
    try {
      const sub = req.body;
      await Subscription.updateOne({ endpoint: sub.endpoint }, sub, { upsert: true });
      res.status(201).json({});
    } catch (err) {
      console.error('subscribe error', err);
      res.status(500).json({ error: 'Failed to save subscription' });
    }
  });

  router.get('/inscricao', async (req, res) => {
    try {
      const [encontroAtivo, bloqueio] = await Promise.all([
        getEncontroAtivo(),
        verificarFormularioBloqueado('encontrista'),
      ]);
      res.render('inscricao', {
        errors: [],
        formData: {},
        bloqueado: bloqueio.bloqueado,
        motivoBloqueio: bloqueio.motivo,
        ejcAtivo: encontroAtivo?.nome || '',
      });
    } catch (err) {
      res.render('inscricao', {
        errors: [],
        formData: {},
        bloqueado: false,
        motivoBloqueio: '',
        ejcAtivo: '',
      });
    }
  });

  // DEBUG: Endpoint temporário para verificar encontreiros
  router.get('/debug/encontreiros', checkAdminAuth, async (req, res) => {
    try {
      const total = await Encontro.countDocuments();
      const pendentes = await Encontro.countDocuments({ statusAprovacao: { $in: PENDING_APPROVAL_STATUSES } });
      const aprovados = await Encontro.countDocuments({ aprovado: true });
      const porTipo = await Encontro.aggregate([
        { $group: { _id: '$tipo', count: { $sum: 1 } } }
      ]);
      
      res.json({
        total,
        pendentes,
        aprovados,
        porTipo,
        amostra: await Encontro.find().limit(3).lean().select('nomeCompleto tipo aprovado')
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/encontro', async (req, res) => {
    try {
      const conviteParam = String(req.query.convite || '').trim();
      const [encontroAtivo, bloqueio] = await Promise.all([
        getEncontroAtivo(),
        verificarFormularioBloqueado('encontreiro'),
      ]);

      // Valida o token de convite para liberar o acesso mesmo com bloqueio ativo.
      let conviteValido = false;
      if (conviteParam && encontroAtivo) {
        const tokenSalvo = normalizeTextInput(encontroAtivo.conviteEnconteiroToken);
        const tokenExp = encontroAtivo.conviteEnconteiroTokenExp;
        const tokenExpirado = tokenExp ? new Date() > new Date(tokenExp) : false;
        if (tokenSalvo && tokenSalvo === conviteParam && !tokenExpirado) {
          conviteValido = true;
        }
      }

      res.render('encontro', {
        errors: [],
        formData: {},
        bloqueado: conviteValido ? false : bloqueio.bloqueado,
        motivoBloqueio: conviteValido ? '' : bloqueio.motivo,
        ejcAtivo: encontroAtivo?.nome || '',
      });
    } catch (err) {
      res.render('encontro', {
        errors: [],
        formData: {},
        bloqueado: false,
        motivoBloqueio: '',
        ejcAtivo: '',
      });
    }
  });

  router.get('/api/encontro-ativo', async (req, res) => {
    try {
      const encontroAtivo = await getEncontroAtivo();
      if (!encontroAtivo) {
        return res.status(404).json({ success: false, error: 'Nenhum encontro ativo foi criado ainda.' });
      }

      return res.json({
        success: true,
        ejcId: String(encontroAtivo._id),
        ejcNome: encontroAtivo.nome,
      });
    } catch (err) {
      console.error('Erro ao buscar encontro ativo:', err.message);
      return res.status(500).json({ success: false, error: 'Erro ao carregar encontro ativo.' });
    }
  });

  router.get('/api/tios-disponiveis', async (req, res) => {
    try {
      const ignoreId = normalizeTextInput(req.query.ignoreId);
      const filter = { tipo: 'tios' };
      if (mongoose.Types.ObjectId.isValid(ignoreId)) {
        filter._id = { $ne: ignoreId };
      }

      const tios = await Encontro.find(filter)
        .sort({ nomeCompleto: 1 })
        .select('nomeCompleto tiosCategoria tiosGrupoId tioParceiroId genero')
        .lean();

      return res.json({
        success: true,
        items: tios.map((item) => ({
          id: String(item._id),
          nomeCompleto: item.nomeCompleto || 'Sem nome',
          tiosCategoria: item.tiosCategoria || 'solo',
          tiosGrupoId: item.tiosGrupoId || '',
          tioParceiroId: item.tioParceiroId ? String(item.tioParceiroId) : '',
          genero: item.genero || '',
        })),
      });
    } catch (err) {
      console.error('Erro ao listar tios disponiveis:', err);
      return res.status(500).json({ success: false, error: 'Erro ao listar tios disponiveis.' });
    }
  });

  router.post(
    '/inscricao',
    middlewareVerificaBloqueoEncontrista,
    upload.single('foto'),
    [
      body('nomeCompleto').notEmpty().withMessage('Nome completo é obrigatório'),
      body('logradouro').notEmpty().withMessage('Logradouro é obrigatório'),
      body('cep').notEmpty().withMessage('CEP é obrigatório'),
      body('estadoCivil').notEmpty().withMessage('Estado civil é obrigatório'),
      body('nomeMae').notEmpty().withMessage('Nome da mãe é obrigatório'),
      body('telefoneMae').notEmpty().withMessage('Telefone da mãe é obrigatório'),
      body('nomePai').notEmpty().withMessage('Nome do pai é obrigatório'),
      body('telefonePai').notEmpty().withMessage('Telefone do pai é obrigatório'),
      body('paroquiaFrequenta').notEmpty().withMessage('Paróquia é obrigatória'),
      body('participaMovimentoIgreja').notEmpty().withMessage('Movimento da igreja é obrigatório'),
      body('conhecidoInscricaoHoje').notEmpty().withMessage('Informe conhecido na inscrição de hoje'),
      body('conhecidoFezEjc').notEmpty().withMessage('Informe conhecido que já fez EJC'),
      body('inscricaoAnterior').notEmpty().withMessage('Informe inscrição anterior'),
      body('instrumentoMusical').notEmpty().withMessage('Campo de instrumento musical é obrigatório'),
      body('expectativaXixEjcCop').notEmpty().withMessage('Campo de expectativa é obrigatório'),
      body('bairro').notEmpty().withMessage('Bairro é obrigatório'),
      body('dataNascimento').notEmpty().withMessage('Data de nascimento é obrigatória'),
      body('telefone').notEmpty().withMessage('Telefone é obrigatório'),
      body('ehAlergico').optional({ checkFalsy: true }).isIn(['sim', 'nao']).withMessage('Campo de alergia inválido'),
      body('alergiaDescricao').custom((value, { req }) => {
        const ehAlergico = normalizeTextInput(req.body.ehAlergico).toLowerCase() === 'sim';
        if (ehAlergico && !normalizeTextInput(value)) {
          throw new Error('Se for alergico, informe a alergia.');
        }
        return true;
      }),
      body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email inválido'),
      body('lgpdConsentimento').custom((value) => {
        const ok = value === true || value === 'true' || value === 'on' || value === '1';
        if (!ok) throw new Error('É obrigatório aceitar os termos de privacidade (LGPD).');
        return true;
      }),
    ],
    async (req, res) => {
      console.log('[INFO] POST /inscricao - Requisição recebida');
      const errors = validationResult(req);
      const isJson = req.headers.accept && req.headers.accept.includes('application/json');
      if (!errors.isEmpty()) {
        const allErrors = errors.array();

        if (isJson) {
          return res.status(400).json({ success: false, errors: allErrors });
        } else {
          return res.render('inscricao', {
            errors: allErrors,
            formData: req.body,
          });
        }
      }

      try {
        const encontroAtivo = await getEncontroAtivo();
        if (!encontroAtivo) {
          const allErrors = [{ msg: 'Nenhum encontro ativo foi criado ainda. Aguarde a abertura do proximo EJC.' }];
          if (isJson) {
            return res.status(400).json({ success: false, errors: allErrors });
          }
          return res.render('inscricao', {
            errors: allErrors,
            formData: req.body,
          });
        }

        const eventLinkData = buildEventLinkPayload(encontroAtivo);
        const cadastroExistente = await findExistingByNameOrEmail(
          Cadastro,
          req.body.nomeCompleto,
          req.body.email || '',
          req.body.telefone
        );
        const lgpdConsentimento = req.body.lgpdConsentimento === 'true'
          || req.body.lgpdConsentimento === 'on'
          || req.body.lgpdConsentimento === '1'
          || req.body.lgpdConsentimento === true;

        if (!req.file && !cadastroExistente) {
          const allErrors = [{ msg: 'Foto é obrigatória' }];
          if (isJson) {
            return res.status(400).json({ success: false, errors: allErrors });
          }
          return res.render('inscricao', {
            errors: allErrors,
            formData: req.body,
          });
        }

        const cadastroData = {
          nomeCompleto: req.body.nomeCompleto,
          comoQuerSerChamado: req.body.comoQuerSerChamado || '',
          ejc: normalizeTextInput(req.body.ejc) || cadastroExistente?.ejc || 'Nao informado',
          ...eventLinkData,
          cep: req.body.cep || '',
          estadoCivil: req.body.estadoCivil || '',
          nomeMae: req.body.nomeMae || '',
          telefoneMae: req.body.telefoneMae || '',
          nomePai: req.body.nomePai || '',
          telefonePai: req.body.telefonePai || '',
          paroquiaFrequenta: req.body.paroquiaFrequenta || '',
          participaMovimentoIgreja: req.body.participaMovimentoIgreja || '',
          conhecidoInscricaoHoje: req.body.conhecidoInscricaoHoje || '',
          conhecidoFezEjc: req.body.conhecidoFezEjc || '',
          inscricaoAnterior: req.body.inscricaoAnterior || '',
          instrumentoMusical: req.body.instrumentoMusical || '',
          expectativaXixEjcCop: req.body.expectativaXixEjcCop || '',
          logradouro: req.body.logradouro,
          bairro: req.body.bairro,
          dataNascimento: req.body.dataNascimento,
          telefone: req.body.telefone,
          intolerante: req.body.intolerante || '',
          ehAlergico: normalizeTextInput(req.body.ehAlergico).toLowerCase() === 'sim' ? 'sim' : 'nao',
          alergiaDescricao: normalizeTextInput(req.body.ehAlergico).toLowerCase() === 'sim' ? normalizeTextInput(req.body.alergiaDescricao) : '',
          email: req.body.email || '',
          instagram: req.body.instagram || '',
          aprovado: false,
          statusAprovacao: 'pendente',
          lgpdConsentimento,
          lgpdConsentimentoData: lgpdConsentimento ? new Date() : null,
          lgpdConsentimentoIp: lgpdConsentimento ? getClientIp(req) : '',
          dataCadastro: new Date(),
        };

        let cadastro;
        let created = false;
        if (cadastroExistente) {
          const updateData = { ...cadastroData };
          if (req.file) {
            if (cadastroExistente.foto) {
              const oldPhotoPath = path.join(__dirname, '..', 'uploads', cadastroExistente.foto);
              if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
              }
            }
            updateData.foto = req.file.filename;
          }

          cadastro = await Cadastro.findByIdAndUpdate(cadastroExistente._id, updateData, { new: true });
        } else {
          created = true;
          cadastro = new Cadastro({
            ...cadastroData,
            foto: req.file.filename,
          });
          await cadastro.save();
        }

        // notify subscribers about new registration
        const payload = JSON.stringify({
          title: 'Novo cadastro',
          body: `${cadastro.nomeCompleto} acabou de se inscrever!`
        });
        const subs = await Subscription.find().lean();
        subs.forEach(s => {
          webpush.sendNotification(s, payload).catch(err => {
            console.error('push send fail', err);
          });
        });

        if (isJson) {
          console.log('[INFO] Inscricao salva com sucesso - Enviando resposta JSON');
          return res.json({ success: true, created, updated: !created });
        } else {
          return res.render('success');
        }
      } catch (err) {
        console.error('[ERRO] Erro ao salvar inscricao:', err);
        if (isJson) {
          return res.status(500).json({ success: false, errors: [{ msg: 'Erro no servidor' }] });
        } else {
          return res.status(500).send('Erro no servidor');
        }
      }
    }
  );

  router.post(
    '/encontro',
    middlewareVerificaBloqueoEncontreiro,
    upload.single('foto'),
    [
      body('nomeCompleto').notEmpty().withMessage('Nome completo é obrigatório'),
      body('genero').isIn(['masculino', 'feminino', 'outros', 'homem', 'mulher']).withMessage('Gênero inválido'),
      body('tipo').isIn(['jovens', 'tios']).withMessage('Tipo inválido'),
      body('ejc').notEmpty().withMessage('Informe qual EJC você fez'),
      body('logradouro').notEmpty().withMessage('Logradouro é obrigatório'),
      body('bairro').notEmpty().withMessage('Bairro é obrigatório'),
      body('dataNascimento').notEmpty().withMessage('Data de nascimento é obrigatória'),
      body('telefone').notEmpty().withMessage('Telefone é obrigatório'),
      body('ehAlergico').optional({ checkFalsy: true }).isIn(['sim', 'nao']).withMessage('Campo de alergia inválido'),
      body('alergiaDescricao').custom((value, { req }) => {
        const ehAlergico = normalizeTextInput(req.body.ehAlergico).toLowerCase() === 'sim';
        if (ehAlergico && !normalizeTextInput(value)) {
          throw new Error('Se for alergico, informe a alergia.');
        }
        return true;
      }),
      body('email').isEmail().withMessage('Email inválido'),
      body('lgpdConsentimento').custom((value) => {
        const ok = value === true || value === 'true' || value === 'on' || value === '1';
        if (!ok) throw new Error('É obrigatório aceitar os termos de privacidade (LGPD).');
        return true;
      }),
    ],
    async (req, res) => {
      console.log('[INFO] POST /encontro - Requisição recebida');
      console.log(`   Tipo: ${req.body.tipo}, Nome: ${req.body.nomeCompleto}, Email: ${req.body.email}`);
      console.log(`   Foto: ${req.file ? req.file.filename : 'NENHUMA'}, OrigemTios: ${req.body.origemTios}`);
      
      const errors = validationResult(req);
      const isJson = req.headers.accept && req.headers.accept.includes('application/json');
      
      if (!errors.isEmpty()) {
        const allErrors = [...errors.array()];

        if (isJson) {
          return res.status(400).json({ success: false, errors: allErrors });
        } else {
          return res.render('encontro', {
            errors: allErrors,
            formData: req.body,
          });
        }
      }

      try {
        const encontroAtivo = await getEncontroAtivo();
        if (!encontroAtivo) {
          const allErrors = [{ msg: 'Nenhum encontro ativo foi criado ainda. Aguarde a abertura do proximo EJC.' }];
          if (isJson) {
            return res.status(400).json({ success: false, errors: allErrors });
          }
          return res.render('encontro', {
            errors: allErrors,
            formData: req.body,
          });
        }

        const eventLinkData = buildEventLinkPayload(encontroAtivo);
        const encontroExistente = await findExistingByNameOrEmail(
          Encontro,
          req.body.nomeCompleto,
          req.body.email || '',
          req.body.telefone
        );
        const lgpdConsentimento = req.body.lgpdConsentimento === 'true'
          || req.body.lgpdConsentimento === 'on'
          || req.body.lgpdConsentimento === '1'
          || req.body.lgpdConsentimento === true;

        if (!req.file && !encontroExistente) {
          const allErrors = [{ msg: 'Foto é obrigatória' }];
          if (isJson) {
            return res.status(400).json({ success: false, errors: allErrors });
          }
          return res.render('encontro', {
            errors: allErrors,
            formData: req.body,
          });
        }

        // Normalizar tipo para garantir que 'casal' seja convertido para 'tios'
        const tipoNormalizado = normalizeTipoEncontro(req.body.tipo);
        if (!tipoNormalizado) {
          const allErrors = [{ msg: 'Tipo de encontreiro inválido' }];
          if (isJson) {
            return res.status(400).json({ success: false, errors: allErrors });
          }
          return res.render('encontro', {
            errors: allErrors,
            formData: req.body,
          });
        }

        const encontroData = {
          nomeCompleto: req.body.nomeCompleto,
          comoQuerSerChamado: req.body.comoQuerSerChamado || '',
          genero: normalizeGeneroEncontro(req.body.genero),
          ejc: normalizeTextInput(req.body.ejc) || encontroExistente?.ejc || 'Nao informado',
          ...eventLinkData,
          qualEjcPertence: req.body.qualEjcPertence || '',
          tipo: tipoNormalizado,
          tiosCategoria: tipoNormalizado === 'tios' ? (normalizeTextInput(req.body.tiosCategoria).toLowerCase() === 'casal' ? 'casal' : 'solo') : '',
          origemTios: req.body.origemTios === 'true',
          tiosGrupoId: (tipoNormalizado === 'tios' && normalizeTextInput(req.body.tiosCategoria).toLowerCase() === 'casal')
            ? normalizeTextInput(req.body.tiosGrupoId)
            : '',
          tioParceiroId: (tipoNormalizado === 'tios' && normalizeTextInput(req.body.tiosCategoria).toLowerCase() === 'casal' && mongoose.Types.ObjectId.isValid(req.body.tioParceiroId))
            ? req.body.tioParceiroId
            : null,
          equipeServiu: normalizeMultiField(req.body.equipeServiu),
          equipeCoordenou: normalizeMultiField(req.body.equipeCoordenou),
          temVeiculoProprio: req.body.temVeiculoProprio === 'true' || req.body.temVeiculoProprio === true,
          logradouro: req.body.logradouro,
          bairro: req.body.bairro,
          dataNascimento: req.body.dataNascimento,
          telefone: req.body.telefone,
          intolerante: req.body.intolerante || '',
          ehAlergico: normalizeTextInput(req.body.ehAlergico).toLowerCase() === 'sim' ? 'sim' : 'nao',
          alergiaDescricao: normalizeTextInput(req.body.ehAlergico).toLowerCase() === 'sim' ? normalizeTextInput(req.body.alergiaDescricao) : '',
          email: req.body.email,
          temRelacionamento: req.body.temRelacionamento || '',
          instagram: req.body.instagram || '',
          observacoes: req.body.observacoes || '',
          aprovado: false,
          statusAprovacao: 'pendente',
          lgpdConsentimento,
          lgpdConsentimentoData: lgpdConsentimento ? new Date() : null,
          lgpdConsentimentoIp: lgpdConsentimento ? getClientIp(req) : '',
          dataCadastro: new Date(),
        };

        let encontro;
        let created = false;
        if (encontroExistente) {
          const updateData = { ...encontroData };
          if (req.file) {
            if (encontroExistente.foto) {
              const oldPhotoPath = path.join(__dirname, '..', 'uploads', encontroExistente.foto);
              if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
              }
            }
            updateData.foto = req.file.filename;
          }
          encontro = await Encontro.findByIdAndUpdate(encontroExistente._id, updateData, { new: true });
        } else {
          created = true;
          encontro = new Encontro({
            ...encontroData,
            foto: req.file.filename,
          });
          await encontro.save();
        }
        console.log(`   [OK] Encontro salvo no banco: ID=${encontro._id}, Tipo=${encontro.tipo}, Aprovado=${encontro.aprovado}, Foto=${encontro.foto}`);

        if (encontro.tipo === 'tios') {
          if (encontro.tiosCategoria === 'casal' && encontro.tioParceiroId) {
            const grupoIdSincronizado = await linkTiosCouple(encontro._id, encontro.tioParceiroId, encontro.tiosGrupoId);
            if (grupoIdSincronizado !== encontro.tiosGrupoId) {
              encontro = await Encontro.findById(encontro._id);
            }
          } else if (encontro.tiosCategoria !== 'casal') {
            await clearTiosCoupleLink(encontro._id);
            encontro = await Encontro.findById(encontro._id);
          }
        }

        const payload = JSON.stringify({
          title: 'Nova inscrição para Encontro',
          body: `${encontro.nomeCompleto} confirmou presença.`
        });
        const subs = await Subscription.find().lean();
        subs.forEach(s => {
          webpush.sendNotification(s, payload).catch(err => {
            console.error('push send fail', err);
          });
        });

        if (isJson) {
          console.log(`[INFO] Encontro salvo com sucesso - ID: ${encontro._id}, Tipo: ${encontro.tipo}, Aprovado: ${encontro.aprovado}`);
          return res.json({ success: true, created, updated: !created, id: String(encontro._id) });
        } else {
          return res.render('success');
        }
      } catch (err) {
        console.error('[ERRO] Erro ao salvar encontro:', err.message);
        console.error('   Stack:', err.stack);
        if (isJson) {
          return res.status(500).json({ success: false, errors: [{ msg: 'Erro no servidor: ' + err.message }] });
        } else {
          return res.status(500).send('Erro no servidor');
        }
      }
    }
  );

  return router;
};
