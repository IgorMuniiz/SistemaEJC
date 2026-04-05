const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
  nivelAcesso: {
    type: String,
    enum: ['super_admin', 'coordenador', 'operador', 'consulta'],
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

module.exports = mongoose.model('Admin', adminSchema);
