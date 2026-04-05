require('dotenv').config();
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const readline = require('readline');

// Conectar ao MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ECJCOP';

async function connectWithFallback() {
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log('Conectado ao MongoDB!');
  } catch (err) {
    console.error(`❌ Erro ao conectar em ${mongoUri}:`, err.message || err);
    process.exit(1);
  }
}

// Schema de Admin
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
  dataCriacao: { type: Date, default: Date.now },
});

const Admin = mongoose.model('Admin', adminSchema);

// Interface para input do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const pergunta = (text) => {
  return new Promise((resolve) => {
    rl.question(text, resolve);
  });
};

async function criarAdmin() {
  try {
    console.log('\n=== Criador de Usuário Admin ===\n');

    // Pedir dados
    const username = await pergunta('Digite o nome de usuário: ');
    const senha = await pergunta('Digite a senha: ');
    const confirmarSenha = await pergunta('Confirme a senha: ');

    // Validações
    if (!username || !senha) {
      console.error('⚠️  Usuário e senha são obrigatórios!');
      rl.close();
      process.exit(1);
    }

    if (senha !== confirmarSenha) {
      console.error('⚠️  As senhas não coincidem!');
      rl.close();
      process.exit(1);
    }

    if (senha.length < 4) {
      console.error('⚠️  A senha deve ter no mínimo 4 caracteres!');
      rl.close();
      process.exit(1);
    }

    // Verificar se admin já existe
    const adminExistente = await Admin.findOne({ username });
    if (adminExistente) {
      console.error('⚠️  Usuário já existe!');
      rl.close();
      process.exit(1);
    }

    // Criptografar senha
    console.log('\n🔐 Criptografando senha...');
    const senhaHash = await bcryptjs.hash(senha, 10);

    // Criar admin
    const novoAdmin = new Admin({
      username,
      senha: senhaHash
    });

    await novoAdmin.save();

    console.log('\n✅ Admin criado com sucesso!\n');
    console.log('Credenciais:');
    console.log(`  Usuário: ${username}`);
    console.log(`  Senha: ${senha}`);
    console.log('\nAcesse /admin/login para fazer login\n');

    rl.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao criar admin:', err.message);
    rl.close();
    process.exit(1);
  }
}

connectWithFallback().then(() => {
  criarAdmin();
});
