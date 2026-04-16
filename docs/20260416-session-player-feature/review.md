# 세션 플레이어 기능 코드 리뷰

## 전체 평가

구현의 기본 골격과 핵심 로직(Realtime 구독, 곡 네비게이션, 역할 기반 접근제어)이 잘 설계되었습니다. 다만 API 엔드포인트 미구현, 불완전한 에러 처리, 보안 검증 누락 등으로 인해 배포 전 필수 수정사항이 있습니다.

**심각도**: 🔴 Critical 4개, 🟡 Warning 3개, 🟢 Suggestion 5개

---

## 🔴 Critical (반드시 수정)

### 1. **[sessionPlayerStore.ts:52-84] API 엔드포인트 미구현 - 곡 네비게이션 불가능**

**문제**: navigateToSong() 메서드가 로컬 상태만 업데이트하고 실제 DB 쓰기를 하지 않음.
```typescript
// 현재 코드:
navigateToSong: async (index: number) => {
  // ... validation ...
  set({ currentIndex: index }); // 로컬 상태만 업데이트
  try {
    // 실제 DB 업데이트 없음!
    // const { error } = await supabase.from('sessions').update(...) 필요
  }
}
```

**이유**: 팀장의 곡 변경이 DB에 저장되지 않으므로 다른 클라이언트가 Realtime으로 동기화할 수 없음. 페이지 새로고침 시 변경사항이 유지되지 않음.

**수정 방법**:
```typescript
navigateToSong: async (index: number) => {
  // ... validation ...
  set({ currentIndex: index }); // 낙관적 업데이트

  try {
    const { error } = await supabase
      .from('sessions')
      .update({ current_song_index: index })
      .eq('id', sessionId);

    if (error) throw error;
  } catch (error) {
    // 실패 시 롤백
    set({ currentIndex: state.session?.current_song_index || 0 });
    set({ error: error instanceof Error ? error.message : 'Failed to update' });
  }
};
```

**영향도**: 높음 - 핵심 기능 비작동

---

### 2. **[SessionPlayerFooter.tsx:30-36] 타입 에러 - items 배열 경계 검증 부재**

**문제**: handleNext/handlePrevious에서 items 배열이 비어있을 수 있지만 검증 없음.
```typescript
const handleNext = useCallback(() => {
  if (currentIndex < items.length - 1 && canNavigate) { // items가 empty면 -1 반환
    navigateToSong(currentIndex + 1);
  }
}, [currentIndex, items.length, canNavigate, navigateToSong]);
```

**이유**: items.length === 0일 경우 `-1 < -1`은 거짓이지만, 다른 로직에서 실수할 여지가 있음. 또한 렌더링 시 items[currentIndex]가 undefined 가능.

**수정 방법**:
```typescript
const canNavigate = userRole === 'creator' && items.length > 0;
const isFirst = items.length === 0 || currentIndex === 0;
const isLast = items.length === 0 || currentIndex === items.length - 1;

useEffect(() => {
  if (!session || items.length === 0) {
    // 에러 상태 또는 로딩 표시
  }
}, [session, items.length]);
```

**영향도**: 중간 - 엣지 케이스 처리

---

### 3. **[SheetRenderer.tsx:35-50] 권한 검증 없음 - 객원도 모든 악보 접근 가능**

**문제**: 클라이언트에서 권한 검증 없이 sheet_version을 로드. RLS만 의존.
```typescript
const { data, error: fetchError } = await supabase
  .from('sheet_versions')
  .select('id, file_path, file_type, page_count')
  .eq('id', item.sheet_version_id) // RLS로만 보호
  .single();
```

**이유**:
1. sheet_versions 테이블이 team_id 필터 없이 모든 사용자에게 노출될 수 있음
2. RLS 정책이 제대로 적용되지 않으면 권한 없는 악보 접근 가능
3. 에러 메시지가 "악보를 찾을 수 없습니다"라 권한 거부 vs 존재하지 않음을 구분 불가

**수정 방법**:
```typescript
// sessionPlayerStore.ts의 initSession에서 권한 검증
async initSession(sessionId: string, currentUser: User | null, isGuest: boolean) {
  // ... existing code ...

  // 팀 멤버 확인 (비guest인 경우)
  if (!isGuest && currentUser) {
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', sessionData.team_id)
      .eq('user_id', currentUser.id)
      .single();

    if (!teamMember && sessionData.created_by !== currentUser.id) {
      throw new Error('You do not have access to this session');
    }
  }
}
```

또한 RLS 정책 재검토 필수:
```sql
-- sheet_versions RLS 정책 예시
CREATE POLICY "Users can view sheet versions from their teams"
  ON sheet_versions FOR SELECT
  USING (
    sheet_id IN (
      SELECT id FROM sheets
      WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );
```

**영향도**: 극심 - 보안 취약점

---

### 4. **[sessionPlayerStore.ts:155-180] Realtime 채널 에러 처리 부재 - 연결 끊김 시 동기화 불가**

**문제**: Realtime 구독 실패 시 폴링 백업이나 재시도 메커니즘이 없음.
```typescript
subscribeToSession: (sessionId: string) => {
  // ...
  const channel = supabase
    .channel(`session:${sessionId}`)
    .on('postgres_changes', {...})
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        set({ isSubscribed: true });
      } else if (status === 'CLOSED') {
        set({ isSubscribed: false }); // 그냥 종료만 함
      }
    });

  set({ realtimeChannel: channel });
  // 실패 시 폴링 재시도 없음!
};
```

**이유**: 네트워크 불안정한 환경에서 Realtime이 끊기면 UI가 동기화되지 않음. 사용자는 자신의 변경만 보고 타인의 변경은 못 봄.

**수정 방법**:
```typescript
subscribeToSession: (sessionId: string) => {
  const state = get();
  if (state.realtimeChannel) return; // 중복 구독 방지

  let retryCount = 0;
  const maxRetries = 5;

  const subscribe = () => {
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        set({ currentIndex: payload.new.current_song_index });
        retryCount = 0; // 성공 시 재시도 카운트 리셋
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          set({ isSubscribed: true });
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          set({ isSubscribed: false });
          // 폴링 백업: 1초 후 재연결 시도
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(() => {
              supabase.removeChannel(channel);
              subscribe(); // 재귀적 재연결
            }, 1000);
          }
        }
      });

    set({ realtimeChannel: channel });
  };

  subscribe();
};
```

**영향도**: 높음 - 동기화 신뢰성

---

## 🟡 Warning (수정 권장)

### 1. **[SessionPlayerHeader.tsx:27-30] 긴 멘트 텍스트 자르기 불충분**

**문제**: 멘트 미리보기가 30자로 고정 자르기 → 한글 조사로 인한 어색함 가능.
```typescript
const itemTitle =
  currentItem?.type === 'song'
    ? currentItem.song?.name || currentItem.sheet?.title || '(제목 없음)'
    : `[멘트] ${(currentItem?.ment_text || '').substring(0, 30)}...`;
```

**이유**: 한글 문장이 30자로 끝나면 조사나 문법이 깨질 수 있음. 예: "음악은 주님의 영광을..."에서 "음악은 주님의 영광을" 같이 짤려도 부자연스러움.

**수정 방법**:
```typescript
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  // 마지막 완성형 글자 찾기 (정규식으로 한글 경계 감지)
  const truncated = text.substring(0, maxLength);
  // 불완전한 한글이 있으면 한 글자 제거
  return truncated.replace(/[\u1100-\u11FF]$/, '').trim() + '...';
}

const itemTitle = currentItem?.type === 'ment'
  ? `[멘트] ${truncateText(currentItem.ment_text || '', 20)}`
  : ...;
```

**영향도**: 낮음 - UX 개선

---

### 2. **[MentDisplay.tsx:24-26] 버튼 클릭 후 자동 진행 미지원**

**문제**: "다음으로 넘어가기" 버튼을 누른 후 팀원/객원은 화면 변경이 오래 걸릴 수 있음 (Realtime 지연).
```typescript
const handleSkip = () => {
  if (canSkip && !isLast) {
    navigateToSong(currentIndex + 1); // 팀장만, DB 쓰기 포함
  }
};
```

**이유**: 팀장이 버튼을 눌러도 Realtime이 지연되면 다른 클라이언트는 여전히 멘트 화면을 봄. 낙관적 UI 업데이트 필요.

**수정 방법**:
```typescript
// sessionPlayerStore.ts
navigateToSong: async (index: number) => {
  if (userRole !== 'creator') return;

  // 1. 즉시 로컬 상태 업데이트 (낙관적)
  const prevIndex = get().currentIndex;
  set({ currentIndex: index });

  try {
    // 2. DB 업데이트 (동시 실행)
    const { error } = await supabase
      .from('sessions')
      .update({ current_song_index: index })
      .eq('id', sessionId);

    if (error) {
      set({ currentIndex: prevIndex }); // 롤백
      throw error;
    }
  } catch (error) {
    set({ error: error instanceof Error ? error.message : 'Failed' });
  }
};
```

**영향도**: 중간 - 사용자 경험

---

### 3. **[sessionPlayerStore.ts:75-80] 비팀장도 setCurrentIndex 호출 가능 - 권한 검증 누락**

**문제**: 클라이언트에서 권한 검증 없이 setCurrentIndex를 호출할 수 있음.
```typescript
// 누구나 호출 가능
const { setCurrentIndex } = useSessionPlayerStore();
setCurrentIndex(5); // 서버 없이 로컬 상태만 변경 가능
```

**이유**: Zustand store의 setter는 public이므로 React DevTools나 콘솔에서 조작 가능. 서버 검증이 없으면 권한 우회 가능.

**수정 방법**:
```typescript
// sessionPlayerStore.ts - navigateToSong만 외부 호출 허용
// (setCurrentIndex는 internal only 이름 변경)
interface SessionPlayerStore {
  _setCurrentIndex: (index: number) => void; // 내부용
  navigateToSong: (index: number) => Promise<void>; // 공개용
}

// 또는 권한 검증 래퍼
const navigateToSong: (index: number) => Promise<void> = async (index) => {
  const { userRole, sessionId, items, session } = get();

  if (userRole !== 'creator') {
    set({ error: 'Only session creator can navigate' });
    return;
  }

  if (!sessionId || !session || index < 0 || index >= items.length) {
    set({ error: 'Invalid navigation' });
    return;
  }

  // ... DB 업데이트 ...
};
```

**영향도**: 중간 - 보안

---

## 🟢 Suggestion (선택적 개선)

### 1. **성능: 불필요한 리렌더링 방지**

**개선점**: SessionPlayerFooter의 items 배열이 변경될 때마다 모든 자식 컴포넌트가 리렌더링.
```typescript
// 최적화 전:
export function SessionPlayerFooter({ items, currentIndex }: SessionPlayerFooterProps) {
  // items가 변경될 때마다 전체 리렌더링
}

// 최적화 후:
export const SessionPlayerFooter = React.memo(
  ({ items, currentIndex }: SessionPlayerFooterProps) => {
    // ...
  },
  (prevProps, nextProps) => {
    // 깊은 비교 최소화
    return prevProps.currentIndex === nextProps.currentIndex;
  }
);
```

**우선순위**: 낮음 (현재는 items 개수 적음)

---

### 2. **접근성: 키보드 네비게이션 추가**

**개선점**: 마우스 없이 키보드만으로 곡 네비게이션 가능하게.
```typescript
// SessionPlayerFooter.tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' && canNavigate && !isLast) handleNext();
    if (e.key === 'ArrowLeft' && canNavigate && !isFirst) handlePrevious();
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [canNavigate, isFirst, isLast]);
```

**우선순위**: 중간

---

### 3. **로깅: 디버깅 용이성 개선**

**개선점**: Realtime 동기화, 권한 검증 등의 로그 추가.
```typescript
// sessionPlayerStore.ts
subscribeToSession: (sessionId: string) => {
  console.log(`[SessionPlayer] Subscribing to session:${sessionId}`);

  const channel = supabase.channel(`session:${sessionId}`);
  channel.on('postgres_changes', {...}, (payload) => {
    console.log('[SessionPlayer] Received update:', payload);
    set({ currentIndex: payload.new.current_song_index });
  });

  channel.subscribe((status) => {
    console.log(`[SessionPlayer] Subscription status: ${status}`);
  });
};
```

**우선순위**: 낮음 (프로덕션 로깅 정책 필요)

---

### 4. **테스트: 단위 테스트 부재**

**개선점**: sessionPlayerStore의 핵심 로직에 대한 단위 테스트.
```typescript
// __tests__/stores/sessionPlayerStore.test.ts
describe('sessionPlayerStore', () => {
  it('should navigate to song as creator', async () => {
    // ...
  });

  it('should not allow member to navigate', () => {
    // ...
  });
});
```

**우선순위**: 중간

---

### 5. **문서화: 복잡한 로직의 코멘트**

**개선점**: determineUserRole의 역할 판단 로직 설명.
```typescript
/**
 * Determine user role in the session
 *
 * Priority:
 * 1. guest mode → 'guest'
 * 2. session creator → 'creator'
 * 3. team member with editor/owner role → 'member'
 * 4. others → 'guest'
 */
function determineUserRole(...) { ... }
```

**우선순위**: 낮음

---

## ✅ 잘된 부분

### 1. **Realtime 아키텍처 설계 우수**
- 채널 이름을 `session:{id}` 형식으로 고유하게 관리
- subscribeToSession/unsubscribeFromSession으로 명확한 생명주기 관리
- cleanup()으로 메모리 누수 방지

### 2. **권한 기반 UI 제어 명확**
- determineUserRole() 함수로 역할 판단을 중앙화
- 각 컴포넌트에서 userRole을 이용한 버튼 활성화/비활성화 일관적 처리
- 역할 배지로 사용자에게 시각적 피드백

### 3. **타입 안전성 높음**
- SessionItem, Session 등 기존 타입 활용
- UserRole 열거형으로 문자열 오류 방지
- interface SessionPlayerStore로 스토어 구조 명확화

### 4. **컴포넌트 분리 적절**
- Header/Main/Footer로 관심사 분리
- SheetRenderer로 파일 타입별 렌더링 캡슐화
- MentDisplay로 멘트 표시 로직 독립

### 5. **다크 모드 지원 완벽**
- 모든 컴포넌트에서 `dark:` 클래스 적용
- Tailwind 토큰 일관적 사용

---

## 최종 판단

### 배포 가능성
- [x] Critical 수정 필수
- [ ] Warning 수정 권장 (보안/안정성)
- [x] Suggestion 선택적

### 결론

**Critical 4개 이슈로 인해 현재 배포 불가능합니다.**

특히:
1. **navigateToSong() DB 쓰기 미구현** → 핵심 기능 비작동
2. **권한 검증 미흡 (RLS 의존)** → 보안 취약
3. **Realtime 에러 처리 부재** → 신뢰성 부족
4. **items 배열 경계 검증 누락** → 런타임 에러 가능

### 권장 수정 순서

**Phase 1 (필수):**
1. navigateToSong() 구현 (현재 로컬 상태만 변경 → DB 쓰기 추가)
2. 권한 검증 강화 (RLS 정책 재검토 + 서버 검증)
3. items 배열 경계 검증 추가

**Phase 2 (권장):**
4. Realtime 폴링 백업 구현
5. 긴 멘트 텍스트 자르기 개선

**Phase 3 (선택):**
6. 키보드 네비게이션 추가
7. 로깅 및 테스트 추가

### 다음 단계

1. 위의 Critical 4개 이슈 수정
2. 수정된 코드로 재리뷰 진행
3. 로컬 환경에서 E2E 테스트 (다중 탭 동기화, 권한 검증)
4. RLS 정책 검증 (Supabase 콘솔에서)
5. 배포

---

## 리뷰어 메모

이번 구현은 **구조는 좋지만 구현이 미완성**인 상태입니다.

특히 navigateToSong()이 실제 DB 쓰기를 하지 않는 것은 단순 누락이 아니라 핵심 기능이 비작동한다는 뜻입니다. 이는 다음 리뷰에서 반드시 확인해야 할 항목입니다.

또한 보안(권한 검증)과 안정성(Realtime 에러 처리)은 프로덕션 서비스에서 사용자 신뢰도에 직결됩니다. 여유 시간이 있다면 Phase 2의 이슈들도 함께 수정할 것을 권장합니다.

