'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/MainLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useSessionStore, DraftItem } from '@/stores/sessionStore';
import { useSheetStore } from '@/stores/sheetStore';
import { useTeamStore } from '@/stores/teamStore';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/hooks/useAuth';
import { Sheet, SongForm } from '@/types';
import { SheetViewerModal } from '@/components/SheetViewerModal';

export default function SessionDetailPage() {
  useAuth(true);

  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const { currentUser } = useAuthStore();
  const { currentSession, items: storedItems, isLoading, loadSessionWithItems, saveItems } = useSessionStore();
  const { sheets, loadSheets } = useSheetStore();
  const { teams, loadTeams } = useTeamStore();

  // Draft state
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [viewingSheet, setViewingSheet] = useState<Sheet | null>(null);

  // Add menu: which gap index to insert at (null = closed)
  const [addMenuIndex, setAddMenuIndex] = useState<number | null>(null);

  // Sheet picker
  const [sheetPickerIndex, setSheetPickerIndex] = useState<number | null>(null);
  const [sheetSearch, setSheetSearch] = useState('');
  const [pickerSheet, setPickerSheet] = useState<Sheet | null>(null);

  useEffect(() => {
    if (currentUser) {
      loadSessionWithItems(sessionId);
      loadSheets(undefined, currentUser.id);
      loadTeams();
    }
  }, [currentUser, sessionId, loadSessionWithItems, loadSheets, loadTeams]);

  useEffect(() => {
    if (currentSession) {
      setSelectedTeamId(currentSession.team_id || '');
    }
  }, [currentSession]);

  useEffect(() => {
    setDraftItems(
      storedItems.map((item) =>
        item.type === 'song'
          ? {
              localId: item.id,
              type: 'song',
              sheetId: item.sheet_id!,
              songFormId: item.song_form_id,
              sheetTitle: item.sheet?.title || '(악보 없음)',
              songFormName: item.song_form?.name,
              artist: item.sheet?.artist,
            }
          : { localId: item.id, type: 'ment', text: item.ment_text || '' }
      )
    );
  }, [storedItems]);

  // Guest link
  const guestLink = typeof window !== 'undefined' ? `${window.location.origin}/join/${sessionId}` : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(guestLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text in input
    }
  };

  // Item manipulation
  const insertItem = (index: number, item: DraftItem) => {
    setDraftItems((prev) => [...prev.slice(0, index), item, ...prev.slice(index)]);
  };

  const removeItem = (localId: string) => {
    setDraftItems((prev) => prev.filter((i) => i.localId !== localId));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setDraftItems((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index: number) => {
    setDraftItems((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const updateMentText = (localId: string, text: string) => {
    setDraftItems((prev) =>
      prev.map((item) => (item.localId === localId && item.type === 'ment' ? { ...item, text } : item))
    );
  };

  // Add handlers
  const handleAddMent = (index: number) => {
    insertItem(index, { localId: `new_${Date.now()}`, type: 'ment', text: '' });
    setAddMenuIndex(null);
  };

  const handleOpenSheetPicker = (index: number) => {
    setSheetPickerIndex(index);
    setPickerSheet(null);
    setSheetSearch('');
    setAddMenuIndex(null);
  };

  const handleSelectSong = (sheet: Sheet, songForm?: SongForm) => {
    if (sheetPickerIndex === null) return;
    insertItem(sheetPickerIndex, {
      localId: `new_${Date.now()}`,
      type: 'song',
      sheetId: sheet.id,
      songFormId: songForm?.id,
      sheetTitle: sheet.title,
      songFormName: songForm?.name,
      artist: sheet.artist,
    });
    setSheetPickerIndex(null);
    setPickerSheet(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveItems(sessionId, selectedTeamId, draftItems);
      router.push('/sessions');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '저장 실패');
      setSaving(false);
    }
  };

  const isSessionCreator = currentUser?.id === currentSession?.created_by;

  const handleViewSheet = useCallback((sheetId: string) => {
    const sheet = sheets.find(s => s.id === sheetId);
    if (sheet) setViewingSheet(sheet);
  }, [sheets]);

  const filteredSheets = sheets.filter(
    (s) =>
      s.title.toLowerCase().includes(sheetSearch.toLowerCase()) ||
      (s.artist ?? '').toLowerCase().includes(sheetSearch.toLowerCase())
  );

  if (isLoading && !currentSession) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-neutral-900">
        <LoadingSpinner text="세션 불러오는 중..." />
      </div>
    );
  }

  if (!currentSession) return null;

  const saveFooter = isSessionCreator ? (
    <div className="max-w-2xl mx-auto w-full px-4 py-3 space-y-2">
      {saveError && (
        <p className="text-xs text-red-500 text-center bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
          {saveError}
        </p>
      )}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-semibold hover:opacity-80 disabled:opacity-40 transition-opacity"
      >
        {saving ? '저장 중...' : '저장'}
      </button>
    </div>
  ) : undefined;

  return (
    <MainLayout title="세션" footer={saveFooter}>
      <div className="p-4 max-w-2xl mx-auto pb-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/sessions')}
            className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white flex-1 truncate">
            {currentSession.name}
          </h1>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            currentSession.status === 'active'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
          }`}>
            {currentSession.status === 'active' ? '진행 중' : '완료'}
          </span>
        </div>

        {/* Guest Link */}
        <section className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 mb-4">
          <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2">객원 공유 링크</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={guestLink}
              className="flex-1 text-xs text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl px-3 py-2 focus:outline-none truncate"
            />
            <button
              onClick={copyLink}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                copied
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
              }`}
            >
              {copied ? '복사됨' : '복사'}
            </button>
          </div>
        </section>

        {/* Team Selection — creator only */}
        {isSessionCreator && teams.length > 0 && (
          <section className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 mb-4">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2">공유할 팀</p>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 text-sm focus:outline-none focus:border-neutral-400 bg-neutral-50 dark:bg-neutral-700 dark:text-white"
            >
              <option value="">팀 없음 (개인)</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </section>
        )}

        {/* Setlist */}
        <section className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-700">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              세트리스트
              {draftItems.length > 0 && (
                <span className="ml-1.5 text-neutral-400 font-normal">{draftItems.length}개</span>
              )}
            </p>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
            {/* Gap at top — creator only */}
            {isSessionCreator && (
              <AddGap
                index={0}
                activeIndex={addMenuIndex}
                onToggle={setAddMenuIndex}
                onAddSong={handleOpenSheetPicker}
                onAddMent={handleAddMent}
              />
            )}

            {draftItems.length === 0 && (
              <p className="text-center text-sm text-neutral-400 py-8">
                {isSessionCreator ? '+ 버튼으로 곡이나 멘트를 추가하세요' : '세트리스트가 없습니다'}
              </p>
            )}

            {draftItems.map((item, index) => (
              <React.Fragment key={item.localId}>
                {item.type === 'song' ? (
                  <SongRow
                    item={item}
                    index={index}
                    total={draftItems.length}
                    onMoveUp={() => moveUp(index)}
                    onMoveDown={() => moveDown(index)}
                    onRemove={() => removeItem(item.localId)}
                    onViewSheet={() => handleViewSheet(item.sheetId)}
                    readOnly={!isSessionCreator}
                  />
                ) : (
                  <MentRow
                    item={item}
                    index={index}
                    total={draftItems.length}
                    onMoveUp={() => moveUp(index)}
                    onMoveDown={() => moveDown(index)}
                    onRemove={() => removeItem(item.localId)}
                    onTextChange={(text) => updateMentText(item.localId, text)}
                    readOnly={!isSessionCreator}
                  />
                )}

                {/* Gap after each item — creator only */}
                {isSessionCreator && (
                  <AddGap
                    index={index + 1}
                    activeIndex={addMenuIndex}
                    onToggle={setAddMenuIndex}
                    onAddSong={handleOpenSheetPicker}
                    onAddMent={handleAddMent}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </section>
      </div>


      {/* Sheet Viewer Modal (session context) */}
      {viewingSheet && (
        <SheetViewerModal
          sheet={viewingSheet}
          onClose={() => setViewingSheet(null)}
          sessionId={sessionId}
          isSessionCreator={isSessionCreator}
        />
      )}

      {/* Sheet Picker Modal */}
      {sheetPickerIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) { setSheetPickerIndex(null); setPickerSheet(null); } }}
        >
          <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-t-3xl max-h-[85vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                {pickerSheet && (
                  <button
                    onClick={() => setPickerSheet(null)}
                    className="p-1 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  {pickerSheet ? pickerSheet.title : '곡 선택'}
                </h2>
              </div>
              <button
                onClick={() => { setSheetPickerIndex(null); setPickerSheet(null); }}
                className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!pickerSheet ? (
              /* Sheet list */
              <>
                <div className="px-5 pb-3 flex-shrink-0">
                  <input
                    type="text"
                    value={sheetSearch}
                    onChange={(e) => setSheetSearch(e.target.value)}
                    placeholder="악보 검색..."
                    autoFocus
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm focus:outline-none focus:border-neutral-400 bg-neutral-50 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
                <div className="overflow-y-auto flex-1 px-3 pb-5 space-y-1">
                  {filteredSheets.length === 0 ? (
                    <p className="text-center text-sm text-neutral-400 py-8">악보가 없습니다</p>
                  ) : (
                    filteredSheets.map((sheet) => (
                      <button
                        key={sheet.id}
                        onClick={() => {
                          const hasForms = (sheet.song_forms?.length ?? 0) > 0;
                          if (hasForms) {
                            setPickerSheet(sheet);
                          } else {
                            handleSelectSong(sheet);
                          }
                        }}
                        className="w-full text-left px-4 py-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">{sheet.title}</p>
                        {sheet.artist && (
                          <p className="text-xs text-neutral-400 mt-0.5">{sheet.artist}</p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              /* Song form list for selected sheet */
              <div className="overflow-y-auto flex-1 px-3 pb-5 space-y-1">
                {/* Option: no specific song form */}
                <button
                  onClick={() => handleSelectSong(pickerSheet)}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">기본 (폼 없음)</p>
                  <p className="text-xs text-neutral-400 mt-0.5">송폼 없이 악보만 추가</p>
                </button>
                {(pickerSheet.song_forms ?? []).map((form: SongForm) => (
                  <button
                    key={form.id}
                    onClick={() => handleSelectSong(pickerSheet, form)}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{form.name}</p>
                    {form.key && (
                      <p className="text-xs text-neutral-400 mt-0.5">Key: {form.key}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </MainLayout>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AddGap({
  index,
  activeIndex,
  onToggle,
  onAddSong,
  onAddMent,
}: {
  index: number;
  activeIndex: number | null;
  onToggle: (index: number | null) => void;
  onAddSong: (index: number) => void;
  onAddMent: (index: number) => void;
}) {
  const isOpen = activeIndex === index;

  return (
    <div className="flex items-center justify-center py-1 px-4">
      {isOpen ? (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddSong(index)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:opacity-80 transition-opacity"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            곡
          </button>
          <button
            onClick={() => onAddMent(index)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-semibold hover:opacity-80 transition-opacity"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            멘트
          </button>
          <button
            onClick={() => onToggle(null)}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          onClick={() => onToggle(index)}
          className="w-6 h-6 rounded-full border-2 border-dashed border-neutral-300 dark:border-neutral-600 flex items-center justify-center text-neutral-400 hover:border-neutral-500 hover:text-neutral-600 dark:hover:border-neutral-400 dark:hover:text-neutral-300 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
    </div>
  );
}

function SongRow({
  item,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRemove,
  onViewSheet,
  readOnly = false,
}: {
  item: Extract<DraftItem, { type: 'song' }>;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onViewSheet?: () => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      {/* Order number (readonly) or arrows (editable) */}
      {readOnly ? (
        <span className="w-5 text-center text-xs text-neutral-400 font-mono flex-shrink-0">{index + 1}</span>
      ) : (
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-300 disabled:opacity-20 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-300 disabled:opacity-20 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      )}

      {/* Icon */}
      <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{item.sheetTitle}</p>
        <p className="text-xs text-neutral-400 truncate">
          {[item.songFormName, item.artist].filter(Boolean).join(' · ') || '송폼 없음'}
        </p>
      </div>

      {/* View sheet button */}
      {onViewSheet && (
        <button
          onClick={onViewSheet}
          className="p-1.5 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors flex-shrink-0"
          title="악보 보기"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      )}

      {/* Remove — editor only */}
      {!readOnly && (
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg text-neutral-300 dark:text-neutral-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function MentRow({
  item,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRemove,
  onTextChange,
  readOnly = false,
}: {
  item: Extract<DraftItem, { type: 'ment' }>;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onTextChange: (text: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 px-4 py-3 bg-blue-50/50 dark:bg-blue-900/10">
      {/* Order number (readonly) or arrows (editable) */}
      {readOnly ? (
        <span className="w-5 text-center text-xs text-blue-300 font-mono flex-shrink-0 mt-1">{index + 1}</span>
      ) : (
      <div className="flex flex-col gap-0.5 flex-shrink-0 mt-1">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-0.5 rounded text-blue-200 dark:text-blue-800 hover:text-blue-500 dark:hover:text-blue-400 disabled:opacity-20 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="p-0.5 rounded text-blue-200 dark:text-blue-800 hover:text-blue-500 dark:hover:text-blue-400 disabled:opacity-20 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      )}

      {/* Icon */}
      <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>

      {/* Text — editable or readonly */}
      {readOnly ? (
        <p className="flex-1 text-sm text-neutral-600 dark:text-neutral-300 py-0.5">
          {item.text || <span className="text-neutral-400 italic">멘트</span>}
        </p>
      ) : (
        <textarea
          value={item.text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="멘트 내용을 입력하세요..."
          rows={2}
          className="flex-1 text-sm text-neutral-900 dark:text-white bg-transparent placeholder-neutral-400 focus:outline-none resize-none"
        />
      )}

      {/* Remove — editor only */}
      {!readOnly && (
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg text-blue-200 dark:text-blue-800 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0 mt-0.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
