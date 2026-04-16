'use client';

import React from 'react';
import { SongForm, SongSection, normalizeFlow } from '@/types';
import { getSectionLabel } from '@/components/SongFormBuilder';

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
  form: SongForm;
}

export function SongFormBar({ form }: SongFormBarProps) {
  const sections = (form.sections ?? []) as SongSection[];
  const normFlow = normalizeFlow(
    form.flow?.length ? form.flow : sections.map((s) => ({ id: s.id }))
  );
  const displayFlow = normFlow
    .map((item) => {
      const section = sections.find((s) => s.id === item.id);
      return section ? { section, repeat: item.repeat ?? 1 } : null;
    })
    .filter(Boolean) as { section: SongSection; repeat: number }[];

  if (displayFlow.length === 0) return null;

  return (
    <div className="flex-shrink-0 bg-neutral-900 px-4 py-2 overflow-x-auto">
      <div className="flex items-center gap-1.5 min-w-max">
        <span className="text-[11px] text-neutral-500 font-medium">송폼</span>
        <span className="text-neutral-600 text-xs select-none">|</span>
        {form.key && (
          <>
            <span className="text-xs font-bold text-primary-400">{form.key}</span>
            <span className="text-neutral-600 text-xs select-none">|</span>
          </>
        )}
        {displayFlow.map(({ section: s, repeat }, i) => (
          <React.Fragment key={`${s.id}-${i}`}>
            {i > 0 && <span className="text-neutral-600 text-xs select-none">—</span>}
            <span className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${getSectionColor(s.type)}`}>
              {s.sectionKey && (
                <span className="mr-0.5 text-[10px] font-bold opacity-80">
                  {s.sectionKey}
                </span>
              )}
              {getSectionLabel(sections, s.id)}
              {repeat > 1 ? ` ×${repeat}` : ''}
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
