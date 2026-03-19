(() => {
  const STYLE_ID = 'app-page-transitions-style';
  const OVERLAY_ID = 'app-page-transition-overlay';
  const TAB_ACTIVE_CLASS = 'app-tab-active';
  const PAGE_READY_CLASS = 'app-page-ready';
  const PAGE_LEAVING_CLASS = 'app-page-leaving';

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
    handlePageLinks();
    handleTabs();
    primePageIn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
