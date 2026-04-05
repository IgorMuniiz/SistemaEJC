// ─── Environment & Config ───────────────────────────────────────────
const { IS_PRODUCTION, PORT, HOST, SKIP_MONGO_CONNECT, ENABLE_BACKGROUND_JOBS } = require('./config/environment');
require('./config/database');
const { vapidKeys } = require('./config/vapid');

// ─── Framework ──────────────────────────────────────────────────────
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const compression = require('compression');
const helmet = require('helmet');
const sharp = require('sharp');
const fs = require('fs');
const { body, validationResult } = require('express-validator');

// ─── Constants ──────────────────────────────────────────────────────
const {
  APPROVAL_STATUSES,
  PENDING_APPROVAL_STATUSES,
  ADMIN_ACCESS_LEVELS,
  ADMIN_PERMISSION_OPTIONS,
  ADMIN_PERMISSION_KEYS,
  ADMIN_ROLE_DEFAULT_PERMISSIONS,
  ADMIN_LEVEL_RANK,
} = require('./constants/admin');

// ─── Models ─────────────────────────────────────────────────────────
const { Cadastro, Encontro, Subscription, Admin, AdminAuditLog, Ejc, Equipe, Circulo, VinculoEncontro } = require('./models');
const { getEncontroAtivo, invalidarCacheEncontroAtivo } = require('./models/Ejc');

// ─── Utils ──────────────────────────────────────────────────────────
const {
  normalizeTextInput, parseDateInput, normalizeBooleanInput,
  normalizeApprovalStatusInput, resolveApprovalStatus,
  normalizePhoneDigits, normalizeStringArrayInput, normalizeMultiField,
  normalizeTipoEncontro, normalizeGeneroEncontro,
  normalizeAdminAccessLevel, sanitizeAdminPermissions, resolveAdminPermissions,
  normalizeAdminEventScopeInput, extractPdfField, mapToEncontroPayload,
} = require('./utils/normalization');
const { formatExportValue, formatDateBR, truncateText, buildPdfDisplayName } = require('./utils/formatters');
const { escapeRegExp, parsePositiveInt, findExistingByNameOrEmail } = require('./utils/validation');
const { getClientIp, isSafeFilePath } = require('./utils/security');

// ─── Middleware ──────────────────────────────────────────────────────
const { buildAdminSessionData, checkAdminAuth, requireAdminPermission } = require('./middleware/auth');
const { getAdminLevelRank, canManageAdminWithHierarchy, validateAdminPassword } = require('./middleware/permissions');
const { ensureAdminCsrfToken, adminCsrfGuard } = require('./middleware/csrf');
const { adminLoginLimiter, adminWriteLimiter } = require('./middleware/rateLimiter');
const { upload, importUploadSingle } = require('./middleware/upload');
const { verificarFormularioBloqueado } = require('./middleware/formBlock');
const { configureSession } = require('./config/session');

// ─── Services ───────────────────────────────────────────────────────
const { logAdminAction } = require('./services/auditService');
const { createTiosGroupId, clearTiosCoupleLink, linkTiosCouple } = require('./services/tiosService');
const { executeLgpdRetention } = require('./services/lgpdService');
const {
  renderCardGridPdf, exportImagesFromModel, buildPdfEntryFromVinculo,
  renderEstruturasPdf, drawPdfTitle, drawRegistrationCard,
  drawHeartBetweenCards, fitPdfTextToWidth, resolvePhotoPath,
} = require('./services/pdfExport');

// ─── Express App ────────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ─── Global Middleware ──────────────────────────────────────────────
app.use(compression({ threshold: 1024 }));
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));

const setStaticCacheHeaders = (res, filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const immutableExt = new Set([
    '.css', '.js', '.mjs', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.webm',
  ]);
  if (immutableExt.has(ext)) {
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    return;
  }
  if (ext === '.html') {
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  }
};

// Image optimization route
app.get('/img/:bucket/:file', async (req, res) => {
  try {
    const bucket = String(req.params.bucket || '').trim().toLowerCase();
    const rawFile = decodeURIComponent(String(req.params.file || '').trim());
    const safeFileName = path.basename(rawFile);

    const baseDir = bucket === 'uploads'
      ? path.join(__dirname, 'uploads')
      : (bucket === 'images' ? path.join(__dirname, 'public', 'images') : '');

    if (!baseDir || !safeFileName) return res.status(400).send('Imagem invalida.');

    const targetPath = path.join(baseDir, safeFileName);
    if (!isSafeFilePath(baseDir, targetPath) || !fs.existsSync(targetPath)) {
      return res.status(404).send('Imagem nao encontrada.');
    }

    const width = parsePositiveInt(req.query.w, 120, 16, 2400);
    const height = parsePositiveInt(req.query.h, 120, 16, 2400);
    const quality = parsePositiveInt(req.query.q, 72, 30, 95);
    const fit = ['cover', 'contain', 'fill', 'inside', 'outside'].includes(String(req.query.fit || '').toLowerCase())
      ? String(req.query.fit).toLowerCase()
      : 'cover';

    const requestedFormat = String(req.query.format || '').toLowerCase();
    const wantsWebp = requestedFormat === 'webp'
      || (!requestedFormat && String(req.headers.accept || '').includes('image/webp'));

    const transformer = sharp(targetPath)
      .rotate()
      .resize({ width, height, fit, withoutEnlargement: true });

    res.set('Cache-Control', 'public, max-age=2592000, immutable');

    if (wantsWebp) {
      res.type('image/webp');
      return res.send(await transformer.webp({ quality }).toBuffer());
    }

    const ext = path.extname(safeFileName).toLowerCase();
    if (ext === '.png') {
      res.type('image/png');
      return res.send(await transformer.png({ compressionLevel: 9 }).toBuffer());
    }

    res.type('image/jpeg');
    return res.send(await transformer.jpeg({ quality, mozjpeg: true }).toBuffer());
  } catch (err) {
    console.error('Falha ao otimizar imagem:', err);
    return res.status(500).send('Erro ao processar imagem.');
  }
});

// Static files
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '30d', etag: true, lastModified: true, setHeaders: setStaticCacheHeaders,
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d', etag: true, lastModified: true, setHeaders: setStaticCacheHeaders,
}));
app.get('/manifest.json', (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400, must-revalidate');
  return res.sendFile(path.join(__dirname, 'public/manifest.json'));
});
app.get('/sw.js', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.sendFile(path.join(__dirname, 'public/sw.js'));
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

// Rate limiting
app.use(adminWriteLimiter);

// Session
configureSession(app);

// CSRF
app.use(ensureAdminCsrfToken);
app.use(adminCsrfGuard);

// ─── Health Checks ──────────────────────────────────────────────────
app.get('/healthz', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    uptimeSec: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/readyz', async (req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  if (!mongoReady) {
    return res.status(503).json({ status: 'degraded', mongo: 'disconnected', timestamp: new Date().toISOString() });
  }
  return res.status(200).json({ status: 'ready', mongo: 'connected', timestamp: new Date().toISOString() });
});

// ─── Debug Routes ───────────────────────────────────────────────────
app.get('/debug/status-bloqueio', async (req, res) => {
  try {
    const admin = await Admin.findOne().lean();
    const statusEncontrista = await verificarFormularioBloqueado('encontrista');
    const statusEncontreiro = await verificarFormularioBloqueado('encontreiro');
    res.json({ admin, statusEncontrista, statusEncontreiro, agora: new Date() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/debug/testar-bloqueio', async (req, res) => {
  try {
    const { tipo } = req.body;
    console.log(`[DEBUG-TESTE] Testando bloqueio para: ${tipo}`);
    const resultado = await verificarFormularioBloqueado(tipo);
    res.json(resultado);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/debug/ativar-bloqueio', async (req, res) => {
  try {
    const { tipo, ativar, motivo } = req.body;
    console.log(`[DEBUG-ATIVAR] Recebido: tipo=${tipo}, ativar=${ativar}, motivo=${motivo}`);
    if (!['encontrista', 'encontreiro'].includes(tipo)) {
      return res.status(400).json({ success: false, error: 'Tipo inválido' });
    }
    const updateData = {};
    if (tipo === 'encontrista') {
      updateData.bloquearFormularioEncontrista = ativar === true || ativar === 'true';
      updateData.motivoBloquearEncontrista = motivo || `Formulário ${tipo} bloqueado`;
    } else {
      updateData.bloquearFormularioEncontreiros = ativar === true || ativar === 'true';
      updateData.motivoBloquearEncontreiros = motivo || `Formulário ${tipo} bloqueado`;
    }
    let admin = await Admin.findOne();
    if (!admin) { admin = new Admin(updateData); } else { Object.assign(admin, updateData); }
    await admin.save();
    console.log('[DEBUG-ATIVAR] Salvo com sucesso');
    res.json({ success: true, message: 'Bloqueio alterado' });
  } catch (err) {
    console.error('Erro ao alterar bloqueio:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Shared Dependencies Object ─────────────────────────────────────
const deps = {
  mongoose, path, fs, sharp,
  body, validationResult,
  vapidKeys,
  // Models
  Cadastro, Encontro, Subscription, Admin, AdminAuditLog, Ejc, Equipe, Circulo, VinculoEncontro,
  getEncontroAtivo, invalidarCacheEncontroAtivo,
  // Constants
  APPROVAL_STATUSES, PENDING_APPROVAL_STATUSES,
  ADMIN_ACCESS_LEVELS, ADMIN_PERMISSION_OPTIONS, ADMIN_PERMISSION_KEYS,
  ADMIN_ROLE_DEFAULT_PERMISSIONS, ADMIN_LEVEL_RANK,
  // Utils
  normalizeTextInput, parseDateInput, normalizeBooleanInput,
  normalizeApprovalStatusInput, resolveApprovalStatus,
  normalizePhoneDigits, normalizeStringArrayInput, normalizeMultiField,
  normalizeTipoEncontro, normalizeGeneroEncontro,
  normalizeAdminAccessLevel, sanitizeAdminPermissions, resolveAdminPermissions,
  normalizeAdminEventScopeInput, extractPdfField, mapToEncontroPayload,
  formatExportValue, formatDateBR, truncateText, buildPdfDisplayName,
  escapeRegExp, parsePositiveInt, findExistingByNameOrEmail,
  getClientIp, isSafeFilePath,
  // Middleware
  buildAdminSessionData, checkAdminAuth, requireAdminPermission,
  getAdminLevelRank, canManageAdminWithHierarchy, validateAdminPassword,
  adminLoginLimiter, upload, importUploadSingle,
  verificarFormularioBloqueado,
  // Services
  logAdminAction,
  createTiosGroupId, clearTiosCoupleLink, linkTiosCouple,
  executeLgpdRetention,
  renderCardGridPdf, exportImagesFromModel, buildPdfEntryFromVinculo,
  renderEstruturasPdf, drawPdfTitle, drawRegistrationCard,
  drawHeartBetweenCards, fitPdfTextToWidth, resolvePhotoPath,
};

// ─── Routes ─────────────────────────────────────────────────────────
app.use('/', require('./routes/public')(deps));
app.use('/', require('./routes/export')(deps));
app.use('/admin', require('./routes/admin/auth')(deps));
app.use('/admin', require('./routes/admin/dashboard')(deps));
app.use('/admin', require('./routes/admin/registrations')(deps));
app.use('/admin', require('./routes/admin/users')(deps));
app.use('/admin', require('./routes/admin/structures')(deps));

// ─── Background Jobs ───────────────────────────────────────────────
if (ENABLE_BACKGROUND_JOBS) {
  const lgpdInitialTimer = setTimeout(() => {
    executeLgpdRetention().then((result) => {
      if (result.totalAnonimizados > 0) {
        console.log(`[LGPD] Anonimizacao automatica inicial: ${result.totalAnonimizados} registro(s).`);
      }
    }).catch((err) => {
      console.error('[LGPD] Falha na anonimização automática inicial:', err.message);
    });
  }, 20 * 1000);

  const lgpdDailyInterval = setInterval(() => {
    executeLgpdRetention().then((result) => {
      if (result.totalAnonimizados > 0) {
        console.log(`[LGPD] Anonimizacao automatica diaria: ${result.totalAnonimizados} registro(s).`);
      }
    }).catch((err) => {
      console.error('[LGPD] Falha na anonimização diária:', err.message);
    });
  }, 24 * 60 * 60 * 1000);

  if (typeof lgpdInitialTimer.unref === 'function') lgpdInitialTimer.unref();
  if (typeof lgpdDailyInterval.unref === 'function') lgpdDailyInterval.unref();
}

// ─── Server Startup ─────────────────────────────────────────────────
let serverInstance = null;

const startServer = () => {
  if (serverInstance) return serverInstance;

  serverInstance = app.listen(PORT, HOST, () => {
    const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
    console.log(`Server running on http://${displayHost}:${PORT}`);
    console.log(`Listening on ${HOST}:${PORT} for external access.`);
  });

  return serverInstance;
};

const shutdownServer = async (signal, exitCode = 0) => {
  console.log(`[SHUTDOWN] Signal received: ${signal}`);

  if (serverInstance) {
    await new Promise((resolve) => {
      serverInstance.close(() => resolve());
    });
  }

  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  } catch (err) {
    console.error('[SHUTDOWN] Erro ao encerrar MongoDB:', err.message);
  }

  process.exit(exitCode);
};

if (require.main === module) {
  startServer();

  process.on('SIGTERM', () => {
    shutdownServer('SIGTERM').catch((err) => {
      console.error('[SHUTDOWN] Falha no encerramento SIGTERM:', err.message);
      process.exit(1);
    });
  });

  process.on('SIGINT', () => {
    shutdownServer('SIGINT').catch((err) => {
      console.error('[SHUTDOWN] Falha no encerramento SIGINT:', err.message);
      process.exit(1);
    });
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[FATAL] Unhandled rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught exception:', err);
    shutdownServer('uncaughtException', 1).catch(() => process.exit(1));
  });
}

module.exports = {
  app,
  startServer,
};
