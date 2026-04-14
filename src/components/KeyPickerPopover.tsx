'use client';

import React, { useState, useRef, useEffect } from 'react';

const ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const MODS = [
  { label: '없음', value: '' },
  { label: '#',   value: '#' },
  { label: '♭',   value: '♭' },
  { label: 'm',   value: 'm' },
  { label: '#m',  value: '#m' },
  { label: '♭m',  value: '♭m' },
];

interface KeyPickerPopoverProps {
  value: string;
  onChange: (key: string) => void;
  placeholder?: string;
}

export const KeyPickerPopover: React.FC<KeyPickerPopoverProps> = ({ value, onChange, placeholder = '키' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 현재 값에서 root/mod 파싱
  const parseKey = (k: string) => {
    for (const mod of ['♭m', '#m', 'm', '♭', '#']) {
      if (k.endsWith(mod) && k.length > mod.length) {
        const root = k.slice(0, k.length - mod.length);
        if (ROOTS.includes(root)) return { root, mod };
      }
    }
    if (ROOTS.includes(k)) return { root: k, mod: '' };
    return { root: '', mod: '' };
  };

  const { root: selectedRoot, mod: selectedMod } = parseKey(value);

  const handleRoot = (r: string) => {
    onChange(r + selectedMod);
  };

  const handleMod = (m: string) => {
    if (!selectedRoot) return;
    onChange(selectedRoot + m);
  };

  const handleClear = () => {
    onChange('');
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`px-2 py-1.5 rounded-lg border text-xs font-medium w-full text-left transition-colors
          ${value
            ? 'bg-primary-50 border-primary-300 text-primary-700'
            : 'border-neutral-300 text-neutral-400 bg-white hover:border-primary-300'
          }`}
      >
        {value || placeholder}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-neutral-200 rounded-2xl shadow-soft-md p-3 w-52">
          {/* 루트 키 */}
          <p className="text-xs font-medium text-neutral-500 mb-2">키</p>
          <div className="grid grid-cols-7 gap-1 mb-3">
            {ROOTS.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => handleRoot(r)}
                className={`h-8 rounded-lg text-xs font-semibold transition-colors
                  ${selectedRoot === r
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
              >{r}</button>
            ))}
          </div>

          {/* 수식어 */}
          <p className="text-xs font-medium text-neutral-500 mb-2">수식어</p>
          <div className="flex flex-wrap gap-1">
            {MODS.map(({ label, value: mv }) => (
              <button
                key={mv}
                type="button"
                onClick={() => handleMod(mv)}
                disabled={!selectedRoot}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-30
                  ${selectedMod === mv && selectedRoot
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
              >{label}</button>
            ))}
          </div>

          {/* 초기화 */}
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="mt-3 w-full py-1.5 rounded-xl text-xs text-neutral-400 border border-neutral-200 hover:bg-neutral-50 transition-colors"
            >키 제거</button>
          )}
        </div>
      )}
    </div>
  );
};
