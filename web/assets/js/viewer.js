/**
 * P2-status — 뷰어 로직
 * 
 * 전체화면 자리비움 디스플레이.
 * - Fullscreen API 자동 진입
 * - 방향키/스크롤/터치 → 오버레이 프리뷰 (5개 썸네일)
 * - 2초 정지 → 슬라이드 전환
 * - 상단 마우스 / 하향 터치 → 그리드 뷰
 * - ESC → 전체화면 해제 + 홈 복귀
 */

document.addEventListener('DOMContentLoaded', () => {
  /* ── 상태 ── */
  const presetId = getParam('id');
  const preset = presetId ? getPresetById(presetId) : null;

  if (!preset || preset.slides.length === 0) {
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#fff;font-family:var(--font-display);flex-direction:column;gap:1rem;background:#0a0a14">
        <div style="font-size:3rem">😶</div>
        <div style="font-size:1.25rem">프리셋을 찾을 수 없습니다.</div>
        <button class="btn btn-primary" onclick="navigateTo('index.html')">홈으로 돌아가기</button>
      </div>
    `;
    return;
  }

  let currentIndex = 0;
  let previewIndex = 0;  // 오버레이에서 탐색 중인 인덱스
  let holdTimer = null;   // 2초 정지 타이머
  let holdStartTime = 0;
  let holdAnimFrame = null;
  let overlayTimeout = null;
  let isOverlayVisible = false;
  let isGridVisible = false;
  let cursorTimeout = null;

  const viewer = document.getElementById('viewer');
  const viewerSlide = document.getElementById('viewer-slide');
  const viewerEmoji = document.getElementById('viewer-emoji');
  const viewerText = document.getElementById('viewer-text');
  const viewerTimer = document.getElementById('viewer-timer');
  const overlay = document.getElementById('overlay');
  const gridView = document.getElementById('grid-view');
  const btnExit = document.getElementById('btn-exit');

  const slides = preset.slides;
  const total = slides.length;

  /* ══════════════════════════════════════════
     슬라이드 렌더링
     ══════════════════════════════════════════ */

  function renderSlide(index) {
    const slide = slides[index];
    if (!slide) return;

    viewerSlide.style.background = getSlideBackground(slide.background);
    viewerEmoji.textContent = slide.emoji || '';
    viewerText.textContent = slide.text || '';
    viewerText.style.fontSize = slide.fontSize || '4rem';
    viewerText.style.color = slide.textColor || '#ffffff';

    if (slide.timer?.enabled && slide.timer?.returnTime) {
      viewerTimer.textContent = formatCountdown(slide.timer.returnTime);
      viewerTimer.style.display = '';
    } else {
      viewerTimer.style.display = 'none';
    }
  }

  function goToSlide(index) {
    currentIndex = ((index % total) + total) % total;
    previewIndex = currentIndex;
    renderSlide(currentIndex);
    if (isOverlayVisible) renderOverlay();
    if (isGridVisible) renderGrid();
  }

  /* ══════════════════════════════════════════
     오버레이 — 썸네일 스트립
     ══════════════════════════════════════════ */

  function renderOverlay() {
    // 5개: [2이전, 1이전, 현재(프리뷰), 다음, 다다음]
    const thumbs = [];
    for (let offset = -2; offset <= 2; offset++) {
      const idx = ((previewIndex + offset) % total + total) % total;
      const slide = slides[idx];
      const bg = getSlideBackground(slide.background);
      const isCurrent = offset === 0;
      thumbs.push(`
        <div class="overlay-thumb ${isCurrent ? 'current' : ''}" data-index="${idx}" style="background:${bg}">
          <span class="overlay-thumb__emoji">${slide.emoji || ''}</span>
          <span class="overlay-thumb__text">${slide.text || ''}</span>
          ${isCurrent ? '<div class="overlay-thumb__progress" id="hold-progress"></div>' : ''}
        </div>
      `);
    }
    overlay.innerHTML = thumbs.join('');
  }

  function showOverlay() {
    if (isGridVisible) return;
    isOverlayVisible = true;
    renderOverlay();
    overlay.classList.add('visible');
    resetOverlayTimeout();
  }

  function hideOverlay() {
    isOverlayVisible = false;
    overlay.classList.remove('visible');
    cancelHold();
  }

  function resetOverlayTimeout() {
    clearTimeout(overlayTimeout);
    overlayTimeout = setTimeout(() => {
      // 2초 타이머가 실행 중이 아닐 때만 숨김
      if (!holdTimer) hideOverlay();
    }, 3000);
  }

  /* ══════════════════════════════════════════
     2초 정지 → 전환
     ══════════════════════════════════════════ */

  function startHold() {
    cancelHold();
    holdStartTime = Date.now();
    holdTimer = setTimeout(() => {
      // 전환!
      goToSlide(previewIndex);
      cancelHold();
      // 오버레이를 잠시 유지 후 숨김
      setTimeout(hideOverlay, 800);
    }, 2000);

    // 프로그레스 바 애니메이션
    animateProgress();
  }

  function cancelHold() {
    clearTimeout(holdTimer);
    holdTimer = null;
    cancelAnimationFrame(holdAnimFrame);
    const prog = document.getElementById('hold-progress');
    if (prog) prog.style.width = '0';
  }

  function animateProgress() {
    const prog = document.getElementById('hold-progress');
    if (!prog || !holdTimer) return;

    const elapsed = Date.now() - holdStartTime;
    const pct = Math.min((elapsed / 2000) * 100, 100);
    prog.style.width = pct + '%';

    if (pct < 100) {
      holdAnimFrame = requestAnimationFrame(animateProgress);
    }
  }

  /* ══════════════════════════════════════════
     오버레이 탐색
     ══════════════════════════════════════════ */

  function navigatePreview(direction) {
    // direction: -1 (이전) or +1 (다음)
    previewIndex = ((previewIndex + direction) % total + total) % total;
    showOverlay();
    startHold();
  }

  /* ══════════════════════════════════════════
     그리드 뷰
     ══════════════════════════════════════════ */

  function renderGrid() {
    gridView.innerHTML = slides.map((slide, i) => {
      const bg = getSlideBackground(slide.background);
      return `
        <div class="grid-slide-item ${i === currentIndex ? 'current' : ''}" 
             data-index="${i}" style="background:${bg}">
          <span class="grid-slide-item__index">${i + 1}</span>
          <span class="grid-slide-item__emoji">${slide.emoji || ''}</span>
          <span class="grid-slide-item__text">${slide.text || ''}</span>
        </div>
      `;
    }).join('');
  }

  function showGrid() {
    hideOverlay();
    isGridVisible = true;
    renderGrid();
    gridView.classList.add('visible');
    showCursor();
  }

  function hideGrid() {
    isGridVisible = false;
    gridView.classList.remove('visible');
  }

  function toggleGrid() {
    if (isGridVisible) hideGrid();
    else showGrid();
  }

  /* ══════════════════════════════════════════
     커서 표시/숨김
     ══════════════════════════════════════════ */

  function showCursor() {
    viewer.classList.add('show-cursor');
    clearTimeout(cursorTimeout);
    cursorTimeout = setTimeout(() => {
      if (!isGridVisible && !isOverlayVisible) {
        viewer.classList.remove('show-cursor');
      }
    }, 3000);
  }

  /* ══════════════════════════════════════════
     Fullscreen API
     ══════════════════════════════════════════ */

  async function enterFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // 전체화면 진입 실패 — 무시
    }
  }

  function exitViewer() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    navigateTo('index.html');
  }

  // 전체화면 해제 감지
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      // 전체화면 해제 시 → 홈으로
      // 단, 사용자가 ESC를 눌러서 해제한 경우만
      // (navigateTo로 인한 해제는 이미 페이지를 떠남)
    }
  });

  /* ══════════════════════════════════════════
     입력 이벤트 — 키보드
     ══════════════════════════════════════════ */

  document.addEventListener('keydown', (e) => {
    if (isGridVisible) {
      if (e.key === 'Escape' || e.key === 'g') {
        hideGrid();
        return;
      }
      return;
    }

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        navigatePreview(-1);
        break;

      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        navigatePreview(1);
        break;

      case 'Escape':
        e.preventDefault();
        if (isOverlayVisible) {
          hideOverlay();
        } else {
          exitViewer();
        }
        break;

      case 'g':
      case 'G':
        toggleGrid();
        break;

      case 'f':
      case 'F':
        enterFullscreen();
        break;
    }
  });

  /* ══════════════════════════════════════════
     입력 이벤트 — 마우스 스크롤
     ══════════════════════════════════════════ */

  document.addEventListener('wheel', (e) => {
    if (isGridVisible) return;
    e.preventDefault();
    showCursor();

    if (e.deltaY > 0 || e.deltaX > 0) {
      navigatePreview(1);
    } else {
      navigatePreview(-1);
    }
  }, { passive: false });

  /* ══════════════════════════════════════════
     입력 이벤트 — 마우스 위치 (상단 → 그리드)
     ══════════════════════════════════════════ */

  document.addEventListener('mousemove', (e) => {
    showCursor();

    // 화면 상단 20px 이내 → 오버레이 표시
    if (e.clientY <= 20 && !isGridVisible) {
      showOverlay();
    }
  });

  /* ══════════════════════════════════════════
     입력 이벤트 — 터치
     ══════════════════════════════════════════ */

  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  document.addEventListener('touchstart', (e) => {
    if (isGridVisible) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (isGridVisible) return;

    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const dt = Date.now() - touchStartTime;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // 아래로 끌기 → 그리드
    if (dy > 80 && absDy > absDx && dt < 500) {
      showGrid();
      return;
    }

    // 좌우 스와이프
    if (absDx > 50 && absDx > absDy && dt < 500) {
      if (dx > 0) {
        navigatePreview(-1);
      } else {
        navigatePreview(1);
      }
    }
  }, { passive: true });

  /* ══════════════════════════════════════════
     오버레이 / 그리드 클릭
     ══════════════════════════════════════════ */

  overlay.addEventListener('click', (e) => {
    const thumb = e.target.closest('.overlay-thumb');
    if (!thumb) return;
    const idx = parseInt(thumb.dataset.index);
    goToSlide(idx);
    setTimeout(hideOverlay, 500);
  });

  gridView.addEventListener('click', (e) => {
    const item = e.target.closest('.grid-slide-item');
    if (!item) return;
    const idx = parseInt(item.dataset.index);
    goToSlide(idx);
    hideGrid();
  });

  /* ══════════════════════════════════════════
     종료 버튼
     ══════════════════════════════════════════ */

  btnExit.addEventListener('click', (e) => {
    e.stopPropagation();
    exitViewer();
  });

  /* ══════════════════════════════════════════
     타이머 실시간 업데이트
     ══════════════════════════════════════════ */

  setInterval(() => {
    const slide = slides[currentIndex];
    if (slide?.timer?.enabled && slide?.timer?.returnTime) {
      viewerTimer.textContent = formatCountdown(slide.timer.returnTime);
      viewerTimer.style.display = '';
    }
  }, 1000);

  /* ══════════════════════════════════════════
     초기화
     ══════════════════════════════════════════ */

  renderSlide(currentIndex);

  // 약간의 딜레이 후 전체화면 진입 (사용자 제스처 필요)
  // 첫 클릭 시 전체화면으로
  viewer.addEventListener('click', (e) => {
    if (isOverlayVisible || isGridVisible) return;
    if (e.target === btnExit || e.target.closest('.viewer__exit')) return;
    if (!document.fullscreenElement) {
      enterFullscreen();
    }
  }, { once: false });

  // 시작 시 커서 잠시 표시
  showCursor();
});
