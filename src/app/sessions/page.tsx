'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/MainLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/Button';
import { useSessionStore } from '@/stores/sessionStore';
import { useTeamStore } from '@/stores/teamStore';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/hooks/useAuth';

export default function SessionsPage() {
  useAuth(true);

  const router = useRouter();
  const { currentUser } = useAuthStore();
  const { sessions, isLoading, loadSessions, createSession, deleteSession } = useSessionStore();
  const { teams, loadTeams } = useTeamStore();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterTeamId, setFilterTeamId] = useState<string>('all');
  const creatingRef = useRef(false);

  useEffect(() => {
    if (currentUser) {
      loadSessions();
      loadTeams();
    }
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!name.trim() || creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    try {
      const session = await createSession(name.trim(), selectedTeamId || undefined);
      setShowCreate(false);
      setName('');
      setSelectedTeamId('');
      router.push(`/session/${session.id}`);
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('세션을 삭제할까요?')) return;
    setDeletingId(id);
    try {
      await deleteSession(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handlePlayClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    router.push(`/session-player/${sessionId}`);
  };

  const teamById = (id: string) => teams.find((t) => t.id === id);

  const filteredSessions =
    filterTeamId === 'all'
      ? sessions
      : filterTeamId === 'none'
      ? sessions.filter((s) => !s.team_id)
      : sessions.filter((s) => s.team_id === filterTeamId);

  return (
    <MainLayout title="세션">
      <div className="p-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="type-h1 text-neutral-900 dark:text-white">세션</h1>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setShowCreate(true)}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            새 세션
          </Button>
        </div>

        {/* Team filter tabs */}
        {teams.length > 0 && (
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterTeamId('all')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterTeamId === 'all'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
              }`}
            >
              전체
            </button>
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => setFilterTeamId(team.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterTeamId === team.id
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                }`}
              >
                {team.name}
              </button>
            ))}
            <button
              onClick={() => setFilterTeamId('none')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterTeamId === 'none'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
              }`}
            >
              팀 없음
            </button>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner text="불러오는 중..." />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-16 text-neutral-400">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <p className="text-sm">세션이 없습니다</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 text-sm text-neutral-500 underline"
            >
              첫 세션 만들기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filteredSessions.map((session) => {
              const team = session.team_id ? teamById(session.team_id) : null;
              return (
                <div
                  key={session.id}
                  className="group relative text-left bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
                >
                  {/* Status dot */}
                  <div className={`w-2 h-2 rounded-full mb-3 ${
                    session.status === 'active' ? 'bg-success-500' : 'bg-neutral-300 dark:bg-neutral-600'
                  }`} />

                  <button
                    onClick={() => router.push(`/session/${session.id}`)}
                    className="block text-left w-full"
                  >
                    <p className="type-body-sm text-neutral-900 dark:text-white leading-snug line-clamp-2">
                      {session.name}
                    </p>
                    <p className="type-caption text-neutral-400 mt-1.5">
                      {new Date(session.started_at).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    {/* Team badge */}
                    {team && (
                      <span className="inline-block mt-2 px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full text-xs font-medium truncate max-w-full">
                        {team.name}
                      </span>
                    )}
                  </button>

                  {/* Play button */}
                  <button
                    onClick={(e) => handlePlayClick(e, session.id)}
                    className="absolute bottom-3 right-3 p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-all"
                    aria-label="세션 재생"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(e, session.id)}
                    disabled={deletingId === session.id}
                    className="absolute top-3 right-3 p-1 rounded-lg text-neutral-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-900/20 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreate(false);
              setName('');
              setSelectedTeamId('');
            }
          }}
        >
          <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-t-3xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <h2 className="type-h2 text-neutral-900 dark:text-white">새 세션</h2>
              <button
                onClick={() => { setShowCreate(false); setName(''); setSelectedTeamId(''); }}
                className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 space-y-3 pb-2">
              <div>
                <label className="block type-h3 text-neutral-500 mb-1.5">세션 이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="예) 주일 예배 2부"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm focus:outline-none focus:border-neutral-400 bg-neutral-50 dark:bg-neutral-800 dark:text-white"
                />
              </div>

              {/* Team selector */}
              {teams.length > 0 && (
                <div>
                  <label className="block type-h3 text-neutral-500 mb-1.5">팀 공유 (선택)</label>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm focus:outline-none focus:border-neutral-400 bg-neutral-50 dark:bg-neutral-800 dark:text-white"
                  >
                    <option value="">팀 없음 (개인)</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="px-5 py-4">
              <Button
                variant="primary"
                fullWidth
                disabled={!name.trim()}
                isLoading={creating}
                onClick={handleCreate}
              >
                만들기
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
