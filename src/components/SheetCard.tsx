'use client';

import React, { useState } from 'react';
import { Sheet, SongForm, SongSection, FlowItem, normalizeFlow } from '@/types';
import { formatDate } from '@/lib/utils';
import { Button } from './Button';
import { useSheetStore } from '@/stores/sheetStore';
import { SheetViewerModal } from './SheetViewerModal';
import { SongFormBuilder, getSectionLabel } from './SongFormBuilder';
import { KeyPickerPopover } from './KeyPickerPopover';

// ─── 섹션 색상 헬퍼 ──────────────────────────────────────────────────────────
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

// ─── SheetCard ────────────────────────────────────────────────────────────────
interface SheetCardProps {
  sheet: Sheet;
  onSelect?: (sheet: Sheet) => void;
  onDelete?: (sheetId: string) => void;
}

export const SheetCard: React.FC<SheetCardProps> = ({ sheet, onDelete }) => {
  const [addingForm, setAddingForm] = useState(false);
  const [newForm, setNewForm] = useState({
    name: '', key: '', sections: [] as SongSection[], flow: [] as FlowItem[], memo: '',
  });
  const [viewing, setViewing] = useState(false);
  const { addSongForm, deleteSongForm, updateSongForm } = useSheetStore();

  const handleAddForm = async () => {
    if (!newForm.name.trim()) return;
    await addSongForm(sheet.id, newForm);
    setNewForm({ name: '', key: '', sections: [], flow: [] as FlowItem[], memo: '' });
    setAddingForm(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-4 hover:shadow-soft transition-shadow flex flex-col gap-3">

      {/* ── 헤더 ── */}
      <div>
        {/* 송폼 키 뱃지들 */}
        {(() => {
          const keys = [...new Set((sheet.song_forms ?? []).map(f => f.key).filter(Boolean))];
          return keys.length > 0 ? (
            <div className="flex flex-wrap gap-1 mb-1">
              {keys.map(k => (
                <span key={k} className="px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded-md text-xs font-semibold">{k}</span>
              ))}
            </div>
          ) : null;
        })()}
        <h3 className="text-base font-semibold text-neutral-900 mb-0.5">{sheet.title}</h3>
        {sheet.artist && <p className="text-sm text-neutral-500">{sheet.artist}</p>}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {sheet.genre && <Tag color="primary">{sheet.genre}</Tag>}
          {sheet.key   && <Tag>{sheet.key}</Tag>}
          {sheet.tempo && <Tag>{sheet.tempo} BPM</Tag>}
        </div>
        <p className="text-xs text-neutral-400 mt-1.5">{formatDate(sheet.created_at)}</p>
      </div>

      {/* ── 송폼 목록 (항상 노출) ── */}
      <div className="space-y-2">
        {sheet.song_forms?.map((form) => (
          <SongFormItem
            key={form.id}
            form={form}
            onDelete={deleteSongForm}
            onUpdate={updateSongForm}
          />
        ))}

        {addingForm ? (
          <div className="border border-primary-200 rounded-xl p-3 bg-primary-50 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newForm.name}
                onChange={(e) => setNewForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="버전 이름 (예: E♭ 버전)"
                autoFocus
                className="px-2 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <KeyPickerPopover
                value={newForm.key}
                onChange={(k) => setNewForm((p) => ({ ...p, key: k }))}
              />
            </div>
            <SongFormBuilder
              sections={newForm.sections}
              flow={newForm.flow}
              onChange={(sections, flow) => setNewForm((p) => ({ ...p, sections, flow }))}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="primary" onClick={handleAddForm}>저장</Button>
              <Button size="sm" variant="secondary" onClick={() => setAddingForm(false)}>취소</Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingForm(true)}
            className="w-full py-1.5 text-xs text-primary-500 border border-dashed border-primary-300 rounded-xl hover:bg-primary-50 transition-colors"
          >
            + 송폼 추가
          </button>
        )}
      </div>

      {/* ── 액션 ── */}
      {!addingForm && (
        <div className="flex gap-2 mt-auto">
          {sheet.sheet_versions?.[0] && (
            <Button size="sm" variant="secondary" onClick={() => setViewing(true)} fullWidth>보기</Button>
          )}
          {onDelete && (
            <Button size="sm" variant="danger" onClick={() => onDelete(sheet.id)}>삭제</Button>
          )}
        </div>
      )}

      {viewing && <SheetViewerModal sheet={sheet} onClose={() => setViewing(false)} />}
    </div>
  );
};

// ─── 태그 헬퍼 ───────────────────────────────────────────────────────────────
const Tag: React.FC<{ children: React.ReactNode; color?: 'primary' | 'neutral' }> = ({ children, color = 'neutral' }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
    color === 'primary' ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-600'
  }`}>{children}</span>
);

// ─── SongFormItem ─────────────────────────────────────────────────────────────
const SongFormItem: React.FC<{
  form: SongForm;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<SongForm>) => Promise<void>;
}> = ({ form, onDelete, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: form.name,
    key: form.key ?? '',
    sections: (form.sections ?? []) as SongSection[],
    flow: normalizeFlow(form.flow),
  });

  const sections = form.sections ?? [];
  const normFlow = normalizeFlow(form.flow);
  // flow가 있으면 flow 순서로, 없으면 sections 순서로 표시 (하위호환)
  const displayFlow: { section: SongSection; repeat: number }[] = normFlow.length
    ? normFlow.map(item => {
        const section = sections.find(s => s.id === item.id);
        return section ? { section, repeat: item.repeat ?? 1 } : null;
      }).filter(Boolean) as { section: SongSection; repeat: number }[]
    : sections.map(s => ({ section: s, repeat: 1 }));

  const handleSave = async () => {
    await onUpdate(form.id, { name: draft.name, key: draft.key, sections: draft.sections, flow: draft.flow });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="border border-primary-300 rounded-xl p-3 bg-primary-50 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft(p => ({ ...p, name: e.target.value }))}
            className="px-2 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
            autoFocus
          />
          <KeyPickerPopover
            value={draft.key}
            onChange={(k) => setDraft(p => ({ ...p, key: k }))}
          />
        </div>
        <SongFormBuilder
          sections={draft.sections}
          flow={draft.flow}
          onChange={(sections, flow) => setDraft(p => ({ ...p, sections, flow }))}
        />
        <div className="flex gap-2">
          <Button size="sm" variant="primary" onClick={handleSave}>저장</Button>
          <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>취소</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      {/* 헤더 + 흐름 칩 */}
      <div className="px-3 py-2.5 bg-neutral-50">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-neutral-700">
            {form.name}{form.key && <span className="font-normal text-neutral-400 ml-1">· {form.key}</span>}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(true)} className="text-xs text-neutral-400 hover:text-primary-500 transition-colors">수정</button>
            <button onClick={() => onDelete(form.id)} className="text-xs text-neutral-400 hover:text-error-500 transition-colors">삭제</button>
          </div>
        </div>

        {/* 흐름 칩 (반복 포함) */}
        {displayFlow.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1">
            {displayFlow.map(({ section: s, repeat }, i) => (
              <React.Fragment key={`${s.id}-${i}`}>
                {i > 0 && <span className="text-neutral-300 text-xs select-none">—</span>}
                <span className={`px-1.5 py-0.5 rounded-md text-xs font-semibold ${getSectionColor(s.type)}`}>
                  {getSectionLabel(sections, s.id)}{repeat > 1 ? ` ×${repeat}` : ''}
                </span>
              </React.Fragment>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-400">섹션 없음</p>
        )}
      </div>

    </div>
  );
};
