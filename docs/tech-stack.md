# 기술 스택 & 디렉토리 구조

## 스택

```
Frontend: Next.js 15, React 18, TypeScript
UI: TailwindCSS, CVA
상태관리: Zustand (8개 스토어)
인증: Supabase Auth
DB: Supabase PostgreSQL + RLS
실시간: Supabase Realtime
드로잉: Konva.js, React-Konva
PDF: PDF.js
협업: Yjs + Y-WebRTC (선택)
PWA: Service Worker, Manifest
```

## 디렉토리 구조

```
hamo/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── api/signed-url/      (Storage signed URL 발급)
│   │   ├── auth/                (login, signup, reset-password)
│   │   ├── sheets/              (악보 관리)
│   │   ├── sessions/            (세션 관리)
│   │   ├── teams/               (팀 관리)
│   │   ├── session/[id]/        (세션 편집)
│   │   ├── session-player/[id]/ (플레이어)
│   │   ├── session-guest/[code]/(Guest 세션)
│   │   ├── join/[code]/         (Guest 입장)
│   │   └── profile/
│   ├── components/
│   │   ├── Button, Modal, Toast, LoadingSpinner, Header, BottomNav, MainLayout
│   │   ├── SheetCard, SheetUploader, SheetViewerModal
│   │   ├── PDFViewer, DrawingCanvas
│   │   ├── SongFormBuilder, SongFormInput, KeyPickerPopover, YouTubeDialog
│   │   ├── GestureLock, PWAInitializer
│   ├── stores/
│   │   ├── authStore, teamStore, sheetStore
│   │   ├── sessionStore, sessionPlayerStore
│   │   ├── drawingStore, uiStore, participantStore
│   ├── hooks/   (useAuth, useProtectedRoute)
│   ├── lib/     (supabase, utils, pwa, signedUrlCache, exportSession)
│   ├── types/
│   └── styles/
├── supabase/migrations/  (001 ~ 032)
├── public/     (manifest.json, sw.js, icons/, _design-kit/)
├── middleware.ts
└── next.config.js
```

## Zustand 스토어 역할

| 스토어 | 책임 |
|---|---|
| authStore | 사용자 인증, 세션 |
| teamStore | 팀 CRUD, 멤버 |
| sheetStore | 악보 CRUD, 검색 |
| sessionStore | 세션 CRUD, 세트리스트 |
| sessionPlayerStore | 플레이 상태, 곡 네비, 템포 |
| drawingStore | 드로잉, undo/redo |
| participantStore | 참여자, Realtime 구독 |
| uiStore | 테마, 탭, 모달 |
