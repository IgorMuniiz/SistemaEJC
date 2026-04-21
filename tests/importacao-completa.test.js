const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { processarImportacaoCompletaTransacional } = require('../src/services/importacaoCompletaService');

test('importacao completa cria dois encontreiros quando o nome e igual mas os emails sao diferentes', async () => {
  const savedRows = [];

  class FakeEncontro {
    constructor(payload) {
      this.payload = payload;
      Object.assign(this, payload);
      this._id = new mongoose.Types.ObjectId();
    }

    async save() {
      savedRows.push({ ...this.payload });
      return this;
    }
  }

  const session = {
    startTransaction() {},
    async commitTransaction() {},
    async abortTransaction() {},
    async endSession() {},
  };

  const result = await processarImportacaoCompletaTransacional({
    sourceType: 'sistema',
    atualizarExistentes: true,
    fotoPadrao: '',
    ejcId: '507f1f77bcf86cd799439201',
    ejcExistente: { _id: '507f1f77bcf86cd799439201', nome: 'EJC Destino 2026' },
    importarEquipes: false,
    importarCirculos: false,
    importarEncontreiros: true,
    equipeRows: [],
    circuloRows: [],
    encontreirosRows: [
      {
        _id: '507f1f77bcf86cd799439202',
        nomeCompleto: 'Maria Igual',
        email: 'maria.um@example.com',
        tipo: 'jovens',
        foto: 'foto-a.jpg',
        logradouro: 'Rua A',
        bairro: 'Centro',
        dataNascimento: '1990-01-01',
        telefone: '88999990001',
      },
      {
        _id: '507f1f77bcf86cd799439203',
        nomeCompleto: 'Maria Igual',
        email: 'maria.dois@example.com',
        tipo: 'jovens',
        foto: 'foto-b.jpg',
        logradouro: 'Rua B',
        bairro: 'Centro',
        dataNascimento: '1992-02-02',
        telefone: '88999990002',
      },
    ],
    vinculoRows: [],
    summaryTemplate: {
      totalLidos: 0,
      importados: 0,
      atualizados: 0,
      ignoradosExistentes: 0,
      ignoradosDuplicadosImportacao: 0,
      ignoradosSemCampos: 0,
      ignoradosSemFoto: 0,
      ignoradosTipoInvalido: 0,
      erros: 0,
    },
    deps: {
      mongoose: {
        ...mongoose,
        startSession: async () => session,
      },
      Equipe: {},
      Circulo: {},
      Encontro: FakeEncontro,
      VinculoEncontro: {},
      findExistingByNameOrEmail: async () => null,
      normalizeTextInput: (value) => String(value || '').trim(),
      buildEquipeImportIdentity: (_ejcNome, equipeNome) => ({
        nomeLimpo: equipeNome,
        nomeReferencia: equipeNome,
        nomeNormalizado: String(equipeNome || '').toLowerCase(),
      }),
      normalizeGeneroEncontro: (value) => value || 'outros',
      normalizeTipoEncontro: (value) => value,
      parseDateInput: (value) => new Date(value),
      normalizeBooleanInput: (value) => value === true || value === 'true',
      normalizeApprovalStatusInput: (value) => value || '',
      mapToEncontroPayload: (value) => value,
      normalizeEquipeReferenceListForImport: () => [],
      ensureImportPlaceholderImage: () => 'placeholder.jpg',
    },
  });

  assert.equal(result.encontreiraSummary.importados, 2);
  assert.equal(result.encontreiraSummary.atualizados, 0);
  assert.equal(savedRows.length, 2);
  assert.deepEqual(
    savedRows.map((item) => item.email),
    ['maria.um@example.com', 'maria.dois@example.com']
  );
});