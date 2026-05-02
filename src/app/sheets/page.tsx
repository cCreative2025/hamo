'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
import { getKoreanInitial } from '@/lib/utils';

export default function SheetsPage() {
  useAuth(true);

  const { currentUser } = useAuthStore();
  const {
    filteredSheets,
    isLoading,
    filters,
    loadSheets,
    setFilters,
    selectSheet,
    addSongForm,
  } = useSheetStore();

  const [showUploader, setShowUploader] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (currentUser?.id) loadSheets(undefined, currentUser.id);
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setFilters({ ...filters, searchText: searchTerm });
  }, [searchTerm]);

  const handleSheetSelect = (sheet: Sheet) => {
    selectSheet(sheet);
  };

  // 초성 그룹핑
  const grouped = useMemo(() => {
    const map: Record<string, Sheet[]> = {};
    [...filteredSheets]
      .sort((a, b) => a.title.localeCompare(b.title, 'ko'))
      .forEach((sheet) => {
        const initial = getKoreanInitial(sheet.title);
        if (!map[initial]) map[initial] = [];
        map[initial].push(sheet);
      });
    return map;
  }, [filteredSheets]);

  const groupKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'ko'));

  return (
    <MainLayout title="악보 관리">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="type-h1 text-neutral-900">악보 관리</h1>
          <Button
            variant={showUploader ? 'secondary' : 'primary'}
            onClick={() => { setShowUploader(!showUploader); setUploadError(null); }}
          >
            {showUploader ? '숨기기' : '악보 업로드'}
          </Button>
        </div>

        {/* Uploader */}
        {showUploader && (
          <div className="mb-8">
            {uploadError && (
              <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-xl text-sm text-error-700">
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
                  // 1. Storage 업로드 — sanitize path (no user-supplied filename).
                  const ALLOWED_EXT: Record<string, string> = {
                    'application/pdf': 'pdf',
                    'image/png': 'png',
                    'image/jpeg': 'jpg',
                    'image/jpg': 'jpg',
                    'image/webp': 'webp',
                  };
                  const ext = ALLOWED_EXT[file.type];
                  if (!ext) {
                    throw new Error('지원하지 않는 파일 형식입니다 (PDF/PNG/JPG/WEBP만 가능)');
                  }
                  const safeId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
                  const filePath = `${currentUser.id}/${safeId}.${ext}`;
                  const { error: storageError } = await supabase.storage
                    .from('sheets')
                    .upload(filePath, file, { upsert: false, contentType: file.type });
                  if (storageError) throw new Error(`파일 업로드 실패: ${storageError.message}`);

                  // 2. sheets 저장
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

                  // 3. sheet_versions 저장
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

                  // 4. 송폼 저장 (입력된 경우)
                  if (data.songForm?.name?.trim()) {
                    await supabase.from('song_forms').insert({
                      sheet_id: sheetData.id,
                      name: data.songForm.name,
                      key: data.songForm.key || null,
                      sections: data.songForm.sections ?? [],
                      flow: data.songForm.flow ?? [],
                      memo: data.songForm.memo || null,
                      created_by: currentUser.id,
                    });
                  }

                  await loadSheets(undefined, currentUser.id);
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

        {/* Search */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-8">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="악보 제목, 아티스트로 검색..."
            className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner text="악보 로딩 중..." />
          </div>
        ) : filteredSheets.length === 0 ? (
          <div className="text-center py-12 bg-neutral-50 rounded-xl border border-neutral-200">
            <p className="text-neutral-600 mb-4">아직 악보가 없습니다.</p>
            <Button variant="primary" onClick={() => setShowUploader(true)}>
              첫 번째 악보 업로드
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {groupKeys.map((initial) => (
              <section key={initial}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="type-h1 text-primary-500">{initial}</span>
                  <div className="flex-1 h-px bg-neutral-200" />
                  <span className="text-xs text-neutral-400">{grouped[initial].length}곡</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {grouped[initial].map((sheet) => (
                    <SheetCard
                      key={sheet.id}
                      sheet={sheet}
                      onSelect={handleSheetSelect}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
