'use client';

import { useEffect, useMemo, useState } from 'react';
import { Rnd } from 'react-rnd';

const FONTS = [
  { label: 'Pretendard', value: 'Pretendard, system-ui, -apple-system, Segoe UI, Roboto, sans-serif' },
  { label: 'Noto Sans KR', value: '"Noto Sans KR", system-ui, -apple-system, Segoe UI, Roboto, sans-serif' },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Mono', value: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' },
];

const SHAPES = [
  { label: 'Rectangle', value: 'rect' },
  { label: 'Rounded', value: 'rounded' },
  { label: 'Circle', value: 'circle' },
  { label: 'Triangle', value: 'triangle' },
  { label: 'Diamond', value: 'diamond' },
];

const PRESET_KEY = 'MENU_CUSTOM_PRESETS_V1';
const SNAP_THRESHOLD = 8;

export default function CustomCanvas({ items = [], onChangeItems, onSave, onCancel, editing = false }) {
  const incomingItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const [draft, setDraft] = useState(incomingItems);
  const [origin, setOrigin] = useState(incomingItems);
  const safeItems = useMemo(() => (Array.isArray(draft) ? draft : []), [draft]);

  const [dirty, setDirty] = useState(false);

  // ✅ 선택 유지
  const [selectedIds, setSelectedIds] = useState([]);
  const selectedId = selectedIds[0] || null;

  // ✅ 드래그 중에 빈공간 클릭으로 선택 풀리는 것 방지
  const [isDragging, setIsDragging] = useState(false);

  // ✅ 스냅/그리드
  const [snapOn, setSnapOn] = useState(true);
  const [gridOn, setGridOn] = useState(false);
  const [gridSize, setGridSize] = useState(10);

  // ✅ 프리셋
  const [presets, setPresets] = useState([]);

  const selected = useMemo(
    () => safeItems.find((it) => it.id === selectedId) || null,
    [safeItems, selectedId]
  );

  useEffect(() => {
    setPresets(loadPresets());
  }, []);

  // ✅ 보기모드로 바뀌면: 드래그 상태/선택 정리 (편집 UI 없으니까)
  useEffect(() => {
    if (!editing) {
      setIsDragging(false);
      setSelectedIds([]);
    }
  }, [editing]);

  // ✅ 핵심: 편집 중(dirty)에는 부모 items로 덮어쓰기 금지
  useEffect(() => {
    if (dirty) return;
    setDraft(incomingItems);
    setOrigin(incomingItems);
    setSelectedIds([]);
    setDirty(false);
  }, [incomingItems, dirty]);

  const commit = (next) => {
    setDraft(next);
    setDirty(true);
    onChangeItems?.(next);
  };

  const updateMany = (ids, patch) => {
    const set = new Set(ids);
    const next = safeItems.map((it) => (set.has(it.id) ? { ...it, ...patch } : it));
    commit(next);
  };

  const updateItem = (id, patch) => {
    const next = safeItems.map((it) => (it.id === id ? { ...it, ...patch } : it));
    commit(next);
  };

  const removeMany = (ids) => {
    const set = new Set(ids);
    const next = safeItems.filter((it) => !set.has(it.id));
    commit(next);
    setSelectedIds((prev) => prev.filter((id) => !set.has(id)));
  };

  const newId = () => (crypto.randomUUID?.() || String(Date.now() + Math.random()));

  // -----------------------------
  // Adders
  // -----------------------------
  const addFoodName = () => {
    const id = newId();
    const next = [
      ...safeItems,
      {
        id,
        type: 'text',
        role: 'name',
        x: 60,
        y: 80,
        w: 520,
        h: 90,
        text: '음식 이름',
        fontFamily: FONTS[0].value,
        size: 52,
        color: '#ffffff',
        bold: true,
        italic: false,
        align: 'left',
        opacity: 1,
        z: maxZ(safeItems) + 1,
        locked: false,
        groupId: null,
      },
    ];
    commit(next);
    setSelectedIds([id]);
  };

  const addPrice = () => {
    const id = newId();
    const next = [
      ...safeItems,
      {
        id,
        type: 'text',
        role: 'price',
        x: 60,
        y: 180,
        w: 320,
        h: 70,
        text: '₩9,900',
        fontFamily: FONTS[0].value,
        size: 46,
        color: '#ffffff',
        bold: true,
        italic: false,
        align: 'left',
        opacity: 1,
        z: maxZ(safeItems) + 1,
        locked: false,
        groupId: null,
      },
    ];
    commit(next);
    setSelectedIds([id]);
  };

  const addPhoto = async (file) => {
    if (!file) return;
    const src = await fileToDataUrl(file);
    const id = newId();
    const next = [
      ...safeItems,
      {
        id,
        type: 'image',
        x: 80,
        y: 120,
        w: 320,
        h: 240,
        src,
        shape: 'rounded',
        radius: 18,
        fit: 'contain',
        opacity: 1,
        z: maxZ(safeItems) + 1,
        locked: false,
        groupId: null,
      },
    ];
    commit(next);
    setSelectedIds([id]);
  };

  // -----------------------------
  // Selection
  // -----------------------------
  const toggleSelect = (id, additive) => {
    setSelectedIds((prev) => {
      if (!additive) return [id];
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  };
  const clearSelect = () => setSelectedIds([]);

  // -----------------------------
  // Save / Cancel
  // -----------------------------
  const doSave = () => {
    setOrigin(safeItems);
    setDirty(false);
    onSave?.(safeItems);
  };

  const doCancel = () => {
    setDraft(origin);
    setDirty(false);
    setSelectedIds([]);
    onCancel?.(origin);
  };

  // -----------------------------
  // Keyboard (편집모드에서만!)
  // -----------------------------
  useEffect(() => {
    if (!editing) return;

    const onKey = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length) {
        e.preventDefault();
        removeMany(selectedIds);
      }

      if (selectedIds.length && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 2;
        let dx = 0, dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        moveMany(selectedIds, dx, dy);
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        doCancel();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, selectedIds, safeItems, origin]);

  // -----------------------------
  // Move / Snap
  // -----------------------------
  const moveMany = (ids, dx, dy) => {
    const set = new Set(ids);
    const next = safeItems.map((it) => {
      if (!set.has(it.id)) return it;
      if (it.locked) return it;
      return { ...it, x: it.x + dx, y: it.y + dy };
    });
    commit(next);
  };

  const applySnap = (movingId, x, y, w, h) => {
    let nx = x, ny = y;

    if (gridOn) {
      nx = Math.round(nx / gridSize) * gridSize;
      ny = Math.round(ny / gridSize) * gridSize;
    }

    if (!snapOn) return { x: nx, y: ny };

    const others = safeItems.filter((it) => it.id !== movingId);
    const xCandidates = [];
    const yCandidates = [];

    for (const o of others) {
      xCandidates.push(o.x, o.x + o.w, o.x + o.w / 2);
      yCandidates.push(o.y, o.y + o.h, o.y + o.h / 2);
    }

    nx = snapBest(nx, [
      ...xCandidates,
      ...xCandidates.map((c) => c - w),
      ...xCandidates.map((c) => c - w / 2),
    ]);

    ny = snapBest(ny, [
      ...yCandidates,
      ...yCandidates.map((c) => c - h),
      ...yCandidates.map((c) => c - h / 2),
    ]);

    return { x: Math.round(nx), y: Math.round(ny) };
  };

  function snapBest(value, candidates) {
    let best = value;
    let bestDist = SNAP_THRESHOLD + 1;
    for (const c of candidates) {
      const d = Math.abs(value - c);
      if (d <= SNAP_THRESHOLD && d < bestDist) {
        best = c;
        bestDist = d;
      }
    }
    return best;
  }

  // -----------------------------
  // Group / Lock
  // -----------------------------
  const lockSelected = () => updateMany(selectedIds, { locked: true });
  const unlockSelected = () => updateMany(selectedIds, { locked: false });

  const groupSelected = () => {
    if (selectedIds.length < 2) return;
    const gid = 'g_' + newId();
    updateMany(selectedIds, { groupId: gid });
  };

  const ungroupSelected = () => updateMany(selectedIds, { groupId: null });

  // -----------------------------
  // Z-order / Duplicate
  // -----------------------------
  const bringForward = () => {
    if (!selectedIds.length) return;
    let z = maxZ(safeItems) + 1;
    const set = new Set(selectedIds);
    const next = safeItems.map((it) => {
      if (!set.has(it.id)) return it;
      z += 1;
      return { ...it, z };
    });
    commit(next);
  };

  const sendBackward = () => {
    if (!selectedIds.length) return;
    const set = new Set(selectedIds);
    const next = safeItems.map((it) =>
      set.has(it.id) ? { ...it, z: Math.max(0, (it.z || 0) - 1) } : it
    );
    commit(next);
  };

  const duplicateSelected = () => {
    if (!selectedIds.length) return;
    const selectedItems = safeItems.filter((it) => selectedIds.includes(it.id));
    let z = maxZ(safeItems) + 1;
    const copies = selectedItems.map((it) => ({
      ...it,
      id: newId(),
      x: it.x + 20,
      y: it.y + 20,
      z: ++z,
      locked: false,
    }));
    commit([...safeItems, ...copies]);
    setSelectedIds(copies.map((c) => c.id));
  };

  // -----------------------------
  // Align (Multi)
  // -----------------------------
  const alignLeft = () => {
    if (selectedIds.length < 2) return;
    const sel = safeItems.filter((it) => selectedIds.includes(it.id));
    const minX = Math.min(...sel.map((it) => it.x));
    updateMany(selectedIds, { x: minX });
  };

  const alignRight = () => {
    if (selectedIds.length < 2) return;
    const sel = safeItems.filter((it) => selectedIds.includes(it.id));
    const maxR = Math.max(...sel.map((it) => it.x + it.w));
    const set = new Set(selectedIds);
    const next = safeItems.map((it) => {
      if (!set.has(it.id) || it.locked) return it;
      return { ...it, x: maxR - it.w };
    });
    commit(next);
  };

  const alignCenter = () => {
    if (selectedIds.length < 2) return;
    const sel = safeItems.filter((it) => selectedIds.includes(it.id));
    const center = (Math.min(...sel.map((it) => it.x)) + Math.max(...sel.map((it) => it.x + it.w))) / 2;
    const set = new Set(selectedIds);
    const next = safeItems.map((it) => {
      if (!set.has(it.id) || it.locked) return it;
      return { ...it, x: Math.round(center - it.w / 2) };
    });
    commit(next);
  };

  const alignTop = () => {
    if (selectedIds.length < 2) return;
    const sel = safeItems.filter((it) => selectedIds.includes(it.id));
    const minY = Math.min(...sel.map((it) => it.y));
    updateMany(selectedIds, { y: minY });
  };

  const alignBottom = () => {
    if (selectedIds.length < 2) return;
    const sel = safeItems.filter((it) => selectedIds.includes(it.id));
    const maxB = Math.max(...sel.map((it) => it.y + it.h));
    const set = new Set(selectedIds);
    const next = safeItems.map((it) => {
      if (!set.has(it.id) || it.locked) return it;
      return { ...it, y: maxB - it.h };
    });
    commit(next);
  };

  const alignMiddle = () => {
    if (selectedIds.length < 2) return;
    const sel = safeItems.filter((it) => selectedIds.includes(it.id));
    const mid = (Math.min(...sel.map((it) => it.y)) + Math.max(...sel.map((it) => it.y + it.h))) / 2;
    const set = new Set(selectedIds);
    const next = safeItems.map((it) => {
      if (!set.has(it.id) || it.locked) return it;
      return { ...it, y: Math.round(mid - it.h / 2) };
    });
    commit(next);
  };

  // -----------------------------
  // Presets
  // -----------------------------
  const savePreset = () => {
    const name = prompt('프리셋 이름을 입력하세요', '내 메뉴 프리셋');
    if (!name) return;
    const all = loadPresets();
    all.push({ id: newId(), name, createdAt: Date.now(), items: safeItems });
    persistPresets(all);
    setPresets(all);
    alert('프리셋 저장 완료!');
  };

  const loadPreset = (presetId) => {
    const all = loadPresets();
    const p = all.find((x) => x.id === presetId);
    if (!p) return;
    const remapped = p.items.map((it) => ({ ...it, id: newId() }));
    commit(remapped);
    setSelectedIds([]);
  };

  // ✅ 프리셋 삭제 (버튼 복구)
  const deletePresetByName = () => {
    const name = prompt('삭제할 프리셋 이름을 정확히 입력하세요');
    if (!name) return;
    const p = presets.find((x) => x.name === name);
    if (!p) return alert('해당 이름의 프리셋이 없어요.');
    if (!confirm(`"${p.name}" 프리셋을 삭제할까요?`)) return;

    const next = loadPresets().filter((x) => x.id !== p.id);
    persistPresets(next);
    setPresets(next);
  };

  // ✅ 보기모드: 아이템만 렌더(툴/UI 숨김 + Rnd 비활성화)
  const isEdit = !!editing;

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <>
      {/* ✅ 편집모드에서만 Toolbar */}
      {isEdit && (
        <div
          style={styles.toolbar}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button style={styles.toolBtn} onClick={addFoodName}>+ 음식이름</button>
          <button style={styles.toolBtn} onClick={addPrice}>+ 가격</button>

          <label style={{ ...styles.toolBtn, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            + 사진
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => addPhoto(e.target.files?.[0])}
            />
          </label>

          <span style={styles.sep} />

          <label style={styles.chk}>
            <input type="checkbox" checked={snapOn} onChange={(e) => setSnapOn(e.target.checked)} />
            Snap
          </label>

          <label style={styles.chk}>
            <input type="checkbox" checked={gridOn} onChange={(e) => setGridOn(e.target.checked)} />
            Grid
          </label>

          {gridOn && (
            <input
              type="number"
              min={4}
              max={100}
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value || 10))}
              style={styles.gridNum}
              title="Grid Size"
            />
          )}

          <span style={styles.sep} />

          <button style={styles.toolBtnSm} onClick={savePreset}>Save Preset</button>

          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) loadPreset(e.target.value);
              e.target.value = '';
            }}
            style={styles.presetSelect}
          >
            <option value="">Load Preset…</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* ✅ 프리셋 삭제 버튼 복구 */}
          {presets.length > 0 && (
            <button style={styles.toolBtnSm} onClick={deletePresetByName}>
              Delete Preset
            </button>
          )}

          <span style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>
            {dirty ? '● Editing (Not Saved)' : 'Saved'}
          </span>
        </div>
      )}

      {/* ✅ 편집모드에서만 SAVE / CANCEL */}
      {isEdit && (
        <div
          style={styles.saveBar}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button style={styles.saveBtn} onClick={doSave}>SAVE</button>
          <button style={styles.cancelBtn} onClick={doCancel}>CANCEL</button>
        </div>
      )}

      {/* Canvas (보기모드에서도 렌더) */}
      <div
        style={styles.layer}
        onClick={(e) => {
          if (!isEdit) return;
          if (e.target === e.currentTarget && !isDragging) clearSelect();
        }}
      >
        {safeItems
          .slice()
          .sort((a, b) => (a.z || 0) - (b.z || 0))
          .map((it) => {
            const isSelected = selectedIds.includes(it.id);
            const isLocked = !!it.locked;

            return (
              <Rnd
                key={it.id}
                bounds="parent"
                size={{ width: it.w, height: it.h }}
                position={{ x: it.x, y: it.y }}
                disableDragging={!isEdit || isLocked}
                enableResizing={!isEdit ? false : (isLocked ? false : undefined)}
                onMouseDown={(e) => {
                  if (!isEdit) return;
                  e.stopPropagation();
                  toggleSelect(it.id, e.shiftKey);
                }}
                onDragStart={() => isEdit && setIsDragging(true)}
                onResizeStart={() => isEdit && setIsDragging(true)}
                onDragStop={(e, d) => {
                  if (!isEdit) return;
                  setIsDragging(false);
                  if (isLocked) return;
                  const { x: sx, y: sy } = applySnap(it.id, d.x, d.y, it.w, it.h);
                  updateItem(it.id, { x: sx, y: sy });
                }}
                onResizeStop={(e, dir, ref, delta, pos) => {
                  if (!isEdit) return;
                  setIsDragging(false);
                  if (isLocked) return;
                  const w = ref.offsetWidth;
                  const h = ref.offsetHeight;
                  const { x: sx, y: sy } = applySnap(it.id, pos.x, pos.y, w, h);
                  updateItem(it.id, { w, h, x: sx, y: sy });
                }}
                style={{ zIndex: it.z || 0 }}
              >
                <ItemBox item={it} selected={isEdit && isSelected} />
              </Rnd>
            );
          })}
      </div>

      {/* ✅ 편집모드에서만 Inspector */}
      {isEdit && (
        <div
          style={styles.inspector}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={styles.inspectorTitle}>속성</div>

          {/* 멀티 선택 퀵 액션 */}
          {selectedIds.length >= 2 && (
            <div style={styles.multiBox}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>선택: {selectedIds.length}개</div>

              <div style={styles.multiGrid}>
                <button style={styles.actionBtn} onClick={alignLeft}>Left</button>
                <button style={styles.actionBtn} onClick={alignCenter}>Center</button>
                <button style={styles.actionBtn} onClick={alignRight}>Right</button>
                <button style={styles.actionBtn} onClick={alignTop}>Top</button>
                <button style={styles.actionBtn} onClick={alignMiddle}>Middle</button>
                <button style={styles.actionBtn} onClick={alignBottom}>Bottom</button>
              </div>

              <div style={styles.multiGrid}>
                <button style={styles.actionBtn} onClick={groupSelected}>Group</button>
                <button style={styles.actionBtn} onClick={ungroupSelected}>Ungroup</button>
                <button style={styles.actionBtn} onClick={duplicateSelected}>Duplicate</button>
                <button style={styles.actionBtn} onClick={bringForward}>Bring +</button>
                <button style={styles.actionBtn} onClick={sendBackward}>Send -</button>
                <button style={styles.actionBtn} onClick={lockSelected}>Lock</button>
                <button style={styles.actionBtn} onClick={unlockSelected}>Unlock</button>
                <button
                  style={{ ...styles.actionBtn, background: '#ffefef', borderColor: '#ffb7b7' }}
                  onClick={() => removeMany(selectedIds)}
                >
                  Delete
                </button>
              </div>

              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                * Shift+클릭 다중선택 · 방향키 이동(Shift는 10px) · Delete 삭제
              </div>

              <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #eee' }} />
            </div>
          )}

          {!selected ? (
            <div style={{ fontSize: 13, opacity: 0.8 }}>
              요소를 클릭하면 속성이 계속 표시돼요.
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                - Shift+클릭: 다중 선택<br />
                - Delete: 삭제<br />
                - 방향키: 이동 (Shift는 빠르게)
              </div>
            </div>
          ) : (
            <>
              <div style={styles.row}>
                <div style={styles.label}>Type</div>
                <div style={styles.value}>
                  {selected.type === 'text'
                    ? (selected.role === 'price' ? 'Text (Price)' : 'Text (Name)')
                    : 'Photo'}
                </div>
              </div>

              <div style={styles.row}>
                <div style={styles.label}>Locked</div>
                <button
                  style={toggleBtn(!!selected.locked)}
                  onClick={() => updateItem(selected.id, { locked: !selected.locked })}
                >
                  {selected.locked ? 'Locked' : 'Unlocked'}
                </button>
              </div>

              {/* 공통: 투명도 */}
              <div style={styles.row}>
                <div style={styles.label}>Opacity</div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={selected.opacity ?? 1}
                  onChange={(e) => updateItem(selected.id, { opacity: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              {/* 텍스트 */}
              {selected.type === 'text' && (
                <>
                  <div style={styles.rowCol}>
                    <div style={styles.label}>Text</div>
                    <input
                      value={selected.text || ''}
                      onChange={(e) => updateItem(selected.id, { text: e.target.value })}
                      style={styles.input}
                      disabled={selected.locked}
                    />
                  </div>

                  <div style={styles.row}>
                    <div style={styles.label}>Font</div>
                    <select
                      value={selected.fontFamily || FONTS[0].value}
                      onChange={(e) => updateItem(selected.id, { fontFamily: e.target.value })}
                      style={styles.select}
                      disabled={selected.locked}
                    >
                      {FONTS.map((f) => (
                        <option key={f.label} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.row}>
                    <div style={styles.label}>Size</div>
                    <input
                      type="number"
                      value={selected.size || 36}
                      min={10}
                      max={200}
                      onChange={(e) => updateItem(selected.id, { size: Number(e.target.value) })}
                      style={styles.num}
                      disabled={selected.locked}
                    />
                  </div>

                  <div style={styles.row}>
                    <div style={styles.label}>Color</div>
                    <input
                      type="color"
                      value={selected.color || '#ffffff'}
                      onChange={(e) => updateItem(selected.id, { color: e.target.value })}
                      style={styles.color}
                      disabled={selected.locked}
                    />
                  </div>

                  <div style={styles.row}>
                    <div style={styles.label}>Style</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        style={toggleBtn(!!selected.bold)}
                        onClick={() => updateItem(selected.id, { bold: !selected.bold })}
                        disabled={selected.locked}
                      >
                        Bold
                      </button>
                      <button
                        style={toggleBtn(!!selected.italic)}
                        onClick={() => updateItem(selected.id, { italic: !selected.italic })}
                        disabled={selected.locked}
                      >
                        Italic
                      </button>
                    </div>
                  </div>

                  <div style={styles.row}>
                    <div style={styles.label}>Align</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        style={toggleBtn((selected.align || 'left') === 'left')}
                        onClick={() => updateItem(selected.id, { align: 'left' })}
                        disabled={selected.locked}
                      >
                        Left
                      </button>
                      <button
                        style={toggleBtn((selected.align || 'left') === 'center')}
                        onClick={() => updateItem(selected.id, { align: 'center' })}
                        disabled={selected.locked}
                      >
                        Center
                      </button>
                      <button
                        style={toggleBtn((selected.align || 'left') === 'right')}
                        onClick={() => updateItem(selected.id, { align: 'right' })}
                        disabled={selected.locked}
                      >
                        Right
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* 사진 */}
              {selected.type === 'image' && (
                <>
                  <div style={styles.row}>
                    <div style={styles.label}>Shape</div>
                    <select
                      value={selected.shape || 'rounded'}
                      onChange={(e) => updateItem(selected.id, { shape: e.target.value })}
                      style={styles.select}
                      disabled={selected.locked}
                    >
                      {SHAPES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  {selected.shape === 'rounded' && (
                    <div style={styles.row}>
                      <div style={styles.label}>Radius</div>
                      <input
                        type="number"
                        value={selected.radius ?? 18}
                        min={0}
                        max={200}
                        onChange={(e) => updateItem(selected.id, { radius: Number(e.target.value) })}
                        style={styles.num}
                        disabled={selected.locked}
                      />
                    </div>
                  )}

                  <div style={styles.row}>
                    <div style={styles.label}>Fit</div>
                    <select
                      value={selected.fit || 'contain'}
                      onChange={(e) => updateItem(selected.id, { fit: e.target.value })}
                      style={styles.select}
                      disabled={selected.locked}
                    >
                      <option value="contain">Contain (전체 보이게)</option>
                      <option value="cover">Cover (꽉 채우기)</option>
                    </select>
                  </div>
                </>
              )}

              {/* 단일 선택 액션 */}
              <div style={styles.actions}>
                <button style={styles.actionBtn} onClick={duplicateSelected}>Duplicate</button>
                <button style={styles.actionBtn} onClick={bringForward}>Bring +</button>
                <button style={styles.actionBtn} onClick={sendBackward}>Send -</button>
                <button style={styles.actionBtn} onClick={() => updateItem(selected.id, { locked: true })}>Lock</button>
                <button style={styles.actionBtn} onClick={() => updateItem(selected.id, { locked: false })}>Unlock</button>
                <button
                  style={{ ...styles.actionBtn, background: '#ffefef', borderColor: '#ffb7b7' }}
                  onClick={() => removeMany([selected.id])}
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );

  // -----------------------------
  // Preset storage
  // -----------------------------
  function loadPresets() {
    try {
      const raw = localStorage.getItem(PRESET_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  function persistPresets(arr) {
    localStorage.setItem(PRESET_KEY, JSON.stringify(arr));
  }
}

function ItemBox({ item, selected }) {
  const base = {
    ...styles.itemBox,
    ...(selected ? styles.itemBoxSelected : {}),
    opacity: item.opacity ?? 1,
    cursor: item.locked ? 'not-allowed' : 'move',
  };

  if (item.type === 'image') {
    return (
      <div style={base}>
        <div style={imageFrameStyle(item)}>
          <img
            src={item.src}
            alt="photo"
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: item.fit || 'contain',
              display: 'block',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={base}>
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: 10,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent:
            (item.align || 'left') === 'left'
              ? 'flex-start'
              : (item.align === 'right' ? 'flex-end' : 'center'),
        }}
      >
        <div
          style={{
            width: '100%',
            color: item.color || '#fff',
            fontFamily: item.fontFamily,
            fontSize: item.size || 36,
            fontWeight: item.bold ? 900 : 600,
            fontStyle: item.italic ? 'italic' : 'normal',
            textAlign: item.align || 'left',
            textShadow: '0 2px 8px rgba(0,0,0,0.55)',
            userSelect: 'none',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {item.text}
        </div>
      </div>
    </div>
  );
}

function imageFrameStyle(item) {
  const shape = item.shape || 'rounded';
  const radius = item.radius ?? 18;

  const common = {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: shape === 'rounded' ? radius : (shape === 'circle' ? 9999 : 0),
  };

  if (shape === 'triangle') return { ...common, borderRadius: 0, clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' };
  if (shape === 'diamond') return { ...common, borderRadius: 0, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' };
  if (shape === 'rect') return { ...common, borderRadius: 0 };
  return common;
}

function toggleBtn(active) {
  return {
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid ' + (active ? '#111' : '#ddd'),
    background: active ? '#111' : '#fff',
    color: active ? '#fff' : '#111',
    cursor: 'pointer',
    fontWeight: 800,
  };
}

function maxZ(items) {
  let m = 0;
  for (const it of items) m = Math.max(m, it.z || 0);
  return m;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const styles = {
  toolbar: {
    position: 'absolute',
    left: 16,
    top: 64,
    zIndex: 9998,
    pointerEvents: 'auto',
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    alignItems: 'center',
    background: 'rgba(0,0,0,0.55)',
    color: '#fff',
    padding: '10px 12px',
    borderRadius: 14,
    backdropFilter: 'blur(6px)',
  },
  toolBtn: {
    padding: '10px 12px',
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 900,
  },
  toolBtnSm: {
    padding: '8px 10px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 900,
  },
  chk: { display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12, fontWeight: 800 },
  gridNum: { width: 70, padding: '8px 8px', borderRadius: 10, border: 'none', fontWeight: 900 },
  presetSelect: { padding: '8px 10px', borderRadius: 10, border: 'none', fontWeight: 900 },
  sep: { width: 1, height: 20, background: 'rgba(255,255,255,0.25)', margin: '0 4px' },

  saveBar: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    zIndex: 9999,
    pointerEvents: 'auto',
    display: 'flex',
    gap: 10,
  },
  saveBtn: {
    padding: '12px 16px',
    borderRadius: 12,
    border: 'none',
    fontWeight: 900,
    background: '#111',
    color: '#fff',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid #ddd',
    fontWeight: 900,
    background: 'rgba(255,255,255,0.95)',
    cursor: 'pointer',
  },

  layer: {
    position: 'absolute',
    inset: 0,
    zIndex: 40,
  },

  itemBox: {
    width: '100%',
    height: '100%',
    outline: 'none',
    borderRadius: 12,
    border: '2px solid rgba(255,255,255,0.22)',
    background: 'rgba(0,0,0,0.08)',
    boxShadow: '0 10px 22px rgba(0,0,0,0.20)',
  },
  itemBoxSelected: {
    border: '2px solid rgba(255,255,255,0.85)',
    boxShadow: '0 12px 26px rgba(0,0,0,0.35)',
  },

  inspector: {
    position: 'absolute',
    top: 64,
    right: 16,
    zIndex: 9998,
    pointerEvents: 'auto',
    width: 320,
    maxHeight: 'calc(100vh - 90px)',
    overflow: 'auto',
    background: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 12,
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
  },
  inspectorTitle: {
    fontWeight: 900,
    fontSize: 16,
    marginBottom: 10,
  },

  multiBox: {
    background: '#fff',
    border: '1px solid #eee',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },
  multiGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 8,
    marginBottom: 8,
  },

  row: {
    display: 'grid',
    gridTemplateColumns: '90px 1fr',
    gap: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  rowCol: {
    display: 'grid',
    gap: 6,
    marginBottom: 10,
  },
  label: { fontSize: 12, fontWeight: 900, opacity: 0.75 },
  value: { fontSize: 13, fontWeight: 800 },

  input: {
    width: '100%',
    padding: '10px 10px',
    borderRadius: 12,
    border: '1px solid #ddd',
    fontWeight: 700,
  },
  select: {
    width: '100%',
    padding: '10px 10px',
    borderRadius: 12,
    border: '1px solid #ddd',
    fontWeight: 800,
    background: '#fff',
  },
  num: {
    width: '100%',
    padding: '10px 10px',
    borderRadius: 12,
    border: '1px solid #ddd',
    fontWeight: 800,
  },
  color: { width: '100%', height: 38, border: '1px solid #ddd', borderRadius: 12 },

  actions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    padding: '10px 10px',
    borderRadius: 12,
    border: '1px solid #ddd',
    cursor: 'pointer',
    fontWeight: 900,
    background: '#fff',
  },
};