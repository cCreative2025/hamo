'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface SessionInfo {
  name: string;
  status: string;
}

interface SetlistItem {
  id: string;
  type: 'song' | 'ment';
  sequence_order: number;
  ment_text?: string;
  sheet?: { title: string; artist?: string };
  song_form?: { name: string; key?: string };
}

export default function GuestSessionPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [items, setItems] = useState<SetlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Single SECURITY DEFINER RPC returns { session, items, layers }.
        const { data: bundle, error: rpcError } = await supabase
          .rpc('guest_load_session_bundle', { p_code: code });

        if (rpcError || !bundle || typeof bundle !== 'object') {
          setError('유효하지 않은 또는 만료된 게스트 코드입니다.');
          return;
        }

        const typed = bundle as {
          session: { id: string; name: string; status: string } | null;
          items: SetlistItem[] | null;
        };

        if (!typed.session) {
          setError('세션을 찾을 수 없습니다.');
          return;
        }

        setSessionId(typed.session.id);
        setSession({ name: typed.session.name, status: typed.session.status });

        // Extract top-level song_form from the nested sheet payload.
        const normalized: SetlistItem[] = (typed.items ?? []).map((raw) => {
          const r = raw as SetlistItem & {
            song_form_id?: string;
            sheet?: { title?: string; artist?: string; song_forms?: Array<{ id: string; name: string; key?: string }> };
          };
          const sf = r.song_form_id && r.sheet?.song_forms
            ? r.sheet.song_forms.find((x) => x.id === r.song_form_id)
            : undefined;
          return {
            id: r.id,
            type: r.type,
            sequence_order: r.sequence_order,
            ment_text: r.ment_text,
            sheet: r.sheet && (r.sheet.title || r.sheet.artist)
              ? { title: r.sheet.title ?? '', artist: r.sheet.artist }
              : undefined,
            song_form: sf ? { name: sf.name, key: sf.key } : undefined,
          };
        });
        setItems(normalized);
      } catch {
        setError('불러오기 실패');
      } finally {
        setLoading(false);
      }
    };

    if (code) load();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <LoadingSpinner text="세션 불러오는 중..." />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
        <div className="text-center space-y-2">
          <p className="text-neutral-500 text-sm">{error ?? '세션을 찾을 수 없습니다.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-5 py-4 sticky top-0">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <span className="type-h1 text-neutral-900">Hamo</span>
          <span className="text-neutral-300">|</span>
          <span className="text-sm text-neutral-600 truncate">{session.name}</span>
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
            session.status === 'active'
              ? 'bg-success-100 text-success-700'
              : 'bg-neutral-100 text-neutral-500'
          }`}>
            {session.status === 'active' ? '진행 중' : '완료'}
          </span>
        </div>
      </div>

      {/* Play button */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <button
          onClick={() => sessionId && router.push(`/session-player/${sessionId}?guest=true&code=${encodeURIComponent(code)}`)}
          disabled={!sessionId}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-2xl py-3.5 transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          합주 시작
        </button>
      </div>

      {/* Setlist */}
      <div className="max-w-lg mx-auto p-4 space-y-2">
        <p className="type-h3 text-neutral-400 px-1 mb-3">
          세트리스트 · {items.length}개
        </p>

        {items.length === 0 && (
          <p className="text-center text-sm text-neutral-400 py-12">세트리스트가 비어있습니다.</p>
        )}

        {items.map((item, i) =>
          item.type === 'song' ? (
            <div key={item.id} className="bg-white rounded-2xl border border-neutral-200 px-4 py-3 flex items-center gap-3">
              <span className="text-xs font-bold text-neutral-300 w-5">{i + 1}</span>
              <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="type-body-sm text-neutral-900 truncate">
                  {item.sheet?.title ?? '(악보 없음)'}
                </p>
                <p className="type-caption text-neutral-400 truncate">
                  {[item.song_form?.name, item.sheet?.artist].filter(Boolean).join(' · ') || '송폼 없음'}
                </p>
              </div>
              {item.song_form?.key && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-primary-100 text-primary-700 font-semibold flex-shrink-0">
                  {item.song_form.key}
                </span>
              )}
            </div>
          ) : (
            <div key={item.id} className="bg-secondary-50 rounded-2xl border border-secondary-100 px-4 py-3 flex items-start gap-3">
              <span className="text-xs font-bold text-secondary-200 w-5 mt-0.5">{i + 1}</span>
              <div className="w-8 h-8 rounded-lg bg-secondary-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm text-secondary-700 flex-1 leading-relaxed">
                {item.ment_text || '(멘트 없음)'}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
