---
project: hamo
idea: sheet-music-collab
status: 2-4단계-설계진행
current_phase: design
current_step: 2-4
created: 2026-04-13
updated: 2026-04-13
tech_stack: React 18 + TypeScript + TailwindCSS, Konva.js, PDF.js, Supabase (DB + Auth + Storage + Realtime), Yjs + y-webrtc, Zustand, Vercel, PWA
test_level: unit + integration
review_count: 0
---

# 하모(Hamo) — 악보 협업 앱 설계 문서

## 프로젝트 개요

교회 음악팀이 예배/연습 중 실시간으로 악보를 공유하고 협업하는 PWA 앱.

**핵심 가치:**
- 크로스플랫폼 (iOS, Android, 웹) — PWA
- 실시간 협업 드로잉 (Konva.js + Yjs CRDT)
- 간편한 배포 (Vercel + URL 공유)
- 권한 기반 팀 관리 (Supabase RLS)

---

## 1단계 기능 설계도

### 1.1 화면 구조 (스크린 맵)

**3개 메인 탭 + 하위 화면**

```
┌─────────────────────────────────────────────────────────────┐
│ 하모 (Hamo)                               [User Avatar]     │
├─────────────────────────────────────────────────────────────┤
│ 🎼 악보관리  │ 🎭 세션관리  │ 👥 팀관리                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [메인 콘텐츠 영역]                                         │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│ [하단 네비게이션 또는 사이드바]                           │
└─────────────────────────────────────────────────────────────┘
```

#### 탭 1: 악보관리 (Sheet Library)

**1-1. 라이브러리 목록**
- 팀의 모든 곡 목록 (카드/리스트 뷰 전환 가능)
- 각 카드: 곡명, 아티스트, 최신 버전, 템포, 최근 수정일
- 검색/필터: 제목, 아티스트, 장르, 최근 사용
- 액션: 곡 선택 → 상세 화면, 삭제, 복제
- FAB: + 버튼으로 신규 악보 업로드

**1-2. 곡 상세 (Song Detail)**
- 곡 정보: 제목, 아티스트, 장르, 템포(BPM), 키(Key)
- 버전 관리: 현재 활성 버전, 버전 목록 (생성일, 업로드자, 파일명)
- 버전 선택 → 버전 상세
- 액션: 수정, 새 버전 업로드, 삭제

**1-3. 버전 상세 (Sheet Version Detail)**
- 악보 미리보기 (썸네일 또는 첫 페이지)
- 송폼 라벨 정보: [Verse] [Chorus] [Bridge] 등 마크 위치
- 레이어 설정: 드로잉 레이어 목록 (사용자별)
- 메타데이터 편집: 템포, 키, 커스텀 라벨 추가
- "세션에서 열기" 버튼

**1-4. 악보 업로드 (Upload Screen)**
- 파일 선택: JPG, PNG, PDF (최대 20페이지) (drag & drop 또는 클릭)
- 곡 정보 입력: 제목, 아티스트, 장르, 템포, 키
- 버전 타입 선택 (새 곡 vs 기존 곡에 버전 추가)
- 업로드 진행률 표시
- 성공/실패 피드백

#### 탭 2: 세션관리 (Session)

**2-1. 세션 목록**
- 현재 진행 중인 세션 (큰 카드)
- 최근 세션 목록 (작은 카드)
- 각 카드: 세션명, 진행 상태, 참여자 수, 현재 곡
- FAB: 새 세션 생성

**2-2. 세션 생성 (Create Session)**
- 세션명 입력
- 팀 선택 (만약 다중 팀 지원 시)
- 세트리스트 추가: 곡 검색 → 추가 → 순서 조정
- 시작 버튼 → 2-3으로 이동

**2-3. 세션 진행 (Session Player) — 핵심 화면**

**레이아웃:**
```
┌──────────────────────────────────────────────────┐
│ [현재 곡명] | [템포: 100 BPM] | [⏰ 시간]     │
├──────────────────────────────────────────────────┤
│                                                  │
│        [악보 영역 - PDF/JPG 렌더링]            │
│        (Konva.js 캔버스 오버레이)               │
│        (터치/마우스 드로잉 활성화)              │
│                                                  │
│  [송폼 네비게이션 바]                          │
│  [Verse][Chorus][Bridge][...]                  │
│                                                  │
├──────────────────────────────────────────────────┤
│ [◀ 이전곡] | [곡 선택 버튼] | [다음곡 ▶]    │
│ 또는 좌우 스와이프                              │
├──────────────────────────────────────────────────┤
│ [참여자 상태 패널]                             │
│ 👤 오너(편집중) | 👤 팀원1(연결됨) | 👤 팀원2  │
└──────────────────────────────────────────────────┘
```

**드로잉 도구바 (모바일/태블릿 기준):**
- [그리기 색상 선택] [굵기 조정] [지우기] [취소/재실행]
- 그리기 활성화/비활성화 토글
- 레이어 선택 (개인 레이어 vs 팀 레이어)

**기능:**
- 악보 드로잉: Konva.js 위에 자유 그리기 (터치/마우스/스타일러스)
- 송폼 네비게이션: 라벨 클릭 → 해당 위치로 스크롤/줌
- 곡 이동: 좌우 스와이프 또는 버튼 클릭
- 실시간 참여자 표시: Supabase Realtime 기반 연결 상태 동기화
- 템포 조정: 현재 세션의 BPM 변경 (모든 참여자에게 공유)
- **충돌 처리 (Pessimistic Lock):**
  - 한 사람이 드로잉 수정 모드 진입 → 다른 팀원의 편집 잠금
  - 수정 완료 또는 나가면 잠금 해제
  - 다른 사람에게는 "OOO님이 수정 중" 표시

**오너 전용:**
- "일괄 적용" 버튼: 자신의 드로잉을 원본 악보에 저장

**2-4. 세션 종료**
- 세션 마무리 확인
- 최종 통계: 참여자, 진행 시간, 변경 사항

#### 탭 3: 팀관리 (Team)

**3-1. 팀 목록**
- 내가 속한 팀 목록
- 각 팀 카드: 팀명, 멤버 수, 오너
- 팀 선택 → 3-2로 이동
- FAB: 새 팀 생성

**3-2. 팀 상세 (Team Detail)**
- 팀명, 설명 (오너만 편집 가능)
- 멤버 목록:
  - 프로필: 이름, 이메일, 역할 (Owner/Editor/Viewer/Guest)
  - 액션: 역할 변경 (오너만), 제거 (오너만)
- "멤버 초대" 버튼:
  - 이메일 입력 또는 초대 링크 복사
  - 초대 상태 추적: 대기 중, 수락, 거절
- 나가기 버튼 (오너 제외)

**3-3. 팀 설정 (Team Settings) — 오너만**
- 팀명 및 설명 수정
- 팀 삭제 (확인 필수)
- 권한 정책 설정 (향후 고도화)

---

### 1.2 데이터 흐름 (Data Flow Diagram)

#### 악보 업로드 플로우

```
사용자 [파일 선택]
  ↓
클라이언트 [파일 검증 + 압축]
  ↓
Supabase Storage [악보 파일 저장]
  ↓
DB [SheetVersions 레코드 생성]
  ↓
Realtime [팀의 다른 멤버에게 알림]
  ↓
UI [라이브러리 새로고침]
```

#### 세션 실시간 동기화 플로우

```
User A [곡 선택]
  ↓
Local Zustand 상태 업데이트
  ↓
Supabase Realtime [session 업데이트 브로드캐스트]
  ↓
User B, C [수신]
  ↓
Local Zustand 상태 동기화
  ↓
UI 리렌더링 [해당 악보 표시]
```

#### 드로잉 동기화 플로우 (Pessimistic Lock)

```
User A [수정 모드 진입 시도]
  ↓
Client [lock_sheet_version RPC 호출]
  ↓
Supabase [lock 레코드 생성, 다른 사용자는 잠금됨]
  ↓
User B, C [수신 - "User A가 수정 중" 표시]
  ↓
User A [Konva 드로잉]
  ↓
IndexedDB [로컬 상태 저장]
  ↓
User A [수정 완료 시 unlock_sheet_version RPC 호출]
  ↓
Supabase [lock 레코드 삭제]
  ↓
User B, C [수신 - 잠금 해제, 다시 편집 가능]
```

**오프라인 모드:**
- 네트워크 단절 시 로컬 IndexedDB에 변경사항 저장
- 네트워크 복귀 시 lock 상태 재확인 후 동기화

---

### 1.3 컴포넌트 구조 (Component Tree)

#### 최상위 구조

```
App
├── AuthProvider (Supabase 인증)
├── TeamProvider (현재 팀 컨텍스트)
├── SessionProvider (현재 세션 컨텍스트)
├── MainLayout
│   ├── Header
│   │   ├── Logo
│   │   ├── Breadcrumb
│   │   └── UserMenu
│   ├── NavigationTabs
│   │   ├── SheetLibraryTab
│   │   ├── SessionTab
│   │   └── TeamTab
│   ├── MainContent
│   │   └── [동적 콘텐츠 - 탭에 따라]
│   └── Footer (선택)
└── GlobalModal/Toast (에러, 성공 메시지)
```

#### SheetLibrary 탭 컴포넌트

```
SheetLibraryTab
├── SheetLibraryHeader
│   ├── SearchBar
│   └── FilterOptions
├── SheetList
│   └── SheetCard[]
│       ├── SheetThumbnail
│       ├── SheetMetadata
│       └── SheetActions (선택, 수정, 삭제)
├── SheetDetailModal (선택 시 노출)
│   ├── SongInfo
│   ├── VersionList
│   │   └── VersionItem[]
│   │       └── VersionDetail (클릭 시 전개)
│   ├── SheetPreview
│   └── Actions (세션에서 열기, 수정, 업로드)
└── UploadModal
    ├── FileDropZone
    ├── SongMetadataForm
    ├── UploadProgress
    └── Result (성공/실패)
```

#### Session 탭 컴포넌트

```
SessionTab
├── SessionListView
│   ├── ActiveSessionCard
│   └── RecentSessionsList[]
└── SessionPlayerView (세션 진행 중)
    ├── SessionHeader
    │   ├── SongTitle
    │   ├── Tempo (BPM 표시 + 수정)
    │   └── Timer
    ├── SheetViewer (핵심)
    │   ├── PDFRenderer 또는 ImageRenderer
    │   ├── KonvaDrawingCanvas (투명 오버레이)
    │   │   ├── DrawingToolbar
    │   │   ├── ColorPicker
    │   │   └── BrushSizeSlider
    │   └── SheetForm NavigationBar
    │       └── FormLabel[]
    ├── LockStatusIndicator
    │   └── (상태: 편집중, 잠금됨, 수정 가능)
    ├── SongNavigation
    │   ├── PrevButton
    │   ├── SongSelector
    │   └── NextButton
    ├── ParticipantPanel
    │   └── ParticipantBadge[]
    │       └── (상태: 편집중, 연결됨, 오프라인)
    └── SessionControls
        └── (오너용: 일괄 적용 버튼)
```

#### Team 탭 컴포넌트

```
TeamTab
├── TeamListView
│   └── TeamCard[]
│       └── (선택 → TeamDetailView)
└── TeamDetailView
    ├── TeamInfo
    │   ├── TeamName
    │   └── Description (오너 편집 가능)
    ├── MemberList
    │   └── MemberItem[]
    │       ├── Profile
    │       ├── Role Badge (Owner/Editor/Viewer/Guest)
    │       └── Actions (오너만: 역할 변경, 제거)
    ├── InviteSection
    │   ├── EmailInput
    │   ├── CopyInviteLink
    │   └── PendingInvites[]
    └── TeamSettings (오너만)
        └── (팀 정보 수정, 삭제)
```

---

### 1.4 상태 관리 (State Architecture)

**Zustand 스토어 분리:**

```typescript
// authStore: 사용자 인증 정보
- currentUser: User
- isAuthenticated: boolean
- login(email, password)
- logout()
- signup(email, password, name)

// teamStore: 팀 관련 상태
- teams: Team[]
- currentTeam: Team | null
- selectTeam(teamId)
- addTeam(team)
- updateTeam(teamId, updates)
- deleteTeam(teamId)

// sheetStore: 악보 라이브러리 상태
- sheets: SheetVersion[]
- selectedSheet: SheetVersion | null
- filters: { searchText, genre, artist, sortBy }
- loadSheets(teamId)
- uploadSheet(file, metadata)
- selectSheet(sheetId)
- updateFilters(filters)

// sessionStore: 세션 및 세트리스트 상태
- currentSession: Session | null
- setlist: Song[]
- currentSongIndex: number
- tempo: number
- participants: Participant[]
- isDrawingEnabled: boolean
- lockStatus: { lockedBy: string | null, lockedAt: timestamp }
- createSession(name, teamId)
- addToSetlist(song)
- removeFromSetlist(index)
- goToPreviousSong()
- goToNextSong()
- setTempo(bpm)
- toggleDrawing()
- acquireLock(sheetVersionId) [RPC 호출]
- releaseLock(sheetVersionId) [RPC 호출]
- broadcastSessionUpdate() [Realtime 호출]

// drawingStore: 로컬 드로잉 상태
- localShapes: Konva.Shape[]
- selectedTool: 'pen' | 'eraser' | ...
- brushColor: string
- brushSize: number
- undo()
- redo()
- saveLocal() [IndexedDB에 저장]
- applyToOriginal(ownerOnly) [오너만 실행]

// uiStore: UI 상태
- theme: 'light' | 'dark'
- sidebarOpen: boolean
- activeTab: 'sheets' | 'session' | 'team'
- modals: { [key: string]: boolean }
- openModal(key)
- closeModal(key)
```

**Supabase Realtime 구독:**
- `sessions` 테이블: 현재 세션 변경 (현재 곡, 템포)
- `sheet_locks` 테이블: 드로잉 편집 잠금 상태 (실시간 동기화)
- `participants` 테이블: 참여자 온오프라인 추적

**로컬 저장소:**
- IndexedDB: 최근 5개 악보 캐시 + 드로잉 로컬 큐 + lock 상태

---

### 1.5 API 엔드포인트 및 저장소 전략

#### 필요한 API (Supabase Edge Functions 또는 RPC)

**인증:**
- `POST /auth/signup` — 회원가입
- `POST /auth/login` — 로그인
- `POST /auth/logout` — 로그아웃
- `GET /auth/me` — 현재 사용자 정보

**팀 관리:**
- `GET /teams` — 내 팀 목록
- `POST /teams` — 팀 생성
- `GET /teams/{id}` — 팀 상세
- `PATCH /teams/{id}` — 팀 정보 수정
- `DELETE /teams/{id}` — 팀 삭제
- `GET /teams/{id}/members` — 팀 멤버 목록
- `POST /teams/{id}/members` — 멤버 초대 (Guest 역할 포함)
- `PATCH /teams/{id}/members/{userId}` — 역할 변경
- `DELETE /teams/{id}/members/{userId}` — 멤버 제거

**악보 관리:**
- `GET /sheets` (query: teamId) — 팀의 악보 목록
- `POST /sheets` — 악보 업로드 (파일 + 메타데이터)
- `GET /sheets/{id}` — 악보 상세
- `GET /sheets/{id}/versions` — 버전 목록
- `POST /sheets/{id}/versions` — 새 버전 업로드 (최대 20페이지)
- `DELETE /sheets/{id}` — 악보 삭제
- `PATCH /sheets/{id}` — 악보 메타데이터 수정

**세션 관리:**
- `POST /sessions` — 세션 생성
- `GET /sessions/{id}` — 세션 상세
- `PATCH /sessions/{id}` — 세션 정보 수정 (현재 곡, 템포)
- `DELETE /sessions/{id}` — 세션 종료
- `GET /sessions/{id}/setlist` — 세트리스트 조회
- `POST /sessions/{id}/setlist` — 세트리스트 추가
- `PATCH /sessions/{id}/song` — 현재 곡 변경 [Realtime 트리거]

**드로잉 및 잠금:**
- `POST /rpc/lock_sheet_version` — 악보 버전 편집 잠금 (Pessimistic Lock 획득)
- `POST /rpc/unlock_sheet_version` — 악보 버전 편집 잠금 해제
- `GET /sheet_locks` (query: sheetVersionId) — 현재 잠금 상태 조회
- `POST /annotations` — 주석 저장 (로컬 Konva 객체)
- `DELETE /annotations/{id}` — 주석 삭제
- `POST /sheets/{id}/apply` — 오너: 드로잉 원본 적용 (LWW 정책)

#### 저장소 전략

**Supabase Storage:**
- `teams/{teamId}/sheets/{sheetId}/` — 악보 원본 파일
- `teams/{teamId}/sheets/{sheetId}/versions/{versionId}/` — 버전별 파일 (최대 20페이지)
- 접근 권한: 팀 멤버만 읽기, 업로드자만 삭제

**데이터베이스 저장:**
- 잠금 상태: `sheet_locks` 테이블 (sheet_version_id, locked_by_user_id, locked_at, expires_at)
- 드로잉: `sheet_annotations` 테이블 (annotation_data JSONB, created_by_user_id)
  - 형식: Konva.js 오브젝트 JSON
- 세션 상태: `sessions` 테이블 (current_song_index, tempo, is_active)
- 참여자 상태: `session_participants` 테이블 (status, last_activity_at)

**오프라인 캐싱:**
- IndexedDB: 최근 5개 악보 캐시 + 드로잉 로컬 큐 + lock 상태
- Service Worker: 오프라인 시 캐시된 데이터 제공

---

### 1.6 권한 및 보안 (RLS 정책)

**Row Level Security (Supabase):**

```sql
-- teams: 멤버만 조회 가능
SELECT * FROM teams
  WHERE id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
  )

-- team_members: 자신의 역할만 조회 가능, 역할 변경은 Owner만
SELECT * FROM team_members
  WHERE team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
  )

-- sheets: 팀 멤버만 조회/생성 가능
SELECT * FROM sheets
  WHERE team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
  )

-- sheet_locks: 잠금 상태는 누구나 조회 가능, 생성/삭제는 자신의 잠금만 가능
SELECT * FROM sheet_locks
  WHERE sheet_version_id IN (
    SELECT id FROM sheet_versions
    WHERE sheet_id IN (
      SELECT id FROM sheets
      WHERE team_id IN (
        SELECT team_id FROM team_members
        WHERE user_id = auth.uid()
      )
    )
  )

-- sheet_annotations: 팀 멤버 또는 자신이 생성한 것만 조회
SELECT * FROM sheet_annotations
  WHERE (
    sheet_version_id IN (
      SELECT id FROM sheet_versions
      WHERE sheet_id IN (
        SELECT id FROM sheets
        WHERE team_id IN (
          SELECT team_id FROM team_members
          WHERE user_id = auth.uid()
        )
      )
    )
  ) OR created_by = auth.uid()

-- sessions: 팀 멤버만 생성/조회/수정 가능
-- 삭제: 세션 생성자 또는 팀 오너만

-- participants: 세션 멤버만 조회
```

**권한 레벨:**
- **Owner:** 팀 생성/삭제, 멤버 관리, 악보 일괄 적용
- **Editor:** 악보 업로드/수정, 드로잉, 세션 생성
- **Viewer:** 조회만, 드로잉 불가
- **Guest:** 초대 링크로 임시 세션 참여만 가능, 팀 멤버 아님 (Phase 1 MVP에 포함)

---

### 1.7 에러 처리 및 예외 케이스

| 상황 | 처리 |
|------|------|
| 네트워크 단절 | 로컬 IndexedDB에 변경사항 저장, 복귀 시 lock 상태 재확인 후 동기화 |
| 드로잉 동기화 실패 | 재시도 (exponential backoff) 또는 수동 새로고침 |
| Lock 획득 실패 | "다른 사용자가 편집 중입니다" 메시지 표시, 재시도 버튼 제공 |
| Lock 타임아웃 | 30분 후 자동 해제 (expires_at), 사용자 재연결 시 새로 획득 |
| 권한 부재 | UI 버튼 비활성화 + 시도 시 오류 토스트 |
| 파일 업로드 실패 | 재시도 또는 브라우저 에러 보고 |
| 세션 타임아웃 | 30분 후 자동 종료, 사용자 확인 다이얼로그 |
| PDF 페이지 초과 (>20) | 업로드 거부, "최대 20페이지까지 업로드 가능합니다" 메시지 표시 |

---

## 설계 확정 사항

### 화면 수: 9개 (MVP)
1. 라이브러리 목록
2. 곡 상세
3. 버전 상세
4. 악보 업로드
5. 세션 목록
6. 세션 생성
7. 세션 진행 (Player) ← 핵심
8. 팀 목록
9. 팀 상세

### 주요 결정 사항

✓ **드로잉 렌더링:** Konva.js (크로스플랫폼, 터치/마우스/스타일러스 지원)
✓ **동시 편집 제어:** Pessimistic Lock (한 사람 편집 시 다른 사람 잠금, "OOO님이 수정 중" 표시)
✓ **실시간 협업:** Supabase Realtime (세션/잠금 상태 동기화)
✓ **오프라인 지원:** IndexedDB (로컬 큐 저장 + 네트워크 복귀 시 동기화)
✓ **권한 관리:** LWW (Last Write Wins) 정책 + 오너 일괄 적용
✓ **파일 형식:** JPG/PNG (드로잉 가능) + PDF (조회, 최대 20페이지)
✓ **팀 권한:** Owner/Editor/Viewer/Guest (Phase 1 MVP에 모두 포함)
✓ **상태 관리:** Zustand (간단하고 빠름)
✓ **DB:** Supabase (RLS + Realtime + Storage 통합)
✓ **배포:** Vercel (PWA + 자동 배포)

---

## 2단계: UI 상세 + 데이터 요구사항

### 2.1 화면별 컴포넌트 트리 상세

#### SheetLibraryTab - 라이브러리 목록

**컴포넌트 트리:**
```
SheetLibraryTab
├── Header
│   ├── Title
│   └── ViewToggle (Card/List)
├── SearchBar
│   ├── SearchInput
│   └── FilterButton
├── FilterPanel (펼쳐짐)
│   ├── GenreFilter (checkbox)
│   ├── ArtistFilter (checkbox)
│   ├── SortBy (dropdown)
│   └── ApplyButton
├── SheetGrid (카드) 또는 SheetList (리스트)
│   └── SheetCard[]
│       ├── Image (썸네일)
│       ├── Title
│       ├── Artist
│       ├── Tempo
│       ├── LastModified
│       └── ActionMenu (⋮ 더보기)
└── FloatingActionButton (+ 새 악보)
```

**데이터 요구사항:**
- `sheets` 테이블에서: id, title, artist, genre, tempo, thumbnail_url, updated_at, team_id
- 필터링: genre, artist 기반 검색

#### SheetDetailModal - 곡 상세

**컴포넌트 트리:**
```
SheetDetailModal
├── Header
│   ├── Title
│   ├── Artist
│   └── CloseButton
├── MetadataSection
│   ├── Genre
│   ├── Tempo (BPM)
│   ├── Key
│   └── EditButton (Owner/Editor만)
├── VersionTabs
│   └── VersionItem[]
│       ├── VersionLabel
│       ├── CreatedDate
│       ├── CreatedBy
│       └── SelectButton
├── VersionDetailSection (선택 시)
│   ├── Thumbnail
│   ├── FormLabels (송폼 정보)
│   ├── LayerInfo
│   └── MetadataDisplay
└── ActionButtons
    ├── OpenInSession
    ├── Edit
    └── Delete (Owner/Editor만)
```

**데이터 요구사항:**
- `sheets` 테이블: id, title, artist, genre, tempo, key
- `sheet_versions` 테이블: id, sheet_id, version_number, created_at, created_by, file_url, page_count

#### SessionPlayerView - 세션 진행 (핵심)

**컴포넌트 트리:**
```
SessionPlayerView
├── SessionHeader
│   ├── SongTitle
│   ├── TempoControl (슬라이더 + 숫자 입력)
│   └── Timer
├── SheetViewerContainer
│   ├── PDFRenderer 또는 ImageRenderer
│   │   └── (클릭 시 확대/축소)
│   └── KonvaDrawingCanvas (투명 오버레이)
│       ├── DrawingToolbar
│       │   ├── ColorPicker
│       │   ├── BrushSizeSlider
│       │   ├── EraserButton
│       │   ├── UndoButton
│       │   └── RedoButton
│       └── [그리기 가능 영역]
├── FormNavigationBar
│   └── FormLabel[] (e.g., [Verse] [Chorus] [Bridge])
├── LockStatusIndicator
│   └── (상태: "홍길동님이 수정 중", "수정 가능", "다른 사람이 수정 중")
├── SongNavigationButtons
│   ├── PrevButton
│   ├── SongSelector (dropdown)
│   └── NextButton
├── ParticipantPanel
│   └── ParticipantBadge[]
│       ├── UserAvatar
│       ├── UserName
│       └── StatusIndicator (편집중, 연결됨, 오프라인)
└── SessionControls
    ├── ApplyButton (Owner만)
    └── EndSessionButton (Owner만)
```

**데이터 요구사항:**
- `sessions` 테이블: id, current_song_index, tempo, is_active, created_by
- `session_participants` 테이블: session_id, user_id, status, last_activity_at
- `sheet_locks` 테이블: sheet_version_id, locked_by_user_id, locked_at, expires_at
- `sheet_annotations` 테이블: sheet_version_id, created_by, annotation_data (JSONB)

#### TeamDetailView - 팀 상세

**컴포넌트 트리:**
```
TeamDetailView
├── TeamHeader
│   ├── TeamName
│   ├── Description
│   └── EditButton (Owner만)
├── MemberListSection
│   ├── MemberCount
│   └── MemberItem[]
│       ├── UserAvatar
│       ├── UserName
│       ├── RoleBadge (Owner/Editor/Viewer/Guest)
│       └── ActionMenu (Owner만: 역할 변경, 제거)
├── InviteSection
│   ├── EmailInput
│   ├── RoleSelector (Owner/Editor/Viewer/Guest)
│   ├── SendInviteButton
│   └── CopyInviteLinkButton
├── PendingInvites (Owner만)
│   └── InviteItem[]
│       ├── Email
│       ├── Status (대기중, 수락, 거절)
│       └── ResendButton
└── DangerZone (Owner만)
    └── DeleteTeamButton
```

**데이터 요구사항:**
- `teams` 테이블: id, name, description, created_by, created_at
- `team_members` 테이블: team_id, user_id, role, invited_at, accepted_at

### 2.2 상태 업데이트 및 이벤트

**SessionPlayerView 핵심 상태 변화:**

1. **편집 모드 진입:**
   - 사용자가 "드로잉 활성화" 클릭
   - `lock_sheet_version` RPC 호출
   - Lock 획득 성공 → drawing_enabled = true, lock_status = "locked_by_me"
   - Lock 획득 실패 → 토스트 "다른 사람이 편집 중입니다" 표시

2. **드로잉 중:**
   - Konva 드로잉 이벤트 → IndexedDB에 로컬 저장
   - Realtime 구독 시 다른 사용자의 lock 상태 변화 감지

3. **편집 완료:**
   - 사용자가 "저장" 또는 화면 나감
   - `unlock_sheet_version` RPC 호출
   - Lock 해제 완료 → drawing_enabled = false, lock_status = null

4. **참여자 상태 업데이트:**
   - Realtime `session_participants` 구독
   - last_activity_at 갱신 → UI에 "연결됨" 표시
   - 30초 이상 활동 없음 → "오프라인" 표시

### 2.3 API 엔드포인트 입출력

**Lock 관련 RPC:**

```
POST /rpc/lock_sheet_version
  Input:  { sheet_version_id: string }
  Output: {
    success: boolean
    locked_by_user_id: string
    locked_at: timestamp
    expires_at: timestamp
    message?: string
  }

POST /rpc/unlock_sheet_version
  Input:  { sheet_version_id: string }
  Output: {
    success: boolean
    message?: string
  }
```

**드로잉 저장 API:**

```
POST /annotations
  Input: {
    sheet_version_id: string
    annotation_data: object (Konva 객체 JSON)
  }
  Output: {
    id: string
    created_at: timestamp
  }
```

**세션 업데이트 API (Realtime 트리거):**

```
PATCH /sessions/{id}
  Input: {
    current_song_index?: number
    tempo?: number
  }
  Output: {
    id: string
    updated_at: timestamp
  }

PATCH /sessions/{id}/song
  Input: {
    song_index: number
  }
  Output: {
    success: boolean
    current_song_index: number
    updated_at: timestamp
  }
```

---

## 3단계: DB 스키마 + 저장소 확정

### 3.1 테이블 설계

#### users 테이블 (Supabase Auth에서 확장)
```
id (uuid) — 사용자 ID
email (text, unique) — 이메일
display_name (text) — 표시 이름
avatar_url (text, nullable) — 프로필 사진
created_at (timestamp) — 생성일
updated_at (timestamp) — 수정일
```

#### teams 테이블
```
id (uuid, PK) — 팀 ID
name (text) — 팀 이름
description (text, nullable) — 팀 설명
created_by (uuid, FK → users.id) — 팀 생성자
created_at (timestamp) — 생성일
updated_at (timestamp) — 수정일

INDEX: created_by, updated_at
```

#### team_members 테이블
```
id (uuid, PK) — 멤버십 ID
team_id (uuid, FK → teams.id) — 팀 ID
user_id (uuid, FK → users.id) — 사용자 ID
role (text) — 역할 (Owner/Editor/Viewer/Guest)
invited_at (timestamp) — 초대 시간
accepted_at (timestamp, nullable) — 수락 시간
created_at (timestamp)

UNIQUE: (team_id, user_id)
INDEX: team_id, user_id, role
```

#### sheets 테이블
```
id (uuid, PK) — 악보 ID
team_id (uuid, FK → teams.id) — 팀 ID
title (text) — 곡명
artist (text) — 아티스트
genre (text, nullable) — 장르
tempo (integer, nullable) — 템포 (BPM)
key (text, nullable) — 음정 (C, D, E, ...)
created_by (uuid, FK → users.id) — 업로드자
active_version_id (uuid, FK → sheet_versions.id, nullable) — 활성 버전
created_at (timestamp)
updated_at (timestamp)

INDEX: team_id, created_by, updated_at
```

#### sheet_versions 테이블
```
id (uuid, PK) — 버전 ID
sheet_id (uuid, FK → sheets.id) — 악보 ID
version_number (integer) — 버전 번호
file_url (text) — Storage 경로
file_format (text) — 파일 형식 (jpg/png/pdf)
page_count (integer) — 페이지 수
created_by (uuid, FK → users.id) — 업로드자
created_at (timestamp)

INDEX: sheet_id, version_number
CONSTRAINT: page_count <= 20 (트리거로 검증)
```

#### sheet_locks 테이블 (Pessimistic Lock)
```
id (uuid, PK) — 잠금 ID
sheet_version_id (uuid, FK → sheet_versions.id) — 악보 버전 ID
locked_by_user_id (uuid, FK → users.id) — 잠금 소유자
locked_at (timestamp) — 잠금 시간
expires_at (timestamp) — 잠금 만료 시간 (30분 후)
created_at (timestamp)

UNIQUE: sheet_version_id (한 번에 하나만 잠금)
INDEX: sheet_version_id, locked_by_user_id, expires_at
```

#### sheet_annotations 테이블
```
id (uuid, PK) — 주석 ID
sheet_version_id (uuid, FK → sheet_versions.id) — 악보 버전 ID
created_by (uuid, FK → users.id) — 생성자
annotation_data (jsonb) — Konva 드로잉 객체
created_at (timestamp)
updated_at (timestamp)

INDEX: sheet_version_id, created_by, created_at
```

#### sessions 테이블
```
id (uuid, PK) — 세션 ID
team_id (uuid, FK → teams.id) — 팀 ID
name (text) — 세션명
created_by (uuid, FK → users.id) — 세션 생성자
current_song_index (integer) — 현재 곡 인덱스
tempo (integer) — 템포 (BPM)
is_active (boolean) — 활성 여부
started_at (timestamp) — 시작 시간
ended_at (timestamp, nullable) — 종료 시간
created_at (timestamp)
updated_at (timestamp)

INDEX: team_id, is_active, created_at
```

#### session_participants 테이블
```
id (uuid, PK) — 참여 ID
session_id (uuid, FK → sessions.id) — 세션 ID
user_id (uuid, FK → users.id) — 사용자 ID
status (text) — 상태 (connected/disconnected/offline)
last_activity_at (timestamp) — 마지막 활동 시간
created_at (timestamp)

UNIQUE: (session_id, user_id)
INDEX: session_id, status, last_activity_at
```

#### session_setlist 테이블
```
id (uuid, PK) — 세트리스트 항목 ID
session_id (uuid, FK → sessions.id) — 세션 ID
sheet_version_id (uuid, FK → sheet_versions.id) — 악보 버전 ID
order (integer) — 재생 순서
created_at (timestamp)

UNIQUE: (session_id, order)
INDEX: session_id, order
```

### 3.2 관계도

```
users
  ├── 1 ──────┐
  │           N
  teams ──────── team_members ──────── users
  │ (created_by)    (PK: team_id, user_id)
  │
  N
  │
  sheets ──────────────────────┐
  (team_id)                    │
  │                            │
  N                            N
  │                            │
  sheet_versions ── sheet_locks
  (1 ──────────────→ N)
  │
  N
  │
  sheet_annotations
  │
  └─ session_setlist ──── sessions
     (M:N 관계)          (team_id)
                          │
                          N
                          │
                       session_participants
                       (M:N 관계)
```

### 3.3 저장소 전략

**Supabase Storage Buckets:**

```
hamo-sheets/ (private)
├── {team_id}/
    ├── sheets/{sheet_id}/
    │   ├── original/
    │   │   └── {file_name}.{jpg|png|pdf}
    │   └── versions/{version_id}/
    │       └── {file_name}.{jpg|png|pdf}
```

**접근 권한:**
- Read: 팀 멤버 (RLS 정책으로 팀 멤버인지 확인)
- Write: 업로드자 (user_id 확인)
- Delete: 업로드자 또는 Owner

### 3.4 RLS 정책 최종

```sql
-- teams
CREATE POLICY "User can view teams they are member of"
ON public.teams FOR SELECT
USING (
  id IN (
    SELECT team_id FROM public.team_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "User can create teams"
ON public.teams FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owner can update team"
ON public.teams FOR UPDATE
USING (
  id IN (
    SELECT team_id FROM public.team_members
    WHERE user_id = auth.uid() AND role = 'Owner'
  )
);

-- team_members
CREATE POLICY "User can view team members"
ON public.team_members FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM public.team_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Owner can manage members"
ON public.team_members FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT team_id FROM public.team_members
    WHERE user_id = auth.uid() AND role = 'Owner'
  )
);

-- sheets
CREATE POLICY "User can view team sheets"
ON public.sheets FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM public.team_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Editor can upload sheets"
ON public.sheets FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT team_id FROM public.team_members
    WHERE user_id = auth.uid() AND role IN ('Owner', 'Editor')
  )
);

-- sheet_locks (Pessimistic Lock)
CREATE POLICY "User can view locks"
ON public.sheet_locks FOR SELECT
USING (
  sheet_version_id IN (
    SELECT id FROM public.sheet_versions
    WHERE sheet_id IN (
      SELECT id FROM public.sheets
      WHERE team_id IN (
        SELECT team_id FROM public.team_members
        WHERE user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "User can create own lock"
ON public.sheet_locks FOR INSERT
WITH CHECK (auth.uid() = locked_by_user_id);

CREATE POLICY "User can delete own lock"
ON public.sheet_locks FOR DELETE
USING (auth.uid() = locked_by_user_id);

-- sheet_annotations
CREATE POLICY "User can view annotations"
ON public.sheet_annotations FOR SELECT
USING (
  sheet_version_id IN (
    SELECT id FROM public.sheet_versions
    WHERE sheet_id IN (
      SELECT id FROM public.sheets
      WHERE team_id IN (
        SELECT team_id FROM public.team_members
        WHERE user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "User can create annotations"
ON public.sheet_annotations FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  sheet_version_id IN (
    SELECT id FROM public.sheet_versions
    WHERE sheet_id IN (
      SELECT id FROM public.sheets
      WHERE team_id IN (
        SELECT team_id FROM public.team_members
        WHERE user_id = auth.uid()
      )
    )
  )
);

-- sessions
CREATE POLICY "User can view team sessions"
ON public.sessions FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM public.team_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Editor can create sessions"
ON public.sessions FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT team_id FROM public.team_members
    WHERE user_id = auth.uid() AND role IN ('Owner', 'Editor')
  )
);

-- session_participants
CREATE POLICY "User can view session participants"
ON public.session_participants FOR SELECT
USING (
  session_id IN (
    SELECT id FROM public.sessions
    WHERE team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "User can create own participation"
ON public.session_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

### 3.5 DDL (마이그레이션)

```sql
-- 테이블 생성 순서

-- 1. users (Supabase Auth 사용, public에서 확장)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. teams
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_teams_created_by ON public.teams(created_by);
CREATE INDEX idx_teams_updated_at ON public.teams(updated_at);

-- 3. team_members
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('Owner', 'Editor', 'Viewer', 'Guest')),
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_members_role ON public.team_members(role);

-- 4. sheets
CREATE TABLE public.sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT,
  genre TEXT,
  tempo INTEGER,
  key TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  active_version_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_sheets_team_id ON public.sheets(team_id);
CREATE INDEX idx_sheets_created_by ON public.sheets(created_by);
CREATE INDEX idx_sheets_updated_at ON public.sheets(updated_at);

-- 5. sheet_versions
CREATE TABLE public.sheet_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.sheets(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_format TEXT NOT NULL CHECK(file_format IN ('jpg', 'png', 'pdf')),
  page_count INTEGER NOT NULL DEFAULT 1 CHECK(page_count <= 20),
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(sheet_id, version_number)
);
CREATE INDEX idx_sheet_versions_sheet_id ON public.sheet_versions(sheet_id);

-- 6. sheet_locks (Pessimistic Lock)
CREATE TABLE public.sheet_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_version_id UUID NOT NULL REFERENCES public.sheet_versions(id) ON DELETE CASCADE,
  locked_by_user_id UUID NOT NULL REFERENCES public.users(id),
  locked_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(sheet_version_id)
);
CREATE INDEX idx_sheet_locks_sheet_version_id ON public.sheet_locks(sheet_version_id);
CREATE INDEX idx_sheet_locks_locked_by ON public.sheet_locks(locked_by_user_id);
CREATE INDEX idx_sheet_locks_expires_at ON public.sheet_locks(expires_at);

-- 7. sheet_annotations
CREATE TABLE public.sheet_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_version_id UUID NOT NULL REFERENCES public.sheet_versions(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id),
  annotation_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_sheet_annotations_sheet_version_id ON public.sheet_annotations(sheet_version_id);
CREATE INDEX idx_sheet_annotations_created_by ON public.sheet_annotations(created_by);

-- 8. sessions
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  current_song_index INTEGER DEFAULT 0,
  tempo INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_sessions_team_id ON public.sessions(team_id);
CREATE INDEX idx_sessions_is_active ON public.sessions(is_active);
CREATE INDEX idx_sessions_created_at ON public.sessions(created_at);

-- 9. session_participants
CREATE TABLE public.session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'connected' CHECK(status IN ('connected', 'disconnected', 'offline')),
  last_activity_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);
CREATE INDEX idx_session_participants_session_id ON public.session_participants(session_id);
CREATE INDEX idx_session_participants_status ON public.session_participants(status);

-- 10. session_setlist
CREATE TABLE public.session_setlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  sheet_version_id UUID NOT NULL REFERENCES public.sheet_versions(id),
  order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, order)
);
CREATE INDEX idx_session_setlist_session_id ON public.session_setlist(session_id);

-- Foreign key for sheets.active_version_id (FK 추가)
ALTER TABLE public.sheets
ADD CONSTRAINT fk_sheets_active_version_id
FOREIGN KEY (active_version_id) REFERENCES public.sheet_versions(id) ON DELETE SET NULL;
```

### 3.6 마이그레이션 전략

**초기 배포:**
1. 모든 테이블 및 인덱스 생성
2. RLS 정책 적용
3. Realtime 활성화: sessions, sheet_locks, session_participants

**향후 확장:**
- `sheet_versions` 페이지 제한 증가 필요 시: `page_count <= 50` 변경
- 더 많은 메타데이터 필요 시: `sheets` JSONB 컬럼 추가
- 팀 권한 정책 추가 필요 시: `team_policies` 테이블 신규 생성

---

## 4단계: 백엔드 + 인프라 설계

### 4.1 API 엔드포인트 상세

#### 인증 (Supabase Auth)

```
POST /auth/v1/signup
  Input: {
    email: string
    password: string
    data: { display_name: string }
  }
  Output: {
    user: { id, email, display_name }
    session: { access_token, refresh_token }
  }

POST /auth/v1/signin
  Input: {
    email: string
    password: string
  }
  Output: {
    user: { id, email, display_name }
    session: { access_token, refresh_token }
  }

POST /auth/v1/logout
  Output: { success: boolean }

GET /auth/v1/user
  Output: { id, email, display_name, avatar_url }
```

#### 팀 관리

```
GET /rest/v1/teams
  Query: none
  Auth: required
  Output: Team[]

POST /rest/v1/teams
  Input: { name: string, description?: string }
  Auth: required
  Output: { id, name, description, created_by, created_at }

GET /rest/v1/teams/{id}
  Auth: required (RLS: 멤버만)
  Output: Team

PATCH /rest/v1/teams/{id}
  Input: { name?: string, description?: string }
  Auth: required (Owner만)
  Output: Team

DELETE /rest/v1/teams/{id}
  Auth: required (Owner만)
  Output: { success: boolean }

GET /rest/v1/teams/{id}/members
  Auth: required
  Output: TeamMember[]

POST /rest/v1/teams/{id}/members
  Input: { user_id?: string, email?: string, role: 'Owner'|'Editor'|'Viewer'|'Guest' }
  Auth: required (Owner만)
  Output: { id, email, role, invited_at, accepted_at }

PATCH /rest/v1/teams/{id}/members/{userId}
  Input: { role: string }
  Auth: required (Owner만)
  Output: TeamMember

DELETE /rest/v1/teams/{id}/members/{userId}
  Auth: required (Owner만)
  Output: { success: boolean }
```

#### 악보 관리

```
GET /rest/v1/sheets?team_id={teamId}
  Query: team_id (required)
  Auth: required
  Output: Sheet[]

POST /rest/v1/sheets
  Input: {
    team_id: string
    title: string
    artist?: string
    genre?: string
    tempo?: number
    key?: string
  }
  Auth: required (Editor 이상)
  Output: { id, team_id, title, ... }

GET /rest/v1/sheets/{id}
  Auth: required
  Output: Sheet

PATCH /rest/v1/sheets/{id}
  Input: { title?, artist?, genre?, tempo?, key? }
  Auth: required (Editor 이상)
  Output: Sheet

DELETE /rest/v1/sheets/{id}
  Auth: required (Owner 또는 생성자)
  Output: { success: boolean }

GET /rest/v1/sheets/{id}/versions
  Auth: required
  Output: SheetVersion[]

POST /rest/v1/sheets/{id}/versions
  Input: { file: File, file_format: 'jpg'|'png'|'pdf', page_count: number }
  Auth: required (Editor 이상)
  ValidationRule: page_count <= 20
  Output: { id, sheet_id, version_number, file_url, page_count, ... }

DELETE /rest/v1/sheets/{id}/versions/{versionId}
  Auth: required (생성자만)
  Output: { success: boolean }
```

#### 세션 관리

```
GET /rest/v1/sessions?team_id={teamId}
  Query: team_id (required)
  Auth: required
  Output: Session[]

POST /rest/v1/sessions
  Input: {
    team_id: string
    name: string
  }
  Auth: required (Editor 이상)
  Output: { id, team_id, name, is_active, ... }

GET /rest/v1/sessions/{id}
  Auth: required
  Output: Session

PATCH /rest/v1/sessions/{id}
  Input: { name?, current_song_index?, tempo?, is_active? }
  Auth: required (Owner 또는 생성자)
  Output: Session [Realtime 트리거]

DELETE /rest/v1/sessions/{id}
  Auth: required (Owner 또는 생성자)
  Output: { success: boolean }

GET /rest/v1/sessions/{id}/setlist
  Auth: required
  Output: { order: number, sheet_version_id: string }[]

POST /rest/v1/sessions/{id}/setlist
  Input: { sheet_version_id: string, order: number }
  Auth: required (Editor 이상)
  Output: { id, session_id, sheet_version_id, order }

DELETE /rest/v1/sessions/{id}/setlist/{setlistId}
  Auth: required
  Output: { success: boolean }

GET /rest/v1/sessions/{id}/participants
  Auth: required
  Output: SessionParticipant[]

POST /rest/v1/sessions/{id}/participants
  Input: { user_id?: string, guest_token?: string }
  Auth: required 또는 guest_token
  Output: { id, session_id, user_id, status, ... }

PATCH /rest/v1/sessions/{id}/participants/{participantId}
  Input: { status: 'connected'|'disconnected'|'offline' }
  Auth: required
  Output: SessionParticipant [Realtime 트리거]
```

#### 드로잉 및 잠금 (RPC)

```
POST /rest/v1/rpc/lock_sheet_version
  Input: { sheet_version_id: string }
  Auth: required
  Output: {
    success: boolean
    locked_by_user_id: string
    locked_at: timestamp
    expires_at: timestamp
    message?: string
  }
  Errors:
    - 409: 이미 다른 사용자가 잠금
    - 403: 권한 없음

POST /rest/v1/rpc/unlock_sheet_version
  Input: { sheet_version_id: string }
  Auth: required
  Output: { success: boolean, message?: string }

GET /rest/v1/sheet_locks?sheet_version_id={id}
  Auth: required
  Output: SheetLock[]

POST /rest/v1/annotations
  Input: {
    sheet_version_id: string
    annotation_data: object (Konva JSON)
  }
  Auth: required
  Output: { id, sheet_version_id, created_by, created_at }

GET /rest/v1/annotations?sheet_version_id={id}
  Auth: required
  Output: Annotation[]

DELETE /rest/v1/annotations/{id}
  Auth: required (생성자만)
  Output: { success: boolean }

POST /rest/v1/rpc/apply_annotations
  Input: { sheet_version_id: string }
  Auth: required (Owner만)
  Output: { success: boolean, message: string }
```

### 4.2 인증/인가 설계

**Session/Token 관리:**
- Supabase Auth JWT 사용
- Access Token: 1시간 유효
- Refresh Token: 30일 유효
- 클라이언트: localStorage에 토큰 저장 (또는 httpOnly 쿠키)

**권한 검증:**
- Edge Function 미들웨어에서 `auth.uid()` 사용
- RLS 정책으로 데이터베이스 레벨 검증
- API 레벨에서도 추가 검증 (예: Owner 확인)

**Guest 모드:**
- 초대 링크: `/session/{sessionId}?token={guestToken}`
- Guest Token: Session 참여용만, 팀 멤버 권한 없음
- Guest 역할: team_members 테이블에서 'Guest' 역할
- 권한: 현재 세션만 조회/참여 가능, 악보 라이브러리 비접근

### 4.3 배포 인프라

**프론트엔드:**
- Vercel (Next.js 호스팅)
- GitHub 연동: main 브랜치 자동 배포
- Environment: production, preview, development
- CDN: Vercel Edge Network 기본 제공
- PWA: next-pwa 패키지 + Service Worker
- Build Command: `next build`
- Start Command: `next start`

**백엔드:**
- Supabase (관리형 PostgreSQL)
- Edge Functions (API 엔드포인트)
- Realtime (WebSocket)
- Storage (파일 저장)
- Auth (JWT 관리)

**데이터베이스:**
- PostgreSQL 15+
- Replication: Supabase 기본 제공 (read replicas 선택 가능)
- Backups: 자동 일일 백업 + 7일 보관

**CDN/Storage:**
- Supabase Storage (S3 호환)
- 캐시 정책: 악보 파일 1년 (immutable), 메타데이터 1시간

### 4.4 환경변수 최종 (.env.example)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyxxxx...
SUPABASE_SERVICE_ROLE_KEY=eyxxxx...

# Auth (Supabase Auth 사용)
NEXT_PUBLIC_SUPABASE_AUTH_URL=https://xxxxx.supabase.co/auth/v1

# API 엔드포인트
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_SUPABASE_REST_URL=https://xxxxx.supabase.co/rest/v1

# PDF.js 워커 경로
NEXT_PUBLIC_PDF_WORKER_URL=/pdf.worker.min.js

# Vercel 배포 정보
VERCEL_ENV=production|preview|development
VERCEL_GIT_COMMIT_SHA=xxxxx

# 세션 설정
NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES=30
NEXT_PUBLIC_LOCK_TIMEOUT_MINUTES=30

# PWA 설정
NEXT_PUBLIC_APP_NAME=Hamo
NEXT_PUBLIC_APP_THEME_COLOR=#1f2937
NEXT_PUBLIC_APP_BACKGROUND_COLOR=#ffffff

# Analytics (선택)
NEXT_PUBLIC_GA_ID=UA-xxxxx-x
```

**클라이언트 환경변수 (NEXT_PUBLIC_):**
- Supabase URL + Anon Key
- API 엔드포인트
- 세션/Lock 타임아웃
- PWA 설정
- Analytics

**서버 환경변수:**
- Supabase Service Role Key (서버 전용)
- API 시크릿 키
- 이메일/SMS 서비스 키 (추가 기능)

### 4.5 에러 처리 전략

**클라이언트 레벨:**
- 404: 리소스 없음 → 목록으로 이동 + 토스트 "항목을 찾을 수 없습니다"
- 403: 권한 없음 → "이 작업을 수행할 권한이 없습니다"
- 409: Lock 충돌 → "다른 사용자가 편집 중입니다. 잠시 후 시도하세요"
- 5xx: 서버 오류 → 재시도 + 지속 시 고객 지원 연락

**재시도 정책:**
- Network Error: exponential backoff (1s, 2s, 4s, 8s)
- 최대 3회 재시도
- Lock 충돌 시: 사용자 판단 (수동 재시도)

**오프라인 처리:**
- 네트워크 단절 감지 (navigator.onLine)
- IndexedDB에 변경사항 저장
- 온라인 복귀 시 자동 동기화
- 동기화 실패 시: 사용자 확인 후 재시도

### 4.6 외부 서비스 연동

**Supabase:**
- Database: PostgreSQL 관리
- Auth: JWT 기반 인증
- Storage: 악보 파일 저장
- Realtime: WebSocket 구독

**선택 사항 (Phase 2+):**
- Email Service: 초대 메일 (SendGrid, Resend)
- Image Optimization: 썸네일 생성 (Sharp, imagemin)
- Analytics: 사용자 행동 분석 (PostHog, Mixpanel)

### 4.7 Cron/스케줄링

**자동 Lock 해제:**
- 매 5분마다: `expires_at < NOW()` 인 lock 레코드 삭제
- Supabase Edge Function + pg_cron (향후)

**세션 자동 종료:**
- 매 10분마다: 30분 이상 is_active=false인 session 자동 종료
- 또는 클라이언트에서 30분 타임아웃 후 End Session

**사용자 정리:**
- 선택사항: 장기간 미활동 사용자 자동 제거 (90일 이상)

---

## 요약: 2-4단계 설계 완료

### 주요 변경사항

1. **충돌 제어:** Pessimistic Lock 확정
   - sheet_locks 테이블 추가
   - lock_sheet_version / unlock_sheet_version RPC
   - Lock 획득 실패 시 "OOO님이 수정 중" 표시

2. **실시간 기반:** Supabase Realtime으로 통합
   - Yjs CRDT 제거 (복잡도 감소)
   - IndexedDB 로컬 큐 유지
   - sessions, sheet_locks, session_participants Realtime 구독

3. **PDF 제한:** 최대 20페이지
   - sheet_versions 테이블 page_count <= 20 제약
   - 업로드 시 검증 + 에러 메시지

4. **Guest 모드:** Phase 1 MVP에 포함
   - team_members role = 'Guest'
   - 임시 세션 참여만 가능
   - 팀 멤버 권한 없음

### 설계 문서 구성

- 1단계: 기능 설계도 (화면 목록, 데이터 흐름, 컴포넌트, 상태 관리)
- 2단계: UI 상세 (컴포넌트 트리, 데이터 요구사항, API 입출력)
- 3단계: DB 스키마 (테이블, 관계, RLS, DDL)
- 4단계: 백엔드+인프라 (API 상세, 인증, 배포, 환경변수)

모든 결정사항이 new-hamo.md에 반영되었습니다.
