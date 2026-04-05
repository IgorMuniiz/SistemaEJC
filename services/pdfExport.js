const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

const { normalizeTextInput } = require('../utils/normalization');
const { formatDateBR, truncateText, buildPdfDisplayName } = require('../utils/formatters');

const ROOT_DIR = path.join(__dirname, '..');

const fitPdfTextToWidth = (doc, value, width, options = {}) => {
  const raw = normalizeTextInput(value) || '-';
  const fontName = normalizeTextInput(options.fontName) || 'Helvetica';
  const fontSize = Number(options.fontSize) > 0 ? Number(options.fontSize) : 8.5;
  const suffix = normalizeTextInput(options.suffix) || '...';

  doc.font(fontName).fontSize(fontSize);
  if (doc.widthOfString(raw) <= width) return raw;

  let compact = raw.replace(/\s{2,}/g, ' ');
  while (compact.length > 1) {
    compact = compact.slice(0, -1).trimEnd();
    const candidate = `${compact}${suffix}`;
    if (doc.widthOfString(candidate) <= width) return candidate;
  }

  return suffix;
};

const resolvePhotoPath = (fileName) => {
  if (!fileName) return null;
  const filePath = path.join(ROOT_DIR, 'uploads', fileName);
  return fs.existsSync(filePath) ? filePath : null;
};

const drawPdfTitle = (doc, title, subtitle) => {
  const headerY = 30;
  const headerHeight = 44;
  doc.save();
  doc.roundedRect(40, headerY, 515, headerHeight, 6).fill('#1f2f46');
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(16).text(title, 56, headerY + 8, {
    width: 483,
    align: 'center',
    lineBreak: false,
    ellipsis: true,
  });
  doc.restore();

  doc.font('Helvetica').fontSize(9).fillColor('#5f6b7a').text(subtitle, 40, headerY + headerHeight + 6, {
    width: 515,
    align: 'center',
    lineBreak: false,
  });
  doc.strokeColor('#c6d0dc').lineWidth(0.8).moveTo(40, headerY + headerHeight + 22).lineTo(555, headerY + headerHeight + 22).stroke();
};

const drawHeartBetweenCards = (doc, centerX, centerY, size = 13, color = '#d94b71') => {
  const safeSize = Math.max(8, Number(size) || 13);
  const scale = safeSize / 16;
  doc.save();
  doc.translate(centerX - (safeSize / 2), centerY - (safeSize / 2));
  doc.scale(scale);
  doc.path('M8 14 C8 14 0 9.2 0 4.8 C0 2.1 2.1 0 4.8 0 C6.4 0 7.7 0.8 8 2 C8.3 0.8 9.6 0 11.2 0 C13.9 0 16 2.1 16 4.8 C16 9.2 8 14 8 14 Z').fill(color);
  doc.restore();
};

const drawCardLine = (doc, x, y, width, label, value, extraSpace = 0, fontSize = 8.5, options = {}) => {
  const rowHeight = Number(options.rowHeight) > 0 ? Number(options.rowHeight) : 16;
  const textMax = Number(options.textMax) > 0 ? Number(options.textMax) : 46;
  const showLabels = options.showLabels !== false;
  const fontName = normalizeTextInput(options.fontName) || 'Helvetica';
  const lineColor = normalizeTextInput(options.lineColor) || '#8e8e8e';
  const alignColumns = options.alignColumns === true;
  const labelWidth = Number(options.labelWidth) > 0 ? Number(options.labelWidth) : 34;
  const lineInset = Number(options.lineInset) >= 0 ? Number(options.lineInset) : 2;
  const showDivider = options.showDivider !== false;
  const centerText = options.centerText !== false;
  const lineGap = Number(options.lineGap) >= 0 ? Number(options.lineGap) : 1.8;
  const truncateValue = options.truncateValue !== false;
  const autoFitValue = options.autoFitValue === true;
  const minFontSize = Number(options.minFontSize) > 0 ? Number(options.minFontSize) : 6;
  const textYOffset = centerText
    ? Math.max(0.5, (rowHeight - fontSize) / 2)
    : 0.7;
  const textY = y + textYOffset;

  if (showLabels && alignColumns) {
    const safeLabel = truncateText(label, 12);
    const rawValue = normalizeTextInput(value) || '-';
    const valueWidth = Math.max(10, width - labelWidth - 3);

    let adjustedFontSize = fontSize;
    if (autoFitValue) {
      doc.font(fontName);
      for (let size = fontSize; size >= minFontSize; size -= 0.2) {
        doc.fontSize(size);
        if (doc.widthOfString(rawValue) <= valueWidth) {
          adjustedFontSize = size;
          break;
        }
        adjustedFontSize = size;
      }
    }

    doc.font(fontName).fontSize(adjustedFontSize);
    const safeValue = autoFitValue
      ? fitPdfTextToWidth(doc, rawValue, valueWidth, { fontName, fontSize: adjustedFontSize })
      : (truncateValue ? truncateText(rawValue, textMax) : rawValue);

    doc.font('Helvetica').fontSize(Math.max(7.6, fontSize - 0.1)).fillColor('#243446').text(`${safeLabel}:`, x, textY, {
      width: labelWidth,
      lineBreak: false,
      ellipsis: true,
    });

    doc.font(fontName).fontSize(adjustedFontSize).fillColor('#1f1f1f').text(safeValue, x + labelWidth + 3, textY, {
      width: valueWidth,
      lineBreak: false,
      ellipsis: true,
    });
  } else {
    const rawValue = normalizeTextInput(value) || '-';
    const renderedValue = truncateValue ? truncateText(rawValue, textMax) : rawValue;
    const normalizedLine = showLabels
      ? `${label}: ${renderedValue}`
      : `${renderedValue}`;
    doc.font(fontName).fontSize(fontSize).fillColor('#1f1f1f').text(normalizedLine, x, textY, {
      width,
      lineBreak: false,
      ellipsis: true,
    });
  }

  if (showDivider) {
    // Place divider close to the row bottom so it never intersects text glyphs.
    const safeBottomOffset = Math.max(0.45, Math.min(0.8, lineGap));
    const dividerY = y + rowHeight + extraSpace - safeBottomOffset;
    doc.strokeColor(lineColor).lineWidth(0.3).moveTo(x + lineInset, dividerY).lineTo(x + width - lineInset, dividerY).stroke();
  }
};

const drawRegistrationCard = (doc, entry, x, y, width, height, mode, options = {}) => {
  // Card com acabamento mais limpo e profissional.
  doc.save();
  doc.roundedRect(x, y, width, height, 4).fillAndStroke('#ffffff', '#5f6b7a');
  if (options.topDivider !== false) {
    doc.lineWidth(0.6).strokeColor('#d2dae3').moveTo(x + 7, y + 22).lineTo(x + width - 7, y + 22).stroke();
  }
  doc.restore();

  const badgeLabel = normalizeTextInput(options.badgeLabel || '').toUpperCase();
  const fontBoost = Number(options.fontBoost) || 0;
  const nameFontBoost = Number(options.nameFontBoost) || 0;
  const photoSize = Number(options.photoSize) > 0 ? Number(options.photoSize) : 105;
  const photoWidth = Number(options.photoWidth) > 0 ? Number(options.photoWidth) : photoSize;
  const photoHeight = Number(options.photoHeight) > 0 ? Number(options.photoHeight) : photoSize;
  const photoInset = Number(options.photoInset) >= 0 ? Number(options.photoInset) : 7;
  const textGap = Number(options.textGap) >= 0 ? Number(options.textGap) : 8;
  const rowHeight = Number(options.rowHeight) > 0 ? Number(options.rowHeight) : 16;
  const topPadding = Number(options.topPadding) >= 0 ? Number(options.topPadding) : 8;
  const textMax = Number(options.textMax) > 0 ? Number(options.textMax) : 46;
  const photoValign = options.photoValign === 'top' ? 'top' : 'center';
  const photoAlign = options.photoAlign === 'left' ? 'left' : (options.photoAlign === 'right' ? 'right' : 'center');
  const showLabels = options.showLabels !== false;
  const hideEmail = Boolean(options.hideEmail);
  const hideEjc = Boolean(options.hideEjc);
  const alignColumns = options.alignColumns === true;
  const labelWidth = Number(options.labelWidth) > 0 ? Number(options.labelWidth) : 34;
  const noDividerLabels = Array.isArray(options.noDividerLabels)
    ? options.noDividerLabels.map((item) => normalizeTextInput(item).toLowerCase())
    : [];
  const requestedFields = Array.isArray(options.fields)
    ? options.fields.map((field) => normalizeTextInput(field).toLowerCase()).filter(Boolean)
    : [];
  if (badgeLabel) {
    doc.save();
    doc.roundedRect(x + 6, y + 5, width - 12, 14, 3).fill('#1f2f46');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8).text(badgeLabel, x + 8, y + 9, {
      width: width - 16,
      align: 'center',
      lineBreak: false,
    });
    doc.restore();
  }

  const photoX = x + photoInset;
  const photoY = y + (badgeLabel ? 24 : topPadding);

  doc.lineWidth(0.6).strokeColor('#8793a3').rect(photoX, photoY, photoWidth, photoHeight).stroke();

  const photoPath = resolvePhotoPath(entry.foto);
  if (photoPath) {
    try {
      // Cover preenche todo o quadrado, alinhamento superior garante que o rosto apareça
      doc.save();
      doc.rect(photoX + 1, photoY + 1, photoWidth - 2, photoHeight - 2).clip();
      doc.image(photoPath, photoX + 1, photoY + 1, {
        cover: [photoWidth - 2, photoHeight - 2],
        align: photoAlign,
        valign: photoValign,
      });
      doc.restore();
    } catch (err) {
      // Ignore image rendering failures and keep card printable.
    }
  }

  const textX = photoX + photoWidth + textGap;
  const textWidth = width - (textX - x) - photoInset;
  const headerOffset = badgeLabel ? 24 : topPadding;

  const displayName = buildPdfDisplayName(entry.nomeCompleto, entry.comoQuerSerChamado, 28);

  const defaultLines = [
    ['Nome', displayName, 0, 8.5 + fontBoost + nameFontBoost],
    ['Logradouro', entry.logradouro, 4, 8.5 + fontBoost],
    ['Bairro', entry.bairro, 0, 8.5 + fontBoost],
    ['Email', entry.email, 0, 7.5 + fontBoost],
    ['Telefone', entry.telefone, 0, 8.5 + fontBoost],
    ['Niver', formatDateBR(entry.dataNascimento), 0, 8.5 + fontBoost],
    ['EJC', entry.ejc, 0, 8.5 + fontBoost],
  ];

  const availableFieldLines = {
    nome: ['Nome', displayName, 0, 8.5 + fontBoost + nameFontBoost],
    instagram: ['Instagram', entry.instagram || '-', 0, 8.5 + fontBoost],
    telefone: ['Telefone', entry.telefone, 0, 8.5 + fontBoost],
    aniversario: ['Niver', formatDateBR(entry.dataNascimento), 0, 8.5 + fontBoost],
    niver: ['Niver', formatDateBR(entry.dataNascimento), 0, 8.5 + fontBoost],
    ejc: ['EJC', entry.ejc, 0, 8.5 + fontBoost],
    email: ['Email', entry.email, 0, 7.5 + fontBoost],
    bairro: ['Bairro', entry.bairro, 0, 8.5 + fontBoost],
    logradouro: ['Logradouro', entry.logradouro, 4, 8.5 + fontBoost],
  };

  let lines = requestedFields.length
    ? requestedFields
      .map((field) => availableFieldLines[field])
      .filter(Boolean)
    : defaultLines;

  if (mode === 'encontro') {
    if (!requestedFields.length && lines[5]) {
      lines[5] = ['Tipo', entry.tipo === 'tios' ? 'Tios' : 'Jovens', 0, 8.5 + fontBoost];
    }
  }

  if (hideEmail) {
    lines = lines.filter(([label]) => label !== 'Email');
  }

  if (hideEjc) {
    lines = lines.filter(([label]) => label !== 'EJC');
  }

  const contentAreaTop = y + headerOffset;
  const contentAreaHeight = Math.max(photoHeight, height - headerOffset - topPadding);
  const linesHeight = lines.reduce((sum, line) => sum + rowHeight + (line[2] || 0), 0);
  let rowY = contentAreaTop + Math.max(0, (contentAreaHeight - linesHeight) / 2);

  lines.forEach(([label, value, extraSpace, fontSize], idx) => {
    const disableDividerForLine = noDividerLabels.includes(normalizeTextInput(label).toLowerCase());
    const isNameLine = normalizeTextInput(label).toLowerCase() === 'nome';
    drawCardLine(doc, textX, rowY, textWidth, label, value, extraSpace, fontSize, {
      rowHeight,
      textMax,
      showLabels,
      alignColumns,
      labelWidth: isNameLine ? Math.max(30, labelWidth - 8) : labelWidth,
      lineInset: 1,
      centerText: true,
      lineGap: 0.6,
      autoFitValue: isNameLine,
      minFontSize: 5.4,
      truncateValue: !isNameLine,
      showDivider: disableDividerForLine ? false : options.showDivider,
      fontName: idx === 0 ? 'Helvetica-Bold' : 'Helvetica',
      lineColor: '#bdc7d3',
    });
    rowY += rowHeight + extraSpace;
  });
};

const buildPdfEntryFromVinculo = (vinculo, pessoa, ejcNome) => ({
  nomeCompleto: pessoa?.nomeCompleto || 'Nao informado',
  comoQuerSerChamado: pessoa?.comoQuerSerChamado || '',
  ejc: pessoa?.ejc || ejcNome,
  logradouro: pessoa?.logradouro || 'Nao informado',
  bairro: pessoa?.bairro || 'Nao informado',
  dataNascimento: pessoa?.dataNascimento || null,
  telefone: pessoa?.telefone || 'Nao informado',
  email: pessoa?.email || 'Nao informado',
  instagram: pessoa?.instagram || '',
  foto: pessoa?.foto || '',
  tipo: pessoa?.tipo || 'jovens',
  tiosCategoria: pessoa?.tiosCategoria || '',
  tiosGrupoId: pessoa?.tiosGrupoId || '',
  pessoaTipo: vinculo?.pessoaTipo || 'encontrista',
  papel: normalizeTextInput(vinculo?.papel).toLowerCase(),
  descricaoPapel: normalizeTextInput(vinculo?.descricaoPapel),
});

const renderEstruturasPdf = (res, { fileName, mainTitle, groups }) => {
  const PDFDocument = require('pdfkit');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  const left = 40;
  const gap = 12;
  const cardWidth = (515 - gap) / 2;
  const cardHeight = 126;
  const rightX = left + cardWidth + gap;
  const topStart = 40;
  const bottomLimit = 790;
  const equipeHeaderLogoPath = path.join(ROOT_DIR, 'public', 'images', 'rodape.png');
  const hasEquipeHeaderLogo = fs.existsSync(equipeHeaderLogoPath);

  const drawPageTitle = () => {};
  const mmToPt = (mm) => (mm * 72) / 25.4;

  const getEquipeTipoOrder = (entry) => {
    const tipo = normalizeTextInput(entry && entry.tipo).toLowerCase();
    if (tipo !== 'tios') return 0; // jovens/encontreiro primeiro
    const categoria = normalizeTextInput(entry && entry.tiosCategoria).toLowerCase();
    if (categoria === 'casal') return 1;
    return 2; // tios solo depois
  };

  const sortEquipeEntriesByTipo = (items) => {
    const ordered = (items || [])
      .map((entry, idx) => ({ entry, idx }))
      .sort((a, b) => {
        const orderDiff = getEquipeTipoOrder(a.entry) - getEquipeTipoOrder(b.entry);
        if (orderDiff !== 0) return orderDiff;
        return a.idx - b.idx;
      });

    const grouped = [];
    const usedGroups = new Set();

    ordered.forEach(({ entry }) => {
      const grupoId = normalizeTextInput(entry && entry.tiosGrupoId);
      const isCasal = Boolean(entry && entry.tipo === 'tios' && entry.tiosCategoria === 'casal' && grupoId);

      if (!isCasal) {
        grouped.push(entry);
        return;
      }

      if (usedGroups.has(grupoId)) {
        return;
      }

      usedGroups.add(grupoId);
      const casalEntries = ordered
        .filter((item) => normalizeTextInput(item.entry && item.entry.tiosGrupoId) === grupoId)
        .map((item) => item.entry);

      grouped.push(...casalEntries);
    });

    return grouped;
  };

  const drawGrid = (entries, startY, config = {}) => {
    const roleResolver = typeof config.roleResolver === 'function' ? config.roleResolver : null;
    const cardTopLabel = typeof config.cardTopLabel === 'function' ? config.cardTopLabel : null;
    const gridCardHeight = Number(config.cardHeight) > 0 ? Number(config.cardHeight) : cardHeight;
    const gridCardWidth = Number(config.cardWidth) > 0 ? Number(config.cardWidth) : cardWidth;
    const gridGap = Number(config.gap) >= 0 ? Number(config.gap) : gap;
    const rowGap = Number(config.rowGap) >= 0 ? Number(config.rowGap) : 10;
    const gridLeft = Number(config.left) >= 0 ? Number(config.left) : left;
    const gridRightX = gridLeft + gridCardWidth + gridGap;
    const customDrawOptions = config.drawOptions && typeof config.drawOptions === 'object' ? config.drawOptions : {};
    const drawOptions = {
      hideEmail: true,
      hideEjc: true,
      ...customDrawOptions,
    };
    const isTiosCasal = (entry) => {
      const grupoId = normalizeTextInput(entry && entry.tiosGrupoId);
      return Boolean(entry && entry.tipo === 'tios' && entry.tiosCategoria === 'casal' && grupoId);
    };
    const isCasalPair = (leftEntry, rightEntry) => {
      if (!isTiosCasal(leftEntry) || !isTiosCasal(rightEntry)) return false;
      return normalizeTextInput(leftEntry.tiosGrupoId) === normalizeTextInput(rightEntry.tiosGrupoId);
    };
    const topLabelHeight = cardTopLabel ? 12 : 0;
    const rowHeight = gridCardHeight + topLabelHeight;
    let y = startY;
    let col = 0;
    let pendingLeftEntry = null;

    entries.forEach((entry) => {
      // Garante que tio casal comece sempre em col=0 para ficar lado a lado com o parceiro.
      // Se o primeiro do par chegaria em col=1 (numero impar de entradas anteriores),
      // e o entry atual NAO e o parceiro esperado do pendingLeftEntry, força nova linha.
      if (col === 1 && isTiosCasal(entry) && !(pendingLeftEntry && isCasalPair(pendingLeftEntry, entry))) {
        y += rowHeight + rowGap;
        col = 0;
        pendingLeftEntry = null;
      }

      if (y + rowHeight > bottomLimit) {
        doc.addPage();
        drawPageTitle();
        y = topStart;
        col = 0;
      }

      const x = col === 0 ? gridLeft : gridRightX;

      if (cardTopLabel) {
        const label = normalizeTextInput(cardTopLabel(entry)).toUpperCase();
        if (label) {
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#1f2f46').text(label, x, y + 1, {
            width: gridCardWidth,
            align: 'center',
            lineBreak: false,
            ellipsis: true,
          });
        }
      }

      drawRegistrationCard(
        doc,
        entry,
        x,
        y + topLabelHeight,
        gridCardWidth,
        gridCardHeight,
        entry.pessoaTipo === 'encontreiro' ? 'encontro' : 'cadastro',
        {
          ...drawOptions,
          badgeLabel: roleResolver ? roleResolver(entry) : '',
        }
      );

      if (col === 0) {
        pendingLeftEntry = entry;
        col = 1;
      } else {
        if (isCasalPair(pendingLeftEntry, entry)) {
          const heartX = gridLeft + gridCardWidth + (gridGap / 2);
          const heartY = y + topLabelHeight + (gridCardHeight / 2);
          drawHeartBetweenCards(doc, heartX, heartY, 19, '#d94868');
        }
        pendingLeftEntry = null;
        col = 0;
        y += rowHeight + rowGap;
      }
    });

    if (col === 1) {
      y += rowHeight + rowGap;
    }

    return y;
  };

  const drawCircleHeader = (groupName, y, options = {}) => {
    const headerLeft = Number(options.left) >= 0 ? Number(options.left) : left;
    const headerWidth = Number(options.width) > 0 ? Number(options.width) : cardWidth;
    const headerHeight = Number(options.height) > 0 ? Number(options.height) : 58;
    const rawName = String(groupName || '').replace(/^circulo\b/i, 'Círculo').trim();
    const parts = rawName.match(/^(.*?)\s[-|]\s(.*)$/);
    const displayName = parts ? parts[1].trim() : rawName;
    const subtitle = parts ? parts[2].trim() : '';
    const titleFontSize = headerHeight >= 90 ? 22 : 16;
    const subtitleFontSize = 11;
    const titleApproxHeight = titleFontSize * 1.15;
    const subtitleApproxHeight = subtitleFontSize * 1.1;
    const subtitleGap = subtitle ? 5 : 0;
    const totalTextHeight = titleApproxHeight + (subtitle ? (subtitleGap + subtitleApproxHeight) : 0);
    const contentTop = y + ((headerHeight - totalTextHeight) / 2);
    const titleY = contentTop;
    const subtitleY = titleY + titleApproxHeight + subtitleGap;
    const lineY = Math.min(y + headerHeight - 6, (subtitle ? (subtitleY + subtitleApproxHeight) : (titleY + titleApproxHeight)) + 4);
    doc.save();
    doc.rect(headerLeft, y, headerWidth, headerHeight).fill('#202020');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(titleFontSize).text(displayName, headerLeft + 12, titleY, {
      width: headerWidth - 24,
      align: 'center',
      lineBreak: false,
      ellipsis: true,
    });

    if (subtitle) {
      doc.fillColor('#f2f2f2').font('Helvetica').fontSize(subtitleFontSize).text(subtitle, headerLeft + 14, subtitleY, {
        width: headerWidth - 28,
        align: 'center',
        lineBreak: false,
        ellipsis: true,
      });
    }

    // Mantem a linha logo abaixo do texto centralizado no bloco.
    doc.strokeColor('#e9eef5').lineWidth(0.9)
      .moveTo(headerLeft + 22, lineY)
      .lineTo(headerLeft + headerWidth - 22, lineY)
      .stroke();
    doc.restore();
    return headerHeight;
  };

  const drawEquipeHeader = (groupName, y) => {
    const titleFontSize = 18;
    const logoSize = 28;
    const logoGap = 8;
    const availableWidth = 515;
    const reservedLogoWidth = hasEquipeHeaderLogo ? (logoSize + logoGap) : 0;
    const textWidth = Math.max(120, availableWidth - reservedLogoWidth);
    const titleText = String(groupName || '').trim() || 'Equipe';

    doc.font('Helvetica-Bold').fontSize(titleFontSize);
    const measuredTextWidth = Math.min(doc.widthOfString(titleText), textWidth);
    const totalBlockWidth = measuredTextWidth + reservedLogoWidth;
    const startX = left + Math.max(0, availableWidth - totalBlockWidth);
    const logoY = y - ((logoSize - titleFontSize) / 2);
    const textX = startX + reservedLogoWidth;

    if (hasEquipeHeaderLogo) {
      doc.image(equipeHeaderLogoPath, startX, logoY, {
        fit: [logoSize, logoSize],
        align: 'left',
        valign: 'center',
      });
    }

    doc.fillColor('#1f2f46').text(titleText, textX, y, {
      width: textWidth,
      align: 'left',
      lineBreak: false,
      ellipsis: true,
    });

    return 34;
  };

  drawPageTitle();
  let totalRegistros = 0;

  groups.forEach((group, index) => {
    if (index > 0) {
      doc.addPage();
      drawPageTitle();
    }

    const entradas = Array.isArray(group.entries) ? group.entries : [];
    totalRegistros += entradas.length;

    if (group.tipo === 'circulo') {
      // Layout fixo em milimetros conforme especificacao do usuario.
      const pageMargin = mmToPt(15);
      const titleWidth = mmToPt(82);
      const titleHeight = mmToPt(38);
      const monitorCardWidth = mmToPt(80);
      const monitorCardHeight = mmToPt(32);
      const personCardWidth = mmToPt(85);
      const personCardHeight = mmToPt(34);
      const photoWidth = mmToPt(24);
      const photoHeight = mmToPt(28);
      const colGap = mmToPt(10);
      const rowGap = mmToPt(8);

      const circleLeft = pageMargin - mmToPt(2);
      const circleGap = colGap;
      const circleCardWidth = personCardWidth;
      const circleRightX = circleLeft + circleCardWidth + circleGap;
      const moitaCardWidth = monitorCardWidth;
      const moitaX = circleRightX - mmToPt(2);
      const topBlockHeight = titleHeight;
      const memberCardHeight = personCardHeight;
      const headerY = pageMargin;
      const topCardY = headerY + ((titleHeight - monitorCardHeight) / 2);
      const circleTopCardOptions = {
        fontBoost: 0.2,
        nameFontBoost: 0.5,
        photoWidth,
        photoHeight,
        photoInset: 5,
        textGap: 6,
        rowHeight: 13,
        topPadding: 4,
        textMax: 24,
        showLabels: true,
        alignColumns: true,
        labelWidth: 46,
        showDivider: true,
        topDivider: false,
        hideEmail: true,
        hideEjc: false,
        fields: ['nome', 'instagram', 'telefone', 'aniversario', 'ejc'],
        photoAlign: 'center',
        photoValign: 'center',
      };
      const circleMemberCardOptions = {
        fontBoost: 0.2,
        nameFontBoost: 0.5,
        photoWidth,
        photoHeight,
        photoInset: 5,
        textGap: 6,
        rowHeight: 13,
        topPadding: 4,
        textMax: 24,
        showLabels: true,
        alignColumns: true,
        labelWidth: 46,
        showDivider: true,
        topDivider: false,
        hideEmail: true,
        hideEjc: false,
        fields: ['nome', 'instagram', 'telefone', 'aniversario', 'ejc'],
        photoAlign: 'center',
        photoValign: 'center',
      };
      const moitas = entradas.filter((item) => item.papel === 'moita');
      const outros = entradas.filter((item) => item.papel !== 'moita');

      drawCircleHeader(group.nome, headerY, { height: topBlockHeight, left: circleLeft, width: titleWidth });

      if (moitas.length > 0) {
        const pessoaMoita = moitas[0];

        // Rotulo vertical no meio da coluna, no mesmo estilo do modelo impresso.
        doc.save();
        doc.translate(moitaX - 7 - mmToPt(2), topCardY + (monitorCardHeight / 2));
        doc.rotate(-90);
        doc.font('Helvetica').fontSize(16).fillColor('#1f2f46').text('Moita!', -(monitorCardHeight / 2), -5, {
          width: monitorCardHeight,
          align: 'center',
          lineBreak: false,
        });
        doc.restore();

        drawRegistrationCard(
          doc,
          pessoaMoita,
          moitaX,
          topCardY,
          moitaCardWidth,
          monitorCardHeight,
          pessoaMoita.pessoaTipo === 'encontreiro' ? 'encontro' : 'cadastro',
          {
            ...circleTopCardOptions,
            badgeLabel: '',
          }
        );
      }

      const listaMembros = moitas.length > 1 ? [...moitas.slice(1), ...outros] : outros;
      const blocoTopoFim = headerY + topBlockHeight;
      let y = blocoTopoFim + rowGap;

      if (listaMembros.length > 0) {
        drawGrid(listaMembros, y, {
          left: circleLeft,
          gap: circleGap,
          rowGap,
          cardWidth: circleCardWidth,
          cardHeight: memberCardHeight,
          drawOptions: circleMemberCardOptions,
        });
      }

      if (!entradas.length) {
        doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text('Sem vinculados neste circulo.', left, headerY + 72);
      }
      return;
    }

    const coordenadores = sortEquipeEntriesByTipo(
      entradas.filter((item) => ['coordenador', 'coordenou'].includes(item.papel))
    );
    const membros = sortEquipeEntriesByTipo(
      entradas.filter((item) => !['coordenador', 'coordenou'].includes(item.papel))
    );

    const equipePageMargin = mmToPt(15);
    const equipeCardWidth = mmToPt(85);
    const equipeCardHeight = mmToPt(34);
    const equipePhotoWidth = mmToPt(24);
    const equipePhotoHeight = mmToPt(28);
    const equipeColGap = mmToPt(10);
    // Espaçamento reduzido para caber 12 cards por folha (mantendo card height intacto).
    const equipeRowGap = mmToPt(5);
    const equipeCardOptions = {
      photoWidth: equipePhotoWidth,
      photoHeight: equipePhotoHeight,
      photoInset: 5,
      textGap: 6,
      rowHeight: 13,
      topPadding: 4,
      textMax: 24,
      showLabels: true,
      alignColumns: true,
      labelWidth: 46,
      showDivider: true,
      topDivider: false,
      hideEmail: true,
      hideEjc: false,
      fields: ['nome', 'instagram', 'telefone', 'aniversario', 'ejc'],
      photoAlign: 'center',
      photoValign: 'center',
    };

    let y = equipePageMargin;
    y += drawEquipeHeader(group.nome, y);

    if (coordenadores.length > 0) {
      const headingText = 'COORDENACAO';
      const headingY = y;
      const headingBoxHeight = 16;
      const headingBoxWidth = 156;
      const headingBoxX = left;

      doc.save();
      doc.roundedRect(headingBoxX, headingY - 1, headingBoxWidth, headingBoxHeight, 4).fill('#edf3fb');
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#1b3f6b').text(headingText, headingBoxX + 8, headingY + 2, {
        width: headingBoxWidth - 16,
        align: 'left',
        lineBreak: false,
      });
      doc.restore();

      doc.strokeColor('#b9c6d8').lineWidth(0.9).moveTo(headingBoxX + headingBoxWidth + 8, headingY + 7).lineTo(left + 515, headingY + 7).stroke();
      y += 18;
      y = drawGrid(coordenadores, y, {
        left: equipePageMargin,
        gap: equipeColGap,
        rowGap: equipeRowGap,
        cardWidth: equipeCardWidth,
        cardHeight: equipeCardHeight,
        drawOptions: equipeCardOptions,
        cardTopLabel: () => 'Coordenador',
      });
      y += 6;
    }

    if (membros.length > 0) {
      drawGrid(membros, y, {
        left: equipePageMargin,
        gap: equipeColGap,
        rowGap: equipeRowGap,
        cardWidth: equipeCardWidth,
        cardHeight: equipeCardHeight,
        drawOptions: equipeCardOptions,
      });
    }

    if (!entradas.length) {
      doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text('Sem vinculados nesta equipe.', left, y + 10);
    }
  });

  if (!groups.length) {
    doc.font('Helvetica').fontSize(11).fillColor('#666').text('Nenhuma estrutura cadastrada para este EJC.', 40, 120, { align: 'center' });
  }

  doc.font('Helvetica').fontSize(8).fillColor('#666').text(
    `Total de registros no PDF: ${totalRegistros}`,
    40,
    doc.page.height - 30,
    { align: 'center' }
  );

  doc.end();
};

const renderCardGridPdf = (res, entries, options) => {
  const PDFDocument = require('pdfkit');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${options.fileName}"`);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  const mmToPt = (mm) => (mm * 72) / 25.4;
  const left = mmToPt(15);
  const topStart = 92;
  const gap = mmToPt(10);
  const cardWidth = mmToPt(85);
  const cardHeight = mmToPt(34);
  const rightX = left + cardWidth + gap;
  const bottomLimit = 790;
  const rowGap = mmToPt(8);

  const sharedCardOptions = {
    photoWidth: mmToPt(24),
    photoHeight: mmToPt(28),
    photoInset: 5,
    textGap: 6,
    rowHeight: 13,
    topPadding: 4,
    textMax: 24,
    showLabels: true,
    alignColumns: true,
    labelWidth: 46,
    showDivider: true,
    topDivider: false,
    hideEmail: true,
    hideEjc: false,
    fields: ['nome', 'instagram', 'telefone', 'aniversario', 'ejc'],
    photoAlign: 'center',
    photoValign: 'center',
  };

  const isTiosCasal = (entry) => {
    const grupoId = normalizeTextInput(entry && entry.tiosGrupoId);
    return Boolean(entry && entry.tipo === 'tios' && entry.tiosCategoria === 'casal' && grupoId);
  };

  const isCasalPair = (leftEntry, rightEntry) => {
    if (!isTiosCasal(leftEntry) || !isTiosCasal(rightEntry)) return false;
    return normalizeTextInput(leftEntry.tiosGrupoId) === normalizeTextInput(rightEntry.tiosGrupoId);
  };

  drawPdfTitle(doc, options.title, `Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}`);

  let y = topStart;
  let col = 0;
  let pendingLeftEntry = null;

  entries.forEach((entry, idx) => {
    if (y + cardHeight > bottomLimit) {
      doc.addPage();
      drawPdfTitle(doc, options.title, `Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}`);
      y = topStart;
      col = 0;
      pendingLeftEntry = null;
    }

    const x = col === 0 ? left : rightX;
    drawRegistrationCard(doc, entry, x, y, cardWidth, cardHeight, options.mode, {
      ...sharedCardOptions,
      ...((options && options.drawOptions) || {}),
    });

    if (col === 0) {
      pendingLeftEntry = entry;
      col = 1;
    } else {
      if (isCasalPair(pendingLeftEntry, entry)) {
        const heartX = left + cardWidth + (gap / 2);
        const heartY = y + (cardHeight / 2);
        drawHeartBetweenCards(doc, heartX, heartY, 19, '#d94868');
      }
      pendingLeftEntry = null;
      col = 0;
      y += cardHeight + rowGap;
    }

    if (idx === entries.length - 1) {
      doc.font('Helvetica').fontSize(8).fillColor('#666').text(
        `Total de registros: ${entries.length}`,
        40,
        doc.page.height - 30,
        { align: 'center' }
      );
    }
  });

  if (entries.length === 0) {
    doc.font('Helvetica').fontSize(11).fillColor('#666').text('Nenhum registro encontrado.', 40, 120, { align: 'center' });
  }

  doc.end();
};

const exportImagesFromModel = async (Model, zipName, res) => {
  const files = await Model.find({}, 'foto').lean();
  const uniqueFiles = [...new Set(files.map((item) => item.foto).filter(Boolean))];

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
    const filePath = path.join(ROOT_DIR, 'uploads', fileName);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: fileName });
    }
  });
  archive.finalize();
};

module.exports = {
  resolvePhotoPath,
  drawPdfTitle,
  drawHeartBetweenCards,
  drawCardLine,
  drawRegistrationCard,
  buildPdfEntryFromVinculo,
  renderEstruturasPdf,
  renderCardGridPdf,
  exportImagesFromModel,
  fitPdfTextToWidth,
};
