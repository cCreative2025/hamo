'use client';

import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Modal } from '@/components/Modal';
import { useTeamStore } from '@/stores/teamStore';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/hooks/useAuth';
import { Team } from '@/types';

export default function TeamsPage() {
  useAuth(true);

  const { currentUser } = useAuthStore();
  const { teams, isLoading, error, loadTeams, selectTeam, createTeam, joinTeamByCode, regenerateInviteCode } =
    useTeamStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
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

  useEffect(() => {
    if (currentUser) {
      loadTeams();
    }
  }, [currentUser, loadTeams]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreateError('');
    setCreateLoading(true);
    try {
      await createTeam(createName.trim(), createDesc.trim() || undefined);
      setShowCreateModal(false);
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

  async function handleCopyCode(team: Team) {
    if (!team.invite_code) return;
    await navigator.clipboard.writeText(team.invite_code);
    setCopiedId(team.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleRegenerate(teamId: string) {
    try {
      await regenerateInviteCode(teamId);
    } catch {
      // error shown in store
    }
  }

  const isOwner = (team: Team) => team.owner_id === currentUser?.id;

  return (
    <MainLayout title="팀 관리">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">팀 관리</h1>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowJoinModal(true)}>
              코드로 참여
            </Button>
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              새 팀 생성
            </Button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg text-error-700 text-sm dark:bg-error-950 dark:border-error-800 dark:text-error-300">
            {error}
          </div>
        )}

        {/* Teams List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner text="팀 로딩 중..." />
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-12 bg-neutral-50 rounded-lg border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-700">
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">아직 팀이 없습니다.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={() => setShowJoinModal(true)}>
                코드로 참여
              </Button>
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                첫 번째 팀 생성
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 flex flex-col gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      {team.name}
                    </h3>
                    {isOwner(team) && (
                      <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 rounded-full">
                        오너
                      </span>
                    )}
                  </div>
                  {team.description && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{team.description}</p>
                  )}
                </div>

                {/* Invite code */}
                {team.invite_code && (
                  <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-900 rounded-lg px-3 py-2">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 flex-1">초대코드</span>
                    <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200 tracking-widest">
                      {team.invite_code}
                    </span>
                    <button
                      onClick={() => handleCopyCode(team)}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline ml-1"
                    >
                      {copiedId === team.id ? '복사됨!' : '복사'}
                    </button>
                  </div>
                )}

                <div className="flex gap-2 mt-auto">
                  <Button
                    size="sm"
                    variant="primary"
                    className="flex-1"
                    onClick={() => selectTeam(team.id)}
                  >
                    선택
                  </Button>
                  {isOwner(team) && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowInviteModal(team)}
                    >
                      초대
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateName('');
          setCreateDesc('');
          setCreateError('');
        }}
        title="새 팀 생성"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              팀 이름 <span className="text-error-500">*</span>
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
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              설명 (선택)
            </label>
            <textarea
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              placeholder="팀 설명을 입력하세요"
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
          {createError && (
            <p className="text-sm text-error-600 dark:text-error-400">{createError}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!createName.trim() || createLoading}
            >
              {createLoading ? '생성 중...' : '팀 생성'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Join Team Modal */}
      <Modal
        isOpen={showJoinModal}
        onClose={() => {
          setShowJoinModal(false);
          setJoinCode('');
          setJoinError('');
        }}
        title="코드로 팀 참여"
      >
        <form onSubmit={handleJoin} className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            팀장에게 받은 6자리 초대 코드를 입력하세요.
          </p>
          <div>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="예: ABC123"
              maxLength={8}
              className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono text-2xl text-center tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>
          {joinError && (
            <p className="text-sm text-error-600 dark:text-error-400">{joinError}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowJoinModal(false)}
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={joinCode.length < 4 || joinLoading}
            >
              {joinLoading ? '참여 중...' : '팀 참여'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invite Code Modal (owner only) */}
      {showInviteModal && (
        <Modal
          isOpen={!!showInviteModal}
          onClose={() => setShowInviteModal(null)}
          title="팀 초대"
        >
          <div className="space-y-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              아래 코드를 팀원에게 공유하세요. 팀원은 &apos;코드로 참여&apos; 버튼으로 합류할 수 있습니다.
            </p>
            <div className="flex items-center justify-center gap-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl p-6">
              <span className="font-mono font-bold text-4xl tracking-widest text-neutral-900 dark:text-neutral-100">
                {showInviteModal.invite_code ?? '----'}
              </span>
              <button
                onClick={() => handleCopyCode(showInviteModal)}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                {copiedId === showInviteModal.id ? '복사됨!' : '복사'}
              </button>
            </div>
            <div className="flex justify-between items-center pt-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleRegenerate(showInviteModal.id)}
              >
                코드 재생성
              </Button>
              <Button variant="primary" onClick={() => setShowInviteModal(null)}>
                닫기
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </MainLayout>
  );
}
