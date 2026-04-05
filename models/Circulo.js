const mongoose = require('mongoose');

const circuloSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true },
  ejcId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ejc', required: true },
  nomeNormalizado: { type: String, required: true, unique: true, trim: true },
  dataCriacao: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Circulo', circuloSchema);
