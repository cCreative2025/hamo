'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { LoadingSpinner } from './LoadingSpinner';
import { Button } from './Button';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface PDFViewerProps {
  fileUrl: string;
  maxPages?: number;
  onPageChange?: (page: number) => void;
  canvasOverlay?: React.ReactNode;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  fileUrl,
  maxPages = 20,
  onPageChange,
  canvasOverlay,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void; promise: Promise<unknown> } | null>(null);
  const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null);

  // Track container size with ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    // Initial size
    const { width, height } = el.getBoundingClientRect();
    if (width > 0 && height > 0) setContainerSize({ w: width, h: height });
    return () => ro.disconnect();
  }, []);

  // Load PDF
  useEffect(() => {
    let active = true;
    const loadingTask = pdfjs.getDocument(fileUrl);
    let pdfDoc: pdfjs.PDFDocumentProxy | null = null;

    setIsLoading(true);
    setError(null);

    loadingTask.promise
      .then((doc) => {
        if (!active) {
          doc.destroy();
          return;
        }
        pdfDoc = doc;
        setPdf(doc);
        setTotalPages(Math.min(doc.numPages, maxPages));
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'PDF 로딩 실패');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      // Cancel any in-flight render before destroying the doc.
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch { /* ignore */ }
        renderTaskRef.current = null;
      }
      if (pdfDoc) {
        pdfDoc.destroy();
      } else {
        // Loading task was still in progress.
        loadingTask.destroy();
      }
    };
  }, [fileUrl, maxPages]);

  // Render page — re-runs when pdf, page, or container size changes
  const renderPage = useCallback(async () => {
    if (!pdf || !canvasRef.current || !containerSize) return;

    try {
      // Cancel previous render before starting a new one.
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch { /* ignore */ }
        renderTaskRef.current = null;
      }

      const pdfPage = await pdf.getPage(page);
      const PADDING = 16; // px padding on each side
      const availW = containerSize.w - PADDING * 2;
      const availH = containerSize.h - PADDING * 2;

      // Get native page size at scale=1
      const nativeViewport = pdfPage.getViewport({ scale: 1 });
      const fitScale = Math.min(availW / nativeViewport.width, availH / nativeViewport.height);
      const dpr = window.devicePixelRatio || 1;
      const renderScale = fitScale * dpr;

      const viewport = pdfPage.getViewport({ scale: renderScale });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      // Canvas pixel size
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      // CSS display size (1x)
      canvas.style.width = `${fitScale * nativeViewport.width}px`;
      canvas.style.height = `${fitScale * nativeViewport.height}px`;

      const task = pdfPage.render({ canvasContext: context, viewport });
      renderTaskRef.current = task;
      try {
        await task.promise;
      } finally {
        if (renderTaskRef.current === task) renderTaskRef.current = null;
      }
    } catch (err: unknown) {
      // Cancelled renders throw RenderingCancelledException — ignore.
      const name = (err as { name?: string })?.name;
      if (name !== 'RenderingCancelledException') {
        console.error('페이지 렌더링 실패:', err);
      }
    }
  }, [pdf, page, containerSize]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Notify parent of page change
  useEffect(() => {
    onPageChange?.(page);
  }, [page, onPageChange]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-red-600 font-medium mb-2">PDF 로딩 실패</p>
        <p className="text-sm text-neutral-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-neutral-100 border-b border-neutral-200 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            이전
          </Button>
          <span className="text-sm font-medium text-neutral-700">
            {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            다음
          </Button>
        </div>

        <div className="text-xs text-neutral-600">
          {maxPages < totalPages && `최대 ${maxPages}페이지 표시`}
        </div>
      </div>

      {/* PDF Canvas */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-hidden bg-neutral-50 flex items-center justify-center"
      >
        {isLoading ? (
          <LoadingSpinner text="PDF 렌더링 중..." />
        ) : (
          /* Wrapper sized to canvas so overlay aligns exactly */
          <div className="relative inline-block shadow-lg flex-shrink-0">
            <canvas ref={canvasRef} style={{ display: 'block' }} />
            {canvasOverlay && (
              <div className="absolute inset-0 pointer-events-none">
                {canvasOverlay}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
