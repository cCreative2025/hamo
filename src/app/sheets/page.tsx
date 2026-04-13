'use client';

import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { SheetCard } from '@/components/SheetCard';
import { SheetUploader } from '@/components/SheetUploader';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useSheetStore } from '@/stores/sheetStore';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/hooks/useAuth';
import { Sheet } from '@/types';

export default function SheetsPage() {
  useAuth(true);

  const { currentUser } = useAuthStore();
  const {
    sheets,
    filteredSheets,
    isLoading,
    filters,
    loadSheets,
    applyFilters,
    selectSheet,
  } = useSheetStore();

  const [showUploader, setShowUploader] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (currentUser) {
      loadSheets();
    }
  }, [currentUser, loadSheets]);

  useEffect(() => {
    applyFilters({
      search: searchTerm,
    });
  }, [searchTerm, applyFilters]);

  const handleSheetSelect = (sheet: Sheet) => {
    selectSheet(sheet);
    // 세션 생성으로 이동할 수 있도록 구현
    console.log('Selected sheet:', sheet);
  };

  return (
    <MainLayout title="악보 관리">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">악보 관리</h1>
          <Button
            variant={showUploader ? 'secondary' : 'primary'}
            onClick={() => setShowUploader(!showUploader)}
          >
            {showUploader ? '숨기기' : '악보 업로드'}
          </Button>
        </div>

        {/* Uploader */}
        {showUploader && (
          <div className="mb-8">
            <SheetUploader
              onUpload={async (file, data) => {
                // TODO: 실제 업로드 구현
                console.log('Uploading:', { file, data });
              }}
            />
          </div>
        )}

        {/* Search & Filter */}
        <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="악보 제목, 아티스트로 검색..."
              className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner text="악보 로딩 중..." />
          </div>
        ) : filteredSheets.length === 0 ? (
          <div className="text-center py-12 bg-neutral-50 rounded-lg border border-neutral-200">
            <p className="text-neutral-600 mb-4">아직 악보가 없습니다.</p>
            <Button
              variant="primary"
              onClick={() => setShowUploader(true)}
            >
              첫 번째 악보 업로드
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSheets.map((sheet) => (
              <SheetCard
                key={sheet.id}
                sheet={sheet}
                onSelect={handleSheetSelect}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
