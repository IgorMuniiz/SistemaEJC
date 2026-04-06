const DEFAULT_RETENTION_DAYS = 730;

const executeLgpdRetention = async ({
  retentionDays = DEFAULT_RETENTION_DAYS,
  approvalStatuses = [],
  mongoose,
  Cadastro,
  Encontro,
}) => {
  const safeDays = Number.isFinite(Number(retentionDays))
    ? Math.max(30, Number(retentionDays))
    : DEFAULT_RETENTION_DAYS;
  const cutoff = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
  const statusElegiveis = approvalStatuses.filter((item) => item !== 'aprovado');

  if (!mongoose || !mongoose.connection || mongoose.connection.readyState !== 1) {
    return {
      retentionDays: safeDays,
      cutoff,
      cadastrosAnonimizados: 0,
      encontrosAnonimizados: 0,
      totalAnonimizados: 0,
      skipped: true,
    };
  }

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
    skipped: false,
  };
};

const shouldEnableBackgroundJobs = ({ env = process.env, skipMongoConnect = false }) => (
  env.DISABLE_BACKGROUND_JOBS !== '1'
  && env.NODE_ENV !== 'test'
  && !skipMongoConnect
);

const registerLgpdRetentionJobs = ({
  enabled,
  executeLgpdRetentionJob,
  logger = console,
  initialDelayMs = 20 * 1000,
  intervalMs = 24 * 60 * 60 * 1000,
}) => {
  if (!enabled || typeof executeLgpdRetentionJob !== 'function') {
    return null;
  }

  const runJob = async (label) => {
    try {
      const result = await executeLgpdRetentionJob();
      if (!result || result.skipped || result.totalAnonimizados <= 0) return;
      logger.log(`[LGPD] Anonimizacao automatica ${label}: ${result.totalAnonimizados} registro(s).`);
    } catch (err) {
      logger.error(`[LGPD] Falha na anonimização automática ${label}: ${err.message}`);
    }
  };

  const initialTimer = setTimeout(() => {
    void runJob('inicial');
  }, initialDelayMs);

  const dailyInterval = setInterval(() => {
    void runJob('diaria');
  }, intervalMs);

  if (typeof initialTimer.unref === 'function') initialTimer.unref();
  if (typeof dailyInterval.unref === 'function') dailyInterval.unref();

  return { initialTimer, dailyInterval };
};

module.exports = {
  DEFAULT_RETENTION_DAYS,
  executeLgpdRetention,
  registerLgpdRetentionJobs,
  shouldEnableBackgroundJobs,
};
