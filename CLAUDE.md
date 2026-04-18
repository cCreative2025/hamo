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

## 현재 상태 (2026-04-18)

모든 핵심 영역 개발 완료, 기본 동작 확인. 다만 후속 개선이 필요한 이슈들이 있음 — 보안, 메모리, 로직. 작업 시 다음을 우선 확인:

- **서비스 롤 키**는 서버 API 라우트(`src/app/api/**`)에서만 사용. 클라이언트 번들 유입 금지.
- **Realtime 구독**은 반드시 `useEffect` cleanup 또는 store의 unsubscribe에서 해제.
- **Guest 접근**은 `guest_sessions.code` 검증 필수 (session UUID 직접 노출 금지).
- **RLS 공개 읽기** 정책을 건드릴 때는 `docs/api-and-rls.md` 표와 영향 테이블 먼저 확인.

## 작업 규칙

- 기능 파이프라인 아티팩트는 `docs/YYYYMMDD-<topic>/` 에 누적.
- CLAUDE.md는 인덱스만 유지 — 세부 내용은 `docs/*.md` 로 분리.
- 기술 변경사항 추가 시 `docs/changelog.md` 상단에 기록.
