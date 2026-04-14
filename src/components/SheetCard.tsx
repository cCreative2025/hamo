'use client';

import React, { useState, useRef } from 'react';
import { Sheet, SongForm, SongSection, FlowItem, normalizeFlow } from '@/types';
import { formatDate, formatFileSize } from '@/lib/utils';
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

// ─── 인풋 헬퍼 ───────────────────────────────────────────────────────────────
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium text-neutral-500 mb-1">{label}</label>
    {children}
  </div>
);

const inputCls = 'w-full px-2.5 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white';

// ─── SheetCard ────────────────────────────────────────────────────────────────
interface SheetCardProps {
  sheet: Sheet;
  onSelect?: (sheet: Sheet) => void;
  onDelete?: (sheetId: string) => void;
}

export const SheetCard: React.FC<SheetCardProps> = ({ sheet, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    title: sheet.title,
    artist: sheet.artist ?? '',
    genre: sheet.genre ?? '',
    key: sheet.key ?? '',
    tempo: sheet.tempo ?? ('' as number | ''),
    time_signature: sheet.time_signature ?? '',
  });
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replacing, setReplacing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [addingForm, setAddingForm] = useState(false);
  const [newForm, setNewForm] = useState({
    name: '', key: '', sections: [] as SongSection[], flow: [] as FlowItem[], memo: '',
  });
  const [viewing, setViewing] = useState(false);
  const { addSongForm, deleteSongForm, updateSongForm, updateSheet, replaceSheetFile } = useSheetStore();

  const handleAddForm = async () => {
    if (!newForm.name.trim()) return;
    await addSongForm(sheet.id, newForm);
    setNewForm({ name: '', key: '', sections: [], flow: [] as FlowItem[], memo: '' });
    setAddingForm(false);
  };

  const handleEditSave = async () => {
    if (!draft.title.trim()) return;
    await updateSheet(sheet.id, {
      title: draft.title.trim(),
      artist: draft.artist || undefined,
      genre: draft.genre || undefined,
      key: draft.key || undefined,
      tempo: draft.tempo !== '' ? Number(draft.tempo) : undefined,
      time_signature: draft.time_signature || undefined,
    });
    if (replaceFile) {
      setReplacing(true);
      try { await replaceSheetFile(sheet.id, replaceFile); } finally { setReplacing(false); }
      setReplaceFile(null);
    }
    setEditing(false);
  };

  const keys = [...new Set((sheet.song_forms ?? []).map(f => f.key).filter(Boolean))];
  const currentVersion = sheet.sheet_versions?.[0];

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 hover:shadow-soft transition-shadow">

      {/* ── 헤더 (항상 표시) ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => { if (!editing) setExpanded(v => !v); }}
      >
        <div className="flex-1 min-w-0">
          {keys.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {keys.map(k => (
                <span key={k} className="px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded-md text-xs font-semibold">{k}</span>
              ))}
            </div>
          )}
          <h3 className="text-base font-semibold text-neutral-900 truncate">{sheet.title}</h3>
          {sheet.artist && <p className="text-sm text-neutral-500 truncate">{sheet.artist}</p>}
        </div>
        <svg
          className={`w-4 h-4 text-neutral-400 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* ── 펼쳐진 내용 ── */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-neutral-100">

          {/* ── 수정 모드 ── */}
          {editing ? (
            <div className="pt-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Field label="제목 *">
                  <input className={inputCls} value={draft.title} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))} placeholder="악보 제목" autoFocus />
                </Field>
                <Field label="아티스트">
                  <input className={inputCls} value={draft.artist} onChange={e => setDraft(p => ({ ...p, artist: e.target.value }))} placeholder="아티스트명" />
                </Field>
                <Field label="장르">
                  <input className={inputCls} value={draft.genre} onChange={e => setDraft(p => ({ ...p, genre: e.target.value }))} placeholder="장르" />
                </Field>
                <Field label="키">
                  <input className={inputCls} value={draft.key} onChange={e => setDraft(p => ({ ...p, key: e.target.value }))} placeholder="예: C Major" />
                </Field>
                <Field label="템포 (BPM)">
                  <input className={inputCls} type="number" value={draft.tempo} onChange={e => setDraft(p => ({ ...p, tempo: e.target.value ? parseInt(e.target.value) : '' }))} placeholder="예: 120" />
                </Field>
                <Field label="박자">
                  <input className={inputCls} value={draft.time_signature} onChange={e => setDraft(p => ({ ...p, time_signature: e.target.value }))} placeholder="예: 4/4" />
                </Field>
              </div>

              {/* 악보 교체 */}
              <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50">
                <p className="text-xs font-medium text-neutral-500 mb-2">악보 파일</p>
                {currentVersion && !replaceFile && (
                  <p className="text-xs text-neutral-400 mb-2 truncate">현재: {currentVersion.file_path?.split('/').pop() ?? '파일'}</p>
                )}
                {replaceFile && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-primary-600 font-medium truncate">{replaceFile.name}</span>
                    <span className="text-xs text-neutral-400">{formatFileSize(replaceFile.size)}</span>
                    <button onClick={() => setReplaceFile(null)} className="text-xs text-neutral-400 hover:text-error-500 ml-auto">✕</button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={e => setReplaceFile(e.target.files?.[0] ?? null)}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-1.5 text-xs text-neutral-500 border border-dashed border-neutral-300 rounded-lg hover:border-primary-400 hover:text-primary-500 transition-colors"
                >
                  {replaceFile ? '다른 파일로 교체' : '+ 파일 교체'}
                </button>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="primary" onClick={handleEditSave} isLoading={replacing}>저장</Button>
                <Button size="sm" variant="secondary" onClick={() => { setEditing(false); setReplaceFile(null); }}>취소</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5 pt-3 items-center">
                {sheet.genre && <Tag color="primary">{sheet.genre}</Tag>}
                {sheet.key   && <Tag>{sheet.key}</Tag>}
                {sheet.tempo && <Tag>{sheet.tempo} BPM</Tag>}
                {sheet.time_signature && <Tag>{sheet.time_signature}</Tag>}
                <span className="text-xs text-neutral-400 ml-auto">{formatDate(sheet.created_at)}</span>
              </div>

              {/* 송폼 목록 */}
              <div className="space-y-2">
                {sheet.song_forms?.map((form) => (
                  <SongFormItem
                    key={form.id}
                    form={form}
                    sheetTempo={sheet.tempo}
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

              {/* 액션 */}
              {!addingForm && (
                <div className="flex gap-2 mt-auto">
                  {sheet.sheet_versions?.[0] && (
                    <Button size="sm" variant="primary" onClick={() => setViewing(true)} fullWidth>보기</Button>
                  )}
                  <button
                    onClick={() => { setDraft({ title: sheet.title, artist: sheet.artist ?? '', genre: sheet.genre ?? '', key: sheet.key ?? '', tempo: sheet.tempo ?? '', time_signature: sheet.time_signature ?? '' }); setEditing(true); }}
                    className="p-2 rounded-xl bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-colors flex-shrink-0"
                    title="수정"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  {onDelete && (
                    <Button size="sm" variant="danger" onClick={() => onDelete(sheet.id)}>삭제</Button>
                  )}
                </div>
              )}
            </>
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
  sheetTempo?: number;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<SongForm>) => Promise<void>;
}> = ({ form, sheetTempo, onDelete, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: form.name,
    key: form.key ?? '',
    tempo: form.tempo ?? ('' as number | ''),
    sections: (form.sections ?? []) as SongSection[],
    flow: normalizeFlow(form.flow),
  });

  const sections = form.sections ?? [];
  const normFlow = normalizeFlow(form.flow);
  const displayFlow: { section: SongSection; repeat: number }[] = normFlow.length
    ? normFlow.map(item => {
        const section = sections.find(s => s.id === item.id);
        return section ? { section, repeat: item.repeat ?? 1 } : null;
      }).filter(Boolean) as { section: SongSection; repeat: number }[]
    : sections.map(s => ({ section: s, repeat: 1 }));

  const handleSave = async () => {
    await onUpdate(form.id, {
      name: draft.name,
      key: draft.key || undefined,
      tempo: draft.tempo !== '' ? Number(draft.tempo) : undefined,
      sections: draft.sections,
      flow: draft.flow,
    });
    setEditing(false);
  };

  const effectiveTempo = form.tempo ?? sheetTempo;

  if (editing) {
    return (
      <div className="border border-primary-300 rounded-xl p-3 bg-primary-50 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft(p => ({ ...p, name: e.target.value }))}
            placeholder="버전 이름"
            className="px-2 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
            autoFocus
          />
          <KeyPickerPopover
            value={draft.key}
            onChange={(k) => setDraft(p => ({ ...p, key: k }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">
            템포 (BPM) {sheetTempo && <span className="font-normal text-neutral-400">· 기본 {sheetTempo}</span>}
          </label>
          <input
            type="number"
            value={draft.tempo}
            onChange={e => setDraft(p => ({ ...p, tempo: e.target.value ? parseInt(e.target.value) : '' }))}
            placeholder={sheetTempo ? `기본 ${sheetTempo}` : '예: 120'}
            className="w-full px-2 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
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
      <div className="px-3 py-2.5 bg-neutral-50">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold text-neutral-700 truncate">
              {form.name}{form.key && <span className="font-normal text-neutral-400 ml-1">· {form.key}</span>}
            </span>
            {effectiveTempo && (
              <span className={`text-xs px-1.5 py-0.5 rounded-md ${form.tempo ? 'bg-warning-100 text-warning-700' : 'bg-neutral-100 text-neutral-400'}`}>
                {effectiveTempo} BPM
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setEditing(true)} className="text-xs text-neutral-400 hover:text-primary-500 transition-colors">수정</button>
            <button onClick={() => onDelete(form.id)} className="text-xs text-neutral-400 hover:text-error-500 transition-colors">삭제</button>
          </div>
        </div>

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
