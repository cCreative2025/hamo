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
import { supabase } from '@/lib/supabase';

export default function SheetsPage() {
  useAuth(true);

  const { currentUser } = useAuthStore();
  const {
    sheets,
    filteredSheets,
    isLoading,
    filters,
    loadSheets,
    setFilters,
    selectSheet,
  } = useSheetStore();

  const [showUploader, setShowUploader] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadSheets();
    }
  }, [currentUser, loadSheets]);

  useEffect(() => {
    setFilters({ ...filters, searchText: searchTerm });
  }, [searchTerm]);

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
            {uploadError && (
              <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg text-sm text-error-700">
                {uploadError}
              </div>
            )}
            <SheetUploader
              isLoading={isUploading}
              onUpload={async (file, data) => {
                if (!currentUser) throw new Error('로그인이 필요합니다');
                setUploadError(null);
                setIsUploading(true);
                try {
                  // 1. Storage에 파일 업로드
                  const ext = file.name.split('.').pop();
                  const filePath = `${currentUser.id}/${Date.now()}.${ext}`;
                  const { error: storageError } = await supabase.storage
                    .from('sheets')
                    .upload(filePath, file, { upsert: false });
                  if (storageError) throw new Error(`파일 업로드 실패: ${storageError.message}`);

                  // 2. sheets 테이블에 메타데이터 저장
                  const { data: sheetData, error: sheetError } = await supabase
                    .from('sheets')
                    .insert({
                      title: data.title,
                      artist: data.artist,
                      genre: data.genre,
                      key: data.key,
                      tempo: data.tempo,
                      time_signature: data.time_signature,
                      owner_id: currentUser.id,
                    })
                    .select()
                    .single();
                  if (sheetError) throw new Error(`악보 저장 실패: ${sheetError.message}`);

                  // 3. sheet_versions에 파일 정보 저장
                  const fileType = file.type === 'application/pdf' ? 'pdf' : 'image';
                  const { error: versionError } = await supabase
                    .from('sheet_versions')
                    .insert({
                      sheet_id: sheetData.id,
                      version_number: 1,
                      file_path: filePath,
                      file_type: fileType,
                      file_size: file.size,
                      uploaded_by: currentUser.id,
                    });
                  if (versionError) throw new Error(`버전 저장 실패: ${versionError.message}`);

                  await loadSheets();
                  setShowUploader(false);
                } catch (err) {
                  setUploadError(err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다');
                  throw err;
                } finally {
                  setIsUploading(false);
                }
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
              className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
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
