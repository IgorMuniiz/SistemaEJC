const mongoose = require('mongoose');
const Encontro = require('../models/Encontro');
const { normalizeTextInput } = require('../utils/normalization');

const createTiosGroupId = () => `tios-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const clearTiosCoupleLink = async (encontroId) => {
  if (!mongoose.Types.ObjectId.isValid(encontroId)) return;

  const atual = await Encontro.findById(encontroId).select('_id tipo tiosGrupoId tioParceiroId').lean();
  if (!atual) return;

  const parceiroId = atual.tioParceiroId && mongoose.Types.ObjectId.isValid(atual.tioParceiroId)
    ? String(atual.tioParceiroId)
    : '';

  await Encontro.updateOne(
    { _id: encontroId },
    { $set: { tioParceiroId: null, tiosGrupoId: '', tiosCategoria: atual.tipo === 'tios' ? 'solo' : '' } }
  );

  if (parceiroId) {
    await Encontro.updateOne(
      { _id: parceiroId, tioParceiroId: encontroId },
      { $set: { tioParceiroId: null, tiosGrupoId: '', tiosCategoria: 'solo' } }
    );
  }
};

const linkTiosCouple = async (encontroId, parceiroId, preferredGroupId = '') => {
  if (!mongoose.Types.ObjectId.isValid(encontroId) || !mongoose.Types.ObjectId.isValid(parceiroId)) {
    throw new Error('IDs invalidos para vinculo de tios.');
  }
  if (String(encontroId) === String(parceiroId)) {
    throw new Error('Nao e possivel vincular o mesmo tio a ele proprio.');
  }

  const [encontroAtual, parceiroAtual] = await Promise.all([
    Encontro.findById(encontroId),
    Encontro.findById(parceiroId),
  ]);

  if (!encontroAtual || !parceiroAtual) {
    throw new Error('Tio/Tia selecionado(a) nao encontrado(a).');
  }
  if (encontroAtual.tipo !== 'tios' || parceiroAtual.tipo !== 'tios') {
    throw new Error('O vinculo de casal so pode ser feito entre tios.');
  }

  if (encontroAtual.tioParceiroId && String(encontroAtual.tioParceiroId) !== String(parceiroId)) {
    await clearTiosCoupleLink(encontroAtual._id);
  }
  if (parceiroAtual.tioParceiroId && String(parceiroAtual.tioParceiroId) !== String(encontroId)) {
    await clearTiosCoupleLink(parceiroAtual._id);
  }

  const grupoId = normalizeTextInput(preferredGroupId)
    || normalizeTextInput(encontroAtual.tiosGrupoId)
    || normalizeTextInput(parceiroAtual.tiosGrupoId)
    || createTiosGroupId();

  await Promise.all([
    Encontro.updateOne(
      { _id: encontroAtual._id },
      { $set: { tiosCategoria: 'casal', tiosGrupoId: grupoId, tioParceiroId: parceiroAtual._id } }
    ),
    Encontro.updateOne(
      { _id: parceiroAtual._id },
      { $set: { tiosCategoria: 'casal', tiosGrupoId: grupoId, tioParceiroId: encontroAtual._id } }
    ),
  ]);

  return grupoId;
};

module.exports = {
  createTiosGroupId,
  clearTiosCoupleLink,
  linkTiosCouple,
};
