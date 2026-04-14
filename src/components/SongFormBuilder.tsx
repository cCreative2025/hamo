'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SongSection, FlowItem, normalizeFlow } from '@/types';

// ─── 섹션 타입 정의 ───────────────────────────────────────────────────────────
const SECTION_TYPES = [
  { type: 'I',  label: '인트로',     color: 'bg-neutral-100 text-neutral-600 border-neutral-300' },
  { type: 'V',  label: '버스',       color: 'bg-primary-100 text-primary-700 border-primary-300' },
  { type: 'PC', label: '프리코러스', color: 'bg-warning-100 text-warning-700 border-warning-300' },
  { type: 'C',  label: '코러스',     color: 'bg-secondary-100 text-secondary-700 border-secondary-300' },
  { type: 'B',  label: '브릿지',     color: 'bg-success-100 text-success-700 border-success-300' },
  { type: 'O',  label: '아웃트로',   color: 'bg-neutral-100 text-neutral-500 border-neutral-200' },
] as const;

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

/** customLabel 우선, 없으면 type별 자동 번호 */
export function getSectionLabel(sections: SongSection[], targetId: string): string {
  const target = sections.find(s => s.id === targetId);
  if (!target) return '';
  if (target.customLabel) return target.customLabel;
  const sameType = sections.filter(s => s.type === target.type);
  if (sameType.length === 1) return target.type;
  return `${target.type}${sameType.findIndex(s => s.id === targetId) + 1}`;
}

function getSectionMeta(type: string) {
  return SECTION_TYPES.find(s => s.type === type) ?? {
    type, label: type,
    color: 'bg-violet-100 text-violet-700 border-violet-300',
  };
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface SongFormBuilderProps {
  sections: SongSection[];
  flow: FlowItem[];
  onChange: (sections: SongSection[], flow: FlowItem[]) => void;
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────
export const SongFormBuilder: React.FC<SongFormBuilderProps> = ({ sections, flow, onChange }) => {
  const [selectedDefId, setSelectedDefId] = useState<string | null>(null);
  const [selectedFlowIdx, setSelectedFlowIdx] = useState<number | null>(null);
  const [pendingRoot, setPendingRoot] = useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const customInputRef = useRef<HTMLInputElement>(null);

  const selectedDef = sections.find(s => s.id === selectedDefId) ?? null;
  const selectedFlowItem = selectedFlowIdx !== null ? flow[selectedFlowIdx] : null;

  useEffect(() => {
    if (showCustomInput) customInputRef.current?.focus();
  }, [showCustomInput]);

  // 새 섹션 정의 생성 + flow에 추가
  const addDefinition = (type: string, customLabel?: string) => {
    const newSec: SongSection = { id: uid(), type, chords: [], ...(customLabel ? { customLabel } : {}) };
    onChange([...sections, newSec], [...flow, { id: newSec.id }]);
    setSelectedDefId(newSec.id);
    setSelectedFlowIdx(null);
  };

  const confirmCustomSection = () => {
    const label = customInput.trim();
    if (!label) return;
    addDefinition('custom', label);
    setCustomInput('');
    setShowCustomInput(false);
  };

  // 기존 정의를 flow에 추가 (반복)
  const appendToFlow = (id: string) => {
    onChange(sections, [...flow, { id }]);
  };

  // flow에서 특정 위치 제거 (정의는 유지)
  const removeFromFlow = (flowIndex: number) => {
    onChange(sections, flow.filter((_, i) => i !== flowIndex));
    if (selectedFlowIdx === flowIndex) setSelectedFlowIdx(null);
  };

  // 정의 삭제 + flow에서도 제거
  const removeDefinition = (id: string) => {
    onChange(sections.filter(s => s.id !== id), flow.filter(item => item.id !== id));
    if (selectedDefId === id) setSelectedDefId(null);
    setSelectedFlowIdx(null);
  };

  // flow 아이템 반복 횟수 변경
  const setFlowRepeat = (flowIndex: number, delta: number) => {
    const current = flow[flowIndex]?.repeat ?? 1;
    const next = Math.max(1, current + delta);
    onChange(sections, flow.map((item, i) =>
      i === flowIndex ? { ...item, repeat: next > 1 ? next : undefined } : item
    ));
  };

  // 커스텀 레이블 수정
  const updateCustomLabel = (id: string, label: string) => {
    onChange(
      sections.map(s => s.id === id ? { ...s, customLabel: label || undefined } : s),
      flow
    );
  };

  // 코드 추가
  const handleRootClick = (root: string) => setPendingRoot(root);

  const handleQualityClick = (quality: string) => {
    if (!pendingRoot || !selectedDefId) return;
    const chord = pendingRoot + quality;
    onChange(
      sections.map(s => s.id === selectedDefId ? { ...s, chords: [...s.chords, chord] } : s),
      flow
    );
    setPendingRoot(null);
  };

  const removeChord = (secId: string, chordIdx: number) => {
    onChange(
      sections.map(s => s.id === secId ? { ...s, chords: s.chords.filter((_, i) => i !== chordIdx) } : s),
      flow
    );
  };

  return (
    <div className="space-y-4">

      {/* ── 1. 곡 구조 흐름 ── */}
      <div>
        <p className="text-xs font-medium text-neutral-500 mb-2">곡 구조 흐름</p>
        <div className="min-h-12 flex flex-wrap gap-2 p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
          {flow.length === 0 && (
            <span className="text-xs text-neutral-400 self-center">아래에서 섹션을 추가하세요</span>
          )}
          {flow.map((item, i) => {
            const sec = sections.find(s => s.id === item.id);
            if (!sec) return null;
            const meta = getSectionMeta(sec.type);
            const label = getSectionLabel(sections, item.id);
            const repeat = item.repeat ?? 1;
            const isFlowSelected = i === selectedFlowIdx;
            const isDefSelected = item.id === selectedDefId;
            return (
              <React.Fragment key={`${item.id}-${i}`}>
                {i > 0 && <span className="text-neutral-300 text-sm select-none self-center">—</span>}
                <div
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all select-none
                    ${meta.color}
                    ${isFlowSelected || isDefSelected ? 'ring-2 ring-primary-400 ring-offset-1 scale-105' : 'hover:scale-105'}`}
                  onClick={() => {
                    setSelectedFlowIdx(isFlowSelected ? null : i);
                    setSelectedDefId(isDefSelected ? null : item.id);
                    setPendingRoot(null);
                  }}
                >
                  <span>{label}{repeat > 1 ? ` ×${repeat}` : ''}</span>
                  {sec.chords.length > 0 && <span className="opacity-60 font-normal">({sec.chords.length})</span>}
                  <button
                    className="ml-0.5 opacity-40 hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); removeFromFlow(i); }}
                  >×</button>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* 선택된 flow 아이템의 반복 횟수 조절 */}
        {selectedFlowItem && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-neutral-500">반복</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFlowRepeat(selectedFlowIdx!, -1)}
                disabled={(selectedFlowItem.repeat ?? 1) <= 1}
                className="w-6 h-6 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 text-xs hover:bg-neutral-100 disabled:opacity-30 transition-colors"
              >－</button>
              <span className="w-6 text-center text-xs font-semibold text-neutral-700">
                {selectedFlowItem.repeat ?? 1}
              </span>
              <button
                type="button"
                onClick={() => setFlowRepeat(selectedFlowIdx!, +1)}
                className="w-6 h-6 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 text-xs hover:bg-neutral-100 transition-colors"
              >＋</button>
            </div>
            <span className="text-xs text-neutral-400">회</span>
          </div>
        )}
      </div>

      {/* ── 2. 정의된 섹션 (반복 추가) ── */}
      {sections.length > 0 && (
        <div>
          <p className="text-xs font-medium text-neutral-500 mb-2">섹션 반복 추가</p>
          <div className="flex flex-wrap gap-2">
            {sections.map(sec => {
              const meta = getSectionMeta(sec.type);
              const label = getSectionLabel(sections, sec.id);
              return (
                <div key={sec.id} className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => appendToFlow(sec.id)}
                    className={`px-3 py-1.5 rounded-l-xl border border-r-0 text-xs font-semibold transition-all hover:scale-105 ${meta.color}`}
                  >
                    + {label}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeDefinition(sec.id)}
                    title="섹션 정의 삭제"
                    className={`px-2 py-1.5 rounded-r-xl border text-xs opacity-40 hover:opacity-100 transition-all ${meta.color}`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. 새 섹션 추가 ── */}
      <div>
        <p className="text-xs font-medium text-neutral-500 mb-2">새 섹션 추가</p>
        <div className="flex flex-wrap gap-2">
          {SECTION_TYPES.map(({ type, label, color }) => (
            <button
              key={type}
              type="button"
              onClick={() => addDefinition(type)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all hover:scale-105 ${color}`}
            >
              + {label}
            </button>
          ))}

          {!showCustomInput ? (
            <button
              type="button"
              onClick={() => setShowCustomInput(true)}
              className="px-3 py-1.5 rounded-xl border text-xs font-medium transition-all hover:scale-105 bg-violet-100 text-violet-700 border-violet-300"
            >
              + 커스텀
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <input
                ref={customInputRef}
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') confirmCustomSection();
                  if (e.key === 'Escape') { setShowCustomInput(false); setCustomInput(''); }
                }}
                placeholder="예: 솔로(기타)"
                className="px-2.5 py-1.5 rounded-xl border border-violet-300 text-xs outline-none focus:border-violet-500 w-32"
              />
              <button
                type="button"
                onClick={confirmCustomSection}
                className="px-2.5 py-1.5 rounded-xl bg-violet-500 text-white text-xs font-medium hover:bg-violet-600 transition-all"
              >추가</button>
              <button
                type="button"
                onClick={() => { setShowCustomInput(false); setCustomInput(''); }}
                className="px-2 py-1.5 rounded-xl border border-neutral-200 text-xs text-neutral-400 hover:bg-neutral-100 transition-all"
              >취소</button>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. 선택된 섹션 코드 편집 ── */}
      {selectedDef && (
        <div className="border border-primary-200 rounded-xl p-3 bg-primary-50 space-y-3">
          <p className="text-xs font-semibold text-primary-700">
            {getSectionLabel(sections, selectedDef.id)} 편집
          </p>

          {/* 레이블 커스텀 */}
          <div>
            <p className="text-xs text-neutral-500 mb-1">레이블 (선택)</p>
            <input
              value={selectedDef.customLabel ?? ''}
              onChange={e => updateCustomLabel(selectedDef.id, e.target.value)}
              placeholder={`기본: ${getSectionLabel(sections.map(s => s.id === selectedDef.id ? { ...s, customLabel: undefined } : s), selectedDef.id)}`}
              className="w-full px-2.5 py-1.5 rounded-xl border border-primary-200 text-xs outline-none focus:border-primary-400 bg-white"
            />
          </div>

          {/* 현재 코드 목록 */}
          <div className="flex flex-wrap gap-1.5 min-h-8">
            {selectedDef.chords.length === 0 && (
              <span className="text-xs text-neutral-400">코드를 추가하세요</span>
            )}
            {selectedDef.chords.map((chord, i) => (
              <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-white border border-primary-200 rounded-lg text-xs font-medium text-primary-700">
                {chord}
                <button className="opacity-40 hover:opacity-100 text-error-500" onClick={() => removeChord(selectedDef.id, i)}>×</button>
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

          {/* 퀄리티 선택 */}
          {pendingRoot && (
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
              >취소</button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
