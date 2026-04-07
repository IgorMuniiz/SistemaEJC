const processarImportacaoCompletaTransacional = async ({
  sourceType,
  atualizarExistentes,
  fotoPadrao,
  ejcId,
  ejcExistente,
  importarEquipes,
  importarCirculos,
  importarEncontreiros,
  equipeRows,
  circuloRows,
  encontreirosRows,
  vinculoRows,
  summaryTemplate,
  deps,
}) => {
  const {
    mongoose,
    Equipe,
    Circulo,
    Encontro,
    VinculoEncontro,
    normalizeTextInput,
    buildEquipeImportIdentity,
    normalizeGeneroEncontro,
    normalizeTipoEncontro,
    parseDateInput,
    normalizeBooleanInput,
    normalizeApprovalStatusInput,
    mapToEncontroPayload,
    normalizeEquipeReferenceListForImport,
    ensureImportPlaceholderImage,
  } = deps;

  const equipeIdMap = new Map();
  const circuloIdMap = new Map();
  const encontreiroIdMap = new Map();

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const equipeSummary = {
      importados: 0,
      atualizados: 0,
      erros: 0,
    };

    if (importarEquipes && equipeRows.length > 0) {
      for (const equipeData of equipeRows) {
        try {
          const nomeLimpo = normalizeTextInput(equipeData.nome || equipeData.nomeReferencia);
          if (!nomeLimpo) continue;

          const { nomeNormalizado, nomeReferencia } = buildEquipeImportIdentity(ejcExistente.nome, nomeLimpo);
          const equipeExistente = await Equipe.findOne({ nomeNormalizado }).session(session);

          if (equipeExistente) {
            if (sourceType === 'sistema' && equipeData && equipeData._id) {
              equipeIdMap.set(String(equipeData._id), String(equipeExistente._id));
            }
            if (atualizarExistentes) {
              equipeExistente.nome = nomeLimpo;
              equipeExistente.ejcNome = ejcExistente.nome;
              equipeExistente.nomeReferencia = nomeReferencia;
              equipeExistente.ejcId = new mongoose.Types.ObjectId(ejcId);
              await equipeExistente.save({ session });
              equipeSummary.atualizados++;
            }
          } else {
            const novaEquipe = new Equipe({
              nome: nomeLimpo,
              ejcId: new mongoose.Types.ObjectId(ejcId),
              ejcNome: ejcExistente.nome,
              nomeReferencia,
              nomeNormalizado,
            });
            await novaEquipe.save({ session });
            if (sourceType === 'sistema' && equipeData && equipeData._id) {
              equipeIdMap.set(String(equipeData._id), String(novaEquipe._id));
            }
            equipeSummary.importados++;
          }
        } catch (err) {
          console.error('Erro ao importar equipe:', err);
          equipeSummary.erros++;
        }
      }
    }

    if (equipeSummary.erros > 0) {
      throw new Error('Falha ao importar equipes. Nenhuma alteracao foi aplicada.');
    }

    const circuloSummary = {
      importados: 0,
      atualizados: 0,
      erros: 0,
    };

    if (importarCirculos && circuloRows.length > 0) {
      for (const circuloData of circuloRows) {
        try {
          const nomeLimpo = normalizeTextInput(circuloData.nome);
          if (!nomeLimpo) continue;

          const nomeNormalizado = `${ejcExistente.nome}::${nomeLimpo}`.toLowerCase();
          const circuloExistente = await Circulo.findOne({ nomeNormalizado }).session(session);

          if (circuloExistente) {
            if (sourceType === 'sistema' && circuloData && circuloData._id) {
              circuloIdMap.set(String(circuloData._id), String(circuloExistente._id));
            }
            if (atualizarExistentes) {
              circuloExistente.nome = nomeLimpo;
              circuloExistente.ejcId = new mongoose.Types.ObjectId(ejcId);
              await circuloExistente.save({ session });
              circuloSummary.atualizados++;
            }
          } else {
            const novoCirculo = new Circulo({
              nome: nomeLimpo,
              ejcId: new mongoose.Types.ObjectId(ejcId),
              nomeNormalizado,
            });
            await novoCirculo.save({ session });
            if (sourceType === 'sistema' && circuloData && circuloData._id) {
              circuloIdMap.set(String(circuloData._id), String(novoCirculo._id));
            }
            circuloSummary.importados++;
          }
        } catch (err) {
          console.error('Erro ao importar circulo:', err);
          circuloSummary.erros++;
        }
      }
    }

    if (circuloSummary.erros > 0) {
      throw new Error('Falha ao importar circulos. Nenhuma alteracao foi aplicada.');
    }

    const encontreiraSummary = { ...summaryTemplate };
    encontreiraSummary.totalLidos = 0;

    if (importarEncontreiros && encontreirosRows.length > 0) {
      encontreiraSummary.totalLidos = encontreirosRows.length;
      const defaultTipoImportacao = 'jovens';
      const fallbackFotoImportacao = normalizeTextInput(fotoPadrao) || ensureImportPlaceholderImage();
      const seenImportKeys = new Set();

      for (const rawRow of encontreirosRows) {
        try {
          const row = sourceType === 'sistema'
            ? {
                nomeCompleto: normalizeTextInput(rawRow.nomeCompleto),
                comoQuerSerChamado: normalizeTextInput(rawRow.comoQuerSerChamado),
                genero: normalizeGeneroEncontro(rawRow.genero),
                email: normalizeTextInput(rawRow.email),
                tipo: normalizeTipoEncontro(rawRow.tipo),
                tiosCategoria: normalizeTextInput(rawRow.tiosCategoria).toLowerCase() === 'casal' ? 'casal' : '',
                foto: normalizeTextInput(rawRow.foto) || fallbackFotoImportacao,
                ejc: ejcExistente.nome,
                qualEjcPertence: normalizeTextInput(rawRow.qualEjcPertence),
                logradouro: normalizeTextInput(rawRow.logradouro) || 'Nao informado',
                bairro: normalizeTextInput(rawRow.bairro) || 'Nao informado',
                dataNascimento: parseDateInput(rawRow.dataNascimento) || new Date('2000-01-01'),
                telefone: normalizeTextInput(rawRow.telefone) || 'Nao informado',
                instagram: normalizeTextInput(rawRow.instagram),
                origemTios: normalizeBooleanInput(rawRow.origemTios),
                tiosGrupoId: '',
                equipeServiu: normalizeEquipeReferenceListForImport(rawRow.equipeServiu, ejcExistente.nome, importarEquipes),
                equipeCoordenou: normalizeEquipeReferenceListForImport(rawRow.equipeCoordenou, ejcExistente.nome, importarEquipes),
                temVeiculoProprio: normalizeBooleanInput(rawRow.temVeiculoProprio),
                intolerante: normalizeTextInput(rawRow.intolerante),
                ehAlergico: normalizeTextInput(rawRow.ehAlergico).toLowerCase() === 'sim' ? 'sim' : 'nao',
                alergiaDescricao: normalizeTextInput(rawRow.alergiaDescricao),
                temRelacionamento: normalizeTextInput(rawRow.temRelacionamento),
                observacoes: normalizeTextInput(rawRow.observacoes),
                aprovado: normalizeBooleanInput(rawRow.aprovado),
                statusAprovacao: normalizeApprovalStatusInput(rawRow.statusAprovacao) || (normalizeBooleanInput(rawRow.aprovado) ? 'aprovado' : 'pendente'),
                dataCadastro: parseDateInput(rawRow.dataCadastro) || new Date(),
              }
            : (() => {
                const mappedRow = mapToEncontroPayload(rawRow, fotoPadrao, {
                  defaultTipo: defaultTipoImportacao,
                  fallbackFoto: fallbackFotoImportacao,
                });
                mappedRow.ejc = ejcExistente.nome;
                mappedRow.equipeServiu = normalizeEquipeReferenceListForImport(rawRow.equipeServiu || rawRow.equipe_serviu, ejcExistente.nome, importarEquipes);
                mappedRow.equipeCoordenou = normalizeEquipeReferenceListForImport(rawRow.equipeCoordenou || rawRow.equipe_coordenou, ejcExistente.nome, importarEquipes);
                return mappedRow;
              })();

          if (!row.nomeCompleto || !row.email) {
            encontreiraSummary.ignoradosSemCampos++;
            continue;
          }

          if (!row.foto) {
            encontreiraSummary.ignoradosSemFoto++;
            continue;
          }

          if (!['jovens', 'tios'].includes(row.tipo)) {
            encontreiraSummary.ignoradosTipoInvalido++;
            continue;
          }

          const importKey = `${row.nomeCompleto}|${row.email}`.toLowerCase();
          if (seenImportKeys.has(importKey)) {
            encontreiraSummary.ignoradosDuplicadosImportacao++;
            continue;
          }
          seenImportKeys.add(importKey);

          const emailNormalizado = normalizeTextInput(row.email).toLowerCase();
          const encontreiro = await Encontro.findOne({ email: emailNormalizado, ejc: ejcExistente.nome }).session(session);

          if (encontreiro) {
            if (sourceType === 'sistema' && rawRow && rawRow._id) {
              encontreiroIdMap.set(String(rawRow._id), String(encontreiro._id));
            }
            if (atualizarExistentes) {
              Object.assign(encontreiro, row);
              encontreiro.ejcVinculadoId = new mongoose.Types.ObjectId(ejcId);
              encontreiro.ejcVinculadoNome = ejcExistente.nome;
              await encontreiro.save({ session });
              encontreiraSummary.atualizados++;
            } else {
              encontreiraSummary.ignoradosExistentes++;
            }
          } else {
            row.ejcVinculadoId = new mongoose.Types.ObjectId(ejcId);
            row.ejcVinculadoNome = ejcExistente.nome;
            const novoEncontreiro = new Encontro(row);
            await novoEncontreiro.save({ session });
            if (sourceType === 'sistema' && rawRow && rawRow._id) {
              encontreiroIdMap.set(String(rawRow._id), String(novoEncontreiro._id));
            }
            encontreiraSummary.importados++;
          }
        } catch (err) {
          console.error('Erro ao importar encontreiro:', err);
          encontreiraSummary.erros++;
        }
      }
    }

    if (encontreiraSummary.erros > 0) {
      throw new Error('Falha ao importar encontreiros. Nenhuma alteracao foi aplicada.');
    }

    const vinculoSummary = {
      importados: 0,
      ignorados: 0,
      erros: 0,
    };

    if (sourceType === 'sistema' && vinculoRows.length > 0) {
      for (const vinculoData of vinculoRows) {
        try {
          if (String(vinculoData.pessoaTipo || '') !== 'encontreiro') {
            vinculoSummary.ignorados++;
            continue;
          }

          const pessoaDestinoId = encontreiroIdMap.get(String(vinculoData.pessoaId || ''));
          if (!pessoaDestinoId) {
            vinculoSummary.ignorados++;
            continue;
          }

          let entidadeDestinoId = '';
          if (String(vinculoData.entidadeTipo || '') === 'equipe') {
            entidadeDestinoId = equipeIdMap.get(String(vinculoData.entidadeId || '')) || '';
          } else if (String(vinculoData.entidadeTipo || '') === 'circulo') {
            entidadeDestinoId = circuloIdMap.get(String(vinculoData.entidadeId || '')) || '';
          }

          if (!entidadeDestinoId) {
            vinculoSummary.ignorados++;
            continue;
          }

          const filtroExistente = {
            ejcId: new mongoose.Types.ObjectId(ejcId),
            entidadeTipo: vinculoData.entidadeTipo,
            entidadeId: new mongoose.Types.ObjectId(entidadeDestinoId),
            pessoaTipo: 'encontreiro',
            pessoaId: new mongoose.Types.ObjectId(pessoaDestinoId),
            papel: vinculoData.papel || 'membro',
            descricaoPapel: normalizeTextInput(vinculoData.descricaoPapel),
          };

          const existente = await VinculoEncontro.findOne(filtroExistente).session(session).lean();
          if (existente) {
            vinculoSummary.ignorados++;
            continue;
          }

          await VinculoEncontro.create([filtroExistente], { session });
          vinculoSummary.importados++;
        } catch (err) {
          console.error('Erro ao importar vinculo de encontro:', err);
          vinculoSummary.erros++;
        }
      }
    }

    if (vinculoSummary.erros > 0) {
      throw new Error('Falha ao importar vinculos. Nenhuma alteracao foi aplicada.');
    }

    await session.commitTransaction();

    return {
      equipeSummary,
      circuloSummary,
      encontreiraSummary,
      vinculoSummary,
    };
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch (abortErr) {
      console.error('Falha ao abortar transacao de importacao:', abortErr.message || abortErr);
    }
    throw err;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  processarImportacaoCompletaTransacional,
};
