# Hamo - 악보 협업 PWA

악보 협업을 위한 **Progressive Web App (PWA)** 플랫폼.

교회 음악팀이 예배/연습 중 실시간으로 악보를 공유하고 협업하는 앱입니다.

## 주요 기능

### 1. 악보 관리 (Sheets)
- PDF/이미지 업로드
- 악보 메타데이터 (제목, 아티스트, 키, 템포, 박자)
- 버전 관리
- 검색 및 필터링

### 2. 실시간 협업 (Sessions)
- 세트리스트 생성 및 재생
- Konva.js 기반 드로잉 (펜, 지우개, 색상)
- 실시간 참여자 동기화 (Supabase Realtime)
- 템포 표시/조절
- Pessimistic Lock으로 충돌 방지

### 3. 팀 관리 (Teams)
- 팀 생성 및 멤버 관리
- 역할 기반 권한 (Owner, Admin, Member)
- 멤버 초대 (이메일 기반)

### 4. Guest 모드
- 세션 공유 링크 (`/join/[code]`)
- 인증 없이 참여 가능
- 읽기 전용 모드

### 5. PWA 기능
- Service Worker 캐싱
- 오프라인 지원
- 앱 설치 가능 (모바일/데스크탑)

## 기술 스택

```
Frontend:
  - Next.js 15 (App Router)
  - React 18
  - TypeScript 5
  - TailwindCSS 3

State Management:
  - Zustand (7개 스토어)

UI Components:
  - CVA (Class Variance Authority)
  - Konva.js (드로잉)
  - PDF.js (PDF 렌더링)

Backend:
  - Supabase (Auth, Database, Storage, Realtime)
  - PostgreSQL 15

PWA:
  - Service Worker
  - Web Manifest

Deployment:
  - Vercel
  - Docker
```

## 프로젝트 구조

```
hamo/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # 메인 레이아웃 + PWA 메타
│   │   ├── page.tsx                  # 홈 (리다이렉트)
│   │   ├── auth/
│   │   │   ├── login/page.tsx        # 로그인
│   │   │   └── signup/page.tsx       # 회원가입
│   │   ├── sheets/page.tsx           # 악보 관리
│   │   ├── sessions/page.tsx         # 세션 관리
│   │   ├── teams/page.tsx            # 팀 관리
│   │   ├── session/[id]/page.tsx     # 세션 플레이어 (핵심)
│   │   ├── join/[code]/page.tsx      # Guest 입장
│   │   └── session-guest/[code]/page.tsx # Guest 플레이어
│   ├── components/                   # React 컴포넌트
│   │   ├── Button.tsx                # 버튼 (다양한 스타일)
│   │   ├── Modal.tsx                 # 모달
│   │   ├── Toast.tsx                 # 토스트 알림
│   │   ├── LoadingSpinner.tsx        # 로딩 스피너
│   │   ├── Header.tsx                # 헤더
│   │   ├── BottomNav.tsx             # 네비게이션 (반응형)
│   │   ├── MainLayout.tsx            # 메인 레이아웃
│   │   ├── SheetCard.tsx             # 악보 카드
│   │   ├── SheetUploader.tsx         # 악보 업로드
│   │   ├── PDFViewer.tsx             # PDF 뷰어
│   │   └── PWAInitializer.tsx        # PWA 초기화
│   ├── stores/                       # Zustand 스토어
│   │   ├── authStore.ts              # 인증
│   │   ├── teamStore.ts              # 팀
│   │   ├── sheetStore.ts             # 악보
│   │   ├── sessionStore.ts           # 세션
│   │   ├── drawingStore.ts           # 드로잉 + 히스토리
│   │   ├── uiStore.ts                # UI 상태
│   │   └── participantStore.ts       # 참여자
│   ├── hooks/
│   │   ├── useAuth.ts                # 인증 훅
│   │   └── useProtectedRoute.tsx     # 보호 라우트
│   ├── lib/
│   │   ├── supabase.ts               # Supabase 클라이언트
│   │   ├── utils.ts                  # 유틸리티 함수
│   │   └── pwa.ts                    # PWA 함수
│   ├── types/
│   │   └── index.ts                  # TypeScript 타입 정의
│   └── styles/
│       └── globals.css               # 전역 스타일
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql    # 13개 테이블 + 인덱스
│       ├── 002_rls_policies.sql      # RLS 정책
│       └── 003_realtime_setup.sql    # Realtime 설정
├── public/
│   ├── manifest.json                 # PWA 매니페스트
│   ├── sw.js                         # Service Worker
│   └── icons/                        # 앱 아이콘
├── middleware.ts                     # 인증 미들웨어 (SSR)
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
└── README.md, CLAUDE.md, IMPLEMENTATION_STATUS.md
```

## 시작하기

### 1. 필수 요구사항

- Node.js 18 이상
- npm 또는 yarn
- Supabase 계정 (무료)

### 2. 프로젝트 설치

```bash
cd /Users/c-connect/Documents/GitHub/hamo
npm install
```

### 3. 환경변수 설정

`.env.local` 파일 생성 후 Supabase 정보 입력:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Supabase 프로젝트에서:
- Settings → API 탭
- Project URL, Anon Key, Service Role Key 복사

### 4. Supabase DB 초기화

Supabase 콘솔 → SQL Editor에서 순서대로 실행:

```sql
-- 1단계
supabase/migrations/001_initial_schema.sql

-- 2단계
supabase/migrations/002_rls_policies.sql

-- 3단계
supabase/migrations/003_realtime_setup.sql
```

또는 프로젝트 폴더에서:

```bash
# 수동 마이그레이션 (Supabase CLI)
npm install -g supabase
supabase link  # 프로젝트와 연결
supabase migration up
```

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저 접속: http://localhost:3000

## 사용 방법

### 사용자 플로우

1. **회원가입/로그인** (`/auth/signup` 또는 `/auth/login`)
2. **팀 생성** (`/teams` → "새 팀 생성")
3. **악보 업로드** (`/sheets` → "악보 업로드")
4. **세션 생성** (`/sessions` → "새 세션")
   - 팀 선택
   - 세트리스트에 악보 추가
5. **세션 재생** → 세션 플레이어 (`/session/:id`)
   - 곡 네비게이션 (이전/다음)
   - Konva 캔버스에 주석 그리기
   - 참여자 실시간 동기화
   - 템포 조절
6. **Guest 공유** (선택사항)
   - 세션에서 "Guest 링크 생성"
   - `/join/[code]`로 공유
   - Guest는 읽기 전용으로 참여

### 핵심 화면

| 경로 | 설명 | 인증 |
|------|------|------|
| `/sheets` | 악보 관리 | 필요 |
| `/sessions` | 세션 관리 | 필요 |
| `/teams` | 팀 관리 | 필요 |
| `/session/:id` | 세션 플레이어 | 필요 |
| `/join/:code` | Guest 입장 | 불필요 |

## 데이터베이스 스키마

### 주요 테이블 (13개)

```sql
users               -- Supabase Auth와 연결
teams               -- 팀
team_members        -- 팀 멤버
team_invites        -- 멤버 초대
sheets              -- 악보
sheet_versions      -- 악보 버전 (PDF/이미지)
sessions            -- 세션 (곡 세트)
session_songs       -- 세트리스트 (순서)
session_participants -- 세션 참여자 (온라인 상태)
sheet_locks         -- Pessimistic Lock (동시 편집 방지)
drawing_layers      -- 드로잉 레이어
drawing_shapes      -- Konva 도형 (펜 획)
guest_sessions      -- Guest 세션 공유 링크
```

### RLS (Row Level Security)

모든 테이블에 RLS 정책 적용:
- Users: 자신의 프로필만 조회/수정
- Teams: 소유자/멤버만 조회
- Sheets: 소유자/팀 멤버만 조회
- Sessions: 팀 멤버/참여자만 조회
- Drawing: 세션 참여자만 조회/작성

## 빌드 & 배포

### 빌드

```bash
npm run build      # Next.js 최적화 빌드
npm run start      # 프로덕션 서버 실행
npm run type-check # TypeScript 타입 확인
npm run lint       # ESLint 실행
```

### Vercel 배포 (추천)

```bash
npm i -g vercel
vercel
```

### Docker 배포

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t hamo .
docker run -p 3000:3000 hamo
```

## 주요 기술 설명

### Zustand 상태 관리

7개 스토어로 기능 분리:

- **authStore**: 사용자 인증, 로그인/로그아웃
- **teamStore**: 팀 CRUD, 멤버 관리
- **sheetStore**: 악보 CRUD, 검색, 필터
- **sessionStore**: 세션 CRUD, 곡 네비, 템포
- **drawingStore**: 도형 추가, 실행 취소/다시 실행
- **uiStore**: 테마, 활성 탭, 모달 상태
- **participantStore**: 세션 참여자, Realtime 구독

### Realtime 동기화

Supabase Realtime으로 다음 항목 실시간 동기화:

```javascript
// 세션 상태 변경
supabase.from('sessions').on('UPDATE', ...)

// 참여자 온라인 상태
supabase.from('session_participants').on('*', ...)

// 드로잉 데이터
supabase.from('drawing_shapes').on('INSERT', ...)

// 악보 잠금
supabase.from('sheet_locks').on('*', ...)
```

### Konva.js 드로잉

```javascript
// 캔버스에 도형 추가
const shape = {
  x: 100,
  y: 100,
  width: 50,
  height: 50,
  color: '#FF0000',
};
drawingStore.addShape(shape);
```

### PDF.js 렌더링

```javascript
// PDF 페이지 렌더링
<PDFViewer fileUrl={pdfUrl} maxPages={20} />
```

## 성능 최적화

- Next.js 이미지 최적화
- Service Worker 캐싱 (오프라인 지원)
- Zustand 선택적 구독 (불필요한 리렌더링 방지)
- Konva.js 성능 최적화 (throttling)

## PWA 기능

- **Service Worker**: 오프라인 지원, 캐싱
- **Manifest**: 앱 설치 가능
- **Responsive**: 모바일/태블릿/데스크탑
- **Installable**: 홈 화면 추가 (iOS/Android)

## 문제 해결

### Service Worker 캐시 문제

```bash
# DevTools
1. Application → Cache Storage → 캐시 삭제
2. Service Workers → "Unregister"
3. 하드 새로고침 (Cmd+Shift+R)
```

### Supabase 연결 오류

```bash
# .env.local 확인
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Supabase 프로젝트 상태 확인 (paused 아닌지)
```

### PDF.js 워커 오류

```bash
# next.config.js에 webpack 설정 추가
webpack: (config) => {
  config.resolve.alias = {
    'pdfjs-dist/build/pdf.worker': 'pdfjs-dist/build/pdf.worker.js',
  };
  return config;
}
```

## 향후 개선

- [ ] 음성 채팅 (WebRTC)
- [ ] 멀티플레이어 CRDT (Yjs)
- [ ] 악보 자동 스캔 (OCR)
- [ ] AI 악보 추천
- [ ] 모바일 네이티브 앱 (React Native)
- [ ] 클라우드 백업 (S3)

## 참고 자료

- [CLAUDE.md](./CLAUDE.md) - 전체 프로젝트 가이드
- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) - 구현 상태
- [new-hamo.md](./new-hamo.md) - 설계 문서
- [Supabase 문서](https://supabase.com/docs)
- [Next.js 문서](https://nextjs.org/docs)
- [Konva.js 문서](https://konvajs.org)
- [PDF.js 문서](https://mozilla.github.io/pdf.js)

## 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능

## 연락처

버그 리포트 및 기능 제안: GitHub Issues

---

**Happy collaborating!** 음악팀과 함께 협업하는 악보를 즐기세요.
