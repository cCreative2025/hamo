# 세션 플레이어 기능 구현 계획

## 개요

세션 플레이어는 다음 두 가지 작업 영역으로 구분됨:

1. **설계 (UI/UX)**: SessionPlayer 페이지 및 컴포넌트 구조
2. **백엔드 (상태관리 & API)**: sessionPlayerStore, Realtime 구독, 권한 검증

---

## Part 1: UI/UX 설계 (code-designer)

### 1-1. 컴포넌트 구조

```
src/app/session-player/[id]/
├── page.tsx                          (메인 페이지)
├── layout.tsx                        (풀스크린 레이아웃, MainLayout 제외)
└── components/
    ├── SessionPlayerHeader.tsx       (상단: 세션명 + 곡 정보 + 역할 뱃지)
    ├── SessionPlayerMain.tsx         (중앙: 악보 + 드로잉 캔버스)
    ├── SessionPlayerFooter.tsx       (하단: 이전/다음 + 세트리스트 슬라이더)
    ├── LayerPanel.tsx                (우측: 레이어 목록 + 토글)
    ├── MentDisplay.tsx               (멘트 전체화면 모달)
    └── SheetRenderer.tsx             (악보 렌더러: PDF/이미지)
```

### 1-2. 각 컴포넌트별 책임

#### SessionPlayerHeader.tsx
- **표시 항목**:
  - 세션명 (텍스트)
  - 현재 곡 제목 및 멘트 여부 배지
  - 사용자 역할 뱃지 (팀장/팀원/객원)
  - 닫기 버튼
- **반응형**: 데스크탑 고정, 모바일 압축

#### SessionPlayerMain.tsx
- **기능**:
  - 악보 파일 렌더링 (PDF 또는 이미지)
  - DrawingCanvas 오버레이
  - 에러 상태 표시 (악보 로드 실패)
- **사용 컴포넌트**:
  - PDFViewer (기존 재사용)
  - DrawingCanvas (기존 재사용, 조정)
  - SheetRenderer (신규)

#### SessionPlayerFooter.tsx
- **기능**:
  - 이전/다음 버튼 (팀장만 활성)
  - 곡 네비게이션 (첫/마지막 제한)
  - 세트리스트 슬라이더 (수평, 현재 곡 하이라이트)
- **상태**:
  - 팀장: 버튼 활성
  - 팀원/객원: 버튼 disabled, 읽기 전용

#### LayerPanel.tsx
- **기능**:
  - 레이어 목록 스크롤 뷰
  - 각 레이어별 눈 아이콘 (토글)
  - 추가 버튼 (팀장/팀원만)
  - 삭제 버튼 (팀장만, 각 레이어별)
- **섹션**:
  - "내 레이어" (본인이 생성)
  - "팀원 레이어" (타인이 생성)

#### MentDisplay.tsx
- **기능**:
  - 멘트 텍스트 전체화면 표시
  - 모달 또는 오버레이 방식
  - 닫기 버튼 (또는 다음 곡 자동 진행)
  - 텍스트 정렬: 중앙, 대형 폰트

#### SheetRenderer.tsx
- **기능**:
  - file_type (pdf/image) 판단
  - PDF: PDFViewer 컴포넌트 사용
  - 이미지: Next.js Image 또는 <img> 사용
  - 로딩 스핀 표시
  - 에러 메시지 표시

### 1-3. 스타일 계획

- **색상**: 기존 디자인 토큰 재사용 (primary, neutral, dark mode)
- **풀스크린**: `h-screen w-screen overflow-hidden` + Flexbox 레이아웃
- **반응형**:
  - 데스크탑: 가로 3구간 (Header 상단, Main 중앙, Footer 하단)
  - 모바일: 세로 3구간 (Header 상단, Main 확장, Footer 하단)
- **다크 모드**: 모든 컴포넌트에 dark: 클래스 지원

### 1-4. 기존 컴포넌트 재사용

- **Button.tsx**: 이전/다음/닫기 버튼
- **LoadingSpinner.tsx**: 악보 로드 중
- **PDFViewer.tsx**: PDF 렌더링
- **DrawingCanvas.tsx**: 드로잉 레이어 (조정 필요)
- **Modal.tsx**: 멘트 전체화면 (또는 커스텀)

### 1-5. 구현 순서 (UI 단계)

1. **Stage 1**: SessionPlayer 라우트 + 기본 레이아웃
   - `[id]/page.tsx` + `[id]/layout.tsx` 생성
   - 더미 Header, Main, Footer 추가
   - 풀스크린 스타일 적용

2. **Stage 2**: SessionPlayerHeader + Footer 구현
   - Header: 세션명, 곡 정보 표시
   - Footer: 이전/다음 버튼 + 시뮬레이션 슬라이더
   - 역할 배지 로직

3. **Stage 3**: 악보 렌더러 구현
   - SheetRenderer 컴포넌트
   - PDFViewer / 이미지 로드
   - 에러 처리

4. **Stage 4**: DrawingCanvas 통합
   - 기존 DrawingCanvas 분석 + 조정
   - SessionPlayerMain에 오버레이
   - 로컬 레이어 토글 상태

5. **Stage 5**: LayerPanel 구현
   - 레이어 목록 UI
   - 눈 아이콘 토글
   - 추가/삭제 버튼

6. **Stage 6**: MentDisplay 구현
   - 멘트 아이템 감지
   - 전체화면 모달/오버레이
   - 자동 전환 또는 수동 닫기

### 1-6. 주의사항

- DrawingCanvas는 기존 SheetViewerModal에서 사용하고 있음 → 분석 필수
- 풀스크린 레이아웃 시 viewport 제약 고려 (모바일 주소창)
- 다크 모드 전환 시 캔버스 레이어 색상 문제 가능 → 테스트 필수

---

## Part 2: 백엔드 설계 (code-backend)

### 2-1. 상태 관리 (sessionPlayerStore 신규)

```typescript
// src/stores/sessionPlayerStore.ts

interface SessionPlayerStore {
  // 세션 정보
  sessionId: string | null;
  session: Session | null;
  items: SessionItem[];

  // 플레이어 상태
  currentIndex: number;
  userRole: 'creator' | 'member' | 'guest';

  // 레이어 관리
  visibleLayers: Record<string, boolean>; // layerId -> boolean (로컬)
  layers: SessionLayer[];

  // Realtime 채널
  realtimeChannel: any;
  isSubscribed: boolean;

  // 메서드
  initSession(sessionId: string): Promise<void>;
  setCurrentIndex(index: number): Promise<void>; // 팀장만
  toggleLayerVisibility(layerId: string): void;
  subscribeToSession(): void;
  unsubscribeFromSession(): void;
  cleanup(): void;
}
```

### 2-2. sessionStore 확장 (기존)

```typescript
// src/stores/sessionStore.ts (기존 파일 수정)

// 추가할 메서드:
interface SessionStore {
  // ... 기존 필드들 ...

  // 세션 플레이어용
  updateCurrentSongIndex(sessionId: string, index: number): Promise<void>;
  subscribeToSessionUpdates(sessionId: string, callback: (index: number) => void): () => void;
}
```

### 2-3. API 엔드포인트 설계

#### Realtime 구독 (DB 중심)

- **테이블**: `sessions`
- **이벤트**: `UPDATE` → `current_song_index` 변경
- **필터**: `id=eq.{sessionId}`
- **구독 채널**: `session:{sessionId}`

```typescript
const channel = supabase
  .channel(`session:${sessionId}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'sessions',
      filter: `id=eq.${sessionId}`,
    },
    (payload) => {
      // current_song_index 변경
      sessionPlayerStore.setCurrentIndex(payload.new.current_song_index);
    }
  )
  .subscribe();
```

#### 곡 네비게이션 API

```
PUT /api/sessions/{sessionId}/current-song-index
Body: { index: number }
Response: { success: boolean, current_song_index: number }
```

**권한 검증**:
- 팀장(created_by) 만 허용
- 인덱스 범위 검증 (0 ~ items.length - 1)
- 멘트 아이템도 count에 포함

**응답 에러**:
- 401: 인증 실패
- 403: 팀장 아님
- 400: 인덱스 범위 초과
- 409: 세션이 존재하지 않음

### 2-4. RLS 정책 검증

#### sessions 테이블
- **SELECT**: 팀 멤버 또는 created_by
- **UPDATE current_song_index**: created_by만

#### session_layers 테이블 (있을 경우)
- **SELECT**: 팀 멤버 또는 guest
- **INSERT**: 팀 멤버 또는 guest (user_id = auth.uid())
- **UPDATE**: 본인(user_id = auth.uid()) 또는 created_by(session creator)
- **DELETE**: created_by(session creator)만

### 2-5. 비즈니스 로직

#### 초기화 (initSession)
1. 세션 데이터 로드 (sessions, session_items)
2. 사용자 역할 판단
   - `session.created_by === auth.uid()` → creator
   - `session_members.find(m => m.user_id === auth.uid())` → member
   - 기타 → guest
3. 드로잉 레이어 로드 (session_layers)
4. Realtime 구독 시작

#### 곡 네비게이션 (setCurrentIndex)
1. 권한 확인 (creator만)
2. 인덱스 범위 검증
3. 낙관적 업데이트: 로컬 상태 선 업데이트
4. DB 업데이트: PUT /api/sessions/{id}/current-song-index
5. 실패 시 로컬 상태 롤백

#### 레이어 토글 (toggleLayerVisibility)
- 로컬 상태만 변경 (sessionPlayerStore.visibleLayers)
- DB 저장 불필요 (임시 표시)

#### Realtime 구독 (subscribeToSession)
1. 채널 생성 및 구독
2. 이벤트 핸들러 등록
3. 에러 시 폴링 백업 실행 (1초 간격, 최대 5회)

### 2-6. 권한 검증 로직 (클라이언트)

```typescript
// sessionPlayerStore 또는 유틸리티

function determineUserRole(
  session: Session,
  currentUser: User,
  teamMembers: TeamMember[],
  isGuest: boolean
): 'creator' | 'member' | 'guest' {
  if (isGuest) return 'guest';
  if (session.created_by === currentUser.id) return 'creator';
  if (teamMembers.some(m => m.user_id === currentUser.id && ['owner', 'editor'].includes(m.role))) {
    return 'member';
  }
  return 'guest';
}

function canNavigate(userRole: string): boolean {
  return userRole === 'creator';
}

function canAddLayer(userRole: string): boolean {
  return ['creator', 'member'].includes(userRole);
}

function canDeleteLayer(userRole: string, layerId: string, layers: SessionLayer[]): boolean {
  if (userRole !== 'creator') return false;
  // creator는 모든 레이어 삭제 가능
  return true;
}
```

### 2-7. 에러 처리 전략

| 상황 | 대응 |
|------|------|
| Realtime 구독 실패 | 폴링 백업 활성화 (1초 간격) |
| 네트워크 끊김 | Supabase 자동 재연결 + UI 상태 유지 |
| 권한 없는 요청 | 403 응답 + 권한 경고 표시 |
| 곡 인덱스 범위 초과 | 400 응답 + 경계값으로 클램핑 |
| 세션 로드 실패 | 에러 페이지 표시 + 홈 버튼 |

### 2-8. 성능 고려사항

- **Realtime 구독 정리**: 페이지 언마운트 시 반드시 `unsubscribe()` 호출
- **낙관적 업데이트**: 곡 네비게이션은 로컬 먼저, 후 DB 업데이트 (UI 반응성)
- **메모리 누수 방지**: Zustand store는 컴포넌트 언마운트 시 정리
- **레이어 토글**: 로컬 상태이므로 성능 영향 없음

### 2-9. 구현 순서 (백엔드 단계)

1. **Stage 1**: sessionPlayerStore 기본 구조 + initSession
   - 스토어 생성
   - 세션/아이템/레이어 로드
   - 역할 판단 로직

2. **Stage 2**: Realtime 구독 + 곡 네비게이션
   - 채널 구독 로직
   - setCurrentIndex 로직 (낙관적 업데이트)
   - API 엔드포인트 구현

3. **Stage 3**: 권한 검증 + 에러 처리
   - RLS 정책 확인
   - 클라이언트 검증 로직
   - 폴링 백업 구현

4. **Stage 4**: sessionStore 확장
   - updateCurrentSongIndex 메서드 추가
   - 기존 플로우와 통합

### 2-10. 주의사항

- sessions.current_song_index 컬럼 존재 확인 필수
- RLS 정책이 제대로 적용되어 있는지 테스트 필수
- Realtime 채널명이 고유해야 함 (session:{id} 형식 유지)
- 다중 탭에서 채널 이중 구독 방지 (싱글톤 패턴 또는 WeakMap)

---

## 통합 구현 순서

### Phase 1: 기본 구조
1. SessionPlayer 라우트 + 레이아웃
2. sessionPlayerStore 기본 + initSession
3. Header/Footer 기본 UI

### Phase 2: 네비게이션 & Realtime
4. 곡 네비게이션 로직
5. Realtime 구독 + 이벤트 핸들러
6. API 엔드포인트

### Phase 3: 악보 & 드로잉
7. 악보 렌더러 (PDF/이미지)
8. DrawingCanvas 통합
9. 레이어 토글 로직

### Phase 4: 고급 기능
10. LayerPanel UI + 상호작용
11. MentDisplay 전체화면
12. 게스트 리디렉션

### Phase 5: 마무리
13. 권한 검증 강화
14. 에러 처리 및 폴링
15. 성능 최적화 + 메모리 관리

---

## 파일 생성/수정 목록

### 신규 생성

```
src/app/session-player/[id]/
├── page.tsx
├── layout.tsx
└── components/
    ├── SessionPlayerHeader.tsx
    ├── SessionPlayerMain.tsx
    ├── SessionPlayerFooter.tsx
    ├── LayerPanel.tsx
    ├── MentDisplay.tsx
    └── SheetRenderer.tsx

src/stores/
└── sessionPlayerStore.ts

src/api/
└── sessions/
    └── [id]/
        └── current-song-index/
            └── route.ts
```

### 수정 대상

```
src/app/sessions/page.tsx
  → 카드에 ▶ 재생 버튼 추가

src/app/session-guest/[code]/page.tsx
  → /session-player/[id]?guest=true로 리다이렉트

src/stores/sessionStore.ts
  → updateCurrentSongIndex, subscribeToSessionUpdates 메서드 추가

src/types/index.ts
  → SessionLayer 타입 추가 (필요시)
```

---

## 테스트 전략

### UI 테스트
- [ ] 역할별 버튼 활성화 상태 확인
- [ ] 곡 슬라이더 렌더링
- [ ] 멘트 전체화면 표시
- [ ] 다크 모드 전환

### 기능 테스트
- [ ] 곡 네비게이션 (이전/다음)
- [ ] Realtime 동기화 (다중 탭)
- [ ] 레이어 토글
- [ ] 권한별 버튼 제어

### 통합 테스트
- [ ] 게스트 입장 → 플레이어로 이동
- [ ] 팀장이 곡 넘김 → 팀원/객원 자동 동기화
- [ ] 네트워크 끊김 후 복구

---

## 위험 관리

| 위험 | 영향 | 대응 |
|------|------|------|
| DrawingCanvas 성능 저하 | 높음 | Konva.js batchDraw 최적화 |
| Realtime 동기화 지연 | 높음 | 낙관적 업데이트 + 폴링 백업 |
| RLS 정책 오류로 인한 권한 누수 | 극심 | RLS 정책 재검토 + 테스트 |
| 메모리 누수 (Realtime 미정리) | 중간 | cleanup() 함수 자동 호출 |

