'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/Button';

export default function GuestJoinPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [guestName, setGuestName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionValid, setSessionValid] = useState(false);

  // Validate guest code
  useEffect(() => {
    const validateCode = async () => {
      try {
        // TODO: Validate guest code against Supabase
        setSessionValid(true);
      } catch (err) {
        setError('유효하지 않은 세션 코드입니다');
        setSessionValid(false);
      }
    };

    if (code) {
      validateCode();
    }
  }, [code]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!guestName.trim()) {
      setError('이름을 입력해주세요');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // TODO: Create guest session
      // const result = await supabase.rpc('create_guest_participant', {
      //   session_code: code,
      //   guest_name: guestName,
      // });

      // 임시: 세션으로 이동
      router.push(`/session-guest/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '세션 입장 실패');
    } finally {
      setIsLoading(false);
    }
  };

  if (!sessionValid && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <LoadingSpinner text="세션 확인 중..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-primary-600 mb-2">Hamo</h1>
        <p className="text-neutral-600 mb-8">악보 협업 세션에 참여하세요</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {sessionValid && (
          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                이름
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
            >
              세션 참여
            </Button>
          </form>
        )}

        <p className="text-xs text-neutral-500 text-center mt-6">
          세션 코드: <span className="font-mono font-bold">{code}</span>
        </p>
      </div>
    </div>
  );
}
