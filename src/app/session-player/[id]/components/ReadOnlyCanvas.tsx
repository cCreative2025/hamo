'use client';

import React, { useRef, useEffect } from 'react';
import { DrawPath } from '@/components/DrawingCanvas';

interface ReadOnlyCanvasProps {
  paths: DrawPath[];
}

function renderPaths(ctx: CanvasRenderingContext2D, paths: DrawPath[], w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  for (const path of paths) {
    if (path.points.length < 2) continue;
    ctx.save();
    ctx.globalCompositeOperation =
      path.tool === 'eraser' ? 'destination-out' : 'source-over';
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

export function ReadOnlyCanvas({ paths }: ReadOnlyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const redraw = () => {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) renderPaths(ctx, paths, canvas.width, canvas.height);
    };

    const ro = new ResizeObserver(redraw);
    ro.observe(container);
    redraw();
    return () => ro.disconnect();
  }, [paths]);

  if (paths.length === 0) return null;

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
