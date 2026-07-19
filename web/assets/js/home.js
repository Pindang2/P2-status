/**
 * P2-status — 홈페이지 로직
 * 프리셋 목록 렌더링, CRUD 이벤트, Export/Import
 */

document.addEventListener('DOMContentLoaded', () => {
  // 최초 방문 시 기본 프리셋 생성
  seedDefaultPresets();

  const grid = document.getElementById('preset-grid');
  const emptyState = document.getElementById('empty-state');
  const importInput = document.getElementById('import-input');

  /* ── 프리셋 목록 렌더링 ── */
  function renderPresets() {
    const presets = getPresets();

    if (presets.length === 0) {
      grid.style.display = 'none';
      emptyState.style.display = '';
      return;
    }

    grid.style.display = '';
    emptyState.style.display = 'none';

    // 최근 수정순 정렬
    presets.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    grid.innerHTML = presets.map(preset => {
      const firstSlide = preset.slides[0];
      const bg = firstSlide ? getSlideBackground(firstSlide.background) : '#1a1a2e';
      const bgStyle = bg.startsWith('url') || bg.startsWith('linear')
        ? `background: ${bg};`
        : `background: ${bg};`;
      const emoji = firstSlide?.emoji || '💤';
      const text = firstSlide?.text || '';

      return `
        <div class="card preset-card" data-id="${preset.id}">
          <div class="preset-card__preview" style="${bgStyle}">
            <span style="font-size:2.5rem; filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4))">${emoji}</span>
            ${text ? `<span class="preset-card__preview-text">${text}</span>` : ''}
          </div>
          <div class="preset-card__name">${preset.name}</div>
          <div class="preset-card__meta">
            <span>🎴 ${preset.slides.length}장</span>
            <span>·</span>
            <span>${formatDate(preset.updatedAt)}</span>
          </div>
          <div class="preset-card__actions">
            <button class="btn btn-primary btn-sm" data-action="view" data-id="${preset.id}">
              ▶ 실행
            </button>
            <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${preset.id}">
              ✏️ 편집
            </button>
            <button class="btn btn-ghost btn-sm" data-action="export" data-id="${preset.id}" title="내보내기">
              📤
            </button>
            <button class="btn btn-ghost btn-sm" data-action="duplicate" data-id="${preset.id}" title="복제">
              📋
            </button>
            <button class="btn btn-ghost btn-sm" data-action="delete" data-id="${preset.id}" title="삭제" style="color:var(--danger)">
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ── 이벤트 위임 ── */
  grid.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    switch (action) {
      case 'view':
        navigateTo(`viewer.html?id=${id}`);
        break;

      case 'edit':
        navigateTo(`editor.html?id=${id}`);
        break;

      case 'export':
        exportPreset(id);
        ToastManager.show('프리셋을 내보냈습니다.', 'success');
        break;

      case 'duplicate':
        duplicatePreset(id);
        ToastManager.show('프리셋을 복제했습니다.', 'success');
        renderPresets();
        break;

      case 'delete': {
        const ok = await ModalManager.confirm({
          title: '프리셋 삭제',
          bodyHTML: '이 프리셋을 정말 삭제하시겠습니까?<br/>삭제된 데이터는 복구할 수 없습니다.',
          confirmText: '삭제',
          danger: true,
        });
        if (ok) {
          deletePreset(id);
          ToastManager.show('프리셋을 삭제했습니다.', 'info');
          renderPresets();
        }
        break;
      }
    }
  });

  /* ── 새 프리셋 만들기 ── */
  function createNewPreset() {
    const preset = createPreset({ name: '새 프리셋' });
    // 기본 슬라이드 1장 추가
    preset.slides.push(createSlide({
      order: 0,
      background: { type: 'gradient', value: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
      text: '자리 비움',
      emoji: '💤',
    }));
    savePreset(preset);
    navigateTo(`editor.html?id=${preset.id}`);
  }

  document.getElementById('btn-new-preset').addEventListener('click', createNewPreset);
  document.getElementById('btn-empty-new')?.addEventListener('click', createNewPreset);

  /* ── Import ── */
  document.getElementById('btn-import').addEventListener('click', () => {
    importInput.click();
  });

  importInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const count = await importPresets(file);
      ToastManager.show(`${count}개 프리셋을 가져왔습니다.`, 'success');
      renderPresets();
    } catch (err) {
      ToastManager.show(err.message, 'error');
    }
    importInput.value = '';
  });

  /* ── Export All ── */
  document.getElementById('btn-export-all').addEventListener('click', () => {
    const presets = getPresets();
    if (presets.length === 0) {
      ToastManager.show('내보낼 프리셋이 없습니다.', 'error');
      return;
    }
    exportAllPresets();
    ToastManager.show('전체 프리셋을 내보냈습니다.', 'success');
  });

  /* ── 초기 렌더링 ── */
  renderPresets();
});
