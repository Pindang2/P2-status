/**
 * P2-status — 공통 유틸리티
 * 토스트 알림, 모달, 네비게이션 헬퍼
 */

/* ──────────────────────────────────────────
   Toast Notifications
   ────────────────────────────────────────── */
const ToastManager = (() => {
  let container = null;

  function ensureContainer() {
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * 토스트 알림을 표시한다.
   * @param {string} message 
   * @param {'success'|'error'|'info'} type 
   * @param {number} duration ms
   */
  function show(message, type = 'info', duration = 3000) {
    const c = ensureContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
    c.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      toast.addEventListener('animationend', () => toast.remove());
    }, duration);
  }

  return { show };
})();

/* ──────────────────────────────────────────
   Modal Helper
   ────────────────────────────────────────── */
const ModalManager = (() => {
  /**
   * 모달을 열고 Promise를 반환한다.
   * @param {Object} options
   * @param {string} options.title
   * @param {string} options.bodyHTML
   * @param {string} options.confirmText
   * @param {string} options.cancelText
   * @param {boolean} options.danger
   * @returns {Promise<boolean>}
   */
  function confirm({ title, bodyHTML = '', confirmText = '확인', cancelText = '취소', danger = false }) {
    return new Promise((resolve) => {
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML = `
        <div class="modal">
          <div class="modal__title">${title}</div>
          ${bodyHTML ? `<div class="modal__body">${bodyHTML}</div>` : ''}
          <div class="modal__footer">
            <button class="btn btn-ghost" data-action="cancel">${cancelText}</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm">${confirmText}</button>
          </div>
        </div>
      `;

      document.body.appendChild(backdrop);
      requestAnimationFrame(() => backdrop.classList.add('active'));

      function close(result) {
        backdrop.classList.remove('active');
        backdrop.addEventListener('transitionend', () => backdrop.remove());
        resolve(result);
      }

      backdrop.querySelector('[data-action="confirm"]').addEventListener('click', () => close(true));
      backdrop.querySelector('[data-action="cancel"]').addEventListener('click', () => close(false));
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) close(false);
      });
    });
  }

  return { confirm };
})();

/* ──────────────────────────────────────────
   Navigation Helper
   ────────────────────────────────────────── */

/** 현재 페이지의 base 경로를 계산한다 (GitHub Pages 서브경로 대응). */
function getBasePath() {
  // web/ 폴더 기준
  const path = window.location.pathname;
  const webIndex = path.lastIndexOf('/web/');
  if (webIndex >= 0) return path.substring(0, webIndex + 5);
  // fallback: 같은 디렉토리
  return path.substring(0, path.lastIndexOf('/') + 1);
}

function navigateTo(page) {
  window.location.href = getBasePath() + page;
}

/* ──────────────────────────────────────────
   URL Params Helper
   ────────────────────────────────────────── */
function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

/* ──────────────────────────────────────────
   Debounce
   ────────────────────────────────────────── */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ──────────────────────────────────────────
   Slide Background Renderer
   ────────────────────────────────────────── */

/**
 * 슬라이드 배경 스타일 문자열을 반환한다.
 * @param {{ type: string, value: string }} bg
 * @returns {string} CSS background value
 */
function getSlideBackground(bg) {
  if (!bg) return '#1a1a2e';
  switch (bg.type) {
    case 'solid': return bg.value;
    case 'gradient': return bg.value;
    case 'image': return `url(${bg.value}) center/cover no-repeat`;
    default: return '#1a1a2e';
  }
}

/* ──────────────────────────────────────────
   Date Formatting
   ────────────────────────────────────────── */
function formatDate(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHr < 24) return `${diffHr}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return d.toLocaleDateString('ko-KR');
}

/* ──────────────────────────────────────────
   Timer Formatting
   ────────────────────────────────────────── */
function formatCountdown(targetTime) {
  const diff = new Date(targetTime) - new Date();
  if (diff <= 0) return '복귀 시간이 지났습니다';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}시간 ${m}분 후 복귀`;
  if (m > 0) return `${m}분 ${s}초 후 복귀`;
  return `${s}초 후 복귀`;
}
