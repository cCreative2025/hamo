# 구현 계획 — Realtime 구독 미작동 문제 수정

**프로젝트**: hamo
**작업**: 세션 플레이어 첫 진입 시 Realtime 구독 미작동 문제 수정
**날짜**: 2026-04-17
**설계자**: code-backend
**상태**: 설계 완료

---

## 1. 설계 개요

### 문제 정의
Race condition 발생으로 인해 세션 플레이어 첫 진입 시 Realtime 구독이 실패하는 문제.

### 해결 전략
Active Flag 패턴을 사용하여 stale promise의 콜백 실행을 방지.

### 적용 범위
- **파일**: `src/app/session-player/[id]/page.tsx`
- **함수**: 초기화 useEffect (lines 50-65)
- **변경**: 2줄 추가

---

## 2. 상세 설계

### 2.1 변경 전 코드 분석

```typescript
// src/app/session-player/[id]/page.tsx (lines 50-65)

useEffect(() => {
  if (sessionId) {
    initSession(sessionId, currentUser || null, isGuest)
      .then(() => {
        subscribeToSession(sessionId);  // ← stale callback 가능
      })
      .catch(() => {
        // Error handled in store
      });
  }

  return () => {
    unsubscribeFromSession();
    cleanup();
  };
}, [sessionId, currentUser, isGuest, initSession, subscribeToSession, unsubscribeFromSession, cleanup]);
```

**문제점**:
- `initSession`이 Promise를 반환
- cleanup 발동 후에도 1차 Promise가 resolve될 수 있음
- stale .then()에서 `subscribeToSession()` 호출 → 중복 구독 또는 상태 불일치

---

### 2.2 변경 후 코드 설계

```typescript
// src/app/session-player/[id]/page.tsx (lines 50-65)

useEffect(() => {
  let active = true;  // ← 추가: Active flag

  if (sessionId) {
    initSession(sessionId, currentUser || null, isGuest)
      .then(() => {
        if (active) {  // ← 추가: Stale callback 필터링
          subscribeToSession(sessionId);
        }
      })
      .catch(() => {
        // Error handled in store
      });
  }

  return () => {
    active = false;  // ← 추가: Cleanup에서 플래그 비활성화
    unsubscribeFromSession();
    cleanup();
  };
}, [sessionId, currentUser, isGuest, initSession, subscribeToSession, unsubscribeFromSession, cleanup]);
```

**개선점**:
- `active` 플래그로 intent 명확화
- cleanup 발동 시 `active = false` 설정
- stale callback에서 `if (active)` 체크 → 필터링

---

## 3. 변경 상세

### 변경 1: Active Flag 선언 (line 50 이후)

```diff
  useEffect(() => {
+   let active = true;
    if (sessionId) {
```

### 변경 2: Stale Callback 필터링 (line 53 내)

```diff
    initSession(sessionId, currentUser || null, isGuest)
      .then(() => {
+       if (active) {
          subscribeToSession(sessionId);
+       }
      })
```

### 변경 3: Cleanup에서 플래그 비활성화 (line 61 시작)

```diff
    return () => {
+     active = false;
      unsubscribeFromSession();
```

---

## 4. 구현 검증 전략

### 4.1 코드 검증 체크리스트
- [ ] `active` 플래그가 useEffect 스코프 최상단 선언
- [ ] cleanup 함수에서 `active = false` 설정 (unsubscribeFromSession 이전)
- [ ] `.then()` 콜백에서 `if (active)` 체크 추가
- [ ] 의존성 배열은 그대로 유지
- [ ] error handling은 변경 안 함

### 4.2 동작 검증 체크리스트
- [ ] 로그인 직후 세션 진입 → Realtime 구독 성공
- [ ] 송폼 변경 (리더) → 팀원 UI 즉시 업데이트
- [ ] 레이어 변경 → 다른 사용자 UI 즉시 업데이트
- [ ] 재진입 → 계속 정상 작동
- [ ] Guest 모드 → 구독 정상 작동

### 4.3 엣지 케이스 검증
- [ ] 빠른 진입/퇴장 반복 → 메모리 누수 없음
- [ ] 네트워크 불안정 → graceful 처리
- [ ] sessionId 변경 → 자동 재구독

---

## 5. 기술 세부사항

### 5.1 시간대 분석

| 시간 | 이벤트 | active 값 | 동작 |
|------|--------|----------|------|
| t0 | effect 실행 | true | active = true 설정 |
| t1 | initSession 시작 | true | - |
| t2 | cleanup 발동 | true | active = false 설정 |
| t3 | initSession resolve | false | if (active) 체크 → false → 스킵 |
| t4 | 2차 effect 실행 | true | active = true 재설정 |
| t5 | 2차 initSession 시작 | true | - |
| t6 | 2차 initSession resolve | true | if (active) 체크 → true → subscribeToSession() 호출 |

---

### 5.2 메모리 영향

| 항목 | 추가 메모리 |
|------|-----------|
| boolean flag | ~1 byte |
| 클로저 스코프 | negligible |
| 총합 | negligible |

---

### 5.3 성능 영향

| 항목 | 영향 |
|------|------|
| CPU | 0 (boolean 체크만) |
| I/O | 0 (동작 동일) |
| 레이턴시 | 0 |

---

## 6. 리스크 관리

### 잠재적 위험
- ❌ 없음 (매우 단순한 패턴, 광범위하게 사용됨)

### 호환성
- ✅ 하위 호환성: 완전
- ✅ Breaking Change: 없음
- ✅ 사이드 이펙트: 없음

### 롤백 계획
- 간단함 (2줄 제거)
- 기존 상태로 복원 시 3분 이내

---

## 7. 구현 체크리스트

### Pre-Implementation
- [ ] spec.md 검토 완료
- [ ] 소스 코드 읽기 완료
- [ ] 변경 범위 확정

### Implementation
- [ ] 파일 수정 (3개 줄 추가)
- [ ] 구문 검증 (lint/format)
- [ ] 타입 검증

### Post-Implementation
- [ ] implementation.md 작성
- [ ] 코드 검토 준비
- [ ] 테스트 계획 작성

---

## 8. 관련 코드 참고

### sessionPlayerStore.ts - subscribeToSession (line 272)

```typescript
subscribeToSession: (sessionId: string) => {
  const state = get();

  // ← 이 dedup 체크 때문에 stale callback이 중복 구독 방지
  // 하지만 정상 2차 구독도 실행 안 됨 (문제!)
  if (state.realtimeChannel) {
    return;
  }

  let channel = supabase
    .channel(`session:${sessionId}`)
    // ... Realtime 핸들러들 ...
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        set({ isSubscribed: true });
      } else if (status === 'CLOSED') {
        set({ isSubscribed: false });
      }
    });

  set({ realtimeChannel: channel });
},
```

---

## 9. 산출물

**설계 문서**: 이 plan.md
**구현 대상**: `src/app/session-player/[id]/page.tsx` (lines 50-65)
**수정 패턴**: Active Flag
**예상 노력**: 매우 낮음 (5분)
**테스트 난이도**: 낮음 (통합 테스트만 필요)
