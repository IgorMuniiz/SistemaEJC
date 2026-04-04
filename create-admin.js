require('dotenv').config();

const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

const ADMIN_ACCESS_LEVELS = ['super_admin', 'coordenador', 'operador', 'consulta'];

const resolveMongoUri = () => {
  const candidates = [
    process.env.MONGODB_URL,
    process.env.MONGODB_URI,
    process.env.MONGO_URI,
    process.env.MONGODB_FALLBACK_URL,
    'mongodb://127.0.0.1:27017/ejc_sistema',
  ];

  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (value) return value;
  }

  return '';
};

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
  nivelAcesso: {
    type: String,
    enum: ADMIN_ACCESS_LEVELS,
    default: 'super_admin',
  },
  permissoes: { type: [String], default: [] },
  dataCriacao: { type: Date, default: Date.now },
  bloquearFormularioEncontrista: { type: Boolean, default: false },
  bloquearFormularioEncontreiros: { type: Boolean, default: false },
  dataInicioBloquearEncontrista: { type: Date, default: null },
  dataFimBloquearEncontrista: { type: Date, default: null },
  dataInicioBloquearEncontreiros: { type: Date, default: null },
  dataFimBloquearEncontreiros: { type: Date, default: null },
  motivoBloquearEncontrista: { type: String, default: '' },
  motivoBloquearEncontreiros: { type: String, default: '' },
});

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

const parseArgs = () => {
  const parsed = {};
  const args = process.argv.slice(2);

  for (let index = 0; index < args.length; index += 1) {
    const current = String(args[index] || '');
    if (!current.startsWith('--')) continue;

    const key = current.slice(2);
    const next = args[index + 1];
    if (next && !String(next).startsWith('--')) {
      parsed[key] = String(next);
      index += 1;
    } else {
      parsed[key] = 'true';
    }
  }

  return parsed;
};

const normalizeUsername = (value) => String(value || '').trim().toLowerCase();

const normalizeAccessLevel = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return ADMIN_ACCESS_LEVELS.includes(normalized) ? normalized : 'super_admin';
};

const printHelp = () => {
  console.log('Uso:');
  console.log('  node create-admin.js');
  console.log('  node create-admin.js --username admin --password senha-forte --nivel super_admin');
  console.log('');
  console.log('Opcoes:');
  console.log('  --username   Nome do usuario admin');
  console.log('  --password   Senha do usuario admin');
  console.log('  --nivel      super_admin | coordenador | operador | consulta');
  console.log('  --help       Exibe esta ajuda');
};

const promptForMissingValues = async (initialValues) => {
  const values = { ...initialValues };
  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    if (!values.username) {
      values.username = await rl.question('Digite o nome de usuario do admin: ');
    }

    if (!values.password) {
      values.password = await rl.question('Digite a senha do admin: ');
    }

    const passwordConfirm = await rl.question('Confirme a senha: ');
    values.passwordConfirm = passwordConfirm;

    if (!values.nivel) {
      values.nivel = await rl.question('Nivel de acesso [super_admin]: ');
    }
  } finally {
    rl.close();
  }

  return values;
};

const validateInput = ({ username, password, passwordConfirm }) => {
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername) {
    throw new Error('Informe um nome de usuario valido.');
  }

  if (!/^[a-z0-9._-]{3,64}$/i.test(normalizedUsername)) {
    throw new Error('O usuario deve ter 3-64 caracteres e usar apenas letras, numeros, ponto, underscore ou hifen.');
  }

  if (String(password || '').length < 6) {
    throw new Error('A senha deve ter pelo menos 6 caracteres.');
  }

  if (password !== passwordConfirm) {
    throw new Error('As senhas informadas nao coincidem.');
  }

  return normalizedUsername;
};

const run = async () => {
  const args = parseArgs();
  if (args.help === 'true') {
    printHelp();
    return;
  }

  const mongoUri = resolveMongoUri();
  if (!mongoUri) {
    throw new Error('Nao foi possivel resolver a URI do MongoDB. Defina MONGODB_URI no ambiente.');
  }

  const collected = await promptForMissingValues({
    username: args.username || '',
    password: args.password || '',
    nivel: args.nivel || '',
  });

  const username = validateInput(collected);
  const nivelAcesso = normalizeAccessLevel(collected.nivel);

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });

  try {
    const existente = await Admin.findOne({ username });
    if (existente) {
      throw new Error(`Ja existe um admin com o usuario "${username}".`);
    }

    const senhaHash = await bcryptjs.hash(String(collected.password), 10);
    const novoAdmin = await Admin.create({
      username,
      senha: senhaHash,
      nivelAcesso,
      permissoes: [],
    });

    console.log('Admin criado com sucesso.');
    console.log(`Usuario: ${novoAdmin.username}`);
    console.log(`Nivel: ${novoAdmin.nivelAcesso}`);
  } finally {
    await mongoose.connection.close().catch(() => {});
  }
};

run().catch((err) => {
  console.error('[CREATE-ADMIN] Falha:', err.message || err);
  process.exitCode = 1;
});