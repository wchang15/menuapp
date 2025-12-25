'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KEYS, loadBlob, saveBlob, loadJson, saveJson } from '@/lib/storage';
import CustomCanvas from './CustomCanvas';

const DEFAULT_LAYOUT = { mode: null, templateId: null, items: [] };

// ✅ 옵션들
const SECRET_TAPS = 5;
const TAP_WINDOW_MS = 2500;
const AUTO_HIDE_MS = 5000;
const LONG_PRESS_MS = 3000;

// ✅ 비밀번호(핀) 설정
const PIN_KEY = 'MENU_EDITOR_PIN_V1';
const DEFAULT_PIN = '0000';

// ✅ 언어
const LANG_KEY = 'APP_LANG_V1';

function TemplatePicker({ onPick, lang }) {
  const title = lang === 'ko' ? '템플릿 선택' : 'Select template';
  const note = lang === 'ko'
    ? '* 템플릿은 다음 단계에서 입력 UI를 붙일 예정입니다.'
    : '* We will add input UI in the next step.';

  const t1 = lang === 'ko' ? '리스트형' : 'List';
  const t2 = lang === 'ko' ? '사진 + 리스트' : 'Photo + List';
  const t3 = lang === 'ko' ? '그리드형' : 'Grid';

  return (
    <div>
      <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 12 }}>{title}</div>
      <div style={{ display: 'grid', gap: 10 }}>
        <button style={tpBtn} onClick={() => onPick('T1')}>{t1}</button>
        <button style={tpBtn} onClick={() => onPick('T2')}>{t2}</button>
        <button style={tpBtn} onClick={() => onPick('T3')}>{t3}</button>
      </div>
      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>{note}</div>
    </div>
  );
}

const tpBtn = {
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid #ddd',
  cursor: 'pointer',
  fontWeight: 800,
  background: '#fff',
};

export default function MenuEditor() {
  const router = useRouter();

  const [bgBlob, setBgBlob] = useState(null);
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);

  // ✅ “편집 모드”
  const [edit, setEdit] = useState(false);

  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  // ✅ 보기모드에서만 잠깐 보이는 “수정 버튼” 상태
  const [showEditBtn, setShowEditBtn] = useState(false);

  // ---- 5탭 카운터용 refs
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef(null);

  // ---- 자동 숨김 타이머
  const autoHideRef = useRef(null);

  // ---- 길게 누르기 타이머
  const longPressRef = useRef(null);

  // ✅ PIN 상태
  const [pin, setPin] = useState(DEFAULT_PIN);

  // ✅ PIN 입력 모달
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // ✅ 비밀번호 설정(변경) 모달
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [curPinInput, setCurPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsMsg, setSettingsMsg] = useState('');

  // ✅ 언어 상태
  const [lang, setLang] = useState('en');

  // ✅ NEW: CustomCanvas preview 상태(국기/핀버튼 숨김용)
  const [canvasPreview, setCanvasPreview] = useState(false);

  useEffect(() => {
    (async () => {
      const bg = await loadBlob(KEYS.MENU_BG);
      const lay = (await loadJson(KEYS.MENU_LAYOUT)) || DEFAULT_LAYOUT;
      if (bg) setBgBlob(bg);
      setLayout(lay);
    })();

    // ✅ PIN 로드/초기화
    try {
      const stored = localStorage.getItem(PIN_KEY);
      if (stored && typeof stored === 'string') {
        setPin(stored);
      } else {
        localStorage.setItem(PIN_KEY, DEFAULT_PIN);
        setPin(DEFAULT_PIN);
      }
    } catch {
      setPin(DEFAULT_PIN);
    }

    // ✅ 언어 로드
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === 'ko' || saved === 'en') setLang(saved);
    } catch {}
  }, []);

  const setLanguage = (next) => {
    setLang(next);
    try { localStorage.setItem(LANG_KEY, next); } catch {}
  };

  // ✅ 영상으로 돌아가기 (경로 필요하면 여기만 바꿔)
  const goIntro = () => router.push('/intro');

  const bgUrl = useMemo(() => {
    if (!bgBlob) return null;
    return URL.createObjectURL(bgBlob);
  }, [bgBlob]);

  useEffect(() => {
    return () => {
      if (bgUrl) URL.revokeObjectURL(bgUrl);
    };
  }, [bgUrl]);

  const uploadBg = async (file) => {
    if (!file) return;
    await saveBlob(KEYS.MENU_BG, file);
    setBgBlob(file);
  };

  const onDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadBg(file);
  };

  const openFilePicker = () => fileInputRef.current?.click();

  // ✅ 타이머 정리 + 보기모드에서 수정 버튼 숨김
  const hideEditButton = () => {
    if (autoHideRef.current) {
      clearTimeout(autoHideRef.current);
      autoHideRef.current = null;
    }
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    setShowEditBtn(false);
  };

  // ✅ 수정 버튼을 “보여주기” (보기모드일 때만 5초 자동 숨김)
  const revealEditButton = () => {
    if (edit) return; // ✅ 편집중에는 “수정 버튼” 자체를 안 씀

    setShowEditBtn(true);

    if (autoHideRef.current) clearTimeout(autoHideRef.current);
    autoHideRef.current = setTimeout(() => {
      if (!edit) setShowEditBtn(false);
    }, AUTO_HIDE_MS);
  };

  // ✅ 5번 클릭 감지
  const onSecretCornerClick = () => {
    if (edit) return;

    if (!tapTimerRef.current) {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
        tapTimerRef.current = null;
      }, TAP_WINDOW_MS);
    }

    tapCountRef.current += 1;

    if (tapCountRef.current >= SECRET_TAPS) {
      revealEditButton();
      tapCountRef.current = 0;
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
    }
  };

  // ✅ 길게 누르기 시작/종료 (3초)
  const startLongPress = (e) => {
    if (edit) return;
    e.preventDefault();

    if (longPressRef.current) clearTimeout(longPressRef.current);
    longPressRef.current = setTimeout(() => {
      revealEditButton();
      longPressRef.current = null;
    }, LONG_PRESS_MS);
  };

  const cancelLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  // ✅ cleanup
  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (autoHideRef.current) clearTimeout(autoHideRef.current);
      if (longPressRef.current) clearTimeout(longPressRef.current);
    };
  }, []);

  // ✅ “수정” 클릭 시: 비번 확인 후 edit 진입
  const requestEdit = () => {
    if (edit) return;
    setPinError('');
    setPinInput('');
    setPinModalOpen(true);
  };

  const submitPin = () => {
    if ((pinInput || '').trim() === pin) {
      setPinModalOpen(false);
      setEdit(true);
      setPinInput('');
      setPinError('');
      return;
    }
    setPinError(lang === 'ko' ? '비밀번호가 올바르지 않습니다.' : 'Incorrect PIN.');
  };

  // ✅ 비밀번호 변경
  const submitChangePin = () => {
    setSettingsError('');
    setSettingsMsg('');

    if ((curPinInput || '').trim() !== pin) {
      setSettingsError(lang === 'ko' ? '현재 비밀번호가 올바르지 않습니다.' : 'Current PIN is incorrect.');
      return;
    }
    const np = (newPinInput || '').trim();
    const cp = (newPinConfirm || '').trim();

    if (!/^\d{4}$/.test(np)) {
      setSettingsError(lang === 'ko'
        ? '새 비밀번호는 숫자 4자리(예: 1234)로 입력해 주세요.'
        : 'New PIN must be exactly 4 digits (e.g., 1234).');
      return;
    }
    if (np !== cp) {
      setSettingsError(lang === 'ko' ? '새 비밀번호 확인이 일치하지 않습니다.' : 'New PIN confirmation does not match.');
      return;
    }

    try { localStorage.setItem(PIN_KEY, np); } catch {}
    setPin(np);
    setSettingsMsg(lang === 'ko' ? '비밀번호가 변경되었습니다.' : 'PIN has been updated.');
    setCurPinInput('');
    setNewPinInput('');
    setNewPinConfirm('');
  };

  const T = {
    ko: {
      pickBgTitle: '메뉴판 배경을 선택하세요',
      pickBgDesc1: '메뉴판에 깔릴 ',
      pickBgDesc2: '배경 이미지',
      pickBgDesc3: '를 업로드해 주세요.',
      pickBgDesc4: '업로드 후에는 배경이 자동 적용됩니다.',
      drop1: '여기로 이미지를 드래그해서 놓거나',
      drop2: '클릭해서 배경을 선택',
      drop3: '하세요',
      hint: '권장: JPG/PNG · 가로형(16:9)',
      keep: '* 배경은 브라우저에 저장되어 다음 실행에도 유지됩니다.',
      edit: '수정',
      changeBg: '배경 다시 선택',
      pinSettings: '비밀번호 설정',
      pinEnterTitle: '비밀번호 입력',
      pinEnterDesc: '수정하려면 비밀번호(기본 0000)를 입력하세요.',
      confirm: '확인',
      cancel: '취소',
      close: '닫기',
      pinChange: '비밀번호 변경',
      curPin: '현재 비밀번호',
      newPin: '새 비밀번호(4자리 숫자)',
      newPin2: '새 비밀번호 확인',
      change: '변경',
      help: '우측 상단 모서리를 5번 클릭하거나 3초 길게 누르면 수정 버튼이 나타납니다. (5초 후 자동으로 숨김)',
      backToVideo: '영상으로',
      editModePick: '수정 방식 선택',
      freeEdit: '자유 배치로 편집하기',
      templateBadge: '템플릿 모드: ',
    },
    en: {
      pickBgTitle: 'Select a menu background',
      pickBgDesc1: 'Upload a ',
      pickBgDesc2: 'background image',
      pickBgDesc3: ' for the menu.',
      pickBgDesc4: 'It will apply automatically after upload.',
      drop1: 'Drag & drop an image here, or',
      drop2: 'click to choose a background',
      drop3: '',
      hint: 'Recommended: JPG/PNG · Landscape (16:9)',
      keep: '* Saved in your browser and will persist.',
      edit: 'Edit',
      changeBg: 'Change Background',
      pinSettings: 'PIN Settings',
      pinEnterTitle: 'Enter PIN',
      pinEnterDesc: 'Enter your PIN (default 0000) to edit.',
      confirm: 'Confirm',
      cancel: 'Cancel',
      close: 'Close',
      pinChange: 'Change PIN',
      curPin: 'Current PIN',
      newPin: 'New PIN (4 digits)',
      newPin2: 'Confirm New PIN',
      change: 'Update',
      help: 'Tap the top-right corner 5 times or press & hold for 3 seconds to reveal the Edit button. (Auto hides in 5s)',
      backToVideo: 'Back to Video',
      editModePick: 'Choose edit mode',
      freeEdit: 'Edit with Free Layout',
      templateBadge: 'Template Mode: ',
    },
  }[lang];

  const isOverlayOpen = pinModalOpen || settingsOpen; // ✅ 모달 열리면 하단/기타 버튼 숨김용

  return (
    <div style={styles.container}>
      {!bgUrl ? (
        <div style={styles.setupWrap}>
          <div style={styles.setupCard}>
            <div style={styles.title}>{T.pickBgTitle}</div>
            <div style={styles.desc}>
              {T.pickBgDesc1}<b>{T.pickBgDesc2}</b>{T.pickBgDesc3}
              <br />
              {T.pickBgDesc4}
            </div>

            <div
              style={{ ...styles.dropZone, ...(dragOver ? styles.dropZoneActive : {}) }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={openFilePicker}
              role="button"
              tabIndex={0}
            >
              <div style={styles.dropIcon}>🖼️</div>
              <div style={styles.dropText}>
                {T.drop1}
                <br />
                <span style={styles.linkLike}>{T.drop2}</span> {T.drop3}
              </div>
              <div style={styles.hint}>{T.hint}</div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => uploadBg(e.target.files?.[0])}
            />

            <div style={styles.smallNote}>{T.keep}</div>
          </div>
        </div>
      ) : (
        <div style={styles.stage}>
          <img src={bgUrl} alt="menu background" style={styles.bgImg} />

          {/* ✅ 언어 버튼(국기) - Preview에서는 숨김 */}
          {!canvasPreview && (
            <div style={styles.langWrap}>
              <button
                style={{ ...styles.langBtn, ...(lang === 'en' ? styles.langBtnActive : {}) }}
                onClick={() => setLanguage('en')}
                aria-label="English"
                title="English"
              >
                🇺🇸
              </button>
              <button
                style={{ ...styles.langBtn, ...(lang === 'ko' ? styles.langBtnActive : {}) }}
                onClick={() => setLanguage('ko')}
                aria-label="Korean"
                title="한국어"
              >
                🇰🇷
              </button>
            </div>
          )}

          {/* ✅ 뒤로가기(영상으로): 모달/설정에서는 숨김 */}
          {!isOverlayOpen && !edit && (
            <button style={styles.backBtn} onClick={goIntro}>
              {T.backToVideo}
            </button>
          )}

          {/* ✅ 비밀 hotspot (편집 아니고, 수정버튼 안 보일 때만) */}
          {!showEditBtn && !edit && (
            <div
              style={styles.secretHotspot}
              onClick={onSecretCornerClick}
              onMouseDown={startLongPress}
              onMouseUp={cancelLongPress}
              onMouseLeave={cancelLongPress}
              onTouchStart={startLongPress}
              onTouchEnd={cancelLongPress}
              onTouchCancel={cancelLongPress}
              aria-label="secret-edit-hotspot"
            />
          )}

          {/* ✅ 편집 모드 상단 버튼바 - Preview에서는 숨김 */}
          {edit && !canvasPreview && (
            <div style={styles.editTopBar}>
              <button
                style={styles.topBtn}
                onClick={() => {
                  setSettingsError('');
                  setSettingsMsg('');
                  setSettingsOpen(true);
                }}
              >
                {T.pinSettings}
              </button>

              <button style={styles.topBtn} onClick={openFilePicker}>
                {T.changeBg}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => uploadBg(e.target.files?.[0])}
              />
            </div>
          )}

          {/* ✅ 보기모드에서만 “수정” 버튼 노출 (편집 들어가면 안 보이게) */}
          {!edit && showEditBtn && !isOverlayOpen && (
            <button
              style={styles.editBtn}
              onClick={(e) => {
                e.stopPropagation();
                requestEdit();
              }}
            >
              {T.edit}
            </button>
          )}

          {!layout.mode && (
            <div style={styles.helpHint}>{T.help}</div>
          )}

          {layout.mode === 'template' && (
            <div style={styles.badge}>{T.templateBadge}{layout.templateId}</div>
          )}

          {layout.mode === 'custom' && (
            <CustomCanvas
              lang={lang}
              topOffset={140}
              toolbarTop={58}
              inspectorTop={118}
              items={layout.items}
              editing={edit}
              // ✅ NEW: preview 상태 전달 받기
              onPreviewChange={setCanvasPreview}
              onChangeItems={(items) => {
                const next = { ...layout, mode: 'custom', items };
                setLayout(next);
              }}
              onSave={(items) => {
                const next = { ...layout, mode: 'custom', items };
                setLayout(next);
                saveJson(KEYS.MENU_LAYOUT, next);

                setEdit(false);
                setCanvasPreview(false); // ✅ 저장 시 안전하게 초기화
                hideEditButton(); // 저장 후 다시 3초 눌러야 보이게
              }}
              onCancel={() => {
                setEdit(false);
                setCanvasPreview(false); // ✅ 취소 시 안전하게 초기화
                hideEditButton();
              }}
            />
          )}

          {edit && layout.mode !== 'custom' && (
            <div style={styles.modalBg} onClick={() => { setEdit(false); hideEditButton(); }}>
              <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>
                  {T.editModePick}
                </div>

                <TemplatePicker
                  lang={lang}
                  onPick={(id) => {
                    const next = { ...layout, mode: 'template', templateId: id };
                    setLayout(next);
                    saveJson(KEYS.MENU_LAYOUT, next);

                    setEdit(false);
                    hideEditButton();
                  }}
                />

                <div style={{ height: 12 }} />

                <button
                  style={styles.primaryBtn}
                  onClick={() => {
                    const next = { ...layout, mode: 'custom', templateId: null };
                    setLayout(next);
                    saveJson(KEYS.MENU_LAYOUT, next);
                    setEdit(true);
                  }}
                >
                  {T.freeEdit}
                </button>

                <button
                  style={styles.secondaryBtn}
                  onClick={() => {
                    setEdit(false);
                    hideEditButton();
                  }}
                >
                  {T.close}
                </button>
              </div>
            </div>
          )}

          {/* ✅ PIN 모달 */}
          {pinModalOpen && (
            <div style={styles.modalBg} onClick={() => setPinModalOpen(false)}>
              <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>
                  {T.pinEnterTitle}
                </div>
                <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 10 }}>
                  {T.pinEnterDesc}
                </div>

                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  inputMode="numeric"
                  placeholder={lang === 'ko' ? '4자리 숫자' : '4 digits'}
                  style={styles.pinInput}
                  maxLength={4}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitPin();
                    if (e.key === 'Escape') setPinModalOpen(false);
                  }}
                />

                {pinError && <div style={styles.errText}>{pinError}</div>}

                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button style={styles.primaryBtn} onClick={submitPin}>{T.confirm}</button>
                  <button style={styles.secondaryBtn} onClick={() => setPinModalOpen(false)}>{T.cancel}</button>
                </div>
              </div>
            </div>
          )}

          {/* ✅ 비밀번호 설정 모달 */}
          {settingsOpen && (
            <div style={styles.modalBg} onClick={() => setSettingsOpen(false)}>
              <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>
                  {T.pinSettings}
                </div>

                <div style={{ fontWeight: 900, marginBottom: 6 }}>{T.pinChange}</div>

                <input
                  type="password"
                  value={curPinInput}
                  onChange={(e) => setCurPinInput(e.target.value)}
                  inputMode="numeric"
                  placeholder={T.curPin}
                  style={styles.pinInput}
                  maxLength={4}
                />
                <input
                  type="password"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  inputMode="numeric"
                  placeholder={T.newPin}
                  style={styles.pinInput}
                  maxLength={4}
                />
                <input
                  type="password"
                  value={newPinConfirm}
                  onChange={(e) => setNewPinConfirm(e.target.value)}
                  inputMode="numeric"
                  placeholder={T.newPin2}
                  style={styles.pinInput}
                  maxLength={4}
                />

                {settingsError && <div style={styles.errText}>{settingsError}</div>}
                {settingsMsg && <div style={styles.okText}>{settingsMsg}</div>}

                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button style={styles.primaryBtn} onClick={submitChangePin}>{T.change}</button>
                  <button
                    style={styles.secondaryBtn}
                    onClick={() => {
                      setSettingsOpen(false);
                      setSettingsError('');
                      setSettingsMsg('');
                    }}
                  >
                    {T.close}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

const styles = {
  container: { width: '100vw', height: '100vh', background: '#111' },

  setupWrap: {
    width: '100%',
    height: '100%',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    boxSizing: 'border-box',
  },
  setupCard: {
    width: 'min(720px, 92vw)',
    background: '#fff',
    borderRadius: 18,
    padding: 22,
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
  },
  title: { fontSize: 22, fontWeight: 900, marginBottom: 8 },
  desc: { fontSize: 14, lineHeight: 1.45, opacity: 0.85, marginBottom: 16 },

  dropZone: {
    border: '2px dashed #bbb',
    borderRadius: 16,
    padding: 20,
    textAlign: 'center',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.15s ease',
  },
  dropZoneActive: {
    borderColor: '#222',
    background: 'rgba(0,0,0,0.04)',
  },
  dropIcon: { fontSize: 42, marginBottom: 6 },
  dropText: { fontSize: 15, lineHeight: 1.45 },
  linkLike: { textDecoration: 'underline', fontWeight: 900 },
  hint: { marginTop: 10, fontSize: 12, opacity: 0.65 },
  smallNote: { marginTop: 12, fontSize: 12, opacity: 0.7 },

  stage: { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' },
  bgImg: { width: '100%', height: '100%', objectFit: 'cover' },

  secretHotspot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 90,
    height: 90,
    zIndex: 1000,
    background: 'transparent',
    touchAction: 'none',
  },

  // ✅ 언어 버튼(국기)
  langWrap: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2600,
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  langBtn: {
    width: 40,
    height: 32,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.6)',
    background: 'rgba(0,0,0,0.45)',
    cursor: 'pointer',
    fontSize: 18,
    lineHeight: '32px',
  },
  langBtnActive: {
    border: '1px solid rgba(255,255,255,0.95)',
    background: 'rgba(0,0,0,0.65)',
  },

  // ✅ 보기모드에서만 보이는 수정 버튼
  editBtn: {
    position: 'absolute',
    top: 58,
    right: 16,
    padding: '10px 14px',
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 900,
    zIndex: 2200,
  },

  // ✅ 편집모드 상단 버튼바 (언어 길이 상관없이 일정 간격)
  editTopBar: {
    position: 'absolute',
    top: 58,
    right: 16,
    zIndex: 2500, // ✅ Inspector보다 위
    display: 'flex',
    gap: 10,
    alignItems: 'center',
  },
  topBtn: {
    padding: '10px 14px',
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 900,
    background: 'rgba(255,255,255,0.9)',
    whiteSpace: 'nowrap',
  },

  // ✅ 뒤로가기(영상으로)
  backBtn: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    padding: '10px 14px',
    borderRadius: 999,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 900,
    zIndex: 2200,
    background: 'rgba(255,255,255,0.9)',
  },

  badge: {
    position: 'absolute',
    left: 16,
    top: 16,
    zIndex: 150,
    color: '#fff',
    background: 'rgba(0,0,0,0.55)',
    padding: '8px 10px',
    borderRadius: 10,
  },

  helpHint: {
    position: 'absolute',
    left: 16,
    bottom: 60,
    zIndex: 150,
    color: '#fff',
    background: 'rgba(0,0,0,0.55)',
    padding: 12,
    borderRadius: 12,
    maxWidth: 520,
  },

  modalBg: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,.6)',
    display: 'grid',
    placeItems: 'center',
    zIndex: 3000,
  },
  modal: {
    width: 'min(520px, 92vw)',
    background: '#fff',
    padding: 18,
    borderRadius: 16,
  },

  pinInput: {
    width: '100%',
    padding: '12px 12px',
    borderRadius: 12,
    border: '1px solid #ddd',
    fontWeight: 900,
    fontSize: 16,
    letterSpacing: 4,
    boxSizing: 'border-box',
    marginBottom: 8,
  },

  errText: { marginTop: 8, color: '#c00000', fontWeight: 900, fontSize: 13 },
  okText: { marginTop: 8, color: '#0a7a2f', fontWeight: 900, fontSize: 13 },

  primaryBtn: {
    flex: 1,
    padding: '12px 14px',
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 900,
    background: '#111',
    color: '#fff',
  },
  secondaryBtn: {
    flex: 1,
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid #ddd',
    cursor: 'pointer',
    fontWeight: 900,
    background: '#fff',
  },
};