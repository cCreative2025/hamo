'use client';

import React from 'react';
import { SongSection, FlowItem } from '@/types';
import { SongFormBuilder } from './SongFormBuilder';
import { KeyPickerPopover } from './KeyPickerPopover';

export interface SongFormInputValue {
  name: string;
  key: string;
  tempo?: number | '';
  sections: SongSection[];
  flow: FlowItem[];
  memo?: string;
}

interface SongFormInputProps {
  value: SongFormInputValue;
  onChange: (val: SongFormInputValue) => void;
  showTempo?: boolean;
  showMemo?: boolean;
  defaultTempo?: number;   // 시트 기본 템포 (힌트용)
  autoFocus?: boolean;
}

const inputCls = 'w-full px-2.5 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white';

export const SongFormInput: React.FC<SongFormInputProps> = ({
  value,
  onChange,
  showTempo = false,
  showMemo = false,
  defaultTempo,
  autoFocus = false,
}) => {
  const set = (patch: Partial<SongFormInputValue>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3">
      {/* 이름 + 키 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">버전 이름</label>
          <input
            type="text"
            value={value.name}
            onChange={e => set({ name: e.target.value })}
            placeholder="예: 원키, E♭ 버전"
            autoFocus={autoFocus}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">키</label>
          <KeyPickerPopover value={value.key} onChange={k => set({ key: k })} />
        </div>
      </div>

      {/* 템포 (선택) */}
      {showTempo && (
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">
            템포 (BPM){defaultTempo ? <span className="font-normal text-neutral-400"> · 기본 {defaultTempo}</span> : ''}
          </label>
          <input
            type="number"
            value={value.tempo ?? ''}
            onChange={e => set({ tempo: e.target.value ? parseInt(e.target.value) : '' })}
            placeholder={defaultTempo ? `기본 ${defaultTempo}` : '예: 120'}
            className={inputCls}
          />
        </div>
      )}

      {/* 섹션 + 플로우 빌더 */}
      <SongFormBuilder
        sections={value.sections}
        flow={value.flow}
        onChange={(sections, flow) => set({ sections, flow })}
      />

      {/* 메모 (선택) */}
      {showMemo && (
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">메모</label>
          <input
            type="text"
            value={value.memo ?? ''}
            onChange={e => set({ memo: e.target.value })}
            placeholder="참고사항"
            className={inputCls}
          />
        </div>
      )}
    </div>
  );
};
