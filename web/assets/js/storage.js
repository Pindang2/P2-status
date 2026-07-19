/**
 * P2-status — 데이터 모델 & 로컬 스토리지 유틸리티
 * 
 * Preset / Slide 구조를 정의하고,
 * 로컬 스토리지 CRUD + JSON Export/Import를 제공한다.
 */

const STORAGE_KEY = 'p2status_presets';

/* ──────────────────────────────────────────
   ID 생성
   ────────────────────────────────────────── */
function generateId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

/* ──────────────────────────────────────────
   팩토리 함수
   ────────────────────────────────────────── */

/**
 * 새 슬라이드 객체를 생성한다.
 * @param {Partial<Slide>} overrides 
 * @returns {Slide}
 */
function createSlide(overrides = {}) {
  return {
    id: generateId(),
    order: 0,
    background: { type: 'solid', value: '#1a1a2e' },
    text: '',
    emoji: '',
    fontSize: '4rem',
    textColor: '#ffffff',
    timer: { enabled: false, returnTime: null },
    ...overrides,
  };
}

/**
 * 새 프리셋 객체를 생성한다.
 * @param {Partial<Preset>} overrides 
 * @returns {Preset}
 */
function createPreset(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: '새 프리셋',
    createdAt: now,
    updatedAt: now,
    slides: [],
    ...overrides,
  };
}

/* ──────────────────────────────────────────
   로컬 스토리지 CRUD
   ────────────────────────────────────────── */

/** 모든 프리셋을 반환한다. */
function getPresets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    console.error('Failed to parse presets from localStorage');
    return [];
  }
}

/** 프리셋 배열 전체를 저장한다. */
function _saveAll(presets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

/** ID로 프리셋 하나를 반환한다. */
function getPresetById(id) {
  return getPresets().find(p => p.id === id) || null;
}

/** 프리셋을 저장한다 (신규이면 추가, 기존이면 갱신). */
function savePreset(preset) {
  const presets = getPresets();
  const idx = presets.findIndex(p => p.id === preset.id);
  preset.updatedAt = new Date().toISOString();
  if (idx >= 0) {
    presets[idx] = preset;
  } else {
    presets.push(preset);
  }
  _saveAll(presets);
  return preset;
}

/** 프리셋을 삭제한다. */
function deletePreset(id) {
  const presets = getPresets().filter(p => p.id !== id);
  _saveAll(presets);
}

/** 프리셋을 복제한다. */
function duplicatePreset(id) {
  const original = getPresetById(id);
  if (!original) return null;
  const copy = createPreset({
    name: original.name + ' (복사본)',
    slides: original.slides.map(s => ({ ...s, id: generateId() })),
  });
  savePreset(copy);
  return copy;
}

/* ──────────────────────────────────────────
   Export / Import
   ────────────────────────────────────────── */

/** 프리셋 하나를 JSON 파일로 다운로드한다. */
function exportPreset(id) {
  const preset = getPresetById(id);
  if (!preset) return;
  const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `p2-${preset.name.replace(/\s+/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** 모든 프리셋을 한 파일로 내보낸다. */
function exportAllPresets() {
  const presets = getPresets();
  const blob = new Blob([JSON.stringify(presets, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `p2-status-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * JSON 파일에서 프리셋을 불러온다.
 * 단일 프리셋 또는 프리셋 배열 모두 지원.
 * @param {File} file 
 * @returns {Promise<number>} 가져온 프리셋 수
 */
function importPresets(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const incoming = Array.isArray(data) ? data : [data];
        let count = 0;
        incoming.forEach(p => {
          if (p && p.slides && Array.isArray(p.slides)) {
            // 충돌 방지를 위해 새 ID 부여
            p.id = generateId();
            p.slides = p.slides.map(s => ({ ...s, id: generateId() }));
            savePreset(p);
            count++;
          }
        });
        resolve(count);
      } catch (err) {
        reject(new Error('잘못된 JSON 파일입니다.'));
      }
    };
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.readAsText(file);
  });
}

/* ──────────────────────────────────────────
   기본 프리셋 시드
   ────────────────────────────────────────── */

/** 최초 방문 시 기본 프리셋을 생성한다. */
function seedDefaultPresets() {
  if (getPresets().length > 0) return;

  const defaultPreset = createPreset({
    name: '기본 자리비움',
    slides: [
      createSlide({
        order: 0,
        background: { type: 'gradient', value: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
        text: '잠시 자리 비움',
        emoji: '💤',
        fontSize: '4rem',
      }),
      createSlide({
        order: 1,
        background: { type: 'gradient', value: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' },
        text: '식사 중',
        emoji: '🍽️',
        fontSize: '4rem',
      }),
      createSlide({
        order: 2,
        background: { type: 'gradient', value: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)' },
        text: '회의 중',
        emoji: '📋',
        fontSize: '4rem',
      }),
      createSlide({
        order: 3,
        background: { type: 'gradient', value: 'linear-gradient(135deg, #0d1b2a 0%, #1b263b 50%, #415a77 100%)' },
        text: '곧 돌아옵니다',
        emoji: '⏰',
        fontSize: '4rem',
        timer: { enabled: true, returnTime: null },
      }),
    ],
  });

  savePreset(defaultPreset);
}
