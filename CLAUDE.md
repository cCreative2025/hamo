# Hamo - 악보 협업 앱

교회 음악팀을 위한 **실시간 악보 협업 PWA** 애플리케이션.

## 개요

**Hamo(하모)**는 여러 사람이 동시에 악보를 편집하고 주석을 달 수 있는 협업 플랫폼입니다.

### 핵심 기능

- **악보 관리**: PDF/이미지 업로드, 버전 관리
- **실시간 협업**: 여러 사용자가 동시에 악보 편집 (Realtime)
- **세션 관리**: 악보 세트 생성 및 재생
- **드로잉 도구**: Konva.js 기반 주석 및 하이라이트
- **팀 관리**: 팀 초대, 권한 관리
- **Guest 모드**: 인증 없이 세션 참여 (읽기 전용)
- **PWA**: 오프라인 지원, 앱 설치 가능

## 기술 스택

```
Frontend: Next.js 15, React 18, TypeScript
UI: TailwindCSS, CVA (컴포넌트 스타일링)
상태관리: Zustand (7개 스토어)
인증: Supabase Auth
DB: Supabase PostgreSQL + RLS
실시간: Supabase Realtime
드로잉: Konva.js, React-Konva
PDF: PDF.js
협업: Yjs + Y-WebRTC (선택사항)
PWA: Service Worker, Manifest
```

## 디렉토리 구조

```
hamo/
├── src/
│   ├── app/
│   │   ├── layout.tsx              (메인 레이아웃)
│   │   ├── page.tsx                (홈/리다이렉트)
│   │   ├── auth/
│   │   │   ├── login/page.tsx      (로그인)
│   │   │   └── signup/page.tsx     (회원가입)
│   │   ├── sheets/page.tsx         (악보 관리)
│   │   ├── sessions/page.tsx       (세션 관리)
│   │   ├── teams/page.tsx          (팀 관리)
│   │   ├── session/[id]/page.tsx   (세션 플레이어)
│   │   ├── join/[code]/page.tsx    (Guest 입장)
│   │   └── session-guest/[code]/page.tsx (Guest 세션)
│   ├── components/
│   │   ├── Button.tsx              (공통 버튼)
│   │   ├── Modal.tsx               (모달)
│   │   ├── Toast.tsx               (토스트 알림)
│   │   ├── LoadingSpinner.tsx      (로딩)
│   │   ├── Header.tsx              (헤더)
│   │   ├── BottomNav.tsx           (하단/좌측 네비)
│   │   ├── MainLayout.tsx          (메인 레이아웃)
│   │   ├── SheetCard.tsx           (악보 카드)
│   │   ├── SheetUploader.tsx       (악보 업로드)
│   │   ├── PDFViewer.tsx           (PDF 뷰어)
│   │   └── PWAInitializer.tsx      (PWA 초기화)
│   ├── stores/                     (Zustand 스토어 7개)
│   │   ├── authStore.ts            (인증)
│   │   ├── teamStore.ts            (팀)
│   │   ├── sheetStore.ts           (악보)
│   │   ├── sessionStore.ts         (세션)
│   │   ├── drawingStore.ts         (드로잉)
│   │   ├── uiStore.ts              (UI 상태)
│   │   └── participantStore.ts     (참여자)
│   ├── hooks/
│   │   ├── useAuth.ts              (인증 훅)
│   │   └── useProtectedRoute.tsx   (보호 라우트)
│   ├── lib/
│   │   ├── supabase.ts             (Supabase 클라이언트)
│   │   ├── utils.ts                (유틸리티)
│   │   └── pwa.ts                  (PWA 함수)
│   ├── types/
│   │   └── index.ts                (TypeScript 타입)
│   └── styles/
│       └── globals.css             (전역 스타일)
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql   (테이블, 인덱스)
│       ├── 002_rls_policies.sql    (RLS 정책)
│       └── 003_realtime_setup.sql  (Realtime)
├── public/
│   ├── manifest.json               (PWA 매니페스트)
│   ├── sw.js                       (Service Worker)
│   └── icons/                      (PWA 아이콘)
├── middleware.ts                   (인증 미들웨어)
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
└── .env.example
```

## 주요 구현 사항

### 1. 인증 & 라우팅 (Step 3)
- Supabase Auth 통합
- `middleware.ts`로 라우트 보호
- `useAuth()` 훅으로 인증 상태 확인

### 2. DB 스키마 (Step 4)
- 13개 테이블: users, teams, sheets, sessions, 등
- RLS 정책으로 행 단위 보안
- Realtime 설정으로 실시간 동기화

### 3. 공통 컴포넌트 (Step 5)
- Button, Modal, Toast, LoadingSpinner
- Header, BottomNav (모바일/데스크탑 반응형)
- MainLayout (통합 레이아웃)

### 4. 악보 관리 (Step 6)
- SheetCard: 악보 카드 표시
- SheetUploader: 파일 업로드, 메타데이터 입력
- 검색 및 필터링

### 5. 세션 & 플레이어 (Step 8)
- SessionPlayerView: 악보 재생 인터페이스
- Konva.js 캔버스: 드로잉 오버레이
- 곡 네비게이션, 템포 조절

### 6. PDF 렌더링 (Step 11)
- PDFViewer: PDF.js 기반 뷰어
- 페이지 네비게이션
- 최대 20페이지 지원

### 7. Guest 모드 (Step 12)
- `/join/[code]` 페이지로 입장
- 읽기 전용 세션 플레이어
- 인증 불필요

### 8. PWA (Step 13)
- Service Worker 등록
- 오프라인 캐싱
- 설치 프롬프트
- Manifest 설정

### 9. Zustand 상태 관리 (Step 2)
```
authStore     → 사용자 인증, 세션
teamStore     → 팀 CRUD, 멤버 관리
sheetStore    → 악보 CRUD, 검색, 필터
sessionStore  → 세션 CRUD, 세트리스트, 템포
drawingStore  → 드로잉 도형, 히스토리 (undo/redo)
uiStore       → 테마, 탭, 모달 상태
participantStore → 세션 참여자, Realtime 구독
```

## 주요 기능 구현 흐름

### 악보 업로드 → 세션 생성 → 세션 플레이 → Guest 공유

1. **악보 관리 탭**에서 PDF/이미지 업로드
2. **세션 관리 탭**에서 팀 선택 후 새 세션 생성
3. 악보 추가하여 세트리스트 작성
4. **세션 플레이어**에서 재생
   - 곡 네비게이션 (좌우 스와이프)
   - Konva 캔버스에 주석 (펜, 하이라이트)
   - 템포 표시/변경
   - 참여자 실시간 동기화 (Realtime)
5. **Guest 링크** 생성 후 공유
6. Guest는 `/join/[code]`로 입장 (읽기 전용)

## 개발 환경 설정

### 1. 필수 환경변수 (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJxxxx
```

### 2. npm 설치
```bash
cd /Users/c-connect/Documents/GitHub/hamo
npm install
```

### 3. Supabase 설정
- supabase.com에서 프로젝트 생성
- SQL 에디터에서 `supabase/migrations/*.sql` 실행
- RLS 정책 활성화 확인

### 4. 개발 서버 실행
```bash
npm run dev
```

브라우저: http://localhost:3000

### 5. 빌드 & 배포
```bash
npm run build
npm run start
```

## 핵심 API 엔드포인트 (구현 예정)

```
Authentication
  POST /auth/signup          (회원가입)
  POST /auth/login           (로그인)
  POST /auth/logout          (로그아웃)
  GET  /auth/me              (현재 사용자)

Teams
  GET    /teams              (팀 목록)
  POST   /teams              (팀 생성)
  GET    /teams/:id          (팀 상세)
  PUT    /teams/:id          (팀 수정)
  DELETE /teams/:id          (팀 삭제)
  POST   /teams/:id/invite   (초대 생성)
  POST   /teams/:id/members  (멤버 추가)

Sheets
  GET    /sheets             (악보 목록)
  POST   /sheets             (악보 생성)
  GET    /sheets/:id         (악보 상세)
  PUT    /sheets/:id         (악보 수정)
  DELETE /sheets/:id         (악보 삭제)
  POST   /sheets/:id/versions (버전 업로드)

Sessions
  GET    /sessions           (세션 목록)
  POST   /sessions           (세션 생성)
  GET    /sessions/:id       (세션 상세)
  PUT    /sessions/:id       (세션 수정)
  DELETE /sessions/:id       (세션 종료)
  POST   /sessions/:id/songs (곡 추가)
  POST   /sessions/:id/guest-link (게스트 링크 생성)

Drawing (Realtime)
  POST   /drawing/shapes     (도형 추가)
  DELETE /drawing/shapes/:id (도형 삭제)
  PATCH  /drawing/clear      (전체 삭제)
```

## RLS (Row Level Security) 정책

- **Users**: 자신의 프로필만 조회/수정
- **Teams**: 소유자 또는 멤버만 조회
- **Sheets**: 소유자 또는 팀 멤버만 조회
- **Sessions**: 팀 멤버 또는 참여자만 조회
- **Drawing**: 세션 참여자만 조회/작성

## Realtime 구독 대상

```javascript
// 세션 상태 변경
supabase
  .from('sessions')
  .on('*', callback)
  .subscribe();

// 참여자 상태
supabase
  .from('session_participants')
  .on('*', callback)
  .subscribe();

// 악보 잠금 (Pessimistic Lock)
supabase
  .from('sheet_locks')
  .on('*', callback)
  .subscribe();

// 드로잉 데이터
supabase
  .from('drawing_shapes')
  .on('*', callback)
  .subscribe();
```

## 성능 최적화

- Next.js Image 최적화
- 코드 스플리팅 (동적 import)
- Zustand 선택적 구독 (useShallow)
- Service Worker 캐싱
- PDF.js worker thread 활용

## 보안 고려사항

- Supabase JWT 토큰 자동 갱신
- RLS 정책으로 데이터 접근 제어
- 민감 데이터 암호화 (예: 외부 API 키)
- CSRF 보호 (Next.js 기본)
- XSS 방지 (React JSX 이스케이프)

## 테스트 (구현 예정)

```bash
npm run test              # 유닛 테스트
npm run test:integration # 통합 테스트
npm run test:e2e        # E2E 테스트
```

## 배포

### Vercel (추천)
```bash
vercel deploy
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 트러블슈팅

### Service Worker 캐시 이슈
```bash
1. DevTools → Application → Cache Storage → Clear
2. DevTools → Application → Service Workers → Unregister
3. Hard reload (Cmd+Shift+R)
```

### Supabase 연결 오류
```bash
1. .env.local 환경변수 확인
2. NEXT_PUBLIC_SUPABASE_URL, ANON_KEY 유효성 확인
3. Supabase 프로젝트 상태 확인 (paused 아닌지)
```

### PDF.js 워커 오류
```bash
next.config.js에서 PDF.js 패키지 설정 확인:
webpack: (config, options) => {
  config.resolve.alias = {
    ...config.resolve.alias,
    'pdfjs-dist/build/pdf.worker': 'pdfjs-dist/build/pdf.worker.js',
  };
  return config;
}
```

## Design System (2026-04-14)

**Latest Update**: Design Pipeline v1 Complete
- **Design Kit**: `/public/_design-kit/index.html`
- **Color Tokens**: Primary, Secondary, Success, Error, Warning, Neutral (50-950 tones each)
- **Dark Mode**: Fully supported with `darkMode: class` in Tailwind
- **WCAG Compliance**: All text/background combinations meet AA standard (4.5:1+)

**Files Updated** (Stage 3 Implementation):
- `tailwind.config.ts` — Color token expansion (+80 lines)
- `src/styles/globals.css` — Global dark mode colors
- `src/components/Button.tsx` — Token-based variants + dark mode
- `src/components/Header.tsx` — Dark mode support
- `src/components/Modal.tsx` — Dark mode support
- `src/components/Toast.tsx` — Token migration + dark mode
- `public/_design-kit/index.html` — Interactive color palette viewer

**Pipeline Artifacts**: `docs/20260414-design/`
- `inspection.md` — Current design audit
- `plan.md` — Color system redesign plan
- `implementation.md` — Changes applied (Stage 3)


## 향후 개선 계획

- [ ] 음성 채팅 (WebRTC)
- [ ] 악보 자동 스캔 (OCR)
- [ ] 멀티플레이어 CRDT 동기화 (Yjs)
- [ ] 모바일 네이티브 앱 (React Native)
- [ ] 악보 검색 DB (Elasticsearch)
- [ ] AI 기반 악보 추천
- [ ] 클라우드 백업 (AWS S3)

## 문서

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 시스템 아키텍처
- [new-hamo.md](./new-hamo.md) - 프로젝트 설계 문서
- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) - 구현 진행 상황

## 라이센스

MIT

## 연락처

프로젝트 관련 질문: GitHub Issues
