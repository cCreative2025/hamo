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

  // iOS Safari는 touch-action: none을 지원하지 않음 →
  // touchstart/touchmove에 passive: false + preventDefault() 직접 등록
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prevent = (e: TouchEvent) => e.preventDefault();
    canvas.addEventListener('touchstart', prevent, { passive: false });
    canvas.addEventListener('touchmove', prevent, { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', prevent);
      canvas.removeEventListener('touchmove', prevent);
    };
  }, []);

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
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.w * dpr;
    canvas.height = canvasSize.h * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      renderPaths(ctx, paths, canvasSize.w, canvasSize.h);
    }
  }, [canvasSize]); // eslint-disable-line react-hooks/exhaustive-deps

  // paths prop 바뀔 때 (undo/redo/외부 변경) 전체 재렌더
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize.w === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderPaths(ctx, paths, canvasSize.w, canvasSize.h);
    }
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
    // CSS 픽셀 기준 좌표 (DPR scale transform이 적용돼 있으므로)
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    ctx.save();
    ctx.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = path.tool === 'eraser' ? 'rgba(0,0,0,1)' : path.color;
    ctx.lineWidth = path.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(prev.x * cssW, prev.y * cssH);
    ctx.lineTo(pt.x * cssW, pt.y * cssH);
    ctx.stroke();
    ctx.restore();
  }, [activeTool, getPoint]);

  const endDraw = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (!drawingRef.current || !currentPathRef.current) return;
    drawingRef.current = false;
    prevPointRef.current = null;
    if (currentPathRef.current.points.length >= 2) {
      const newPaths = [...pathsRef.current, currentPathRef.current];
      pathsRef.current = newPaths; // prop 업데이트 전에 즉시 반영 → 다음 획도 누적됨
      onPathsChange(newPaths);
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
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        } as React.CSSProperties}
        onPointerDown={startDraw}
        onPointerMove={draw}
        onPointerUp={endDraw}
        onPointerLeave={endDraw}
      />
    </div>
  );
};
