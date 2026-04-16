'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, startTransition } from 'react';
import { SessionItem, SheetVersion } from '@/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PDFViewer } from '@/components/PDFViewer';
import { DrawingCanvas, DrawPath } from '@/components/DrawingCanvas';
import { useSessionPlayerStore } from '@/stores/sessionPlayerStore';
import { useAuthStore } from '@/stores/authStore';
import { getSignedUrl } from '@/lib/signedUrlCache';
import { SongFormBar } from './SongFormBar';
import { ReadOnlyCanvas } from './ReadOnlyCanvas';
import { LayerDrawer } from './LayerDrawer';
import { NavOverlay, NavProps } from './SessionPlayerMain';
import { SongFormInput, SongFormInputValue } from '@/components/SongFormInput';

const PEN_COLORS = ['#000000', '#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7'];

interface SheetRendererProps {
  currentIndex: number;
  item: SessionItem;
  navProps?: NavProps;
}

type DrawTarget = 'base' | 'mine' | null;

export function SheetRenderer({ currentIndex, item, navProps }: SheetRendererProps) {
  const { layers, visibleLayers, sessionId, session, userRole, updateBaseLayer, upsertMyLayer, updateSongFormData, createSongFormForItem } = useSessionPlayerStore();
  const { currentUser } = useAuthStore();
  const isCreator = userRole === 'creator';
  const isGuest = userRole === 'guest';

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showBase, setShowBase] = useState(true);

  // Image contain-fit sizing
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const [imgDisplaySize, setImgDisplaySize] = useState<{ w: number; h: number } | null>(null);
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = imgContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) setContainerSize({ w: rect.width, h: rect.height });
    return () => ro.disconnect();
  }, [signedUrl]);

  useEffect(() => {
    if (!imgNatural || !containerSize) return;
    const PADDING = 16;
    const availW = containerSize.w - PADDING * 2;
    const availH = containerSize.h - PADDING * 2;
    const scale = Math.min(availW / imgNatural.w, availH / imgNatural.h);
    setImgDisplaySize({ w: Math.round(imgNatural.w * scale), h: Math.round(imgNatural.h * scale) });
  }, [imgNatural, containerSize]);

  const onImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  // ── Song form editor ─────────────────────────────────────────────────────────
  const [formEditorOpen, setFormEditorOpen] = useState(false);
  const [formEditorValue, setFormEditorValue] = useState<SongFormInputValue | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formSaveError, setFormSaveError] = useState<string | null>(null);

  const defaultFormName = session?.name ?? '미정';

  const openFormEditor = useCallback(() => {
    const f = item.song_form;
    setFormEditorValue({
      name: f?.name ?? defaultFormName,
      key: f?.key ?? '',
      tempo: (f?.tempo as number | undefined) ?? '',
      sections: (f?.sections as any) ?? [],
      flow: (f?.flow as any) ?? [],
      memo: (f?.memo as string | undefined) ?? '',
    });
    setFormSaveError(null);
    setFormEditorOpen(true);
  }, [item.song_form, defaultFormName]);

  const saveFormEditor = async () => {
    if (!formEditorValue) return;
    setFormSaving(true);
    setFormSaveError(null);
    try {
      const data = {
        name: formEditorValue.name || defaultFormName,
        key: formEditorValue.key,
        tempo: formEditorValue.tempo === '' ? null : Number(formEditorValue.tempo),
        sections: formEditorValue.sections,
        flow: formEditorValue.flow,
        memo: formEditorValue.memo,
      };
      if (item.song_form_id) {
        await updateSongFormData(item.song_form_id, data);
      } else {
        await createSongFormForItem(item.id, data);
      }
      setFormEditorOpen(false);
    } catch (e) {
      setFormSaveError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setFormSaving(false);
    }
  };

  // ── Drawing mode ─────────────────────────────────────────────────────────────
  const [drawTarget, setDrawTarget] = useState<DrawTarget>(null);
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser'>('pen');
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [saving, setSaving] = useState(false);
  const [clearPending, setClearPending] = useState(false);

  // Per-target paths (local editing state)
  const editPathsRef = useRef<DrawPath[]>([]);
  const [editPaths, setEditPaths] = useState<DrawPath[]>([]);
  const undoStackRef = useRef<DrawPath[][]>([]);
  const redoStackRef = useRef<DrawPath[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const snapshotRef = useRef<DrawPath[]>([]);
  // Tracks the song_form_id to use in handleSave (may be auto-created during enterDraw)
  const activeSongFormIdRef = useRef<string | null>(null);

  const syncUndoRedo = useCallback(() => {
    startTransition(() => {
      setCanUndo(undoStackRef.current.length > 0);
      setCanRedo(redoStackRef.current.length > 0);
    });
  }, []);

  // Enter drawing mode (async — may auto-create song_form if none exists)
  const enterDraw = useCallback(async (target: DrawTarget) => {
    if (!target) return;

    let songFormId = item.song_form_id ?? null;

    // No song form → auto-create with session name
    if (!songFormId) {
      try {
        const newForm = await createSongFormForItem(item.id, { name: defaultFormName });
        songFormId = newForm.id;
      } catch (e) {
        console.error('[enterDraw] auto-create song_form failed:', e);
        return;
      }
    }

    activeSongFormIdRef.current = songFormId;

    let initial: DrawPath[] = [];
    if (target === 'base') {
      initial = (item.song_form?.drawing_data as DrawPath[] | undefined) ?? [];
    } else {
      const mine = layers.find(
        (l) => l.song_form_id === songFormId && l.created_by === currentUser?.id
      );
      initial = (mine?.drawing_data as DrawPath[] | undefined) ?? [];
    }
    snapshotRef.current = initial;
    editPathsRef.current = initial;
    undoStackRef.current = [];
    redoStackRef.current = [];
    setEditPaths(initial);
    setCanUndo(false);
    setCanRedo(false);
    setDrawTarget(target);
    setDrawerOpen(false);
  }, [item, layers, currentUser, defaultFormName, createSongFormForItem]);

  const handlePathsChange = useCallback((paths: DrawPath[]) => {
    undoStackRef.current.push(editPathsRef.current);
    redoStackRef.current = [];
    editPathsRef.current = paths;
    syncUndoRedo();
  }, [syncUndoRedo]);

  const handleUndo = () => {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current.pop()!;
    redoStackRef.current.push(editPathsRef.current);
    editPathsRef.current = prev;
    syncUndoRedo();
    startTransition(() => setEditPaths([...prev]));
  };

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(editPathsRef.current);
    editPathsRef.current = next;
    syncUndoRedo();
    startTransition(() => setEditPaths([...next]));
  };

  const handleClear = () => {
    undoStackRef.current.push(editPathsRef.current);
    redoStackRef.current = [];
    editPathsRef.current = [];
    syncUndoRedo();
    startTransition(() => setEditPaths([]));
    setClearPending(false);
  };

  const handleSave = async () => {
    if (!drawTarget) return;
    setSaving(true);
    const sfId = activeSongFormIdRef.current ?? item.song_form_id ?? null;
    try {
      const paths = editPathsRef.current;
      if (drawTarget === 'base' && sfId) {
        await updateBaseLayer(sfId, paths);
      } else if (drawTarget === 'mine' && sessionId && sfId) {
        await upsertMyLayer(sessionId, sfId, paths, isGuest);
      }
    } finally {
      setSaving(false);
    }
    setDrawTarget(null);
  };

  const handleCancelDraw = () => {
    setDrawTarget(null);
  };

  // ── Layer data ────────────────────────────────────────────────────────────────
  const songFormLayers = useMemo(
    () => layers.filter((l) => l.song_form_id === item.song_form_id),
    [layers, item.song_form_id]
  );

  const basePaths = useMemo<DrawPath[]>(
    () => (item.song_form?.drawing_data as DrawPath[] | undefined) ?? [],
    [item.song_form]
  );

  const mergedPaths = useMemo<DrawPath[]>(() => {
    if (drawTarget) return []; // hide static overlay while drawing
    const sessionPaths = songFormLayers
      .filter((l) => {
        if (visibleLayers[l.id] === false) return false;
        // Guest layers are only visible to their creator
        if (l.is_guest && l.created_by !== currentUser?.id) return false;
        return true;
      })
      .flatMap((l) => (l.drawing_data as DrawPath[]) ?? []);
    return [...(showBase ? basePaths : []), ...sessionPaths];
  }, [basePaths, showBase, songFormLayers, visibleLayers, drawTarget, currentUser?.id]);

  // ── File loading ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadSignedUrl = async () => {
      setIsLoading(true);
      setError(null);
      setSignedUrl(null);
      setImgNatural(null);
      setImgDisplaySize(null);

      try {
        const sheet = item.sheet;
        if (!sheet) { setError(`[1] sheet null — sheet_id: ${item.sheet_id ?? 'none'}`); return; }

        const versions = (sheet.sheet_versions ?? [])
          .slice()
          .sort((a, b) => b.version_number - a.version_number);
        const activeVersion: SheetVersion | undefined = versions[0];

        if (!activeVersion) { setError(`[2] sheet_versions 없음 — sheet.id: ${sheet.id}`); return; }

        const url = await getSignedUrl(activeVersion.file_path);
        setSignedUrl(url);
        setFileType(activeVersion.file_type);
      } catch (err) {
        setError(err instanceof Error ? err.message : '악보를 불러올 수 없습니다');
      } finally {
        setIsLoading(false);
      }
    };

    loadSignedUrl();
  }, [item.id, item.sheet]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
        <LoadingSpinner text="악보를 불러오는 중..." />
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-neutral-600 dark:text-neutral-400 font-medium mb-2">
            {error || '악보를 로드할 수 없습니다'}
          </p>
          <p className="text-xs text-neutral-500">파일이 삭제되었거나 접근 권한이 없을 수 있습니다</p>
        </div>
      </div>
    );
  }

  const inDrawMode = drawTarget !== null;

  // Canvas overlay: drawing mode → DrawingCanvas, else → ReadOnlyCanvas (if paths)
  const canvasOverlay = inDrawMode ? (
    <DrawingCanvas
      paths={editPaths}
      onPathsChange={handlePathsChange}
      activeTool={activeTool}
      color={penColor}
      strokeWidth={strokeWidth}
      onPencilDoubleTap={() => setActiveTool((t) => t === 'eraser' ? 'pen' : 'eraser')}
    />
  ) : mergedPaths.length > 0 ? (
    <ReadOnlyCanvas paths={mergedPaths} />
  ) : null;

  return (
    <div className="w-full h-full flex flex-col bg-neutral-100 dark:bg-neutral-800 overflow-hidden">

      {/* ── 드로잉 모드 툴바 (SongFormBar 대체) ── */}
      {inDrawMode ? (
        <div className="flex-shrink-0 bg-neutral-900 border-b border-neutral-700 flex items-center gap-2 px-3 py-2">
          {/* Colors */}
          <div className="flex items-center gap-1.5">
            {PEN_COLORS.map((c) => {
              const isActive = penColor === c && activeTool === 'pen';
              return (
                <button
                  key={c}
                  onClick={() => { setActiveTool('pen'); setPenColor(c); }}
                  className="w-5 h-5 rounded-full flex-shrink-0 border border-neutral-700"
                  style={{
                    backgroundColor: c,
                    boxShadow: isActive ? `0 0 0 2px #262626, 0 0 0 3.5px ${c}` : 'none',
                  }}
                />
              );
            })}
            {/* Eraser */}
            <button
              onClick={() => setActiveTool('eraser')}
              className={`p-1 rounded-lg transition-colors ${activeTool === 'eraser' ? 'bg-white text-neutral-900' : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'}`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 20H7L3 16l10-10 7 7-3.5 3.5" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.5 17.5l4-4" />
              </svg>
            </button>
          </div>

          <div className="w-px h-4 bg-neutral-700" />

          {/* Stroke width */}
          <div className="flex items-center gap-1.5">
            <div className="rounded-full bg-white flex-shrink-0" style={{ width: Math.max(2, strokeWidth * 0.6), height: Math.max(2, strokeWidth * 0.6) }} />
            <input
              type="range" min={1} max={20} step={1}
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-16 accent-white"
            />
          </div>

          <div className="w-px h-4 bg-neutral-700" />

          {/* Undo / Redo / Clear */}
          <button onClick={handleUndo} disabled={!canUndo} className="p-1.5 rounded-lg bg-neutral-700 text-neutral-400 hover:bg-neutral-600 disabled:opacity-30 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button onClick={handleRedo} disabled={!canRedo} className="p-1.5 rounded-lg bg-neutral-700 text-neutral-400 hover:bg-neutral-600 disabled:opacity-30 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
          <button onClick={() => setClearPending(true)} disabled={editPaths.length === 0} className="p-1.5 rounded-lg bg-neutral-700 text-neutral-400 hover:bg-neutral-600 disabled:opacity-30 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>

          <div className="flex-1" />

          {/* Save / Cancel */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-2.5 py-1 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium disabled:opacity-60 transition-colors"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
          <button
            onClick={handleCancelDraw}
            className="px-2.5 py-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-300 text-xs font-medium transition-colors"
          >
            취소
          </button>
        </div>
      ) : (
        /* ── 송폼 바 (일반 모드) ── */
        <SongFormBar
          form={item.song_form ?? null}
          sheetTempo={(item.sheet as any)?.tempo}
          sessionSongId={item.id}
          sessionTempo={item.tempo_override}
          isCreator={isCreator}
          layerCount={songFormLayers.length}
          onLayerOpen={() => setDrawerOpen(true)}
          onEditForm={isCreator ? openFormEditor : undefined}
        />
      )}

      {/* ── 악보 영역 ── */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {fileType === 'pdf' ? (
          <PDFViewer fileUrl={signedUrl} canvasOverlay={canvasOverlay} />
        ) : (
          <div
            ref={imgContainerRef}
            className="w-full h-full flex items-center justify-center overflow-hidden"
          >
            <div
              className="relative shadow-lg flex-shrink-0"
              style={imgDisplaySize
                ? { width: imgDisplaySize.w, height: imgDisplaySize.h }
                : { maxWidth: 'calc(100% - 32px)', maxHeight: 'calc(100% - 32px)' }
              }
            >
              <img
                key={currentIndex}
                src={signedUrl}
                alt="악보"
                onLoad={onImgLoad}
                style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
              />
              {canvasOverlay && (
                <div className="absolute inset-0 pointer-events-none">
                  {canvasOverlay}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Layer drawer (일반 모드만) */}
        {!inDrawMode && (
          <LayerDrawer
            songFormId={item.song_form_id ?? null}
            basePaths={basePaths}
            showBase={showBase}
            onToggleBase={() => setShowBase((v) => !v)}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            isCreator={isCreator}
            isGuest={isGuest}
            onEditBase={() => enterDraw('base')}
            onEditMine={() => enterDraw('mine')}
          />
        )}

        {/* Nav arrows (일반 모드만) */}
        {!inDrawMode && navProps && <NavOverlay {...navProps} />}

        {/* Song form editor modal */}
        {formEditorOpen && formEditorValue && (
          <div className="absolute inset-0 z-50 flex flex-col bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-white">
              <button
                onClick={() => setFormEditorOpen(false)}
                className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <span className="text-sm font-semibold text-neutral-800">송폼 편집</span>
              <button
                onClick={saveFormEditor}
                disabled={formSaving}
                className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium disabled:opacity-60 transition-colors"
              >
                {formSaving ? '저장 중…' : '저장'}
              </button>
            </div>
            {formSaveError && (
              <div className="px-4 py-2 bg-red-50 text-red-600 text-xs border-b border-red-200">
                {formSaveError}
              </div>
            )}
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4">
              <SongFormInput
                value={formEditorValue}
                onChange={setFormEditorValue}
                showTempo
                showMemo
              />
            </div>
          </div>
        )}

        {/* Clear confirm dialog */}
        {clearPending && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-neutral-800 rounded-2xl px-5 py-4 mx-4 max-w-xs w-full space-y-3">
              <p className="text-sm font-semibold text-white">레이어를 전부 지울까요?</p>
              <div className="flex gap-2">
                <button onClick={handleClear} className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-medium hover:bg-red-500 transition-colors">지우기</button>
                <button onClick={() => setClearPending(false)} className="flex-1 py-2 rounded-xl bg-neutral-700 text-neutral-300 text-xs font-medium hover:bg-neutral-600 transition-colors">취소</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
