const mongoose = require('mongoose');

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

module.exports = mongoose.model('VinculoEncontro', vinculoSchema);
