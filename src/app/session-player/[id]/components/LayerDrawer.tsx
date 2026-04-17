'use client';

import React from 'react';
import { useSessionPlayerStore, SessionLayer } from '@/stores/sessionPlayerStore';
import { useAuthStore } from '@/stores/authStore';
import { DrawPath } from '@/components/DrawingCanvas';

interface LayerDrawerProps {
  sessionSongId: string;
  songFormId: string | null | undefined;
  basePaths?: DrawPath[];
  showBase?: boolean;
  onToggleBase?: () => void;
  open: boolean;
  onClose: () => void;
  isCreator?: boolean;
  isGuest?: boolean;
  onEditBase?: () => void;   // creator only: edit base layer
  onEditMine?: () => void;   // creator only: edit my session layer
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const EyeOn = () => (
  <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const EyeOff = () => (
  <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

const EditBtn = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className="flex-shrink-0 p-1 rounded hover:bg-neutral-600 text-neutral-400 hover:text-white transition-colors"
    title="수정"
  >
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  </button>
);

export function LayerDrawer({
  sessionSongId, songFormId, basePaths = [], showBase = true, onToggleBase,
  open, onClose, isCreator, isGuest, onEditBase, onEditMine,
}: LayerDrawerProps) {
  const { layers, visibleLayers, toggleLayerVisibility } = useSessionPlayerStore();
  const { currentUser } = useAuthStore();

  // 내 레이어는 session_song_id 기준, 팀원 레이어도 동일
  const relevantLayers = React.useMemo<SessionLayer[]>(() => {
    const byItem = layers.filter(
      (l) => l.session_song_id === sessionSongId ||
        (songFormId && l.song_form_id === songFormId && !l.session_song_id)
    );
    const latestByUser: Record<string, SessionLayer> = {};
    for (const l of byItem) {
      const prev = latestByUser[l.created_by];
      if (!prev || l.version_number > prev.version_number) {
        latestByUser[l.created_by] = l;
      }
    }
    return Object.values(latestByUser);
  }, [layers, sessionSongId, songFormId]);

  const myLayer = relevantLayers.find((l) => l.created_by === currentUser?.id);
  // 비게스트 팀원 레이어만 표시 (게스트 포함 누구나 볼 수 있음)
  const otherLayers = relevantLayers.filter((l) => l.created_by !== currentUser?.id && !l.is_guest);

  return (
    <>
      {open && <div className="absolute inset-0 z-20" onClick={onClose} />}

      <div
        className={`absolute top-0 right-0 h-full z-30 bg-neutral-900 border-l border-neutral-700 flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: 240 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <span className="text-sm font-semibold text-white">레이어</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">

          {/* ── 원본 레이어 ── */}
          <p className="text-[10px] text-neutral-600 font-semibold px-1 pt-1">원본 레이어</p>
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg ${basePaths.length > 0 ? 'bg-neutral-800' : 'bg-neutral-850'}`}>
            <button onClick={onToggleBase} className="flex-shrink-0">
              {showBase ? <EyeOn /> : <EyeOff />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white">원본 레이어</p>
              <p className="text-[10px] text-neutral-400">{basePaths.length}획</p>
            </div>
            {isCreator && onEditBase && (
              <EditBtn onClick={() => { onClose(); onEditBase(); }} />
            )}
          </div>

          {/* ── 내 레이어 (게스트 제외) ── */}
          {!isGuest && (
            <>
              <p className="text-[10px] text-neutral-600 font-semibold px-1 pt-2">내 레이어</p>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-neutral-800">
                {myLayer ? (
                  <>
                    <button onClick={() => toggleLayerVisibility(myLayer.id)} className="flex-shrink-0">
                      {visibleLayers[myLayer.id] !== false ? <EyeOn /> : <EyeOff />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white">나</p>
                      <p className="text-[10px] text-neutral-400 truncate">
                        {formatTime(myLayer.created_at)} · {Array.isArray(myLayer.drawing_data) ? myLayer.drawing_data.length : 0}획
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="flex-shrink-0">
                      <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-500">비어 있음</p>
                    </div>
                  </>
                )}
                {onEditMine && (
                  <EditBtn onClick={() => { onClose(); onEditMine(); }} />
                )}
              </div>
            </>
          )}

          {/* ── 팀원 레이어 ── */}
          {otherLayers.length > 0 && (
            <>
              <p className="text-[10px] text-neutral-600 font-semibold px-1 pt-2">팀원 레이어</p>
              {otherLayers.map((layer) => {
                const visible = visibleLayers[layer.id] !== false;
                const pathCount = Array.isArray(layer.drawing_data) ? layer.drawing_data.length : 0;
                return (
                  <button
                    key={layer.id}
                    onClick={() => toggleLayerVisibility(layer.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      visible ? 'bg-neutral-700 text-white' : 'bg-neutral-800 text-neutral-500'
                    }`}
                  >
                    <span className="flex-shrink-0">{visible ? <EyeOn /> : <EyeOff />}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">팀원 {layer.created_by.slice(0, 6)}</p>
                      <p className="text-[10px] text-neutral-500 truncate">
                        {formatTime(layer.created_at)} · {pathCount}획
                      </p>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </>
  );
}
