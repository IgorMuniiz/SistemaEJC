(() => {
  const STYLE_ID = 'app-page-transitions-style';
  const OVERLAY_ID = 'app-page-transition-overlay';
  const PROGRESS_ID = 'app-page-progress-bar';
  const LIVE_REGION_ID = 'app-live-region';
  const TOAST_ROOT_ID = 'app-toast-root';
  const TAB_ACTIVE_CLASS = 'app-tab-active';
  const PAGE_READY_CLASS = 'app-page-ready';
  const PAGE_LEAVING_CLASS = 'app-page-leaving';
  let pendingAjaxContext = null;
  let telemetryStore = [];

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      html {
        background: #06080f;
      }

      body {
        opacity: 0;
        transform: translate3d(0, 12px, 0) scale(0.994);
        transition: opacity 220ms ease-out, transform 340ms cubic-bezier(0.16, 1, 0.3, 1);
        will-change: opacity, transform;
      }

      body.${PAGE_READY_CLASS} {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
      }

      body.${PAGE_LEAVING_CLASS} {
        opacity: 0;
        transform: translate3d(0, 16px, 0) scale(0.992);
        pointer-events: none;
      }

      body.app-busy {
        cursor: progress;
      }

      body.app-busy button,
      body.app-busy .btn,
      body.app-busy [type='submit'] {
        cursor: progress;
      }

      #${OVERLAY_ID} {
        position: fixed;
        inset: 0;
        z-index: 9999;
        pointer-events: none;
        opacity: 0;
        background:
          radial-gradient(circle at 18% 20%, rgba(138, 215, 204, 0.16), transparent 32%),
          radial-gradient(circle at 82% 14%, rgba(213, 159, 102, 0.16), transparent 34%),
          linear-gradient(160deg, rgba(6, 8, 15, 0.08), rgba(6, 8, 15, 0.28));
        backdrop-filter: blur(0px);
        transition: opacity 180ms ease-out, backdrop-filter 260ms ease-out;
      }

      #${PROGRESS_ID} {
        position: fixed;
        top: 0;
        left: 0;
        height: 3px;
        width: 0;
        z-index: 10000;
        opacity: 0;
        pointer-events: none;
        background: linear-gradient(90deg, #8ad7cc 0%, #d59f66 50%, #8b5cf6 100%);
        box-shadow: 0 0 16px rgba(141, 108, 246, 0.48);
        transition: width 360ms cubic-bezier(0.2, 1, 0.3, 1), opacity 180ms ease-out;
      }

      body.${PAGE_LEAVING_CLASS} #${PROGRESS_ID} {
        opacity: 1;
      }

      .app-btn-loading {
        position: relative;
        pointer-events: none;
      }

      button.app-btn-loading::after,
      .btn.app-btn-loading::after {
        content: '';
        display: inline-block;
        width: 0.9em;
        height: 0.9em;
        margin-left: 0.5em;
        border-radius: 999px;
        border: 2px solid currentColor;
        border-top-color: transparent;
        animation: appSpin 680ms linear infinite;
        vertical-align: -0.12em;
      }

      .app-field-invalid {
        border-color: #f87171 !important;
        box-shadow: 0 0 0 1px rgba(248, 113, 113, 0.4), 0 0 0 4px rgba(248, 113, 113, 0.18) !important;
      }

      #${LIVE_REGION_ID} {
        position: fixed;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(1px, 1px, 1px, 1px);
        clip-path: inset(50%);
        white-space: nowrap;
      }

      #${TOAST_ROOT_ID} {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 10001;
        display: grid;
        gap: 8px;
        width: min(360px, calc(100vw - 24px));
        pointer-events: none;
      }

      .app-toast {
        border-radius: 12px;
        border: 1px solid rgba(148, 163, 184, 0.32);
        background: rgba(15, 23, 42, 0.9);
        color: #e2e8f0;
        padding: 10px 12px;
        font-size: 0.87rem;
        line-height: 1.45;
        box-shadow: 0 16px 36px rgba(2, 6, 23, 0.42);
        opacity: 0;
        transform: translateY(8px);
        animation: appToastIn 200ms ease-out forwards;
      }

      .app-toast.app-toast-success {
        border-color: rgba(16, 185, 129, 0.42);
        background: linear-gradient(145deg, rgba(5, 46, 22, 0.88), rgba(6, 78, 59, 0.72));
      }

      .app-toast.app-toast-error {
        border-color: rgba(239, 68, 68, 0.42);
        background: linear-gradient(145deg, rgba(69, 10, 10, 0.9), rgba(127, 29, 29, 0.74));
      }

      .app-inline-feedback {
        margin-top: 10px;
        border-radius: 10px;
        border: 1px solid rgba(148, 163, 184, 0.32);
        background: rgba(15, 23, 42, 0.72);
        color: #e2e8f0;
        font-size: 0.84rem;
        line-height: 1.4;
        padding: 9px 11px;
      }

      .app-inline-feedback.app-inline-feedback-success {
        border-color: rgba(16, 185, 129, 0.42);
        background: rgba(6, 78, 59, 0.3);
      }

      .app-inline-feedback.app-inline-feedback-error {
        border-color: rgba(239, 68, 68, 0.42);
        background: rgba(127, 29, 29, 0.3);
      }

      body.admin-panel.app-skeletoning .surface,
      body.admin-panel.app-skeletoning .entity-card,
      body.admin-panel.app-skeletoning .table-wrap,
      body.admin-panel.app-skeletoning .card,
      body.admin-panel.app-skeletoning .qe-card {
        position: relative;
        overflow: hidden;
      }

      body.admin-panel.app-skeletoning .surface::after,
      body.admin-panel.app-skeletoning .entity-card::after,
      body.admin-panel.app-skeletoning .table-wrap::after,
      body.admin-panel.app-skeletoning .card::after,
      body.admin-panel.app-skeletoning .qe-card::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(110deg, rgba(15, 23, 42, 0.08) 22%, rgba(148, 163, 184, 0.16) 38%, rgba(15, 23, 42, 0.08) 54%);
        transform: translateX(-100%);
        animation: appSkeletonSweep 900ms ease-out infinite;
        pointer-events: none;
      }

      body.${PAGE_LEAVING_CLASS} #${OVERLAY_ID} {
        opacity: 0.92;
        backdrop-filter: blur(6px);
      }

      .tab-content.app-tab-shell {
        position: relative;
      }

      .tab-content.app-tab-shell > .tab-pane {
        transform-origin: top center;
      }

      .tab-content.app-tab-shell > .tab-pane.fade {
        transition: opacity 160ms ease-out !important;
      }

      .tab-content.app-tab-shell > .tab-pane.${TAB_ACTIVE_CLASS} {
        animation: appTabReveal 280ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes appTabReveal {
        0% {
          opacity: 0;
          transform: translate3d(0, 12px, 0) scale(0.992);
          filter: blur(4px);
        }
        100% {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
          filter: blur(0);
        }
      }

      @keyframes appSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      @keyframes appToastIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes appSkeletonSweep {
        100% { transform: translateX(100%); }
      }

      @media (prefers-reduced-motion: reduce) {
        body,
        #${OVERLAY_ID},
        .tab-content.app-tab-shell > .tab-pane.fade,
        .tab-content.app-tab-shell > .tab-pane.${TAB_ACTIVE_CLASS} {
          transition: none !important;
          animation: none !important;
          transform: none !important;
          filter: none !important;
          opacity: 1 !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function ensureOverlay() {
    if (document.getElementById(OVERLAY_ID)) return;
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);
  }

  function ensureProgressBar() {
    if (document.getElementById(PROGRESS_ID)) return;
    const bar = document.createElement('div');
    bar.id = PROGRESS_ID;
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
  }

  function ensureLiveRegion() {
    if (document.getElementById(LIVE_REGION_ID)) return;
    const live = document.createElement('div');
    live.id = LIVE_REGION_ID;
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    document.body.appendChild(live);
  }

  function ensureToastRoot() {
    if (document.getElementById(TOAST_ROOT_ID)) return;
    const root = document.createElement('div');
    root.id = TOAST_ROOT_ID;
    root.setAttribute('aria-hidden', 'true');
    document.body.appendChild(root);
  }

  function announce(message) {
    const live = document.getElementById(LIVE_REGION_ID);
    if (!live) return;
    live.textContent = '';
    window.setTimeout(() => {
      live.textContent = String(message || '');
    }, 40);
  }

  function trackUx(eventName, data = {}) {
    const entry = {
      event: String(eventName || 'event'),
      at: Date.now(),
      path: window.location.pathname,
      ...data,
    };
    telemetryStore.push(entry);
    if (telemetryStore.length > 120) {
      telemetryStore = telemetryStore.slice(-120);
    }
    try {
      sessionStorage.setItem('appUxTelemetry', JSON.stringify(telemetryStore));
    } catch (err) {
      // ignore storage errors
    }
  }

  function showToast(message, tone = 'success') {
    const root = document.getElementById(TOAST_ROOT_ID);
    if (!root || !message) return;

    const toast = document.createElement('div');
    toast.className = `app-toast ${tone === 'error' ? 'app-toast-error' : 'app-toast-success'}`;
    toast.textContent = String(message);
    root.appendChild(toast);

    window.setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(6px)';
      window.setTimeout(() => {
        toast.remove();
      }, 220);
    }, 2800);
  }

  function getInlineHostFromContext(context) {
    if (!context || !(context.el instanceof Element)) return null;
    return context.el.closest('form, .surface, .card, .modal-content, .edit-modal-body');
  }

  function showInlineFeedback(context, message, tone = 'success') {
    const host = getInlineHostFromContext(context);
    if (!host || !message) return false;

    let feedback = host.querySelector('.app-inline-feedback');
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.className = 'app-inline-feedback';
      host.appendChild(feedback);
    }

    feedback.classList.remove('app-inline-feedback-success', 'app-inline-feedback-error');
    feedback.classList.add(tone === 'error' ? 'app-inline-feedback-error' : 'app-inline-feedback-success');
    feedback.textContent = String(message);

    window.setTimeout(() => {
      if (feedback) {
        feedback.style.opacity = '0.88';
      }
    }, 1800);

    return true;
  }

  function normalizeAjaxMessage(data, responseOk) {
    if (!data || typeof data !== 'object') {
      return responseOk ? 'Acao concluida com sucesso.' : 'Nao foi possivel concluir a acao.';
    }
    return String(data.message || data.msg || data.error || (responseOk ? 'Acao concluida com sucesso.' : 'Nao foi possivel concluir a acao.'));
  }

  function startProgress() {
    const bar = document.getElementById(PROGRESS_ID);
    if (!bar) return;
    bar.style.opacity = '1';
    bar.style.width = '28%';
    window.setTimeout(() => {
      bar.style.width = '72%';
    }, 80);
  }

  function completeProgress() {
    const bar = document.getElementById(PROGRESS_ID);
    if (!bar) return;
    bar.style.width = '100%';
    window.setTimeout(() => {
      bar.style.opacity = '0';
      bar.style.width = '0';
    }, 140);
  }

  function markSubmitButtonsAsLoading(form) {
    const submitButtons = form.querySelectorAll("button[type='submit'], input[type='submit']");
    submitButtons.forEach((btn) => {
      if (!(btn instanceof HTMLButtonElement || btn instanceof HTMLInputElement)) return;
      if (btn.dataset.appLoadingLock === '1') return;

      btn.dataset.appLoadingLock = '1';
      btn.dataset.appOriginalDisabled = btn.disabled ? '1' : '0';

      if (btn instanceof HTMLButtonElement) {
        btn.dataset.appOriginalLabel = btn.innerHTML;
        btn.classList.add('app-btn-loading');
        btn.innerHTML = 'Processando';
      } else {
        btn.dataset.appOriginalLabel = btn.value;
        btn.value = 'Processando...';
      }

      btn.disabled = true;
    });

    return () => {
      submitButtons.forEach((btn) => {
        if (!(btn instanceof HTMLButtonElement || btn instanceof HTMLInputElement)) return;
        if (btn.dataset.appLoadingLock !== '1') return;

        if (btn instanceof HTMLButtonElement) {
          btn.classList.remove('app-btn-loading');
          if (typeof btn.dataset.appOriginalLabel === 'string') {
            btn.innerHTML = btn.dataset.appOriginalLabel;
          }
        } else if (typeof btn.dataset.appOriginalLabel === 'string') {
          btn.value = btn.dataset.appOriginalLabel;
        }

        btn.disabled = btn.dataset.appOriginalDisabled === '1';
        delete btn.dataset.appLoadingLock;
        delete btn.dataset.appOriginalLabel;
        delete btn.dataset.appOriginalDisabled;
      });
    };
  }

  function handleFormSubmissions() {
    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.dataset.noLoading === 'true') return;

      const isValid = typeof form.checkValidity === 'function' ? form.checkValidity() : true;
      if (!isValid) return;

      pendingAjaxContext = { el: form, at: Date.now() };
      trackUx('form_submit_start', { formId: form.id || null });

      document.body.classList.add('app-busy');
      startProgress();
      announce('Enviando dados. Aguarde.');

      const restoreButtons = markSubmitButtonsAsLoading(form);
      window.setTimeout(() => {
        if (document.visibilityState !== 'visible') return;
        document.body.classList.remove('app-busy');
        completeProgress();
        if (typeof restoreButtons === 'function') restoreButtons();
      }, 8000);
    }, true);

    window.addEventListener('pageshow', () => {
      document.body.classList.remove('app-busy');
    });
  }

  function handleValidationGuidance() {
    document.addEventListener('invalid', (event) => {
      const field = event.target;
      if (!(field instanceof HTMLElement)) return;
      field.classList.add('app-field-invalid');
    }, true);

    document.addEventListener('input', (event) => {
      const field = event.target;
      if (!(field instanceof HTMLElement)) return;
      field.classList.remove('app-field-invalid');
    }, true);

    document.addEventListener('change', (event) => {
      const field = event.target;
      if (!(field instanceof HTMLElement)) return;
      field.classList.remove('app-field-invalid');
    }, true);

    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (typeof form.checkValidity !== 'function' || form.checkValidity()) return;
      trackUx('form_submit_invalid', { formId: form.id || null });

      const firstInvalid = form.querySelector(':invalid');
      if (firstInvalid instanceof HTMLElement) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => {
          if (typeof firstInvalid.focus === 'function') firstInvalid.focus({ preventScroll: true });
        }, 120);
      }
      announce('Existem campos obrigatorios para revisar.');
    }, true);
  }

  function handleAjaxFeedback() {
    const nativeFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
    if (!nativeFetch) return;

    document.addEventListener('click', (event) => {
      const trigger = event.target instanceof Element
        ? event.target.closest("button, .btn, [data-ajax], [onclick], a")
        : null;
      if (!trigger) return;
      pendingAjaxContext = { el: trigger, at: Date.now() };
    }, true);

    window.fetch = async (...args) => {
      const input = args[0];
      const init = args[1] || {};
      const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      const shouldObserve = method !== 'GET' && method !== 'HEAD';
      const startedAt = performance.now();

      try {
        const response = await nativeFetch(...args);
        const duration = Math.round(performance.now() - startedAt);
        if (shouldObserve) {
          let parsed = null;
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            try {
              parsed = await response.clone().json();
            } catch (err) {
              parsed = null;
            }
          }

          const logicalSuccess = parsed && Object.prototype.hasOwnProperty.call(parsed, 'success')
            ? Boolean(parsed.success)
            : response.ok;
          const tone = logicalSuccess ? 'success' : 'error';
          const message = normalizeAjaxMessage(parsed, logicalSuccess);
          const hasRecentContext = pendingAjaxContext && (Date.now() - pendingAjaxContext.at) < 6000;
          const context = hasRecentContext ? pendingAjaxContext : null;

          if (!showInlineFeedback(context, message, tone)) {
            showToast(message, tone);
          }
          announce(message);
          trackUx('ajax_call', {
            method,
            url,
            ok: logicalSuccess,
            status: response.status,
            durationMs: duration,
          });
          pendingAjaxContext = null;
        }
        return response;
      } catch (error) {
        const duration = Math.round(performance.now() - startedAt);
        if (shouldObserve) {
          const message = 'Erro de conexao ao processar a solicitacao.';
          if (!showInlineFeedback(pendingAjaxContext, message, 'error')) {
            showToast(message, 'error');
          }
          announce(message);
          trackUx('ajax_error', { method, url, durationMs: duration, error: String(error && error.message ? error.message : error) });
          pendingAjaxContext = null;
        }
        throw error;
      }
    };
  }

  function handleAdminSkeletonLoading() {
    if (!document.body.classList.contains('admin-panel')) return;
    document.body.classList.add('app-skeletoning');
    window.setTimeout(() => {
      document.body.classList.remove('app-skeletoning');
    }, 700);
  }

  function initializeTelemetry() {
    try {
      const raw = sessionStorage.getItem('appUxTelemetry');
      telemetryStore = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(telemetryStore)) telemetryStore = [];
    } catch (err) {
      telemetryStore = [];
    }

    const startAt = performance.now();
    trackUx('page_view', { title: document.title || null });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        const dwellMs = Math.round(performance.now() - startAt);
        trackUx('page_hidden', { dwellMs });
      }
    });

    window.addEventListener('beforeunload', () => {
      const dwellMs = Math.round(performance.now() - startAt);
      trackUx('page_unload', { dwellMs });
    });

    window.enterpriseUX = {
      track: trackUx,
      getTelemetry: () => [...telemetryStore],
      notifySuccess: (message, element = null) => {
        const ok = showInlineFeedback({ el: element }, message, 'success');
        if (!ok) showToast(message, 'success');
      },
      notifyError: (message, element = null) => {
        const ok = showInlineFeedback({ el: element }, message, 'error');
        if (!ok) showToast(message, 'error');
      },
    };
  }

  function isEligibleLink(link) {
    if (!link || !link.href) return false;
    if (link.target && link.target !== '_self') return false;
    if (link.hasAttribute('download')) return false;
    if (link.getAttribute('data-no-transition') === 'true') return false;
    if (link.getAttribute('href').startsWith('#')) return false;

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    if (url.pathname === window.location.pathname && url.search === window.location.search) return false;
    return true;
  }

  function handlePageLinks() {
    document.addEventListener('click', (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const link = event.target.closest('a[href]');
      if (!isEligibleLink(link)) return;

      event.preventDefault();
      const nextHref = link.href;
      document.body.classList.add(PAGE_LEAVING_CLASS);
      startProgress();
      trackUx('nav_click', { href: nextHref });
      announce('Abrindo pagina.');
      window.setTimeout(() => {
        window.location.href = nextHref;
      }, 180);
    });
  }

  function primePageIn() {
    window.requestAnimationFrame(() => {
      document.body.classList.add(PAGE_READY_CLASS);
    });

    window.addEventListener('pageshow', () => {
      document.body.classList.remove(PAGE_LEAVING_CLASS);
      document.body.classList.add(PAGE_READY_CLASS);
      completeProgress();
    });

    window.addEventListener('beforeunload', () => {
      if (document.body.classList.contains(PAGE_LEAVING_CLASS)) {
        startProgress();
      }
    });
  }

  function activatePaneAnimation(pane) {
    if (!pane) return;
    pane.classList.remove(TAB_ACTIVE_CLASS);
    void pane.offsetWidth;
    pane.classList.add(TAB_ACTIVE_CLASS);
  }

  function handleTabs() {
    const tabContents = document.querySelectorAll('.tab-content');
    if (!tabContents.length) return;

    tabContents.forEach((content) => {
      content.classList.add('app-tab-shell');
      const activePane = content.querySelector('.tab-pane.active, .tab-pane.show.active');
      if (activePane) activePane.classList.add(TAB_ACTIVE_CLASS);
    });

    document.addEventListener('shown.bs.tab', (event) => {
      const trigger = event.target;
      if (!(trigger instanceof Element)) return;
      const selector = trigger.getAttribute('data-bs-target') || trigger.getAttribute('href');
      if (!selector || !selector.startsWith('#')) return;
      const pane = document.querySelector(selector);
      activatePaneAnimation(pane);
    });
  }

  function init() {
    if (!document.body) return;
    injectStyles();
    ensureOverlay();
    ensureProgressBar();
    ensureLiveRegion();
    ensureToastRoot();
    initializeTelemetry();
    handlePageLinks();
    handleFormSubmissions();
    handleValidationGuidance();
    handleAjaxFeedback();
    handleAdminSkeletonLoading();
    handleTabs();
    primePageIn();
    completeProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
