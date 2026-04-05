const mongoose = require('mongoose');
const { mongoUri, SKIP_MONGO_CONNECT } = require('./environment');

const maskUri = (uri) => {
  try {
    return uri.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');
  } catch { return '(uri invalida)'; }
};

const connectToMongo = async () => {
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('MongoDB conectado com sucesso.');
  } catch (err) {
    const message = String(err && err.message ? err.message : err);
    console.error(`Falha ao conectar no MongoDB (${maskUri(mongoUri)}).`);

    if (message.includes('Authentication failed')) {
      console.error('Dica: Verifique usuario/senha na URI. Se a senha tiver caracteres especiais (@, #, %, !, etc), codifique com encodeURIComponent().');
      console.error('Dica: Tente adicionar ?authSource=admin ao final da URI.');
    }

    if (message.includes('whitelist') || message.includes('ReplicaSetNoPrimary')) {
      console.error('No Atlas, libere o IP atual em Network Access.');
    }

    console.error('Detalhes:', message);
  }
};

if (!SKIP_MONGO_CONNECT) {
  connectToMongo();
} else {
  console.warn('MongoDB connect skipped (SKIP_MONGO_CONNECT=1).');
}

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB desconectado.');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconectado.');
});

module.exports = { connectToMongo };
