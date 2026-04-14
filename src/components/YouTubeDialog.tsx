'use client';

import React, { useEffect, useState } from 'react';

export function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0];
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      const m = u.pathname.match(/\/embed\/([^/?]+)/);
      if (m) return m[1];
    }
  } catch {}
  return null;
}

// ─── 재생 다이얼로그 ──────────────────────────────────────────────────────────
interface YouTubeDialogProps {
  url: string;
  onClose: () => void;
}

export const YouTubeDialog: React.FC<YouTubeDialogProps> = ({ url, onClose }) => {
  const videoId = extractVideoId(url);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <div className="flex items-center gap-2 min-w-0">
            <YtIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-neutral-300 truncate">{url}</span>
          </div>
          <button onClick={onClose} className="ml-2 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {videoId ? (
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              title="YouTube video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="py-12 text-center text-neutral-400 text-sm">유효하지 않은 YouTube URL입니다</div>
        )}
      </div>
    </div>
  );
};

// ─── 아이콘 헬퍼 ─────────────────────────────────────────────────────────────
const YtIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

// ─── 다중 링크 목록 ───────────────────────────────────────────────────────────
export interface YtLink { url: string; label?: string }

interface YouTubeLinkListProps {
  value: YtLink[];
  onChange: (links: YtLink[]) => void;
}

export const YouTubeLinkList: React.FC<YouTubeLinkListProps> = ({ value, onChange }) => {
  const [inputUrl, setInputUrl] = useState('');
  const [inputLabel, setInputLabel] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const add = () => {
    const trimmed = inputUrl.trim();
    if (!trimmed || !extractVideoId(trimmed)) return;
    onChange([...value, { url: trimmed, label: inputLabel.trim() || undefined }]);
    setInputUrl('');
    setInputLabel('');
  };

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const updateLabel = (i: number, label: string) =>
    onChange(value.map((item, idx) => idx === i ? { ...item, label: label.slice(0, 5) || undefined } : item));

  return (
    <div className="space-y-2">
      {/* 기존 링크 목록 */}
      {value.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5">
          <YtIcon className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <input
            type="text"
            value={item.label ?? ''}
            onChange={e => updateLabel(i, e.target.value)}
            placeholder={`영상${i + 1}`}
            maxLength={5}
            className="w-12 flex-shrink-0 px-1.5 py-0.5 text-xs border border-neutral-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-red-300 text-center"
          />
          <span className="flex-1 text-xs text-neutral-400 truncate min-w-0">{item.url}</span>
          <button
            type="button"
            onClick={() => setPreviewUrl(item.url)}
            className="flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
          >
            재생
          </button>
          <button
            type="button"
            onClick={() => remove(i)}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-neutral-400 hover:text-red-500 hover:bg-neutral-100 transition-colors text-xs"
          >
            ✕
          </button>
        </div>
      ))}

      {/* 입력 + 추가 버튼 */}
      <div className="flex gap-1.5">
        <input
          type="text"
          value={inputLabel}
          onChange={e => setInputLabel(e.target.value.slice(0, 5))}
          placeholder="별칭"
          maxLength={5}
          className="w-14 flex-shrink-0 px-2 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 bg-white text-center"
        />
        <div className="relative flex-1">
          <YtIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-red-400" />
          <input
            type="url"
            value={inputUrl}
            onChange={e => setInputUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder="YouTube URL 추가"
            className="w-full pl-8 pr-2.5 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
          />
        </div>
        <button
          type="button"
          onClick={add}
          disabled={!extractVideoId(inputUrl.trim())}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          추가
        </button>
      </div>

      {previewUrl && <YouTubeDialog url={previewUrl} onClose={() => setPreviewUrl(null)} />}
    </div>
  );
};
