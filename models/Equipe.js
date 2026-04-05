const mongoose = require('mongoose');

const equipeSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true },
  ejcId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ejc' },
  ejcNome: { type: String, default: '', trim: true },
  nomeReferencia: { type: String, default: '', trim: true },
  nomeNormalizado: { type: String, required: true, unique: true, trim: true },
  dataCriacao: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Equipe', equipeSchema);
