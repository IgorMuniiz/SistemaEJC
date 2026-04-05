const mongoose = require('mongoose');

const ejcSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true },
  nomeNormalizado: { type: String, required: true, unique: true, trim: true },
  ativo: { type: Boolean, default: false },
  dataCriacao: { type: Date, default: Date.now },
  conviteEnconteiroToken: { type: String, default: '' },
  conviteEnconteiroTokenExp: { type: Date, default: null },
});

let _encontroAtivoCache = null;
let _encontroAtivoCacheTs = 0;
const ENCONTRO_ATIVO_CACHE_TTL = 30_000;

const Ejc = mongoose.model('Ejc', ejcSchema);

const getEncontroAtivo = async () => {
  const now = Date.now();
  if (_encontroAtivoCache && (now - _encontroAtivoCacheTs) < ENCONTRO_ATIVO_CACHE_TTL) {
    return _encontroAtivoCache;
  }
  const ativoSelecionado = await Ejc.findOne({ ativo: true }).lean();
  const result = ativoSelecionado || await Ejc.findOne({}).sort({ dataCriacao: -1 }).lean();
  _encontroAtivoCache = result;
  _encontroAtivoCacheTs = now;
  return result;
};

const invalidarCacheEncontroAtivo = () => {
  _encontroAtivoCache = null;
  _encontroAtivoCacheTs = 0;
};

module.exports = Ejc;
module.exports.getEncontroAtivo = getEncontroAtivo;
module.exports.invalidarCacheEncontroAtivo = invalidarCacheEncontroAtivo;
