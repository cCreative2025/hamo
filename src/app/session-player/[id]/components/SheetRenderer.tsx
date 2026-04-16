'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { SessionItem, SheetVersion } from '@/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PDFViewer } from '@/components/PDFViewer';
import { DrawPath } from '@/components/DrawingCanvas';
import { useSessionPlayerStore } from '@/stores/sessionPlayerStore';
import { SongFormBar } from './SongFormBar';
import { ReadOnlyCanvas } from './ReadOnlyCanvas';
import { LayerDrawer } from './LayerDrawer';

interface SheetRendererProps {
  currentIndex: number;
  item: SessionItem;
}

export function SheetRenderer({ currentIndex, item }: SheetRendererProps) {
  const { layers, visibleLayers } = useSessionPlayerStore();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Count unique layers for this song_form
  const songFormLayers = useMemo(
    () => layers.filter((l) => l.song_form_id === item.song_form_id),
    [layers, item.song_form_id]
  );

  // Base layer: song_form.drawing_data (saved outside session)
  const basePaths = useMemo<DrawPath[]>(
    () => (item.song_form?.drawing_data as DrawPath[] | undefined) ?? [],
    [item.song_form]
  );

  // Merge base + all visible session layers
  const mergedPaths = useMemo<DrawPath[]>(() => {
    const sessionPaths = songFormLayers
      .filter((l) => visibleLayers[l.id] !== false)
      .flatMap((l) => (l.drawing_data as DrawPath[]) ?? []);
    return [...basePaths, ...sessionPaths];
  }, [basePaths, songFormLayers, visibleLayers]);

  useEffect(() => {
    const loadSignedUrl = async () => {
      setIsLoading(true);
      setError(null);
      setSignedUrl(null);

      try {
        const sheet = item.sheet;
        if (!sheet) {
          setError(`[1] sheet null — sheet_id: ${item.sheet_id ?? 'none'}`);
          return;
        }

        const versions = (sheet.sheet_versions ?? [])
          .slice()
          .sort((a, b) => b.version_number - a.version_number);
        const activeVersion: SheetVersion | undefined = versions[0];

        if (!activeVersion) {
          setError(`[2] sheet_versions 없음 — sheet.id: ${sheet.id}`);
          return;
        }

        const res = await fetch(`/api/signed-url?path=${encodeURIComponent(activeVersion.file_path)}`);
        const json = await res.json();

        if (!res.ok || !json.signedUrl) throw new Error(json.error ?? '서명된 URL을 생성할 수 없습니다');

        setSignedUrl(json.signedUrl);
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
      <div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
        <LoadingSpinner text="악보를 불러오는 중..." />
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-neutral-600 dark:text-neutral-400 font-medium mb-2">
            {error || '악보를 로드할 수 없습니다'}
          </p>
          <p className="text-xs text-neutral-500">파일이 삭제되었거나 접근 권한이 없을 수 있습니다</p>
        </div>
      </div>
    );
  }

  const layerOverlay = mergedPaths.length > 0 ? (
    <ReadOnlyCanvas paths={mergedPaths} />
  ) : null;

  return (
    <div className="w-full h-full flex flex-col bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
      {/* 송폼 진행 바 */}
      {item.song_form && (
        <SongFormBar
          form={item.song_form}
          layerCount={songFormLayers.length}
          onLayerOpen={() => setDrawerOpen(true)}
        />
      )}

      {/* 악보 + 레이어 드로어 */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {fileType === 'pdf' ? (
          <PDFViewer fileUrl={signedUrl} canvasOverlay={layerOverlay} />
        ) : (
          <div className="w-full h-full flex items-center justify-center overflow-hidden p-2">
            <div className="relative inline-block">
              <img
                key={currentIndex}
                src={signedUrl}
                alt="악보"
                style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }}
                className="shadow-lg"
              />
              {layerOverlay && (
                <div className="absolute inset-0 pointer-events-none">
                  {layerOverlay}
                </div>
              )}
            </div>
          </div>
        )}

        {item.song_form_id && (
          <LayerDrawer
            songFormId={item.song_form_id}
            basePaths={basePaths}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
