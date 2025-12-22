'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { KEYS, loadBlob, saveBlob, loadJson, saveJson } from '@/lib/storage';
import CustomCanvas from './CustomCanvas';

const DEFAULT_LAYOUT = { mode: null, templateId: null, items: [] };

// ✅ 옵션들
const SECRET_TAPS = 5;
const TAP_WINDOW_MS = 2500;
const AUTO_HIDE_MS = 5000;
const LONG_PRESS_MS = 3000;

function TemplatePicker({ onPick }) {
  return (
    <div>
      <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 12 }}>템플릿 선택</div>
      <div style={{ display: 'grid', gap: 10 }}>
        <button style={tpBtn} onClick={() => onPick('T1')}>리스트형</button>
        <button style={tpBtn} onClick={() => onPick('T2')}>사진 + 리스트</button>
        <button style={tpBtn} onClick={() => onPick('T3')}>그리드형</button>
      </div>
      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
        * 템플릿은 다음 단계에서 입력 UI를 붙일 예정입니다.
      </div>
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

  useEffect(() => {
    (async () => {
      const bg = await loadBlob(KEYS.MENU_BG);
      const lay = (await loadJson(KEYS.MENU_LAYOUT)) || DEFAULT_LAYOUT;
      if (bg) setBgBlob(bg);
      setLayout(lay);
    })();
  }, []);

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
    // 편집모드면 원래 항상 보여야 하므로 그냥 true
    if (edit) {
      setShowEditBtn(true);
      return;
    }

    setShowEditBtn(true);

    if (autoHideRef.current) clearTimeout(autoHideRef.current);
    autoHideRef.current = setTimeout(() => {
      // 5초 뒤에도 편집 모드가 아니면 숨김
      if (!edit) setShowEditBtn(false);
    }, AUTO_HIDE_MS);
  };

  // ✅ 5번 클릭 감지
  const onSecretCornerClick = () => {
    if (edit) return; // 편집모드에서는 의미 없음

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

  // ✅ 편집모드에서는 수정 버튼 항상 보이게, 보기모드로 돌아오면 즉시 숨김
  useEffect(() => {
    if (edit) {
      if (autoHideRef.current) {
        clearTimeout(autoHideRef.current);
        autoHideRef.current = null;
      }
      setShowEditBtn(true);
    } else {
      // ✅ 핵심: 저장/취소로 edit=false가 되면 수정 버튼은 즉시 숨김
      setShowEditBtn(false);
    }
  }, [edit]);

  // ✅ cleanup
  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (autoHideRef.current) clearTimeout(autoHideRef.current);
      if (longPressRef.current) clearTimeout(longPressRef.current);
    };
  }, []);

  return (
    <div style={styles.container}>
      {!bgUrl ? (
        // ✅ 배경 업로드 안내 화면
        <div style={styles.setupWrap}>
          <div style={styles.setupCard}>
            <div style={styles.title}>메뉴판 배경을 선택하세요</div>
            <div style={styles.desc}>
              메뉴판에 깔릴 <b>배경 이미지</b>를 업로드해 주세요.
              <br />
              업로드 후에는 배경이 자동 적용됩니다.
            </div>

            <div
              style={{
                ...styles.dropZone,
                ...(dragOver ? styles.dropZoneActive : {}),
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={openFilePicker}
              role="button"
              tabIndex={0}
            >
              <div style={styles.dropIcon}>🖼️</div>
              <div style={styles.dropText}>
                여기로 이미지를 드래그해서 놓거나
                <br />
                <span style={styles.linkLike}>클릭해서 배경을 선택</span>하세요
              </div>
              <div style={styles.hint}>권장: JPG/PNG · 가로형(16:9)</div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => uploadBg(e.target.files?.[0])}
            />

            <div style={styles.smallNote}>
              * 배경은 브라우저에 저장되어 다음 실행에도 유지됩니다.
            </div>
          </div>
        </div>
      ) : (
        // ✅ 배경 있을 때: 메뉴판(보기/편집)
        <div style={styles.stage}>
          <img src={bgUrl} alt="menu background" style={styles.bgImg} />

          {/* ✅ showEditBtn이 true면 hotspot을 렌더하지 않음(버튼 클릭 막는 문제 방지) */}
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

          {/* ✅ 수정 버튼: 편집모드에서는 항상, 보기모드에서는 showEditBtn일 때만 */}
          {(edit || showEditBtn) && (
            <button
              style={styles.editBtn}
              onClick={(e) => {
                e.stopPropagation();
                setEdit(true);
                // 편집 들어가면 계속 보여야 하므로 showEditBtn은 effect에서 true로 유지됨
              }}
            >
              수정
            </button>
          )}

          {/* ✅ 편집 모드일 때만 배경 다시 선택 (수정 바로 왼쪽) */}
          {edit && (
            <>
              <button style={styles.changeBgBtn} onClick={openFilePicker}>
                배경 다시 선택
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => uploadBg(e.target.files?.[0])}
              />
            </>
          )}

          {/* ✅ 모드 안내 */}
          {!layout.mode && (
            <div style={styles.helpHint}>
              우측 상단 모서리를 <b>5번 클릭</b>하거나 <b>3초 길게 누르기</b> 하면
              <b>수정</b> 버튼이 나타납니다. (5초 후 자동으로 숨김)
            </div>
          )}

          {layout.mode === 'template' && (
            <div style={styles.badge}>템플릿 모드: {layout.templateId}</div>
          )}

          {/* ✅ 자유배치 모드 */}
          {layout.mode === 'custom' && (
            <CustomCanvas
              items={layout.items}
              editing={edit}
              onChangeItems={(items) => {
                const next = { ...layout, mode: 'custom', items };
                setLayout(next);
              }}
              onSave={(items) => {
                const next = { ...layout, mode: 'custom', items };
                setLayout(next);
                saveJson(KEYS.MENU_LAYOUT, next);

                // ✅ 저장 = 편집 종료 → 보기모드로 복귀
                setEdit(false);

                // ✅ 핵심: 저장 후에는 수정버튼 즉시 숨김 (다시 3초 눌러야 보임)
                hideEditButton();
              }}
              onCancel={() => {
                // ✅ 취소 = 편집 종료 → 보기모드
                setEdit(false);

                // ✅ 취소 후에도 수정버튼 즉시 숨김
                hideEditButton();
              }}
            />
          )}

          {/* ✅ 수정 모달 */}
          {edit && layout.mode !== 'custom' && (
            <div style={styles.modalBg} onClick={() => { setEdit(false); hideEditButton(); }}>
              <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>
                  수정 방식 선택
                </div>

                <TemplatePicker
                  onPick={(id) => {
                    const next = { ...layout, mode: 'template', templateId: id };
                    setLayout(next);
                    saveJson(KEYS.MENU_LAYOUT, next);

                    // ✅ 선택 후 편집 종료
                    setEdit(false);

                    // ✅ 보기모드로 나가면 수정버튼 숨김(다시 3초 눌러야)
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

                    // ✅ 자유배치는 편집 계속 ON
                    setEdit(true);
                  }}
                >
                  자유 배치로 편집하기
                </button>

                <button
                  style={styles.secondaryBtn}
                  onClick={() => {
                    setEdit(false);
                    hideEditButton();
                  }}
                >
                  닫기
                </button>
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

  // ✅ 우상단 “비밀 클릭/롱프레스” 영역
  secretHotspot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 90,
    height: 90,
    zIndex: 1000,
    background: 'transparent',
    touchAction: 'none', // 모바일 long press 안정화
  },

  editBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: '10px 14px',
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 900,
    zIndex: 2000,
  },

  // ✅ “배경 다시 선택”을 수정 바로 왼쪽으로
  changeBgBtn: {
    position: 'absolute',
    top: 16,
    right: 16 + 72,
    padding: '10px 14px',
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 900,
    zIndex: 2000,
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
    width: 'min(720px, 92vw)',
    background: '#fff',
    padding: 18,
    borderRadius: 16,
  },
  primaryBtn: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 900,
    background: '#111',
    color: '#fff',
    marginBottom: 10,
  },
  secondaryBtn: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid #ddd',
    cursor: 'pointer',
    fontWeight: 900,
    background: '#fff',
  },
};