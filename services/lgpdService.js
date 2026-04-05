const { APPROVAL_STATUSES } = require('../constants/admin');
const { LGPD_RETENTION_DAYS_DEFAULT } = require('../constants/admin');
const Cadastro = require('../models/Cadastro');
const Encontro = require('../models/Encontro');

const executeLgpdRetention = async (retentionDays = LGPD_RETENTION_DAYS_DEFAULT) => {
  const safeDays = Number.isFinite(Number(retentionDays)) ? Math.max(30, Number(retentionDays)) : LGPD_RETENTION_DAYS_DEFAULT;
  const cutoff = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
  const statusElegiveis = APPROVAL_STATUSES.filter((item) => item !== 'aprovado');

  const runForModel = async (Model, modelName) => {
    const docs = await Model.find({
      dataCadastro: { $lt: cutoff },
      anonimizadoEm: null,
      statusAprovacao: { $in: statusElegiveis },
    }).select('_id').lean();

    if (!docs.length) return 0;

    const ops = docs.map((doc) => ({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            nomeCompleto: `ANONIMIZADO ${modelName}`,
            comoQuerSerChamado: '',
            cep: '',
            estadoCivil: '',
            nomeMae: '',
            telefoneMae: '',
            nomePai: '',
            telefonePai: '',
            paroquiaFrequenta: '',
            participaMovimentoIgreja: '',
            conhecidoInscricaoHoje: '',
            conhecidoFezEjc: '',
            inscricaoAnterior: '',
            instrumentoMusical: '',
            expectativaXixEjcCop: '',
            logradouro: 'ANONIMIZADO',
            bairro: 'ANONIMIZADO',
            telefone: '',
            intolerante: '',
            email: `anon-${doc._id}@anon.local`,
            instagram: '',
            observacoes: '',
            foto: '',
            lgpdConsentimentoIp: '',
            anonimizadoEm: new Date(),
          },
        },
      },
    }));

    await Model.bulkWrite(ops, { ordered: false });
    return ops.length;
  };

  const [cadastrosAnonimizados, encontrosAnonimizados] = await Promise.all([
    runForModel(Cadastro, 'CADASTRO'),
    runForModel(Encontro, 'ENCONTRO'),
  ]);

  return {
    retentionDays: safeDays,
    cutoff,
    cadastrosAnonimizados,
    encontrosAnonimizados,
    totalAnonimizados: cadastrosAnonimizados + encontrosAnonimizados,
  };
};

module.exports = { executeLgpdRetention };
