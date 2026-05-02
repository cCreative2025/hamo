# Hamo — 악보 협업 PWA

교회 음악팀을 위한 **실시간 악보 협업** Next.js 앱.

## 핵심 기능

- 악보 관리 (PDF/이미지 업로드, 버전 관리)
- 실시간 협업 편집 (Supabase Realtime)
- 세션/세트리스트 관리
- Konva 기반 드로잉·주석
- 팀 초대·권한 관리
- Guest 모드 (인증 없이 세션 참여, 읽기 전용)
- PWA (오프라인, 설치 지원)

## 주요 흐름

악보 업로드 → 세션 생성 → 세트리스트 → 플레이어(드로잉·템포·실시간) → Guest 링크 공유.

## 문서 인덱스

| 영역 | 문서 |
|---|---|
| 기술 스택 · 디렉토리 구조 · 스토어 | [docs/tech-stack.md](./docs/tech-stack.md) |
| API 엔드포인트 · RLS · Realtime 채널 | [docs/api-and-rls.md](./docs/api-and-rls.md) |
| 개발 환경 · 배포 · 트러블슈팅 | [docs/dev-setup.md](./docs/dev-setup.md) |
| 변경 이력 · 디자인 시스템 · 로드맵 | [docs/changelog.md](./docs/changelog.md) |
| 프로젝트 설계 원본 | [new-hamo.md](./new-hamo.md) |
| 아키텍처 상세 | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| 구현 진행도 | [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) |
| 디자인 파이프라인 | [docs/20260503-design/](./docs/20260503-design/) |

## Artifacts

| 종류 | 경로 |
|---|---|
| design | docs/20260503-design/plan.md |

## Pipeline History

| 날짜 | 파이프라인 | 내용 | 산출물 |
|---|---|---|---|
| 2026-05-03 | run-design | 디자인 토큰 통일 — green/red/blue/violet → 디자인 시스템 토큰 전환 | docs/20260503-design/ |
| 2026-04-14 | run-design | 디자인 토큰 시스템 구축 | docs/20260414-design/ |

## 현재 상태 (2026-05-03)

모든 핵심 영역 개발 완료, 디자인 토큰 통일 완료. 페이지별 하드코딩된 색상(green/red/blue/violet) → 디자인 시스템 토큰(success/error/secondary)으로 전환.

## Recent Changes (2026-05-03)

- `sessions/page.tsx` — `bg-green-500` → `bg-success-500`, delete 버튼 `red` → `error` 토큰
- `teams/page.tsx` — 에러 배너, required 표시, 폼 에러 텍스트 모두 `red` → `error` 토큰
- `session/[id]/page.tsx` — 세션 상태 배지 `green` → `success`, 멘트 행 `blue` → `secondary`, 삭제 버튼 `red` → `error`
- `session-guest/[code]/page.tsx` — 상태 배지 `green` → `success`, 멘트 카드 `blue` → `secondary`
- `SheetCard.tsx` — 유튜브 태그 `red` → `error`, 섹션 폴백 `violet` → `secondary`, 수정 버튼 `danger` → `outline`
- `globals.css` — `.gradient-primary` HEX → Tailwind 토큰 클래스로 전환
- `layout.tsx` — `theme-color` `#2563eb` → `#7c6fe0` (primary-600)

## 작업 규칙

- 기능 파이프라인 아티팩트는 `docs/YYYYMMDD-<topic>/` 에 누적.
- CLAUDE.md는 인덱스만 유지 — 세부 내용은 `docs/*.md` 로 분리.
- 기술 변경사항 추가 시 `docs/changelog.md` 상단에 기록.

## 디자인 시스템 규칙

- 색상 토큰은 `tailwind.config.ts`에 정의된 것만 사용: `primary/secondary/success/error/warning/neutral`
- Tailwind 기본 색상(`green/red/blue/violet/gray` 등) 직접 사용 금지
- 카카오 브랜드 색상 `bg-[#FEE500]`, `text-[#191919]`는 예외 (브랜드 규정)

## 보안 주의사항

- **서비스 롤 키**는 서버 API 라우트(`src/app/api/**`)에서만 사용. 클라이언트 번들 유입 금지.
- **Realtime 구독**은 반드시 `useEffect` cleanup 또는 store의 unsubscribe에서 해제.
- **Guest 접근**은 `guest_sessions.code` 검증 필수 (session UUID 직접 노출 금지).
- **RLS 공개 읽기** 정책을 건드릴 때는 `docs/api-and-rls.md` 표와 영향 테이블 먼저 확인.
