'use client';

import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useTeamStore } from '@/stores/teamStore';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/hooks/useAuth';

export default function TeamsPage() {
  useAuth(true);

  const { currentUser } = useAuthStore();
  const { teams, isLoading, loadTeams, selectTeam } = useTeamStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadTeams();
    }
  }, [currentUser, loadTeams]);

  return (
    <MainLayout title="팀 관리">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">팀 관리</h1>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            새 팀 생성
          </Button>
        </div>

        {/* Teams List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner text="팀 로딩 중..." />
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-12 bg-neutral-50 rounded-lg border border-neutral-200">
            <p className="text-neutral-600 mb-4">아직 팀이 없습니다.</p>
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
            >
              첫 번째 팀 생성
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="bg-white rounded-lg border border-neutral-200 p-4"
              >
                <h3 className="text-lg font-semibold text-neutral-900">{team.name}</h3>
                {team.description && (
                  <p className="text-sm text-neutral-600 mt-2">{team.description}</p>
                )}
                <Button
                  size="sm"
                  variant="primary"
                  className="mt-4 w-full"
                  onClick={() => selectTeam(team)}
                >
                  선택
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
