const express = require('express');
const router = express.Router();

module.exports = (deps) => {
  const {
    Admin,
    adminLoginLimiter,
    buildAdminSessionData,
    validateAdminPassword,
    logAdminAction,
    normalizeTextInput,
    getClientIp,
    body,
    validationResult,
  } = deps;

  // GET /login - Exibir formulário de login
  router.get('/login', (req, res) => {
    if (req.session.adminId) {
      return res.redirect('/admin/gerenciar-cadastros');
    }
    res.render('admin-login', { error: null });
  });

  // POST /login - Processar login
  router.post('/login', adminLoginLimiter, [
    body('username')
      .trim()
      .notEmpty().withMessage('Usuário e senha são obrigatórios')
      .isLength({ min: 3, max: 64 }).withMessage('Usuário inválido.'),
    body('senha')
      .isLength({ min: 1, max: 120 }).withMessage('Usuário e senha são obrigatórios'),
  ], async (req, res) => {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return res.render('admin-login', { error: validationErrors.array()[0].msg });
      }

      const usernameInput = String(req.body.username || '').trim();
      const senha = String(req.body.senha || '');

      if (!usernameInput || !senha) {
        return res.render('admin-login', { error: 'Usuário e senha são obrigatórios' });
      }

      const usernameNormalizado = usernameInput.toLowerCase();

      // Busca tolerante para diferencas de caixa e registros antigos.
      const usernameRegex = new RegExp(`^${usernameInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      let admin = await Admin.findOne({ username: usernameNormalizado });
      if (!admin) {
        admin = await Admin.findOne({ username: usernameRegex });
      }

      if (!admin) {
        return res.render('admin-login', { error: 'Usuário ou senha incorretos' });
      }

      const senhaValida = await validateAdminPassword(admin, senha);
      if (!senhaValida) {
        return res.render('admin-login', { error: 'Usuário ou senha incorretos' });
      }

      const sessionData = buildAdminSessionData(admin);
      req.session.adminId = sessionData._id;
      req.session.adminUsername = sessionData.username;
      req.session.adminNivelAcesso = sessionData.nivelAcesso;
      req.session.adminPermissoes = sessionData.permissoes;
      req.session.save((err) => {
        if (err) console.error('Erro ao salvar sessão:', err);
        res.redirect('/admin/gerenciar-cadastros');
      });
    } catch (err) {
      console.error('Login error:', err);
      res.render('admin-login', { error: 'Erro no servidor' });
    }
  });

  // GET /logout - Fazer logout
  router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      res.redirect('/');
    });
  });

  return router;
};
