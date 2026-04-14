'use client';

import React, { useState, useCallback } from 'react';
import { SongSection } from '@/types';

// ─── 섹션 타입 정의 ───────────────────────────────────────────────────────────
const SECTION_TYPES = [
  { type: 'I',  label: '인트로',     short: 'I',  color: 'bg-neutral-100 text-neutral-600 border-neutral-300' },
  { type: 'V',  label: '버스',       short: 'V',  color: 'bg-primary-100 text-primary-700 border-primary-300' },
  { type: 'PC', label: '프리코러스', short: 'PC', color: 'bg-warning-100 text-warning-700 border-warning-300' },
  { type: 'C',  label: '코러스',     short: 'C',  color: 'bg-secondary-100 text-secondary-700 border-secondary-300' },
  { type: 'B',  label: '브릿지',     short: 'B',  color: 'bg-success-100 text-success-700 border-success-300' },
  { type: 'O',  label: '아웃트로',   short: 'O',  color: 'bg-neutral-100 text-neutral-500 border-neutral-200' },
] as const;

// ─── 코드 정의 ────────────────────────────────────────────────────────────────
const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const QUALITIES = [
  { value: '',     label: 'M' },
  { value: 'm',    label: 'm' },
  { value: '7',    label: '7' },
  { value: 'maj7', label: 'M7' },
  { value: 'm7',   label: 'm7' },
  { value: 'dim',  label: 'dim' },
  { value: 'sus4', label: 'sus4' },
  { value: 'sus2', label: 'sus2' },
  { value: 'add9', label: 'add9' },
];

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

/** 섹션 배열에서 type별 순서 번호 계산 → 표시 레이블 */
function getSectionLabel(sections: SongSection[], targetId: string): string {
  const target = sections.find(s => s.id === targetId);
  if (!target) return '';
  const sameType = sections.filter(s => s.type === target.type);
  if (sameType.length === 1) return target.type;
  return `${target.type}${sameType.findIndex(s => s.id === targetId) + 1}`;
}

function getSectionMeta(type: string) {
  return SECTION_TYPES.find(s => s.type === type) ?? {
    type, label: type, short: type,
    color: 'bg-neutral-100 text-neutral-600 border-neutral-300',
  };
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface SongFormBuilderProps {
  sections: SongSection[];
  onChange: (sections: SongSection[]) => void;
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────
export const SongFormBuilder: React.FC<SongFormBuilderProps> = ({ sections, onChange }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingRoot, setPendingRoot] = useState<string | null>(null);

  const selectedSection = sections.find(s => s.id === selectedId) ?? null;

  // 섹션 추가
  const addSection = useCallback((type: string) => {
    const newSection: SongSection = { id: uid(), type, chords: [] };
    const next = [...sections, newSection];
    onChange(next);
    setSelectedId(newSection.id);
  }, [sections, onChange]);

  // 섹션 삭제
  const removeSection = useCallback((id: string) => {
    onChange(sections.filter(s => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [sections, onChange, selectedId]);

  // 코드 추가 (루트 선택 → 퀄리티 선택 → 추가)
  const handleRootClick = (root: string) => {
    setPendingRoot(root);
  };

  const handleQualityClick = (quality: string) => {
    if (!pendingRoot || !selectedId) return;
    const chord = pendingRoot + quality;
    onChange(sections.map(s =>
      s.id === selectedId ? { ...s, chords: [...s.chords, chord] } : s
    ));
    setPendingRoot(null);
  };

  // 코드 삭제
  const removeChord = (sectionId: string, chordIndex: number) => {
    onChange(sections.map(s =>
      s.id === sectionId
        ? { ...s, chords: s.chords.filter((_, i) => i !== chordIndex) }
        : s
    ));
  };

  return (
    <div className="space-y-4">

      {/* ── 섹션 흐름 ── */}
      <div>
        <p className="text-xs font-medium text-neutral-500 mb-2">곡 구조</p>
        <div className="min-h-12 flex flex-wrap gap-2 p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
          {sections.length === 0 && (
            <span className="text-xs text-neutral-400 self-center">아래 버튼으로 섹션을 추가하세요</span>
          )}
          {sections.map((s) => {
            const meta = getSectionMeta(s.type);
            const label = getSectionLabel(sections, s.id);
            const isSelected = s.id === selectedId;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all select-none
                  ${meta.color}
                  ${isSelected ? 'ring-2 ring-primary-400 ring-offset-1 scale-105' : 'hover:scale-105'}`}
                onClick={() => { setSelectedId(isSelected ? null : s.id); setPendingRoot(null); }}
              >
                <span>{label}</span>
                {s.chords.length > 0 && (
                  <span className="opacity-60 font-normal">({s.chords.length})</span>
                )}
                <button
                  className="ml-0.5 opacity-50 hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); removeSection(s.id); }}
                >×</button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 섹션 추가 버튼 ── */}
      <div>
        <p className="text-xs font-medium text-neutral-500 mb-2">섹션 추가</p>
        <div className="flex flex-wrap gap-2">
          {SECTION_TYPES.map(({ type, label, color }) => (
            <button
              key={type}
              type="button"
              onClick={() => addSection(type)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all hover:scale-105 ${color}`}
            >
              + {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 선택된 섹션 코드 편집 ── */}
      {selectedSection && (
        <div className="border border-primary-200 rounded-xl p-3 bg-primary-50 space-y-3">
          <p className="text-xs font-semibold text-primary-700">
            {getSectionLabel(sections, selectedSection.id)} 코드 편집
          </p>

          {/* 현재 코드 목록 */}
          <div className="flex flex-wrap gap-1.5 min-h-8">
            {selectedSection.chords.length === 0 && (
              <span className="text-xs text-neutral-400">코드를 추가하세요</span>
            )}
            {selectedSection.chords.map((chord, i) => (
              <span
                key={i}
                className="flex items-center gap-1 px-2.5 py-1 bg-white border border-primary-200 rounded-lg text-xs font-medium text-primary-700"
              >
                {chord}
                <button
                  className="opacity-40 hover:opacity-100 text-error-500"
                  onClick={() => removeChord(selectedSection.id, i)}
                >×</button>
              </span>
            ))}
          </div>

          {/* 루트 선택 */}
          <div>
            <p className="text-xs text-neutral-500 mb-1.5">
              {pendingRoot ? `${pendingRoot} — 퀄리티 선택` : '루트 선택'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ROOTS.map(root => (
                <button
                  key={root}
                  type="button"
                  onClick={() => handleRootClick(root)}
                  className={`w-9 h-9 rounded-xl text-xs font-semibold border transition-all hover:scale-105
                    ${pendingRoot === root
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-white text-neutral-700 border-neutral-300 hover:border-primary-400'}`}
                >
                  {root}
                </button>
              ))}
            </div>
          </div>

          {/* 퀄리티 선택 (루트 선택 후 표시) */}
          {pendingRoot && (
            <div>
              <div className="flex flex-wrap gap-1.5">
                {QUALITIES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleQualityClick(value)}
                    className="px-3 h-9 rounded-xl text-xs font-medium border bg-white text-neutral-700 border-neutral-300 hover:border-primary-400 hover:bg-primary-50 transition-all"
                  >
                    {pendingRoot}{label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPendingRoot(null)}
                  className="px-3 h-9 rounded-xl text-xs text-neutral-400 border border-neutral-200 hover:bg-neutral-100 transition-all"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
