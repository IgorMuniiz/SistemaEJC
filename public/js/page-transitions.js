(() => {
  const STYLE_ID = 'app-page-transitions-style';
  const OVERLAY_ID = 'app-page-transition-overlay';
  const PROGRESS_ID = 'app-page-progress-bar';
  const LIVE_REGION_ID = 'app-live-region';
  const TOAST_ROOT_ID = 'app-toast-root';
  const TAB_ACTIVE_CLASS = 'app-tab-active';
  const PAGE_READY_CLASS = 'app-page-ready';
  const PAGE_LEAVING_CLASS = 'app-page-leaving';
  const THEME_STORAGE_KEY = 'ejc-ui-theme';
  const THEME_TOGGLE_ID = 'app-theme-toggle';
  const THEME_COLOR_META_ID = 'app-theme-color-meta';
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
        opacity: 1;
        transform: none;
        transition: opacity 110ms ease-out, transform 140ms cubic-bezier(0.16, 1, 0.3, 1);
        will-change: opacity, transform;
      }

      body.${PAGE_READY_CLASS} {
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }

      body.${PAGE_LEAVING_CLASS} {
        opacity: 0.35;
        transform: translate3d(0, 4px, 0);
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
        background: rgba(6, 8, 15, 0.35);
        transition: opacity 100ms ease-out;
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
        transition: width 180ms cubic-bezier(0.2, 1, 0.3, 1), opacity 120ms ease-out;
      }

      body.${PAGE_LEAVING_CLASS} #${PROGRESS_ID} {
        opacity: 1;
      }

      .app-btn-loading {
        position: relative;
        pointer-events: none;
        filter: saturate(1.04);
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
        filter: drop-shadow(0 4px 10px rgba(37, 99, 235, 0.18));
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
        position: relative;
        overflow: hidden;
        border-radius: 12px;
        border: 1px solid rgba(148, 163, 184, 0.32);
        background:
          radial-gradient(circle at top left, rgba(56, 189, 248, 0.12), transparent 26%),
          rgba(15, 23, 42, 0.9);
        color: #e2e8f0;
        padding: 10px 12px;
        font-size: 0.87rem;
        line-height: 1.45;
        box-shadow: 0 18px 40px rgba(2, 6, 23, 0.42);
        backdrop-filter: blur(12px) saturate(1.06);
        opacity: 0;
        transform: translateY(8px);
        animation: appToastIn 200ms ease-out forwards;
      }

      .app-toast::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), transparent 36%);
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
        background:
          linear-gradient(180deg, rgba(15, 23, 42, 0.76), rgba(15, 23, 42, 0.62)),
          linear-gradient(135deg, rgba(56, 189, 248, 0.08), transparent 58%);
        color: #e2e8f0;
        font-size: 0.84rem;
        line-height: 1.4;
        padding: 9px 11px;
        box-shadow: 0 12px 24px rgba(2, 6, 23, 0.16);
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
        opacity: 1;
      }

      .tab-content.app-tab-shell {
        position: relative;
      }

      .tab-content.app-tab-shell > .tab-pane {
        transform-origin: top center;
      }

      .tab-content.app-tab-shell > .tab-pane.fade {
        transition: opacity 100ms ease-out !important;
      }

      .tab-content.app-tab-shell > .tab-pane.${TAB_ACTIVE_CLASS} {
        animation: appTabReveal 150ms cubic-bezier(0.16, 1, 0.3, 1);
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

      @keyframes appThemePulse {
        0% { transform: translateY(0) scale(1); }
        50% { transform: translateY(-2px) scale(1.03); }
        100% { transform: translateY(0) scale(1); }
      }

      @keyframes appThemeSwitchGlow {
        0% { box-shadow: 0 4px 10px rgba(15, 23, 42, 0.1); }
        50% { box-shadow: 0 0 0 6px rgba(96, 165, 250, 0.12), 0 8px 18px rgba(79, 126, 247, 0.18); }
        100% { box-shadow: 0 4px 10px rgba(15, 23, 42, 0.1); }
      }

      @keyframes appThemeThumbSpin {
        0% { transform: scale(1) rotate(0deg); }
        50% { transform: scale(1.08) rotate(180deg); }
        100% { transform: scale(1) rotate(360deg); }
      }

      html[data-theme='dark'] {
        color-scheme: dark;
        background: #06080f;
      }

      html[data-theme='light'] {
        color-scheme: light;
        background: #f6f9ff;
      }

      html.app-theme-animating body,
      html.app-theme-animating body *,
      html.app-theme-animating body::before,
      html.app-theme-animating body::after {
        transition:
          background-color 220ms ease,
          background-image 260ms ease,
          color 220ms ease,
          border-color 220ms ease,
          box-shadow 240ms ease,
          filter 220ms ease !important;
      }

      .app-theme-toggle {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 10002;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 999px;
        border: 1px solid rgba(148, 163, 184, 0.28);
        background: rgba(8, 15, 30, 0.86);
        color: #f8fafc;
        box-shadow: 0 18px 36px rgba(2, 6, 23, 0.34), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
        backdrop-filter: blur(18px) saturate(1.18);
        -webkit-backdrop-filter: blur(18px) saturate(1.18);
        cursor: pointer;
        transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease, border-color 180ms ease;
      }

      .app-theme-toggle--inline {
        position: static;
        right: auto;
        bottom: auto;
        width: 50px;
        min-width: 50px;
        justify-content: center;
        gap: 0;
        margin: 0;
        padding: 4px;
        border-radius: 999px;
        border: 1px solid rgba(148, 163, 184, 0.18);
        background: linear-gradient(135deg, rgba(10, 18, 34, 0.9), rgba(28, 39, 61, 0.84));
        box-shadow:
          0 10px 18px rgba(2, 6, 23, 0.12),
          inset 0 1px 0 rgba(255, 255, 255, 0.07),
          inset 0 -1px 0 rgba(15, 23, 42, 0.2);
        backdrop-filter: blur(14px) saturate(1.08);
        -webkit-backdrop-filter: blur(14px) saturate(1.08);
        overflow: hidden;
        transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease;
      }

      .app-theme-toggle--inline::before {
        content: '';
        position: absolute;
        inset: 1px;
        border-radius: inherit;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.16), transparent 42%, transparent 62%, rgba(255, 255, 255, 0.08));
        pointer-events: none;
        opacity: 0.8;
      }

      .app-theme-toggle__meta {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0;
        min-width: 0;
      }

      .app-theme-toggle__eyebrow {
        display: none;
      }

      .app-theme-toggle--inline .app-theme-toggle__meta {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }

      .app-theme-toggle--inline .app-theme-toggle__label {
        min-width: 0;
        font-size: 0.69rem;
        font-weight: 800;
        letter-spacing: 0.01em;
        line-height: 1;
      }

      .app-theme-toggle-dock {
        display: flex;
        width: auto;
        flex: 0 0 auto;
        margin-top: 14px;
        align-self: flex-start;
      }

      .app-theme-toggle-dock--manager {
        width: 100%;
        justify-content: flex-start;
        align-self: stretch;
        margin-top: 0;
      }

      .app-theme-toggle-dock--home,
      .app-theme-toggle-dock--scoped {
        justify-content: flex-start;
      }

      .app-theme-toggle-dock--scoped {
        width: 100%;
        flex: 0 0 100%;
      }

      .app-theme-toggle-dock--scoped .app-theme-toggle--inline {
        width: 50px;
        min-width: 50px;
      }

      .app-theme-toggle:hover {
        transform: translateY(-2px);
        box-shadow: 0 22px 42px rgba(2, 6, 23, 0.4), 0 0 0 1px rgba(125, 211, 252, 0.12) inset;
      }

      .app-theme-toggle--inline:hover {
        transform: translateY(-1px) scale(1.01);
        border-color: rgba(96, 165, 250, 0.28);
        box-shadow:
          0 16px 30px rgba(37, 99, 235, 0.12),
          0 10px 18px rgba(2, 6, 23, 0.14),
          inset 0 1px 0 rgba(255, 255, 255, 0.12);
      }

      .app-theme-toggle--inline:focus-visible {
        outline: none;
        border-color: rgba(96, 165, 250, 0.4);
        box-shadow:
          0 0 0 4px rgba(96, 165, 250, 0.16),
          0 12px 24px rgba(2, 6, 23, 0.12),
          inset 0 1px 0 rgba(255, 255, 255, 0.12);
      }

      .app-theme-toggle:active {
        transform: translateY(0) scale(0.985);
      }

      .app-theme-toggle.is-switching {
        animation: appThemePulse 320ms cubic-bezier(0.22, 1, 0.36, 1);
      }

      .app-theme-toggle.is-switching .app-theme-toggle__switch {
        animation: appThemeSwitchGlow 420ms cubic-bezier(0.22, 1, 0.36, 1);
      }

      .app-theme-toggle.is-switching .app-theme-toggle__thumb {
        animation: appThemeThumbSpin 420ms cubic-bezier(0.22, 1, 0.36, 1);
      }

      .app-theme-toggle__label {
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0.02em;
        min-width: 48px;
        text-align: left;
      }

      .app-theme-toggle__switch {
        position: relative;
        z-index: 1;
        width: 32px;
        height: 18px;
        border-radius: 999px;
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.22), rgba(124, 58, 237, 0.16));
        border: 1px solid rgba(148, 163, 184, 0.16);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), inset 0 -1px 0 rgba(15, 23, 42, 0.1), 0 4px 10px rgba(15, 23, 42, 0.1);
        overflow: hidden;
        isolation: isolate;
      }

      .app-theme-toggle__switch::after {
        content: '';
        position: absolute;
        inset: 1px;
        border-radius: inherit;
        background: linear-gradient(120deg, transparent 16%, rgba(255, 255, 255, 0.16) 50%, transparent 84%);
        transform: translateX(-120%);
        transition: transform 360ms ease;
        pointer-events: none;
        z-index: 0;
      }

      .app-theme-toggle__switch::before {
        content: '';
        position: absolute;
        inset: 3px;
        border-radius: inherit;
        background: rgba(255, 255, 255, 0.04);
        pointer-events: none;
        z-index: 0;
      }

      .app-theme-toggle:hover .app-theme-toggle__switch::after {
        transform: translateX(120%);
      }

      .app-theme-toggle__thumb {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.94), rgba(191, 219, 254, 0.72) 28%, #60a5fa 62%, #7c3aed 100%);
        box-shadow: 0 3px 8px rgba(37, 99, 235, 0.22), 0 0 0 1px rgba(255, 255, 255, 0.24) inset;
        transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1), background 220ms ease, box-shadow 220ms ease;
        z-index: 2;
      }

      .app-theme-toggle__icon {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        font-size: 0.38rem;
        line-height: 1;
        opacity: 0.42;
        user-select: none;
        transition: opacity 220ms ease, transform 220ms ease, filter 220ms ease;
        z-index: 1;
      }

      .app-theme-toggle__icon--sun {
        left: 5px;
        color: #fbbf24;
      }

      .app-theme-toggle__icon--moon {
        right: 5px;
        color: #c4b5fd;
      }

      html[data-theme='dark'] .app-theme-toggle__icon--moon {
        opacity: 0.9;
        transform: translateY(-50%) scale(1.04);
        filter: drop-shadow(0 0 6px rgba(196, 181, 253, 0.34));
      }

      html[data-theme='dark'] .app-theme-toggle__icon--sun {
        opacity: 0.34;
      }

      html[data-theme='light'] .app-theme-toggle {
        background: rgba(255, 255, 255, 0.88);
        color: #0f172a;
        border-color: rgba(37, 99, 235, 0.16);
        box-shadow: 0 18px 36px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(37, 99, 235, 0.04) inset;
      }

      html[data-theme='light'] .app-theme-toggle--inline {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.995), rgba(240, 246, 255, 0.98));
        border-color: rgba(37, 99, 235, 0.16);
        box-shadow:
          0 14px 26px rgba(37, 99, 235, 0.1),
          0 8px 16px rgba(15, 23, 42, 0.06),
          inset 0 1px 0 rgba(255, 255, 255, 0.72);
      }

      html[data-theme='light'] .app-theme-toggle__eyebrow {
        color: rgba(29, 78, 216, 0.66);
      }

      html[data-theme='light'] .app-theme-toggle__switch {
        background: linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(59, 130, 246, 0.1));
      }

      html[data-theme='light'] .app-theme-toggle__thumb {
        transform: translateX(14px);
        background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.96), rgba(254, 240, 138, 0.76) 26%, #f59e0b 62%, #f97316 100%);
        box-shadow: 0 3px 8px rgba(245, 158, 11, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.38) inset;
      }

      html[data-theme='light'] .app-theme-toggle__icon--sun {
        opacity: 0.9;
        transform: translateY(-50%) scale(1.04);
        filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.32));
      }

      html[data-theme='light'] .app-theme-toggle__icon--moon {
        opacity: 0.34;
      }

      html[data-theme='light'] body.admin-panel {
        background:
          radial-gradient(120% 90% at 10% 0%, rgba(56, 189, 248, 0.12) 0%, transparent 55%),
          radial-gradient(100% 80% at 92% 8%, rgba(139, 92, 246, 0.1) 0%, transparent 58%),
          linear-gradient(180deg, #f7fbff 0%, #eef4ff 100%) !important;
        color: #0f172a !important;
      }

      html[data-theme='light'] body.admin-panel .admin-background {
        background:
          radial-gradient(circle at 15% 48%, rgba(136, 192, 185, 0.16) 0%, transparent 50%),
          radial-gradient(circle at 82% 82%, rgba(207, 154, 103, 0.14) 0%, transparent 50%),
          linear-gradient(155deg, #f7fbff 0%, #eef4ff 42%, #e5eefb 100%) !important;
      }

      html[data-theme='light'] body.admin-panel :is(.sidebar, .surface, .admin-form-card, .admin-config-card, .admin-mini-panel, .table-wrap, .admin-table-card, .tab-workspace-head, .workspace-hero, .principal-kpi-card, .gastos-table-shell, .subequipe-feature-card, .subequipe-feature-card-link, .slc-card, .card-option, .modal-content) {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(241, 245, 255, 0.92)) !important;
        border-color: rgba(148, 163, 184, 0.22) !important;
        color: #0f172a !important;
        box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08) !important;
      }

      html[data-theme='light'] body.admin-panel :is(.table thead th, .entity-head, .admin-card-head) {
        background: rgba(226, 236, 252, 0.92) !important;
        border-color: rgba(148, 163, 184, 0.2) !important;
      }

      html[data-theme='light'] body.admin-panel :is(.menu-btn, .nav-tabs .nav-link, .admin-card-badge, .card-button, .subeq-chip, .slc-btn--icon) {
        background: rgba(37, 99, 235, 0.08) !important;
        color: #1e293b !important;
        border-color: rgba(37, 99, 235, 0.16) !important;
      }

      html[data-theme='light'] body.admin-panel .menu-btn.active,
      html[data-theme='light'] body.admin-panel .nav-tabs .nav-link.active {
        background: linear-gradient(135deg, #2563eb 0%, #60a5fa 100%) !important;
        color: #ffffff !important;
      }

      html[data-theme='light'] body.admin-panel :is(.form-control, .form-select, textarea, input[type='text'], input[type='email'], input[type='tel'], input[type='number'], input[type='date'], input[type='password']) {
        background: rgba(248, 250, 252, 0.96) !important;
        color: #0f172a !important;
        -webkit-text-fill-color: #0f172a !important;
        border-color: rgba(148, 163, 184, 0.34) !important;
        box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.06) !important;
      }

      html[data-theme='light'] body.admin-panel :is(h1, h2, h3, h4, h5, h6, strong, label, legend, th, td, .card-title, .modal-title, .surface-head, .workspace-title-main, .workspace-title-sub, .slc-title, .admin-card-kicker, .admin-header h1) {
        color: #0f172a !important;
      }

      html[data-theme='light'] body.admin-panel :is(p, small, .text-muted, .form-text, .muted, .card-description, .admin-header p, .sidebar .subtitle, .slc-subtitle, .slc-exp, .slc-validity__label, .slc-validity__hint, .entity-counter) {
        color: rgba(51, 65, 85, 0.82) !important;
      }

      html[data-theme='light'] body.admin-home-page {
        --studio-ink: #0f172a;
        --studio-muted: rgba(51, 65, 85, 0.84);
        --studio-surface: rgba(255, 255, 255, 0.94);
      }

      html[data-theme='light'] body.admin-home-page .admin-header h1 {
        background: none !important;
        -webkit-text-fill-color: #0f172a !important;
        color: #0f172a !important;
        text-shadow: none !important;
      }

      html[data-theme='light'] body.admin-home-page .user-info-badge {
        background: linear-gradient(130deg, rgba(37, 99, 235, 0.08), rgba(255, 255, 255, 0.92)) !important;
        border-color: rgba(37, 99, 235, 0.18) !important;
        color: #1e293b !important;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08) !important;
      }

      html[data-theme='light'] body.admin-home-page .user-info-badge strong {
        color: #0f172a !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .topbar.workspace-hero-manager {
        isolation: isolate;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(239, 246, 255, 0.94)) !important;
        border-color: rgba(148, 163, 184, 0.24) !important;
        box-shadow: 0 16px 34px rgba(15, 23, 42, 0.08) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .topbar.workspace-hero-manager::before {
        mix-blend-mode: normal;
        opacity: 0.22;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .topbar.workspace-hero-manager > * {
        position: relative;
        z-index: 1;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(.workspace-title, .workspace-title-kicker, .workspace-title-main, .manager-module-title, .workspace-stat-card .stat-value, .hero-admin-meta strong, .principal-finance-category-item .category-top strong, .principal-finance-extrato-list .extrato-row strong) {
        color: #0f172a !important;
        text-shadow: none !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(.workspace-hero-note, .workspace-hero-main p, .manager-module-subtitle, .manager-shortcut-hint, .manager-shortcut-chip small, .workspace-stat-card .stat-label, .hero-admin-meta small, .principal-finance-legend, .principal-finance-empty, .principal-finance-category-item .category-top, .principal-finance-extrato-list .extrato-row) {
        color: rgba(51, 65, 85, 0.9) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(.event-scope-switch, .hero-strip-pill, .workspace-stat-card, .hero-admin-pill, .manager-module-card, .manager-module-card.active, .manager-shortcut-hint, .manager-shortcut-chip, .principal-finance-category-panel, .principal-finance-extrato-panel) {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(243, 247, 255, 0.94)) !important;
        border-color: rgba(148, 163, 184, 0.24) !important;
        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(.workspace-title-icon, .manager-module-icon) {
        background: linear-gradient(145deg, rgba(37, 99, 235, 0.12), rgba(255, 255, 255, 0.95)) !important;
        border-color: rgba(37, 99, 235, 0.22) !important;
        color: #1d4ed8 !important;
        box-shadow: none !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .manager-module-count {
        background: rgba(37, 99, 235, 0.08) !important;
        border-color: rgba(37, 99, 235, 0.18) !important;
        color: #1d4ed8 !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .workspace-title {
        color: #0f172a !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .workspace-title-copy {
        padding: 10px 14px 11px !important;
        border-radius: 16px !important;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(241, 246, 255, 0.96)) !important;
        border: 1px solid rgba(96, 165, 250, 0.24) !important;
        box-shadow: 0 12px 28px rgba(37, 99, 235, 0.08) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .workspace-title-kicker {
        color: #1e40af !important;
        letter-spacing: 0.18em !important;
        font-weight: 900 !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .workspace-title-main {
        display: inline-block;
        background: linear-gradient(135deg, #1d4ed8 0%, #7c3aed 58%, #ec4899 100%) !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        color: #1d4ed8 !important;
        text-shadow: none !important;
        filter: none !important;
        opacity: 1 !important;
        font-size: clamp(1.46rem, 2.55vw, 2.12rem) !important;
        font-weight: 900 !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .hero-strip-pill {
        color: #334155 !important;
        font-weight: 800 !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .hero-strip-pill strong {
        color: #0f172a !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .event-scope-btn {
        color: #1e293b !important;
        font-weight: 800 !important;
        background: rgba(255, 255, 255, 0.92) !important;
        border-color: rgba(148, 163, 184, 0.24) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .event-scope-btn.active {
        color: #ffffff !important;
        background: linear-gradient(135deg, #2563eb 0%, #4f8cff 100%) !important;
        border-color: rgba(37, 99, 235, 0.32) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .event-scope-btn.active i {
        color: #ffffff !important;
        background: rgba(255, 255, 255, 0.18) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp :is(.workspace-title-icon, .hero-admin-avatar, .manager-module-icon, .sidebar .menu-link i) {
        box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .manager-module-card[data-tab-target='principal-tab'] .manager-module-icon,
      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .sidebar .menu-link[data-tab-target='principal-tab'] i {
        color: #047857 !important;
        background: linear-gradient(145deg, rgba(16, 185, 129, 0.2), rgba(236, 253, 245, 0.98)) !important;
        border-color: rgba(16, 185, 129, 0.3) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .manager-module-card[data-tab-target='encontristas-tab'] .manager-module-icon,
      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .sidebar .menu-link[data-tab-target='encontristas-tab'] i {
        color: #1d4ed8 !important;
        background: linear-gradient(145deg, rgba(59, 130, 246, 0.2), rgba(239, 246, 255, 0.98)) !important;
        border-color: rgba(59, 130, 246, 0.3) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .manager-module-card[data-tab-target='encontreiros-tab'] .manager-module-icon,
      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .sidebar .menu-link[data-tab-target='encontreiros-tab'] i {
        color: #4338ca !important;
        background: linear-gradient(145deg, rgba(129, 140, 248, 0.22), rgba(238, 242, 255, 0.98)) !important;
        border-color: rgba(129, 140, 248, 0.32) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .manager-module-card[data-tab-target='tios-tab'] .manager-module-icon,
      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .sidebar .menu-link[data-tab-target='tios-tab'] i {
        color: #be185d !important;
        background: linear-gradient(145deg, rgba(244, 114, 182, 0.2), rgba(253, 242, 248, 0.98)) !important;
        border-color: rgba(244, 114, 182, 0.3) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .manager-module-card[data-tab-target='aprovacoes-tab'] .manager-module-icon,
      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .sidebar .menu-link[data-tab-target='aprovacoes-tab'] i {
        color: #b45309 !important;
        background: linear-gradient(145deg, rgba(251, 191, 36, 0.22), rgba(255, 251, 235, 0.98)) !important;
        border-color: rgba(245, 158, 11, 0.32) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .manager-module-card[data-tab-target='encontros-tab'] .manager-module-icon,
      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .sidebar .menu-link[data-tab-target='encontros-tab'] i {
        color: #0f766e !important;
        background: linear-gradient(145deg, rgba(34, 211, 238, 0.22), rgba(236, 254, 255, 0.98)) !important;
        border-color: rgba(6, 182, 212, 0.32) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .manager-module-card[data-tab-target='administradores-tab'] .manager-module-icon,
      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .sidebar .menu-link[data-tab-target='administradores-tab'] i {
        color: #7c3aed !important;
        background: linear-gradient(145deg, rgba(192, 132, 252, 0.22), rgba(245, 243, 255, 0.98)) !important;
        border-color: rgba(168, 85, 247, 0.32) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .sidebar .menu-link[data-menu-title='Sair'] i {
        color: #e11d48 !important;
        background: linear-gradient(145deg, rgba(251, 113, 133, 0.22), rgba(255, 241, 242, 0.98)) !important;
        border-color: rgba(244, 63, 94, 0.32) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .sidebar {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(240, 246, 255, 0.92)) !important;
        border-color: rgba(96, 165, 250, 0.16) !important;
        box-shadow: 0 18px 40px rgba(37, 99, 235, 0.08), 0 8px 18px rgba(15, 23, 42, 0.04) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .sidebar::before {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.58), rgba(191, 219, 254, 0.08), transparent) !important;
        opacity: 1 !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .sidebar::after {
        background: radial-gradient(circle at 50% 0%, rgba(96, 165, 250, 0.2), transparent 62%) !important;
        opacity: 0.65 !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .sidebar .menu-link {
        color: #334155 !important;
        border-color: transparent !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .sidebar .menu-link:hover,
      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .sidebar .menu-link.active {
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(255, 255, 255, 0.95)) !important;
        border-color: rgba(96, 165, 250, 0.22) !important;
        color: #0f172a !important;
        box-shadow: 0 10px 20px rgba(37, 99, 235, 0.08) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp #cadastroTabs {
        padding: 6px;
        border-radius: 16px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(241, 245, 255, 0.88)) !important;
        border: 1px solid rgba(96, 165, 250, 0.14) !important;
        box-shadow: 0 10px 24px rgba(37, 99, 235, 0.06) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp #cadastroTabs .nav-link {
        color: #475569 !important;
        border-radius: 12px !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp #cadastroTabs .nav-link:hover {
        background: rgba(37, 99, 235, 0.08) !important;
        color: #1e293b !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .tab-content > .tab-pane {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(245, 248, 255, 0.9)) !important;
        border: 1px solid rgba(96, 165, 250, 0.14) !important;
        box-shadow: 0 16px 34px rgba(37, 99, 235, 0.06), 0 8px 16px rgba(15, 23, 42, 0.03) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp .table-wrap {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 249, 255, 0.95)) !important;
        border-color: rgba(96, 165, 250, 0.14) !important;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75), 0 10px 22px rgba(37, 99, 235, 0.05) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp thead th {
        background: linear-gradient(180deg, #f8fbff 0%, #e8f1ff 100%) !important;
        color: #334155 !important;
        border-bottom: 1px solid rgba(96, 165, 250, 0.16) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp tbody tr {
        background: rgba(255, 255, 255, 0.9) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp tbody tr:nth-child(even) {
        background: rgba(247, 250, 255, 0.96) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp tbody tr:hover {
        background: rgba(232, 242, 255, 0.94) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp td {
        color: #334155 !important;
        border-color: rgba(148, 163, 184, 0.14) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page.admin-manager-revamp td:nth-child(2) {
        color: #0f172a !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .manager-shortcut-chip kbd {
        background: rgba(255, 255, 255, 0.92) !important;
        border-color: rgba(37, 99, 235, 0.2) !important;
        color: #1d4ed8 !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .event-scope-btn {
        color: #334155 !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(.event-scope-btn i, .hero-strip-pill i) {
        background: rgba(37, 99, 235, 0.12) !important;
        color: #1d4ed8 !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .event-scope-btn:hover:not(:disabled) {
        color: #0f172a !important;
        background: rgba(37, 99, 235, 0.08) !important;
        border-color: rgba(37, 99, 235, 0.16) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .event-scope-btn.active {
        color: #ffffff !important;
        border-color: rgba(37, 99, 235, 0.4) !important;
        background: linear-gradient(135deg, #2563eb 0%, #60a5fa 100%) !important;
        box-shadow: 0 10px 20px rgba(37, 99, 235, 0.18) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .event-scope-btn.active i {
        background: rgba(255, 255, 255, 0.18) !important;
        color: #ffffff !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .principal-finance-empty {
        background: rgba(248, 250, 252, 0.96) !important;
        border-color: rgba(148, 163, 184, 0.26) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(.principal-finance-kpi-card, .principal-finance-donut-center, .admin-mini-panel, .admin-switch-row) {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(243, 247, 255, 0.95)) !important;
        border-color: rgba(148, 163, 184, 0.24) !important;
        box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .principal-finance-donut-center {
        box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.12) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(.principal-finance-kpi-card strong, .principal-finance-donut-center strong, .admin-mini-panel-head .card-title, .admin-switch-row .form-check-label) {
        color: #0f172a !important;
        text-shadow: none !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(.principal-finance-kpi-card small, .principal-finance-kpi-card span, .principal-finance-donut-center span, .principal-finance-board-head span, .principal-finance-card-head span, .admin-mini-panel-subtitle, .admin-config-card .form-check-label, .admin-config-card p, .admin-config-card li, .admin-block-fields .text-muted, .admin-block-fields small) {
        color: rgba(51, 65, 85, 0.84) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(.principal-finance-kpi-card .kpi-icon, .admin-mini-panel-head .card-title i) {
        background: rgba(37, 99, 235, 0.12) !important;
        color: #1d4ed8 !important;
        border-color: rgba(37, 99, 235, 0.2) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(.principal-finance-card-head span, .principal-finance-board-head span) {
        background: rgba(37, 99, 235, 0.08) !important;
        border-color: rgba(37, 99, 235, 0.16) !important;
        color: #334155 !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(.principal-finance-category-item .category-bar, .principal-finance-extrato-list .extrato-bar) {
        background: rgba(226, 232, 240, 0.88) !important;
        border-color: rgba(148, 163, 184, 0.22) !important;
      }

      html[data-theme='dark'] body.admin-panel {
        color: #f8fafc !important;
      }

      html[data-theme='dark'] body.admin-panel :is(.sidebar, .surface, .admin-form-card, .admin-config-card, .admin-mini-panel, .table-wrap, .admin-table-card, .tab-workspace-head, .workspace-hero, .principal-kpi-card, .gastos-table-shell, .subequipe-feature-card, .subequipe-feature-card-link, .slc-card, .card-option, .modal-content) {
        background: linear-gradient(180deg, rgba(8, 15, 30, 0.92), rgba(15, 23, 42, 0.78)) !important;
        border-color: rgba(148, 163, 184, 0.18) !important;
        color: #f8fafc !important;
        box-shadow: 0 18px 36px rgba(2, 6, 23, 0.28) !important;
      }

      html[data-theme='dark'] body.admin-panel :is(.form-control, .form-select, textarea, input[type='text'], input[type='email'], input[type='tel'], input[type='number'], input[type='date'], input[type='password']) {
        background: rgba(7, 15, 34, 0.92) !important;
        color: #f8fafc !important;
        -webkit-text-fill-color: #f8fafc !important;
        border-color: rgba(148, 163, 184, 0.32) !important;
      }

      html[data-theme='dark'] body.admin-panel :is(h1, h2, h3, h4, h5, h6, strong, label, legend, th, td, .card-title, .modal-title, .surface-head, .workspace-title-main, .workspace-title-sub, .slc-title, .admin-card-kicker, .admin-header h1) {
        color: #f8fafc !important;
      }

      html[data-theme='dark'] body.admin-panel :is(p, small, .text-muted, .form-text, .muted, .card-description, .admin-header p, .sidebar .subtitle, .slc-subtitle, .slc-exp, .slc-validity__label, .slc-validity__hint, .entity-counter) {
        color: rgba(226, 232, 240, 0.84) !important;
      }

      html[data-theme='light'] body:not(.admin-panel) {
        background:
          radial-gradient(circle at 8% 15%, rgba(79, 142, 247, 0.12), transparent 32%),
          radial-gradient(circle at 92% 12%, rgba(167, 139, 250, 0.1), transparent 32%),
          radial-gradient(circle at 50% 96%, rgba(52, 211, 153, 0.08), transparent 32%),
          linear-gradient(155deg, #f7fbff 0%, #eef4ff 55%, #e6eefb 100%) !important;
        color: #0f172a !important;
      }

      html[data-theme='light'] body:not(.admin-panel) :is(.inicio, .form-card, .portal-success-shell, .hero-panel, .metric-card, .cta-card, .feature-item, .studio-reel-frame, .home-shell, .hero, .actions) {
        background: rgba(255, 255, 255, 0.9) !important;
        border-color: rgba(148, 163, 184, 0.2) !important;
        box-shadow: 0 16px 32px rgba(15, 23, 42, 0.1) !important;
        color: #0f172a !important;
      }

      html[data-theme='light'] body:not(.admin-panel) :is(h1, h2, h3, h4, h5, h6, strong, .hero-title-sub, .studio-reel-title, .cta-title, .metric-value, .portal-success-title) {
        color: #0f172a !important;
      }

      html[data-theme='light'] body:not(.admin-panel) :is(p, small, label, .text-muted, .form-text, .slogan, .hero-description, .metric-label, .metric-note, .cta-text, .cta-link-text, .feature-text, .portal-success-text) {
        color: rgba(51, 65, 85, 0.82) !important;
      }

      html[data-theme='light'] body :is(.btn-primary, .btn-success, .btn-secondary, .btn-danger, .nav-cta-btn, .entity-export-btn, .menu-btn.active, .nav-tabs .nav-link.active),
      html[data-theme='light'] body :is(.btn-primary, .btn-success, .btn-secondary, .btn-danger, .nav-cta-btn, .entity-export-btn, .menu-btn.active, .nav-tabs .nav-link.active) * {
        color: #ffffff !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(
        #gastos .gastos-form-card,
        #gastos .gastos-summary-card,
        #gastos .gastos-table-wrap,
        #gastos .gastos-toolbar,
        #gastos .financeiro-command-center,
        #gastos .financeiro-command-card,
        #gastos .financeiro-overview-card,
        #gastos .financeiro-toolbar-note,
        #gastos .gastos-form-block,
        #gastos .financeiro-summary-spotlight,
        #gastos .financeiro-summary-spotlight.is-cash,
        #gastos .gastos-kpi-card,
        #gastos .gastos-insight-card,
        #gastos .financeiro-extrato-card,
        #gastos .gastos-distribution-card,
        #gastos .gastos-collapse-icon,
        .import-panel,
        .import-toggle-card,
        .import-complete-callout,
        #import_encontro_resumo,
        .admin-import-card .form-check
      ) {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(243, 247, 255, 0.94)) !important;
        border-color: rgba(148, 163, 184, 0.24) !important;
        color: #0f172a !important;
        box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(
        #gastos .gastos-card-kicker,
        #gastos .financeiro-command-kicker,
        #gastos .financeiro-summary-spotlight-label,
        #gastos .gastos-insight-label,
        #gastos .financeiro-overview-label,
        #gastos .financeiro-command-card span,
        .import-complete-callout-title,
        .import-toggle-card .form-check-label
      ) {
        color: #1d4ed8 !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(
        #gastos .gastos-card-subtitle,
        #gastos .financeiro-command-primary p,
        #gastos .financeiro-command-card small,
        #gastos .gastos-kpi-meta,
        #gastos .gastos-field-hint,
        #gastos .financeiro-summary-spotlight small,
        #gastos .gastos-insight-card small,
        #gastos .financeiro-overview-card small,
        .import-toggle-card small,
        .financeiro-toolbar-note,
        #import_encontro_resumo,
        .admin-helper-note
      ) {
        color: rgba(51, 65, 85, 0.82) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(
        #gastos .gastos-form .form-control,
        #gastos .gastos-form .form-select,
        .admin-form-card .form-control,
        .admin-form-card .form-select,
        .admin-config-card .form-control,
        .admin-config-card .form-select,
        .table-wrap .form-control,
        .table-wrap .form-select,
        textarea
      ) {
        background: rgba(248, 250, 252, 0.98) !important;
        color: #0f172a !important;
        -webkit-text-fill-color: #0f172a !important;
        border-color: rgba(148, 163, 184, 0.34) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(
        #gastos .gastos-card-pill,
        #gastos .gastos-assurance-strip span,
        #gastos .gastos-summary-badge,
        #gastos .gastos-table-badge,
        .import-ux-chip,
        .import-context-pill,
        .tab-chip
      ) {
        background: rgba(37, 99, 235, 0.08) !important;
        color: #1e293b !important;
        border-color: rgba(37, 99, 235, 0.18) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(
        #gastos .financeiro-command-primary h6,
        #gastos .financeiro-command-card strong,
        #gastos .financeiro-overview-card strong
      ) {
        color: #0f172a !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .sidebar:not(:hover) .menu-link i {
        color: rgba(30, 41, 59, 0.76) !important;
        filter: none !important;
        animation: none !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .sidebar:hover .menu-link i {
        color: rgba(51, 65, 85, 0.88) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .sidebar .menu-link.active i {
        color: #1d4ed8 !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(
        #admins-list-card,
        #admins-audit-card,
        .admin-admins-card,
        .admin-table-shell
      ) {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(243, 247, 255, 0.95)) !important;
        border-color: rgba(148, 163, 184, 0.24) !important;
        box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(
        #admins-list-card .admin-card-kicker,
        #admins-audit-card .admin-card-kicker,
        #admins-list-card .admin-card-subtitle,
        #admins-audit-card .admin-card-subtitle,
        #admins-list-card .table tbody small,
        #admins-audit-card .table tbody small
      ) {
        color: #475569 !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(
        #admins-list-card .table thead th,
        #admins-audit-card .table thead th
      ) {
        background: linear-gradient(180deg, #edf4ff 0%, #dfeafe 100%) !important;
        color: #334155 !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(
        #admins-list-card .table tbody td,
        #admins-list-card .table tbody td strong,
        #admins-audit-card .table tbody td,
        #admins-audit-card .table tbody td strong
      ) {
        color: #0f172a !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(
        #admins-list-card .status-badge,
        #admins-audit-card .status-badge
      ) {
        background: rgba(37, 99, 235, 0.12) !important;
        color: #1d4ed8 !important;
        border: 1px solid rgba(37, 99, 235, 0.22) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(.btn-edit, .js-edit-admin) {
        background: rgba(37, 99, 235, 0.12) !important;
        color: #1d4ed8 !important;
        border-color: rgba(37, 99, 235, 0.28) !important;
        opacity: 1 !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(.btn-edit, .js-edit-admin):hover {
        background: #2563eb !important;
        color: #ffffff !important;
        border-color: #2563eb !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(.btn-delete, .js-delete-admin) {
        background: rgba(239, 68, 68, 0.1) !important;
        color: #b91c1c !important;
        border-color: rgba(239, 68, 68, 0.26) !important;
        opacity: 1 !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(.btn-delete, .js-delete-admin):hover {
        background: #dc2626 !important;
        color: #ffffff !important;
        border-color: #dc2626 !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page :is(.search-toolbar, .transfer-lote-bar) {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(241, 245, 255, 0.93)) !important;
        border: 1px solid rgba(148, 163, 184, 0.22) !important;
        border-radius: 16px !important;
        box-shadow: 0 12px 24px rgba(15, 23, 42, 0.06) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .search-toolbar {
        justify-content: space-between !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .search-input-wrap {
        flex: 1 1 320px !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .search-input-wrap i {
        color: #60a5fa !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .search-input {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96)) !important;
        color: #0f172a !important;
        border-color: rgba(148, 163, 184, 0.28) !important;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .search-input::placeholder {
        color: #64748b !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .btn-clear-search {
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(255, 255, 255, 0.95)) !important;
        color: #1e40af !important;
        border-color: rgba(96, 165, 250, 0.28) !important;
        box-shadow: 0 8px 18px rgba(37, 99, 235, 0.08) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .btn-clear-search:hover {
        background: linear-gradient(135deg, #2563eb, #60a5fa) !important;
        color: #ffffff !important;
        border-color: rgba(37, 99, 235, 0.4) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .transfer-lote-bar small {
        color: #475569 !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .approval-metric-card {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(241, 245, 255, 0.94)) !important;
        border-color: rgba(148, 163, 184, 0.24) !important;
        box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .approval-metric-card.approval-metric-card-attention {
        background: linear-gradient(180deg, rgba(255, 251, 235, 0.98), rgba(254, 243, 199, 0.7)) !important;
        border-color: rgba(245, 158, 11, 0.28) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .approval-metric-card.approval-metric-card-critical {
        background: linear-gradient(180deg, rgba(255, 241, 242, 0.98), rgba(254, 226, 226, 0.74)) !important;
        border-color: rgba(239, 68, 68, 0.28) !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .approval-metric-icon {
        background: rgba(37, 99, 235, 0.08) !important;
        border-color: rgba(96, 165, 250, 0.24) !important;
        color: #1d4ed8 !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .approval-metric-icon-pending {
        background: rgba(245, 158, 11, 0.12) !important;
        border-color: rgba(245, 158, 11, 0.24) !important;
        color: #b45309 !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .approval-metric-icon-ok {
        background: rgba(16, 185, 129, 0.12) !important;
        border-color: rgba(16, 185, 129, 0.22) !important;
        color: #047857 !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .approval-metric-icon-info {
        background: rgba(59, 130, 246, 0.12) !important;
        border-color: rgba(59, 130, 246, 0.22) !important;
        color: #1d4ed8 !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .approval-metric-label {
        color: #64748b !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .approval-metric-value {
        color: #0f172a !important;
        text-shadow: none !important;
      }

      html[data-theme='light'] body.admin-panel.admin-manager-page .approval-metric-note {
        color: #475569 !important;
      }

      html[data-theme='light'] body:not(.admin-panel) :is(
        .home-shell,
        .hero,
        .actions,
        .choice-card,
        .logo-wrap,
        .metric-chip,
        .admin-link a
      ) {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(244, 248, 255, 0.92)) !important;
        border-color: rgba(148, 163, 184, 0.22) !important;
        color: #0f172a !important;
        box-shadow: 0 16px 32px rgba(15, 23, 42, 0.1) !important;
      }

      html[data-theme='light'] body:not(.admin-panel) :is(
        .choice-title,
        .choice-description,
        .choice-arrow,
        .brand-text,
        .hero-subtitle,
        .metric-chip,
        .admin-link a
      ) {
        color: rgba(51, 65, 85, 0.84) !important;
      }

      @media (prefers-reduced-motion: reduce) {
        .app-theme-toggle,
        .app-theme-toggle__thumb,
        html.app-theme-animating body,
        html.app-theme-animating body * { 
          transition: none !important;
          animation: none !important;
        }

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

  function getStoredTheme() {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      return stored === 'light' || stored === 'dark' ? stored : null;
    } catch (err) {
      return null;
    }
  }

  function getThemeLock() {
    const rootThemeLock = document.documentElement ? document.documentElement.getAttribute('data-theme-lock') : null;
    if (rootThemeLock === 'light' || rootThemeLock === 'dark') return rootThemeLock;

    const bodyThemeLock = document.body ? document.body.getAttribute('data-theme-lock') : null;
    if (bodyThemeLock === 'light' || bodyThemeLock === 'dark') return bodyThemeLock;

    return null;
  }

  function resolveTheme() {
    const lockedTheme = getThemeLock();
    if (lockedTheme) return lockedTheme;

    const stored = getStoredTheme();
    if (stored) return stored;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function updateThemeMeta(theme) {
    if (!document.head) return;
    const content = theme === 'light' ? '#f7fbff' : '#06080f';
    let meta = document.getElementById(THEME_COLOR_META_ID);
    if (!meta) {
      meta = document.createElement('meta');
      meta.id = THEME_COLOR_META_ID;
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  }

  function syncThemeToggle(theme) {
    const toggle = document.getElementById(THEME_TOGGLE_ID);
    if (!toggle) return;
    const label = toggle.querySelector('.app-theme-toggle__label');
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    toggle.dataset.themeState = theme;
    toggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    toggle.setAttribute('title', nextTheme === 'light' ? 'Trocar para tema claro' : 'Trocar para tema escuro');
    toggle.setAttribute('aria-label', nextTheme === 'light' ? 'Trocar para tema claro' : 'Trocar para tema escuro');
    if (label) {
      label.textContent = theme === 'dark' ? 'Escuro' : 'Claro';
    }
  }

  function animateThemeTransition() {
    const root = document.documentElement;
    root.classList.remove('app-theme-animating');
    void root.offsetWidth;
    root.classList.add('app-theme-animating');
    window.setTimeout(() => {
      root.classList.remove('app-theme-animating');
    }, 320);
  }

  function applyTheme(theme, options = {}) {
    const lockedTheme = getThemeLock();
    const resolvedTheme = lockedTheme || (theme === 'light' ? 'light' : 'dark');
    const shouldPersist = options.persist !== false;
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;
    updateThemeMeta(resolvedTheme);
    syncThemeToggle(resolvedTheme);

    if (shouldPersist && !lockedTheme) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, resolvedTheme);
      } catch (err) {
        // ignore storage errors
      }
    }
  }

  function initializeThemeSystem() {
    const initialTheme = resolveTheme();
    document.documentElement.setAttribute('data-theme', initialTheme);
    document.documentElement.style.colorScheme = initialTheme;
    updateThemeMeta(initialTheme);

    if (window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const onSystemThemeChange = (event) => {
        if (getStoredTheme()) return;
        applyTheme(event.matches ? 'dark' : 'light', { persist: false });
      };

      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', onSystemThemeChange);
      } else if (typeof media.addListener === 'function') {
        media.addListener(onSystemThemeChange);
      }
    }
  }

  function resolveThemeToggleHost() {
    return (
      document.querySelector('.hero-admin-theme-slot')
      || document.querySelector('.hero-admin-pill')
      || document.querySelector('.user-info-badge')
      || document.querySelector('.event-scope-workbench')
    );
  }

  function placeThemeToggle(toggle) {
    if (!toggle || !document.body) return;

    const host = resolveThemeToggleHost();
    if (!host) {
      toggle.classList.remove('app-theme-toggle--inline');
      if (toggle.parentElement !== document.body) {
        document.body.appendChild(toggle);
      }
      return;
    }

    let dock = host.classList.contains('app-theme-toggle-dock') ? host : host.nextElementSibling;
    if (!dock || !dock.classList.contains('app-theme-toggle-dock')) {
      dock = document.createElement('div');
      dock.className = 'app-theme-toggle-dock';
      host.insertAdjacentElement('afterend', dock);
    }

    dock.classList.toggle('app-theme-toggle-dock--manager', host.classList.contains('hero-admin-pill') || host.classList.contains('hero-admin-theme-slot'));
    dock.classList.toggle('app-theme-toggle-dock--home', host.classList.contains('user-info-badge'));
    dock.classList.toggle('app-theme-toggle-dock--scoped', host.classList.contains('event-scope-workbench'));

    toggle.classList.add('app-theme-toggle--inline');
    if (toggle.parentElement !== dock) {
      dock.appendChild(toggle);
    }
  }

  function ensureThemeToggle() {
    if (!document.body) return;

    if (getThemeLock()) {
      const existingToggle = document.getElementById(THEME_TOGGLE_ID);
      if (existingToggle) existingToggle.remove();
      return;
    }

    let toggle = document.getElementById(THEME_TOGGLE_ID);
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.id = THEME_TOGGLE_ID;
      toggle.type = 'button';
      toggle.className = 'app-theme-toggle';
      toggle.innerHTML = `
        <span class="app-theme-toggle__meta">
          <span class="app-theme-toggle__eyebrow">Aparência</span>
          <span class="app-theme-toggle__label">Escuro</span>
        </span>
        <span class="app-theme-toggle__switch" aria-hidden="true">
          <span class="app-theme-toggle__icon app-theme-toggle__icon--sun">☀</span>
          <span class="app-theme-toggle__thumb"></span>
          <span class="app-theme-toggle__icon app-theme-toggle__icon--moon">☾</span>
        </span>
      `;

      toggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        toggle.classList.remove('is-switching');
        void toggle.offsetWidth;
        toggle.classList.add('is-switching');
        animateThemeTransition();
        applyTheme(nextTheme);
        trackUx('theme_change', { theme: nextTheme });
        showToast(nextTheme === 'dark' ? 'Tema escuro ativado.' : 'Tema claro ativado.', 'success');
      });
    }

    placeThemeToggle(toggle);
    syncThemeToggle(resolveTheme());
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
      }, 40);
  }

  function completeProgress() {
    const bar = document.getElementById(PROGRESS_ID);
    if (!bar) return;
    bar.style.width = '100%';
    window.setTimeout(() => {
      bar.style.opacity = '0';
      bar.style.width = '0';
    }, 80);
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
      trackUx('nav_click', { href: nextHref });
      window.location.href = nextHref;
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
      // sem ação ao sair
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
    applyTheme(resolveTheme(), { persist: false });
    ensureOverlay();
    ensureProgressBar();
    ensureLiveRegion();
    ensureToastRoot();
    ensureThemeToggle();
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

  initializeThemeSystem();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
