const mongoose = require('mongoose');
const { mongoUri, SKIP_MONGO_CONNECT } = require('./environment');

const connectToMongo = async () => {
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('MongoDB conectado com sucesso.');
  } catch (err) {
    const message = String(err && err.message ? err.message : err);
    console.error(`Falha ao conectar no MongoDB (${mongoUri}).`);

    if (message.includes('whitelist') || message.includes('ReplicaSetNoPrimary')) {
      console.error('No Atlas, libere o IP atual em Network Access e valide usuario/senha da URI.');
    }

    console.error('Detalhes:', message);
    console.error('Defina MONGODB_URI no arquivo .env.');
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
