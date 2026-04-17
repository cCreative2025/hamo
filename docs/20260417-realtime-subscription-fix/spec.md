# 요구사항 분석 스펙 — Realtime 구독 미작동 문제 수정

**프로젝트**: hamo (악보 협업 PWA)
**작업**: 세션 플레이어 첫 진입 시 Realtime 구독 미작동 문제 수정
**날짜**: 2026-04-17
**상태**: 분석 완료

---

## 1. 문제 정의

### 증상
- 세션 플레이어에 **첫 번째 진입** 시 Realtime 기능(송폼 변경, 레이어 변경)이 작동하지 않음
- 세션을 **나갔다가 재진입**하면 정상 작동
- 이는 인증 상태 로딩 중에 발생하는 race condition

### 원인 분석

#### 파일: `src/app/session-player/[id]/page.tsx` (lines 50-65)

현재 코드는 useEffect 의존성 배열에 `currentUser`를 포함하고 있습니다:

```typescript
useEffect(() => {
  if (sessionId) {
    initSession(sessionId, currentUser || null, isGuest)
      .then(() => {
        subscribeToSession(sessionId);
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

#### Race Condition 발생 메커니즘

**1. 첫 진입 시 (currentUser 로딩 중)**
- `currentUser = null` (인증 로딩 중) → useEffect 1차 실행
- `initSession(sessionId, null, isGuest)` 호출 (Promise 대기 중)
- `subscribeToSession(sessionId)` 호출 → Sub-1 생성, `realtimeChannel` 저장

**2. currentUser 로드 완료 후**
- `currentUser` 상태 변경 → useEffect 2차 실행 (cleanup 먼저 발동)
- cleanup:
  - `unsubscribeFromSession()` → Sub-1 제거, `realtimeChannel = null`
  - `cleanup()` → `items = []` 초기화
- 이후 useEffect 2차 본체 실행:
  - `initSession(sessionId, currentUser, isGuest)` 호출 (새로운 Promise)
  - `subscribeToSession(sessionId)` 호출 → Sub-2 생성, `realtimeChannel` 저장

**3. 문제 발생 지점**
- **1차 effect의 initSession Promise가 cleanup 이후에 resolve될 수 있음**
- Stale .then() 콜백이 실행되면:
  - `subscribeToSession(sessionId)` 호출 시도
  - 하지만 Sub-2가 이미 생성되어 있음
  - `subscribeToSession` 내부의 dedup 체크에서 차단 (line 276):
    ```typescript
    if (state.realtimeChannel) {
      return;  // 이미 Sub-2가 설정되어 있어서 스킵됨
    }
    ```

**4. 결과**
- Sub-1(currentUser=null로 설정된 잘못된 구독)의 상태 정보가 메모리에 남거나
- 또는 구독이 아예 없는 상태 (이전 unsubscribe에서 모두 정리됨)
- Realtime 동기화 실패

**5. 두 번째 진입 시 (정상 작동하는 이유)**
- `currentUser`가 이미 로드된 상태 → useEffect 1회만 실행
- race condition 발생하지 않음 → 정상 작동

---

## 2. 기술 스택 & 관련 코드

### 파일 및 함수

| 파일 | 함수 | 역할 |
|------|------|------|
| `src/app/session-player/[id]/page.tsx` | (useEffect) | 세션 초기화 + 구독 오케스트레이션 |
| `src/stores/sessionPlayerStore.ts` | `initSession()` | DB에서 세션/아이템/레이어 로드 |
| `src/stores/sessionPlayerStore.ts` | `subscribeToSession()` | Realtime 채널 설정 |
| `src/stores/sessionPlayerStore.ts` | `unsubscribeFromSession()` | 채널 정리 |

### Realtime 구독 대상 (sessionPlayerStore.ts:272-356)

- `sessions` 테이블: `current_song_index` 변경 감시 → 곡 네비게이션 동기화
- `session_layers` 테이블: INSERT/UPDATE → 레이어 표시/변경 동기화
- `song_forms` 테이블: UPDATE → 송폼(key/sections/flow) 변경 동기화

---

## 3. 해결 방안

### 방법: Active Flag 패턴

useEffect 내부에 `active` 플래그를 추가하여 stale promise의 콜백 실행을 방지합니다.

#### 수정 흐름

```typescript
useEffect(() => {
  let active = true;  // 1. 플래그 선언

  if (sessionId) {
    initSession(sessionId, currentUser || null, isGuest)
      .then(() => {
        // 2. cleanup 이후 resolve된 경우 검사
        if (active) {
          subscribeToSession(sessionId);
        }
      })
      .catch(() => {
        // Error handled in store
      });
  }

  return () => {
    active = false;  // 3. cleanup에서 플래그 비활성화
    unsubscribeFromSession();
    cleanup();
  };
}, [sessionId, currentUser, isGuest, initSession, subscribeToSession, unsubscribeFromSession, cleanup]);
```

#### 동작 원리

1. **1차 effect (currentUser=null)**
   - `active = true` 설정
   - `initSession()` → Promise (대기 중)
   - 즉시 return (cleanup 함수 등록)

2. **currentUser 변경 → cleanup 발동**
   - `active = false` 설정
   - `unsubscribeFromSession()` → Sub-1 제거
   - `cleanup()`

3. **1차 initSession Promise resolve (but active=false)**
   - `.then()` 실행
   - `if (active)` 검사 → false → 스킵 (구독 안 함)
   - Sub-1 상태 유지되지 않음

4. **2차 effect (currentUser=로드됨)**
   - `active = true` 재설정
   - `initSession()` → Promise
   - 즉시 return

5. **2차 initSession Promise resolve (active=true)**
   - `.then()` 실행
   - `if (active)` 검사 → true → `subscribeToSession()` 실행
   - Sub-2 생성 → **정상 작동**

---

## 4. 영향도 분석

### 변경 범위
- **파일**: `src/app/session-player/[id]/page.tsx` (1개 파일)
- **라인**: useEffect 블록 (lines 50-65)
- **변경량**: 2줄 추가 (active flag 선언 + cleanup 설정)

### 안전성
- **Breaking Change**: 없음
- **Side Effect**: 없음
- **하위 호환성**: 완전 호환
- **테스트 필요**: 통합 테스트 (세션 첫 진입 시나리오)

### 성능
- **메모리**: 플래그 1개 추가 (negligible)
- **CPU**: 영향 없음 (boolean 체크만 추가)

---

## 5. 검증 기준

### 수정 전 현상
- 세션 플레이어 첫 진입 → Realtime 미작동
- 송폼 변경 → UI에 반영 안 됨
- 레이어 변경 → UI에 반영 안 됨
- 재진입 → 정상 작동

### 수정 후 검증
1. 세션 플레이어 첫 진입 → **Realtime 작동**
2. 송폼 변경 → **UI 즉시 반영**
3. 레이어 변경 → **UI 즉시 반영**
4. 재진입 → **계속 정상 작동**

### 테스트 시나리오
- 로그인 직후 세션 진입
- Guest 모드 진입
- 네트워크 불안정 환경에서의 진입

---

## 6. 위험도 및 추가 개선사항

### 현재 위험 요소
- ✅ Race condition 완전 해소됨
- ✅ 명확한 의도 표현 (active flag)

### 향후 개선 (선택사항)
1. **AbortController 도입**: Promise 자체를 취소하는 방식 (더 성숙한 패턴)
   ```typescript
   const abortController = new AbortController();
   initSession(..., { signal: abortController.signal })
     .then(...)

   return () => {
     abortController.abort();  // Promise 자체 취소
   };
   ```

2. **useEffect 의존성 최적화**: `currentUser` 제거 가능성 검토
   - 인증 상태는 전역 스토어에서 관리
   - effect 의존성에서 제거 가능할 가능성 있음

---

## 7. 산출물

**문서**: 이 spec.md
**대상 파일**: `src/app/session-player/[id]/page.tsx`
**수정 방법**: Active Flag 패턴
**예상 노력**: 매우 낮음 (2줄, 5분 이내)
