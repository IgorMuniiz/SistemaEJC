require('dotenv').config();
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

const mongoUri = process.env.MONGODB_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
const mongoFallbackUri = process.env.MONGODB_FALLBACK_URL || 'mongodb://127.0.0.1:27017/ECJCOP';

if (!mongoUri) {
  console.error('❌ Defina MONGODB_URI, MONGODB_URL ou MONGO_URI no arquivo .env');
  process.exit(1);
}

async function connectWithFallback() {
  const uris = [mongoUri, mongoFallbackUri].filter((value, index, arr) => value && arr.indexOf(value) === index);

  for (let index = 0; index < uris.length; index += 1) {
    const uri = uris[index];
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
      if (index === 0) {
        console.log('✅ Conectado ao MongoDB!');
      } else {
        console.warn(`⚠️  Conectado com fallback local: ${uri}`);
      }
      return;
    } catch (err) {
      console.error(`❌ Erro ao conectar em ${uri}:`, err.message || err);
    }
  }

  process.exit(1);
}

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
  dataCriacao: { type: Date, default: Date.now },
});

const Admin = mongoose.model('Admin', adminSchema);

connectWithFallback().then(() => {
  criarAdminPadrao();
});

async function criarAdminPadrao() {
  try {
    // Verificar se já existe algum admin
    const adminExistente = await Admin.findOne({});
    if (adminExistente) {
      console.log('⚠️  Já existe um admin criado. Nenhuma ação foi realizada.');
      process.exit(0);
    }

    // Criar admin padrão
    const senhaHash = await bcryptjs.hash('admin', 10);
    const novoAdmin = new Admin({
      username: 'admin',
      senha: senhaHash
    });

    await novoAdmin.save();

    console.log('\n✅ Admin padrão criado com sucesso!\n');
    console.log('Credenciais padrão:');
    console.log('  Usuário: admin');
    console.log('  Senha: admin');
    console.log('\nAcesse /admin/login para fazer login');
    console.log('⚠️  IMPORTANTE: Mude a senha após o primeiro login!\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao criar admin:', err.message);
    process.exit(1);
  }
}
