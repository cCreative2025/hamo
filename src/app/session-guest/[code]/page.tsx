'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Stage, Layer, Rect } from 'react-konva';
import { useAuthStore } from '@/stores/authStore';
import { useDrawingStore } from '@/stores/drawingStore';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/Button';

export default function GuestSessionPage() {
  const params = useParams();
  const code = params.code as string;

  const { currentUser } = useAuthStore();
  const { localShapes: shapes } = useDrawingStore();

  const stageRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  useEffect(() => {
    const loadGuestSession = async () => {
      try {
        setIsLoading(true);
        // TODO: Load guest session data from Supabase
        // const { data } = await supabase
        //   .from('guest_sessions')
        //   .select('*, sessions(*)')
        //   .eq('code', code)
        //   .single();

        setSessionData({
          title: 'Guest Session',
          currentSong: 'Sample Song',
          participants: [],
        });
      } catch (error) {
        console.error('Failed to load guest session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadGuestSession();
  }, [code]);

  if (isLoading || !sessionData) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-neutral-900">
        <LoadingSpinner text="세션 로딩 중..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-900">
      {/* Header */}
      <div className="bg-neutral-800 border-b border-neutral-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-xl">{sessionData.title}</h1>
            <p className="text-neutral-400 text-sm">Guest Mode (읽기 전용)</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sheet Display */}
        <div className="flex-1 bg-neutral-900 relative flex items-center justify-center">
          <div className="text-center">
            <p className="text-white text-xl font-semibold mb-2">
              {sessionData.currentSong}
            </p>
            <p className="text-neutral-400 text-sm">
              악보 렌더링 (읽기 전용 모드)
            </p>
          </div>

          {/* Konva Canvas Overlay (Read-only) */}
          <div className="absolute inset-0 pointer-events-none">
            <Stage
              ref={stageRef}
              width={typeof window !== 'undefined' ? window.innerWidth * 0.7 : 800}
              height={typeof window !== 'undefined' ? window.innerHeight - 200 : 600}
            >
              <Layer>
                {shapes.map((shape, idx) => (
                  <Rect
                    key={idx}
                    x={shape.x}
                    y={shape.y}
                    width={shape.width}
                    height={shape.height}
                    fill={shape.color}
                  />
                ))}
              </Layer>
            </Stage>
          </div>
        </div>

        {/* Participants Sidebar */}
        <div className="w-80 bg-neutral-800 border-l border-neutral-700 flex flex-col">
          <div className="p-4 border-b border-neutral-700">
            <h2 className="text-white font-semibold mb-2">참여자</h2>
            <p className="text-xs text-neutral-400">
              {sessionData.participants.length}명 참여 중
            </p>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-2">
            {sessionData.participants.map((participant: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-2 rounded bg-neutral-700"
              >
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {participant.name?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <p className="text-white text-sm font-medium">{participant.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div className="bg-neutral-800 border-t border-neutral-700 p-4 text-center text-neutral-400 text-sm">
        <p>Guest 모드에서는 악보 편집이 불가능합니다. (읽기 전용)</p>
      </div>
    </div>
  );
}
