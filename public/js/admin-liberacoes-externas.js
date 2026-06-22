(() => {
  const body = document.body;

  const safeJson = async (resp) => {
    try {
      return await resp.json();
    } catch {
      return { success: false, error: 'Resposta invalida do servidor.' };
    }
  };

  const getCsrf = () => (window.__LE_ADMIN__ && window.__LE_ADMIN__.csrfToken) || '';

  const getPremiumDialog = () => {
    let root = document.getElementById('leUxDialog');
    if (root) return root;

    root = document.createElement('div');
    root.id = 'leUxDialog';
    root.className = 'le-ux-dialog';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `
      <div class="le-ux-dialog-backdrop" data-ux-close></div>
      <div class="le-ux-dialog-card" role="dialog" aria-modal="true" aria-labelledby="leUxDialogTitle">
        <div class="le-ux-dialog-icon"><i class="fas fa-bell"></i></div>
        <h3 id="leUxDialogTitle" class="le-ux-dialog-title">Notificacao</h3>
        <p class="le-ux-dialog-message"></p>
        <div class="le-ux-dialog-actions">
          <button type="button" class="le-btn le-btn-ghost" data-ux-cancel>Cancelar</button>
          <button type="button" class="le-btn le-btn-primary" data-ux-confirm>OK</button>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    return root;
  };

  const showPremiumDialog = ({
    title = 'Notificacao',
    message = 'Operacao concluida.',
    confirmText = 'OK',
    cancelText = 'Cancelar',
    showCancel = false,
    variant = 'info',
  } = {}) => new Promise((resolve) => {
    const dialog = getPremiumDialog();
    const titleEl = dialog.querySelector('.le-ux-dialog-title');
    const messageEl = dialog.querySelector('.le-ux-dialog-message');
    const iconEl = dialog.querySelector('.le-ux-dialog-icon i');
    const cancelBtn = dialog.querySelector('[data-ux-cancel]');
    const confirmBtn = dialog.querySelector('[data-ux-confirm]');

    const onDone = (accepted) => {
      dialog.classList.remove('is-open', 'is-confirm', 'is-danger', 'is-success');
      dialog.setAttribute('aria-hidden', 'true');
      dialog.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeydown);
      resolve(accepted);
    };

    const onClick = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest('[data-ux-confirm]')) onDone(true);
      if (target.closest('[data-ux-cancel]') || target.closest('[data-ux-close]')) onDone(false);
    };

    const onKeydown = (event) => {
      if (event.key === 'Escape') {
        onDone(false);
      }
      if (event.key === 'Enter') {
        onDone(true);
      }
    };

    titleEl.textContent = String(title || 'Notificacao');
    messageEl.textContent = String(message || 'Operacao concluida.');
    confirmBtn.textContent = String(confirmText || 'OK');
    cancelBtn.textContent = String(cancelText || 'Cancelar');
    cancelBtn.style.display = showCancel ? 'inline-flex' : 'none';

    dialog.classList.toggle('is-confirm', showCancel);
    dialog.classList.toggle('is-danger', variant === 'danger');
    dialog.classList.toggle('is-success', variant === 'success');

    if (iconEl) {
      iconEl.classList.remove('fa-bell', 'fa-circle-exclamation', 'fa-circle-check', 'fa-triangle-exclamation');
      if (variant === 'danger') {
        iconEl.classList.add('fa-triangle-exclamation');
      } else if (variant === 'success') {
        iconEl.classList.add('fa-circle-check');
      } else if (showCancel) {
        iconEl.classList.add('fa-circle-exclamation');
      } else {
        iconEl.classList.add('fa-bell');
      }
    }

    dialog.classList.add('is-open');
    dialog.setAttribute('aria-hidden', 'false');
    dialog.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeydown);
    confirmBtn.focus();
  });

  const showAlert = (msg, options = {}) => showPremiumDialog({
    title: options.title || 'Notificacao',
    message: msg || 'Operacao concluida.',
    confirmText: options.confirmText || 'Entendi',
    showCancel: false,
    variant: options.variant || 'info',
  });

  const showConfirm = (msg, options = {}) => showPremiumDialog({
    title: options.title || 'Confirmacao necessaria',
    message: msg || 'Deseja continuar?',
    confirmText: options.confirmText || 'Continuar',
    cancelText: options.cancelText || 'Cancelar',
    showCancel: true,
    variant: options.variant || 'danger',
  });

  const bindPublicConditionalFields = () => {
    if (!body.classList.contains('le-public-body')) return;

    const readRadioBool = (name) => {
      const checked = document.querySelector(`input[name="${name}"]:checked`);
      return checked && checked.value === 'true';
    };

    const isCheckedValue = (name, value) => !!document.querySelector(`input[name="${name}"][value="${value}"]:checked`);

    const toggle = () => {
      const domWrap = document.getElementById('domMusicalDescricaoWrap');
      const pastoralWrap = document.getElementById('pastoraisWrap');
      const pastoralOutroWrap = document.getElementById('pastoralOutroWrap');
      const equipesWrap = document.getElementById('equipesWrap');
      const outrosWrap = document.getElementById('outrosEjcWrap');
      const indisponibilidadeOutroEjc2026Wrap = document.getElementById('indisponibilidadeOutroEjc2026Wrap');

      const domOn = readRadioBool('domMusicalPossui');
      const paroquiaOn = readRadioBool('participaParoquia');
      const serveAtual = readRadioBool('serveEjcAnoAtual');
      const serveOutro = readRadioBool('serveOutroEjcAnoAtual');
      const interesseOutroEjc2026 = readRadioBool('interesseOutroEjc2026');
      const outroPastoral = isCheckedValue('pastorais', 'Outro');

      if (domWrap) domWrap.style.display = domOn ? '' : 'none';
      if (pastoralWrap) pastoralWrap.style.display = paroquiaOn ? 'grid' : 'none';
      if (pastoralOutroWrap) pastoralOutroWrap.style.display = (paroquiaOn && outroPastoral) ? '' : 'none';
      if (equipesWrap) equipesWrap.style.display = serveAtual ? 'grid' : 'none';
      if (outrosWrap) outrosWrap.style.display = serveOutro ? '' : 'none';
      if (indisponibilidadeOutroEjc2026Wrap) indisponibilidadeOutroEjc2026Wrap.style.display = interesseOutroEjc2026 ? '' : 'none';
    };

    document.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
      if (['domMusicalPossui', 'participaParoquia', 'pastorais', 'serveEjcAnoAtual', 'serveOutroEjcAnoAtual', 'interesseOutroEjc2026'].includes(target.name)) {
        toggle();
      }
    });

    toggle();
  };

  const bindPublicPremiumEnhancements = () => {
    if (!body.classList.contains('le-public-body')) return;

    const themeToggle = document.getElementById('leThemeToggle');
    const progressFill = document.getElementById('leProgressFill');
    const progressText = document.getElementById('leProgressText');
    const form = document.getElementById('lePublicForm');
    const sections = Array.from(document.querySelectorAll('.le-form-section[data-step]'));
    const stepLabels = Array.from(document.querySelectorAll('#leProgressSteps [data-step-index]'));

    const applyTheme = (theme) => {
      const nextTheme = theme === 'light' ? 'light' : 'dark';
      body.setAttribute('data-theme', nextTheme);
      try {
        window.localStorage.setItem('lePublicTheme', nextTheme);
      } catch {
        // ignore storage errors
      }

      if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        const text = themeToggle.querySelector('span');
        if (icon) {
          icon.classList.remove('fa-moon', 'fa-sun');
          icon.classList.add(nextTheme === 'light' ? 'fa-sun' : 'fa-moon');
        }
        if (text) {
          text.textContent = nextTheme === 'light' ? 'Tema claro' : 'Tema premium';
        }
      }
    };

    const restoreTheme = () => {
      let saved = 'dark';
      try {
        saved = window.localStorage.getItem('lePublicTheme') || 'dark';
      } catch {
        saved = 'dark';
      }
      applyTheme(saved);
    };

    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const current = body.getAttribute('data-theme') || 'dark';
        applyTheme(current === 'dark' ? 'light' : 'dark');
      });
    }

    const isSectionComplete = (section) => {
      const requiredFields = Array.from(section.querySelectorAll('input[required], select[required], textarea[required]'));
      if (!requiredFields.length) return true;

      return requiredFields.every((field) => {
        if (field instanceof HTMLInputElement && (field.type === 'radio' || field.type === 'checkbox')) {
          const group = section.querySelectorAll(`input[name="${field.name}"]`);
          return Array.from(group).some((item) => item.checked);
        }
        return String(field.value || '').trim().length > 0;
      });
    };

    const updateProgress = () => {
      if (!sections.length || !progressFill || !progressText) return;

      const completedCount = sections.reduce((acc, section) => acc + (isSectionComplete(section) ? 1 : 0), 0);
      const percentage = Math.round((completedCount / sections.length) * 100);
      progressFill.style.width = `${percentage}%`;
      progressText.textContent = `${percentage}%`;

      stepLabels.forEach((item) => {
        const stepIndex = Number.parseInt(item.getAttribute('data-step-index') || '-1', 10);
        item.classList.toggle('is-done', stepIndex >= 0 && stepIndex < completedCount);
      });
    };

    if (form) {
      form.addEventListener('input', updateProgress);
      form.addEventListener('change', updateProgress);
      form.addEventListener('submit', updateProgress);
    }

    const animateSections = () => {
      if (!sections.length) return;

      sections.forEach((section, index) => {
        section.style.setProperty('--stagger', `${index * 80}ms`);
      });

      if (!('IntersectionObserver' in window)) {
        sections.forEach((section) => section.classList.add('is-visible'));
        return;
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

      sections.forEach((section) => observer.observe(section));
    };

    restoreTheme();
    animateSections();
    updateProgress();
  };

  const bindAdminPage = () => {
    if (!body.classList.contains('le-admin-body')) return;

    const themeToggle = document.getElementById('leAdminThemeToggle');

    const applyAdminTheme = (theme) => {
      const nextTheme = theme === 'dark' ? 'dark' : 'light';
      body.setAttribute('data-admin-theme', nextTheme);

      if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        const text = themeToggle.querySelector('span');
        if (icon) {
          icon.classList.remove('fa-sun', 'fa-moon');
          icon.classList.add(nextTheme === 'light' ? 'fa-sun' : 'fa-moon');
        }
        if (text) {
          text.textContent = nextTheme === 'light' ? 'Tema claro' : 'Tema noturno';
        }
      }

      try {
        window.localStorage.setItem('leAdminTheme', nextTheme);
      } catch {
        // ignore storage errors
      }
    };

    const restoreAdminTheme = () => {
      let saved = 'light';
      try {
        saved = window.localStorage.getItem('leAdminTheme') || 'light';
      } catch {
        saved = 'light';
      }
      applyAdminTheme(saved);
    };

    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const current = body.getAttribute('data-admin-theme') || 'light';
        applyAdminTheme(current === 'light' ? 'dark' : 'light');
      });
    }

    restoreAdminTheme();

    const table = document.getElementById('leRegistrosTable');
    const rows = Array.from(document.querySelectorAll('#leRegistrosTable tbody tr'));
    const tabs = Array.from(document.querySelectorAll('[data-perfil-tab]'));
    const modal = document.getElementById('leModal');
    const modalTitle = document.getElementById('leModalTitle');
    const modalBody = document.getElementById('leModalBody');
    const modalFooter = document.getElementById('leModalFooter');
    const searchInput = document.getElementById('q');

    const closeModal = () => {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      modalBody.innerHTML = '';
      modalFooter.innerHTML = '';
    };

    const openModal = () => {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    };

    const normalizeSearchText = (value) => String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');

    const filterRows = (perfilTab, localSearch = '') => {
      const term = normalizeSearchText(localSearch);
      rows.forEach((row) => {
        const text = normalizeSearchText(row.innerText);
        const matchesPerfil = perfilTab === 'all' || row.dataset.perfil === perfilTab;
        const matchesSearch = !term || text.includes(term);
        row.style.display = matchesPerfil && matchesSearch ? '' : 'none';
      });
    };

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((item) => item.classList.remove('is-active'));
        tab.classList.add('is-active');
        filterRows(tab.dataset.perfilTab || 'all', searchInput ? searchInput.value : '');
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const activeTab = document.querySelector('.le-tab.is-active');
        const perfil = activeTab ? activeTab.dataset.perfilTab : 'all';
        filterRows(perfil || 'all', searchInput.value);
      });
    }

    const fetchRegistro = async (id) => {
      const resp = await fetch(`/admin/liberacoes-externas/registro/${id}`, { headers: { Accept: 'application/json' } });
      return safeJson(resp);
    };

    const renderView = (registro) => {
      const perfilLabel = registro.perfilStatus === 'perfil_apto'
        ? 'Perfil Apto'
        : (registro.perfilStatus === 'em_analise' ? 'Em Analise' : 'Fora do Perfil');

      modalTitle.textContent = 'Visualizacao individual';
      const fields = [
        ['Nome', registro.nomeCompleto],
        ['Data nascimento', registro.dataNascimento ? new Date(registro.dataNascimento).toLocaleDateString('pt-BR') : '-'],
        ['Idade', registro.idadeCalculada || 0],
        ['Telefone', registro.telefone || '-'],
        ['E-mail', registro.email || '-'],
        ['Genero', registro.genero || '-'],
        ['Estado civil', registro.estadoCivil || '-'],
        ['Endereco', [registro.enderecoRua, registro.enderecoNumero, registro.enderecoBairro, registro.enderecoCidade].filter(Boolean).join(', ')],
        ['Dom musical', registro.domMusicalPossui ? 'Sim' : 'Nao'],
        ['Descricao dom', registro.domMusicalDescricao || '-'],
        ['Participa paroquia', registro.participaParoquia ? 'Sim' : 'Nao'],
        ['Pastorais', Array.isArray(registro.pastorais) ? registro.pastorais.join(', ') : '-'],
        ['Historico EJC', registro.ejcCopHistorico || '-'],
        ['Serve esse ano', registro.serveEjcAnoAtual ? 'Sim' : 'Nao'],
        ['Equipe atual', Array.isArray(registro.equipeAtual) ? registro.equipeAtual.join(', ') : '-'],
        ['Serve outro EJC', registro.serveOutroEjcAnoAtual ? 'Sim' : 'Nao'],
        ['Outros EJC', registro.outrosEjcsDescricao || '-'],
        ['Interesse e disponibilidade em 2026', registro.interesseOutroEjc2026 ? 'Sim' : 'Nao'],
        ['Datas sem disponibilidade (2026)', registro.indisponibilidadeOutroEjc2026 || '-'],
        ['Recado para DIRIS', registro.recadoDiris || '-'],
        ['Perfil', perfilLabel],
      ];

      modalBody.innerHTML = `
        <div class="le-modal-grid">
          ${fields.map(([label, value]) => `<div class="le-modal-field"><label>${label}</label><strong>${String(value || '-')}</strong></div>`).join('')}
        </div>
      `;

      modalFooter.innerHTML = '<button type="button" class="le-btn le-btn-ghost" data-close-modal>Fechar</button>';
      openModal();
    };

    const renderHistory = async (id) => {
      modalTitle.textContent = 'Historico de alteracoes';
      modalBody.innerHTML = '<p>Carregando historico...</p>';
      modalFooter.innerHTML = '<button type="button" class="le-btn le-btn-ghost" data-close-modal>Fechar</button>';
      openModal();

      const resp = await fetch(`/admin/liberacoes-externas/registro/${id}/historico`, { headers: { Accept: 'application/json' } });
      const data = await safeJson(resp);
      if (!data.success) {
        modalBody.innerHTML = `<p>${data.error || 'Nao foi possivel carregar o historico.'}</p>`;
        return;
      }

      const html = (data.historico || []).map((item) => {
        const when = item.dataAlteracao ? new Date(item.dataAlteracao).toLocaleString('pt-BR') : '-';
        const by = item.alteradoPorTipo === 'admin'
          ? (item.alteradoPorAdminUsername || 'admin')
          : 'publico';
        const changedKeys = item.diff && typeof item.diff === 'object' ? Object.keys(item.diff) : [];

        return `
          <div class="le-modal-field">
            <label>${when}</label>
            <strong>${item.acao || '-'}</strong>
            <div>Por: ${by}</div>
            <small>Campos alterados: ${changedKeys.length ? changedKeys.join(', ') : '-'}</small>
          </div>
        `;
      }).join('');

      modalBody.innerHTML = `<div class="le-modal-grid">${html || '<p>Nenhum historico disponivel.</p>'}</div>`;
    };

    const buildEditForm = (registro) => {
      const joinList = (list) => Array.isArray(list) ? list.join(', ') : '';
      return `
        <form id="leEditForm" class="le-modal-grid">
          <div class="le-modal-field"><label>Nome</label><input class="le-input" name="nomeCompleto" value="${registro.nomeCompleto || ''}" /></div>
          <div class="le-modal-field"><label>Data nascimento</label><input class="le-input" type="date" name="dataNascimento" value="${registro.dataNascimento ? new Date(registro.dataNascimento).toISOString().slice(0, 10) : ''}" /></div>
          <div class="le-modal-field"><label>Telefone</label><input class="le-input" name="telefone" value="${registro.telefone || ''}" /></div>
          <div class="le-modal-field"><label>E-mail</label><input class="le-input" name="email" value="${registro.email || ''}" /></div>
          <div class="le-modal-field"><label>Genero</label>
            <select class="le-input" name="genero">
              <option value="nao_informado" ${registro.genero === 'nao_informado' ? 'selected' : ''}>Nao informado</option>
              <option value="masculino" ${registro.genero === 'masculino' ? 'selected' : ''}>Masculino</option>
              <option value="feminino" ${registro.genero === 'feminino' ? 'selected' : ''}>Feminino</option>
            </select>
          </div>
          <div class="le-modal-field"><label>Estado civil</label>
            <select class="le-input" name="estadoCivil">
              <option value="Solteiro" ${registro.estadoCivil === 'Solteiro' ? 'selected' : ''}>Solteiro</option>
              <option value="Casado" ${registro.estadoCivil === 'Casado' ? 'selected' : ''}>Casado</option>
              <option value="Uniao Estavel" ${registro.estadoCivil === 'Uniao Estavel' ? 'selected' : ''}>Uniao Estavel</option>
              <option value="Divorciado" ${registro.estadoCivil === 'Divorciado' ? 'selected' : ''}>Divorciado</option>
              <option value="Viuvo" ${registro.estadoCivil === 'Viuvo' ? 'selected' : ''}>Viuvo</option>
            </select>
          </div>
          <div class="le-modal-field"><label>Rua</label><input class="le-input" name="enderecoRua" value="${registro.enderecoRua || ''}" /></div>
          <div class="le-modal-field"><label>Numero</label><input class="le-input" name="enderecoNumero" value="${registro.enderecoNumero || ''}" /></div>
          <div class="le-modal-field"><label>Bairro</label><input class="le-input" name="enderecoBairro" value="${registro.enderecoBairro || ''}" /></div>
          <div class="le-modal-field"><label>Cidade</label><input class="le-input" name="enderecoCidade" value="${registro.enderecoCidade || ''}" /></div>
          <div class="le-modal-field"><label>EJC COP</label><input class="le-input" name="ejcCopHistorico" value="${registro.ejcCopHistorico || ''}" /></div>
          <div class="le-modal-field"><label>Pastorais (separe por virgula)</label><input class="le-input" name="pastorais" value="${joinList(registro.pastorais)}" /></div>
          <div class="le-modal-field"><label>Equipe atual (separe por virgula)</label><input class="le-input" name="equipeAtual" value="${joinList(registro.equipeAtual)}" /></div>
          <div class="le-modal-field"><label>Outros EJC's</label><input class="le-input" name="outrosEjcsDescricao" value="${registro.outrosEjcsDescricao || ''}" /></div>
          <div class="le-modal-field"><label>Interesse/disponibilidade em outro EJC em 2026</label>
            <select class="le-input" name="interesseOutroEjc2026">
              <option value="false" ${registro.interesseOutroEjc2026 ? '' : 'selected'}>Nao</option>
              <option value="true" ${registro.interesseOutroEjc2026 ? 'selected' : ''}>Sim</option>
            </select>
          </div>
          <div class="le-modal-field"><label>Datas sem disponibilidade (2026)</label><input class="le-input" name="indisponibilidadeOutroEjc2026" value="${registro.indisponibilidadeOutroEjc2026 || ''}" /></div>
          <div class="le-modal-field"><label>Recado para DIRIS</label><textarea class="le-input" name="recadoDiris" rows="3">${registro.recadoDiris || ''}</textarea></div>
          <div class="le-modal-field"><label>Descricao dom musical</label><input class="le-input" name="domMusicalDescricao" value="${registro.domMusicalDescricao || ''}" /></div>
          <div class="le-modal-field"><label>Pastoral outro</label><input class="le-input" name="pastoralOutroDescricao" value="${registro.pastoralOutroDescricao || ''}" /></div>
        </form>
      `;
    };

    const saveEdit = async (id) => {
      const form = document.getElementById('leEditForm');
      if (!form) return;

      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());
      payload.domMusicalPossui = String(payload.domMusicalDescricao || '').trim() ? 'true' : 'false';
      payload.participaParoquia = String(payload.pastorais || '').trim() ? 'true' : 'false';
      payload.serveEjcAnoAtual = String(payload.equipeAtual || '').trim() ? 'true' : 'false';
      payload.serveOutroEjcAnoAtual = String(payload.outrosEjcsDescricao || '').trim() ? 'true' : 'false';
      payload.interesseOutroEjc2026 = payload.interesseOutroEjc2026 === 'true' ? 'true' : 'false';
      payload.pastorais = String(payload.pastorais || '').split(',').map((item) => item.trim()).filter(Boolean);
      payload.equipeAtual = String(payload.equipeAtual || '').split(',').map((item) => item.trim()).filter(Boolean);

      const resp = await fetch(`/admin/liberacoes-externas/registro/${id}/editar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-csrf-token': getCsrf(),
        },
        body: JSON.stringify(payload),
      });

      const data = await safeJson(resp);
      if (!data.success) {
        await showAlert(data.error || 'Falha ao salvar cadastro.', { title: 'Nao foi possivel salvar', variant: 'danger' });
        return;
      }

      await showAlert('Cadastro atualizado com sucesso. A pagina sera recarregada.', { title: 'Atualizacao concluida', variant: 'success' });
      window.location.reload();
    };

    const renderEdit = (registro) => {
      modalTitle.textContent = 'Editar cadastro';
      modalBody.innerHTML = buildEditForm(registro);
      modalFooter.innerHTML = `
        <button type="button" class="le-btn le-btn-ghost" data-close-modal>Cancelar</button>
        <button type="button" class="le-btn le-btn-primary" id="leSaveEditBtn">Salvar alteracoes</button>
      `;

      openModal();
      const saveBtn = document.getElementById('leSaveEditBtn');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => saveEdit(registro._id));
      }
    };

    const deleteRegistro = async (id) => {
      const confirmed = await showConfirm('Deseja realmente excluir este cadastro? Esta acao nao pode ser desfeita.', {
        title: 'Confirmar exclusao',
        confirmText: 'Excluir cadastro',
      });
      if (!confirmed) return;

      const resp = await fetch(`/admin/liberacoes-externas/registro/${id}/excluir`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'x-csrf-token': getCsrf(),
        },
      });
      const data = await safeJson(resp);
      if (!data.success) {
        await showAlert(data.error || 'Falha ao excluir cadastro.', { title: 'Erro ao excluir', variant: 'danger' });
        return;
      }
      await showAlert('Cadastro excluido com sucesso.', { title: 'Exclusao concluida', variant: 'success' });
      window.location.reload();
    };

    if (table) {
      table.addEventListener('click', async (event) => {
        const actionBtn = event.target.closest('button[data-action]');
        if (!actionBtn) return;

        const row = actionBtn.closest('tr[data-id]');
        if (!row) return;
        const id = row.dataset.id;
        const action = actionBtn.dataset.action;

        if (action === 'delete') {
          await deleteRegistro(id);
          return;
        }

        const data = await fetchRegistro(id);
        if (!data.success) {
          await showAlert(data.error || 'Nao foi possivel carregar o cadastro.', { title: 'Erro ao carregar', variant: 'danger' });
          return;
        }

        if (action === 'view') renderView(data.registro);
        if (action === 'history') await renderHistory(id);
        if (action === 'edit') {
          if (!(window.__LE_ADMIN__ && window.__LE_ADMIN__.canEdit)) {
            await showAlert('Seu perfil nao possui permissao para edicao.', { title: 'Acesso negado', variant: 'danger' });
            return;
          }
          renderEdit(data.registro);
        }
      });
    }

    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-close-modal]')) {
        closeModal();
      }
    });

    const gerarBtn = document.getElementById('leGerarLinkBtn');
    const revogarBtn = document.getElementById('leRevogarLinkBtn');
    const copiarBtn = document.getElementById('leCopiarLinkBtn');
    const linkField = document.getElementById('leLinkField');
    const linkMeta = document.getElementById('leLinkMeta');
    const expDias = document.getElementById('leExpDias');

    const updateLinkUI = (token, tokenExp) => {
      if (!linkField) return;
      linkField.value = token ? `${window.__LE_ADMIN__.linkPrefix}${encodeURIComponent(token)}` : '';
      if (!linkMeta) return;
      if (!token) {
        linkMeta.textContent = 'Nenhum link ativo no momento.';
      } else if (tokenExp) {
        linkMeta.textContent = `Expira em ${new Date(tokenExp).toLocaleString('pt-BR')}`;
      } else {
        linkMeta.textContent = 'Sem expiracao definida.';
      }
    };

    if (gerarBtn) {
      gerarBtn.addEventListener('click', async () => {
        const payload = {
          expDias: expDias && expDias.value ? Number(expDias.value) : '',
        };

        const resp = await fetch('/admin/liberacoes-externas/gerar-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-csrf-token': getCsrf(),
          },
          body: JSON.stringify(payload),
        });

        const data = await safeJson(resp);
        if (!data.success) {
          await showAlert(data.error || 'Nao foi possivel gerar o link.', { title: 'Erro ao gerar link', variant: 'danger' });
          return;
        }

        updateLinkUI(data.token, data.tokenExp);
        await showAlert('Link gerado com sucesso.', { title: 'Link pronto', variant: 'success' });
      });
    }

    if (revogarBtn) {
      revogarBtn.addEventListener('click', async () => {
        const confirmed = await showConfirm('Deseja revogar o link ativo agora?', {
          title: 'Revogar link ativo',
          confirmText: 'Revogar link',
          cancelText: 'Manter ativo',
        });
        if (!confirmed) return;

        const resp = await fetch('/admin/liberacoes-externas/revogar-link', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'x-csrf-token': getCsrf(),
          },
        });

        const data = await safeJson(resp);
        if (!data.success) {
          await showAlert(data.error || 'Nao foi possivel revogar o link.', { title: 'Falha ao revogar', variant: 'danger' });
          return;
        }

        updateLinkUI('', null);
        await showAlert('Link revogado com sucesso.', { title: 'Link revogado', variant: 'success' });
      });
    }

    if (copiarBtn) {
      copiarBtn.addEventListener('click', async () => {
        if (!linkField || !linkField.value) {
          await showAlert('Nao existe link ativo para copiar.', { title: 'Link indisponivel', variant: 'danger' });
          return;
        }
        try {
          await navigator.clipboard.writeText(linkField.value);
          await showAlert('Link copiado para a area de transferencia.', { title: 'Copiado com sucesso', variant: 'success' });
        } catch {
          await showAlert('Nao foi possivel copiar automaticamente.', { title: 'Falha ao copiar', variant: 'danger' });
        }
      });
    }

    const printBtn = document.getElementById('lePrintBtn');
    if (printBtn) {
      printBtn.addEventListener('click', () => window.print());
    }
  };

  bindPublicConditionalFields();
  bindPublicPremiumEnhancements();
  bindAdminPage();
})();
