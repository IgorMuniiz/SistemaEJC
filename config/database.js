const mongoose = require('mongoose');
const { mongoUri, mongoFallbackUri, SKIP_MONGO_CONNECT } = require('./environment');

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
