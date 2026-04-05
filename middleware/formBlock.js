const Admin = require('../models/Admin');

const verificarFormularioBloqueado = async (tipo) => {
  try {
    const admin = await Admin.findOne().lean();
    if (!admin) {
      return { bloqueado: false, motivo: '' };
    }

    const agora = new Date();

    if (tipo === 'encontrista') {
      if (admin.bloquearFormularioEncontrista) {
        const dataInicio = admin.dataInicioBloquearEncontrista ? new Date(admin.dataInicioBloquearEncontrista) : null;
        const dataFim = admin.dataFimBloquearEncontrista ? new Date(admin.dataFimBloquearEncontrista) : null;
        if (!dataInicio && !dataFim) {
          return { bloqueado: true, motivo: admin.motivoBloquearEncontrista || 'Formulário de encontrista está bloqueado' };
        }
        if (dataInicio && agora < dataInicio) return { bloqueado: false, motivo: '' };
        if (dataFim && agora > dataFim) return { bloqueado: false, motivo: '' };
        return { bloqueado: true, motivo: admin.motivoBloquearEncontrista || 'Formulário de encontrista está bloqueado' };
      }
    } else if (tipo === 'encontreiro') {
      if (admin.bloquearFormularioEncontreiros) {
        const dataInicio = admin.dataInicioBloquearEncontreiros ? new Date(admin.dataInicioBloquearEncontreiros) : null;
        const dataFim = admin.dataFimBloquearEncontreiros ? new Date(admin.dataFimBloquearEncontreiros) : null;
        if (!dataInicio && !dataFim) {
          return { bloqueado: true, motivo: admin.motivoBloquearEncontreiros || 'Formulário de encontreiro está bloqueado' };
        }
        if (dataInicio && agora < dataInicio) return { bloqueado: false, motivo: '' };
        if (dataFim && agora > dataFim) return { bloqueado: false, motivo: '' };
        return { bloqueado: true, motivo: admin.motivoBloquearEncontreiros || 'Formulário de encontreiro está bloqueado' };
      }
    }

    return { bloqueado: false, motivo: '' };
  } catch (err) {
    console.error('Erro ao verificar bloqueio de formulário:', err);
    return { bloqueado: false, motivo: '' };
  }
};

module.exports = { verificarFormularioBloqueado };
