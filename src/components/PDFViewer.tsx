'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load PDF
  useEffect(() => {
    const loadPDF = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const loadingTask = pdfjs.getDocument(fileUrl);
        const pdfDoc = await loadingTask.promise;

        setPdf(pdfDoc);
        setTotalPages(Math.min(pdfDoc.numPages, maxPages));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'PDF 로딩 실패');
      } finally {
        setIsLoading(false);
      }
    };

    loadPDF();
  }, [fileUrl, maxPages]);

  // Render page
  useEffect(() => {
    const renderPage = async () => {
      if (!pdf || !canvasRef.current) return;

      try {
        const pdfPage = await pdf.getPage(page);
        const scale = 2;
        const viewport = pdfPage.getViewport({ scale });

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await pdfPage.render(renderContext).promise;
      } catch (err) {
        console.error('페이지 렌더링 실패:', err);
      }
    };

    renderPage();
  }, [pdf, page]);

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
      <div className="flex-1 min-h-0 overflow-hidden bg-neutral-50 flex items-center justify-center p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full w-full">
            <LoadingSpinner text="PDF 렌더링 중..." />
          </div>
        ) : (
          <div className="relative flex items-center justify-center w-full h-full">
            <canvas
              ref={canvasRef}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
              className="shadow-lg"
            />
            {canvasOverlay}
          </div>
        )}
      </div>
    </div>
  );
};
