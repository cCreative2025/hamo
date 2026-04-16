'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SongForm, SongSection, normalizeFlow } from '@/types';
import { getSectionLabel } from '@/components/SongFormBuilder';
import { useSessionPlayerStore } from '@/stores/sessionPlayerStore';
import { supabase } from '@/lib/supabase';

const SECTION_COLORS: Record<string, string> = {
  I: 'bg-neutral-600 text-neutral-100',
  V: 'bg-primary-700 text-white',
  PC: 'bg-yellow-700 text-white',
  C: 'bg-purple-700 text-white',
  B: 'bg-green-700 text-white',
  O: 'bg-neutral-500 text-neutral-100',
};
function getSectionColor(type: string) {
  return SECTION_COLORS[type] ?? 'bg-violet-700 text-white';
}

interface SongFormBarProps {
  form: SongForm | null;
  sheetTempo?: number;
  sessionSongId?: string;
  sessionTempo?: number | null;
  isCreator?: boolean;
  layerCount?: number;
  onLayerOpen?: () => void;
}

export function SongFormBar({
  form, sheetTempo, sessionSongId, sessionTempo, isCreator,
  layerCount = 0, onLayerOpen,
}: SongFormBarProps) {
  const { updateSessionTempo, updateSongFormTempo } = useSessionPlayerStore();
  const [editingTempo, setEditingTempo] = useState(false);
  const [tempInput, setTempInput] = useState('');
  const [askSaveToForm, setAskSaveToForm] = useState<number | null>(null); // pending BPM value
  const inputRef = useRef<HTMLInputElement>(null);

  // 세션 override가 있으면 최우선 표시 (사용자가 명시적으로 바꾼 것)
  // 없으면 song_form → sheet 순
  const displayTempo = sessionTempo ?? form?.tempo ?? sheetTempo;

  useEffect(() => {
    if (editingTempo) {
      setTempInput(String(displayTempo ?? ''));
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editingTempo]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveTempo = async () => {
    if (!isCreator || !sessionSongId) { setEditingTempo(false); return; }
    const val = parseInt(tempInput, 10);
    const next = isNaN(val) || val <= 0 ? null : val;
    await updateSessionTempo(sessionSongId, next);
    setEditingTempo(false);
    // 송폼이 있으면 저장 여부 물어보기
    if (next && form?.id) setAskSaveToForm(next);
  };

  const saveToSongForm = async () => {
    if (!form?.id || askSaveToForm == null) return;
    await updateSongFormTempo(form.id, askSaveToForm);
    setAskSaveToForm(null);
  };

  const sections = (form?.sections ?? []) as SongSection[];
  const normFlow = normalizeFlow(
    form?.flow?.length ? form.flow : sections.map((s) => ({ id: s.id }))
  );
  const displayFlow = normFlow
    .map((item) => {
      const section = sections.find((s) => s.id === item.id);
      return section ? { section, repeat: item.repeat ?? 1 } : null;
    })
    .filter(Boolean) as { section: SongSection; repeat: number }[];

  const isEmpty = !form || displayFlow.length === 0;

  return (
    <>
      <div className="flex-shrink-0 bg-neutral-900 px-3 py-2 flex items-center gap-2">
        {/* Scrollable flow */}
        <div className="flex-1 overflow-x-auto min-w-0">
          <div className="flex items-center gap-1.5 min-w-max">
            <span className="text-[11px] text-neutral-500 font-medium">송폼</span>
            <span className="text-neutral-600 text-xs select-none">|</span>

            {/* Tempo badge */}
            {editingTempo ? (
              <input
                ref={inputRef}
                type="number"
                inputMode="numeric"
                enterKeyHint="done"
                value={tempInput}
                onChange={(e) => setTempInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); saveTempo(); }
                  if (e.key === 'Escape') setEditingTempo(false);
                }}
                onBlur={saveTempo}
                className="w-16 px-1.5 py-0.5 rounded text-xs bg-neutral-700 text-white border border-orange-500 outline-none"
                placeholder="BPM"
              />
            ) : (
              <>
                {displayTempo ? (
                  <button
                    onClick={() => isCreator && setEditingTempo(true)}
                    className={`px-2 py-0.5 rounded text-xs font-semibold bg-orange-700 text-white whitespace-nowrap ${isCreator ? 'hover:bg-orange-600 active:bg-orange-500' : ''}`}
                  >
                    ♩{displayTempo}
                  </button>
                ) : isCreator && sessionSongId ? (
                  <button
                    onClick={() => setEditingTempo(true)}
                    className="px-2 py-0.5 rounded text-xs text-neutral-600 hover:text-neutral-400 whitespace-nowrap"
                  >
                    ♩—
                  </button>
                ) : null}
              </>
            )}

            {displayTempo && <span className="text-neutral-600 text-xs select-none">|</span>}

            {isEmpty && <span className="text-xs text-neutral-600">없음</span>}
            {!isEmpty && form?.key && (
              <>
                <span className="text-xs font-bold text-primary-400">{form.key}</span>
                <span className="text-neutral-600 text-xs select-none">|</span>
              </>
            )}
            {!isEmpty && displayFlow.map(({ section: s, repeat }, i) => (
              <React.Fragment key={`${s.id}-${i}`}>
                {i > 0 && <span className="text-neutral-600 text-xs select-none">—</span>}
                <span className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${getSectionColor(s.type)}`}>
                  {s.sectionKey && (
                    <span className="mr-0.5 text-[10px] font-bold opacity-80">{s.sectionKey}</span>
                  )}
                  {getSectionLabel(sections, s.id)}
                  {repeat > 1 ? ` ×${repeat}` : ''}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Layer toggle button */}
        {onLayerOpen && (
          <button
            onClick={onLayerOpen}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-300 hover:text-white text-xs font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
            </svg>
            레이어
            {layerCount > 0 && (
              <span className="ml-0.5 bg-primary-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {layerCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* 송폼 저장 확인 토스트 */}
      {askSaveToForm != null && (
        <div className="flex-shrink-0 bg-neutral-800 border-t border-neutral-700 px-3 py-2 flex items-center gap-2">
          <span className="text-xs text-neutral-300 flex-1">
            송폼에도 ♩{askSaveToForm} 저장할까요?
          </span>
          <button
            onClick={saveToSongForm}
            className="px-2.5 py-1 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium transition-colors"
          >
            저장
          </button>
          <button
            onClick={() => setAskSaveToForm(null)}
            className="px-2.5 py-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-300 text-xs font-medium transition-colors"
          >
            아니요
          </button>
        </div>
      )}
    </>
  );
}
