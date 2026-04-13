'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Stage, Layer, Rect, Text } from 'react-konva';
import { useSessionStore } from '@/stores/sessionStore';
import { useParticipantStore } from '@/stores/participantStore';
import { useDrawingStore } from '@/stores/drawingStore';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function SessionPlayerPage() {
  useAuth(true);

  const params = useParams();
  const sessionId = params.id as string;

  const { currentUser } = useAuthStore();
  const {
    currentSession,
    setlist,
    currentSongIndex,
    currentTempo,
    loadSession,
    goToNextSong,
    goToPreviousSong,
    updateTempo,
    endSession,
  } = useSessionStore();

  const { participants, joinSession, leaveSession } = useParticipantStore();
  const { shapes, addShape, undo, redo, clearLocalShapes } = useDrawingStore();

  const stageRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showDrawingTools, setShowDrawingTools] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [selectedTool, setSelectedTool] = useState<'pen' | 'eraser'>('pen');

  useEffect(() => {
    loadSession(sessionId);
  }, [sessionId, loadSession]);

  useEffect(() => {
    if (currentSession && currentUser) {
      joinSession(sessionId, currentUser.id);
    }

    return () => {
      if (currentUser) {
        leaveSession(sessionId, currentUser.id);
      }
    };
  }, [currentSession, currentUser, sessionId, joinSession, leaveSession]);

  if (!currentSession) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-neutral-900">
        <LoadingSpinner text="세션 로딩 중..." />
      </div>
    );
  }

  const currentSong = setlist[currentSongIndex];

  return (
    <div className="flex flex-col h-screen bg-neutral-900">
      {/* Header */}
      <div className="bg-neutral-800 border-b border-neutral-700 p-4">
        <div className="flex items-center justify-between max-w-full">
          <div>
            <h1 className="text-white font-bold text-xl">{currentSession.title}</h1>
            {currentSong && (
              <p className="text-neutral-400 text-sm">
                {currentSong.title} - {currentSong.artist}
              </p>
            )}
          </div>

          {/* Tempo Display */}
          <div className="flex items-center gap-4">
            <div className="text-white text-center">
              <p className="text-xs text-neutral-400">현재 템포</p>
              <p className="text-2xl font-bold">{currentTempo} BPM</p>
            </div>

            {/* Tempo Controls */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => updateTempo(Math.max(40, currentTempo - 5))}
              >
                -5
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => updateTempo(Math.min(240, currentTempo + 5))}
              >
                +5
              </Button>
            </div>
          </div>

          {/* End Session */}
          <Button
            variant="danger"
            size="sm"
            onClick={async () => {
              await endSession();
              // 세션 목록으로 이동
            }}
          >
            세션 종료
          </Button>
        </div>
      </div>

      {/* Main Player */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sheet Display (Canvas) */}
        <div className="flex-1 bg-neutral-900 relative">
          {/* Placeholder: PDF/Image Viewer */}
          <div className="w-full h-full flex items-center justify-center bg-neutral-800">
            {currentSong ? (
              <div className="text-center">
                <p className="text-white text-xl font-semibold mb-2">{currentSong.title}</p>
                <p className="text-neutral-400 text-sm">
                  악보 렌더링 (Step 11: PDF.js 구현 예정)
                </p>
              </div>
            ) : (
              <p className="text-neutral-500">선택된 곡이 없습니다</p>
            )}
          </div>

          {/* Konva Canvas Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <Stage
              ref={stageRef}
              width={typeof window !== 'undefined' ? window.innerWidth * 0.7 : 800}
              height={typeof window !== 'undefined' ? window.innerHeight - 200 : 600}
            >
              <Layer>
                {/* Render shapes from store */}
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

        {/* Right Sidebar */}
        <div className="w-80 bg-neutral-800 border-l border-neutral-700 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex gap-0 border-b border-neutral-700">
            <button
              onClick={() => setShowDrawingTools(!showDrawingTools)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                showDrawingTools
                  ? 'text-primary-400 border-b-2 border-primary-400'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              도구
            </button>
            <button
              className="flex-1 px-4 py-3 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
            >
              참여자
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto">
            {showDrawingTools ? (
              // Drawing Tools
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-neutral-300 text-sm font-medium mb-2">도구</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={selectedTool === 'pen' ? 'primary' : 'secondary'}
                      onClick={() => setSelectedTool('pen')}
                      fullWidth
                    >
                      펜
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedTool === 'eraser' ? 'primary' : 'secondary'}
                      onClick={() => setSelectedTool('eraser')}
                      fullWidth
                    >
                      지우개
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-neutral-300 text-sm font-medium mb-2">색상</p>
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={undo}
                    fullWidth
                  >
                    실행 취소
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={redo}
                    fullWidth
                  >
                    다시 실행
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="danger"
                  onClick={clearLocalShapes}
                  fullWidth
                >
                  전체 삭제
                </Button>
              </div>
            ) : (
              // Participants List
              <div className="p-4 space-y-2">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-3 p-2 rounded bg-neutral-700"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">
                        {participant.user_id?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">
                        {participant.guest_name || 'Guest'}
                      </p>
                      <p className="text-neutral-400 text-xs">
                        {participant.status === 'active' ? '온라인' : '오프라인'}
                      </p>
                    </div>
                    <div
                      className={`w-3 h-3 rounded-full ${
                        participant.status === 'active'
                          ? 'bg-green-500'
                          : 'bg-neutral-600'
                      }`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="bg-neutral-800 border-t border-neutral-700 p-4">
        <div className="flex items-center justify-between">
          {/* Song Navigation */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={goToPreviousSong}
              disabled={currentSongIndex === 0}
            >
              이전 곡
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={goToNextSong}
              disabled={currentSongIndex === setlist.length - 1}
            >
              다음 곡
            </Button>
          </div>

          {/* Play/Pause */}
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? '일시정지' : '재생'}
          </Button>

          {/* Song Position */}
          <div className="text-white text-sm">
            곡 {currentSongIndex + 1} / {setlist.length}
          </div>
        </div>
      </div>
    </div>
  );
}
