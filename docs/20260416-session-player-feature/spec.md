# 세션 플레이어 기능 요구사항 스펙

## 기능 요약

합주 세션의 악보를 실시간으로 재생하는 풀스크린 플레이어. 팀장이 곡을 네비게이션하면 팀원/객원이 자동 동기화되는 협업 플레이 기능.

---

## 구현 범위

### 포함되는 것

1. **세션 카드 재생 버튼** (세션 목록)
   - sessions/page.tsx의 각 카드에 ▶ 재생 버튼 추가
   - 클릭 시 /session-player/[id]로 라우팅

2. **세션 플레이어 페이지** (신규)
   - 경로: `/session-player/[id]`
   - 풀스크린 레이아웃 (MainLayout 제외)
   - 상단 헤더: 세션명 + 현재 곡/멘트 + 역할 뱃지
   - 중앙: 악보(PDF/이미지) + 드로잉 레이어
   - 하단: 세트리스트 슬라이더 (현재 곡 하이라이트)

3. **곡 네비게이션**
   - 이전/다음 버튼 (팀장만 클릭 가능, 팀원/객원은 disabled)
   - 멘트 타입 아이템은 텍스트 전체화면 표시
   - sessions.current_song_index 실시간 업데이트 (팀장만)
   - Supabase Realtime 구독으로 팀원/객원 자동 동기화

4. **드로잉 레이어 관리** (역할별)
   - 팀장: 레이어 추가/수정/삭제, 원본 덮어쓰기 선택지
   - 팀원: 본인 레이어만 추가/수정 (session_layers INSERT)
   - 객원: 최신 레이어 보기만
   - 사이드 패널: 레이어 목록 + 눈 아이콘 토글 (로컬 상태)

5. **게스트 리디렉션**
   - session-guest/[code] → /session-player/[id]?guest=true 리다이렉트
   - 쿼리 파라미터 guest=true일 때 객원 모드 적용

6. **Realtime 동기화**
   - supabase.channel('session:[id]') 구독
   - sessions.current_song_index 변경 감지 → 화면 자동 전환
   - 비팀장은 팀장의 인덱스만 구독 (읽기 전용)

### 포함되지 않는 것

- 오디오/비디오 재생 (악보만)
- 템포 메트로놈 (display only)
- 주석/콜 기능 (별도 작업)
- 레코딩 기능 (향후 작업)
- 세션 종료 후 결과 분석 (향후 작업)
- 하이라이트 효과 애니메이션 (향후 개선)

---

## 영향받는 파일

### 신규 생성

1. `src/app/session-player/[id]/page.tsx` — 플레이어 메인 페이지
2. `src/components/SessionPlayer/SessionPlayerHeader.tsx` — 상단 헤더
3. `src/components/SessionPlayer/SessionPlayerMain.tsx` — 악보 + 드로잉 영역
4. `src/components/SessionPlayer/SessionPlayerFooter.tsx` — 하단 세트리스트 슬라이더
5. `src/components/SessionPlayer/LayerPanel.tsx` — 레이어 목록 + 토글
6. `src/components/SessionPlayer/MentDisplay.tsx` — 멘트 전체화면 표시
7. `src/stores/sessionPlayerStore.ts` — 플레이어 전용 상태 (Realtime, 로컬 레이어 토글)

### 수정 대상

1. `src/app/sessions/page.tsx`
   - 각 세션 카드에 ▶ 재생 버튼 추가
   - 클릭 시 /session-player/[id]로 라우팅

2. `src/stores/sessionStore.ts`
   - `current_song_index` 실시간 업데이트 메서드 추가
   - Realtime 구독 로직 추가

3. `src/types/index.ts`
   - SessionItem 타입 확장 (ment 필드 완성)
   - SessionLayer 타입 추가 (필요시)

4. `src/app/session-guest/[code]/page.tsx`
   - /session-player/[id]?guest=true로 리다이렉트

---

## 작업 유형

- [x] 디자인 작업 (UI 컴포넌트)
- [x] 백엔드 작업 (상태 관리, Realtime 로직)

**분류**: 혼합형 (디자인 먼저, 백엔드 병렬)

---

## 데이터 모델

### 기존 테이블 활용

- `sessions` — current_song_index 필드 확인 (존재하면 사용, 없으면 추가)
- `session_items` — song/ment 타입 구분
- `sheet_versions` — 악보 파일 경로
- `session_layers` — 드로잉 데이터 (필요시 확인)

### 필수 확인 사항

1. sessions.current_song_index 컬럼 존재 여부
2. session_items 테이블 구조 (ment_content, ment_display_type 등)
3. session_layers 테이블 RLS 정책

---

## 컴포넌트 구조

```
SessionPlayer/
├── page.tsx (메인 페이지)
├── SessionPlayerHeader.tsx
│   ├── 세션명
│   ├── 현재 곡/멘트 정보
│   └── 역할 뱃지 (팀장/팀원/객원)
├── SessionPlayerMain.tsx
│   ├── PDFViewer 또는 이미지 렌더러
│   ├── DrawingCanvas 오버레이
│   └── MentDisplay (full-screen)
├── SessionPlayerFooter.tsx
│   ├── 이전/다음 버튼
│   └── 세트리스트 슬라이더
├── LayerPanel.tsx
│   ├── 레이어 목록
│   ├── 눈 아이콘 토글
│   └── 추가/삭제 버튼 (팀장만)
└── MentDisplay.tsx (전체화면 멘트)
```

---

## 상태 관리 (Zustand)

### sessionPlayerStore (신규)

```typescript
{
  // 플레이어 상태
  sessionId: string;
  currentIndex: number;
  isPlaying: boolean;
  userRole: 'creator' | 'team_member' | 'guest';

  // 레이어 토글 (로컬)
  visibleLayers: Record<string, boolean>;

  // Realtime 채널
  channel: any;

  // 메서드
  setCurrentIndex(index: number);
  toggleLayerVisibility(layerId: string);
  subscribeToSession(sessionId: string);
  unsubscribeFromSession();
}
```

### sessionStore 확장

```typescript
{
  // 기존 필드들...

  // 추가
  updateCurrentSongIndex(sessionId: string, index: number);
  getCurrentSongIndex(sessionId: string): number;
}
```

---

## 역할 기반 접근 제어 (RBAC)

### 팀장 (session creator)

- 곡 네비게이션: O (이전/다음 버튼 활성)
- current_song_index 업데이트: O (DB에 직접 저장)
- 레이어 추가/수정/삭제: O
- 원본 덮어쓰기: O (drawing_data → song_form)
- 레이어 저장: O (session_layers 또는 song_form)

### 팀원 (team_members with editor/owner role)

- 곡 네비게이션: X (버튼 disabled, 팀장 인덱스 팔로우)
- current_song_index 업데이트: X
- 레이어 추가/수정/삭제: O (본인만, session_layers INSERT)
- 타인 레이어 보기: O

### 객원 (guest)

- 곡 네비게이션: X
- current_song_index 업데이트: X
- 레이어 추가/수정: X
- 레이어 보기: O (최신만)

### 클라이언트 검증

```typescript
const isCreator = session.created_by === currentUser?.id;
const isTeamMember = teamMembers.some(m => m.user_id === currentUser?.id);
const isGuest = !isCreator && !isTeamMember;

const canNavigate = isCreator;
const canAddLayer = isCreator || isTeamMember;
const canDeleteLayer = isCreator;
```

---

## Realtime 동기화 전략

### 구독 채널

```typescript
// 모든 사용자
const channel = supabase.channel(`session:${sessionId}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'sessions',
      filter: `id=eq.${sessionId}`,
    },
    (payload) => {
      // current_song_index 변경 감지
      sessionPlayerStore.setCurrentIndex(payload.new.current_song_index);
    }
  )
  .subscribe();
```

### 업데이트 흐름

1. 팀장이 다음 곡 클릭 → /api/sessions/:id 에 current_song_index 업데이트
2. Supabase sessions 테이블 UPDATE
3. Realtime 이벤트 발생 → 모든 구독자에게 전파
4. 비팀장의 화면 자동 전환

### 낙관적 업데이트

- 팀장: 로컬 상태 먼저 업데이트, 후 DB 저장 (UI 반응성)
- 비팀장: DB에서만 변경 (읽기 전용)

---

## 예외 및 엣지 케이스

### 케이스 1: 세션이 시작되지 않은 상태
- current_song_index가 0 또는 null
- 첫 곡 자동 로드
- 이전 버튼 disabled

### 케이스 2: 멘트 아이템만 있는 세션
- 악보 없이 텍스트만 전체화면 표시
- PDFViewer 스킵, MentDisplay만 렌더링

### 케이스 3: 팀원이 떨어져 있다가 재진입
- Realtime 채널 재구독
- current_song_index 동기화
- 로컬 레이어 토글 상태 초기화

### 케이스 4: 네트워크 끊김 후 복구
- 재접속 시 Realtime 자동 재연결
- 만약 팀장이 meanwhile 곡을 넘겼다면?
  - 재진입 시 DB의 current_song_index 기준으로 싱크
  - 로컬 상태는 폐기

### 케이스 5: 팀장이 나가는 경우
- current_song_index 더 이상 업데이트 안 됨
- 다른 팀장이 없으면 나머지는 현재 곡 유지
- 새 팀장 선택 로직은 미포함 (향후)

### 케이스 6: 드로잉 레이어 충돌
- 동시에 여러 팀원이 레이어 추가
- session_layers는 INSERT만 하므로 자동 RLS 처리
- 클라이언트에서 새 레이어 감지 후 UI 갱신

### 케이스 7: 악보 파일이 없는 경우
- sheet_version 존재하지 않음
- 에러 메시지 표시, 드로잉 패널만 활성화
- 게스트는 접근 불가 (또는 텍스트만)

### 케이스 8: 세트리스트 비어있는 경우
- 세션 진입 불가 (또는 빈 플레이어 표시)
- 팀장만 아이템 추가 가능

---

## 참고사항 (설계/구현 필수 고려)

1. **PDFViewer vs 이미지 렌더러**
   - sheet_version.file_type으로 판단 (pdf vs image)
   - PDF는 기존 PDFViewer 재사용
   - 이미지는 Next.js Image 또는 <img> 사용

2. **DrawingCanvas 통합**
   - 기존 SheetViewerModal의 로직 분석 필수
   - song_form.drawing_data 또는 session_layers에서 로드
   - Konva.js 캔버스 크기를 동적으로 악보 이미지에 맞춤

3. **레이어 저장 전략**
   - 팀장: 저장 다이얼로그 (session_layers vs song_form.drawing_data)
   - 팀원: 항상 session_layers INSERT (자신의 user_id 포함)
   - RLS 정책으로 타인 레이어 수정 방지

4. **풀스크린 레이아웃**
   - `h-screen w-screen overflow-hidden` 사용
   - 모바일: 터치 스와이프로 이전/다음 (향후)
   - 데스크탑: 버튼 클릭 또는 키보드 (좌/우 화살표)

5. **Realtime 에러 처리**
   - 채널 구독 실패 시 폴링 백업 (1초 간격)
   - 재연결 로직 자동 실행

6. **성능 최적화**
   - 라이기능: React.memo로 SessionPlayerHeader, Footer 메모이제이션
   - 드로잉: Konva.js 렌더 최적화 (batchDraw 사용)
   - 이미지: 해상도별 srcSet 또는 next/image fill 사용

7. **접근성**
   - 버튼에 aria-label 추가 (이전, 다음, 레이어 토글)
   - 키보드 네비게이션 지원 (←/→ 화살표)
   - 암흑 모드 지원 (기존 dark: 클래스 활용)

8. **테스트 전략**
   - 역할별 버튼 활성화 상태 확인
   - Realtime 동기화 (다중 탭 시뮬레이션)
   - 네트워크 끊김 후 복구
   - 멘트 아이템 표시 검증

---

## 이행 순서 (단계별 의존성)

1. **디자인 1단계**: SessionPlayer 라우트 + 기본 레이아웃
2. **백엔드 1단계**: sessionPlayerStore + Realtime 구독
3. **디자인 2단계**: Header + Footer + 역할 배지
4. **디자인 3단계**: 악보 렌더러 (PDF/이미지) + 에러 처리
5. **백엔드 2단계**: 곡 네비게이션 + current_song_index 업데이트
6. **디자인 4단계**: DrawingCanvas 통합 + LayerPanel
7. **백엔드 3단계**: 레이어 저장 로직 (팀장/팀원 구분)
8. **디자인 5단계**: MentDisplay (전체화면 멘트)
9. **통합**: 게스트 리디렉션 + 권한 검증
10. **테스트**: E2E 시나리오 검증

---

## 위험 요소 및 대응

| 위험 | 심각도 | 대응 |
|------|--------|------|
| Realtime 동기화 지연 | 높음 | 낙관적 업데이트 + 폴링 백업 |
| 멀티탭에서 Realtime 이중 구독 | 중간 | sessionPlayerStore에서 채널 단일화 |
| 악보 파일 로드 실패 | 중간 | 에러 UI 표시 + 재시도 버튼 |
| RLS 정책 미스 (권한 없는 수정) | 높음 | RLS 정책 검토 + 클라이언트 검증 병행 |
| 드로잉 데이터 크기 과증가 | 낮음 | session_layers 레코드 수 제한 (향후) |
| 모바일 터치 이벤트 충돌 | 중간 | 스와이프 vs 그리기 명확히 구분 |

---

## 완료 조건

- [ ] spec.md 작성 완료 (이 문서)
- [ ] 설계 검토 완료 (plan.md 생성)
- [ ] 구현 완료 (implementation.md + 코드)
- [ ] 리뷰 통과 (review.md 통과)

