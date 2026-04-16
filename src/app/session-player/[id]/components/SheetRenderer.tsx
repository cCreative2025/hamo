'use client';

import React, { useState, useEffect } from 'react';
import { SessionItem, SheetVersion } from '@/types';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PDFViewer } from '@/components/PDFViewer';

interface SheetRendererProps {
  currentIndex: number;
  item: SessionItem;
}

export function SheetRenderer({ currentIndex, item }: SheetRendererProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSignedUrl = async () => {
      setIsLoading(true);
      setError(null);
      setSignedUrl(null);

      try {
        // Get active sheet version from joined data
        const sheet = item.sheet;
        if (!sheet) {
          setError('악보 정보가 없습니다');
          return;
        }

        const versions = (sheet.sheet_versions ?? [])
          .slice()
          .sort((a, b) => b.version_number - a.version_number);
        const activeVersion: SheetVersion | undefined = versions[0];

        if (!activeVersion) {
          setError('악보 파일이 없습니다');
          return;
        }

        const { data, error: urlError } = await supabase.storage
          .from('sheets')
          .createSignedUrl(activeVersion.file_path, 3600);

        if (urlError) throw new Error(urlError.message);
        if (!data?.signedUrl) throw new Error('서명된 URL을 생성할 수 없습니다');

        setSignedUrl(data.signedUrl);
        setFileType(activeVersion.file_type);
      } catch (err) {
        const message = err instanceof Error ? err.message : '악보를 불러올 수 없습니다';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadSignedUrl();
  }, [item.id, item.sheet]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
        <LoadingSpinner text="악보를 불러오는 중..." />
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
        <div className="text-center">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-neutral-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-neutral-600 dark:text-neutral-400 font-medium mb-2">
            {error || '악보를 로드할 수 없습니다'}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            파일이 삭제되었거나 접근 권한이 없을 수 있습니다
          </p>
        </div>
      </div>
    );
  }

  if (fileType === 'pdf') {
    return (
      <div className="flex-1 bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
        <PDFViewer fileUrl={signedUrl} />
      </div>
    );
  }

  // Image type
  return (
    <div className="flex-1 bg-neutral-100 dark:bg-neutral-800 overflow-auto flex items-center justify-center p-4">
      <img
        key={currentIndex}
        src={signedUrl}
        alt="악보"
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}
