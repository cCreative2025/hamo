'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/MainLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useSessionStore } from '@/stores/sessionStore';
import { useSheetStore } from '@/stores/sheetStore';
import { useTeamStore } from '@/stores/teamStore';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/hooks/useAuth';
import { Sheet } from '@/types';

export default function SessionsPage() {
  useAuth(true);

  const router = useRouter();
  const { currentUser } = useAuthStore();
  const { sessions, isLoading, loadSessions, createSession } = useSessionStore();
  const { sheets, loadSheets } = useSheetStore();
  const { teams, loadTeams } = useTeamStore();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedSheetIds, setSelectedSheetIds] = useState<string[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [sheetSearch, setSheetSearch] = useState('');

  useEffect(() => {
    if (currentUser) {
      loadSessions();
      loadSheets(undefined, currentUser.id);
      loadTeams();
    }
  }, [currentUser, loadSessions, loadSheets, loadTeams]);

  const filteredSheets = sheets.filter(s =>
    s.title.toLowerCase().includes(sheetSearch.toLowerCase()) ||
    (s.artist ?? '').toLowerCase().includes(sheetSearch.toLowerCase())
  );

  const toggleSheet = (id: string) => {
    setSelectedSheetIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const session = await createSession(
        title.trim(),
        selectedSheetIds,
        selectedTeamId || undefined,
      );
      setShowCreate(false);
      setTitle('');
      setSelectedSheetIds([]);
      setSelectedTeamId('');
      router.push(`/session/${session.id}`);
    } catch {
      setCreating(false);
    }
  };

  const closeCreate = () => {
    setShowCreate(false);
    setTitle('');
    setSelectedSheetIds([]);
    setSelectedTeamId('');
    setSheetSearch('');
  };

  return (
    <MainLayout title="세션">
      <div className="p-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-neutral-900">세션</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            새 세션
          </button>
        </div>

        {/* Sessions List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner text="불러오는 중..." />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 text-neutral-400">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <p className="text-sm">세션이 없습니다</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 text-sm text-neutral-500 underline"
            >첫 세션 만들기</button>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => router.push(`/session/${session.id}`)}
                className="w-full text-left bg-white rounded-2xl border border-neutral-200 px-4 py-3.5 hover:border-neutral-400 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-900 text-sm">{session.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    session.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'
                  }`}>{session.status === 'active' ? '진행 중' : '완료'}</span>
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  {new Date(session.started_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeCreate(); }}
        >
          <div className="bg-white w-full max-w-lg rounded-t-3xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <h2 className="text-base font-bold text-neutral-900">새 세션</h2>
              <button onClick={closeCreate} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 pb-4 space-y-5">
              {/* 세션 제목 */}
              <div>
                <label className="block text-xs font-semibold text-neutral-500 mb-1.5">세션 제목</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="예) 주일 예배 2부"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400 bg-neutral-50"
                />
              </div>

              {/* 악보 추가 */}
              <div>
                <label className="block text-xs font-semibold text-neutral-500 mb-1.5">
                  악보 추가
                  {selectedSheetIds.length > 0 && (
                    <span className="ml-1.5 text-neutral-400 font-normal">{selectedSheetIds.length}개 선택</span>
                  )}
                </label>
                <input
                  type="text"
                  value={sheetSearch}
                  onChange={e => setSheetSearch(e.target.value)}
                  placeholder="악보 검색..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm mb-2 focus:outline-none focus:border-neutral-400 bg-neutral-50"
                />
                <div className="max-h-44 overflow-y-auto space-y-1 rounded-xl border border-neutral-100 bg-neutral-50 p-1">
                  {filteredSheets.length === 0 ? (
                    <p className="text-xs text-neutral-400 text-center py-4">악보가 없습니다</p>
                  ) : filteredSheets.map((sheet: Sheet) => {
                    const selected = selectedSheetIds.includes(sheet.id);
                    return (
                      <button
                        key={sheet.id}
                        onClick={() => toggleSheet(sheet.id)}
                        className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                          selected ? 'bg-neutral-900 text-white' : 'hover:bg-white text-neutral-700'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center ${
                          selected ? 'bg-white border-white' : 'border-neutral-300'
                        }`}>
                          {selected && (
                            <svg className="w-2.5 h-2.5 text-neutral-900" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </span>
                        <span className="truncate">{sheet.title}</span>
                        {sheet.artist && <span className={`text-xs ml-auto flex-shrink-0 ${selected ? 'text-neutral-300' : 'text-neutral-400'}`}>{sheet.artist}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 팀 추가 (optional) */}
              {teams.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 mb-1.5">팀 추가 <span className="font-normal text-neutral-400">(선택)</span></label>
                  <select
                    value={selectedTeamId}
                    onChange={e => setSelectedTeamId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400 bg-neutral-50"
                  >
                    <option value="">팀 없음</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-neutral-100 flex-shrink-0">
              <button
                onClick={handleCreate}
                disabled={!title.trim() || creating}
                className="w-full py-3 rounded-2xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-700 disabled:opacity-40 transition-colors"
              >
                {creating ? '생성 중...' : '세션 시작'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
