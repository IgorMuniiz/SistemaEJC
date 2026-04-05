const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

module.exports = (deps) => {
  const {
    Cadastro,
    Encontro,
    normalizeTextInput,
    normalizeApprovalStatusInput,
    resolveApprovalStatus,
    formatExportValue,
    formatDateBR,
    renderCardGridPdf,
    exportImagesFromModel,
  } = deps;

  // export all registrations as CSV or PDF (no JSON support)
  router.get('/export', async (req, res) => {
    try {
      const entries = await Cadastro.find().sort({ dataCadastro: 1 }).lean();
      const format = req.query.format || 'csv';

      if (format === 'csv') {
        // build CSV
        const header = ['nomeCompleto','ejc','logradouro','bairro','dataNascimento','email','instagram','foto','dataCadastro'];
        const rows = entries.map(e => header.map(h => {
          let val = e[h];
          if (val instanceof Date) val = val.toISOString();
          return '"'+String(val || '').replace(/"/g,'""')+'"';
        }).join(','));
        const csv = [header.join(','), ...rows].join('\n');
        res.setHeader('Content-Type','text/csv');
        res.setHeader('Content-Disposition','attachment; filename="cadastro_ejc.csv"');
        return res.send(csv);
      } else if (format === 'pdf') {
        renderCardGridPdf(res, entries, {
          fileName: 'cadastro_ejc.pdf',
          title: 'Inscrições - Encontristas',
          mode: 'cadastro',
        });
        return;
      } else {
        return res.status(400).send('Formato de exportação não suportado');
      }
    } catch (err) {
      console.error(err);
      res.status(500).send('Erro ao exportar dados');
    }
  });

  // export encontro registrations
  router.get('/export-encontro', async (req, res) => {
    try {
      const entries = await Encontro.find().sort({ dataCadastro: 1 }).lean();
      const format = req.query.format || 'csv';
      if (format === 'csv') {
        const header = ['nomeCompleto','ejc','logradouro','bairro','equipeServiu','equipeCoordenou','dataNascimento','intolerante','ehAlergico','alergiaDescricao','email','instagram','foto','dataCadastro'];
        const rows = entries.map(e => header.map(h => {
          let val = formatExportValue(e[h]);
          if (val instanceof Date) val = val.toISOString();
          return '"'+String(val || '').replace(/"/g,'""')+'"';
        }).join(','));
        const csv = [header.join(','), ...rows].join('\n');
        res.setHeader('Content-Type','text/csv');
        res.setHeader('Content-Disposition','attachment; filename="encontro.csv"');
        return res.send(csv);
      } else if (format === 'pdf') {
        // Reorganizar entries para que casais de tios fiquem lado a lado
        const tiosGroups = {};
        const individuais = [];
        
        entries.forEach(entry => {
          if (entry.tipo === 'tios' && entry.tiosGrupoId) {
            if (!tiosGroups[entry.tiosGrupoId]) {
              tiosGroups[entry.tiosGrupoId] = [];
            }
            tiosGroups[entry.tiosGrupoId].push(entry);
          } else {
            individuais.push(entry);
          }
        });
        
        // Montar array final com tios agrupados lado a lado
        const sortedEntries = [];
        Object.values(tiosGroups).forEach(grupo => {
          sortedEntries.push(...grupo);
        });
        sortedEntries.push(...individuais);
        
        renderCardGridPdf(res, sortedEntries, {
          fileName: 'encontro.pdf',
          title: 'Inscrições - Encontreiros',
          mode: 'encontro',
        });
        return;
      } else {
        return res.status(400).send('Formato de exportação não suportado');
      }
    } catch (err) {
      console.error(err);
      res.status(500).send('Erro ao exportar dados');
    }
  });

  // export only tios registrations
  router.get('/export-tios', async (req, res) => {
    try {
      const entries = await Encontro.find({ tipo: 'tios' }).sort({ dataCadastro: 1 }).lean();
      const format = req.query.format || 'pdf';

      if (format !== 'pdf') {
        return res.status(400).send('Formato de exportacao nao suportado');
      }

      // Manter casais agrupados lado a lado no PDF.
      const tiosGroups = {};
      const individuais = [];

      entries.forEach((entry) => {
        if (entry.tiosGrupoId) {
          if (!tiosGroups[entry.tiosGrupoId]) {
            tiosGroups[entry.tiosGrupoId] = [];
          }
          tiosGroups[entry.tiosGrupoId].push(entry);
        } else {
          individuais.push(entry);
        }
      });

      const sortedEntries = [];
      Object.values(tiosGroups).forEach((grupo) => {
        sortedEntries.push(...grupo);
      });
      sortedEntries.push(...individuais);

      renderCardGridPdf(res, sortedEntries, {
        fileName: 'tios.pdf',
        title: 'Inscricoes - Tios',
        mode: 'encontro',
      });
      return;
    } catch (err) {
      console.error(err);
      return res.status(500).send('Erro ao exportar dados de tios');
    }
  });

  // export uploaded images as zip
  router.get('/export-images', (req, res) => {
    const zipName = 'imagens.zip';
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      console.error('Archive error', err);
      res.status(500).send('Erro ao criar arquivo ZIP');
    });
    archive.pipe(res);
    // add uploads folder
    if (fs.existsSync(path.join(__dirname, '..', 'uploads'))) {
      archive.directory(path.join(__dirname, '..', 'uploads'), false);
    }
    archive.finalize();
  });

  // export only images from encontristas form
  router.get('/export-images-encontristas', async (req, res) => {
    try {
      await exportImagesFromModel(Cadastro, 'imagens_encontristas.zip', res);
    } catch (err) {
      console.error(err);
      res.status(500).send('Erro ao exportar imagens');
    }
  });

  // export only images from encontreiros form
  router.get('/export-images-encontreiros', async (req, res) => {
    try {
      await exportImagesFromModel(Encontro, 'imagens_encontreiros.zip', res);
    } catch (err) {
      console.error(err);
      res.status(500).send('Erro ao exportar imagens');
    }
  });

  // export only images from tios
  router.get('/export-images-tios', async (req, res) => {
    try {
      const files = await Encontro.find({ tipo: 'tios' }, 'foto').lean();
      const uniqueFiles = [...new Set(files.map((item) => item.foto).filter(Boolean))];

      const zipName = 'imagens_tios.zip';
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', (err) => {
        console.error('Archive error', err);
        if (!res.headersSent) {
          res.status(500).send('Erro ao criar arquivo ZIP');
        }
      });

      archive.pipe(res);
      uniqueFiles.forEach((fileName) => {
        const filePath = path.join(__dirname, '..', 'uploads', fileName);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: fileName });
        }
      });
      archive.finalize();
    } catch (err) {
      console.error(err);
      res.status(500).send('Erro ao exportar imagens de tios');
    }
  });

  // export encontreiros with detailed equipe columns for easy filtering
  router.get('/export-encontro-relatorio', async (req, res) => {
    try {
      const entries = await Encontro.find().sort({ dataCadastro: 1 }).lean();
      
      // Define all equipes
      const equipes = [
        'Sala', 'Garçom', 'Cozinha', 'Cafezinho', 'Tios de externa',
        'Liturgia interna', 'Liturgia externa', 'Secretaria',
        'Ordem e limpeza', 'Apoio e acolhida', 'Compras'
      ];
      
      // Calculate age from birthdate
      const calculateAge = (birthDate) => {
        if (!birthDate) return '';
        const today = new Date();
        const born = new Date(birthDate);
        let age = today.getFullYear() - born.getFullYear();
        const monthDiff = today.getMonth() - born.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) {
          age--;
        }
        return age > 0 ? age : '';
      };
      
      // Build professional header
      const header = [
        'ID',
        'Nome Completo',
        'EJC',
        'Data Nascimento',
        'Idade',
        'Email',
        'Instagram',
        'Total Equipes Serviu',
        'Total Equipes Coordenou',
        'Experiência (Serviu/Coordenou)',
        'Intolerâncias',
        'É alérgico?',
        'Alergia (descrição)',
        'Data Cadastro'
      ];
      
      // Add equipe columns
      equipes.forEach(eq => {
        header.push(`Serviu: ${eq}`);
      });
      equipes.forEach(eq => {
        header.push(`Coordenou: ${eq}`);
      });
      
      // Build rows with professional data
      const rows = entries.map((e, idx) => {
        const row = [];
        
        // ID
        row.push((idx + 1).toString());
        
        // Nome Completo
        row.push(`"${String(e.nomeCompleto || '').replace(/"/g, '""')}"`);
        
        // EJC
        row.push(`"${String(e.ejc || '').replace(/"/g, '""')}"`);
        
        // Data Nascimento
        let dataNascimentoStr = '';
        let idadeStr = '';
        if (e.dataNascimento) {
          dataNascimentoStr = formatDateBR(e.dataNascimento);
          idadeStr = calculateAge(e.dataNascimento);
        }
        row.push(dataNascimentoStr);
        row.push(idadeStr);
        
        // Email e Instagram
        row.push(`"${String(e.email || '').replace(/"/g, '""')}"`);
        row.push(`"${String(e.instagram || '').replace(/"/g, '""')}"`);
        
        // Total de equipes serviu
        const totalServiu = Array.isArray(e.equipeServiu) ? e.equipeServiu.length : 0;
        row.push(totalServiu.toString());
        
        // Total de equipes coordenou
        const totalCoordenou = Array.isArray(e.equipeCoordenou) ? e.equipeCoordenou.length : 0;
        row.push(totalCoordenou.toString());
        
        // Experiência (resumo)
        let experiencia = '';
        if (totalServiu > 0 && totalCoordenou > 0) {
          experiencia = `Serviu ${totalServiu}x, Coordenou ${totalCoordenou}x`;
        } else if (totalServiu > 0) {
          experiencia = `Serviu ${totalServiu}x`;
        } else if (totalCoordenou > 0) {
          experiencia = `Coordenou ${totalCoordenou}x`;
        } else {
          experiencia = 'Sem experiência registrada';
        }
        row.push(`"${experiencia}"`);
        
        // Intolerâncias / Alergias
        row.push(`"${String(e.intolerante || '').replace(/"/g, '""')}"`);

        // Campos de alergia
        row.push(`"${String((e.ehAlergico || 'nao')).replace(/"/g, '""')}"`);
        row.push(`"${String(e.alergiaDescricao || '').replace(/"/g, '""')}"`);
        
        // Data Cadastro
        let dataCadastroStr = '';
        if (e.dataCadastro) {
          dataCadastroStr = formatDateBR(e.dataCadastro);
        }
        row.push(dataCadastroStr);
        
        // Add equipe columns - Serviu (Sim/Não)
        equipes.forEach(eq => {
          const serviu = Array.isArray(e.equipeServiu) && e.equipeServiu.includes(eq) ? 'Sim' : 'Não';
          row.push(serviu);
        });
        
        // Add equipe columns - Coordenou (Sim/Não)
        equipes.forEach(eq => {
          const coordenou = Array.isArray(e.equipeCoordenou) && e.equipeCoordenou.includes(eq) ? 'Sim' : 'Não';
          row.push(coordenou);
        });
        
        return row.join(',');
      });
      
      // Adicionar linha de resumo com datas
      const now = new Date();
      const summaryRow = [
        'RELATORIO RESUMIDO',
        `Total de Registros: ${entries.length}`,
        '',
        `Gerado em: ${now.toLocaleDateString('pt-BR')}`,
        `Hora: ${now.toLocaleTimeString('pt-BR')}`,
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ];
      
      // Calcula estatísticas
      const totalServiramGeral = entries.reduce((sum, e) => sum + (Array.isArray(e.equipeServiu) ? e.equipeServiu.length : 0), 0);
      const totalCoordenacaosGeral = entries.reduce((sum, e) => sum + (Array.isArray(e.equipeCoordenou) ? e.equipeCoordenou.length : 0), 0);
      
      const csvContent = [
        header.join(','),
        ...rows,
        '',
        summaryRow.join(','),
        `"Pessoa com maior experiência (Serviu + Coordenou): ${Math.max(...entries.map(e => {
          const s = Array.isArray(e.equipeServiu) ? e.equipeServiu.length : 0;
          const c = Array.isArray(e.equipeCoordenou) ? e.equipeCoordenou.length : 0;
          return s + c;
        }))} eventos"`,
        `"Total de serviços registrados: ${totalServiramGeral}"`,
        `"Total de coordenações registradas: ${totalCoordenacaosGeral}"`,
        `"Média de eventos por pessoa (Serviu): ${(totalServiramGeral / entries.length).toFixed(2)}"`,
        `"Média de eventos por pessoa (Coordenou): ${(totalCoordenacaosGeral / entries.length).toFixed(2)}"`
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="encontro_relatorio.csv"');
      return res.send('\uFEFF' + csvContent); // BOM for UTF-8 in Excel
    } catch (err) {
      console.error(err);
      res.status(500).send('Erro ao exportar relatório');
    }
  });

  // export encontreiros com planilha moderna e filtros por equipe
  router.get('/export-encontro-excel', async (req, res) => {
    try {
      const Excel = require('exceljs');
      const entries = await Encontro.find({ aprovado: true }).sort({ dataCadastro: 1 }).lean();
      const allEncontreiros = await Encontro.find().sort({ dataCadastro: 1 }).lean();

      const equipes = [
        'Sala',
        'Garçom',
        'Cozinha',
        'Cafezinho',
        'Tios de externa',
        'Liturgia interna',
        'Liturgia externa',
        'Secretaria',
        'Ordem e limpeza',
        'Apoio e acolhida',
        'Compras',
      ];

      const workbook = new Excel.Workbook();
      workbook.creator = 'EJC COP - Sistema de Gestão';
      workbook.company = 'EJC Comunidade de Oração Pai';
      workbook.created = new Date();
      workbook.modified = new Date();
      workbook.lastPrinted = new Date();

      // ========== ABA PRINCIPAL: DASHBOARD ==========
      const dashboard = workbook.addWorksheet('Dashboard', {
        views: [{ state: 'frozen', ySplit: 4 }],
      });
      dashboard.properties.tabColor = { argb: 'FF0B2545' };

      // Calcular estatísticas
      const estatisticas = equipes.map((equipe) => {
        const serviram = entries.filter((e) => 
          Array.isArray(e.equipeServiu) && e.equipeServiu.includes(equipe)
        ).length;
        const coordenaram = entries.filter((e) => 
          Array.isArray(e.equipeCoordenou) && e.equipeCoordenou.includes(equipe)
        ).length;
        return { equipe, serviram, coordenaram };
      });

      const totalServiramGeral = estatisticas.reduce((sum, e) => sum + e.serviram, 0);
      const totalCoordenaramGeral = estatisticas.reduce((sum, e) => sum + e.coordenaram, 0);
      const mediaEventosPorPessoa = entries.length
        ? ((totalServiramGeral + totalCoordenaramGeral) / entries.length).toFixed(2)
        : '0.00';
      const scoreOperacional = entries.length
        ? (((totalServiramGeral + totalCoordenaramGeral) / (entries.length * 2)) * 100).toFixed(1)
        : '0.0';
      const rankingEquipes = [...estatisticas].sort((a, b) => {
        const scoreA = a.serviram + a.coordenaram;
        const scoreB = b.serviram + b.coordenaram;
        return scoreB - scoreA;
      });
      const equipeDestaque = estatisticas.reduce((best, atual) => {
        const scoreAtual = atual.serviram + atual.coordenaram;
        const scoreBest = best.serviram + best.coordenaram;
        return scoreAtual > scoreBest ? atual : best;
      }, estatisticas[0] || { equipe: 'N/A', serviram: 0, coordenaram: 0 });

      // Configurar colunas
      dashboard.columns = [
        { header: '', key: 'col1', width: 2 },
        { header: 'Equipe', key: 'equipe', width: 28 },
        { header: 'Serviram', key: 'serviram', width: 13 },
        { header: 'Gráfico', key: 'barraServiu', width: 35 },
        { header: 'Coordenaram', key: 'coordenaram', width: 13 },
        { header: 'Gráfico', key: 'barraCoordenou', width: 35 },
        { header: '', key: 'col7', width: 3 },
        { header: 'Dados Gráfico - Equipe', key: 'dadosEquipe', width: 28 },
        { header: 'Dados Gráfico - Valor', key: 'dadosValor', width: 13 },
      ];

      // Banner superior com gradiente
      dashboard.mergeCells('A1:I1');
      const bannerCell = dashboard.getCell('A1');
      bannerCell.value = 'CENTRO ANALITICO EJC - DASHBOARD EXECUTIVO DE EQUIPES';
      bannerCell.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI' };
      bannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B2545' } };
      bannerCell.alignment = { horizontal: 'center', vertical: 'middle' };
      bannerCell.border = {
        bottom: { style: 'thick', color: { argb: 'FF3A86FF' } },
      };
      dashboard.getRow(1).height = 42;

      // Título principal
      dashboard.mergeCells('B2:F2');
      const titleCell = dashboard.getCell('B2');
      titleCell.value = 'DASHBOARD - ESTATISTICAS DE DESEMPENHO';
      titleCell.font = { bold: true, size: 15, color: { argb: 'FF0B2545' }, name: 'Segoe UI' };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4FF' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.border = {
        top: { style: 'thin', color: { argb: 'FF3A86FF' } },
        bottom: { style: 'thin', color: { argb: 'FF3A86FF' } },
        left: { style: 'thin', color: { argb: 'FF3A86FF' } },
        right: { style: 'thin', color: { argb: 'FF3A86FF' } },
      };
      dashboard.getRow(2).height = 32;

      // Subtítulo com informações
      dashboard.mergeCells('B3:F3');
      const subtitleCell = dashboard.getCell('B3');
      const dataHora = new Date();
      subtitleCell.value = `${dataHora.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | ${dataHora.toLocaleTimeString('pt-BR')} | Total: ${entries.length} encontreiros`;
      subtitleCell.font = { italic: true, size: 10, color: { argb: 'FF5A6C7D' }, name: 'Segoe UI' };
      subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFBFF' } };
      subtitleCell.border = {
        bottom: { style: 'thin', color: { argb: 'FFD1E0F0' } },
      };
      dashboard.getRow(3).height = 24;

      // KPIs executivos do dashboard
      dashboard.mergeCells('H2:I2');
      const kpiTopCell = dashboard.getCell('H2');
      kpiTopCell.value = `KPIs EXECUTIVOS | Aprovados: ${entries.length} | Media por pessoa: ${mediaEventosPorPessoa}`;
      kpiTopCell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI Semibold' };
      kpiTopCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      kpiTopCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
      kpiTopCell.border = {
        top: { style: 'thin', color: { argb: 'FF93C5FD' } },
        bottom: { style: 'thin', color: { argb: 'FF93C5FD' } },
        left: { style: 'thin', color: { argb: 'FF93C5FD' } },
        right: { style: 'thin', color: { argb: 'FF93C5FD' } },
      };

      dashboard.mergeCells('H3:I3');
      const kpiBottomCell = dashboard.getCell('H3');
      kpiBottomCell.value = `Equipe lider: ${equipeDestaque.equipe} | Serviram: ${totalServiramGeral} | Coordenaram: ${totalCoordenaramGeral}`;
      kpiBottomCell.font = { bold: true, size: 10, color: { argb: 'FF0B2545' }, name: 'Segoe UI Semibold' };
      kpiBottomCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      kpiBottomCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0ECFF' } };
      kpiBottomCell.border = {
        top: { style: 'thin', color: { argb: 'FF93C5FD' } },
        bottom: { style: 'thin', color: { argb: 'FF93C5FD' } },
        left: { style: 'thin', color: { argb: 'FF93C5FD' } },
        right: { style: 'thin', color: { argb: 'FF93C5FD' } },
      };

      const top1 = rankingEquipes[0] || { equipe: 'N/A', serviram: 0, coordenaram: 0 };
      const top2 = rankingEquipes[1] || { equipe: '-', serviram: 0, coordenaram: 0 };
      const top3 = rankingEquipes[2] || { equipe: '-', serviram: 0, coordenaram: 0 };

      const styleExecutiveCard = (range, text, bg, border, color) => {
        dashboard.mergeCells(range);
        const cell = dashboard.getCell(range.split(':')[0]);
        cell.value = text;
        cell.font = { bold: true, size: 10, color: { argb: color }, name: 'Segoe UI Semibold' };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.border = {
          top: { style: 'thin', color: { argb: border } },
          bottom: { style: 'thin', color: { argb: border } },
          left: { style: 'thin', color: { argb: border } },
          right: { style: 'thin', color: { argb: border } },
        };
      };

      styleExecutiveCard('H5:I5', `SCORE OPERACIONAL\n${scoreOperacional}%`, 'FFEFF6FF', 'FF93C5FD', 'FF1E3A8A');
      styleExecutiveCard('H6:I6', `TOP 1\n${top1.equipe} (${top1.serviram + top1.coordenaram})`, 'FFECFDF3', 'FF86EFAC', 'FF166534');
      styleExecutiveCard('H7:I7', `TOP 2\n${top2.equipe} (${top2.serviram + top2.coordenaram})`, 'FFFFF7ED', 'FFFCD34D', 'FF92400E');
      styleExecutiveCard('H8:I8', `TOP 3\n${top3.equipe} (${top3.serviram + top3.coordenaram})`, 'FFFFF1F2', 'FFFDA4AF', 'FF9F1239');

      dashboard.getRow(5).height = 34;
      dashboard.getRow(6).height = 34;
      dashboard.getRow(7).height = 34;
      dashboard.getRow(8).height = 34;

      // Cabeçalho da tabela de estatísticas
      const headerRow = dashboard.getRow(4);
      headerRow.height = 34;
      ['B4', 'C4', 'D4', 'E4', 'F4'].forEach((cell, idx) => {
        const c = dashboard.getCell(cell);
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B2545' } };
        c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Segoe UI Semibold' };
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        c.border = {
          top: { style: 'medium', color: { argb: 'FF3A86FF' } },
          bottom: { style: 'medium', color: { argb: 'FF3A86FF' } },
          left: { style: 'thin', color: { argb: 'FF0B2545' } },
          right: { style: 'thin', color: { argb: 'FF0B2545' } },
        };
      });

      dashboard.getCell('B4').value = 'EQUIPE';
      dashboard.getCell('C4').value = 'SERVIRAM';
      dashboard.getCell('D4').value = 'VISUAL EXECUTIVO';
      dashboard.getCell('E4').value = 'COORDENARAM';
      dashboard.getCell('F4').value = 'VISUAL EXECUTIVO';

      // Adicionar dados de estatísticas com design moderno
      const maxServiu = Math.max(...estatisticas.map(e => e.serviram), 1);
      const maxCoordenou = Math.max(...estatisticas.map(e => e.coordenaram), 1);

      estatisticas.forEach((stat, idx) => {
        const rowNum = 5 + idx;
        const row = dashboard.getRow(rowNum);
        row.height = 28;

        // Cores alternadas mais sofisticadas
        const isEquipeDestaque = stat.equipe === equipeDestaque.equipe;
        const bgColor = isEquipeDestaque
          ? 'FFEFF6FF'
          : (idx % 2 === 0 ? 'FFF8FBFF' : 'FFFFFFFF');
        const borderColor = isEquipeDestaque ? 'FF93C5FD' : 'FFD1E0F0';

        // Equipe
        const equipeCell = dashboard.getCell(`B${rowNum}`);
        equipeCell.value = stat.equipe;
        equipeCell.font = {
          bold: true,
          size: 11,
          color: { argb: isEquipeDestaque ? 'FF1D4ED8' : 'FF0B2545' },
          name: 'Segoe UI',
        };
        equipeCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        equipeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };

        // Serviram (número) com formatação condicional
        const serviramCell = dashboard.getCell(`C${rowNum}`);
        serviramCell.value = stat.serviram;
        serviramCell.font = { size: 12, bold: true, color: { argb: 'FF06BA63' }, name: 'Segoe UI' };
        serviramCell.alignment = { horizontal: 'center', vertical: 'middle' };
        serviramCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        serviramCell.numFmt = '0';

        // Barra visual serviu com gradiente simulado
        const barraServiuCell = dashboard.getCell(`D${rowNum}`);
        const percentServiu = (stat.serviram / maxServiu) * 100;
        const blocosServiu = Math.max(0, Math.min(30, Math.round(percentServiu / 3.33)));
        const barraServiu = '█'.repeat(blocosServiu) + '░'.repeat(30 - blocosServiu);
        barraServiuCell.value = `${barraServiu} ${percentServiu.toFixed(1)}%`;
        barraServiuCell.font = { size: 9, color: { argb: 'FF06BA63' }, name: 'Consolas' };
        barraServiuCell.alignment = { horizontal: 'left', vertical: 'middle' };
        barraServiuCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };

        // Coordenaram (número) com formatação condicional
        const coordenaramCell = dashboard.getCell(`E${rowNum}`);
        coordenaramCell.value = stat.coordenaram;
        coordenaramCell.font = { size: 12, bold: true, color: { argb: 'FFFF6B35' }, name: 'Segoe UI' };
        coordenaramCell.alignment = { horizontal: 'center', vertical: 'middle' };
        coordenaramCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        coordenaramCell.numFmt = '0';

        // Barra visual coordenou com gradiente simulado
        const barraCoordCell = dashboard.getCell(`F${rowNum}`);
        const percentCoordenou = (stat.coordenaram / maxCoordenou) * 100;
        const blocosCoordenou = Math.max(0, Math.min(30, Math.round(percentCoordenou / 3.33)));
        const barraCoordenou = '█'.repeat(blocosCoordenou) + '░'.repeat(30 - blocosCoordenou);
        barraCoordCell.value = `${barraCoordenou} ${percentCoordenou.toFixed(1)}%`;
        barraCoordCell.font = { size: 9, color: { argb: 'FFFF6B35' }, name: 'Consolas' };
        barraCoordCell.alignment = { horizontal: 'left', vertical: 'middle' };
        barraCoordCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };

        // Bordas modernas
        ['B', 'C', 'D', 'E', 'F'].forEach((col) => {
          dashboard.getCell(`${col}${rowNum}`).border = {
            top: { style: 'thin', color: { argb: borderColor } },
            bottom: { style: 'thin', color: { argb: borderColor } },
            left: { style: 'hair', color: { argb: borderColor } },
            right: { style: 'hair', color: { argb: borderColor } },
          };
        });
      });

      // Linha de totais com destaque
      const totalRowNum = 5 + equipes.length;
      dashboard.getRow(totalRowNum).height = 32;
      
      dashboard.getCell(`B${totalRowNum}`).value = 'TOTAL GERAL';
      dashboard.getCell(`C${totalRowNum}`).value = totalServiramGeral;
      dashboard.getCell(`D${totalRowNum}`).value = `█`.repeat(30) + ' 100.0%';
      dashboard.getCell(`E${totalRowNum}`).value = totalCoordenaramGeral;
      dashboard.getCell(`F${totalRowNum}`).value = `█`.repeat(30) + ' 100.0%';

      ['B', 'C', 'D', 'E', 'F'].forEach((col) => {
        const cell = dashboard.getCell(`${col}${totalRowNum}`);
        cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI Semibold' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B2545' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'double', color: { argb: 'FF3A86FF' } },
          bottom: { style: 'double', color: { argb: 'FF3A86FF' } },
          left: { style: 'thin', color: { argb: 'FF0B2545' } },
          right: { style: 'thin', color: { argb: 'FF0B2545' } },
        };
      });
      dashboard.getCell(`C${totalRowNum}`).font = { bold: true, size: 13, color: { argb: 'FF06FFA5' }, name: 'Segoe UI' };
      dashboard.getCell(`E${totalRowNum}`).font = { bold: true, size: 13, color: { argb: 'FFFF6B35' }, name: 'Segoe UI' };

      // Legenda moderna
      const legendRowNum = totalRowNum + 2;
      dashboard.mergeCells(`B${legendRowNum}:F${legendRowNum}`);
      const legendCell = dashboard.getCell(`B${legendRowNum}`);
      legendCell.value = 'Legenda: █ = volume preenchido | ░ = volume livre | Verde = Serviram | Laranja = Coordenaram | percentual relativo ao maximo';
      legendCell.font = { italic: true, size: 9, color: { argb: 'FF6B7A8C' }, name: 'Segoe UI' };
      legendCell.alignment = { horizontal: 'center', vertical: 'middle' };
      legendCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBF0' } };
      legendCell.border = {
        top: { style: 'thin', color: { argb: 'FFFFD966' } },
        bottom: { style: 'thin', color: { argb: 'FFFFD966' } },
        left: { style: 'thin', color: { argb: 'FFFFD966' } },
        right: { style: 'thin', color: { argb: 'FFFFD966' } },
      };
      dashboard.getRow(legendRowNum).height = 22;

      // ========== SECAO DE GRAFICOS ==========
      const graficosStartRow = legendRowNum + 3;

      // Título da seção de gráficos
      dashboard.mergeCells(`B${graficosStartRow}:I${graficosStartRow}`);
      const graficosTitleCell = dashboard.getCell(`B${graficosStartRow}`);
      graficosTitleCell.value = 'DADOS PARA CRIACAO DE GRAFICOS PERSONALIZADOS';
      graficosTitleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI' };
      graficosTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B2545' } };
      graficosTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      graficosTitleCell.border = {
        top: { style: 'medium', color: { argb: 'FF3A86FF' } },
        bottom: { style: 'medium', color: { argb: 'FF3A86FF' } },
        left: { style: 'thin', color: { argb: 'FF0B2545' } },
        right: { style: 'thin', color: { argb: 'FF0B2545' } },
      };
      dashboard.getRow(graficosStartRow).height = 35;

      // Seção 1: Dados de Serviram
      const graficoServiuStartRow = graficosStartRow + 2;
      dashboard.mergeCells(`H${graficoServiuStartRow}:I${graficoServiuStartRow}`);
      const serviuSubtitle = dashboard.getCell(`H${graficoServiuStartRow}`);
      serviuSubtitle.value = 'PESSOAS QUE SERVIRAM POR EQUIPE';
      serviuSubtitle.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI' };
      serviuSubtitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF06BA63' } };
      serviuSubtitle.alignment = { horizontal: 'center', vertical: 'middle' };
      serviuSubtitle.border = {
        top: { style: 'thin', color: { argb: 'FF06BA63' } },
        bottom: { style: 'thin', color: { argb: 'FF06BA63' } },
        left: { style: 'thin', color: { argb: 'FF06BA63' } },
        right: { style: 'thin', color: { argb: 'FF06BA63' } },
      };
      dashboard.getRow(graficoServiuStartRow).height = 26;
      
      const chartDataStartRow = graficoServiuStartRow + 1;
      
      // Header para dados do gráfico - Serviu
      const headerServiuH = dashboard.getCell(`H${chartDataStartRow}`);
      headerServiuH.value = 'Equipe';
      headerServiuH.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI Semibold' };
      headerServiuH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF06BA63' } };
      headerServiuH.alignment = { horizontal: 'center', vertical: 'middle' };
      headerServiuH.border = {
        top: { style: 'medium', color: { argb: 'FF06BA63' } },
        bottom: { style: 'medium', color: { argb: 'FF06BA63' } },
        left: { style: 'thin', color: { argb: 'FF06BA63' } },
        right: { style: 'thin', color: { argb: 'FF06BA63' } },
      };
      
      const headerServiuI = dashboard.getCell(`I${chartDataStartRow}`);
      headerServiuI.value = 'Quantidade';
      headerServiuI.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI Semibold' };
      headerServiuI.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF06BA63' } };
      headerServiuI.alignment = { horizontal: 'center', vertical: 'middle' };
      headerServiuI.border = {
        top: { style: 'medium', color: { argb: 'FF06BA63' } },
        bottom: { style: 'medium', color: { argb: 'FF06BA63' } },
        left: { style: 'thin', color: { argb: 'FF06BA63' } },
        right: { style: 'thin', color: { argb: 'FF06BA63' } },
      };
      dashboard.getRow(chartDataStartRow).height = 24;
      
      estatisticas.forEach((stat, idx) => {
        const rowNum = chartDataStartRow + 1 + idx;
        const row = dashboard.getRow(rowNum);
        row.height = 22;
        
        const cellH = dashboard.getCell(`H${rowNum}`);
        const cellI = dashboard.getCell(`I${rowNum}`);
        
        const bgColor = idx % 2 === 0 ? 'FFE8F9F0' : 'FFFFFFFF';
        
        cellH.value = `- ${stat.equipe}`;
        cellH.font = { size: 10, color: { argb: 'FF0B2545' }, name: 'Segoe UI' };
        cellH.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        cellH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cellH.border = {
          top: { style: 'thin', color: { argb: 'FFD1E0F0' } },
          bottom: { style: 'thin', color: { argb: 'FFD1E0F0' } },
          left: { style: 'thin', color: { argb: 'FFD1E0F0' } },
          right: { style: 'hair', color: { argb: 'FFD1E0F0' } },
        };
        
        cellI.value = stat.serviram;
        cellI.font = { size: 11, bold: true, color: { argb: 'FF06BA63' }, name: 'Segoe UI' };
        cellI.alignment = { horizontal: 'center', vertical: 'middle' };
        cellI.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cellI.numFmt = '0';
        cellI.border = {
          top: { style: 'thin', color: { argb: 'FFD1E0F0' } },
          bottom: { style: 'thin', color: { argb: 'FFD1E0F0' } },
          left: { style: 'hair', color: { argb: 'FFD1E0F0' } },
          right: { style: 'thin', color: { argb: 'FFD1E0F0' } },
        };
      });

      // Seção 2: Dados de Coordenaram
      const graficoCoordenouStartRow = chartDataStartRow + equipes.length + 3;
      dashboard.mergeCells(`H${graficoCoordenouStartRow}:I${graficoCoordenouStartRow}`);
      const coordenouSubtitle = dashboard.getCell(`H${graficoCoordenouStartRow}`);
      coordenouSubtitle.value = 'PESSOAS QUE COORDENARAM POR EQUIPE';
      coordenouSubtitle.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI' };
      coordenouSubtitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B35' } };
      coordenouSubtitle.alignment = { horizontal: 'center', vertical: 'middle' };
      coordenouSubtitle.border = {
        top: { style: 'thin', color: { argb: 'FFFF6B35' } },
        bottom: { style: 'thin', color: { argb: 'FFFF6B35' } },
        left: { style: 'thin', color: { argb: 'FFFF6B35' } },
        right: { style: 'thin', color: { argb: 'FFFF6B35' } },
      };
      dashboard.getRow(graficoCoordenouStartRow).height = 26;
      
      const chartDataCoordenouStartRow = graficoCoordenouStartRow + 1;
      
      // Header para dados do gráfico coordenou
      const headerCoordenouH = dashboard.getCell(`H${chartDataCoordenouStartRow}`);
      headerCoordenouH.value = 'Equipe';
      headerCoordenouH.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI Semibold' };
      headerCoordenouH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B35' } };
      headerCoordenouH.alignment = { horizontal: 'center', vertical: 'middle' };
      headerCoordenouH.border = {
        top: { style: 'medium', color: { argb: 'FFFF6B35' } },
        bottom: { style: 'medium', color: { argb: 'FFFF6B35' } },
        left: { style: 'thin', color: { argb: 'FFFF6B35' } },
        right: { style: 'thin', color: { argb: 'FFFF6B35' } },
      };
      
      const headerCoordenouI = dashboard.getCell(`I${chartDataCoordenouStartRow}`);
      headerCoordenouI.value = 'Quantidade';
      headerCoordenouI.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI Semibold' };
      headerCoordenouI.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B35' } };
      headerCoordenouI.alignment = { horizontal: 'center', vertical: 'middle' };
      headerCoordenouI.border = {
        top: { style: 'medium', color: { argb: 'FFFF6B35' } },
        bottom: { style: 'medium', color: { argb: 'FFFF6B35' } },
        left: { style: 'thin', color: { argb: 'FFFF6B35' } },
        right: { style: 'thin', color: { argb: 'FFFF6B35' } },
      };
      dashboard.getRow(chartDataCoordenouStartRow).height = 24;
      
      estatisticas.forEach((stat, idx) => {
        const rowNum = chartDataCoordenouStartRow + 1 + idx;
        const row = dashboard.getRow(rowNum);
        row.height = 22;
        
        const cellH = dashboard.getCell(`H${rowNum}`);
        const cellI = dashboard.getCell(`I${rowNum}`);
        
        const bgColor = idx % 2 === 0 ? 'FFFFF5EE' : 'FFFFFFFF';
        
        cellH.value = `- ${stat.equipe}`;
        cellH.font = { size: 10, color: { argb: 'FF0B2545' }, name: 'Segoe UI' };
        cellH.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        cellH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cellH.border = {
          top: { style: 'thin', color: { argb: 'FFD1E0F0' } },
          bottom: { style: 'thin', color: { argb: 'FFD1E0F0' } },
          left: { style: 'thin', color: { argb: 'FFD1E0F0' } },
          right: { style: 'hair', color: { argb: 'FFD1E0F0' } },
        };
        
        cellI.value = stat.coordenaram;
        cellI.font = { size: 11, bold: true, color: { argb: 'FFFF6B35' }, name: 'Segoe UI' };
        cellI.alignment = { horizontal: 'center', vertical: 'middle' };
        cellI.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cellI.numFmt = '0';
        cellI.border = {
          top: { style: 'thin', color: { argb: 'FFD1E0F0' } },
          bottom: { style: 'thin', color: { argb: 'FFD1E0F0' } },
          left: { style: 'hair', color: { argb: 'FFD1E0F0' } },
          right: { style: 'thin', color: { argb: 'FFD1E0F0' } },
        };
      });

      // Instruções para criar gráficos (caixa de ajuda)
      const instRowNum = graficoCoordenouStartRow + equipes.length + 4;
      dashboard.mergeCells(`B${instRowNum}:F${instRowNum + 3}`);
      const instCell = dashboard.getCell(`B${instRowNum}`);
      instCell.value = 'INSTRUCOES PARA CRIAR GRAFICOS NO EXCEL:\n\n1. Selecione os dados nas colunas H e I (uma tabela por vez)\n2. Clique em "Inserir" > "Grafico" > "Colunas" ou "Barras"\n3. Personalize cores, titulos e legendas conforme sua preferencia\n4. Use as cores sugeridas: Verde (#06BA63) para Serviram | Laranja (#FF6B35) para Coordenaram';
      instCell.font = { size: 10, color: { argb: 'FF5A4A00' }, name: 'Segoe UI' };
      instCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
      instCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFADB' } };
      instCell.border = {
        top: { style: 'medium', color: { argb: 'FFFFC966' } },
        bottom: { style: 'medium', color: { argb: 'FFFFC966' } },
        left: { style: 'medium', color: { argb: 'FFFFC966' } },
        right: { style: 'medium', color: { argb: 'FFFFC966' } },
      };
      dashboard.getRow(instRowNum).height = 80;

      // ========== ABAS DE EQUIPES ==========
      // Criar uma aba para cada equipe
      equipes.forEach((equipeAtual) => {
        // Filtrar apenas pessoas que NAO selecionaram esta equipe
        const pessoasDisponiveis = entries.filter((e) => {
          const serviuNaEquipe = Array.isArray(e.equipeServiu) && e.equipeServiu.includes(equipeAtual);
          const coordenouNaEquipe = Array.isArray(e.equipeCoordenou) && e.equipeCoordenou.includes(equipeAtual);
          return !serviuNaEquipe && !coordenouNaEquipe;
        });

        const worksheet = workbook.addWorksheet(equipeAtual, {
          views: [{ state: 'frozen', ySplit: 1 }],
        });

        worksheet.columns = [
          { header: 'Nome', key: 'nome', width: 34 },
          { header: 'Como quer ser chamado', key: 'comoQuerSerChamado', width: 26 },
          { header: 'Genero', key: 'genero', width: 14 },
          { header: 'EJC', key: 'ejc', width: 18 },
          { header: 'A qual EJC pertence', key: 'qualEjcPertence', width: 22 },
          { header: 'Tipo', key: 'tipo', width: 12 },
          { header: 'Categoria Tios', key: 'tiosCategoria', width: 14 },
          { header: 'Origem Tios', key: 'origemTios', width: 14 },
          { header: 'Tem Veiculo Proprio', key: 'temVeiculoProprio', width: 18 },
          { header: 'Logradouro', key: 'logradouro', width: 30 },
          { header: 'Bairro', key: 'bairro', width: 22 },
          { header: 'Equipes que Serviu', key: 'equipeServiu', width: 35 },
          { header: 'Equipes que Coordenou', key: 'equipeCoordenou', width: 35 },
          { header: 'Data de Nascimento', key: 'dataNascimento', width: 18 },
          { header: 'Telefone', key: 'telefone', width: 18 },
          { header: 'Intolerancias/Alergias', key: 'intolerante', width: 28 },
          { header: 'É alérgico?', key: 'ehAlergico', width: 14 },
          { header: 'Alergia (descrição)', key: 'alergiaDescricao', width: 28 },
          { header: 'Email', key: 'email', width: 28 },
          { header: 'Status', key: 'statusAprovacao', width: 14 },
          { header: 'Relacionamento com encontreiro/encontrista', key: 'temRelacionamento', width: 34 },
          { header: 'Instagram', key: 'instagram', width: 24 },
          { header: 'Observacoes', key: 'observacoes', width: 34 },
        ];

        // Definir cor da tab
        worksheet.properties.tabColor = { argb: 'FF3A86FF' };

        // Estilo do cabeçalho moderno
        const headerRow = worksheet.getRow(1);
        headerRow.height = 32;
        headerRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0B2545' },
          };
          cell.font = {
            bold: true,
            color: { argb: 'FFFFFFFF' },
            size: 11,
            name: 'Segoe UI Semibold',
          };
          cell.alignment = {
            horizontal: 'center',
            vertical: 'middle',
            wrapText: true,
          };
          cell.border = {
            top: { style: 'medium', color: { argb: 'FF3A86FF' } },
            bottom: { style: 'double', color: { argb: 'FF3A86FF' } },
            left: { style: 'thin', color: { argb: 'FF0B2545' } },
            right: { style: 'thin', color: { argb: 'FF0B2545' } },
          };
        });

        // Adicionar filtros automáticos
        worksheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: worksheet.columns.length },
        };

        // Adicionar dados
        pessoasDisponiveis.forEach((e, idx) => {
          const tipoTexto = e.tipo === 'tios' ? 'Tios' : 'Jovens';
          
          const rowData = {
            nome: e.nomeCompleto || '',
            comoQuerSerChamado: e.comoQuerSerChamado || '',
            genero: e.genero || '',
            ejc: e.ejc || '',
            qualEjcPertence: e.qualEjcPertence || '',
            tipo: tipoTexto,
            tiosCategoria: e.tipo === 'tios' ? (e.tiosCategoria === 'casal' ? 'Casal' : 'Solo') : '-',
            origemTios: e.tipo === 'tios' ? (e.origemTios ? 'Sim' : 'Nao') : '-',
            temVeiculoProprio: e.temVeiculoProprio ? 'Sim' : 'Nao',
            logradouro: e.logradouro || '',
            bairro: e.bairro || '',
            equipeServiu: Array.isArray(e.equipeServiu) ? e.equipeServiu.join(', ') : '',
            equipeCoordenou: Array.isArray(e.equipeCoordenou) ? e.equipeCoordenou.join(', ') : '',
            dataNascimento: e.dataNascimento ? new Date(e.dataNascimento).toLocaleDateString('pt-BR') : '',
            telefone: e.telefone || '',
            intolerante: e.intolerante || '',
            ehAlergico: normalizeTextInput(e.ehAlergico).toLowerCase() === 'sim' ? 'Sim' : 'Nao',
            alergiaDescricao: e.alergiaDescricao || '',
            email: e.email || '',
            statusAprovacao: resolveApprovalStatus(e),
            temRelacionamento: e.temRelacionamento || '',
            instagram: e.instagram || '',
            observacoes: e.observacoes || '',
          };

          const row = worksheet.addRow(rowData);
          row.height = 24;

          const bgColor = idx % 2 === 0 ? 'FFF8FBFF' : 'FFFFFFFF';
          row.eachCell((cell, colNumber) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: bgColor },
            };
            cell.font = {
              size: 10,
              color: { argb: 'FF1A2332' },
              name: 'Segoe UI',
            };
            cell.alignment = {
              horizontal: 'left',
              vertical: 'middle',
              wrapText: true,
            };
            cell.border = {
              top: { style: 'hair', color: { argb: 'FFD1E0F0' } },
              bottom: { style: 'hair', color: { argb: 'FFD1E0F0' } },
              left: { style: 'hair', color: { argb: 'FFD1E0F0' } },
              right: { style: 'hair', color: { argb: 'FFD1E0F0' } },
            };
          });
        });

        // Linha de resumo moderna
        worksheet.addRow({});
        const summaryRow = worksheet.addRow({
          nome: `Total disponíveis para ${equipeAtual}: ${pessoasDisponiveis.length} pessoa(s)`,
          comoQuerSerChamado: '',
          genero: '',
          ejc: '',
          qualEjcPertence: '',
          tipo: '',
          tiosCategoria: '',
          origemTios: '',
          temVeiculoProprio: '',
          logradouro: '',
          bairro: '',
          equipeServiu: '',
          equipeCoordenou: '',
          dataNascimento: '',
          telefone: '',
          intolerante: '',
          ehAlergico: '',
          alergiaDescricao: '',
          email: `Gerado em: ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} às ${new Date().toLocaleTimeString('pt-BR')}`,
          statusAprovacao: '',
          temRelacionamento: '',
          instagram: '',
          observacoes: '',
        });
        summaryRow.height = 28;
        summaryRow.eachCell((cell, colNumber) => {
          cell.font = {
            bold: true,
            size: 10,
            color: { argb: 'FF0B2545' },
            name: 'Segoe UI Semibold',
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE8F4FF' },
          };
          cell.alignment = {
            horizontal: 'left',
            vertical: 'middle',
          };
          cell.border = {
            top: { style: 'double', color: { argb: 'FF3A86FF' } },
            bottom: { style: 'thin', color: { argb: 'FF3A86FF' } },
            left: { style: 'hair', color: { argb: 'FFD1E0F0' } },
            right: { style: 'hair', color: { argb: 'FFD1E0F0' } },
          };
        });
      });

      // Aba consolidada com todos os encontreiros do sistema
      const allSheet = workbook.addWorksheet('Todos Encontreiros', {
        views: [{ state: 'frozen', ySplit: 1 }],
      });
      allSheet.properties.tabColor = { argb: 'FF0B2545' };

      allSheet.columns = [
        { header: 'Nome', key: 'nome', width: 34 },
        { header: 'Como quer ser chamado', key: 'comoQuerSerChamado', width: 26 },
        { header: 'Genero', key: 'genero', width: 14 },
        { header: 'EJC', key: 'ejc', width: 18 },
        { header: 'A qual EJC pertence', key: 'qualEjcPertence', width: 22 },
        { header: 'Tipo', key: 'tipo', width: 12 },
        { header: 'Categoria Tios', key: 'tiosCategoria', width: 14 },
        { header: 'Origem Tios', key: 'origemTios', width: 14 },
        { header: 'Tem Veiculo Proprio', key: 'temVeiculoProprio', width: 18 },
        { header: 'Logradouro', key: 'logradouro', width: 30 },
        { header: 'Bairro', key: 'bairro', width: 22 },
        { header: 'Equipes que Serviu', key: 'equipeServiu', width: 35 },
        { header: 'Equipes que Coordenou', key: 'equipeCoordenou', width: 35 },
        { header: 'Data de Nascimento', key: 'dataNascimento', width: 18 },
        { header: 'Telefone', key: 'telefone', width: 18 },
        { header: 'Intolerancias/Alergias', key: 'intolerante', width: 28 },
        { header: 'É alérgico?', key: 'ehAlergico', width: 14 },
        { header: 'Alergia (descrição)', key: 'alergiaDescricao', width: 28 },
        { header: 'Email', key: 'email', width: 28 },
        { header: 'Status', key: 'statusAprovacao', width: 14 },
        { header: 'Relacionamento', key: 'temRelacionamento', width: 28 },
        { header: 'Instagram', key: 'instagram', width: 24 },
        { header: 'Observacoes', key: 'observacoes', width: 34 },
        { header: 'Data Cadastro', key: 'dataCadastro', width: 20 },
      ];

      const allHeader = allSheet.getRow(1);
      allHeader.height = 32;
      allHeader.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B2545' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Segoe UI Semibold' };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF3A86FF' } },
          bottom: { style: 'double', color: { argb: 'FF3A86FF' } },
          left: { style: 'thin', color: { argb: 'FF0B2545' } },
          right: { style: 'thin', color: { argb: 'FF0B2545' } },
        };
      });

      allSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: allSheet.columns.length },
      };

      allEncontreiros.forEach((e, idx) => {
        const tipoTexto = e.tipo === 'tios' ? 'Tios' : 'Jovens';
        const status = resolveApprovalStatus(e);
        const row = allSheet.addRow({
          nome: e.nomeCompleto || '',
          comoQuerSerChamado: e.comoQuerSerChamado || '',
          genero: e.genero || '',
          ejc: e.ejc || '',
          qualEjcPertence: e.qualEjcPertence || '',
          tipo: tipoTexto,
          tiosCategoria: e.tipo === 'tios' ? (e.tiosCategoria === 'casal' ? 'Casal' : 'Solo') : '-',
          origemTios: e.tipo === 'tios' ? (e.origemTios ? 'Sim' : 'Nao') : '-',
          temVeiculoProprio: e.temVeiculoProprio ? 'Sim' : 'Nao',
          logradouro: e.logradouro || '',
          bairro: e.bairro || '',
          equipeServiu: Array.isArray(e.equipeServiu) ? e.equipeServiu.join(', ') : '',
          equipeCoordenou: Array.isArray(e.equipeCoordenou) ? e.equipeCoordenou.join(', ') : '',
          dataNascimento: e.dataNascimento ? new Date(e.dataNascimento).toLocaleDateString('pt-BR') : '',
          telefone: e.telefone || '',
          intolerante: e.intolerante || '',
          ehAlergico: normalizeTextInput(e.ehAlergico).toLowerCase() === 'sim' ? 'Sim' : 'Nao',
          alergiaDescricao: e.alergiaDescricao || '',
          email: e.email || '',
          statusAprovacao: status,
          temRelacionamento: e.temRelacionamento || '',
          instagram: e.instagram || '',
          observacoes: e.observacoes || '',
          dataCadastro: e.dataCadastro ? new Date(e.dataCadastro).toLocaleString('pt-BR') : '',
        });

        row.height = 24;
        const bgColor = idx % 2 === 0 ? 'FFF8FBFF' : 'FFFFFFFF';
        row.eachCell((cell, colNumber) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
          cell.font = { size: 10, color: { argb: 'FF1A2332' }, name: 'Segoe UI' };
          cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          cell.border = {
            top: { style: 'hair', color: { argb: 'FFD1E0F0' } },
            bottom: { style: 'hair', color: { argb: 'FFD1E0F0' } },
            left: { style: 'hair', color: { argb: 'FFD1E0F0' } },
            right: { style: 'hair', color: { argb: 'FFD1E0F0' } },
          };

          if (colNumber === 18) {
            const valor = String(cell.value || '').toLowerCase();
            if (valor === 'aprovado') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
              cell.font = { bold: true, size: 10, color: { argb: 'FF166534' }, name: 'Segoe UI Semibold' };
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            } else if (valor === 'pendente') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
              cell.font = { bold: true, size: 10, color: { argb: 'FF92400E' }, name: 'Segoe UI Semibold' };
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            } else {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
              cell.font = { bold: true, size: 10, color: { argb: 'FF991B1B' }, name: 'Segoe UI Semibold' };
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }
          }
        });
      });

      allSheet.addRow({});
      const totalAprovadosAll = allEncontreiros.filter((e) => resolveApprovalStatus(e) === 'aprovado').length;
      const totalPendentesAll = allEncontreiros.filter((e) => resolveApprovalStatus(e) === 'pendente').length;
      const summaryAll = allSheet.addRow({
        nome: `Total geral de encontreiros: ${allEncontreiros.length}`,
        email: `Aprovados: ${totalAprovadosAll} | Pendentes: ${totalPendentesAll}`,
        dataCadastro: `Gerado em: ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR')}`,
      });
      summaryAll.height = 28;
      summaryAll.eachCell((cell) => {
        cell.font = { bold: true, size: 10, color: { argb: 'FF0B2545' }, name: 'Segoe UI Semibold' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4FF' } };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.border = {
          top: { style: 'double', color: { argb: 'FF3A86FF' } },
          bottom: { style: 'thin', color: { argb: 'FF3A86FF' } },
          left: { style: 'hair', color: { argb: 'FFD1E0F0' } },
          right: { style: 'hair', color: { argb: 'FFD1E0F0' } },
        };
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="EJC_Relatorio_Equipes_' + new Date().toISOString().split('T')[0] + '.xlsx"');

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error('Erro ao exportar Excel:', err);
      res.status(500).send('Erro ao exportar planilha: ' + err.message);
    }
  });

  // Export encontristas com planilha moderna e profissional
  router.get('/export-encontrista-excel', async (req, res) => {
    try {
      const Excel = require('exceljs');
      const entries = await Cadastro.find().sort({ dataCadastro: 1 }).lean();

      const workbook = new Excel.Workbook();
      workbook.creator = 'EJC COP - Sistema de Gestão';
      workbook.company = 'EJC Comunidade de Oração Pai';
      workbook.created = new Date();
      workbook.modified = new Date();

      const worksheet = workbook.addWorksheet('Encontristas', {
        views: [{ state: 'frozen', ySplit: 1 }],
      });
      worksheet.properties.tabColor = { argb: 'FF06BA63' };

      worksheet.columns = [
        { header: 'Nome Completo', key: 'nome', width: 36 },
        { header: 'EJC', key: 'ejc', width: 12 },
        { header: 'Telefone', key: 'telefone', width: 18 },
        { header: 'Email', key: 'email', width: 32 },
        { header: 'CEP', key: 'cep', width: 14 },
        { header: 'Estado Civil', key: 'estadoCivil', width: 18 },
        { header: 'Nome Mae', key: 'nomeMae', width: 28 },
        { header: 'Telefone Mae', key: 'telefoneMae', width: 18 },
        { header: 'Nome Pai', key: 'nomePai', width: 28 },
        { header: 'Telefone Pai', key: 'telefonePai', width: 18 },
        { header: 'Paroquia', key: 'paroquiaFrequenta', width: 26 },
        { header: 'Movimento Igreja', key: 'participaMovimentoIgreja', width: 24 },
        { header: 'Conhecido Inscricao', key: 'conhecidoInscricaoHoje', width: 24 },
        { header: 'Conhecido Fez EJC', key: 'conhecidoFezEjc', width: 24 },
        { header: 'Inscricao Anterior', key: 'inscricaoAnterior', width: 24 },
        { header: 'Instrumento/Canto', key: 'instrumentoMusical', width: 24 },
        { header: 'Expectativa', key: 'expectativaXixEjcCop', width: 40 },
        { header: 'Intolerancias', key: 'intolerante', width: 24 },
        { header: 'É alérgico?', key: 'ehAlergico', width: 14 },
        { header: 'Alergia (descrição)', key: 'alergiaDescricao', width: 28 },
        { header: 'Logradouro', key: 'logradouro', width: 32 },
        { header: 'Bairro', key: 'bairro', width: 24 },
        { header: 'Data Nascimento', key: 'dataNascimento', width: 16 },
        { header: 'Instagram', key: 'instagram', width: 20 },
        { header: 'Aprovado', key: 'aprovado', width: 12 },
      ];

      // Cabeçalho com estilo moderno e profissional
      const headerRow = worksheet.getRow(1);
      headerRow.height = 34;
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0B2545' },
        };
        cell.font = {
          bold: true,
          color: { argb: 'FFFFFFFF' },
          size: 11,
          name: 'Segoe UI Semibold',
        };
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF3A86FF' } },
          bottom: { style: 'double', color: { argb: 'FF3A86FF' } },
          left: { style: 'thin', color: { argb: 'FF0B2545' } },
          right: { style: 'thin', color: { argb: 'FF0B2545' } },
        };
      });

      // Adicionar filtros automáticos
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: worksheet.columns.length },
      };

      // Adicionar dados com formatação moderna
      entries.forEach((entry, idx) => {
        const row = worksheet.addRow({
          nome: entry.nomeCompleto || '',
          ejc: entry.ejc || '',
          telefone: entry.telefone || '',
          email: entry.email || '',
          cep: entry.cep || '',
          estadoCivil: entry.estadoCivil || '',
          nomeMae: entry.nomeMae || '',
          telefoneMae: entry.telefoneMae || '',
          nomePai: entry.nomePai || '',
          telefonePai: entry.telefonePai || '',
          paroquiaFrequenta: entry.paroquiaFrequenta || '',
          participaMovimentoIgreja: entry.participaMovimentoIgreja || '',
          conhecidoInscricaoHoje: entry.conhecidoInscricaoHoje || '',
          conhecidoFezEjc: entry.conhecidoFezEjc || '',
          inscricaoAnterior: entry.inscricaoAnterior || '',
          instrumentoMusical: entry.instrumentoMusical || '',
          expectativaXixEjcCop: entry.expectativaXixEjcCop || '',
          intolerante: entry.intolerante || '',
          ehAlergico: normalizeTextInput(entry.ehAlergico).toLowerCase() === 'sim' ? 'Sim' : 'Nao',
          alergiaDescricao: entry.alergiaDescricao || '',
          logradouro: entry.logradouro || '',
          bairro: entry.bairro || '',
          dataNascimento: entry.dataNascimento
            ? new Date(entry.dataNascimento).toLocaleDateString('pt-BR')
            : '',
          instagram: entry.instagram || '',
          aprovado: entry.aprovado ? 'SIM' : 'NAO',
        });

        row.height = 24;
        const bgColor = idx % 2 === 0 ? 'FFF8FBFF' : 'FFFFFFFF';

        row.eachCell((cell, colNumber) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgColor },
          };
          cell.font = {
            size: 10,
            color: { argb: 'FF1A2332' },
            name: 'Segoe UI',
          };
          cell.alignment = {
            horizontal: 'left',
            vertical: 'middle',
            wrapText: true,
          };
          cell.border = {
            top: { style: 'hair', color: { argb: 'FFD1E0F0' } },
            bottom: { style: 'hair', color: { argb: 'FFD1E0F0' } },
            left: { style: 'hair', color: { argb: 'FFD1E0F0' } },
            right: { style: 'hair', color: { argb: 'FFD1E0F0' } },
          };

          // Formatação especial para coluna Aprovado
          if (colNumber === 9) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.font = {
              bold: true,
              size: 10,
              color: { argb: entry.aprovado ? 'FF06BA63' : 'FFFF6B35' },
              name: 'Segoe UI',
            };
          }
        });
      });

      // Linha de resumo
      worksheet.addRow({});
      const summaryRow = worksheet.addRow({
        nome: `Total de Encontristas: ${entries.length}`,
        ejc: '',
        telefone: '',
        email: `Gerado em: ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} às ${new Date().toLocaleTimeString('pt-BR')}`,
        logradouro: '',
        bairro: '',
        dataNascimento: '',
        instagram: '',
        aprovado: '',
      });
      summaryRow.height = 28;
      summaryRow.eachCell((cell) => {
        cell.font = {
          bold: true,
          size: 10,
          color: { argb: 'FF0B2545' },
          name: 'Segoe UI Semibold',
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8F4FF' },
        };
        cell.alignment = {
          horizontal: 'left',
          vertical: 'middle',
        };
        cell.border = {
          top: { style: 'double', color: { argb: 'FF3A86FF' } },
          bottom: { style: 'thin', color: { argb: 'FF3A86FF' } },
          left: { style: 'hair', color: { argb: 'FFD1E0F0' } },
          right: { style: 'hair', color: { argb: 'FFD1E0F0' } },
        };
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="EJC_Encontristas_' + new Date().toISOString().split('T')[0] + '.xlsx"');

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error('Erro ao exportar planilha de encontristas:', err);
      res.status(500).send('Erro ao exportar planilha: ' + err.message);
    }
  });

  return router;
};
