'use client';

import React, { useState } from 'react';
import { Sheet, SongForm } from '@/types';
import { formatDate } from '@/lib/utils';
import { Button } from './Button';
import { useSheetStore } from '@/stores/sheetStore';
import { SheetViewerModal } from './SheetViewerModal';
import { SongFormBuilder } from './SongFormBuilder';
import { SongSection } from '@/types';

interface SheetCardProps {
  sheet: Sheet;
  onSelect: (sheet: Sheet) => void;
  onDelete?: (sheetId: string) => void;
}

export const SheetCard: React.FC<SheetCardProps> = ({ sheet, onSelect, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [addingForm, setAddingForm] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', key: '', sections: [] as SongSection[], memo: '' });
  const [viewing, setViewing] = useState(false);
  const { addSongForm, deleteSongForm } = useSheetStore();

  const handleAddForm = async () => {
    if (!newForm.name.trim()) return;
    await addSongForm(sheet.id, newForm);
    setNewForm({ name: '', key: '', chord_progression: '', memo: '' });
    setAddingForm(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-4 hover:shadow-soft transition-shadow">
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-base font-semibold text-neutral-900 mb-0.5">{sheet.title}</h3>
        {sheet.artist && <p className="text-sm text-neutral-500">{sheet.artist}</p>}

        <div className="flex flex-wrap gap-1.5 mt-2">
          {sheet.genre && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
              {sheet.genre}
            </span>
          )}
          {sheet.key && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
              {sheet.key}
            </span>
          )}
          {sheet.tempo && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
              {sheet.tempo} BPM
            </span>
          )}
        </div>

        <p className="text-xs text-neutral-400 mt-2">{formatDate(sheet.created_at)}</p>
      </div>

      {/* Song Forms */}
      <div className="mb-3">
        <button
          className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-primary-600 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <span>송폼 {sheet.song_forms?.length ? `(${sheet.song_forms.length})` : ''}</span>
          <span>{expanded ? '▲' : '▼'}</span>
        </button>

        {expanded && (
          <div className="mt-2 space-y-2">
            {sheet.song_forms?.length === 0 && (
              <p className="text-xs text-neutral-400">아직 송폼이 없습니다.</p>
            )}
            {sheet.song_forms?.map((form) => (
              <SongFormItem key={form.id} form={form} onDelete={deleteSongForm} />
            ))}

            {addingForm ? (
              <div className="border border-primary-200 rounded-xl p-3 bg-primary-50 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newForm.name}
                    onChange={(e) => setNewForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="버전 이름 (예: E♭ 버전)"
                    className="px-2 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={newForm.key}
                    onChange={(e) => setNewForm((p) => ({ ...p, key: e.target.value }))}
                    placeholder="키 (예: E♭)"
                    className="px-2 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <SongFormBuilder
                  sections={newForm.sections}
                  onChange={(sections) => setNewForm((p) => ({ ...p, sections }))}
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
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {sheet.sheet_versions?.[0] && (
          <Button size="sm" variant="secondary" onClick={() => setViewing(true)}>
            보기
          </Button>
        )}
        <Button size="sm" variant="primary" onClick={() => onSelect(sheet)} fullWidth>
          선택
        </Button>
        {onDelete && (
          <Button size="sm" variant="danger" onClick={() => onDelete(sheet.id)}>
            삭제
          </Button>
        )}
      </div>

      {viewing && <SheetViewerModal sheet={sheet} onClose={() => setViewing(false)} />}
    </div>
  );
};

const SongFormItem: React.FC<{ form: SongForm; onDelete: (id: string) => void }> = ({ form, onDelete }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-xs bg-neutral-50 hover:bg-neutral-100 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-neutral-700">{form.name}</span>
        <div className="flex items-center gap-2">
          {form.key && <span className="text-neutral-400">{form.key}</span>}
          <span>{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="px-3 py-2 space-y-1">
          {form.chord_progression && (
            <pre className="text-xs text-neutral-600 whitespace-pre-wrap font-sans">{form.chord_progression}</pre>
          )}
          {form.memo && <p className="text-xs text-neutral-400">{form.memo}</p>}
          <button
            onClick={() => onDelete(form.id)}
            className="text-xs text-error-500 hover:text-error-700 mt-1"
          >
            삭제
          </button>
        </div>
      )}
    </div>
  );
};
