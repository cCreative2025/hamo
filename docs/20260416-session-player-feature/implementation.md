# 세션 플레이어 기능 구현 완료 보고

## 구현 개요

세션 플레이어 기능의 Stage 3 구현이 완료되었습니다. 기본 UI 레이아웃, 상태 관리, 곡 네비게이션 로직이 구현되었습니다.

**구현 범위**: 핵심 구조 및 UI 골격
**특이사항**: DrawingCanvas 통합은 향후 단계에서 진행 (현재 SheetRenderer만 구현)

---

## 변경된 파일

### 신규 생성

| 파일 | 설명 |
|------|------|
| `src/stores/sessionPlayerStore.ts` | 세션 플레이어 전용 Zustand 스토어 (상태, Realtime, 레이어 토글) |
| `src/app/session-player/[id]/page.tsx` | 세션 플레이어 메인 페이지 |
| `src/app/session-player/[id]/components/SessionPlayerHeader.tsx` | 상단 헤더 (세션명, 곡 정보, 역할 뱃지) |
| `src/app/session-player/[id]/components/SessionPlayerMain.tsx` | 중앙 컨텐츠 영역 (악보 렌더러 또는 멘트) |
| `src/app/session-player/[id]/components/SessionPlayerFooter.tsx` | 하단 네비게이션 (이전/다음, 세트리스트 슬라이더) |
| `src/app/session-player/[id]/components/SheetRenderer.tsx` | 악보 렌더러 (PDF/이미지 지원) |
| `src/app/session-player/[id]/components/MentDisplay.tsx` | 멘트 전체화면 표시 |

### 수정된 파일

| 파일 | 변경 내용 |
|------|---------|
| `src/app/sessions/page.tsx` | 각 세션 카드에 ▶ 재생 버튼 추가 |

---

## 구현 상세

### 1. sessionPlayerStore.ts

**주요 기능**:
- 세션 정보, 아이템, 레이어 상태 관리
- 사용자 역할 판단 (creator/member/guest)
- Realtime 채널 구독 및 동기화
- 곡 네비게이션 (낙관적 업데이트)

**핵심 메서드**:
```typescript
initSession(sessionId, currentUser, isGuest)    // 초기화
navigateToSong(index)                           // 곡 이동 (팀장만)
subscribeToSession(sessionId)                   // Realtime 구독
unsubscribeFromSession()                        // 구독 해제
toggleLayerVisibility(layerId)                  // 레이어 토글
cleanup()                                       // 정리
```

**특이사항**:
- 낙관적 업데이트로 UI 반응성 향상
- Realtime 에러 시 자동 재연결 지원 (향후 폴링 백업 추가)
- 메모리 누수 방지를 위한 cleanup() 함수

### 2. SessionPlayerPage ([id]/page.tsx)

**기능**:
- 세션 데이터 로드 및 Realtime 구독
- 사용자 인증 검증 (guest 제외)
- 에러 및 로딩 상태 표시
- 페이지 언마운트 시 정리

**특이사항**:
- `guest=true` 쿼리 파라미터로 guest 모드 지원
- useAuth(true)로 인증 강제 (guest 제외)

### 3. SessionPlayerHeader.tsx

**표시 항목**:
- 세션명 (좌측)
- 현재 곡 제목 또는 멘트 미리보기 (좌측 아래)
- 역할 뱃지 (팀장/팀원/객원) - 중앙
- 닫기 버튼 (우측)

**스타일**:
- 다크 모드 지원
- 고정 높이, 경계선 분리

### 4. SessionPlayerMain.tsx

**로직**:
- 현재 아이템 타입 판단
  - `type === 'ment'` → MentDisplay 렌더링
  - `type === 'song'` → SheetRenderer 렌더링
  - 비어있음 → 빈 상태 표시

**특이사항**:
- useMemo로 currentItem 최적화

### 5. SheetRenderer.tsx

**기능**:
- sheet_version 데이터 로드 (DB 조회)
- file_type 판단 (pdf/image)
  - PDF: PDFViewer 컴포넌트 사용
  - 이미지: <img> 태그 사용
- 로딩 및 에러 상태 표시

**특이사항**:
- PDFViewer는 기존 컴포넌트 재사용
- 이미지는 Next.js Image 미사용 (향후 최적화)
- 에러 메시지 친화적 표시

### 6. SessionPlayerFooter.tsx

**기능**:
- 이전/다음 버튼 (팀장만 활성)
- 곡 인덱스 표시 (현재/전체)
- 세트리스트 슬라이더 (수평)
  - 현재 곡 하이라이트 (primary 배경)
  - 팀장만 클릭 가능
  - 곡/멘트 아이템 구분 표시

**특이사항**:
- 권한별 버튼 활성화 제어
- 경계값(첫/마지막) 처리
- 비팀장용 안내 메시지

### 7. MentDisplay.tsx

**기능**:
- 멘트 텍스트 전체화면 표시
- 대형 폰트 (4xl/5xl)
- 그래디언트 배경 (primary 색상)
- "다음으로 넘어가기" 버튼 (팀장만, 마지막 제외)

**특이사항**:
- 풀스크린 레이아웃
- 비팀장용 대기 메시지

### 8. 세션 카드 (sessions/page.tsx)

**추가된 내용**:
- ▶ 재생 버튼 (우측 하단)
  - 호버 시에만 표시
  - 클릭 시 /session-player/{id}로 이동
  - 기존 삭제 버튼과 레이아웃 조정

**특이사항**:
- 기존 카드 클릭 동작은 세션 편집 페이지로 (유지)
- 재생 버튼은 별도 핸들러로 player 페이지로 (신규)

---

## API 엔드포인트 (설계 단계)

### 곡 네비게이션 API

```
PUT /api/sessions/{sessionId}/current-song-index
Content-Type: application/json

Request:
{
  "index": 2
}

Response:
{
  "success": true,
  "current_song_index": 2
}

Error:
{
  "error": "Unauthorized" | "Invalid index" | "Session not found"
}
```

**구현 상태**: 설계 완료, 구현 예정 (향후 단계)

---

## Realtime 동기화

### 구독 채널

```typescript
supabase.channel(`session:{sessionId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'sessions',
    filter: `id=eq.{sessionId}`,
  }, (payload) => {
    // current_song_index 변경 감지
    setCurrentIndex(payload.new.current_song_index);
  })
  .subscribe();
```

**특이사항**:
- 팀장 업데이트 → Realtime 이벤트 → 비팀장 자동 동기화
- 채널 구독은 모든 사용자가 동일 (읽기 권한)
- 쓰기는 RLS 정책으로 제한 (팀장만)

---

## 테스트 필요 항목

- [ ] **로딩 상태**: 세션 초기화 중 로딩 스핀 표시 확인
- [ ] **에러 상태**: 악보 로드 실패 시 에러 메시지 표시 확인
- [ ] **역할 판단**: 팀장/팀원/객원 역할 뱃지 정확성 확인
- [ ] **곡 네비게이션**: 이전/다음 버튼 동작 확인
  - 팀장: 버튼 활성, 곡 변경 가능
  - 팀원/객원: 버튼 disabled, 곡 변경 불가
- [ ] **세트리스트 슬라이더**: 현재 곡 하이라이트 표시 확인
- [ ] **Realtime 동기화**: 다중 탭에서 곡 변경 시 자동 동기화 확인
- [ ] **멘트 표시**: 멘트 아이템 클릭 시 전체화면 표시 확인
- [ ] **PDF/이미지 렌더링**: 각 파일 타입별 렌더링 확인
- [ ] **다크 모드**: 모든 컴포넌트의 다크 모드 스타일 확인
- [ ] **모바일 반응형**: 모바일 화면에서 UI 레이아웃 확인

---

## 향후 구현 항목 (Stage 4+)

### 우선순위 1 (필수)

1. **API 엔드포인트 구현**
   - PUT /api/sessions/{id}/current-song-index 구현
   - 팀장 권한 검증 로직

2. **DrawingCanvas 통합**
   - sessionPlayerStore에서 layers 로드
   - SheetRenderer와 DrawingCanvas 합성
   - 로컬 레이어 토글 UI

3. **게스트 리디렉션**
   - session-guest/[code] 수정
   - /session-player/[id]?guest=true로 리다이렉트

### 우선순위 2 (개선)

4. **Realtime 폴링 백업**
   - 구독 실패 시 1초 간격 폴링
   - 최대 5회 재시도

5. **성능 최적화**
   - 이미지 nextImage로 최적화
   - React.memo 적용
   - Konva.js 렌더 최적화

6. **접근성**
   - 키보드 네비게이션 (←/→ 화살표)
   - ARIA 레이블 추가
   - 포커스 관리

### 우선순위 3 (심화)

7. **고급 기능**
   - 터치 스와이프 네비게이션 (모바일)
   - 레이어 저장 다이얼로그
   - 세션 녹음/재생

---

## 주요 이슈 및 대응

### Issue 1: DrawingCanvas 크기 조정
**상황**: DrawingCanvas가 악보 이미지 크기에 정확히 맞춰야 함
**대응**: SheetRenderer에서 이미지 로드 후 크기 계산 필요 (향후)

### Issue 2: Realtime 채널 중복 구독
**상황**: 다중 탭에서 같은 세션을 열면 채널 이중 구독 가능
**대응**: sessionPlayerStore에서 채널 싱글톤 관리 (완료)

### Issue 3: 네트워크 연결 끊김
**상황**: 네트워크 복구 후 Realtime 자동 재연결 필요
**대응**: Supabase 기본 재연결 로직 의존, 폴링 백업 추가 예정

### Issue 4: RLS 정책 검증
**상황**: sessions.current_song_index UPDATE 권한이 팀장만인지 확인 필수
**대응**: Supabase RLS 정책 재검토 필요 (구현 전)

---

## 코드 품질 및 표준 준수

### TypeScript
- ✅ 모든 props에 interface 정의
- ✅ Zustand store 타입 안전
- ✅ SessionItem, Session 등 기존 타입 활용

### 스타일
- ✅ Tailwind CSS 토큰 사용
- ✅ 다크 모드 지원 (dark: 클래스)
- ✅ 반응형 디자인 (모바일/데스크탑)

### 패턴
- ✅ "use client" 디렉티브 (클라이언트 컴포넌트)
- ✅ React Hooks (useEffect, useCallback, useMemo)
- ✅ 기존 컴포넌트 재사용 (Button, LoadingSpinner 등)

### 성능
- ⚠️ 이미지 최적화 (향후 개선)
- ⚠️ 메모이제이션 부분 적용 필요
- ⚠️ DrawingCanvas 성능 테스트 필수

---

## 특이사항 및 리뷰 포인트

### 리뷰어가 집중해야 할 부분

1. **Realtime 동기화 로직**
   - sessionPlayerStore의 subscribeToSession() 구현 검토
   - 채널 정리 (cleanup) 완료도 확인
   - 에러 처리 (재연결) 검토

2. **권한 검증**
   - determineUserRole() 함수 로직 검토
   - 클라이언트 검증만 적용됨 (서버 RLS 필수!)
   - guest 파라미터 처리 안전성 확인

3. **메모리 관리**
   - useEffect cleanup 함수 확인
   - Realtime 채널 unsubscribe 확인
   - 무한 루프 가능성 검토

4. **API 엔드포인트**
   - 향후 PUT /api/sessions/{id}/current-song-index 구현 시:
     - 팀장 권한 검증 필수
     - 인덱스 범위 검증 필수
     - RLS 정책과의 일관성 확인

### 알려진 제한사항

1. **DrawingCanvas 미통합**
   - 현재 악보만 렌더링
   - 드로잉 레이어는 향후 단계에서 추가

2. **API 엔드포인트 미구현**
   - 낙관적 업데이트는 설계되었으나
   - 실제 API 호출은 구현 전

3. **폴링 백업 미구현**
   - Realtime 실패 시 자동 재연결은 Supabase 기본 제공
   - 폴링 백업은 향후 추가 필요

4. **모바일 최적화 미흡**
   - 터치 스와이프 네비게이션 미구현
   - 모바일 viewport 제약 테스트 필요

---

## 완료 체크리스트

- [x] sessionPlayerStore 구현
- [x] SessionPlayer 페이지 구현
- [x] Header/Main/Footer 컴포넌트 구현
- [x] SheetRenderer (PDF/이미지) 구현
- [x] MentDisplay 구현
- [x] 세션 카드에 재생 버튼 추가
- [x] Realtime 구독 로직 구현
- [x] 곡 네비게이션 로직 구현
- [x] 역할 기반 권한 제어 (클라이언트)
- [x] 다크 모드 지원
- [x] 타입스크립트 타입 안전
- [ ] API 엔드포인트 구현 (향후)
- [ ] DrawingCanvas 통합 (향후)
- [ ] 게스트 리디렉션 (향후)
- [ ] E2E 테스트 (향후)

---

## 배포 전 필수 사항

1. **RLS 정책 검증**
   - sessions 테이블: current_song_index UPDATE 권한
   - session_items 테이블: SELECT 권한
   - session_layers 테이블: CRUD 권한 (있을 경우)

2. **환경변수 확인**
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - (Realtime 활성화 확인)

3. **데이터 마이그레이션** (필요 시)
   - sessions.current_song_index 컬럼 존재 확인
   - 기존 session_items 데이터 상태 확인

---

## 다음 단계 (Stage 4: Code Review)

Stage 4에서는 code-reviewer 에이전트가 다음을 검토합니다:

1. 구현 품질 (코드 스타일, 성능)
2. 기능 정확성 (요구사항 충족도)
3. 보안 (권한 검증, RLS 정책)
4. 접근성 (다크 모드, ARIA 레이블)
5. 테스트 계획 (테스트 커버리지)

검토 결과는 review.md에 기록됩니다.

