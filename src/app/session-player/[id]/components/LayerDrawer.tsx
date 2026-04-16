'use client';

import React from 'react';
import { useSessionPlayerStore, SessionLayer } from '@/stores/sessionPlayerStore';
import { useAuthStore } from '@/stores/authStore';

interface LayerDrawerProps {
  songFormId: string;
  open: boolean;
  onClose: () => void;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function LayerDrawer({ songFormId, open, onClose }: LayerDrawerProps) {
  const { layers, visibleLayers, toggleLayerVisibility } = useSessionPlayerStore();
  const { currentUser } = useAuthStore();

  // Only layers for this song form, latest version per creator
  const relevantLayers = React.useMemo<SessionLayer[]>(() => {
    const byForm = layers.filter((l) => l.song_form_id === songFormId);
    // Keep latest version per created_by
    const latestByUser: Record<string, SessionLayer> = {};
    for (const l of byForm) {
      const prev = latestByUser[l.created_by];
      if (!prev || l.version_number > prev.version_number) {
        latestByUser[l.created_by] = l;
      }
    }
    return Object.values(latestByUser);
  }, [layers, songFormId]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="absolute inset-0 z-20"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div
        className={`absolute top-0 right-0 h-full z-30 bg-neutral-900 border-l border-neutral-700 flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: 240 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <span className="text-sm font-semibold text-white">레이어</span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Layer list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {relevantLayers.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-8">
              저장된 레이어가 없습니다
            </p>
          ) : (
            relevantLayers.map((layer) => {
              const isMe = layer.created_by === currentUser?.id;
              const visible = visibleLayers[layer.id] !== false;
              const pathCount = Array.isArray(layer.drawing_data) ? layer.drawing_data.length : 0;

              return (
                <button
                  key={layer.id}
                  onClick={() => toggleLayerVisibility(layer.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    visible
                      ? 'bg-neutral-700 text-white'
                      : 'bg-neutral-800 text-neutral-500'
                  }`}
                >
                  {/* Eye icon */}
                  <span className="flex-shrink-0">
                    {visible ? (
                      <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {isMe ? '나' : `팀원 ${layer.created_by.slice(0, 6)}`}
                      {layer.version_number > 1 && (
                        <span className="ml-1 text-[10px] text-neutral-500">v{layer.version_number}</span>
                      )}
                    </p>
                    <p className="text-[10px] text-neutral-500 truncate">
                      {formatTime(layer.created_at)} · {pathCount}획
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
