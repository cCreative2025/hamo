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
  activeTool: 'pen' | 'eraser' | null;
  color: string;
  strokeWidth: number;
  onPencilDoubleTap?: () => void; // Apple Pencil 2 더블탭
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
  paths, onPathsChange, activeTool, color, strokeWidth, onPencilDoubleTap,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const currentPathRef = useRef<DrawPath | null>(null);
  const prevPointRef = useRef<{ x: number; y: number } | null>(null);
  const pathsRef = useRef<DrawPath[]>(paths); // 항상 최신 paths (re-render 안 기다림)
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  // pathsRef를 props와 동기화
  useEffect(() => { pathsRef.current = paths; }, [paths]);

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

  // paths prop 바뀔 때 (undo/redo/외부 변경) 전체 재렌더
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
    if (!activeTool || e.pointerType === 'touch') return;
    // Apple Pencil 2 더블탭: button === 5 (배럴 버튼)
    if (e.pointerType === 'pen' && e.button === 5) {
      onPencilDoubleTap?.();
      return;
    }
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const pt = getPoint(e);
    if (!pt) return;
    currentPathRef.current = { id: uid(), tool: activeTool, color, width: strokeWidth, points: [pt] };
    prevPointRef.current = pt;
  }, [activeTool, color, strokeWidth, getPoint, onPencilDoubleTap]);

  const draw = useCallback((e: React.PointerEvent) => {
    if (!drawingRef.current || !currentPathRef.current || !activeTool || e.pointerType === 'touch') return;
    e.preventDefault();
    const pt = getPoint(e);
    if (!pt) return;
    const prev = prevPointRef.current;
    currentPathRef.current.points.push(pt);
    prevPointRef.current = pt;

    // 새 선분만 증분 렌더링 (전체 재렌더 X)
    const canvas = canvasRef.current;
    if (!canvas || !prev) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const path = currentPathRef.current;
    ctx.save();
    ctx.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = path.tool === 'eraser' ? 'rgba(0,0,0,1)' : path.color;
    ctx.lineWidth = path.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(prev.x * canvas.width, prev.y * canvas.height);
    ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
    ctx.stroke();
    ctx.restore();
  }, [activeTool, getPoint]);

  const endDraw = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (!drawingRef.current || !currentPathRef.current) return;
    drawingRef.current = false;
    prevPointRef.current = null;
    if (currentPathRef.current.points.length >= 2) {
      // pathsRef 사용 → re-render 기다리지 않고 즉시 최신 paths 참조
      onPathsChange([...pathsRef.current, currentPathRef.current]);
    }
    currentPathRef.current = null;
  }, [onPathsChange]);

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ pointerEvents: activeTool ? 'auto' : 'none' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          pointerEvents: activeTool ? 'auto' : 'none',
          cursor: activeTool === 'pen' ? 'crosshair' : activeTool === 'eraser' ? 'cell' : 'default',
          touchAction: 'none',
        }}
        onPointerDown={startDraw}
        onPointerMove={draw}
        onPointerUp={endDraw}
        onPointerCancel={endDraw}
      />
    </div>
  );
};
