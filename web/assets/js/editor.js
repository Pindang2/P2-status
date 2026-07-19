/**
 * P2-status — 에디터 로직
 * 슬라이드 CRUD, 드래그 정렬, 속성 편집, 라이브 프리뷰, 자동 저장
 */

document.addEventListener('DOMContentLoaded', () => {
  /* ── 상태 ── */
  const presetId = getParam('id');
  let preset = presetId ? getPresetById(presetId) : null;

  // 프리셋이 없으면 새로 생성
  if (!preset) {
    preset = createPreset({ name: '새 프리셋' });
    preset.slides.push(createSlide({
      order: 0,
      background: { type: 'gradient', value: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
      text: '자리 비움',
      emoji: '💤',
    }));
    savePreset(preset);
    // URL 업데이트 (히스토리 교체)
    history.replaceState(null, '', `editor.html?id=${preset.id}`);
  }

  let activeSlideIndex = 0;

  /* ── DOM 참조 ── */
  const presetNameInput = document.getElementById('preset-name');
  const saveIndicator = document.getElementById('save-indicator');
  const slideList = document.getElementById('slide-list');
  const canvasFrame = document.getElementById('canvas-frame');
  const canvasEmoji = document.getElementById('canvas-emoji');
  const canvasText = document.getElementById('canvas-text');
  const canvasTimer = document.getElementById('canvas-timer');
  const bgTabs = document.getElementById('bg-tabs');
  const bgControls = document.getElementById('bg-controls');
  const slideTextInput = document.getElementById('slide-text');
  const slideFontSize = document.getElementById('slide-fontsize');
  const fontSizeValue = document.getElementById('fontsize-value');
  const slideTextColor = document.getElementById('slide-textcolor');
  const slideTextColorHex = document.getElementById('slide-textcolor-hex');
  const slideEmojiInput = document.getElementById('slide-emoji');
  const emojiQuick = document.getElementById('emoji-quick');
  const timerEnabled = document.getElementById('timer-enabled');
  const timerSettings = document.getElementById('timer-settings');
  const timerTime = document.getElementById('timer-time');

  /* ── 퀵 이모지 ── */
  const quickEmojis = ['💤', '☕', '🍽️', '📋', '🏃', '🚽', '📞', '⏰', '🔧', '🎮', '📚', '🏠'];
  emojiQuick.innerHTML = quickEmojis.map(e =>
    `<button class="btn btn-ghost btn-sm" data-emoji="${e}" style="font-size:1.2rem;padding:4px 8px">${e}</button>`
  ).join('');

  /* ── 자동 저장 ── */
  const autoSave = debounce(() => {
    savePreset(preset);
    saveIndicator.textContent = '저장됨';
    saveIndicator.classList.remove('saving');
  }, 500);

  function markDirty() {
    saveIndicator.textContent = '저장 중...';
    saveIndicator.classList.add('saving');
    autoSave();
  }

  /* ── 현재 슬라이드 ── */
  function currentSlide() {
    return preset.slides[activeSlideIndex] || null;
  }

  /* ── 슬라이드 리스트 렌더링 ── */
  function renderSlideList() {
    slideList.innerHTML = preset.slides.map((slide, i) => {
      const bg = getSlideBackground(slide.background);
      return `
        <div class="slide-list-item ${i === activeSlideIndex ? 'active' : ''}" 
             data-index="${i}" draggable="true">
          <div class="slide-thumb" style="background:${bg}">
            <span class="slide-thumb__emoji">${slide.emoji || ''}</span>
            <span class="slide-thumb__text">${slide.text || ''}</span>
          </div>
          <span class="slide-list-item__index">${i + 1}</span>
          ${preset.slides.length > 1 ? `<button class="slide-list-item__delete" data-delete="${i}" title="삭제">✕</button>` : ''}
        </div>
      `;
    }).join('');
  }

  /* ── 캔버스 프리뷰 업데이트 ── */
  function updateCanvas() {
    const slide = currentSlide();
    if (!slide) return;

    canvasFrame.style.background = getSlideBackground(slide.background);
    canvasEmoji.textContent = slide.emoji || '';
    canvasText.textContent = slide.text || '';
    canvasText.style.fontSize = slide.fontSize || '4rem';
    canvasText.style.color = slide.textColor || '#ffffff';

    if (slide.timer?.enabled && slide.timer?.returnTime) {
      canvasTimer.textContent = formatCountdown(slide.timer.returnTime);
      canvasTimer.style.display = '';
    } else {
      canvasTimer.style.display = 'none';
    }
  }

  /* ── 속성 패널 업데이트 ── */
  function updatePropsPanel() {
    const slide = currentSlide();
    if (!slide) return;

    // 프리셋 이름
    presetNameInput.value = preset.name;

    // 텍스트
    slideTextInput.value = slide.text || '';
    const size = parseFloat(slide.fontSize) || 4;
    slideFontSize.value = size;
    fontSizeValue.textContent = `${size}rem`;
    slideTextColor.value = slide.textColor || '#ffffff';
    slideTextColorHex.value = slide.textColor || '#ffffff';

    // 이모지
    slideEmojiInput.value = slide.emoji || '';

    // 배경 탭
    bgTabs.querySelectorAll('.bg-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.bg === slide.background.type);
    });
    renderBgControls(slide.background);

    // 타이머
    timerEnabled.checked = slide.timer?.enabled || false;
    timerSettings.style.display = timerEnabled.checked ? '' : 'none';
    if (slide.timer?.returnTime) {
      const d = new Date(slide.timer.returnTime);
      timerTime.value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } else {
      timerTime.value = '';
    }
  }

  /* ── 배경 컨트롤 렌더링 ── */
  function renderBgControls(bg) {
    switch (bg.type) {
      case 'solid':
        bgControls.innerHTML = `
          <div class="form-group">
            <label class="form-label">배경 색상</label>
            <div class="color-picker-wrap">
              <input type="color" id="bg-solid-color" value="${bg.value || '#1a1a2e'}" />
              <input type="text" class="input" id="bg-solid-hex" value="${bg.value || '#1a1a2e'}" style="flex:1" />
            </div>
          </div>
        `;
        document.getElementById('bg-solid-color').addEventListener('input', (e) => {
          currentSlide().background.value = e.target.value;
          document.getElementById('bg-solid-hex').value = e.target.value;
          updateCanvas(); renderSlideList(); markDirty();
        });
        document.getElementById('bg-solid-hex').addEventListener('change', (e) => {
          const v = e.target.value;
          if (/^#[0-9a-fA-F]{6}$/.test(v)) {
            currentSlide().background.value = v;
            document.getElementById('bg-solid-color').value = v;
            updateCanvas(); renderSlideList(); markDirty();
          }
        });
        break;

      case 'gradient':
        // 프리셋 그라데이션 선택
        const gradients = [
          'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
          'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          'linear-gradient(135deg, #141e30 0%, #243b55 100%)',
          'linear-gradient(135deg, #0d1b2a 0%, #1b263b 50%, #415a77 100%)',
          'linear-gradient(135deg, #1f1c2c 0%, #928dab 100%)',
          'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
          'linear-gradient(135deg, #2d1b69 0%, #6b21a8 50%, #a855f7 100%)',
          'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
          'linear-gradient(135deg, #c33764 0%, #1d2671 100%)',
          'linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #2d1b69 100%)',
        ];

        bgControls.innerHTML = `
          <div class="form-group">
            <label class="form-label">그라데이션 선택</label>
            <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">
              ${gradients.map((g, i) => `
                <div class="gradient-swatch${bg.value === g ? ' active' : ''}" data-gradient="${g}" 
                     style="background:${g};height:36px;border-radius:var(--radius-sm);cursor:pointer;border:2px solid ${bg.value === g ? 'var(--accent)' : 'transparent'};transition:border-color var(--transition-fast)"></div>
              `).join('')}
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">커스텀 CSS</label>
            <input type="text" class="input" id="bg-gradient-custom" value="${bg.value}" placeholder="linear-gradient(135deg, #000 0%, #333 100%)" />
          </div>
        `;

        bgControls.querySelectorAll('.gradient-swatch').forEach(el => {
          el.addEventListener('click', () => {
            currentSlide().background.value = el.dataset.gradient;
            updateCanvas(); renderSlideList(); updatePropsPanel(); markDirty();
          });
        });

        document.getElementById('bg-gradient-custom').addEventListener('change', (e) => {
          currentSlide().background.value = e.target.value;
          updateCanvas(); renderSlideList(); markDirty();
        });
        break;

      case 'image':
        bgControls.innerHTML = `
          <div class="form-group">
            <label class="form-label">이미지 URL</label>
            <input type="text" class="input" id="bg-image-url" value="${bg.value || ''}" placeholder="https://example.com/image.jpg" />
          </div>
        `;
        document.getElementById('bg-image-url').addEventListener('change', (e) => {
          currentSlide().background.value = e.target.value;
          updateCanvas(); renderSlideList(); markDirty();
        });
        break;
    }
  }

  /* ── 이벤트: 슬라이드 선택 / 삭제 ── */
  slideList.addEventListener('click', (e) => {
    // 삭제
    const deleteBtn = e.target.closest('[data-delete]');
    if (deleteBtn) {
      const idx = parseInt(deleteBtn.dataset.delete);
      preset.slides.splice(idx, 1);
      // order 재정렬
      preset.slides.forEach((s, i) => s.order = i);
      if (activeSlideIndex >= preset.slides.length) {
        activeSlideIndex = preset.slides.length - 1;
      }
      renderSlideList(); updateCanvas(); updatePropsPanel(); markDirty();
      return;
    }

    // 선택
    const item = e.target.closest('.slide-list-item');
    if (item) {
      activeSlideIndex = parseInt(item.dataset.index);
      renderSlideList(); updateCanvas(); updatePropsPanel();
    }
  });

  /* ── 이벤트: 슬라이드 추가 ── */
  document.getElementById('btn-add-slide').addEventListener('click', () => {
    const newSlide = createSlide({
      order: preset.slides.length,
      background: { type: 'gradient', value: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
      text: '',
      emoji: '💤',
    });
    preset.slides.push(newSlide);
    activeSlideIndex = preset.slides.length - 1;
    renderSlideList(); updateCanvas(); updatePropsPanel(); markDirty();
    ToastManager.show('슬라이드를 추가했습니다.', 'success');
  });

  /* ── 이벤트: 배경 탭 전환 ── */
  bgTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.bg-tab');
    if (!tab) return;
    const type = tab.dataset.bg;
    const slide = currentSlide();
    if (!slide) return;

    // 타입 변경 시 기본값 설정
    if (type === 'solid') slide.background = { type: 'solid', value: '#1a1a2e' };
    else if (type === 'gradient') slide.background = { type: 'gradient', value: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' };
    else if (type === 'image') slide.background = { type: 'image', value: '' };

    updateCanvas(); renderSlideList(); updatePropsPanel(); markDirty();
  });

  /* ── 이벤트: 텍스트 속성 ── */
  slideTextInput.addEventListener('input', (e) => {
    const slide = currentSlide(); if (!slide) return;
    slide.text = e.target.value;
    updateCanvas(); renderSlideList(); markDirty();
  });

  slideFontSize.addEventListener('input', (e) => {
    const slide = currentSlide(); if (!slide) return;
    slide.fontSize = e.target.value + 'rem';
    fontSizeValue.textContent = e.target.value + 'rem';
    updateCanvas(); markDirty();
  });

  slideTextColor.addEventListener('input', (e) => {
    const slide = currentSlide(); if (!slide) return;
    slide.textColor = e.target.value;
    slideTextColorHex.value = e.target.value;
    updateCanvas(); markDirty();
  });

  slideTextColorHex.addEventListener('change', (e) => {
    const v = e.target.value;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      const slide = currentSlide(); if (!slide) return;
      slide.textColor = v;
      slideTextColor.value = v;
      updateCanvas(); markDirty();
    }
  });

  /* ── 이벤트: 이모지 ── */
  slideEmojiInput.addEventListener('input', (e) => {
    const slide = currentSlide(); if (!slide) return;
    slide.emoji = e.target.value;
    updateCanvas(); renderSlideList(); markDirty();
  });

  emojiQuick.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-emoji]');
    if (!btn) return;
    const slide = currentSlide(); if (!slide) return;
    slide.emoji = btn.dataset.emoji;
    slideEmojiInput.value = slide.emoji;
    updateCanvas(); renderSlideList(); markDirty();
  });

  /* ── 이벤트: 타이머 ── */
  timerEnabled.addEventListener('change', (e) => {
    const slide = currentSlide(); if (!slide) return;
    slide.timer.enabled = e.target.checked;
    timerSettings.style.display = e.target.checked ? '' : 'none';
    updateCanvas(); markDirty();
  });

  timerTime.addEventListener('change', (e) => {
    const slide = currentSlide(); if (!slide) return;
    if (e.target.value) {
      const [h, m] = e.target.value.split(':').map(Number);
      const target = new Date();
      target.setHours(h, m, 0, 0);
      // 이미 지난 시각이면 내일로
      if (target < new Date()) target.setDate(target.getDate() + 1);
      slide.timer.returnTime = target.toISOString();
    } else {
      slide.timer.returnTime = null;
    }
    updateCanvas(); markDirty();
  });

  /* ── 이벤트: 프리셋 이름 ── */
  presetNameInput.addEventListener('input', (e) => {
    preset.name = e.target.value;
    markDirty();
  });

  /* ── 이벤트: 툴바 버튼 ── */
  document.getElementById('btn-back').addEventListener('click', () => {
    navigateTo('index.html');
  });

  document.getElementById('btn-export').addEventListener('click', () => {
    exportPreset(preset.id);
    ToastManager.show('프리셋을 내보냈습니다.', 'success');
  });

  document.getElementById('btn-preview').addEventListener('click', () => {
    // 저장 확인
    savePreset(preset);
    navigateTo(`viewer.html?id=${preset.id}`);
  });

  /* ── 드래그 & 드롭 정렬 ── */
  let dragStartIndex = null;

  slideList.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.slide-list-item');
    if (!item) return;
    dragStartIndex = parseInt(item.dataset.index);
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  slideList.addEventListener('dragend', (e) => {
    const item = e.target.closest('.slide-list-item');
    if (item) item.classList.remove('dragging');
    dragStartIndex = null;
  });

  slideList.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });

  slideList.addEventListener('drop', (e) => {
    e.preventDefault();
    const item = e.target.closest('.slide-list-item');
    if (!item || dragStartIndex === null) return;
    const dropIndex = parseInt(item.dataset.index);
    if (dragStartIndex === dropIndex) return;

    // 배열 재배치
    const [moved] = preset.slides.splice(dragStartIndex, 1);
    preset.slides.splice(dropIndex, 0, moved);
    preset.slides.forEach((s, i) => s.order = i);

    // 활성 슬라이드 인덱스 추적
    if (activeSlideIndex === dragStartIndex) {
      activeSlideIndex = dropIndex;
    } else if (dragStartIndex < activeSlideIndex && dropIndex >= activeSlideIndex) {
      activeSlideIndex--;
    } else if (dragStartIndex > activeSlideIndex && dropIndex <= activeSlideIndex) {
      activeSlideIndex++;
    }

    renderSlideList(); markDirty();
  });

  /* ── 타이머 실시간 업데이트 ── */
  setInterval(() => {
    const slide = currentSlide();
    if (slide?.timer?.enabled && slide?.timer?.returnTime) {
      canvasTimer.textContent = formatCountdown(slide.timer.returnTime);
    }
  }, 1000);

  /* ── 초기 렌더링 ── */
  renderSlideList();
  updateCanvas();
  updatePropsPanel();
});
