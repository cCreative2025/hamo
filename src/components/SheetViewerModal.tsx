'use client';

import React, { useEffect, useState } from 'react';
import { Sheet, SongForm, SongSection } from '@/types';
import { supabase } from '@/lib/supabase';
import { PDFViewer } from './PDFViewer';
import { LoadingSpinner } from './LoadingSpinner';
import { getSectionLabel } from './SongFormBuilder';

// ─── 색상 ────────────────────────────────────────────────────────────────────
const SECTION_COLORS: Record<string, string> = {
  I:  'bg-neutral-100 text-neutral-600',
  V:  'bg-primary-100 text-primary-700',
  PC: 'bg-warning-100 text-warning-700',
  C:  'bg-secondary-100 text-secondary-700',
  B:  'bg-success-100 text-success-700',
  O:  'bg-neutral-100 text-neutral-500',
};
function getSectionColor(type: string) {
  return SECTION_COLORS[type] ?? 'bg-violet-100 text-violet-700';
}

// ─── 송폼 흐름 바 ─────────────────────────────────────────────────────────────
const SongFormBar: React.FC<{ form: SongForm }> = ({ form }) => {
  const sections = (form.sections ?? []) as SongSection[];
  const flowIds = form.flow?.length ? form.flow : sections.map(s => s.id);
  const displayFlow = flowIds.map(id => sections.find(s => s.id === id)).filter(Boolean) as SongSection[];

  const uniqueSectionsWithChords = sections.filter(s => s.chords.length > 0);

  return (
    <div className="px-5 py-3 bg-neutral-900 text-white space-y-2">
      {/* 흐름 칩 */}
      {displayFlow.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-neutral-400 mr-1 font-medium">{form.name}{form.key && ` · ${form.key}`}</span>
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

      {/* 섹션별 코드 */}
      {uniqueSectionsWithChords.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {uniqueSectionsWithChords.map(s => (
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
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(
    sheet.song_forms?.[0]?.id ?? null
  );

  const selectedForm = sheet.song_forms?.find(f => f.id === selectedFormId) ?? null;

  useEffect(() => {
    const version = sheet.sheet_versions?.[0];
    if (!version?.file_path) {
      setError('파일 정보가 없습니다.');
      setLoading(false);
      return;
    }

    supabase.storage
      .from('sheets')
      .createSignedUrl(version.file_path, 3600)
      .then(({ data, error }) => {
        if (error || !data?.signedUrl) {
          setError(`파일 URL 생성 실패: ${error?.message ?? '알 수 없는 오류'}`);
        } else {
          setFileUrl(data.signedUrl);
          setFileType(version.file_type === 'pdf' ? 'pdf' : 'image');
        }
        setLoading(false);
      });
  }, [sheet]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-soft-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">{sheet.title}</h2>
            {sheet.artist && <p className="text-sm text-neutral-500">{sheet.artist}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 선택된 송폼 진행 바 */}
        {selectedForm && <SongFormBar form={selectedForm} />}

        {/* Sheet viewer */}
        <div className="flex-1 overflow-hidden">
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
        </div>

        {/* 송폼 선택 탭 */}
        {sheet.song_forms && sheet.song_forms.length > 0 && (
          <div className="border-t border-neutral-200 px-5 py-3 bg-neutral-50">
            <p className="text-xs font-medium text-neutral-400 mb-2">송폼 선택</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sheet.song_forms.map((form) => {
                const isSelected = form.id === selectedFormId;
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
