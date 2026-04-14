'use client';

import React, { useEffect, useState, useCallback, useRef, startTransition } from 'react';
import { Sheet, SongForm, SongSection, normalizeFlow } from '@/types';
import { supabase } from '@/lib/supabase';
import { PDFViewer } from './PDFViewer';
import { LoadingSpinner } from './LoadingSpinner';
import { DrawingCanvas, DrawPath } from './DrawingCanvas';
import { getSectionLabel } from './SongFormBuilder';
import { useSheetStore } from '@/stores/sheetStore';
import { SongFormInput, SongFormInputValue } from './SongFormInput';

// ─── 색상 ────────────────────────────────────────────────────────────────────
const SECTION_COLORS: Record<string, string> = {
  I: 'bg-neutral-100 text-neutral-600', V: 'bg-primary-100 text-primary-700',
  PC: 'bg-warning-100 text-warning-700', C: 'bg-secondary-100 text-secondary-700',
  B: 'bg-success-100 text-success-700', O: 'bg-neutral-100 text-neutral-500',
};
const SECTION_BADGE_COLORS: Record<string, string> = {
  I: 'bg-neutral-500 text-white', V: 'bg-primary-600 text-white',
  PC: 'bg-warning-600 text-white', C: 'bg-secondary-600 text-white',
  B: 'bg-success-600 text-white', O: 'bg-neutral-400 text-white',
};
function getSectionColor(type: string) { return SECTION_COLORS[type] ?? 'bg-violet-100 text-violet-700'; }
function getSectionBadge(type: string) { return SECTION_BADGE_COLORS[type] ?? 'bg-violet-600 text-white'; }

const PEN_COLORS = ['#1e1e1e', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7'];

// ─── 송폼 흐름 바 ─────────────────────────────────────────────────────────────
const SongFormBar: React.FC<{ form: SongForm; onEnterDrawing?: () => void }> = ({ form, onEnterDrawing }) => {
  const sections = (form.sections ?? []) as SongSection[];
  const normFlow = normalizeFlow(form.flow?.length ? form.flow : sections.map(s => s.id));
  const displayFlow = normFlow.map(item => {
    const section = sections.find(s => s.id === item.id);
    return section ? { section, repeat: item.repeat ?? 1 } : null;
  }).filter(Boolean) as { section: SongSection; repeat: number }[];

  if (displayFlow.length === 0) return null;

  return (
    <div className="px-5 py-3 bg-neutral-900 text-white flex-shrink-0">
      <div className="flex items-center gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          <span className="text-xs text-neutral-500 font-medium">송폼</span>
          <span className="text-neutral-600 text-xs select-none">|</span>
          {displayFlow.map(({ section: s, repeat }, i) => (
            <React.Fragment key={`${s.id}-${i}`}>
              {i > 0 && <span className="text-neutral-600 text-sm select-none">—</span>}
              <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${getSectionColor(s.type)}`}>
                {s.sectionKey && (
                  <span className={`mr-0.5 px-1 py-0.5 rounded-full text-[10px] font-bold leading-none ${getSectionBadge(s.type)}`}>
                    {s.sectionKey}
                  </span>
                )}{getSectionLabel(sections, s.id)}{repeat > 1 ? ` ×${repeat}` : ''}
              </span>
            </React.Fragment>
          ))}
        </div>
        {onEnterDrawing && (
          <button
            onClick={onEnterDrawing}
            className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-neutral-700 text-neutral-300 text-xs font-medium hover:bg-neutral-600 hover:text-white transition-colors"
          >
            악보수정
          </button>
        )}
      </div>
    </div>
  );
};

// ─── 모달 ─────────────────────────────────────────────────────────────────────
interface SheetViewerModalProps {
  sheet: Sheet;
  onClose: () => void;
}

export const SheetViewerModal: React.FC<SheetViewerModalProps> = ({ sheet, onClose }) => {
  const { updateSongForm, addSongForm } = useSheetStore();

  // Sheet file
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Song form selection
  const [selectedFormId, setSelectedFormId] = useState<string | null>(
    sheet.song_forms?.[0]?.id ?? null
  );
  const selectedForm = sheet.song_forms?.find(f => f.id === selectedFormId) ?? null;

  // 송폼 전환 시 undo/redo 버튼 상태 동기화
  useEffect(() => {
    if (!selectedFormId) { setCanUndo(false); setCanRedo(false); return; }
    setCanUndo((undoStackByFormRef.current[selectedFormId]?.length ?? 0) > 0);
    setCanRedo((redoStackByFormRef.current[selectedFormId]?.length ?? 0) > 0);
  }, [selectedFormId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Title editing
  const [titleEditing, setTitleEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(sheet.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleTitleSave = async () => {
    const trimmed = editedTitle.trim();
    if (!trimmed || trimmed === sheet.title) { setTitleEditing(false); setEditedTitle(sheet.title); return; }
    await supabase.from('sheets').update({ title: trimmed }).eq('id', sheet.id);
    sheet.title = trimmed; // local ref update
    setTitleEditing(false);
  };

  useEffect(() => {
    if (titleEditing) titleInputRef.current?.focus();
  }, [titleEditing]);

  // Drawing state
  const [drawingMode, setDrawingMode] = useState(false);
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser'>('pen');
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [copyTargetForm, setCopyTargetForm] = useState<{ id: string; name: string; key?: string } | null>(null);
  const [cancelPending, setCancelPending] = useState(false);
  const [clearPending, setClearPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const snapshotRef = useRef<DrawPath[]>([]);
  const copyMenuRef = useRef<HTMLDivElement>(null);

  // ── 핀치줌 / 이동 (드로잉 모드 전용) ─────────────────────────────────────────
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 });
  const zoomStateRef = useRef({ scale: 1, x: 0, y: 0 });
  const pinchRef = useRef<{ dist: number; midX: number; midY: number } | null>(null);
  const contentWrapRef = useRef<HTMLDivElement>(null);

  const handlePinchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    const dx = e.touches[1].clientX - e.touches[0].clientX;
    const dy = e.touches[1].clientY - e.touches[0].clientY;
    pinchRef.current = {
      dist: Math.sqrt(dx * dx + dy * dy),
      midX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
      midY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
    };
  }, []);

  const handlePinchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !pinchRef.current || !contentWrapRef.current) return;
    const dx = e.touches[1].clientX - e.touches[0].clientX;
    const dy = e.touches[1].clientY - e.touches[0].clientY;
    const newDist = Math.sqrt(dx * dx + dy * dy);
    const newMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const newMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

    const { scale: oldScale, x: oldX, y: oldY } = zoomStateRef.current;
    const rawScale = oldScale * (newDist / pinchRef.current.dist);
    const newScale = Math.min(5, Math.max(1, rawScale));
    const actualDelta = newScale / oldScale;

    // 핀치 중심점 기준 줌: transform-origin(0,0) 기준 좌표 변환
    const rect = contentWrapRef.current.getBoundingClientRect();
    const pivotX = pinchRef.current.midX - rect.left;
    const pivotY = pinchRef.current.midY - rect.top;

    const panDX = newMidX - pinchRef.current.midX;
    const panDY = newMidY - pinchRef.current.midY;

    const newX = pivotX * (1 - actualDelta) + oldX * actualDelta + panDX;
    const newY = pivotY * (1 - actualDelta) + oldY * actualDelta + panDY;

    zoomStateRef.current = { scale: newScale, x: newX, y: newY };
    setZoomScale(newScale);
    setZoomOffset({ x: newX, y: newY });

    pinchRef.current = { dist: newDist, midX: newMidX, midY: newMidY };
  }, []);

  const handlePinchEnd = useCallback(() => {
    pinchRef.current = null;
    // scale이 1로 돌아오면 offset도 초기화
    if (zoomStateRef.current.scale <= 1) {
      zoomStateRef.current = { scale: 1, x: 0, y: 0 };
      setZoomScale(1);
      setZoomOffset({ x: 0, y: 0 });
    }
  }, []);

  const resetZoom = () => {
    zoomStateRef.current = { scale: 1, x: 0, y: 0 };
    setZoomScale(1);
    setZoomOffset({ x: 0, y: 0 });
    pinchRef.current = null;
  };

  // Per-form drawing paths (local state, synced to DB)
  const drawingsByFormRef = useRef<Record<string, DrawPath[]>>({});
  const [drawingsByForm, setDrawingsByForm] = useState<Record<string, DrawPath[]>>(() => {
    const init: Record<string, DrawPath[]> = {};
    for (const f of sheet.song_forms ?? []) {
      init[f.id] = (f.drawing_data as DrawPath[] | undefined) ?? [];
    }
    drawingsByFormRef.current = init;
    return init;
  });

  // Undo/redo stacks — ref로 관리해서 스트로크마다 리렌더 방지
  const undoStackByFormRef = useRef<Record<string, DrawPath[][]>>({});
  const redoStackByFormRef = useRef<Record<string, DrawPath[][]>>({});
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncUndoRedoButtons = useCallback((formId: string) => {
    startTransition(() => {
      setCanUndo((undoStackByFormRef.current[formId]?.length ?? 0) > 0);
      setCanRedo((redoStackByFormRef.current[formId]?.length ?? 0) > 0);
    });
  }, []);

  const currentPaths = selectedFormId ? (drawingsByForm[selectedFormId] ?? []) : [];

  // 스트로크 완료 — ref만 업데이트, setState 없음 (리렌더 없음)
  const handlePathsChange = useCallback((paths: DrawPath[]) => {
    if (!selectedFormId) return;
    const before = drawingsByFormRef.current[selectedFormId] ?? [];
    undoStackByFormRef.current[selectedFormId] = [...(undoStackByFormRef.current[selectedFormId] ?? []), before];
    redoStackByFormRef.current[selectedFormId] = [];
    drawingsByFormRef.current[selectedFormId] = paths;
    syncUndoRedoButtons(selectedFormId);
  }, [selectedFormId, syncUndoRedoButtons]);

  // undo/redo/clear — ref 업데이트 + 캔버스 전체 재렌더를 위해 setState 호출
  const handleUndo = () => {
    if (!selectedFormId) return;
    const stack = undoStackByFormRef.current[selectedFormId] ?? [];
    if (stack.length === 0) return;
    const before = stack[stack.length - 1];
    const current = drawingsByFormRef.current[selectedFormId] ?? [];
    undoStackByFormRef.current[selectedFormId] = stack.slice(0, -1);
    redoStackByFormRef.current[selectedFormId] = [...(redoStackByFormRef.current[selectedFormId] ?? []), current];
    drawingsByFormRef.current[selectedFormId] = before;
    syncUndoRedoButtons(selectedFormId);
    startTransition(() => setDrawingsByForm({ ...drawingsByFormRef.current }));
  };

  const handleRedo = () => {
    if (!selectedFormId) return;
    const stack = redoStackByFormRef.current[selectedFormId] ?? [];
    if (stack.length === 0) return;
    const next = stack[stack.length - 1];
    const current = drawingsByFormRef.current[selectedFormId] ?? [];
    redoStackByFormRef.current[selectedFormId] = stack.slice(0, -1);
    undoStackByFormRef.current[selectedFormId] = [...(undoStackByFormRef.current[selectedFormId] ?? []), current];
    drawingsByFormRef.current[selectedFormId] = next;
    syncUndoRedoButtons(selectedFormId);
    startTransition(() => setDrawingsByForm({ ...drawingsByFormRef.current }));
  };

  const handleClear = () => {
    if (!selectedFormId) return;
    const current = drawingsByFormRef.current[selectedFormId] ?? [];
    undoStackByFormRef.current[selectedFormId] = [...(undoStackByFormRef.current[selectedFormId] ?? []), current];
    redoStackByFormRef.current[selectedFormId] = [];
    drawingsByFormRef.current[selectedFormId] = [];
    syncUndoRedoButtons(selectedFormId);
    startTransition(() => setDrawingsByForm({ ...drawingsByFormRef.current }));
    setClearPending(false);
  };

  const handleCopyTo = (targetFormId: string) => {
    const src = drawingsByFormRef.current[selectedFormId ?? ''] ?? [];
    drawingsByFormRef.current[targetFormId] = [...src];
    setDrawingsByForm({ ...drawingsByFormRef.current });
    updateSongForm(targetFormId, { drawing_data: src } as never);
    setShowCopyMenu(false);
    setCopyTargetForm(null);
  };

  const enterDrawingMode = () => {
    snapshotRef.current = [...(drawingsByFormRef.current[selectedFormId ?? ''] ?? [])];
    setDrawingMode(true);
    setCancelPending(false);
  };

  const handleSaveAndExit = async () => {
    if (selectedFormId) {
      setSaving(true);
      const paths = drawingsByFormRef.current[selectedFormId] ?? [];
      await updateSongForm(selectedFormId, { drawing_data: paths } as never);
      setDrawingsByForm({ ...drawingsByFormRef.current }); // 탭 hasDrawing 반영
      setSaving(false);
    }
    setDrawingMode(false);
    setCancelPending(false);
    resetZoom();
  };

  const handleCancelDrawing = () => {
    if (selectedFormId) {
      const original = snapshotRef.current;
      drawingsByFormRef.current[selectedFormId] = original;
      setDrawingsByForm({ ...drawingsByFormRef.current });
      updateSongForm(selectedFormId, { drawing_data: original } as never);
    }
    setDrawingMode(false);
    setCancelPending(false);
    resetZoom();
  };

  // Close copy menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (copyMenuRef.current && !copyMenuRef.current.contains(e.target as Node)) {
        setShowCopyMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load file
  useEffect(() => {
    const version = sheet.sheet_versions?.[0];
    if (!version?.file_path) { setError('파일 정보가 없습니다.'); setLoading(false); return; }
    supabase.storage.from('sheets').createSignedUrl(version.file_path, 3600).then(({ data, error }) => {
      if (error || !data?.signedUrl) { setError(`파일 URL 생성 실패: ${error?.message}`); }
      else { setFileUrl(data.signedUrl); setFileType(version.file_type === 'pdf' ? 'pdf' : 'image'); }
      setLoading(false);
    });
  }, [sheet]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Song form add (inline panel)
  const [addingForm, setAddingForm] = useState(false);
  const [newForm, setNewForm] = useState<SongFormInputValue>({ name: '', key: '', sections: [], flow: [], memo: '' });
  const [addingSaving, setAddingSaving] = useState(false);

  const closeAddingForm = () => {
    setAddingForm(false);
    setNewForm({ name: '', key: '', sections: [], flow: [], memo: '' });
  };

  const handleAddFormSave = async () => {
    if (!newForm.name.trim()) return;
    setAddingSaving(true);
    await addSongForm(sheet.id, newForm);
    setNewForm({ name: '', key: '', sections: [], flow: [], memo: '' });
    setAddingForm(false);
    setAddingSaving(false);
  };

  const otherForms = sheet.song_forms?.filter(f => f.id !== selectedFormId) ?? [];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm ${drawingMode ? 'bg-black p-0' : 'bg-black/60 p-4'}`}
      style={drawingMode ? { userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties : undefined}
      onClick={(e) => { if (!drawingMode && e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-white flex flex-col overflow-hidden ${drawingMode ? 'w-full h-full rounded-none' : 'rounded-2xl shadow-soft-lg w-full max-w-4xl h-[90vh]'}`}>

        {/* ── 헤더: 제목 + 액션 버튼 ── */}
        <div className="border-b border-neutral-200 flex-shrink-0 flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2 min-w-0">
            {titleEditing ? (
              <input
                ref={titleInputRef}
                value={editedTitle}
                onChange={e => setEditedTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') { setTitleEditing(false); setEditedTitle(sheet.title); } }}
                onBlur={handleTitleSave}
                className="text-base font-semibold text-neutral-900 border-b border-primary-400 outline-none bg-transparent min-w-0 w-40"
              />
            ) : (
              <h2 className="text-base font-semibold text-neutral-900 truncate">{sheet.title}</h2>
            )}
            {drawingMode && selectedForm && (
              <>
                {selectedForm.key && (
                  <span className="flex-shrink-0 px-1.5 py-0.5 rounded-md text-xs font-semibold bg-primary-100 text-primary-700">
                    {selectedForm.key}
                  </span>
                )}
                <span className="flex-shrink-0 text-xs text-neutral-400 font-medium">{selectedForm.name}</span>
              </>
            )}
            {!drawingMode && !titleEditing && sheet.artist && (
              <p className="text-xs text-neutral-500 truncate">{sheet.artist}</p>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* 드로잉 모드 — 저장/취소/복사 */}
            {drawingMode && !cancelPending && (
              <>
                <button onClick={handleSaveAndExit} disabled={saving}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-700 disabled:opacity-60 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                  {saving ? '저장 중...' : '저장'}
                </button>
                <button onClick={() => setCancelPending(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-neutral-100 text-neutral-600 text-xs font-medium hover:bg-neutral-200 transition-colors"
                >취소</button>
                {otherForms.length > 0 && (
                  <div className="relative" ref={copyMenuRef}>
                    <button onClick={() => setShowCopyMenu(v => !v)}
                      className="px-2.5 py-1.5 rounded-xl bg-neutral-100 text-neutral-600 text-xs font-medium hover:bg-neutral-200 transition-colors"
                    >복사</button>
                    {showCopyMenu && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-soft-md py-1 z-10 min-w-32">
                        <p className="px-3 py-1 text-xs text-neutral-400">복사할 송폼 선택</p>
                        {otherForms.map(f => (
                          <button key={f.id} onClick={() => { setCopyTargetForm({ id: f.id, name: f.name, key: f.key }); setShowCopyMenu(false); }}
                            className="w-full text-left px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors"
                          >{f.name}{f.key && ` (${f.key})`}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* 취소 확인 */}
            {drawingMode && cancelPending && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-600">변경사항을 버릴까요?</span>
                <button onClick={handleCancelDrawing}
                  className="px-2.5 py-1.5 rounded-xl bg-error-500 text-white text-xs font-medium hover:bg-error-600 transition-colors"
                >버리기</button>
                <button onClick={() => setCancelPending(false)}
                  className="px-2.5 py-1.5 rounded-xl bg-neutral-100 text-neutral-600 text-xs font-medium hover:bg-neutral-200 transition-colors"
                >돌아가기</button>
              </div>
            )}

            {/* 일반 모드: 제목수정 + 닫기 */}
            {!drawingMode && (
              <>
                <button onClick={() => { setTitleEditing(true); setEditedTitle(sheet.title); }} title="제목 수정"
                  className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button onClick={onClose}
                  className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── 툴바: 드로잉 도구 (드로잉 모드 전용 별도 섹션) ── */}
        {drawingMode && !cancelPending && (
          <div className="border-b border-neutral-200 bg-neutral-50 flex-shrink-0 flex items-center gap-2 px-5 py-2.5">
            {/* 색상 + 지우개 */}
            <div className="flex items-center gap-2">
              {PEN_COLORS.map(c => {
                const isSelected = penColor === c && activeTool === 'pen';
                return (
                  <button
                    key={c}
                    onClick={() => { setActiveTool('pen'); setPenColor(c); }}
                    className="w-5 h-5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: c,
                      boxShadow: isSelected ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
                      transition: 'box-shadow 0.15s ease',
                    }}
                  />
                );
              })}
              {/* 지우개 */}
              <button onClick={() => setActiveTool('eraser')} title="지우개"
                className={`p-1 rounded-lg transition-colors ${activeTool === 'eraser' ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-500 hover:bg-neutral-300'}`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 20H7L3 16l10-10 7 7-3.5 3.5" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.5 17.5l4-4" />
                </svg>
              </button>
            </div>

            <div className="w-px h-4 bg-neutral-300" />

            {/* 굵기 슬라이더 */}
            <div className="flex items-center gap-2">
              <div
                className="rounded-full bg-neutral-800 flex-shrink-0"
                style={{ width: strokeWidth, height: strokeWidth, minWidth: 2, minHeight: 2 }}
              />
              <input
                type="range" min={1} max={20} step={1}
                value={strokeWidth}
                onChange={e => setStrokeWidth(Number(e.target.value))}
                className="w-20 accent-neutral-800"
              />
            </div>

            <div className="w-px h-4 bg-neutral-300" />

            {/* 되돌리기 */}
            <button onClick={handleUndo} disabled={!canUndo} title="되돌리기"
              className="p-1.5 rounded-lg bg-neutral-200 text-neutral-600 hover:bg-neutral-300 disabled:opacity-30 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>

            {/* 다시 복구 */}
            <button onClick={handleRedo} disabled={!canRedo} title="다시 복구"
              className="p-1.5 rounded-lg bg-neutral-200 text-neutral-600 hover:bg-neutral-300 disabled:opacity-30 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>

            {/* 초기화 */}
            <button onClick={() => setClearPending(true)} disabled={currentPaths.length === 0} title="전체 지우기"
              className="p-1.5 rounded-lg bg-neutral-200 text-neutral-600 hover:bg-neutral-300 disabled:opacity-30 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        )}

        {/* ── 송폼 흐름 바 ── */}
        {!drawingMode && (
          selectedForm
            ? <SongFormBar form={selectedForm} onEnterDrawing={enterDrawingMode} />
            : (
              <div className="px-5 py-3 bg-neutral-900 text-white flex-shrink-0 flex items-center gap-2">
                <span className="text-xs text-neutral-500">송폼이 없습니다.</span>
                <button
                  onClick={() => setAddingForm(true)}
                  className="px-2 py-0.5 rounded-md bg-neutral-700 text-neutral-300 text-xs font-medium hover:bg-neutral-600 hover:text-white transition-colors"
                >
                  추가
                </button>
              </div>
            )
        )}

        {/* ── Sheet viewer + canvas overlay ── */}
        <div
          ref={contentWrapRef}
          className="flex-1 min-h-0 relative overflow-hidden"
          style={{ userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
          onTouchStart={drawingMode ? handlePinchStart : undefined}
          onTouchMove={drawingMode ? handlePinchMove : undefined}
          onTouchEnd={drawingMode ? handlePinchEnd : undefined}
        >
          {/* 줌/이동 transform wrapper — absolute inset-0 으로 부모 완전히 채움 */}
          <div
            className="absolute inset-0"
            style={drawingMode && (zoomScale !== 1 || zoomOffset.x !== 0 || zoomOffset.y !== 0) ? {
              transform: `translate(${zoomOffset.x}px, ${zoomOffset.y}px) scale(${zoomScale})`,
              transformOrigin: '0 0',
            } : undefined}
          >
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <LoadingSpinner text="파일 불러오는 중..." />
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex items-center justify-center text-error-500 text-sm">{error}</div>
            ) : fileType === 'pdf' && fileUrl ? (
              <div className="absolute inset-0 flex flex-col" style={drawingMode ? { pointerEvents: 'none' } : undefined}>
                <PDFViewer fileUrl={fileUrl} />
              </div>
            ) : fileUrl ? (
              <div className="absolute inset-0 flex items-center justify-center p-4 overflow-auto bg-neutral-50"
                style={drawingMode ? { pointerEvents: 'none' } : undefined}
              >
                <img
                  src={fileUrl}
                  alt={sheet.title}
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-soft"
                  style={{ WebkitTouchCallout: 'none', userSelect: 'none', WebkitUserSelect: 'none', pointerEvents: 'none' } as React.CSSProperties}
                />
              </div>
            ) : null}

            {/* Drawing canvas overlay */}
            {selectedFormId && (
              <DrawingCanvas
                paths={currentPaths}
                onPathsChange={handlePathsChange}
                activeTool={drawingMode ? activeTool : null}
                color={penColor}
                strokeWidth={strokeWidth}
                onPencilDoubleTap={() => setActiveTool(t => t === 'eraser' ? 'pen' : 'eraser')}
              />
            )}
          </div>
        </div>

        {/* ── 송폼 추가 패널 (인라인 슬라이드업) ── */}
        {!drawingMode && addingForm && (
          <div className="border-t border-neutral-200 bg-white flex-shrink-0 flex flex-col max-h-[60vh]">
            <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
              <span className="text-sm font-semibold text-neutral-800">송폼 추가</span>
              <button onClick={closeAddingForm} className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto px-5 pb-2 flex-1">
              <SongFormInput value={newForm} onChange={setNewForm} showMemo autoFocus />
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-neutral-100 flex-shrink-0">
              <button onClick={closeAddingForm}
                className="px-3 py-1.5 rounded-xl bg-neutral-100 text-neutral-600 text-xs font-medium hover:bg-neutral-200 transition-colors"
              >취소</button>
              <button onClick={handleAddFormSave} disabled={!newForm.name.trim() || addingSaving}
                className="px-3 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-700 disabled:opacity-40 transition-colors"
              >{addingSaving ? '저장 중...' : '저장'}</button>
            </div>
          </div>
        )}

        {/* ── 송폼 선택 탭 ── */}
        {!drawingMode && !addingForm && sheet.song_forms && sheet.song_forms.length > 0 && (
          <div className="border-t border-neutral-200 px-5 py-3 bg-neutral-50 flex-shrink-0">
            <p className="text-xs font-medium text-neutral-400 mb-2">송폼</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => setAddingForm(true)}
                className="flex-shrink-0 px-3 py-2 rounded-xl border border-dashed border-neutral-300 text-xs font-medium text-neutral-400 hover:border-neutral-500 hover:text-neutral-600 transition-colors"
              >+ 추가</button>
              {sheet.song_forms.map((form) => {
                const isSelected = form.id === selectedFormId;
                const hasDrawing = (drawingsByForm[form.id]?.length ?? 0) > 0;
                return (
                  <button
                    key={form.id}
                    onClick={() => setSelectedFormId(isSelected ? null : form.id)}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    {form.key && (
                      <span className="mr-1.5 px-1.5 py-0.5 rounded-md text-xs font-semibold bg-primary-100 text-primary-700 inline-block"
                        style={isSelected ? { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' } : {}}
                      >{form.key}</span>
                    )}
                    {form.name}
                    {hasDrawing && <span className="ml-1.5 opacity-60">✏️</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 리셋 확인 다이얼로그 ── */}
      {clearPending && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-2xl">
          <div className="bg-white rounded-2xl shadow-soft-lg px-6 py-5 mx-4 max-w-xs w-full space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-neutral-900">악보 레이어를 리셋하시겠습니까?</p>
              <p className="text-xs text-neutral-500">그려진 내용이 모두 삭제됩니다.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleClear}
                className="flex-1 py-2 rounded-xl bg-error-500 text-white text-xs font-medium hover:bg-error-600 transition-colors"
              >리셋</button>
              <button
                onClick={() => setClearPending(false)}
                className="flex-1 py-2 rounded-xl bg-neutral-100 text-neutral-600 text-xs font-medium hover:bg-neutral-200 transition-colors"
              >취소</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 복사 확인 다이얼로그 ── */}
      {copyTargetForm && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-2xl">
          <div className="bg-white rounded-2xl shadow-soft-lg px-6 py-5 mx-4 max-w-sm w-full space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-neutral-900">
                <span className="text-primary-600">{copyTargetForm.name}{copyTargetForm.key && ` (${copyTargetForm.key})`}</span>에 덮어쓸게요
              </p>
              <p className="text-xs text-neutral-500 leading-relaxed">
                해당 송폼에 이미 그려진 내용이 있다면<br />
                새로운 레이어로 대체됩니다. ✦
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleCopyTo(copyTargetForm.id)}
                className="flex-1 py-2 rounded-xl bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-700 transition-colors"
              >
                그래도 복사하기
              </button>
              <button
                onClick={() => setCopyTargetForm(null)}
                className="flex-1 py-2 rounded-xl bg-neutral-100 text-neutral-600 text-xs font-medium hover:bg-neutral-200 transition-colors"
              >
                돌아가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
