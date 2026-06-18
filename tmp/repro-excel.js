const Excel = require('exceljs');
const fs = require('fs');
const path = require('path');

(async () => {
  const registros = [{
    _id: '507f1f77bcf86cd799439046',
    nomeCompleto: 'Pessoa Apta',
    idadeCalculada: 28,
    dataNascimento: new Date('1998-05-10'),
    telefone: '(85) 98888-0000',
    email: 'pessoa.apta@example.com',
    genero: 'feminino',
    estadoCivil: 'Solteiro',
    enderecoRua: 'Rua B',
    enderecoNumero: '10',
    enderecoBairro: 'Centro',
    enderecoCidade: 'Fortaleza',
    domMusicalPossui: true,
    domMusicalDescricao: 'Canto',
    participaParoquia: true,
    pastorais: ['EJC'],
    pastoralOutroDescricao: '',
    ejcCopHistorico: 'XVIII EJC COP',
    serveEjcAnoAtual: true,
    equipeAtual: ['Secretaria'],
    serveOutroEjcAnoAtual: false,
    outrosEjcsDescricao: '',
    interesseOutroEjc2026: false,
    indisponibilidadeOutroEjc2026: '',
    recadoDiris: '',
    perfilStatus: 'Perfil Apto',
    perfilRazoes: [],
    dataCadastro: new Date('2026-05-30T12:00:00Z').toLocaleString('pt-BR')
  }];

  const indicadores = {
    totalInscricoes: 1,
    totalPerfilApto: 1,
    totalEmAnalise: 0,
    totalForaPerfil: 0,
    homens: 0,
    mulheres: 1,
    casados: 0,
    solteiros: 1,
    faixaEtaria: { '26-35': 1 },
    porEquipe: { Secretaria: 1 },
    porPastoral: { EJC: 1 },
  };

  const aptos = registros;
  const emAnalise = [];
  const foraPerfil = [];
  const workbook = new Excel.Workbook();
  const generatedAt = new Date();
  workbook.creator = 'EJC COP - Sistema de Gestao';
  workbook.company = 'EJC Comunidade de Oracao Pai';
  workbook.created = generatedAt;
  workbook.modified = generatedAt;
  workbook.lastPrinted = generatedAt;

  const resolveImageExtension = (filePath) => {
    const ext = path.extname(filePath || '').toLowerCase().replace('.', '');
    if (ext === 'jpg') return 'jpeg';
    if (ext === 'jpeg' || ext === 'png') return ext;
    return '';
  };

  const logoCandidates = [
    path.join(__dirname, 'public', 'images', 'tema.png'),
    path.join(__dirname, 'public', 'images', 'logo.png'),
    path.join(__dirname, 'uploads', 'import-placeholder.jpg'),
  ];
  const logoPath = logoCandidates.find((candidate) => fs.existsSync(candidate));
  const logoExtension = resolveImageExtension(logoPath || '');
  const logoImageId = (logoPath && logoExtension)
    ? workbook.addImage({ filename: logoPath, extension: logoExtension })
    : null;

  const palette = {
    primary: 'FF0B2545', primarySoft: 'FFE8F0FB', header: 'FF12355B', border: 'FFD6DFEA', zebra: 'FFF8FBFF', accent: 'FF2A6FDB', white: 'FFFFFFFF', text: 'FF14263C', muted: 'FF5C6B7A', kpiBlue: 'FFDCEAFF', kpiGreen: 'FFDBF5E7', kpiAmber: 'FFFFF1D6', kpiRed: 'FFFFE1E1',
  };
  const centerAlignment = { vertical: 'middle', horizontal: 'center' };
  const thinBorder = { top: { style: 'thin', color: { argb: palette.border } }, left: { style: 'thin', color: { argb: palette.border } }, bottom: { style: 'thin', color: { argb: palette.border } }, right: { style: 'thin', color: { argb: palette.border } } };
  const ensureWorksheet = (name, columns, options = {}) => { const sheet = workbook.addWorksheet(name, options); sheet.columns = columns; sheet.views = options.views || []; if (options.tabColor) sheet.properties.tabColor = { argb: options.tabColor }; return sheet; };
  const applyGridBorders = (sheet, fromRow, toRow, fromCol, toCol) => { for (let r = fromRow; r <= toRow; r += 1) { for (let c = fromCol; c <= toCol; c += 1) { sheet.getCell(r, c).border = thinBorder; } } };
  const styleHeaderRow = (sheet, headerRowNumber, totalCols) => { const row = sheet.getRow(headerRowNumber); row.height = 21; row.font = { bold: true, color: { argb: palette.white }, size: 10, name: 'Calibri' }; row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; for (let c = 1; c <= totalCols; c += 1) { const cell = row.getCell(c); cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.header } }; cell.border = thinBorder; } };
  const styleDataRows = (sheet, fromRow, totalCols) => { for (let r = fromRow; r <= sheet.rowCount; r += 1) { const row = sheet.getRow(r); row.height = 18; for (let c = 1; c <= totalCols; c += 1) { const cell = row.getCell(c); cell.border = thinBorder; cell.font = { size: 10, color: { argb: palette.text }, name: 'Calibri' }; cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: c >= 8 }; if (r % 2 === 0) { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.zebra } }; } } } };
  const addCorporateLogo = (sheet, fromCol, fromRow, toCol, toRow) => { if (!logoImageId) return; sheet.addImage(logoImageId, { tl: { col: fromCol, row: fromRow }, br: { col: toCol, row: toRow }, editAs: 'oneCell' }); };
  const total = indicadores.totalInscricoes || 1;
  const pct = (value) => `${Math.round(((Number(value) || 0) / total) * 100)}%`;

  const directoriaColumns = [{key:'c1',width:28},{key:'c2',width:18},{key:'c3',width:18},{key:'c4',width:30},{key:'c5',width:22},{key:'c6',width:22}];
  const diretoriaSheet = ensureWorksheet('Diretoria', directoriaColumns, { views: [{ state: 'frozen', ySplit: 8 }], tabColor: 'FF1B3A66' });
  diretoriaSheet.mergeCells('A1:F1'); diretoriaSheet.getCell('A1').value='PAINEL DIRETORIA - LIBERACOES EXTERNAS'; addCorporateLogo(diretoriaSheet, 5.15, 0.15, 5.95, 1.85);

  const resumoColumns = [{key:'indicador',width:38},{key:'valor',width:16},{key:'percentual',width:14},{key:'obs',width:28}];
  const resumoSheet = ensureWorksheet('Resumo Executivo', resumoColumns, { views: [{ state:'frozen', ySplit: 8 }], tabColor: palette.primary });
  resumoSheet.mergeCells('A1:D1'); resumoSheet.getCell('A1').value='RELATORIO'; addCorporateLogo(resumoSheet, 3.15, 0.1, 3.95, 1.9);
  resumoSheet.mergeCells('A4:B4'); resumoSheet.mergeCells('C4:D4'); resumoSheet.mergeCells('A5:B5'); resumoSheet.mergeCells('C5:D5'); applyGridBorders(resumoSheet,4,5,1,4); resumoSheet.getRow(8).values=['Indicador','Valor','Percentual','Obs']; styleHeaderRow(resumoSheet,8,4); resumoSheet.addRow({indicador:'Total',valor:1,percentual:'100%',obs:'Base'});

  const addDataSheet = (name, rows, tabColor = palette.accent) => {
    const sheetColumns = [{ key:'nomeCompleto', width:34 },{ key:'idade', width:8 },{ key:'dataNascimento', width:16 },{ key:'telefone', width:20 },{ key:'email', width:28 },{ key:'genero', width:14 },{ key:'estadoCivil', width:16 },{ key:'endereco', width:42 },{ key:'domMusical', width:12 },{ key:'domMusicalDescricao', width:28 },{ key:'pastorais', width:36 },{ key:'pastoralOutroDescricao', width:24 },{ key:'ejcCopHistorico', width:18 },{ key:'serveEjcAnoAtual', width:14 },{ key:'equipeAtual', width:32 },{ key:'serveOutroEjcAnoAtual', width:16 },{ key:'outrosEjcsDescricao', width:28 },{ key:'interesseOutroEjc2026', width:24 },{ key:'indisponibilidadeOutroEjc2026', width:30 },{ key:'recadoDiris', width:32 },{ key:'perfilStatus', width:16 },{ key:'perfilRazoes', width:28 },{ key:'dataCadastro', width:22 }];
    const headers = ['Nome Completo','Idade','Data Nascimento','Telefone','E-mail','Genero','Estado Civil','Endereco','Dom Musical','Descricao Dom','Pastorais','Pastoral Outro','Historico EJC COP','Serve este ano','Equipe Atual','Serve outro EJC','Outros EJC','Interesse outro EJC 2026','Datas indisponiveis 2026','Recado DIRIS','Perfil','Razoes Perfil','Data Cadastro'];
    const sheet = ensureWorksheet(name, sheetColumns, { views: [{ state:'frozen', ySplit:4 }], tabColor });
    const totalCols=headers.length;
    sheet.mergeCells(1,1,1,totalCols);
    sheet.getCell(1,1).value='TITLE';
    sheet.mergeCells(2,1,2,totalCols);
    sheet.getCell(2,1).value='subtitle';
    sheet.getRow(4).values=headers;
    styleHeaderRow(sheet,4,totalCols);
    rows.forEach((row)=>sheet.addRow(row));
    styleDataRows(sheet,5,totalCols);
    rows.forEach((row, idx) => {
      const rowNumber = 5 + idx;
      const status = String(row.perfilStatus || '').toLowerCase();
      const isForaPerfil = status.includes('fora');
      const isEmAnalise = status.includes('analise');
      const isCritico = isForaPerfil || Number(row.idade) >= 36;
      if (isCritico || isEmAnalise) {
        const tone = isForaPerfil ? 'FFFFEBEB' : 'FFFFF6E1';
        for (let col = 1; col <= totalCols; col += 1) {
          const cell = sheet.getCell(rowNumber, col);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tone } };
          if (col === 1 || col === 21) {
            cell.font = { ...cell.font, bold: true };
          }
        }
      }
      if (Number(row.idade) >= 36) {
        const ageCell = sheet.getCell(rowNumber, 2);
        ageCell.font = { bold: true, color: { argb: 'FF9B1C1C' }, name: 'Calibri', size: 10 };
        ageCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFDDE1' } };
      }
    });
    sheet.autoFilter = { from: { row:4, column:1 }, to: { row:4, column: totalCols } };
    addCorporateLogo(sheet, totalCols - 0.8, 0.1, totalCols - 0.05, 1.85);
    sheet.getColumn('idade').alignment = centerAlignment;
  };

  addDataSheet('Perfil Apto', aptos);
  addDataSheet('Em Analise', emAnalise);
  addDataSheet('Fora do Perfil', foraPerfil);

  const biColumns=[{key:'dimensao',width:24},{key:'categoria',width:34},{key:'quantidade',width:16},{key:'participacao',width:16}];
  const biSheet=ensureWorksheet('Dashboard BI', biColumns, { views: [{ state:'frozen', ySplit:4 }], tabColor:'FF1E4E8C' });
  biSheet.mergeCells('A1:D1'); biSheet.getCell('A1').value='BI'; addCorporateLogo(biSheet, 3.15, 0.05, 3.95, 1.85); biSheet.getRow(4).values=['Dimensao','Categoria','Quantidade','Participacao']; styleHeaderRow(biSheet,4,4); biSheet.addRow({dimensao:'Faixa',categoria:'26-35',quantidade:1,participacao:'100%'}); styleDataRows(biSheet,5,4);

  await workbook.xlsx.writeFile('tmp/repro-export.xlsx');
  console.log('EXPORT_OK');
})().catch((err) => {
  console.error('ERR_NAME', err && err.name);
  console.error('ERR_MSG', err && err.message);
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
