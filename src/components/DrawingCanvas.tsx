'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';

export interface DrawPath {
  id: string;
  tool: 'pen' | 'eraser';
  color: string;
  width: number;
  points: { x: number; y: number }[]; // normalized 0–1 relative to canvas size
}

interface DrawingCanvasProps {
  paths: DrawPath[];
  onPathsChange: (paths: DrawPath[]) => void;
  activeTool: 'pen' | 'eraser' | null; // null = disabled
  color: string;
  strokeWidth: number;
}

function uid() { return Math.random().toString(36).slice(2, 10); }

function renderPaths(ctx: CanvasRenderingContext2D, paths: DrawPath[], w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  for (const path of paths) {
    if (path.points.length < 2) continue;
    ctx.save();
    ctx.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = path.tool === 'eraser' ? 'rgba(0,0,0,1)' : path.color;
    ctx.lineWidth = path.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(path.points[0].x * w, path.points[0].y * h);
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x * w, path.points[i].y * h);
    }
    ctx.stroke();
    ctx.restore();
  }
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  paths, onPathsChange, activeTool, color, strokeWidth,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const currentPathRef = useRef<DrawPath | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  // Sync canvas dimensions with container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setCanvasSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize.w === 0) return;
    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;
    const ctx = canvas.getContext('2d');
    if (ctx) renderPaths(ctx, paths, canvasSize.w, canvasSize.h);
  }, [canvasSize]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize.w === 0) return;
    const ctx = canvas.getContext('2d');
    if (ctx) renderPaths(ctx, paths, canvasSize.w, canvasSize.h);
  }, [paths, canvasSize]);

  const getPoint = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }, []);

  const startDraw = useCallback((e: React.PointerEvent) => {
    // 손가락 터치는 줌/이동으로 사용 — 그리기 무시
    if (!activeTool || e.pointerType === 'touch') return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const pt = getPoint(e);
    if (!pt) return;
    currentPathRef.current = { id: uid(), tool: activeTool, color, width: strokeWidth, points: [pt] };
  }, [activeTool, color, strokeWidth, getPoint]);

  const draw = useCallback((e: React.PointerEvent) => {
    if (!drawingRef.current || !currentPathRef.current || !activeTool || e.pointerType === 'touch') return;
    e.preventDefault();
    const pt = getPoint(e);
    if (!pt) return;
    currentPathRef.current.points.push(pt);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) renderPaths(ctx, [...paths, currentPathRef.current], canvas.width, canvas.height);
  }, [activeTool, paths, getPoint]);

  const endDraw = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (!drawingRef.current || !currentPathRef.current) return;
    drawingRef.current = false;
    if (currentPathRef.current.points.length >= 2) {
      onPathsChange([...paths, currentPathRef.current]);
    }
    currentPathRef.current = null;
  }, [paths, onPathsChange]);

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ pointerEvents: activeTool ? 'auto' : 'none' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          pointerEvents: activeTool ? 'auto' : 'none',
          cursor: activeTool === 'pen' ? 'crosshair' : activeTool === 'eraser' ? 'cell' : 'default',
          touchAction: 'none', // 브라우저 기본 터치 제스처 비활성 (터치 이벤트는 부모로 버블링)
        }}
        onPointerDown={startDraw}
        onPointerMove={draw}
        onPointerUp={endDraw}
        onPointerLeave={endDraw}
      />
    </div>
  );
};
