const express = require('express');
const router = express.Router();

module.exports = (deps) => {
  const {
    Cadastro,
    Encontro,
    Admin,
    AdminAuditLog,
    Ejc,
    Equipe,
    Circulo,
    VinculoEncontro,
    getEncontroAtivo,
    checkAdminAuth,
    requireAdminPermission,
    ADMIN_PERMISSION_OPTIONS,
    ADMIN_ACCESS_LEVELS,
    resolveApprovalStatus,
    parsePositiveInt,
    resolveAdminEventContext,
    PENDING_APPROVAL_STATUSES,
  } = deps;

  router.get('/home', checkAdminAuth, requireAdminPermission('painel.visualizar'), (req, res) => {
    return res.redirect('/admin/gerenciar-cadastros');
  });

  // GET /dashboard - Painel de admin (rota protegida)
  router.get('/dashboard', checkAdminAuth, requireAdminPermission('painel.visualizar'), async (req, res) => {
    try {
      const eventContext = await resolveAdminEventContext(req);
      const baseFilter = eventContext.filtro;

      const pendentesEncontristas = await Cadastro.find({ ...baseFilter, statusAprovacao: { $in: [...PENDING_APPROVAL_STATUSES, null] } }).sort({ dataCadastro: -1 }).lean();
      const aprovadosEncontristas = await Cadastro.find({ ...baseFilter, aprovado: true }).sort({ dataCadastro: -1 }).lean();
      const reprovadosEncontristas = await Cadastro.find({ ...baseFilter, statusAprovacao: 'reprovado' }).sort({ dataCadastro: -1 }).lean();
      const pendentesEncontreiros = await Encontro.find({ ...baseFilter, statusAprovacao: { $in: [...PENDING_APPROVAL_STATUSES, null] } }).sort({ dataCadastro: -1 }).lean();
      const aprovadosEncontreiros = await Encontro.find({ ...baseFilter, aprovado: true }).sort({ dataCadastro: -1 }).lean();
      const reprovadosEncontreiros = await Encontro.find({ ...baseFilter, statusAprovacao: 'reprovado' }).sort({ dataCadastro: -1 }).lean();
      
      console.log(`[INFO] Dashboard - Encontristas(${pendentesEncontristas.length}/${aprovadosEncontristas.length}), Encontreiros(${pendentesEncontreiros.length}/${aprovadosEncontreiros.length})`);

      // Capturar mensagens da sessão
      const mensagemSucesso = req.session.mensagemSucesso;
      const mensagemErro = req.session.mensagemErro;

      // Limpar mensagens da sessão após capturar
      delete req.session.mensagemSucesso;
      delete req.session.mensagemErro;

      res.render('admin-dashboard', {
        adminUsername: req.session.adminUsername,
        pendentesEncontristas,
        aprovadosEncontristas,
        reprovadosEncontristas,
        pendentesEncontreiros,
        aprovadosEncontreiros,
        reprovadosEncontreiros,
        totalPendentesEncontristas: pendentesEncontristas.length,
        totalAprovadosEncontristas: aprovadosEncontristas.length,
        totalReprovadosEncontristas: reprovadosEncontristas.length,
        totalPendentesEncontreiros: pendentesEncontreiros.length,
        totalAprovadosEncontreiros: aprovadosEncontreiros.length,
        totalReprovadosEncontreiros: reprovadosEncontreiros.length,
        escopoEventoAdmin: eventContext.scope,
        eventoAtivoNome: eventContext.encontroAtivo?.nome || '',
        eventoFiltroNome: eventContext.encontroNome,
        mensagemSucesso,
        mensagemErro
      });
    } catch (err) {
      console.error('Dashboard error:', err);
      res.status(500).send('Erro ao carregar dashboard');
    }
  });

  return router;
};
