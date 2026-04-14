'use client';

import React, { useEffect, useState } from 'react';
import { Sheet } from '@/types';
import { supabase } from '@/lib/supabase';
import { PDFViewer } from './PDFViewer';
import { LoadingSpinner } from './LoadingSpinner';

interface SheetViewerModalProps {
  sheet: Sheet;
  onClose: () => void;
}

export const SheetViewerModal: React.FC<SheetViewerModalProps> = ({ sheet, onClose }) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const version = sheet.sheet_versions?.[0];
    if (!version?.file_path) {
      setError('파일 정보가 없습니다. (sheet_versions 없음)');
      setLoading(false);
      return;
    }

    const load = async () => {
      const { data, error } = await supabase.storage
        .from('sheets')
        .createSignedUrl(version.file_path, 3600);

      if (error || !data?.signedUrl) {
        setError(`파일 URL 생성 실패: ${error?.message ?? '알 수 없는 오류'}`);
        setLoading(false);
        return;
      }

      setFileUrl(data.signedUrl);
      setFileType(version.file_type === 'pdf' ? 'pdf' : 'image');
      setLoading(false);
    };

    load();
  }, [sheet]);

  // ESC 닫기
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

        {/* Body */}
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
              <img
                src={fileUrl}
                alt={sheet.title}
                className="max-w-full max-h-full object-contain rounded-xl shadow-soft"
              />
            </div>
          ) : null}
        </div>

        {/* Song forms footer (있을 때만) */}
        {sheet.song_forms && sheet.song_forms.length > 0 && (
          <div className="border-t border-neutral-200 px-5 py-3 bg-neutral-50">
            <p className="text-xs font-medium text-neutral-500 mb-2">송폼</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sheet.song_forms.map((form) => (
                <div key={form.id} className="flex-shrink-0 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs">
                  <p className="font-medium text-neutral-700">{form.name}{form.key && ` · ${form.key}`}</p>
                  {form.chord_progression && (
                    <pre className="mt-1 text-neutral-500 whitespace-pre-wrap font-sans text-xs max-w-48 truncate">
                      {form.chord_progression}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
