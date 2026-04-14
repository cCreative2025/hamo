'use client';

import React, { useState, useRef } from 'react';
import { Sheet, SongForm, SongSection, normalizeFlow } from '@/types';
import { formatDate, formatFileSize } from '@/lib/utils';
import { Button } from './Button';
import { useSheetStore } from '@/stores/sheetStore';
import { SheetViewerModal } from './SheetViewerModal';
import { getSectionLabel } from './SongFormBuilder';
import { SongFormInput, SongFormInputValue } from './SongFormInput';
import { KeyPickerPopover } from './KeyPickerPopover';
import { YouTubeLinkList, YouTubeDialog, YtLink } from './YouTubeDialog';

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
    youtube_urls: sheet.youtube_urls ?? [] as YtLink[],
  });
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replacing, setReplacing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [addingForm, setAddingForm] = useState(false);
  const [newForm, setNewForm] = useState<SongFormInputValue>({
    name: '', key: '', sections: [] as SongSection[], flow: [], memo: '',
  });
  const [viewing, setViewing] = useState(false);
  const { addSongForm, deleteSongForm, updateSongForm, updateSheet, replaceSheetFile } = useSheetStore();

  const handleAddForm = async () => {
    if (!newForm.name.trim()) return;
    await addSongForm(sheet.id, newForm);
    setNewForm({ name: '', key: '', sections: [], flow: [], memo: '' });
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
      youtube_urls: draft.youtube_urls.length ? draft.youtube_urls : undefined,
    });
    if (replaceFile) {
      setReplacing(true);
      try { await replaceSheetFile(sheet.id, replaceFile); } finally { setReplacing(false); }
      setReplaceFile(null);
    }
    setEditing(false);
  };

  const formKeys = [...new Set((sheet.song_forms ?? []).map(f => f.key).filter(Boolean) as string[])].filter(k => k !== sheet.key);
  const currentVersion = sheet.sheet_versions?.[0];

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 hover:shadow-soft transition-shadow">

      {/* ── 헤더 (항상 표시) ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => { if (!editing) setExpanded(v => !v); }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {sheet.key && (
              <span className="flex-shrink-0 px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded-md text-xs font-semibold">{sheet.key}</span>
            )}
            {formKeys.map(k => (
              <span key={k} className="flex-shrink-0 px-1 py-0.5 bg-primary-50 text-primary-500 rounded text-[10px] font-medium">{k}</span>
            ))}
            <h3 className="text-base font-semibold text-neutral-900 truncate">{sheet.title}</h3>
          </div>
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
                  <KeyPickerPopover value={draft.key} onChange={k => setDraft(p => ({ ...p, key: k }))} />
                </Field>
                <Field label="템포 (BPM)">
                  <input className={inputCls} type="number" value={draft.tempo} onChange={e => setDraft(p => ({ ...p, tempo: e.target.value ? parseInt(e.target.value) : '' }))} placeholder="예: 120" />
                </Field>
                <Field label="박자">
                  <input className={inputCls} value={draft.time_signature} onChange={e => setDraft(p => ({ ...p, time_signature: e.target.value }))} placeholder="예: 4/4" />
                </Field>
              </div>

              {/* 유튜브 */}
              <Field label="레퍼런스 유튜브">
                <YouTubeLinkList
                  value={draft.youtube_urls}
                  onChange={urls => setDraft(p => ({ ...p, youtube_urls: urls }))}
                />
              </Field>

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

              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="secondary" onClick={() => { setEditing(false); setReplaceFile(null); }}>취소</Button>
                <Button size="sm" variant="primary" onClick={handleEditSave} isLoading={replacing}>저장</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5 pt-3 items-center">
                {sheet.genre && <Tag color="primary">{sheet.genre}</Tag>}
                {sheet.key   && <Tag color="primary">{sheet.key} Key</Tag>}
                {sheet.tempo && <Tag>{sheet.tempo} BPM</Tag>}
                {sheet.time_signature && <Tag>{sheet.time_signature}</Tag>}
                {(sheet.youtube_urls?.length ?? 0) > 0 && (
                  <YtTagList urls={sheet.youtube_urls!} />
                )}
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
                    <SongFormInput
                      value={newForm}
                      onChange={setNewForm}
                      showMemo
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="secondary" onClick={() => setAddingForm(false)}>취소</Button>
                      <Button size="sm" variant="primary" onClick={handleAddForm}>저장</Button>
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
                  <Button
                    size="sm"
                    variant="danger"
                    className="px-2"
                    title="수정"
                    onClick={() => { setDraft({ title: sheet.title, artist: sheet.artist ?? '', genre: sheet.genre ?? '', key: sheet.key ?? '', tempo: sheet.tempo ?? '', time_signature: sheet.time_signature ?? '', youtube_urls: sheet.youtube_urls ?? [] }); setEditing(true); }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </Button>
                  {onDelete && (
                    <Button size="sm" variant="danger" onClick={() => onDelete(sheet.id)}>삭제</Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {viewing && <SheetViewerModal sheet={sheet} onClose={() => setViewing(false)} onEdit={() => { setViewing(false); setExpanded(true); setAddingForm(true); }} />}
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
  const [formDraft, setFormDraft] = useState<SongFormInputValue>({
    name: form.name,
    key: form.key ?? '',
    tempo: form.tempo ?? '',
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
      name: formDraft.name,
      key: formDraft.key || undefined,
      tempo: formDraft.tempo !== '' ? Number(formDraft.tempo) : undefined,
      sections: formDraft.sections,
      flow: formDraft.flow,
    });
    setEditing(false);
  };

  const effectiveTempo = form.tempo ?? sheetTempo;

  if (editing) {
    return (
      <div className="border border-primary-300 rounded-xl p-3 bg-primary-50 space-y-3">
        <SongFormInput
          value={formDraft}
          onChange={setFormDraft}
          showTempo
          defaultTempo={sheetTempo}
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>취소</Button>
          <Button size="sm" variant="primary" onClick={handleSave}>저장</Button>
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

// ─── 유튜브 태그 버튼 목록 ────────────────────────────────────────────────────
const YtTagList: React.FC<{ urls: YtLink[] }> = ({ urls }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  return (
    <>
      {urls.map((item, i) => (
        <button
          key={i}
          onClick={() => setPreviewUrl(item.url)}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-500 text-xs font-medium hover:bg-red-100 transition-colors"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          {item.label ?? (urls.length > 1 ? `영상${i + 1}` : '유튜브')}
        </button>
      ))}
      {previewUrl && <YouTubeDialog url={previewUrl} onClose={() => setPreviewUrl(null)} />}
    </>
  );
};
