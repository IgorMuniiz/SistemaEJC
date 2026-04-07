require('dotenv').config();
const mongoose = require('mongoose');

const resolveMongoUri = () => {
  const candidates = [
    process.env.MONGODB_URI,
    process.env.MONGODB_FALLBACK_URL,
    process.env.SESSION_STORE_MONGO_URI,
  ];

  for (const candidate of candidates) {
    const uri = String(candidate || '').trim();
    if (uri) return uri;
  }

  return '';
};

const run = async () => {
  const isDryRun = process.argv.includes('--dry-run');
  const mongoUri = resolveMongoUri();

  if (!mongoUri) {
    console.error('[MIGRACAO] Nenhuma URI Mongo encontrada. Configure MONGODB_URI no .env.');
    process.exit(1);
  }

  const encontroSchema = new mongoose.Schema({}, { strict: false, collection: 'encontros' });
  const Encontro = mongoose.models.EncontroMigracao || mongoose.model('EncontroMigracao', encontroSchema);

  try {
    await mongoose.connect(mongoUri);

    const filtro = { subequipeServiu: { $exists: true } };
    const totalAfetados = await Encontro.countDocuments(filtro);

    if (totalAfetados === 0) {
      console.log('[MIGRACAO] Nenhum documento com subequipeServiu encontrado. Nada a fazer.');
      return;
    }

    if (isDryRun) {
      console.log(`[MIGRACAO] DRY-RUN: ${totalAfetados} documento(s) seriam atualizados.`);
      return;
    }

    const resultado = await Encontro.updateMany(
      filtro,
      { $unset: { subequipeServiu: '' } }
    );

    console.log(`[MIGRACAO] Concluida. Matched: ${resultado.matchedCount}, Modified: ${resultado.modifiedCount}.`);
  } catch (err) {
    console.error('[MIGRACAO] Falha ao executar migracao:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close().catch(() => {});
  }
};

run();
