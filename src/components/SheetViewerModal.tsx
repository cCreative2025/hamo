'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Sheet, SongForm, SongSection } from '@/types';
import { supabase } from '@/lib/supabase';
import { PDFViewer } from './PDFViewer';
import { LoadingSpinner } from './LoadingSpinner';
import { DrawingCanvas, DrawPath } from './DrawingCanvas';
import { getSectionLabel } from './SongFormBuilder';
import { useSheetStore } from '@/stores/sheetStore';

// ─── 색상 ────────────────────────────────────────────────────────────────────
const SECTION_COLORS: Record<string, string> = {
  I: 'bg-neutral-100 text-neutral-600', V: 'bg-primary-100 text-primary-700',
  PC: 'bg-warning-100 text-warning-700', C: 'bg-secondary-100 text-secondary-700',
  B: 'bg-success-100 text-success-700', O: 'bg-neutral-100 text-neutral-500',
};
function getSectionColor(type: string) { return SECTION_COLORS[type] ?? 'bg-violet-100 text-violet-700'; }

const PEN_COLORS = ['#1e1e1e', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7'];
const STROKE_WIDTHS = [{ label: '얇게', value: 2 }, { label: '보통', value: 5 }, { label: '굵게', value: 10 }];

// ─── 송폼 흐름 바 ─────────────────────────────────────────────────────────────
const SongFormBar: React.FC<{ form: SongForm }> = ({ form }) => {
  const sections = (form.sections ?? []) as SongSection[];
  const flowIds = form.flow?.length ? form.flow : sections.map(s => s.id);
  const displayFlow = flowIds.map(id => sections.find(s => s.id === id)).filter(Boolean) as SongSection[];
  const uniqueWithChords = sections.filter(s => s.chords.length > 0);

  return (
    <div className="px-5 py-3 bg-neutral-900 text-white space-y-2 flex-shrink-0">
      {displayFlow.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-neutral-400 mr-1 font-medium">
            {form.name}{form.key && ` · ${form.key}`}
          </span>
          {displayFlow.map((s, i) => (
            <React.Fragment key={`${s.id}-${i}`}>
              {i > 0 && <span className="text-neutral-600 text-sm select-none">—</span>}
              <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${getSectionColor(s.type)}`}>
                {getSectionLabel(sections, s.id)}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}
      {uniqueWithChords.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {uniqueWithChords.map(s => (
            <div key={s.id} className="flex items-center gap-1.5">
              <span className={`px-1.5 py-0.5 rounded-md text-xs font-semibold flex-shrink-0 ${getSectionColor(s.type)}`}>
                {getSectionLabel(sections, s.id)}
              </span>
              <span className="text-xs text-neutral-300">{s.chords.join(' · ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── 모달 ─────────────────────────────────────────────────────────────────────
interface SheetViewerModalProps {
  sheet: Sheet;
  onClose: () => void;
}

export const SheetViewerModal: React.FC<SheetViewerModalProps> = ({ sheet, onClose }) => {
  const { updateSongForm } = useSheetStore();

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

  // Drawing state
  const [drawingMode, setDrawingMode] = useState(false);
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser'>('pen');
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const copyMenuRef = useRef<HTMLDivElement>(null);

  // Per-form drawing paths (local state, synced to DB)
  const [drawingsByForm, setDrawingsByForm] = useState<Record<string, DrawPath[]>>(() => {
    const init: Record<string, DrawPath[]> = {};
    for (const f of sheet.song_forms ?? []) {
      init[f.id] = (f.drawing_data as DrawPath[] | undefined) ?? [];
    }
    return init;
  });

  const currentPaths = selectedFormId ? (drawingsByForm[selectedFormId] ?? []) : [];

  // Debounced save
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlePathsChange = useCallback((paths: DrawPath[]) => {
    if (!selectedFormId) return;
    setDrawingsByForm(prev => ({ ...prev, [selectedFormId]: paths }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateSongForm(selectedFormId, { drawing_data: paths } as never);
    }, 1000);
  }, [selectedFormId, updateSongForm]);

  const handleUndo = () => {
    if (!selectedFormId || currentPaths.length === 0) return;
    handlePathsChange(currentPaths.slice(0, -1));
  };

  const handleClear = () => {
    if (!selectedFormId) return;
    handlePathsChange([]);
  };

  const handleCopyTo = (targetFormId: string) => {
    setDrawingsByForm(prev => ({ ...prev, [targetFormId]: [...currentPaths] }));
    updateSongForm(targetFormId, { drawing_data: currentPaths } as never);
    setShowCopyMenu(false);
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

  const otherForms = sheet.song_forms?.filter(f => f.id !== selectedFormId) ?? [];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm ${drawingMode ? 'bg-black p-0' : 'bg-black/60 p-4'}`}
      onClick={(e) => { if (!drawingMode && e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-white flex flex-col overflow-hidden ${drawingMode ? 'w-full h-full rounded-none' : 'rounded-2xl shadow-soft-lg w-full max-w-4xl max-h-[90vh]'}`}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">{sheet.title}</h2>
            {sheet.artist && <p className="text-xs text-neutral-500">{sheet.artist}</p>}
          </div>

          {/* Drawing toolbar */}
          <div className="flex items-center gap-1.5">
            {drawingMode && (
              <>
                {/* 색상 */}
                <div className="flex items-center gap-1 mr-1">
                  {PEN_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => { setActiveTool('pen'); setPenColor(c); }}
                      className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${penColor === c && activeTool === 'pen' ? 'border-neutral-900 scale-125' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                {/* 굵기 */}
                <div className="flex items-center gap-0.5 mr-1">
                  {STROKE_WIDTHS.map(sw => (
                    <button
                      key={sw.value}
                      onClick={() => setStrokeWidth(sw.value)}
                      className={`px-2 py-1 rounded-lg text-xs transition-colors ${strokeWidth === sw.value ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
                    >
                      {sw.label}
                    </button>
                  ))}
                </div>

                {/* 지우개 */}
                <button
                  onClick={() => setActiveTool('eraser')}
                  className={`px-2 py-1 rounded-lg text-xs transition-colors ${activeTool === 'eraser' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
                  title="지우개"
                >⊘</button>

                {/* 되돌리기 */}
                <button
                  onClick={handleUndo}
                  disabled={currentPaths.length === 0}
                  className="px-2 py-1 rounded-lg text-xs bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-30 transition-colors"
                  title="되돌리기"
                >↩</button>

                {/* 초기화 */}
                <button
                  onClick={handleClear}
                  disabled={currentPaths.length === 0}
                  className="px-2 py-1 rounded-lg text-xs bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-30 transition-colors"
                  title="전체 지우기"
                >✕</button>

                {/* 복사 */}
                {otherForms.length > 0 && (
                  <div className="relative" ref={copyMenuRef}>
                    <button
                      onClick={() => setShowCopyMenu(v => !v)}
                      className="px-2 py-1 rounded-lg text-xs bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                      title="다른 송폼에 복사"
                    >복사</button>
                    {showCopyMenu && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-soft-md py-1 z-10 min-w-32">
                        <p className="px-3 py-1 text-xs text-neutral-400">복사할 송폼 선택</p>
                        {otherForms.map(f => (
                          <button
                            key={f.id}
                            onClick={() => handleCopyTo(f.id)}
                            className="w-full text-left px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors"
                          >
                            {f.name}{f.key && ` · ${f.key}`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* 그리기 아이콘 버튼 (송폼 선택시만) */}
            {selectedFormId && !drawingMode && (
              <button
                onClick={() => setDrawingMode(true)}
                title="그리기 모드"
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                {/* 연필 아이콘 */}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
            {selectedFormId && drawingMode && (
              <button
                onClick={() => setDrawingMode(false)}
                title="그리기 종료"
                className="p-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-700 transition-colors"
              >
                {/* 접기(축소) 아이콘 */}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L3 3m0 0h6m-6 0v6M15 9l6-6m0 0h-6m6 0v6M9 15l-6 6m0 0h6m-6 0v-6M15 15l6 6m0 0h-6m6 0v-6" />
                </svg>
              </button>
            )}

            {/* 닫기 */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── 송폼 흐름 바 ── */}
        {selectedForm && <SongFormBar form={selectedForm} />}

        {/* ── Sheet viewer + canvas overlay ── */}
        <div className={`flex-1 relative ${drawingMode ? 'overflow-hidden' : 'overflow-hidden'}`}
          onTouchStart={drawingMode ? (e) => e.stopPropagation() : undefined}
        >
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner text="파일 불러오는 중..." />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-error-500 text-sm">{error}</div>
          ) : fileType === 'pdf' && fileUrl ? (
            <PDFViewer fileUrl={fileUrl} />
          ) : fileUrl ? (
            <div className="flex items-center justify-center h-full p-4 overflow-auto bg-neutral-50">
              <img src={fileUrl} alt={sheet.title} className="max-w-full max-h-full object-contain rounded-xl shadow-soft" />
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
            />
          )}
        </div>

        {/* ── 송폼 선택 탭 ── */}
        {sheet.song_forms && sheet.song_forms.length > 0 && (
          <div className="border-t border-neutral-200 px-5 py-3 bg-neutral-50 flex-shrink-0">
            <p className="text-xs font-medium text-neutral-400 mb-2">송폼</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
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
                    {form.name}{form.key && <span className="opacity-60 font-normal ml-1">· {form.key}</span>}
                    {hasDrawing && <span className="ml-1.5 opacity-60">✏️</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
