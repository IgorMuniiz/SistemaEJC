require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const archiver = require('archiver');
const webpush = require('web-push');
const session = require('express-session');
const bcryptjs = require('bcryptjs');
const compression = require('compression');
const sharp = require('sharp');

// configure VAPID keys (set environment variables beforehand)
let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};
if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  const keys = webpush.generateVAPIDKeys();
  // Log as regular output to avoid false startup failures in environments that treat stderr as fatal.
  console.log('VAPID keys were not provided. Generated new keys; please add them to your .env');
  console.log(JSON.stringify(keys, null, 2));
  vapidKeys = keys;
}
webpush.setVapidDetails('mailto:you@example.com', vapidKeys.publicKey, vapidKeys.privateKey);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const IMPORT_PLACEHOLDER_IMAGE = 'import-placeholder.jpg';

const ensureImportPlaceholderImage = () => {
  const uploadsDir = path.join(__dirname, 'uploads');
  const targetPath = path.join(uploadsDir, IMPORT_PLACEHOLDER_IMAGE);
  if (fs.existsSync(targetPath)) return IMPORT_PLACEHOLDER_IMAGE;

  const sourcePath = path.join(__dirname, 'public', 'images', 'tema.png');
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
    return IMPORT_PLACEHOLDER_IMAGE;
  }

  return '';
};

// MongoDB connection
const mongoUri = process.env.MONGODB_URL
  || process.env.MONGODB_URI
  || process.env.MONGO_URI
  || 'mongodb://127.0.0.1:27017/ejc_sistema';
const mongoFallbackUri = process.env.MONGODB_FALLBACK_URL || 'mongodb://127.0.0.1:27017/ECJCOP';

const connectToMongo = async () => {
  const uris = [mongoUri, mongoFallbackUri].filter((value, index, arr) => value && arr.indexOf(value) === index);

  for (let index = 0; index < uris.length; index += 1) {
    const uri = uris[index];
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
      });

      if (index === 0) {
        console.log('MongoDB conectado com sucesso.');
      } else {
        console.warn('MongoDB conectado com fallback local:', uri);
      }

      return;
    } catch (err) {
      const message = String(err && err.message ? err.message : err);
      const isLast = index === uris.length - 1;
      console.error(`Falha ao conectar no MongoDB (${uri}).`);

      if (message.includes('whitelist') || message.includes('ReplicaSetNoPrimary')) {
        console.error('No Atlas, libere o IP atual em Network Access e valide usuario/senha da URI.');
      }

      console.error('Detalhes:', message);

      if (isLast) {
        console.error('Defina MONGODB_URI, MONGODB_URL ou MONGO_URI no arquivo .env.');
      }
    }
  }
};

connectToMongo();

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB desconectado.');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconectado.');
});

const cadastroSchema = new mongoose.Schema({
  nomeCompleto: { type: String, required: true },
  comoQuerSerChamado: { type: String, default: '' },
  ejc: { type: String, default: 'Nao informado' },
  cep: { type: String, default: '' },
  estadoCivil: { type: String, default: '' },
  nomeMae: { type: String, default: '' },
  telefoneMae: { type: String, default: '' },
  nomePai: { type: String, default: '' },
  telefonePai: { type: String, default: '' },
  paroquiaFrequenta: { type: String, default: '' },
  participaMovimentoIgreja: { type: String, default: '' },
  conhecidoInscricaoHoje: { type: String, default: '' },
  conhecidoFezEjc: { type: String, default: '' },
  inscricaoAnterior: { type: String, default: '' },
  instrumentoMusical: { type: String, default: '' },
  expectativaXixEjcCop: { type: String, default: '' },
  logradouro: { type: String, required: true },
  bairro: { type: String, required: true },
  dataNascimento: { type: Date, required: true },
  telefone: { type: String, required: true },
  intolerante: { type: String, default: '' },
  email: { type: String, default: '' },
  instagram: { type: String },
  foto: { type: String, required: true },
  aprovado: { type: Boolean, default: false },
  statusAprovacao: { type: String, enum: ['pendente', 'aprovado', 'reprovado'], default: 'pendente' },
  dataCadastro: { type: Date, default: Date.now },
});

const Cadastro = mongoose.model('Cadastro_EJC', cadastroSchema);

// schema for encontro (experience/serving event)
const encontroSchema = new mongoose.Schema({
  nomeCompleto: { type: String, required: true },
  comoQuerSerChamado: { type: String, default: '' },
  genero: { type: String, enum: ['masculino', 'feminino', 'outros'], default: 'outros' },
  ejc: { type: String, required: true },
  qualEjcPertence: { type: String, default: '' },
  tipo: { type: String, enum: ['jovens', 'tios'], required: true },
  tiosCategoria: { type: String, enum: ['casal', 'solo', ''], default: '' },
  origemTios: { type: Boolean, default: false },
  tiosGrupoId: { type: String, default: '' },
  equipeServiu: { type: [String], default: [] },
  equipeCoordenou: { type: [String], default: [] },
  temVeiculoProprio: { type: Boolean, default: false },
  logradouro: { type: String, required: true },
  bairro: { type: String, required: true },
  dataNascimento: { type: Date, required: true },
  telefone: { type: String, required: true },
  intolerante: { type: String, default: '' },
  email: { type: String, required: true },
  temRelacionamento: { type: String, default: '' },
  instagram: { type: String, default: '' },
  foto: { type: String, required: true },
  observacoes: { type: String, default: '' },
  aprovado: { type: Boolean, default: false }, // novo campo para aprovação
  statusAprovacao: { type: String, enum: ['pendente', 'aprovado', 'reprovado'], default: 'pendente' },
  dataCadastro: { type: Date, default: Date.now },
});

const Encontro = mongoose.model('Encontro', encontroSchema);

// push subscription storage
const subSchema = new mongoose.Schema({
  endpoint: { type: String, required: true, unique: true },
  keys: { type: Object, required: true }
});
const Subscription = mongoose.model('PushSubscription', subSchema);

// admin schema for authentication
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
  dataCriacao: { type: Date, default: Date.now },
});

const Admin = mongoose.model('Admin', adminSchema);

const BCRYPT_PREFIX_REGEX = /^\$2[aby]\$\d{2}\$/;

const validateAdminPassword = async (admin, plainPassword) => {
  const currentSenha = typeof admin.senha === 'string' ? admin.senha : '';
  const legacyPassword = typeof admin.password === 'string' ? admin.password : '';
  const candidates = [currentSenha, legacyPassword].filter(Boolean);

  for (const candidate of candidates) {
    if (BCRYPT_PREFIX_REGEX.test(candidate)) {
      try {
        const ok = await bcryptjs.compare(plainPassword, candidate);
        if (ok) {
          if (candidate !== currentSenha) {
            admin.senha = candidate;
            await admin.save();
          }
          return true;
        }
      } catch (_) {
        // Ignore malformed legacy hash and keep trying remaining formats.
      }
      continue;
    }

    // Compatibilidade com registros antigos salvos em texto puro.
    if (plainPassword === candidate) {
      admin.senha = await bcryptjs.hash(plainPassword, 10);
      await admin.save();
      return true;
    }
  }

  return false;
};

const ejcSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true },
  nomeNormalizado: { type: String, required: true, unique: true, trim: true },
  dataCriacao: { type: Date, default: Date.now },
});

const Ejc = mongoose.model('Ejc', ejcSchema);

// team schema for grouping encontreiros
const equipeSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true },
  ejcId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ejc' },
  ejcNome: { type: String, default: '', trim: true },
  nomeReferencia: { type: String, default: '', trim: true },
  nomeNormalizado: { type: String, required: true, unique: true, trim: true },
  dataCriacao: { type: Date, default: Date.now },
});

const Equipe = mongoose.model('Equipe', equipeSchema);

const circuloSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true },
  ejcId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ejc', required: true },
  nomeNormalizado: { type: String, required: true, unique: true, trim: true },
  dataCriacao: { type: Date, default: Date.now },
});

const Circulo = mongoose.model('Circulo', circuloSchema);

const vinculoSchema = new mongoose.Schema({
  ejcId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ejc', required: true },
  entidadeTipo: { type: String, enum: ['circulo', 'equipe'], required: true },
  entidadeId: { type: mongoose.Schema.Types.ObjectId, required: true },
  pessoaTipo: { type: String, enum: ['encontrista', 'encontreiro'], required: true },
  pessoaId: { type: mongoose.Schema.Types.ObjectId, required: true },
  papel: { type: String, enum: ['membro', 'coordenador', 'serviu', 'coordenou', 'moita'], default: 'membro' },
  descricaoPapel: { type: String, default: '', trim: true },
  dataCriacao: { type: Date, default: Date.now },
});

const VinculoEncontro = mongoose.model('VinculoEncontro', vinculoSchema);

const parsePositiveInt = (value, fallback, min, max) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
};

const isSafeFilePath = (baseDir, candidatePath) => {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(candidatePath);
  return resolvedTarget === resolvedBase || resolvedTarget.startsWith(`${resolvedBase}${path.sep}`);
};

// configure view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// compress text assets to reduce transfer size in Lighthouse.
app.use(compression({ threshold: 1024 }));

app.get('/img/:bucket/:file', async (req, res) => {
  try {
    const bucket = String(req.params.bucket || '').trim().toLowerCase();
    const rawFile = decodeURIComponent(String(req.params.file || '').trim());
    const safeFileName = path.basename(rawFile);

    const baseDir = bucket === 'uploads'
      ? path.join(__dirname, 'uploads')
      : (bucket === 'images' ? path.join(__dirname, 'public', 'images') : '');

    if (!baseDir || !safeFileName) {
      return res.status(400).send('Imagem invalida.');
    }

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
      const imageBuffer = await transformer.webp({ quality }).toBuffer();
      return res.send(imageBuffer);
    }

    const ext = path.extname(safeFileName).toLowerCase();
    if (ext === '.png') {
      res.type('image/png');
      const imageBuffer = await transformer.png({ compressionLevel: 9 }).toBuffer();
      return res.send(imageBuffer);
    }

    res.type('image/jpeg');
    const imageBuffer = await transformer.jpeg({ quality, mozjpeg: true }).toBuffer();
    return res.send(imageBuffer);
  } catch (err) {
    console.error('Falha ao otimizar imagem:', err);
    return res.status(500).send('Erro ao processar imagem.');
  }
});

// static files
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '30d',
  etag: true,
  lastModified: true,
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
}));
// ensure manifest and service worker are available
app.get('/manifest.json', (req,res)=>res.sendFile(path.join(__dirname,'public/manifest.json')));
app.get('/sw.js', (req,res)=>res.sendFile(path.join(__dirname,'public/sw.js')));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

// configure session
app.use(session({
  secret: process.env.SESSION_SECRET || 'seu-supercódigo-secreto-mude-em-producao',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // mude para true em produção com HTTPS
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 horas
  }
}));

// file upload config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    const allowed = ['.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG and PNG images are allowed'));
    }
  },
});

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const importUploadSingle = (req, res, next) => {
  importUpload.single('arquivo')(req, res, (err) => {
    if (!err) return next();

    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Arquivo muito grande. O limite para importacao e 25MB.',
      });
    }

    return res.status(400).json({
      success: false,
      error: `Falha ao processar arquivo de importacao: ${normalizeTextInput(err.message) || 'erro desconhecido.'}`,
    });
  });
};

const parseDateInput = (value) => {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const [, dd, mm, yyyy] = brMatch;
    const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeBooleanInput = (value) => {
  if (typeof value === 'boolean') return value;
  const raw = String(value || '').trim().toLowerCase();
  return ['1', 'true', 'sim', 'yes', 'y', 'on'].includes(raw);
};

const normalizeApprovalStatusInput = (value) => {
  const raw = normalizeTextInput(value).toLowerCase();
  if (['aprovado', 'approved'].includes(raw)) return 'aprovado';
  if (['reprovado', 'desaprovado', 'rejected'].includes(raw)) return 'reprovado';
  if (['pendente', 'pending'].includes(raw)) return 'pendente';
  return '';
};

const resolveApprovalStatus = (doc) => {
  const fromField = normalizeApprovalStatusInput(doc && doc.statusAprovacao);
  if (fromField) return fromField;
  return doc && doc.aprovado ? 'aprovado' : 'pendente';
};

const normalizeTextInput = (value) => String(value || '').trim();

const normalizeStringArrayInput = (value) => {
  if (Array.isArray(value)) return value.map((item) => normalizeTextInput(item)).filter(Boolean);
  const text = normalizeTextInput(value);
  if (!text) return [];
  return text.split(',').map((item) => item.trim()).filter(Boolean);
};

const normalizeTipoEncontro = (value) => {
  const raw = normalizeTextInput(value).toLowerCase();
  if (['homem', 'mulher', 'jovens'].includes(raw)) return 'jovens';
  if (raw === 'casal' || raw === 'tio solo' || raw === 'tios') return 'tios';
  if (['jovens', 'tios'].includes(raw)) return raw;
  return null;
};

const normalizeGeneroEncontro = (value) => {
  const raw = normalizeTextInput(value).toLowerCase();
  if (raw === 'homem') return 'masculino';
  if (raw === 'mulher') return 'feminino';
  if (['masculino', 'feminino', 'outros'].includes(raw)) return raw;
  return 'outros';
};

const extractPdfField = (block, labels) => {
  for (const label of labels) {
    const rx = new RegExp(`${label}\\s*:\\s*([^\\n]+)`, 'i');
    const match = block.match(rx);
    if (match && match[1]) return normalizeTextInput(match[1]);
  }
  return '';
};

const mapToEncontroPayload = (row, fotoPadrao = '', options = {}) => {
  const defaultTipo = normalizeTipoEncontro(options.defaultTipo);
  const fallbackFoto = normalizeTextInput(options.fallbackFoto);
  const nomeCompleto = normalizeTextInput(row.nomeCompleto || row.nome_completo || row.nome || row['nome completo']);
  const email = normalizeTextInput(row.email || row.email_principal || row['e-mail'] || row['email principal']);
  const tipo = normalizeTipoEncontro(
    row.tipo
    || row['tipo de encontreiro']
    || row['tipo encontreiro']
    || row['tipo de inscricao']
    || row.genero
    || row.sexo
  ) || defaultTipo;
  const foto = normalizeTextInput(row.foto || row.photo || fotoPadrao || fallbackFoto);

  return {
    nomeCompleto,
    comoQuerSerChamado: normalizeTextInput(row.comoQuerSerChamado || row.apelido || row.nomeSocial),
    genero: normalizeGeneroEncontro(row.genero || row.sexo),
    email,
    tipo,
    tiosCategoria: normalizeTextInput(row.tiosCategoria || row.categoriaTios).toLowerCase() === 'casal' ? 'casal' : '',
    foto,
    ejc: normalizeTextInput(row.ejc) || 'Nao informado',
    qualEjcPertence: normalizeTextInput(row.qualEjcPertence || row.ejcPertence || row.ejc_pertence),
    logradouro: normalizeTextInput(row.logradouro || row.endereco) || 'Nao informado',
    bairro: normalizeTextInput(row.bairro) || 'Nao informado',
    dataNascimento: parseDateInput(row.dataNascimento || row.data_nascimento || row.nascimento || row.niver) || new Date('2000-01-01'),
    telefone: normalizeTextInput(row.telefone || row.celular) || 'Nao informado',
    instagram: normalizeTextInput(row.instagram),
    origemTios: normalizeBooleanInput(row.origemTios || row.origem),
    tiosGrupoId: normalizeTextInput(row.tiosGrupoId || row.tios_grupo_id || row.grupoId),
    equipeServiu: normalizeStringArrayInput(row.equipeServiu || row.equipe_serviu),
    equipeCoordenou: normalizeStringArrayInput(row.equipeCoordenou || row.equipe_coordenou),
    temVeiculoProprio: normalizeBooleanInput(row.temVeiculoProprio || row.tem_veiculo_proprio || row.veiculoProprio),
    intolerante: normalizeTextInput(row.intolerante || row.alergias),
    temRelacionamento: normalizeTextInput(row.temRelacionamento || row.relacionamento),
    observacoes: normalizeTextInput(row.observacoes || row.obs),
    aprovado: normalizeBooleanInput(row.aprovado),
    statusAprovacao: normalizeApprovalStatusInput(row.statusAprovacao || row.status_aprovacao) || (normalizeBooleanInput(row.aprovado) ? 'aprovado' : 'pendente'),
    dataCadastro: parseDateInput(row.dataCadastro || row.data_cadastro) || new Date(),
  };
};

const normalizeMultiField = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return [value];
};

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findExistingByNameOrEmail = async (Model, nomeCompleto, email) => {
  const nome = String(nomeCompleto || '').trim();
  const mail = String(email || '').trim();

  const filters = [];
  if (mail) {
    filters.push({ email: new RegExp(`^${escapeRegExp(mail)}$`, 'i') });
  }
  if (nome) {
    filters.push({ nomeCompleto: new RegExp(`^${escapeRegExp(nome)}$`, 'i') });
  }

  if (filters.length === 0) return null;
  return Model.findOne({ $or: filters });
};

const formatExportValue = (value) => {
  if (Array.isArray(value)) return value.join(' | ');
  return value;
};

const formatDateBR = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  // Usar UTC para evitar problema de timezone
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const truncateText = (value, max = 42) => {
  const text = String(value || '').trim();
  if (!text) return '-';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}...`;
};

const resolvePhotoPath = (fileName) => {
  if (!fileName) return null;
  const filePath = path.join(__dirname, 'uploads', fileName);
  return fs.existsSync(filePath) ? filePath : null;
};

const drawPdfTitle = (doc, title, subtitle) => {
  const headerY = 30;
  const headerHeight = 44;
  doc.save();
  doc.roundedRect(40, headerY, 515, headerHeight, 6).fill('#1f2f46');
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(16).text(title, 56, headerY + 8, {
    width: 483,
    align: 'center',
    lineBreak: false,
    ellipsis: true,
  });
  doc.restore();

  doc.font('Helvetica').fontSize(9).fillColor('#5f6b7a').text(subtitle, 40, headerY + headerHeight + 6, {
    width: 515,
    align: 'center',
    lineBreak: false,
  });
  doc.strokeColor('#c6d0dc').lineWidth(0.8).moveTo(40, headerY + headerHeight + 22).lineTo(555, headerY + headerHeight + 22).stroke();
};

const drawHeartBetweenCards = (doc, centerX, centerY, size = 13, color = '#d94b71') => {
  const safeSize = Math.max(8, Number(size) || 13);
  const scale = safeSize / 16;
  doc.save();
  doc.translate(centerX - (safeSize / 2), centerY - (safeSize / 2));
  doc.scale(scale);
  doc.path('M8 14 C8 14 0 9.2 0 4.8 C0 2.1 2.1 0 4.8 0 C6.4 0 7.7 0.8 8 2 C8.3 0.8 9.6 0 11.2 0 C13.9 0 16 2.1 16 4.8 C16 9.2 8 14 8 14 Z').fill(color);
  doc.restore();
};

const drawCardLine = (doc, x, y, width, label, value, extraSpace = 0, fontSize = 8.5, options = {}) => {
  const rowHeight = Number(options.rowHeight) > 0 ? Number(options.rowHeight) : 16;
  const textMax = Number(options.textMax) > 0 ? Number(options.textMax) : 46;
  const showLabels = options.showLabels !== false;
  const fontName = normalizeTextInput(options.fontName) || 'Helvetica';
  const lineColor = normalizeTextInput(options.lineColor) || '#8e8e8e';
  const alignColumns = options.alignColumns === true;
  const labelWidth = Number(options.labelWidth) > 0 ? Number(options.labelWidth) : 34;
  const lineInset = Number(options.lineInset) >= 0 ? Number(options.lineInset) : 2;
  const showDivider = options.showDivider !== false;
  const centerText = options.centerText !== false;
  const lineGap = Number(options.lineGap) >= 0 ? Number(options.lineGap) : 1.8;
  const truncateValue = options.truncateValue !== false;
  const autoFitValue = options.autoFitValue === true;
  const minFontSize = Number(options.minFontSize) > 0 ? Number(options.minFontSize) : 6;
  const textYOffset = centerText
    ? Math.max(0.5, (rowHeight - fontSize) / 2)
    : 0.7;
  const textY = y + textYOffset;

  if (showLabels && alignColumns) {
    const safeLabel = truncateText(label, 12);
    const rawValue = normalizeTextInput(value) || '-';
    const safeValue = truncateValue ? truncateText(rawValue, textMax) : rawValue;
    const valueWidth = Math.max(10, width - labelWidth - 3);

    let adjustedFontSize = fontSize;
    if (autoFitValue) {
      doc.font(fontName);
      for (let size = fontSize; size >= minFontSize; size -= 0.2) {
        doc.fontSize(size);
        if (doc.widthOfString(safeValue) <= valueWidth) {
          adjustedFontSize = size;
          break;
        }
        adjustedFontSize = size;
      }
    }

    doc.font('Helvetica').fontSize(Math.max(7.6, fontSize - 0.1)).fillColor('#243446').text(`${safeLabel}:`, x, textY, {
      width: labelWidth,
      lineBreak: false,
      ellipsis: true,
    });

    doc.font(fontName).fontSize(adjustedFontSize).fillColor('#1f1f1f').text(safeValue, x + labelWidth + 3, textY, {
      width: valueWidth,
      lineBreak: false,
      ellipsis: true,
    });
  } else {
    const rawValue = normalizeTextInput(value) || '-';
    const renderedValue = truncateValue ? truncateText(rawValue, textMax) : rawValue;
    const normalizedLine = showLabels
      ? `${label}: ${renderedValue}`
      : `${renderedValue}`;
    doc.font(fontName).fontSize(fontSize).fillColor('#1f1f1f').text(normalizedLine, x, textY, {
      width,
      lineBreak: false,
      ellipsis: true,
    });
  }

  if (showDivider) {
    // Place divider close to the row bottom so it never intersects text glyphs.
    const safeBottomOffset = Math.max(0.45, Math.min(0.8, lineGap));
    const dividerY = y + rowHeight + extraSpace - safeBottomOffset;
    doc.strokeColor(lineColor).lineWidth(0.3).moveTo(x + lineInset, dividerY).lineTo(x + width - lineInset, dividerY).stroke();
  }
};

const drawRegistrationCard = (doc, entry, x, y, width, height, mode, options = {}) => {
  // Card com acabamento mais limpo e profissional.
  doc.save();
  doc.roundedRect(x, y, width, height, 4).fillAndStroke('#ffffff', '#5f6b7a');
  if (options.topDivider !== false) {
    doc.lineWidth(0.6).strokeColor('#d2dae3').moveTo(x + 7, y + 22).lineTo(x + width - 7, y + 22).stroke();
  }
  doc.restore();

  const badgeLabel = normalizeTextInput(options.badgeLabel || '').toUpperCase();
  const fontBoost = Number(options.fontBoost) || 0;
  const nameFontBoost = Number(options.nameFontBoost) || 0;
  const photoSize = Number(options.photoSize) > 0 ? Number(options.photoSize) : 105;
  const photoWidth = Number(options.photoWidth) > 0 ? Number(options.photoWidth) : photoSize;
  const photoHeight = Number(options.photoHeight) > 0 ? Number(options.photoHeight) : photoSize;
  const photoInset = Number(options.photoInset) >= 0 ? Number(options.photoInset) : 7;
  const textGap = Number(options.textGap) >= 0 ? Number(options.textGap) : 8;
  const rowHeight = Number(options.rowHeight) > 0 ? Number(options.rowHeight) : 16;
  const topPadding = Number(options.topPadding) >= 0 ? Number(options.topPadding) : 8;
  const textMax = Number(options.textMax) > 0 ? Number(options.textMax) : 46;
  const photoValign = options.photoValign === 'top' ? 'top' : 'center';
  const photoAlign = options.photoAlign === 'left' ? 'left' : (options.photoAlign === 'right' ? 'right' : 'center');
  const showLabels = options.showLabels !== false;
  const hideEmail = Boolean(options.hideEmail);
  const hideEjc = Boolean(options.hideEjc);
  const alignColumns = options.alignColumns === true;
  const labelWidth = Number(options.labelWidth) > 0 ? Number(options.labelWidth) : 34;
  const noDividerLabels = Array.isArray(options.noDividerLabels)
    ? options.noDividerLabels.map((item) => normalizeTextInput(item).toLowerCase())
    : [];
  const requestedFields = Array.isArray(options.fields)
    ? options.fields.map((field) => normalizeTextInput(field).toLowerCase()).filter(Boolean)
    : [];
  if (badgeLabel) {
    doc.save();
    doc.roundedRect(x + 6, y + 5, width - 12, 14, 3).fill('#1f2f46');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8).text(badgeLabel, x + 8, y + 9, {
      width: width - 16,
      align: 'center',
      lineBreak: false,
    });
    doc.restore();
  }

  const photoX = x + photoInset;
  const photoY = y + (badgeLabel ? 24 : topPadding);

  doc.lineWidth(0.6).strokeColor('#8793a3').rect(photoX, photoY, photoWidth, photoHeight).stroke();

  const photoPath = resolvePhotoPath(entry.foto);
  if (photoPath) {
    try {
      // Cover preenche todo o quadrado, alinhamento superior garante que o rosto apareça
      doc.save();
      doc.rect(photoX + 1, photoY + 1, photoWidth - 2, photoHeight - 2).clip();
      doc.image(photoPath, photoX + 1, photoY + 1, {
        cover: [photoWidth - 2, photoHeight - 2],
        align: photoAlign,
        valign: photoValign,
      });
      doc.restore();
    } catch (err) {
      // Ignore image rendering failures and keep card printable.
    }
  }

  const textX = photoX + photoWidth + textGap;
  const textWidth = width - (textX - x) - photoInset;
  const headerOffset = badgeLabel ? 24 : topPadding;

  const defaultLines = [
    ['Nome', entry.nomeCompleto, 0, 8.5 + fontBoost + nameFontBoost],
    ['Logradouro', entry.logradouro, 4, 8.5 + fontBoost],
    ['Bairro', entry.bairro, 0, 8.5 + fontBoost],
    ['Email', entry.email, 0, 7.5 + fontBoost],
    ['Telefone', entry.telefone, 0, 8.5 + fontBoost],
    ['Niver', formatDateBR(entry.dataNascimento), 0, 8.5 + fontBoost],
    ['EJC', entry.ejc, 0, 8.5 + fontBoost],
  ];

  const availableFieldLines = {
    nome: ['Nome', entry.nomeCompleto, 0, 8.5 + fontBoost + nameFontBoost],
    instagram: ['Instagram', entry.instagram || '-', 0, 8.5 + fontBoost],
    telefone: ['Telefone', entry.telefone, 0, 8.5 + fontBoost],
    aniversario: ['Niver', formatDateBR(entry.dataNascimento), 0, 8.5 + fontBoost],
    niver: ['Niver', formatDateBR(entry.dataNascimento), 0, 8.5 + fontBoost],
    ejc: ['EJC', entry.ejc, 0, 8.5 + fontBoost],
    email: ['Email', entry.email, 0, 7.5 + fontBoost],
    bairro: ['Bairro', entry.bairro, 0, 8.5 + fontBoost],
    logradouro: ['Logradouro', entry.logradouro, 4, 8.5 + fontBoost],
  };

  let lines = requestedFields.length
    ? requestedFields
      .map((field) => availableFieldLines[field])
      .filter(Boolean)
    : defaultLines;

  if (mode === 'encontro') {
    if (!requestedFields.length && lines[5]) {
      lines[5] = ['Tipo', entry.tipo === 'tios' ? 'Tios' : 'Jovens', 0, 8.5 + fontBoost];
    }
  }

  if (hideEmail) {
    lines = lines.filter(([label]) => label !== 'Email');
  }

  if (hideEjc) {
    lines = lines.filter(([label]) => label !== 'EJC');
  }

  const contentAreaTop = y + headerOffset;
  const contentAreaHeight = Math.max(photoHeight, height - headerOffset - topPadding);
  const linesHeight = lines.reduce((sum, line) => sum + rowHeight + (line[2] || 0), 0);
  let rowY = contentAreaTop + Math.max(0, (contentAreaHeight - linesHeight) / 2);

  lines.forEach(([label, value, extraSpace, fontSize], idx) => {
    const disableDividerForLine = noDividerLabels.includes(normalizeTextInput(label).toLowerCase());
    const isNameLine = normalizeTextInput(label).toLowerCase() === 'nome';
    drawCardLine(doc, textX, rowY, textWidth, label, value, extraSpace, fontSize, {
      rowHeight,
      textMax,
      showLabels,
      alignColumns,
      labelWidth: isNameLine ? Math.max(30, labelWidth - 8) : labelWidth,
      lineInset: 1,
      centerText: true,
      lineGap: 0.6,
      autoFitValue: isNameLine,
      minFontSize: 5.4,
      truncateValue: !isNameLine,
      showDivider: disableDividerForLine ? false : options.showDivider,
      fontName: idx === 0 ? 'Helvetica-Bold' : 'Helvetica',
      lineColor: '#bdc7d3',
    });
    rowY += rowHeight + extraSpace;
  });
};

const buildPdfEntryFromVinculo = (vinculo, pessoa, ejcNome) => ({
  nomeCompleto: pessoa?.nomeCompleto || 'Nao informado',
  ejc: pessoa?.ejc || ejcNome,
  logradouro: pessoa?.logradouro || 'Nao informado',
  bairro: pessoa?.bairro || 'Nao informado',
  dataNascimento: pessoa?.dataNascimento || null,
  telefone: pessoa?.telefone || 'Nao informado',
  email: pessoa?.email || 'Nao informado',
  instagram: pessoa?.instagram || '',
  foto: pessoa?.foto || '',
  tipo: pessoa?.tipo || 'jovens',
  tiosCategoria: pessoa?.tiosCategoria || '',
  tiosGrupoId: pessoa?.tiosGrupoId || '',
  pessoaTipo: vinculo?.pessoaTipo || 'encontrista',
  papel: normalizeTextInput(vinculo?.papel).toLowerCase(),
  descricaoPapel: normalizeTextInput(vinculo?.descricaoPapel),
});

const renderEstruturasPdf = (res, { fileName, mainTitle, groups }) => {
  const PDFDocument = require('pdfkit');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  const left = 40;
  const gap = 12;
  const cardWidth = (515 - gap) / 2;
  const cardHeight = 126;
  const rightX = left + cardWidth + gap;
  const topStart = 40;
  const bottomLimit = 790;

  const drawPageTitle = () => {};
  const mmToPt = (mm) => (mm * 72) / 25.4;

  const getEquipeTipoOrder = (entry) => {
    const tipo = normalizeTextInput(entry && entry.tipo).toLowerCase();
    if (tipo !== 'tios') return 0; // jovens/encontreiro primeiro
    const categoria = normalizeTextInput(entry && entry.tiosCategoria).toLowerCase();
    if (categoria === 'casal') return 1;
    return 2; // tios solo depois
  };

  const sortEquipeEntriesByTipo = (items) => {
    return (items || [])
      .map((entry, idx) => ({ entry, idx }))
      .sort((a, b) => {
        const orderDiff = getEquipeTipoOrder(a.entry) - getEquipeTipoOrder(b.entry);
        if (orderDiff !== 0) return orderDiff;
        return a.idx - b.idx;
      })
      .map((item) => item.entry);
  };

  const drawGrid = (entries, startY, config = {}) => {
    const roleResolver = typeof config.roleResolver === 'function' ? config.roleResolver : null;
    const cardTopLabel = typeof config.cardTopLabel === 'function' ? config.cardTopLabel : null;
    const gridCardHeight = Number(config.cardHeight) > 0 ? Number(config.cardHeight) : cardHeight;
    const gridCardWidth = Number(config.cardWidth) > 0 ? Number(config.cardWidth) : cardWidth;
    const gridGap = Number(config.gap) >= 0 ? Number(config.gap) : gap;
    const rowGap = Number(config.rowGap) >= 0 ? Number(config.rowGap) : 10;
    const gridLeft = Number(config.left) >= 0 ? Number(config.left) : left;
    const gridRightX = gridLeft + gridCardWidth + gridGap;
    const customDrawOptions = config.drawOptions && typeof config.drawOptions === 'object' ? config.drawOptions : {};
    const drawOptions = {
      hideEmail: true,
      hideEjc: true,
      ...customDrawOptions,
    };
    const isTiosCasal = (entry) => {
      const grupoId = normalizeTextInput(entry && entry.tiosGrupoId);
      return Boolean(entry && entry.tipo === 'tios' && entry.tiosCategoria === 'casal' && grupoId);
    };
    const isCasalPair = (leftEntry, rightEntry) => {
      if (!isTiosCasal(leftEntry) || !isTiosCasal(rightEntry)) return false;
      return normalizeTextInput(leftEntry.tiosGrupoId) === normalizeTextInput(rightEntry.tiosGrupoId);
    };
    const topLabelHeight = cardTopLabel ? 12 : 0;
    const rowHeight = gridCardHeight + topLabelHeight;
    let y = startY;
    let col = 0;
    let pendingLeftEntry = null;

    entries.forEach((entry) => {
      if (y + rowHeight > bottomLimit) {
        doc.addPage();
        drawPageTitle();
        y = topStart;
        col = 0;
      }

      const x = col === 0 ? gridLeft : gridRightX;

      if (cardTopLabel) {
        const label = normalizeTextInput(cardTopLabel(entry)).toUpperCase();
        if (label) {
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#1f2f46').text(label, x, y + 1, {
            width: gridCardWidth,
            align: 'center',
            lineBreak: false,
            ellipsis: true,
          });
        }
      }

      drawRegistrationCard(
        doc,
        entry,
        x,
        y + topLabelHeight,
        gridCardWidth,
        gridCardHeight,
        entry.pessoaTipo === 'encontreiro' ? 'encontro' : 'cadastro',
        {
          ...drawOptions,
          badgeLabel: roleResolver ? roleResolver(entry) : '',
        }
      );

      if (col === 0) {
        pendingLeftEntry = entry;
        col = 1;
      } else {
        if (isCasalPair(pendingLeftEntry, entry)) {
          const heartX = gridLeft + gridCardWidth + (gridGap / 2);
          const heartY = y + topLabelHeight + (gridCardHeight / 2);
          drawHeartBetweenCards(doc, heartX, heartY, 19, '#d94868');
        }
        pendingLeftEntry = null;
        col = 0;
        y += rowHeight + rowGap;
      }
    });

    if (col === 1) {
      y += rowHeight + rowGap;
    }

    return y;
  };

  const drawCircleHeader = (groupName, y, options = {}) => {
    const headerLeft = Number(options.left) >= 0 ? Number(options.left) : left;
    const headerWidth = Number(options.width) > 0 ? Number(options.width) : cardWidth;
    const headerHeight = Number(options.height) > 0 ? Number(options.height) : 58;
    const rawName = String(groupName || '').replace(/^circulo\b/i, 'Círculo').trim();
    const parts = rawName.match(/^(.*?)\s[-|]\s(.*)$/);
    const displayName = parts ? parts[1].trim() : rawName;
    const subtitle = parts ? parts[2].trim() : '';
    const titleFontSize = headerHeight >= 90 ? 22 : 16;
    const subtitleFontSize = 11;
    const titleApproxHeight = titleFontSize * 1.15;
    const subtitleApproxHeight = subtitleFontSize * 1.1;
    const subtitleGap = subtitle ? 5 : 0;
    const totalTextHeight = titleApproxHeight + (subtitle ? (subtitleGap + subtitleApproxHeight) : 0);
    const contentTop = y + ((headerHeight - totalTextHeight) / 2);
    const titleY = contentTop;
    const subtitleY = titleY + titleApproxHeight + subtitleGap;
    const lineY = Math.min(y + headerHeight - 6, (subtitle ? (subtitleY + subtitleApproxHeight) : (titleY + titleApproxHeight)) + 4);
    doc.save();
    doc.rect(headerLeft, y, headerWidth, headerHeight).fill('#202020');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(titleFontSize).text(displayName, headerLeft + 12, titleY, {
      width: headerWidth - 24,
      align: 'center',
      lineBreak: false,
      ellipsis: true,
    });

    if (subtitle) {
      doc.fillColor('#f2f2f2').font('Helvetica').fontSize(subtitleFontSize).text(subtitle, headerLeft + 14, subtitleY, {
        width: headerWidth - 28,
        align: 'center',
        lineBreak: false,
        ellipsis: true,
      });
    }

    // Mantem a linha logo abaixo do texto centralizado no bloco.
    doc.strokeColor('#e9eef5').lineWidth(0.9)
      .moveTo(headerLeft + 22, lineY)
      .lineTo(headerLeft + headerWidth - 22, lineY)
      .stroke();
    doc.restore();
    return headerHeight;
  };

  const drawEquipeHeader = (groupName, y) => {
    doc.font('Helvetica-Bold').fontSize(15).fillColor('#1f2f46').text(groupName, left, y, {
      width: 515,
      align: 'right',
      lineBreak: false,
      ellipsis: true,
    });
    return 22;
  };

  drawPageTitle();
  let totalRegistros = 0;

  groups.forEach((group, index) => {
    if (index > 0) {
      doc.addPage();
      drawPageTitle();
    }

    const entradas = Array.isArray(group.entries) ? group.entries : [];
    totalRegistros += entradas.length;

    if (group.tipo === 'circulo') {
      // Layout fixo em milimetros conforme especificacao do usuario.
      const pageMargin = mmToPt(15);
      const titleWidth = mmToPt(82);
      const titleHeight = mmToPt(38);
      const monitorCardWidth = mmToPt(80);
      const monitorCardHeight = mmToPt(32);
      const personCardWidth = mmToPt(85);
      const personCardHeight = mmToPt(34);
      const photoWidth = mmToPt(24);
      const photoHeight = mmToPt(28);
      const colGap = mmToPt(10);
      const rowGap = mmToPt(8);

      const circleLeft = pageMargin - mmToPt(2);
      const circleGap = colGap;
      const circleCardWidth = personCardWidth;
      const circleRightX = circleLeft + circleCardWidth + circleGap;
      const moitaCardWidth = monitorCardWidth;
      const moitaX = circleRightX - mmToPt(2);
      const topBlockHeight = titleHeight;
      const memberCardHeight = personCardHeight;
      const headerY = pageMargin;
      const topCardY = headerY + ((titleHeight - monitorCardHeight) / 2);
      const circleTopCardOptions = {
        fontBoost: 0.2,
        nameFontBoost: 0.5,
        photoWidth,
        photoHeight,
        photoInset: 5,
        textGap: 6,
        rowHeight: 13,
        topPadding: 4,
        textMax: 24,
        showLabels: true,
        alignColumns: true,
        labelWidth: 46,
        showDivider: true,
        topDivider: false,
        hideEmail: true,
        hideEjc: false,
        fields: ['nome', 'instagram', 'telefone', 'aniversario', 'ejc'],
        photoAlign: 'center',
        photoValign: 'center',
      };
      const circleMemberCardOptions = {
        fontBoost: 0.2,
        nameFontBoost: 0.5,
        photoWidth,
        photoHeight,
        photoInset: 5,
        textGap: 6,
        rowHeight: 13,
        topPadding: 4,
        textMax: 24,
        showLabels: true,
        alignColumns: true,
        labelWidth: 46,
        showDivider: true,
        topDivider: false,
        hideEmail: true,
        hideEjc: false,
        fields: ['nome', 'instagram', 'telefone', 'aniversario', 'ejc'],
        photoAlign: 'center',
        photoValign: 'center',
      };
      const moitas = entradas.filter((item) => item.papel === 'moita');
      const outros = entradas.filter((item) => item.papel !== 'moita');

      drawCircleHeader(group.nome, headerY, { height: topBlockHeight, left: circleLeft, width: titleWidth });

      if (moitas.length > 0) {
        const pessoaMoita = moitas[0];

        // Rotulo vertical no meio da coluna, no mesmo estilo do modelo impresso.
        doc.save();
        doc.translate(moitaX - 7 - mmToPt(2), topCardY + (monitorCardHeight / 2));
        doc.rotate(-90);
        doc.font('Helvetica').fontSize(16).fillColor('#1f2f46').text('Moita!', -(monitorCardHeight / 2), -5, {
          width: monitorCardHeight,
          align: 'center',
          lineBreak: false,
        });
        doc.restore();

        drawRegistrationCard(
          doc,
          pessoaMoita,
          moitaX,
          topCardY,
          moitaCardWidth,
          monitorCardHeight,
          pessoaMoita.pessoaTipo === 'encontreiro' ? 'encontro' : 'cadastro',
          {
            ...circleTopCardOptions,
            badgeLabel: '',
          }
        );
      }

      const listaMembros = moitas.length > 1 ? [...moitas.slice(1), ...outros] : outros;
      const blocoTopoFim = headerY + topBlockHeight;
      let y = blocoTopoFim + rowGap;

      if (listaMembros.length > 0) {
        drawGrid(listaMembros, y, {
          left: circleLeft,
          gap: circleGap,
          rowGap,
          cardWidth: circleCardWidth,
          cardHeight: memberCardHeight,
          drawOptions: circleMemberCardOptions,
        });
      }

      if (!entradas.length) {
        doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text('Sem vinculados neste circulo.', left, headerY + 72);
      }
      return;
    }

    const coordenadores = sortEquipeEntriesByTipo(
      entradas.filter((item) => ['coordenador', 'coordenou'].includes(item.papel))
    );
    const membros = sortEquipeEntriesByTipo(
      entradas.filter((item) => !['coordenador', 'coordenou'].includes(item.papel))
    );

    const equipePageMargin = mmToPt(15);
    const equipeCardWidth = mmToPt(85);
    const equipeCardHeight = mmToPt(34);
    const equipePhotoWidth = mmToPt(24);
    const equipePhotoHeight = mmToPt(28);
    const equipeColGap = mmToPt(10);
    const equipeRowGap = mmToPt(8);
    const equipeCardOptions = {
      photoWidth: equipePhotoWidth,
      photoHeight: equipePhotoHeight,
      photoInset: 5,
      textGap: 6,
      rowHeight: 13,
      topPadding: 4,
      textMax: 24,
      showLabels: true,
      alignColumns: true,
      labelWidth: 46,
      showDivider: true,
      topDivider: false,
      hideEmail: true,
      hideEjc: false,
      fields: ['nome', 'instagram', 'telefone', 'aniversario', 'ejc'],
      photoAlign: 'center',
      photoValign: 'center',
    };

    let y = equipePageMargin;
    y += drawEquipeHeader(group.nome, y);

    if (coordenadores.length > 0) {
      const headingText = 'COORDENACAO';
      const headingY = y;
      const headingBoxHeight = 16;
      const headingBoxWidth = 156;
      const headingBoxX = left;

      doc.save();
      doc.roundedRect(headingBoxX, headingY - 1, headingBoxWidth, headingBoxHeight, 4).fill('#edf3fb');
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#1b3f6b').text(headingText, headingBoxX + 8, headingY + 2, {
        width: headingBoxWidth - 16,
        align: 'left',
        lineBreak: false,
      });
      doc.restore();

      doc.strokeColor('#b9c6d8').lineWidth(0.9).moveTo(headingBoxX + headingBoxWidth + 8, headingY + 7).lineTo(left + 515, headingY + 7).stroke();
      y += 18;
      y = drawGrid(coordenadores, y, {
        left: equipePageMargin,
        gap: equipeColGap,
        rowGap: equipeRowGap,
        cardWidth: equipeCardWidth,
        cardHeight: equipeCardHeight,
        drawOptions: equipeCardOptions,
        cardTopLabel: () => 'Coordenador',
      });
      y += 6;
    }

    if (membros.length > 0) {
      drawGrid(membros, y, {
        left: equipePageMargin,
        gap: equipeColGap,
        rowGap: equipeRowGap,
        cardWidth: equipeCardWidth,
        cardHeight: equipeCardHeight,
        drawOptions: equipeCardOptions,
      });
    }

    if (!entradas.length) {
      doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text('Sem vinculados nesta equipe.', left, y + 10);
    }
  });

  if (!groups.length) {
    doc.font('Helvetica').fontSize(11).fillColor('#666').text('Nenhuma estrutura cadastrada para este EJC.', 40, 120, { align: 'center' });
  }

  doc.font('Helvetica').fontSize(8).fillColor('#666').text(
    `Total de registros no PDF: ${totalRegistros}`,
    40,
    doc.page.height - 30,
    { align: 'center' }
  );

  doc.end();
};

const renderCardGridPdf = (res, entries, options) => {
  const PDFDocument = require('pdfkit');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${options.fileName}"`);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  const mmToPt = (mm) => (mm * 72) / 25.4;
  const left = mmToPt(15);
  const topStart = 92;
  const gap = mmToPt(10);
  const cardWidth = mmToPt(85);
  const cardHeight = mmToPt(34);
  const rightX = left + cardWidth + gap;
  const bottomLimit = 790;
  const rowGap = mmToPt(8);

  const sharedCardOptions = {
    photoWidth: mmToPt(24),
    photoHeight: mmToPt(28),
    photoInset: 5,
    textGap: 6,
    rowHeight: 13,
    topPadding: 4,
    textMax: 24,
    showLabels: true,
    alignColumns: true,
    labelWidth: 46,
    showDivider: true,
    topDivider: false,
    hideEmail: true,
    hideEjc: false,
    fields: ['nome', 'instagram', 'telefone', 'aniversario', 'ejc'],
    photoAlign: 'center',
    photoValign: 'center',
  };

  const isTiosCasal = (entry) => {
    const grupoId = normalizeTextInput(entry && entry.tiosGrupoId);
    return Boolean(entry && entry.tipo === 'tios' && entry.tiosCategoria === 'casal' && grupoId);
  };

  const isCasalPair = (leftEntry, rightEntry) => {
    if (!isTiosCasal(leftEntry) || !isTiosCasal(rightEntry)) return false;
    return normalizeTextInput(leftEntry.tiosGrupoId) === normalizeTextInput(rightEntry.tiosGrupoId);
  };

  drawPdfTitle(doc, options.title, `Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}`);

  let y = topStart;
  let col = 0;
  let pendingLeftEntry = null;

  entries.forEach((entry, idx) => {
    if (y + cardHeight > bottomLimit) {
      doc.addPage();
      drawPdfTitle(doc, options.title, `Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}`);
      y = topStart;
      col = 0;
      pendingLeftEntry = null;
    }

    const x = col === 0 ? left : rightX;
    drawRegistrationCard(doc, entry, x, y, cardWidth, cardHeight, options.mode, {
      ...sharedCardOptions,
      ...((options && options.drawOptions) || {}),
    });

    if (col === 0) {
      pendingLeftEntry = entry;
      col = 1;
    } else {
      if (isCasalPair(pendingLeftEntry, entry)) {
        const heartX = left + cardWidth + (gap / 2);
        const heartY = y + (cardHeight / 2);
        drawHeartBetweenCards(doc, heartX, heartY, 19, '#d94868');
      }
      pendingLeftEntry = null;
      col = 0;
      y += cardHeight + rowGap;
    }

    if (idx === entries.length - 1) {
      doc.font('Helvetica').fontSize(8).fillColor('#666').text(
        `Total de registros: ${entries.length}`,
        40,
        doc.page.height - 30,
        { align: 'center' }
      );
    }
  });

  if (entries.length === 0) {
    doc.font('Helvetica').fontSize(11).fillColor('#666').text('Nenhum registro encontrado.', 40, 120, { align: 'center' });
  }

  doc.end();
};

const exportImagesFromModel = async (Model, zipName, res) => {
  const files = await Model.find({}, 'foto').lean();
  const uniqueFiles = [...new Set(files.map((item) => item.foto).filter(Boolean))];

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => {
    console.error('Archive error', err);
    if (!res.headersSent) {
      res.status(500).send('Erro ao criar arquivo ZIP');
    }
  });

  archive.pipe(res);
  uniqueFiles.forEach((fileName) => {
    const filePath = path.join(__dirname, 'uploads', fileName);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: fileName });
    }
  });
  archive.finalize();
};

// routes

// Middleware para verificar autenticação de admin
const checkAdminAuth = (req, res, next) => {
  if (!req.session.adminId) {
    return res.redirect('/admin/login');
  }
  next();
};

app.get('/', (req, res) => {
  // renderizar tela de escolha de tipo de inscrição
  res.render('index');
});

app.get('/index', (req, res) => {
  res.render('index');
});

// expose VAPID public key to clients
app.get('/vapidPublicKey', (req, res) => {
  res.send(vapidKeys.publicKey);
});

// store push subscription from client
app.post('/subscribe', express.json(), async (req, res) => {
  try {
    const sub = req.body;
    await Subscription.updateOne({ endpoint: sub.endpoint }, sub, { upsert: true });
    res.status(201).json({});
  } catch (err) {
    console.error('subscribe error', err);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// export all registrations as CSV or PDF (no JSON support)
app.get('/export', async (req, res) => {
  try {
    const entries = await Cadastro.find().sort({ dataCadastro: 1 }).lean();
    const format = req.query.format || 'csv';

    if (format === 'csv') {
      // build CSV
      const header = ['nomeCompleto','ejc','logradouro','bairro','dataNascimento','email','instagram','foto','dataCadastro'];
      const rows = entries.map(e => header.map(h => {
        let val = e[h];
        if (val instanceof Date) val = val.toISOString();
        return '"'+String(val || '').replace(/"/g,'""')+'"';
      }).join(','));
      const csv = [header.join(','), ...rows].join('\n');
      res.setHeader('Content-Type','text/csv');
      res.setHeader('Content-Disposition','attachment; filename="cadastro_ejc.csv"');
      return res.send(csv);
    } else if (format === 'pdf') {
      renderCardGridPdf(res, entries, {
        fileName: 'cadastro_ejc.pdf',
        title: 'Inscrições - Encontristas',
        mode: 'cadastro',
      });
      return;
    } else {
      return res.status(400).send('Formato de exportação não suportado');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao exportar dados');
  }
});

// export encontro registrations
app.get('/export-encontro', async (req, res) => {
  try {
    const entries = await Encontro.find().sort({ dataCadastro: 1 }).lean();
    const format = req.query.format || 'csv';
    if (format === 'csv') {
      const header = ['nomeCompleto','ejc','logradouro','bairro','equipeServiu','equipeCoordenou','dataNascimento','intolerante','email','instagram','foto','dataCadastro'];
      const rows = entries.map(e => header.map(h => {
        let val = formatExportValue(e[h]);
        if (val instanceof Date) val = val.toISOString();
        return '"'+String(val || '').replace(/"/g,'""')+'"';
      }).join(','));
      const csv = [header.join(','), ...rows].join('\n');
      res.setHeader('Content-Type','text/csv');
      res.setHeader('Content-Disposition','attachment; filename="encontro.csv"');
      return res.send(csv);
    } else if (format === 'pdf') {
      // Reorganizar entries para que casais de tios fiquem lado a lado
      const tiosGroups = {};
      const individuais = [];
      
      entries.forEach(entry => {
        if (entry.tipo === 'tios' && entry.tiosGrupoId) {
          if (!tiosGroups[entry.tiosGrupoId]) {
            tiosGroups[entry.tiosGrupoId] = [];
          }
          tiosGroups[entry.tiosGrupoId].push(entry);
        } else {
          individuais.push(entry);
        }
      });
      
      // Montar array final com tios agrupados lado a lado
      const sortedEntries = [];
      Object.values(tiosGroups).forEach(grupo => {
        sortedEntries.push(...grupo);
      });
      sortedEntries.push(...individuais);
      
      renderCardGridPdf(res, sortedEntries, {
        fileName: 'encontro.pdf',
        title: 'Inscrições - Encontreiros',
        mode: 'encontro',
      });
      return;
    } else {
      return res.status(400).send('Formato de exportação não suportado');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao exportar dados');
  }
});

// export only tios registrations
app.get('/export-tios', async (req, res) => {
  try {
    const entries = await Encontro.find({ tipo: 'tios' }).sort({ dataCadastro: 1 }).lean();
    const format = req.query.format || 'pdf';

    if (format !== 'pdf') {
      return res.status(400).send('Formato de exportacao nao suportado');
    }

    // Manter casais agrupados lado a lado no PDF.
    const tiosGroups = {};
    const individuais = [];

    entries.forEach((entry) => {
      if (entry.tiosGrupoId) {
        if (!tiosGroups[entry.tiosGrupoId]) {
          tiosGroups[entry.tiosGrupoId] = [];
        }
        tiosGroups[entry.tiosGrupoId].push(entry);
      } else {
        individuais.push(entry);
      }
    });

    const sortedEntries = [];
    Object.values(tiosGroups).forEach((grupo) => {
      sortedEntries.push(...grupo);
    });
    sortedEntries.push(...individuais);

    renderCardGridPdf(res, sortedEntries, {
      fileName: 'tios.pdf',
      title: 'Inscricoes - Tios',
      mode: 'encontro',
    });
    return;
  } catch (err) {
    console.error(err);
    return res.status(500).send('Erro ao exportar dados de tios');
  }
});

// export uploaded images as zip
app.get('/export-images', (req, res) => {
  const zipName = 'imagens.zip';
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => {
    console.error('Archive error', err);
    res.status(500).send('Erro ao criar arquivo ZIP');
  });
  archive.pipe(res);
  // add uploads folder
  if (fs.existsSync(path.join(__dirname, 'uploads'))) {
    archive.directory(path.join(__dirname, 'uploads'), false);
  }
  archive.finalize();
});

// export only images from encontristas form
app.get('/export-images-encontristas', async (req, res) => {
  try {
    await exportImagesFromModel(Cadastro, 'imagens_encontristas.zip', res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao exportar imagens');
  }
});

// export only images from encontreiros form
app.get('/export-images-encontreiros', async (req, res) => {
  try {
    await exportImagesFromModel(Encontro, 'imagens_encontreiros.zip', res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao exportar imagens');
  }
});

// export only images from tios
app.get('/export-images-tios', async (req, res) => {
  try {
    const files = await Encontro.find({ tipo: 'tios' }, 'foto').lean();
    const uniqueFiles = [...new Set(files.map((item) => item.foto).filter(Boolean))];

    const zipName = 'imagens_tios.zip';
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      console.error('Archive error', err);
      if (!res.headersSent) {
        res.status(500).send('Erro ao criar arquivo ZIP');
      }
    });

    archive.pipe(res);
    uniqueFiles.forEach((fileName) => {
      const filePath = path.join(__dirname, 'uploads', fileName);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: fileName });
      }
    });
    archive.finalize();
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao exportar imagens de tios');
  }
});

// export encontreiros with detailed equipe columns for easy filtering
app.get('/export-encontro-relatorio', async (req, res) => {
  try {
    const entries = await Encontro.find().sort({ dataCadastro: 1 }).lean();
    
    // Define all equipes
    const equipes = [
      'Sala', 'Garçom', 'Cozinha', 'Cafezinho', 'Tios de externa',
      'Liturgia interna', 'Liturgia externa', 'Secretaria',
      'Ordem e limpeza', 'Apoio e acolhida', 'Compras'
    ];
    
    // Calculate age from birthdate
    const calculateAge = (birthDate) => {
      if (!birthDate) return '';
      const today = new Date();
      const born = new Date(birthDate);
      let age = today.getFullYear() - born.getFullYear();
      const monthDiff = today.getMonth() - born.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) {
        age--;
      }
      return age > 0 ? age : '';
    };
    
    // Build professional header
    const header = [
      'ID',
      'Nome Completo',
      'EJC',
      'Data Nascimento',
      'Idade',
      'Email',
      'Instagram',
      'Total Equipes Serviu',
      'Total Equipes Coordenou',
      'Experiência (Serviu/Coordenou)',
      'Intolerâncias',
      'Data Cadastro'
    ];
    
    // Add equipe columns
    equipes.forEach(eq => {
      header.push(`Serviu: ${eq}`);
    });
    equipes.forEach(eq => {
      header.push(`Coordenou: ${eq}`);
    });
    
    // Build rows with professional data
    const rows = entries.map((e, idx) => {
      const row = [];
      
      // ID
      row.push((idx + 1).toString());
      
      // Nome Completo
      row.push(`"${String(e.nomeCompleto || '').replace(/"/g, '""')}"`);
      
      // EJC
      row.push(`"${String(e.ejc || '').replace(/"/g, '""')}"`);
      
      // Data Nascimento
      let dataNascimentoStr = '';
      let idadeStr = '';
      if (e.dataNascimento) {
        dataNascimentoStr = formatDateBR(e.dataNascimento);
        idadeStr = calculateAge(e.dataNascimento);
      }
      row.push(dataNascimentoStr);
      row.push(idadeStr);
      
      // Email e Instagram
      row.push(`"${String(e.email || '').replace(/"/g, '""')}"`);
      row.push(`"${String(e.instagram || '').replace(/"/g, '""')}"`);
      
      // Total de equipes serviu
      const totalServiu = Array.isArray(e.equipeServiu) ? e.equipeServiu.length : 0;
      row.push(totalServiu.toString());
      
      // Total de equipes coordenou
      const totalCoordenou = Array.isArray(e.equipeCoordenou) ? e.equipeCoordenou.length : 0;
      row.push(totalCoordenou.toString());
      
      // Experiência (resumo)
      let experiencia = '';
      if (totalServiu > 0 && totalCoordenou > 0) {
        experiencia = `Serviu ${totalServiu}x, Coordenou ${totalCoordenou}x`;
      } else if (totalServiu > 0) {
        experiencia = `Serviu ${totalServiu}x`;
      } else if (totalCoordenou > 0) {
        experiencia = `Coordenou ${totalCoordenou}x`;
      } else {
        experiencia = 'Sem experiência registrada';
      }
      row.push(`"${experiencia}"`);
      
      // Intolerâncias / Alergias
      row.push(`"${String(e.intolerante || '').replace(/"/g, '""')}"`);
      
      // Data Cadastro
      let dataCadastroStr = '';
      if (e.dataCadastro) {
        dataCadastroStr = formatDateBR(e.dataCadastro);
      }
      row.push(dataCadastroStr);
      
      // Add equipe columns - Serviu (Sim/Não)
      equipes.forEach(eq => {
        const serviu = Array.isArray(e.equipeServiu) && e.equipeServiu.includes(eq) ? 'Sim' : 'Não';
        row.push(serviu);
      });
      
      // Add equipe columns - Coordenou (Sim/Não)
      equipes.forEach(eq => {
        const coordenou = Array.isArray(e.equipeCoordenou) && e.equipeCoordenou.includes(eq) ? 'Sim' : 'Não';
        row.push(coordenou);
      });
      
      return row.join(',');
    });
    
    // Adicionar linha de resumo com datas
    const now = new Date();
    const summaryRow = [
      'RELATORIO RESUMIDO',
      `Total de Registros: ${entries.length}`,
      '',
      `Gerado em: ${now.toLocaleDateString('pt-BR')}`,
      `Hora: ${now.toLocaleTimeString('pt-BR')}`,
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ];
    
    // Calcula estatísticas
    const totalServiramGeral = entries.reduce((sum, e) => sum + (Array.isArray(e.equipeServiu) ? e.equipeServiu.length : 0), 0);
    const totalCoordenacaosGeral = entries.reduce((sum, e) => sum + (Array.isArray(e.equipeCoordenou) ? e.equipeCoordenou.length : 0), 0);
    
    const csvContent = [
      header.join(','),
      ...rows,
      '',
      summaryRow.join(','),
      `"Pessoa com maior experiência (Serviu + Coordenou): ${Math.max(...entries.map(e => {
        const s = Array.isArray(e.equipeServiu) ? e.equipeServiu.length : 0;
        const c = Array.isArray(e.equipeCoordenou) ? e.equipeCoordenou.length : 0;
        return s + c;
      }))} eventos"`,
      `"Total de serviços registrados: ${totalServiramGeral}"`,
      `"Total de coordenações registradas: ${totalCoordenacaosGeral}"`,
      `"Média de eventos por pessoa (Serviu): ${(totalServiramGeral / entries.length).toFixed(2)}"`,
      `"Média de eventos por pessoa (Coordenou): ${(totalCoordenacaosGeral / entries.length).toFixed(2)}"`
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="encontro_relatorio.csv"');
    return res.send('\uFEFF' + csvContent); // BOM for UTF-8 in Excel
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao exportar relatório');
  }
});

// export encontreiros com planilha moderna e filtros por equipe
app.get('/export-encontro-excel', async (req, res) => {
  try {
    const Excel = require('exceljs');
    const entries = await Encontro.find({ aprovado: true }).sort({ dataCadastro: 1 }).lean();

    const equipes = [
      'Sala',
      'Garçom',
      'Cozinha',
      'Cafezinho',
      'Tios de externa',
      'Liturgia interna',
      'Liturgia externa',
      'Secretaria',
      'Ordem e limpeza',
      'Apoio e acolhida',
      'Compras',
    ];

    const workbook = new Excel.Workbook();
    workbook.creator = 'EJC COP - Sistema de Gestão';
    workbook.company = 'EJC Comunidade de Oração Pai';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.lastPrinted = new Date();

    // ========== ABA PRINCIPAL: DASHBOARD ==========
    const dashboard = workbook.addWorksheet('Dashboard', {
      views: [{ state: 'frozen', ySplit: 4 }],
    });
    dashboard.properties.tabColor = { argb: 'FF0B2545' };

    // Calcular estatísticas
    const estatisticas = equipes.map((equipe) => {
      const serviram = entries.filter((e) => 
        Array.isArray(e.equipeServiu) && e.equipeServiu.includes(equipe)
      ).length;
      const coordenaram = entries.filter((e) => 
        Array.isArray(e.equipeCoordenou) && e.equipeCoordenou.includes(equipe)
      ).length;
      return { equipe, serviram, coordenaram };
    });

    // Configurar colunas
    dashboard.columns = [
      { header: '', key: 'col1', width: 2 },
      { header: 'Equipe', key: 'equipe', width: 28 },
      { header: 'Serviram', key: 'serviram', width: 13 },
      { header: 'Gráfico', key: 'barraServiu', width: 35 },
      { header: 'Coordenaram', key: 'coordenaram', width: 13 },
      { header: 'Gráfico', key: 'barraCoordenou', width: 35 },
      { header: '', key: 'col7', width: 3 },
      { header: 'Dados Gráfico - Equipe', key: 'dadosEquipe', width: 28 },
      { header: 'Dados Gráfico - Valor', key: 'dadosValor', width: 13 },
    ];

    // Banner superior com gradiente
    dashboard.mergeCells('A1:I1');
    const bannerCell = dashboard.getCell('A1');
    bannerCell.value = 'SISTEMA DE GESTAO EJC - ANALISE DE EQUIPES';
    bannerCell.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI' };
    bannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B2545' } };
    bannerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    bannerCell.border = {
      bottom: { style: 'thick', color: { argb: 'FF3A86FF' } },
    };
    dashboard.getRow(1).height = 42;

    // Título principal
    dashboard.mergeCells('B2:F2');
    const titleCell = dashboard.getCell('B2');
    titleCell.value = 'DASHBOARD - ESTATISTICAS DE DESEMPENHO';
    titleCell.font = { bold: true, size: 15, color: { argb: 'FF0B2545' }, name: 'Segoe UI' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4FF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = {
      top: { style: 'thin', color: { argb: 'FF3A86FF' } },
      bottom: { style: 'thin', color: { argb: 'FF3A86FF' } },
      left: { style: 'thin', color: { argb: 'FF3A86FF' } },
      right: { style: 'thin', color: { argb: 'FF3A86FF' } },
    };
    dashboard.getRow(2).height = 32;

    // Subtítulo com informações
    dashboard.mergeCells('B3:F3');
    const subtitleCell = dashboard.getCell('B3');
    const dataHora = new Date();
    subtitleCell.value = `${dataHora.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | ${dataHora.toLocaleTimeString('pt-BR')} | Total: ${entries.length} encontreiros`;
    subtitleCell.font = { italic: true, size: 10, color: { argb: 'FF5A6C7D' }, name: 'Segoe UI' };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFBFF' } };
    subtitleCell.border = {
      bottom: { style: 'thin', color: { argb: 'FFD1E0F0' } },
    };
    dashboard.getRow(3).height = 24;

    // Cabeçalho da tabela de estatísticas
    const headerRow = dashboard.getRow(4);
    headerRow.height = 34;
    ['B4', 'C4', 'D4', 'E4', 'F4'].forEach((cell, idx) => {
      const c = dashboard.getCell(cell);
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B2545' } };
      c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Segoe UI Semibold' };
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c.border = {
        top: { style: 'medium', color: { argb: 'FF3A86FF' } },
        bottom: { style: 'medium', color: { argb: 'FF3A86FF' } },
        left: { style: 'thin', color: { argb: 'FF0B2545' } },
        right: { style: 'thin', color: { argb: 'FF0B2545' } },
      };
    });

    dashboard.getCell('B4').value = 'EQUIPE';
    dashboard.getCell('C4').value = 'SERVIRAM';
    dashboard.getCell('D4').value = 'VISUALIZACAO';
    dashboard.getCell('E4').value = 'COORDENARAM';
    dashboard.getCell('F4').value = 'VISUALIZACAO';

    // Adicionar dados de estatísticas com design moderno
    const maxServiu = Math.max(...estatisticas.map(e => e.serviram), 1);
    const maxCoordenou = Math.max(...estatisticas.map(e => e.coordenaram), 1);

    estatisticas.forEach((stat, idx) => {
      const rowNum = 5 + idx;
      const row = dashboard.getRow(rowNum);
      row.height = 28;

      // Cores alternadas mais sofisticadas
      const bgColor = idx % 2 === 0 ? 'FFF8FBFF' : 'FFFFFFFF';
      const borderColor = 'FFD1E0F0';

      // Equipe
      const equipeCell = dashboard.getCell(`B${rowNum}`);
      equipeCell.value = stat.equipe;
      equipeCell.font = { bold: true, size: 11, color: { argb: 'FF0B2545' }, name: 'Segoe UI' };
      equipeCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      equipeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };

      // Serviram (número) com formatação condicional
      const serviramCell = dashboard.getCell(`C${rowNum}`);
      serviramCell.value = stat.serviram;
      serviramCell.font = { size: 12, bold: true, color: { argb: 'FF06BA63' }, name: 'Segoe UI' };
      serviramCell.alignment = { horizontal: 'center', vertical: 'middle' };
      serviramCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      serviramCell.numFmt = '0';

      // Barra visual serviu com gradiente simulado
      const barraServiuCell = dashboard.getCell(`D${rowNum}`);
      const percentServiu = (stat.serviram / maxServiu) * 100;
      const blocosServiu = Math.max(0, Math.min(30, Math.round(percentServiu / 3.33))); // 0-30 blocos
      const barraServiu = '#'.repeat(blocosServiu) + '-'.repeat(30 - blocosServiu);
      barraServiuCell.value = `${barraServiu} ${percentServiu.toFixed(0)}%`;
      barraServiuCell.font = { size: 9, color: { argb: 'FF06BA63' }, name: 'Consolas' };
      barraServiuCell.alignment = { horizontal: 'left', vertical: 'middle' };
      barraServiuCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };

      // Coordenaram (número) com formatação condicional
      const coordenaramCell = dashboard.getCell(`E${rowNum}`);
      coordenaramCell.value = stat.coordenaram;
      coordenaramCell.font = { size: 12, bold: true, color: { argb: 'FFFF6B35' }, name: 'Segoe UI' };
      coordenaramCell.alignment = { horizontal: 'center', vertical: 'middle' };
      coordenaramCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      coordenaramCell.numFmt = '0';

      // Barra visual coordenou com gradiente simulado
      const barraCoordCell = dashboard.getCell(`F${rowNum}`);
      const percentCoordenou = (stat.coordenaram / maxCoordenou) * 100;
      const blocosCoordenou = Math.max(0, Math.min(30, Math.round(percentCoordenou / 3.33))); // 0-30 blocos
      const barraCoordenou = '#'.repeat(blocosCoordenou) + '-'.repeat(30 - blocosCoordenou);
      barraCoordCell.value = `${barraCoordenou} ${percentCoordenou.toFixed(0)}%`;
      barraCoordCell.font = { size: 9, color: { argb: 'FFFF6B35' }, name: 'Consolas' };
      barraCoordCell.alignment = { horizontal: 'left', vertical: 'middle' };
      barraCoordCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };

      // Bordas modernas
      ['B', 'C', 'D', 'E', 'F'].forEach((col) => {
        dashboard.getCell(`${col}${rowNum}`).border = {
          top: { style: 'thin', color: { argb: borderColor } },
          bottom: { style: 'thin', color: { argb: borderColor } },
          left: { style: 'hair', color: { argb: borderColor } },
          right: { style: 'hair', color: { argb: borderColor } },
        };
      });
    });

    // Linha de totais com destaque
    const totalRowNum = 5 + equipes.length;
    dashboard.getRow(totalRowNum).height = 32;
    
    const totalServiram = estatisticas.reduce((sum, e) => sum + e.serviram, 0);
    const totalCoordenaram = estatisticas.reduce((sum, e) => sum + e.coordenaram, 0);

    dashboard.getCell(`B${totalRowNum}`).value = 'TOTAL GERAL';
    dashboard.getCell(`C${totalRowNum}`).value = totalServiram;
    dashboard.getCell(`D${totalRowNum}`).value = `#`.repeat(30) + ' 100%';
    dashboard.getCell(`E${totalRowNum}`).value = totalCoordenaram;
    dashboard.getCell(`F${totalRowNum}`).value = `#`.repeat(30) + ' 100%';

    ['B', 'C', 'D', 'E', 'F'].forEach((col) => {
      const cell = dashboard.getCell(`${col}${totalRowNum}`);
      cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI Semibold' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B2545' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'double', color: { argb: 'FF3A86FF' } },
        bottom: { style: 'double', color: { argb: 'FF3A86FF' } },
        left: { style: 'thin', color: { argb: 'FF0B2545' } },
        right: { style: 'thin', color: { argb: 'FF0B2545' } },
      };
    });
    dashboard.getCell(`C${totalRowNum}`).font = { bold: true, size: 13, color: { argb: 'FF06FFA5' }, name: 'Segoe UI' };
    dashboard.getCell(`E${totalRowNum}`).font = { bold: true, size: 13, color: { argb: 'FFFF6B35' }, name: 'Segoe UI' };

    // Legenda moderna
    const legendRowNum = totalRowNum + 2;
    dashboard.mergeCells(`B${legendRowNum}:F${legendRowNum}`);
    const legendCell = dashboard.getCell(`B${legendRowNum}`);
    legendCell.value = 'Legenda: # = Preenchido | - = Vazio | Verde = Serviram | Laranja = Coordenaram | Porcentagem relativa ao maximo';
    legendCell.font = { italic: true, size: 9, color: { argb: 'FF6B7A8C' }, name: 'Segoe UI' };
    legendCell.alignment = { horizontal: 'center', vertical: 'middle' };
    legendCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBF0' } };
    legendCell.border = {
      top: { style: 'thin', color: { argb: 'FFFFD966' } },
      bottom: { style: 'thin', color: { argb: 'FFFFD966' } },
      left: { style: 'thin', color: { argb: 'FFFFD966' } },
      right: { style: 'thin', color: { argb: 'FFFFD966' } },
    };
    dashboard.getRow(legendRowNum).height = 22;

    // ========== SECAO DE GRAFICOS ==========
    const graficosStartRow = legendRowNum + 3;

    // Título da seção de gráficos
    dashboard.mergeCells(`B${graficosStartRow}:I${graficosStartRow}`);
    const graficosTitleCell = dashboard.getCell(`B${graficosStartRow}`);
    graficosTitleCell.value = 'DADOS PARA CRIACAO DE GRAFICOS PERSONALIZADOS';
    graficosTitleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI' };
    graficosTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B2545' } };
    graficosTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    graficosTitleCell.border = {
      top: { style: 'medium', color: { argb: 'FF3A86FF' } },
      bottom: { style: 'medium', color: { argb: 'FF3A86FF' } },
      left: { style: 'thin', color: { argb: 'FF0B2545' } },
      right: { style: 'thin', color: { argb: 'FF0B2545' } },
    };
    dashboard.getRow(graficosStartRow).height = 35;

    // Seção 1: Dados de Serviram
    const graficoServiuStartRow = graficosStartRow + 2;
    dashboard.mergeCells(`H${graficoServiuStartRow}:I${graficoServiuStartRow}`);
    const serviuSubtitle = dashboard.getCell(`H${graficoServiuStartRow}`);
    serviuSubtitle.value = 'PESSOAS QUE SERVIRAM POR EQUIPE';
    serviuSubtitle.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI' };
    serviuSubtitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF06BA63' } };
    serviuSubtitle.alignment = { horizontal: 'center', vertical: 'middle' };
    serviuSubtitle.border = {
      top: { style: 'thin', color: { argb: 'FF06BA63' } },
      bottom: { style: 'thin', color: { argb: 'FF06BA63' } },
      left: { style: 'thin', color: { argb: 'FF06BA63' } },
      right: { style: 'thin', color: { argb: 'FF06BA63' } },
    };
    dashboard.getRow(graficoServiuStartRow).height = 26;
    
    const chartDataStartRow = graficoServiuStartRow + 1;
    
    // Header para dados do gráfico - Serviu
    const headerServiuH = dashboard.getCell(`H${chartDataStartRow}`);
    headerServiuH.value = 'Equipe';
    headerServiuH.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI Semibold' };
    headerServiuH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF06BA63' } };
    headerServiuH.alignment = { horizontal: 'center', vertical: 'middle' };
    headerServiuH.border = {
      top: { style: 'medium', color: { argb: 'FF06BA63' } },
      bottom: { style: 'medium', color: { argb: 'FF06BA63' } },
      left: { style: 'thin', color: { argb: 'FF06BA63' } },
      right: { style: 'thin', color: { argb: 'FF06BA63' } },
    };
    
    const headerServiuI = dashboard.getCell(`I${chartDataStartRow}`);
    headerServiuI.value = 'Quantidade';
    headerServiuI.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI Semibold' };
    headerServiuI.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF06BA63' } };
    headerServiuI.alignment = { horizontal: 'center', vertical: 'middle' };
    headerServiuI.border = {
      top: { style: 'medium', color: { argb: 'FF06BA63' } },
      bottom: { style: 'medium', color: { argb: 'FF06BA63' } },
      left: { style: 'thin', color: { argb: 'FF06BA63' } },
      right: { style: 'thin', color: { argb: 'FF06BA63' } },
    };
    dashboard.getRow(chartDataStartRow).height = 24;
    
    estatisticas.forEach((stat, idx) => {
      const rowNum = chartDataStartRow + 1 + idx;
      const row = dashboard.getRow(rowNum);
      row.height = 22;
      
      const cellH = dashboard.getCell(`H${rowNum}`);
      const cellI = dashboard.getCell(`I${rowNum}`);
      
      const bgColor = idx % 2 === 0 ? 'FFE8F9F0' : 'FFFFFFFF';
      
      cellH.value = `- ${stat.equipe}`;
      cellH.font = { size: 10, color: { argb: 'FF0B2545' }, name: 'Segoe UI' };
      cellH.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      cellH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cellH.border = {
        top: { style: 'thin', color: { argb: 'FFD1E0F0' } },
        bottom: { style: 'thin', color: { argb: 'FFD1E0F0' } },
        left: { style: 'thin', color: { argb: 'FFD1E0F0' } },
        right: { style: 'hair', color: { argb: 'FFD1E0F0' } },
      };
      
      cellI.value = stat.serviram;
      cellI.font = { size: 11, bold: true, color: { argb: 'FF06BA63' }, name: 'Segoe UI' };
      cellI.alignment = { horizontal: 'center', vertical: 'middle' };
      cellI.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cellI.numFmt = '0';
      cellI.border = {
        top: { style: 'thin', color: { argb: 'FFD1E0F0' } },
        bottom: { style: 'thin', color: { argb: 'FFD1E0F0' } },
        left: { style: 'hair', color: { argb: 'FFD1E0F0' } },
        right: { style: 'thin', color: { argb: 'FFD1E0F0' } },
      };
    });

    // Seção 2: Dados de Coordenaram
    const graficoCoordenouStartRow = chartDataStartRow + equipes.length + 3;
    dashboard.mergeCells(`H${graficoCoordenouStartRow}:I${graficoCoordenouStartRow}`);
    const coordenouSubtitle = dashboard.getCell(`H${graficoCoordenouStartRow}`);
    coordenouSubtitle.value = 'PESSOAS QUE COORDENARAM POR EQUIPE';
    coordenouSubtitle.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI' };
    coordenouSubtitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B35' } };
    coordenouSubtitle.alignment = { horizontal: 'center', vertical: 'middle' };
    coordenouSubtitle.border = {
      top: { style: 'thin', color: { argb: 'FFFF6B35' } },
      bottom: { style: 'thin', color: { argb: 'FFFF6B35' } },
      left: { style: 'thin', color: { argb: 'FFFF6B35' } },
      right: { style: 'thin', color: { argb: 'FFFF6B35' } },
    };
    dashboard.getRow(graficoCoordenouStartRow).height = 26;
    
    const chartDataCoordenouStartRow = graficoCoordenouStartRow + 1;
    
    // Header para dados do gráfico coordenou
    const headerCoordenouH = dashboard.getCell(`H${chartDataCoordenouStartRow}`);
    headerCoordenouH.value = 'Equipe';
    headerCoordenouH.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI Semibold' };
    headerCoordenouH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B35' } };
    headerCoordenouH.alignment = { horizontal: 'center', vertical: 'middle' };
    headerCoordenouH.border = {
      top: { style: 'medium', color: { argb: 'FFFF6B35' } },
      bottom: { style: 'medium', color: { argb: 'FFFF6B35' } },
      left: { style: 'thin', color: { argb: 'FFFF6B35' } },
      right: { style: 'thin', color: { argb: 'FFFF6B35' } },
    };
    
    const headerCoordenouI = dashboard.getCell(`I${chartDataCoordenouStartRow}`);
    headerCoordenouI.value = 'Quantidade';
    headerCoordenouI.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI Semibold' };
    headerCoordenouI.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B35' } };
    headerCoordenouI.alignment = { horizontal: 'center', vertical: 'middle' };
    headerCoordenouI.border = {
      top: { style: 'medium', color: { argb: 'FFFF6B35' } },
      bottom: { style: 'medium', color: { argb: 'FFFF6B35' } },
      left: { style: 'thin', color: { argb: 'FFFF6B35' } },
      right: { style: 'thin', color: { argb: 'FFFF6B35' } },
    };
    dashboard.getRow(chartDataCoordenouStartRow).height = 24;
    
    estatisticas.forEach((stat, idx) => {
      const rowNum = chartDataCoordenouStartRow + 1 + idx;
      const row = dashboard.getRow(rowNum);
      row.height = 22;
      
      const cellH = dashboard.getCell(`H${rowNum}`);
      const cellI = dashboard.getCell(`I${rowNum}`);
      
      const bgColor = idx % 2 === 0 ? 'FFFFF5EE' : 'FFFFFFFF';
      
      cellH.value = `- ${stat.equipe}`;
      cellH.font = { size: 10, color: { argb: 'FF0B2545' }, name: 'Segoe UI' };
      cellH.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      cellH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cellH.border = {
        top: { style: 'thin', color: { argb: 'FFD1E0F0' } },
        bottom: { style: 'thin', color: { argb: 'FFD1E0F0' } },
        left: { style: 'thin', color: { argb: 'FFD1E0F0' } },
        right: { style: 'hair', color: { argb: 'FFD1E0F0' } },
      };
      
      cellI.value = stat.coordenaram;
      cellI.font = { size: 11, bold: true, color: { argb: 'FFFF6B35' }, name: 'Segoe UI' };
      cellI.alignment = { horizontal: 'center', vertical: 'middle' };
      cellI.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cellI.numFmt = '0';
      cellI.border = {
        top: { style: 'thin', color: { argb: 'FFD1E0F0' } },
        bottom: { style: 'thin', color: { argb: 'FFD1E0F0' } },
        left: { style: 'hair', color: { argb: 'FFD1E0F0' } },
        right: { style: 'thin', color: { argb: 'FFD1E0F0' } },
      };
    });

    // Instruções para criar gráficos (caixa de ajuda)
    const instRowNum = graficoCoordenouStartRow + equipes.length + 4;
    dashboard.mergeCells(`B${instRowNum}:F${instRowNum + 3}`);
    const instCell = dashboard.getCell(`B${instRowNum}`);
    instCell.value = 'INSTRUCOES PARA CRIAR GRAFICOS NO EXCEL:\n\n1. Selecione os dados nas colunas H e I (uma tabela por vez)\n2. Clique em "Inserir" > "Grafico" > "Colunas" ou "Barras"\n3. Personalize cores, titulos e legendas conforme sua preferencia\n4. Use as cores sugeridas: Verde (#06BA63) para Serviram | Laranja (#FF6B35) para Coordenaram';
    instCell.font = { size: 10, color: { argb: 'FF5A4A00' }, name: 'Segoe UI' };
    instCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    instCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFADB' } };
    instCell.border = {
      top: { style: 'medium', color: { argb: 'FFFFC966' } },
      bottom: { style: 'medium', color: { argb: 'FFFFC966' } },
      left: { style: 'medium', color: { argb: 'FFFFC966' } },
      right: { style: 'medium', color: { argb: 'FFFFC966' } },
    };
    dashboard.getRow(instRowNum).height = 80;

    // ========== ABAS DE EQUIPES ==========
    // Criar uma aba para cada equipe
    equipes.forEach((equipeAtual) => {
      // Filtrar apenas pessoas que NAO selecionaram esta equipe
      const pessoasDisponiveis = entries.filter((e) => {
        const serviuNaEquipe = Array.isArray(e.equipeServiu) && e.equipeServiu.includes(equipeAtual);
        const coordenouNaEquipe = Array.isArray(e.equipeCoordenou) && e.equipeCoordenou.includes(equipeAtual);
        return !serviuNaEquipe && !coordenouNaEquipe;
      });

      const worksheet = workbook.addWorksheet(equipeAtual, {
        views: [{ state: 'frozen', ySplit: 1 }],
      });

      worksheet.columns = [
        { header: 'Nome', key: 'nome', width: 34 },
        { header: 'Como quer ser chamado', key: 'comoQuerSerChamado', width: 26 },
        { header: 'Genero', key: 'genero', width: 14 },
        { header: 'EJC', key: 'ejc', width: 18 },
        { header: 'A qual EJC pertence', key: 'qualEjcPertence', width: 22 },
        { header: 'Tipo', key: 'tipo', width: 12 },
        { header: 'Categoria Tios', key: 'tiosCategoria', width: 14 },
        { header: 'Origem Tios', key: 'origemTios', width: 14 },
        { header: 'Tem Veiculo Proprio', key: 'temVeiculoProprio', width: 18 },
        { header: 'Logradouro', key: 'logradouro', width: 30 },
        { header: 'Bairro', key: 'bairro', width: 22 },
        { header: 'Equipes que Serviu', key: 'equipeServiu', width: 35 },
        { header: 'Equipes que Coordenou', key: 'equipeCoordenou', width: 35 },
        { header: 'Data de Nascimento', key: 'dataNascimento', width: 18 },
        { header: 'Telefone', key: 'telefone', width: 18 },
        { header: 'Intolerancias/Alergias', key: 'intolerante', width: 28 },
        { header: 'Email', key: 'email', width: 28 },
        { header: 'Status', key: 'statusAprovacao', width: 14 },
        { header: 'Relacionamento com encontreiro/encontrista', key: 'temRelacionamento', width: 34 },
        { header: 'Instagram', key: 'instagram', width: 24 },
        { header: 'Observacoes', key: 'observacoes', width: 34 },
      ];

      // Definir cor da tab
      worksheet.properties.tabColor = { argb: 'FF3A86FF' };

      // Estilo do cabeçalho moderno
      const headerRow = worksheet.getRow(1);
      headerRow.height = 32;
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0B2545' },
        };
        cell.font = {
          bold: true,
          color: { argb: 'FFFFFFFF' },
          size: 11,
          name: 'Segoe UI Semibold',
        };
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF3A86FF' } },
          bottom: { style: 'double', color: { argb: 'FF3A86FF' } },
          left: { style: 'thin', color: { argb: 'FF0B2545' } },
          right: { style: 'thin', color: { argb: 'FF0B2545' } },
        };
      });

      // Adicionar filtros automáticos
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 21 },
      };

      // Adicionar dados
      pessoasDisponiveis.forEach((e, idx) => {
        const tipoTexto = e.tipo === 'tios' ? 'Tios' : 'Jovens';
        
        const rowData = {
          nome: e.nomeCompleto || '',
          comoQuerSerChamado: e.comoQuerSerChamado || '',
          genero: e.genero || '',
          ejc: e.ejc || '',
          qualEjcPertence: e.qualEjcPertence || '',
          tipo: tipoTexto,
          tiosCategoria: e.tipo === 'tios' ? (e.tiosCategoria === 'casal' ? 'Casal' : 'Solo') : '-',
          origemTios: e.tipo === 'tios' ? (e.origemTios ? 'Sim' : 'Nao') : '-',
          temVeiculoProprio: e.temVeiculoProprio ? 'Sim' : 'Nao',
          logradouro: e.logradouro || '',
          bairro: e.bairro || '',
          equipeServiu: Array.isArray(e.equipeServiu) ? e.equipeServiu.join(', ') : '',
          equipeCoordenou: Array.isArray(e.equipeCoordenou) ? e.equipeCoordenou.join(', ') : '',
          dataNascimento: e.dataNascimento ? new Date(e.dataNascimento).toLocaleDateString('pt-BR') : '',
          telefone: e.telefone || '',
          intolerante: e.intolerante || '',
          email: e.email || '',
          statusAprovacao: resolveApprovalStatus(e),
          temRelacionamento: e.temRelacionamento || '',
          instagram: e.instagram || '',
          observacoes: e.observacoes || '',
        };

        const row = worksheet.addRow(rowData);
        row.height = 24;

        const bgColor = idx % 2 === 0 ? 'FFF8FBFF' : 'FFFFFFFF';
        row.eachCell((cell, colNumber) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgColor },
          };
          cell.font = {
            size: 10,
            color: { argb: 'FF1A2332' },
            name: 'Segoe UI',
          };
          cell.alignment = {
            horizontal: 'left',
            vertical: 'middle',
            wrapText: true,
          };
          cell.border = {
            top: { style: 'hair', color: { argb: 'FFD1E0F0' } },
            bottom: { style: 'hair', color: { argb: 'FFD1E0F0' } },
            left: { style: 'hair', color: { argb: 'FFD1E0F0' } },
            right: { style: 'hair', color: { argb: 'FFD1E0F0' } },
          };
        });
      });

      // Linha de resumo moderna
      worksheet.addRow({});
      const summaryRow = worksheet.addRow({
        nome: `Total disponíveis para ${equipeAtual}: ${pessoasDisponiveis.length} pessoa(s)`,
        comoQuerSerChamado: '',
        genero: '',
        ejc: '',
        qualEjcPertence: '',
        tipo: '',
        tiosCategoria: '',
        origemTios: '',
        temVeiculoProprio: '',
        logradouro: '',
        bairro: '',
        equipeServiu: '',
        equipeCoordenou: '',
        dataNascimento: '',
        telefone: '',
        intolerante: '',
        email: `Gerado em: ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} às ${new Date().toLocaleTimeString('pt-BR')}`,
        statusAprovacao: '',
        temRelacionamento: '',
        instagram: '',
        observacoes: '',
      });
      summaryRow.height = 28;
      summaryRow.eachCell((cell, colNumber) => {
        cell.font = {
          bold: true,
          size: 10,
          color: { argb: 'FF0B2545' },
          name: 'Segoe UI Semibold',
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8F4FF' },
        };
        cell.alignment = {
          horizontal: 'left',
          vertical: 'middle',
        };
        cell.border = {
          top: { style: 'double', color: { argb: 'FF3A86FF' } },
          bottom: { style: 'thin', color: { argb: 'FF3A86FF' } },
          left: { style: 'hair', color: { argb: 'FFD1E0F0' } },
          right: { style: 'hair', color: { argb: 'FFD1E0F0' } },
        };
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="EJC_Relatorio_Equipes_' + new Date().toISOString().split('T')[0] + '.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Erro ao exportar Excel:', err);
    res.status(500).send('Erro ao exportar planilha: ' + err.message);
  }
});

// Export encontristas com planilha moderna e profissional
app.get('/export-encontrista-excel', async (req, res) => {
  try {
    const Excel = require('exceljs');
    const entries = await Cadastro.find().sort({ dataCadastro: 1 }).lean();

    const workbook = new Excel.Workbook();
    workbook.creator = 'EJC COP - Sistema de Gestão';
    workbook.company = 'EJC Comunidade de Oração Pai';
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet('Encontristas', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    worksheet.properties.tabColor = { argb: 'FF06BA63' };

    worksheet.columns = [
      { header: 'Nome Completo', key: 'nome', width: 36 },
      { header: 'EJC', key: 'ejc', width: 12 },
      { header: 'Telefone', key: 'telefone', width: 18 },
      { header: 'Email', key: 'email', width: 32 },
      { header: 'CEP', key: 'cep', width: 14 },
      { header: 'Estado Civil', key: 'estadoCivil', width: 18 },
      { header: 'Nome Mae', key: 'nomeMae', width: 28 },
      { header: 'Telefone Mae', key: 'telefoneMae', width: 18 },
      { header: 'Nome Pai', key: 'nomePai', width: 28 },
      { header: 'Telefone Pai', key: 'telefonePai', width: 18 },
      { header: 'Paroquia', key: 'paroquiaFrequenta', width: 26 },
      { header: 'Movimento Igreja', key: 'participaMovimentoIgreja', width: 24 },
      { header: 'Conhecido Inscricao', key: 'conhecidoInscricaoHoje', width: 24 },
      { header: 'Conhecido Fez EJC', key: 'conhecidoFezEjc', width: 24 },
      { header: 'Inscricao Anterior', key: 'inscricaoAnterior', width: 24 },
      { header: 'Instrumento/Canto', key: 'instrumentoMusical', width: 24 },
      { header: 'Expectativa', key: 'expectativaXixEjcCop', width: 40 },
      { header: 'Intolerancias', key: 'intolerante', width: 24 },
      { header: 'Logradouro', key: 'logradouro', width: 32 },
      { header: 'Bairro', key: 'bairro', width: 24 },
      { header: 'Data Nascimento', key: 'dataNascimento', width: 16 },
      { header: 'Instagram', key: 'instagram', width: 20 },
      { header: 'Aprovado', key: 'aprovado', width: 12 },
    ];

    // Cabeçalho com estilo moderno e profissional
    const headerRow = worksheet.getRow(1);
    headerRow.height = 34;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0B2545' },
      };
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 11,
        name: 'Segoe UI Semibold',
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF3A86FF' } },
        bottom: { style: 'double', color: { argb: 'FF3A86FF' } },
        left: { style: 'thin', color: { argb: 'FF0B2545' } },
        right: { style: 'thin', color: { argb: 'FF0B2545' } },
      };
    });

    // Adicionar filtros automáticos
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 27 },
    };

    // Adicionar dados com formatação moderna
    entries.forEach((entry, idx) => {
      const row = worksheet.addRow({
        nome: entry.nomeCompleto || '',
        ejc: entry.ejc || '',
        telefone: entry.telefone || '',
        email: entry.email || '',
        cep: entry.cep || '',
        estadoCivil: entry.estadoCivil || '',
        nomeMae: entry.nomeMae || '',
        telefoneMae: entry.telefoneMae || '',
        nomePai: entry.nomePai || '',
        telefonePai: entry.telefonePai || '',
        paroquiaFrequenta: entry.paroquiaFrequenta || '',
        participaMovimentoIgreja: entry.participaMovimentoIgreja || '',
        conhecidoInscricaoHoje: entry.conhecidoInscricaoHoje || '',
        conhecidoFezEjc: entry.conhecidoFezEjc || '',
        inscricaoAnterior: entry.inscricaoAnterior || '',
        instrumentoMusical: entry.instrumentoMusical || '',
        expectativaXixEjcCop: entry.expectativaXixEjcCop || '',
        intolerante: entry.intolerante || '',
        logradouro: entry.logradouro || '',
        bairro: entry.bairro || '',
        dataNascimento: entry.dataNascimento
          ? new Date(entry.dataNascimento).toLocaleDateString('pt-BR')
          : '',
        instagram: entry.instagram || '',
        aprovado: entry.aprovado ? 'SIM' : 'NAO',
      });

      row.height = 24;
      const bgColor = idx % 2 === 0 ? 'FFF8FBFF' : 'FFFFFFFF';

      row.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor },
        };
        cell.font = {
          size: 10,
          color: { argb: 'FF1A2332' },
          name: 'Segoe UI',
        };
        cell.alignment = {
          horizontal: 'left',
          vertical: 'middle',
          wrapText: true,
        };
        cell.border = {
          top: { style: 'hair', color: { argb: 'FFD1E0F0' } },
          bottom: { style: 'hair', color: { argb: 'FFD1E0F0' } },
          left: { style: 'hair', color: { argb: 'FFD1E0F0' } },
          right: { style: 'hair', color: { argb: 'FFD1E0F0' } },
        };

        // Formatação especial para coluna Aprovado
        if (colNumber === 9) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.font = {
            bold: true,
            size: 10,
            color: { argb: entry.aprovado ? 'FF06BA63' : 'FFFF6B35' },
            name: 'Segoe UI',
          };
        }
      });
    });

    // Linha de resumo
    worksheet.addRow({});
    const summaryRow = worksheet.addRow({
      nome: `Total de Encontristas: ${entries.length}`,
      ejc: '',
      telefone: '',
      email: `Gerado em: ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} às ${new Date().toLocaleTimeString('pt-BR')}`,
      logradouro: '',
      bairro: '',
      dataNascimento: '',
      instagram: '',
      aprovado: '',
    });
    summaryRow.height = 28;
    summaryRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        size: 10,
        color: { argb: 'FF0B2545' },
        name: 'Segoe UI Semibold',
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8F4FF' },
      };
      cell.alignment = {
        horizontal: 'left',
        vertical: 'middle',
      };
      cell.border = {
        top: { style: 'double', color: { argb: 'FF3A86FF' } },
        bottom: { style: 'thin', color: { argb: 'FF3A86FF' } },
        left: { style: 'hair', color: { argb: 'FFD1E0F0' } },
        right: { style: 'hair', color: { argb: 'FFD1E0F0' } },
      };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="EJC_Encontristas_' + new Date().toISOString().split('T')[0] + '.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Erro ao exportar planilha de encontristas:', err);
    res.status(500).send('Erro ao exportar planilha: ' + err.message);
  }
});

app.get('/inscricao', (req, res) => {
  res.render('inscricao', { errors: [], formData: {} });
});

// DEBUG: Endpoint temporário para verificar encontreiros
app.get('/debug/encontreiros', checkAdminAuth, async (req, res) => {
  try {
    const total = await Encontro.countDocuments();
    const pendentes = await Encontro.countDocuments({ $or: [{ aprovado: false }, { aprovado: null }, { aprovado: undefined }] });
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

app.get('/encontro', (req, res) => {
  res.render('encontro', { errors: [], formData: {} });
});

app.post(
  '/inscricao',
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
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email inválido'),
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
      const cadastroExistente = await findExistingByNameOrEmail(Cadastro, req.body.nomeCompleto, '');

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
        ejc: req.body.ejc || 'Nao informado',
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
        email: req.body.email || '',
        instagram: req.body.instagram || '',
      };

      let cadastro;
      let created = false;
      if (cadastroExistente) {
        const updateData = { ...cadastroData };
        if (req.file) {
          if (cadastroExistente.foto) {
            const oldPhotoPath = path.join(__dirname, 'uploads', cadastroExistente.foto);
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

app.post(
  '/encontro',
  upload.single('foto'),
  [
    body('nomeCompleto').notEmpty().withMessage('Nome completo é obrigatório'),
    body('genero').isIn(['masculino', 'feminino', 'outros', 'homem', 'mulher']).withMessage('Gênero inválido'),
    body('ejc').notEmpty().withMessage('EJC é obrigatório'),
    body('tipo').isIn(['jovens', 'tios']).withMessage('Tipo inválido'),
    body('logradouro').notEmpty().withMessage('Logradouro é obrigatório'),
    body('bairro').notEmpty().withMessage('Bairro é obrigatório'),
    body('dataNascimento').notEmpty().withMessage('Data de nascimento é obrigatória'),
    body('telefone').notEmpty().withMessage('Telefone é obrigatório'),
    body('email').isEmail().withMessage('Email inválido'),
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
      const encontroExistente = await findExistingByNameOrEmail(Encontro, req.body.nomeCompleto, '');

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
        ejc: req.body.ejc,
        qualEjcPertence: req.body.qualEjcPertence || '',
        tipo: tipoNormalizado,
        tiosCategoria: tipoNormalizado === 'tios' ? (normalizeTextInput(req.body.tiosCategoria).toLowerCase() === 'casal' ? 'casal' : 'solo') : '',
        origemTios: req.body.origemTios === 'true',
        tiosGrupoId: (tipoNormalizado === 'tios' && normalizeTextInput(req.body.tiosCategoria).toLowerCase() === 'casal')
          ? normalizeTextInput(req.body.tiosGrupoId)
          : '',
        equipeServiu: normalizeMultiField(req.body.equipeServiu),
        equipeCoordenou: normalizeMultiField(req.body.equipeCoordenou),
        temVeiculoProprio: req.body.temVeiculoProprio === 'true' || req.body.temVeiculoProprio === true,
        logradouro: req.body.logradouro,
        bairro: req.body.bairro,
        dataNascimento: req.body.dataNascimento,
        telefone: req.body.telefone,
        intolerante: req.body.intolerante || '',
        email: req.body.email,
        temRelacionamento: req.body.temRelacionamento || '',
        instagram: req.body.instagram || '',
        observacoes: req.body.observacoes || '',
      };

      let encontro;
      let created = false;
      if (encontroExistente) {
        const updateData = { ...encontroData };
        if (req.file) {
          if (encontroExistente.foto) {
            const oldPhotoPath = path.join(__dirname, 'uploads', encontroExistente.foto);
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
        return res.json({ success: true, created, updated: !created });
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

// ROTAS DE ADMIN

// GET /admin/login - Exibir formulário de login
app.get('/admin/login', (req, res) => {
  if (req.session.adminId) {
    return res.redirect('/admin/gerenciar-cadastros');
  }
  res.render('admin-login', { error: null });
});

// POST /admin/login - Processar login
app.post('/admin/login', async (req, res) => {
  try {
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

    req.session.adminId = admin._id;
    req.session.adminUsername = admin.username;
    res.redirect('/admin/gerenciar-cadastros');
  } catch (err) {
    console.error('Login error:', err);
    res.render('admin-login', { error: 'Erro no servidor' });
  }
});

// GET /admin/home - Compatibilidade: redireciona para painel de gestão
app.get('/admin/home', checkAdminAuth, (req, res) => {
  return res.redirect('/admin/gerenciar-cadastros');
});

// GET /admin/dashboard - Painel de admin (rota protegida)
app.get('/admin/dashboard', checkAdminAuth, async (req, res) => {
  try {
    const pendentesEncontristas = await Cadastro.find({ statusAprovacao: { $in: ['pendente', null] } }).sort({ dataCadastro: -1 }).lean();
    const aprovadosEncontristas = await Cadastro.find({ aprovado: true }).sort({ dataCadastro: -1 }).lean();
    const reprovadosEncontristas = await Cadastro.find({ statusAprovacao: 'reprovado' }).sort({ dataCadastro: -1 }).lean();
    const pendentesEncontreiros = await Encontro.find({ statusAprovacao: { $in: ['pendente', null] } }).sort({ dataCadastro: -1 }).lean();
    const aprovadosEncontreiros = await Encontro.find({ aprovado: true }).sort({ dataCadastro: -1 }).lean();
    const reprovadosEncontreiros = await Encontro.find({ statusAprovacao: 'reprovado' }).sort({ dataCadastro: -1 }).lean();
    
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
      mensagemSucesso,
      mensagemErro
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).send('Erro ao carregar dashboard');
  }
});

// POST /admin/aprovar - Aprovar um cadastro
app.post('/admin/aprovar', checkAdminAuth, async (req, res) => {
  try {
    const id = String(req.body.id || '').trim();
    const tipoListaRaw = String(req.body.tipoLista || req.body.tipo || '').trim().toLowerCase();

    const tipoLista = tipoListaRaw === 'encontrista' ? 'encontrista' :
      (['encontreiro', 'encontro', 'tios', 'casal'].includes(tipoListaRaw) ? 'encontreiro' : '');

    console.log(`[INFO] Aprovação: ${id} - tipo=${tipoLista}`);

    if (!id || !tipoLista) {
      console.error('[ERRO] ID ou tipo inválidos');
      return res.status(400).json({ success: false, error: 'ID e tipo obrigatórios' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error('[ERRO] ID ObjectId inválido');
      return res.status(400).json({ success: false, error: 'ID inválido' });
    }

    const Model = tipoLista === 'encontrista' ? Cadastro : Encontro;
    const exists = await Model.findById(id);
    
    if (!exists) {
      console.error('[ERRO] Cadastro não encontrado');
      return res.status(404).json({ success: false, error: 'Cadastro não encontrado' });
    }

    const result = await Model.findByIdAndUpdate(
      id,
      { aprovado: true, statusAprovacao: 'aprovado' },
      { new: true }
    );

    if (!result) {
      console.error('[ERRO] Erro ao atualizar');
      return res.status(500).json({ success: false, error: 'Erro ao atualizar' });
    }

    console.log(`[INFO] Aprovado: ${result.nomeCompleto}`);
    return res.json({ success: true, message: 'Aprovado com sucesso!' });
  } catch (err) {
    console.error('[ERRO] Erro:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /admin/desaprovar - Desaprovar um cadastro
app.post('/admin/desaprovar', checkAdminAuth, async (req, res) => {
  try {
    const id = String(req.body.id || '').trim();
    const tipoListaRaw = String(req.body.tipoLista || req.body.tipo || '').trim().toLowerCase();

    const tipoLista = tipoListaRaw === 'encontrista' ? 'encontrista' :
      (['encontreiro', 'encontro', 'tios', 'casal'].includes(tipoListaRaw) ? 'encontreiro' : '');

    console.log(`[INFO] Desaprovação: ${id} - tipo=${tipoLista}`);

    if (!id || !tipoLista) {
      console.error('[ERRO] ID ou tipo inválidos');
      return res.status(400).json({ success: false, error: 'ID e tipo obrigatórios' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error('[ERRO] ID ObjectId inválido');
      return res.status(400).json({ success: false, error: 'ID inválido' });
    }

    const Model = tipoLista === 'encontrista' ? Cadastro : Encontro;
    const result = await Model.findByIdAndUpdate(
      id,
      { aprovado: false, statusAprovacao: 'reprovado' },
      { new: true }
    );

    if (!result) {
      console.error('[ERRO] Cadastro não encontrado');
      return res.status(404).json({ success: false, error: 'Cadastro não encontrado' });
    }

    console.log(`[INFO] Desaprovado: ${result.nomeCompleto}`);
    return res.json({ success: true, message: 'Desaprovado com sucesso!' });
  } catch (err) {
    console.error('[ERRO] Erro:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /admin/gerenciar-cadastros - Página de gestão de cadastros
app.get('/admin/gerenciar-cadastros', checkAdminAuth, async (req, res) => {
  try {
    const encontristas = await Cadastro.find().sort({ dataCadastro: -1 }).lean();
    const encontreirosRaw = await Encontro.find().sort({ dataCadastro: -1 }).lean();
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
    const administradores = await Admin.find().sort({ dataCriacao: -1 }).select('username dataCriacao').lean();
    const ejcs = await Ejc.find().sort({ nome: 1 }).select('nome dataCriacao').lean();
    const equipes = await Equipe.find().sort({ ejcNome: 1, nome: 1 }).select('nome ejcNome nomeReferencia dataCriacao').lean();
    const encontreirosParaEquipe = await Encontro.find({ tipo: { $in: ['jovens', 'tios', 'homem', 'mulher'] } })
      .sort({ nomeCompleto: 1 })
      .select('nomeCompleto tipo equipeServiu equipeCoordenou')
      .lean();

    res.render('gerenciar-cadastros', {
      adminUsername: req.session.adminUsername,
      encontristas,
      encontreiros,
      administradores,
      ejcs,
      equipes,
      encontreirosParaEquipe,
    });
  } catch (err) {
    console.error('Erro ao carregar cadastros:', err);
    res.status(500).send('Erro ao carregar cadastros');
  }
});

// POST /admin/atualizar-cadastro/:tipo/:id - Atualizar cadastro
app.post('/admin/atualizar-cadastro/:tipo/:id', checkAdminAuth, upload.single('foto'), async (req, res) => {
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
      updateData.equipeServiu = req.body.equipeServiu ? req.body.equipeServiu.split(',').map(e => e.trim()).filter(e => e) : [];
      updateData.equipeCoordenou = req.body.equipeCoordenou ? req.body.equipeCoordenou.split(',').map(e => e.trim()).filter(e => e) : [];
      updateData.temVeiculoProprio = req.body.temVeiculoProprio === 'true' || req.body.temVeiculoProprio === true;
      updateData.intolerante = req.body.intolerante || '';
      updateData.temRelacionamento = req.body.temRelacionamento || '';
      updateData.observacoes = req.body.observacoes || '';
    }

    // Se enviou nova foto
    if (req.file) {
      // Remove foto antiga se existir
      if (cadastroAtual && cadastroAtual.foto) {
        const oldPhotoPath = path.join(__dirname, 'uploads', cadastroAtual.foto);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
      
      updateData.foto = req.file.filename;
    }

    const resultado = await Model.findByIdAndUpdate(id, updateData, { new: true });
    
    console.log(`Cadastro ${tipo} atualizado com sucesso:`, id);
    res.json({ success: true, message: 'Cadastro atualizado com sucesso!' });
  } catch (err) {
    console.error('Erro ao atualizar cadastro:', err);
    res.status(500).json({ success: false, error: 'Erro ao atualizar cadastro: ' + err.message });
  }
});

// POST /admin/remover-foto/:tipo/:id - Remover foto de um cadastro
app.post('/admin/remover-foto/:tipo/:id', checkAdminAuth, async (req, res) => {
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
      const photoPath = path.join(__dirname, 'uploads', cadastro.foto);
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

// POST /admin/deletar-cadastro/:tipo/:id - Deletar um cadastro e sua foto
app.post('/admin/deletar-cadastro/:tipo/:id', checkAdminAuth, async (req, res) => {
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
      const photoPath = path.join(__dirname, 'uploads', cadastro.foto);
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

// POST /admin/transferir-encontrista/:id - Move um encontrista para a lista de encontreiros
app.post('/admin/transferir-encontrista/:id', checkAdminAuth, async (req, res) => {
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

// POST /admin/transferir-encontristas-lote - Move varios encontristas para encontreiros
app.post('/admin/transferir-encontristas-lote', checkAdminAuth, async (req, res) => {
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

// POST /admin/limpar-encontreiros - Deletar TODOS os encontreiros e suas fotos
app.post('/admin/limpar-encontreiros', checkAdminAuth, async (req, res) => {
  try {
    console.log('[INFO] LIMPEZA TOTAL DE ENCONTREIROS INICIADA');
    
    const encontreiros = await Encontro.find().lean();
    let fotosDeleted = 0;
    
    // Deletar fotos
    encontreiros.forEach(encontreiro => {
      if (encontreiro.foto) {
        const photoPath = path.join(__dirname, 'uploads', encontreiro.foto);
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
          fotosDeleted++;
        }
      }
    });
    
    // Deletar todos os cadastros
    const result = await Encontro.deleteMany({});
    
    console.log(`[INFO] Limpeza concluída: ${result.deletedCount} encontreiros deletados, ${fotosDeleted} fotos removidas`);
    
    res.json({ 
      success: true, 
      message: `Limpeza concluída: ${result.deletedCount} encontreiros e ${fotosDeleted} fotos deletados permanentemente`,
      deletados: result.deletedCount,
      fotos: fotosDeleted
    });
  } catch (err) {
    console.error('[ERRO] Erro ao limpar encontreiros:', err);
    res.status(500).json({ success: false, error: 'Erro ao limpar encontreiros: ' + err.message });
  }
});

// POST /admin/cadastrar-admin - Criar novo acesso de administrador
app.post('/admin/cadastrar-admin', checkAdminAuth, async (req, res) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');

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

    const hash = await bcryptjs.hash(senha, 10);
    await Admin.create({ username, senha: hash });

    return res.json({ success: true, message: 'Administrador cadastrado com sucesso.' });
  } catch (err) {
    console.error('Erro ao cadastrar administrador:', err);
    return res.status(500).json({ success: false, error: 'Erro ao cadastrar administrador.' });
  }
});

// POST /admin/atualizar-admin/:id - Atualizar administrador
app.post('/admin/atualizar-admin/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const username = String(req.body.username || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');

    if (!id) {
      return res.status(400).json({ success: false, error: 'ID do administrador não fornecido.' });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Administrador não encontrado.' });
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

    // Se a senha foi fornecida e não está vazia, atualiza
    if (senha && senha.length > 0) {
      if (senha.length < 6) {
        return res.status(400).json({ success: false, error: 'A senha deve ter pelo menos 6 caracteres.' });
      }
      admin.senha = await bcryptjs.hash(senha, 10);
    }

    await admin.save();
    return res.json({ success: true, message: 'Administrador atualizado com sucesso.' });
  } catch (err) {
    console.error('[ERRO] Erro ao atualizar administrador:', err.message);
    return res.status(500).json({ success: false, error: 'Erro ao atualizar administrador: ' + err.message });
  }
});

// POST /admin/deletar-admin/:id - Deletar administrador
app.post('/admin/deletar-admin/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: 'ID do administrador não fornecido.' });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Administrador não encontrado.' });
    }

    await Admin.findByIdAndDelete(id);
    console.log('[INFO] Administrador deletado:', admin.username);
    
    return res.json({ success: true, message: 'Administrador deletado com sucesso.' });
  } catch (err) {
    console.error('[ERRO] Erro ao deletar administrador:', err.message);
    return res.status(500).json({ success: false, error: 'Erro ao deletar administrador: ' + err.message });
  }
});

// POST /admin/cadastrar-equipe - Cadastrar nova equipe
app.post('/admin/cadastrar-equipe', checkAdminAuth, async (req, res) => {
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
app.post('/admin/criar-ejc', checkAdminAuth, async (req, res) => {
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

    await Ejc.create({ nome, nomeNormalizado });
    return res.json({ success: true, message: 'EJC criado com sucesso.' });
  } catch (err) {
    console.error('Erro ao criar EJC:', err);
    return res.status(500).json({ success: false, error: 'Erro ao criar EJC.' });
  }
});

// POST /admin/deletar-ejc/:id - Remove EJC e estruturas vinculadas (circulos/equipes/vinculos)
app.post('/admin/deletar-ejc/:id', checkAdminAuth, async (req, res) => {
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
    return res.json({ success: true, message: 'EJC excluido com sucesso.' });
  } catch (err) {
    console.error('Erro ao deletar EJC:', err);
    return res.status(500).json({ success: false, error: 'Erro ao deletar EJC.' });
  }
});

// GET /admin/encontros/:ejcId - Tela dedicada de encontro por EJC
app.get('/admin/encontros/:ejcId', checkAdminAuth, async (req, res) => {
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
app.post('/admin/criar-circulo', checkAdminAuth, async (req, res) => {
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

// POST /admin/vincular-encontro - Vincular pessoa em circulo/equipe de um EJC
app.post('/admin/vincular-encontro', checkAdminAuth, async (req, res) => {
  try {
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

    const entidade = entidadeTipo === 'circulo'
      ? await Circulo.findOne({ _id: entidadeId, ejcId })
      : await Equipe.findOne({ _id: entidadeId, ejcId });
    if (!entidade) return res.status(404).json({ success: false, error: 'Entidade não encontrada neste EJC.' });

    const ModelPessoa = pessoaTipo === 'encontrista' ? Cadastro : Encontro;
    const pessoas = await ModelPessoa.find({ _id: { $in: pessoaIds } });
    const pessoasMap = new Map(pessoas.map((p) => [String(p._id), p]));

    let vinculados = 0;
    for (const pessoaId of pessoaIds) {
      const pessoa = pessoasMap.get(String(pessoaId));
      if (!pessoa) {
        continue;
      }

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
      }

      if (entidadeTipo === 'equipe' && pessoaTipo === 'encontreiro') {
        const equipeNome = entidade.nomeReferencia || entidade.nome;
        const field = papel === 'coordenador' ? 'equipeCoordenou' : 'equipeServiu';
        const listaAtual = Array.isArray(pessoa[field]) ? pessoa[field] : [];
        if (!listaAtual.includes(equipeNome)) {
          listaAtual.push(equipeNome);
          pessoa[field] = listaAtual;
          await pessoa.save();
        }
      }
    }

    return res.json({ success: true, vinculados });
  } catch (err) {
    console.error('Erro ao vincular encontro:', err);
    return res.status(500).json({ success: false, error: 'Erro ao vincular.' });
  }
});

// GET /admin/encontros/:ejcId/export/:entidadeTipo/:entidadeId/:formato
// Exporta vinculados de um circulo/equipe em Excel ou PDF.
app.get('/admin/encontros/:ejcId/export/:entidadeTipo/:entidadeId/:formato', checkAdminAuth, async (req, res) => {
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

// GET /admin/encontros/:ejcId/export/quadrante/pdf
// Exporta um unico PDF com todos os circulos e equipes do EJC.
app.get('/admin/encontros/:ejcId/export/quadrante/pdf', checkAdminAuth, async (req, res) => {
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
app.post('/admin/remover-vinculo/:id', checkAdminAuth, async (req, res) => {
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
app.post('/admin/deletar-equipe/:id', checkAdminAuth, async (req, res) => {
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
app.post('/admin/vincular-encontreiro-equipe', checkAdminAuth, async (req, res) => {
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
app.post('/admin/importar-cadastros', checkAdminAuth, importUploadSingle, async (req, res) => {
  const summary = {
    totalLidos: 0,
    importados: 0,
    atualizados: 0,
    ignoradosExistentes: 0,
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

        if (!row.tipo) {
          summary.ignoradosTipoInvalido += 1;
          continue;
        }

        const existente = await findExistingByNameOrEmail(Encontro, row.nomeCompleto, row.email);

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

    return res.json({
      success: true,
      message: 'Importacao de encontreiros concluida.',
      sourceType,
      dbEngine: sourceType === 'database' ? normalizeTextInput(req.body.dbEngine || 'mongodb').toLowerCase() : null,
      summary,
    });
  } catch (err) {
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

// GET /admin/logout - Fazer logout
app.get('/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

app.listen(PORT, HOST, () => {
  const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`Server running on http://${displayHost}:${PORT}`);
  console.log(`Listening on ${HOST}:${PORT} for external access.`);
});
