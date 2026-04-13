'use client';

import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useSessionStore } from '@/stores/sessionStore';
import { useAuthStore } from '@/stores/authStore';
import { useTeamStore } from '@/stores/teamStore';
import { useAuth } from '@/hooks/useAuth';

export default function SessionsPage() {
  useAuth(true);

  const { currentUser } = useAuthStore();
  const { selectedTeam, loadTeams } = useTeamStore();
  const { isLoading, loadSession } = useSessionStore();

  const [sessions, setSessions] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadTeams();
    }
  }, [currentUser, loadTeams]);

  useEffect(() => {
    if (selectedTeam) {
      // TODO: 세션 목록 로드
      console.log('Loading sessions for team:', selectedTeam);
    }
  }, [selectedTeam]);

  return (
    <MainLayout title="세션 관리">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">세션 관리</h1>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            새 세션
          </Button>
        </div>

        {/* Team Selection */}
        {!selectedTeam && (
          <div className="text-center py-12 bg-neutral-50 rounded-lg border border-neutral-200 mb-8">
            <p className="text-neutral-600 mb-4">먼저 팀을 선택해주세요</p>
            <Button variant="primary">팀으로 이동</Button>
          </div>
        )}

        {/* Sessions List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner text="세션 로딩 중..." />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 bg-neutral-50 rounded-lg border border-neutral-200">
            <p className="text-neutral-600 mb-4">활성 세션이 없습니다.</p>
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
            >
              첫 번째 세션 생성
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session: any) => (
              <div
                key={session.id}
                className="bg-white rounded-lg border border-neutral-200 p-4"
              >
                <h3 className="text-lg font-semibold text-neutral-900">{session.title}</h3>
                <p className="text-sm text-neutral-600 mt-2">
                  곡 {session.songs.length}개
                </p>
                <Button
                  size="sm"
                  variant="primary"
                  className="mt-4 w-full"
                  onClick={() => {
                    // TODO: 세션 플레이어로 이동
                  }}
                >
                  재생
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
