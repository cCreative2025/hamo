'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Modal } from '@/components/Modal';
import { useTeamStore } from '@/stores/teamStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/hooks/useAuth';
import { Team, Session } from '@/types';

export default function TeamsPage() {
  useAuth(true);

  const router = useRouter();
  const { currentUser } = useAuthStore();
  const { teams, isLoading, error, loadTeams, createTeam, joinTeamByCode, regenerateInviteCode } = useTeamStore();
  const { createSession, loadSessionsByTeam } = useSessionStore();

  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState<Team | null>(null);

  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  // Expanded team state
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [teamSessions, setTeamSessions] = useState<Record<string, Session[]>>({});
  const [teamSessionsLoading, setTeamSessionsLoading] = useState<string | null>(null);

  // Create session from team
  const [showCreateSession, setShowCreateSession] = useState<Team | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [sessionCreating, setSessionCreating] = useState(false);

  useEffect(() => {
    if (currentUser) loadTeams();
  }, [currentUser, loadTeams]);

  async function handleExpandTeam(team: Team) {
    if (expandedTeamId === team.id) {
      setExpandedTeamId(null);
      return;
    }
    setExpandedTeamId(team.id);
    if (!teamSessions[team.id]) {
      setTeamSessionsLoading(team.id);
      const sessions = await loadSessionsByTeam(team.id);
      setTeamSessions((prev) => ({ ...prev, [team.id]: sessions }));
      setTeamSessionsLoading(null);
    }
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreateError('');
    setCreateLoading(true);
    try {
      await createTeam(createName.trim(), createDesc.trim() || undefined);
      setShowCreateTeam(false);
      setCreateName('');
      setCreateDesc('');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '팀 생성 실패');
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoinError('');
    setJoinLoading(true);
    try {
      await joinTeamByCode(joinCode);
      setShowJoinModal(false);
      setJoinCode('');
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : '참여 실패');
    } finally {
      setJoinLoading(false);
    }
  }

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionName.trim() || !showCreateSession) return;
    setSessionCreating(true);
    try {
      const session = await createSession(sessionName.trim(), showCreateSession.id);
      // Refresh team sessions
      const updated = await loadSessionsByTeam(showCreateSession.id);
      setTeamSessions((prev) => ({ ...prev, [showCreateSession.id]: updated }));
      setShowCreateSession(null);
      setSessionName('');
      router.push(`/session/${session.id}`);
    } finally {
      setSessionCreating(false);
    }
  }

  async function handleCopyCode(team: Team) {
    if (!team.invite_code) return;
    await navigator.clipboard.writeText(team.invite_code);
    setCopiedId(team.id);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleRegenerate(teamId: string) {
    await regenerateInviteCode(teamId);
  }

  const isOwner = (team: Team) => team.owner_id === currentUser?.id;

  return (
    <MainLayout title="팀 관리">
      <div className="p-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">팀</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowJoinModal(true)}>
              코드로 참여
            </Button>
            <Button size="sm" variant="primary" onClick={() => setShowCreateTeam(true)}>
              + 팀 만들기
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Teams */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner text="팀 로딩 중..." />
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-16 text-neutral-400">
            <p className="text-sm mb-4">아직 팀이 없습니다.</p>
            <div className="flex gap-3 justify-center">
              <Button size="sm" variant="secondary" onClick={() => setShowJoinModal(true)}>코드로 참여</Button>
              <Button size="sm" variant="primary" onClick={() => setShowCreateTeam(true)}>팀 만들기</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map((team) => {
              const expanded = expandedTeamId === team.id;
              const sessions = teamSessions[team.id] || [];
              const sessionsLoading = teamSessionsLoading === team.id;

              return (
                <div
                  key={team.id}
                  className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
                >
                  {/* Team header row */}
                  <button
                    onClick={() => handleExpandTeam(team)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-sm">
                        {team.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-neutral-900 dark:text-white">{team.name}</span>
                          {isOwner(team) && (
                            <span className="text-xs px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 rounded-full">오너</span>
                          )}
                        </div>
                        {team.description && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{team.description}</p>
                        )}
                      </div>
                    </div>
                    <svg
                      className={`w-4 h-4 text-neutral-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded: sessions + actions */}
                  {expanded && (
                    <div className="border-t border-neutral-100 dark:border-neutral-700">
                      {/* Invite code */}
                      {team.invite_code && (
                        <div className="flex items-center gap-2 px-5 py-3 bg-neutral-50 dark:bg-neutral-900/50">
                          <span className="text-xs text-neutral-400">초대코드</span>
                          <span className="font-mono font-bold text-sm text-neutral-800 dark:text-neutral-200 tracking-widest">
                            {team.invite_code}
                          </span>
                          <button
                            onClick={() => handleCopyCode(team)}
                            className="text-xs text-primary-600 dark:text-primary-400 hover:underline ml-1"
                          >
                            {copiedId === team.id ? '복사됨!' : '복사'}
                          </button>
                          {isOwner(team) && (
                            <button
                              onClick={() => handleRegenerate(team.id)}
                              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 ml-auto"
                            >
                              재생성
                            </button>
                          )}
                        </div>
                      )}

                      {/* Sessions list */}
                      <div className="px-5 py-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">세션</span>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => { setShowCreateSession(team); setSessionName(''); }}
                          >
                            + 세션 추가
                          </Button>
                        </div>

                        {sessionsLoading ? (
                          <div className="py-4 flex justify-center">
                            <LoadingSpinner text="" />
                          </div>
                        ) : sessions.length === 0 ? (
                          <p className="text-xs text-neutral-400 py-3">아직 세션이 없습니다.</p>
                        ) : (
                          <div className="space-y-2">
                            {sessions.map((session) => (
                              <button
                                key={session.id}
                                onClick={() => router.push(`/session/${session.id}`)}
                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-left"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-1.5 h-1.5 rounded-full ${
                                    session.status === 'active' ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-600'
                                  }`} />
                                  <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                                    {session.name}
                                  </span>
                                </div>
                                <span className="text-xs text-neutral-400">
                                  {new Date(session.started_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      <Modal
        isOpen={showCreateTeam}
        onClose={() => { setShowCreateTeam(false); setCreateName(''); setCreateDesc(''); setCreateError(''); }}
        title="새 팀 만들기"
      >
        <form onSubmit={handleCreateTeam} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              팀 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="예: 찬양팀 A"
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">설명 (선택)</label>
            <textarea
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              placeholder="팀 설명"
              rows={2}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
          {createError && <p className="text-sm text-red-500">{createError}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setShowCreateTeam(false)}>취소</Button>
            <Button type="submit" variant="primary" disabled={!createName.trim() || createLoading}>
              {createLoading ? '생성 중...' : '팀 생성'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Join Team Modal */}
      <Modal
        isOpen={showJoinModal}
        onClose={() => { setShowJoinModal(false); setJoinCode(''); setJoinError(''); }}
        title="코드로 팀 참여"
      >
        <form onSubmit={handleJoin} className="space-y-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">팀장에게 받은 6자리 초대 코드를 입력하세요.</p>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={8}
            className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono text-2xl text-center tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
          {joinError && <p className="text-sm text-red-500">{joinError}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setShowJoinModal(false)}>취소</Button>
            <Button type="submit" variant="primary" disabled={joinCode.length < 4 || joinLoading}>
              {joinLoading ? '참여 중...' : '팀 참여'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invite Code Modal */}
      {showInviteModal && (
        <Modal isOpen={!!showInviteModal} onClose={() => setShowInviteModal(null)} title="팀 초대">
          <div className="space-y-4">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">아래 코드를 팀원에게 공유하세요.</p>
            <div className="flex items-center justify-center gap-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl p-6">
              <span className="font-mono font-bold text-4xl tracking-widest text-neutral-900 dark:text-neutral-100">
                {showInviteModal.invite_code ?? '----'}
              </span>
              <button onClick={() => handleCopyCode(showInviteModal)} className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                {copiedId === showInviteModal.id ? '복사됨!' : '복사'}
              </button>
            </div>
            <div className="flex justify-between pt-1">
              <Button size="sm" variant="secondary" onClick={() => handleRegenerate(showInviteModal.id)}>코드 재생성</Button>
              <Button variant="primary" onClick={() => setShowInviteModal(null)}>닫기</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Session Modal (from team) */}
      {showCreateSession && (
        <Modal
          isOpen={!!showCreateSession}
          onClose={() => { setShowCreateSession(null); setSessionName(''); }}
          title={`세션 추가 — ${showCreateSession.name}`}
        >
          <form onSubmit={handleCreateSession} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">세션 이름</label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="예) 주일 예배 2부"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={() => setShowCreateSession(null)}>취소</Button>
              <Button type="submit" variant="primary" disabled={!sessionName.trim() || sessionCreating}>
                {sessionCreating ? '생성 중...' : '세션 만들기'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </MainLayout>
  );
}
