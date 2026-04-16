'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { SessionItem, SheetVersion } from '@/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PDFViewer } from '@/components/PDFViewer';
import { DrawPath } from '@/components/DrawingCanvas';
import { useSessionPlayerStore } from '@/stores/sessionPlayerStore';
import { SongFormBar } from './SongFormBar';
import { ReadOnlyCanvas } from './ReadOnlyCanvas';
import { LayerDrawer } from './LayerDrawer';
import { NavOverlay, NavProps } from './SessionPlayerMain';

interface SheetRendererProps {
  currentIndex: number;
  item: SessionItem;
  navProps?: NavProps;
}

export function SheetRenderer({ currentIndex, item, navProps }: SheetRendererProps) {
  const { layers, visibleLayers } = useSessionPlayerStore();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showBase, setShowBase] = useState(true);

  // Image contain-fit sizing
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const [imgDisplaySize, setImgDisplaySize] = useState<{ w: number; h: number } | null>(null);
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null);

  // Track image container size
  useEffect(() => {
    const el = imgContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) setContainerSize({ w: rect.width, h: rect.height });
    return () => ro.disconnect();
  }, [signedUrl]); // re-attach when URL changes (image mounts)

  // Recalculate display size when container or natural dimensions change
  useEffect(() => {
    if (!imgNatural || !containerSize) return;
    const PADDING = 16;
    const availW = containerSize.w - PADDING * 2;
    const availH = containerSize.h - PADDING * 2;
    const scale = Math.min(availW / imgNatural.w, availH / imgNatural.h);
    setImgDisplaySize({ w: Math.round(imgNatural.w * scale), h: Math.round(imgNatural.h * scale) });
  }, [imgNatural, containerSize]);

  const onImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

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
    return [...(showBase ? basePaths : []), ...sessionPaths];
  }, [basePaths, showBase, songFormLayers, visibleLayers]);

  useEffect(() => {
    const loadSignedUrl = async () => {
      setIsLoading(true);
      setError(null);
      setSignedUrl(null);
      setImgNatural(null);
      setImgDisplaySize(null);

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
      {/* 송폼 진행 바 — 항상 표시 */}
      <SongFormBar
        form={item.song_form ?? null}
        layerCount={songFormLayers.length}
        onLayerOpen={() => setDrawerOpen(true)}
      />

      {/* 악보 + 레이어 드로어 + 좌우 nav (SongFormBar 아래에만) */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {fileType === 'pdf' ? (
          <PDFViewer fileUrl={signedUrl} canvasOverlay={layerOverlay} />
        ) : (
          <div
            ref={imgContainerRef}
            className="w-full h-full flex items-center justify-center overflow-hidden"
          >
            <div
              className="relative shadow-lg flex-shrink-0"
              style={imgDisplaySize
                ? { width: imgDisplaySize.w, height: imgDisplaySize.h }
                : { maxWidth: 'calc(100% - 32px)', maxHeight: 'calc(100% - 32px)' }
              }
            >
              <img
                key={currentIndex}
                src={signedUrl}
                alt="악보"
                onLoad={onImgLoad}
                style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
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
            showBase={showBase}
            onToggleBase={() => setShowBase((v) => !v)}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
          />
        )}
        {navProps && <NavOverlay {...navProps} />}
      </div>
    </div>
  );
}
