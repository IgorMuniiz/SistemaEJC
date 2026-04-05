const express = require('express');
const router = express.Router();

module.exports = (deps) => {
  const {
    mongoose,
    Admin,
    checkAdminAuth,
    requireAdminPermission,
    canManageAdminWithHierarchy,
    getAdminLevelRank,
    normalizeTextInput,
    normalizeAdminAccessLevel,
    sanitizeAdminPermissions,
    resolveAdminPermissions,
    logAdminAction,
    bcryptjs,
    ADMIN_ACCESS_LEVELS,
  } = deps;

  const buildAdminSessionData = (adminDoc) => {
    const nivelAcesso = normalizeAdminAccessLevel(adminDoc?.nivelAcesso, 'super_admin');
    const permissoes = resolveAdminPermissions(adminDoc);
    return {
      _id: adminDoc?._id,
      username: adminDoc?.username || '',
      nivelAcesso,
      permissoes,
    };
  };

router.post('/cadastrar-admin', checkAdminAuth, requireAdminPermission('admins.gerenciar'), async (req, res) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');
    const nivelAcesso = normalizeAdminAccessLevel(req.body.nivelAcesso, 'coordenador');
    const permissoesExtras = sanitizeAdminPermissions(req.body.permissoes);

    if (!username || !senha) {
      return res.status(400).json({ success: false, error: 'Usuário e senha são obrigatórios.' });
    }

    if (senha.length < 6) {
      return res.status(400).json({ success: false, error: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    const existente = await Admin.findOne({ username });
    if (existente) {
      return res.status(409).json({ success: false, error: 'Este usuário já existe.' });
    }

    const actingRank = getAdminLevelRank(req.adminUser?.nivelAcesso);
    const desiredRank = getAdminLevelRank(nivelAcesso);
    if (req.adminUser?.nivelAcesso !== 'super_admin' && desiredRank >= actingRank) {
      return res.status(403).json({ success: false, error: 'Você só pode criar administradores em níveis inferiores ao seu.' });
    }

    if (req.adminUser?.nivelAcesso !== 'super_admin') {
      const actingPerms = new Set(req.adminUser?.permissoes || []);
      const hasEscalation = permissoesExtras.some((perm) => !actingPerms.has(perm));
      if (hasEscalation) {
        return res.status(403).json({ success: false, error: 'Você não pode conceder permissões que não possui.' });
      }
    }

    const hash = await bcryptjs.hash(senha, 10);
    const novoAdmin = await Admin.create({ username, senha: hash, nivelAcesso, permissoes: permissoesExtras });

    await logAdminAction(req, {
      action: 'cadastrar_admin',
      targetType: 'admin',
      targetId: novoAdmin._id,
      metadata: { username: novoAdmin.username, nivelAcesso: novoAdmin.nivelAcesso, permissoes: resolveAdminPermissions(novoAdmin) },
    });

    return res.json({ success: true, message: 'Administrador cadastrado com sucesso.' });
  } catch (err) {
    await logAdminAction(req, {
      action: 'cadastrar_admin',
      targetType: 'admin',
      status: 'error',
      metadata: { erro: err.message },
    });
    console.error('Erro ao cadastrar administrador:', err);
    return res.status(500).json({ success: false, error: 'Erro ao cadastrar administrador.' });
  }
});

// POST /admin/atualizar-admin/:id - Atualizar administrador
router.post('/atualizar-admin/:id', checkAdminAuth, requireAdminPermission('admins.gerenciar'), async (req, res) => {
  try {
    const { id } = req.params;
    const username = String(req.body.username || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');
    const nivelAcessoInformado = normalizeTextInput(req.body.nivelAcesso);
    const nivelAcesso = nivelAcessoInformado ? normalizeAdminAccessLevel(nivelAcessoInformado, 'consulta') : '';
    const permissoesExtras = req.body.permissoes !== undefined ? sanitizeAdminPermissions(req.body.permissoes) : null;

    if (!id) {
      return res.status(400).json({ success: false, error: 'ID do administrador não fornecido.' });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Administrador não encontrado.' });
    }

    const isSelfUpdate = String(admin._id) === String(req.adminUser?._id);
    const canManageTarget = canManageAdminWithHierarchy(req.adminUser, admin);
    if (!isSelfUpdate && !canManageTarget) {
      return res.status(403).json({ success: false, error: 'Você não possui hierarquia para alterar este administrador.' });
    }

    if (isSelfUpdate && (nivelAcesso || permissoesExtras !== null) && req.adminUser?.nivelAcesso !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Você não pode alterar seu próprio nível/permissões.' });
    }

    if (username) {
      const usernameEmUso = await Admin.findOne({
        username,
        _id: { $ne: admin._id },
      });

      if (usernameEmUso) {
        return res.status(409).json({ success: false, error: 'Este nome de usuário já está em uso.' });
      }

      admin.username = username;
    }

    if (nivelAcesso) {
      const actingRank = getAdminLevelRank(req.adminUser?.nivelAcesso);
      const desiredRank = getAdminLevelRank(nivelAcesso);
      if (req.adminUser?.nivelAcesso !== 'super_admin' && desiredRank >= actingRank) {
        return res.status(403).json({ success: false, error: 'Nível informado é igual ou superior ao seu.' });
      }
      admin.nivelAcesso = nivelAcesso;
    }

    if (permissoesExtras !== null) {
      if (req.adminUser?.nivelAcesso !== 'super_admin') {
        const actingPerms = new Set(req.adminUser?.permissoes || []);
        const hasEscalation = permissoesExtras.some((perm) => !actingPerms.has(perm));
        if (hasEscalation) {
          return res.status(403).json({ success: false, error: 'Você não pode conceder permissões que não possui.' });
        }
      }
      admin.permissoes = permissoesExtras;
    }

    // Se a senha foi fornecida e não está vazia, atualiza
    if (senha && senha.length > 0) {
      if (senha.length < 6) {
        return res.status(400).json({ success: false, error: 'A senha deve ter pelo menos 6 caracteres.' });
      }
      admin.senha = await bcryptjs.hash(senha, 10);
    }

    await admin.save();
    if (isSelfUpdate) {
      const sessionData = buildAdminSessionData(admin);
      req.adminUser = sessionData;
      req.session.adminUsername = sessionData.username;
      req.session.adminNivelAcesso = sessionData.nivelAcesso;
      req.session.adminPermissoes = sessionData.permissoes;
    }
    return res.json({ success: true, message: 'Administrador atualizado com sucesso.' });
  } catch (err) {
    console.error('[ERRO] Erro ao atualizar administrador:', err.message);
    return res.status(500).json({ success: false, error: 'Erro ao atualizar administrador: ' + err.message });
  }
});

// POST /admin/deletar-admin/:id - Deletar administrador
router.post('/deletar-admin/:id', checkAdminAuth, requireAdminPermission('admins.gerenciar'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: 'ID do administrador não fornecido.' });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Administrador não encontrado.' });
    }

    if (String(admin._id) === String(req.adminUser?._id)) {
      return res.status(400).json({ success: false, error: 'Você não pode deletar seu próprio usuário logado.' });
    }

    if (!canManageAdminWithHierarchy(req.adminUser, admin)) {
      return res.status(403).json({ success: false, error: 'Você não possui hierarquia para deletar este administrador.' });
    }

    if (admin.nivelAcesso === 'super_admin') {
      const totalSuperAdmins = await Admin.countDocuments({ nivelAcesso: 'super_admin' });
      if (totalSuperAdmins <= 1) {
        return res.status(400).json({ success: false, error: 'Não é permitido remover o último super administrador.' });
      }
    }

    await Admin.findByIdAndDelete(id);
    console.log('[INFO] Administrador deletado:', admin.username);
    await logAdminAction(req, {
      action: 'deletar_admin',
      targetType: 'admin',
      targetId: id,
      metadata: { username: admin.username },
    });
    
    return res.json({ success: true, message: 'Administrador deletado com sucesso.' });
  } catch (err) {
    await logAdminAction(req, {
      action: 'deletar_admin',
      targetType: 'admin',
      targetId: req.params.id,
      status: 'error',
      metadata: { erro: err.message },
    });
    console.error('[ERRO] Erro ao deletar administrador:', err.message);
    return res.status(500).json({ success: false, error: 'Erro ao deletar administrador: ' + err.message });
  }
});

  return router;
};
