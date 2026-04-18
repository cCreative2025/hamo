# 주요 변경 이력

## 2026-04-18 (2차) — RLS 완전 타이트닝 + 미들웨어 버그 발견

### RLS 완전 타이트닝
- [supabase/migrations/035_tighten_public_read_rls.sql](../supabase/migrations/035_tighten_public_read_rls.sql)
  - 제거: `sheets/sheet_versions/song_forms/session_songs/session_layers` 의 `USING (true)` 공개 읽기 정책, Storage `"Session sheets are readable"` 공개 정책
  - 추가: owner/team-member/session-creator 기반 SELECT 정책
  - 게스트용 SECURITY DEFINER RPC `guest_load_session_bundle(p_code)` — 세션/세트리스트(sheet + song_forms + sheet_versions 포함)/레이어를 단일 jsonb 응답으로 반환
- 클라이언트 리팩터:
  - `sessionPlayerStore.initSession(…, guestCode?)` — 게스트면 RPC 경로, 아니면 기존 직접 조회
  - [session-player/[id]/page.tsx](../src/app/session-player/[id]/page.tsx) — `guestCode`를 store에 전달, 게스트는 Realtime 구독 스킵(스냅샷 조회)
  - [session-guest/[code]/page.tsx](../src/app/session-guest/[code]/page.tsx) — 번들 RPC 1회 호출로 축소, 이전의 분할 select 제거

### 프로필 SSG 경고 수정
- [src/app/profile/page.tsx](../src/app/profile/page.tsx) — 인증 리다이렉트를 `useEffect`로 옮겨 SSG 중 `location is not defined` 제거. 빌드 로그 깔끔.

### Service Worker 버전 자동화
- [scripts/build-sw-version.js](../scripts/build-sw-version.js) + [public/sw.js](../public/sw.js) — `predev`/`prebuild` 훅에서 git SHA + 타임스탬프 기반 버전을 `public/sw-version.js`에 생성, SW가 `importScripts('/sw-version.js')`로 읽어 `CACHE_NAME`에 주입. 매 배포마다 캐시 자동 무효화.
- `.gitignore` — 생성 파일 `public/sw-version.js` 제외

### 🐛 미들웨어 보호 무효화 버그 (중대 발견)
점검 중 확인: 프로젝트 루트의 `middleware.ts`가 **Next.js 15 + src/ 레이아웃**에서 완전히 인식되지 않아, 미들웨어 매니페스트가 비어 있었고 **인증 보호가 실제로는 동작하지 않았습니다**. 라우트는 클라이언트 훅(`useAuth`)에만 의존해왔음.
- 수정: `middleware.ts` → [src/middleware.ts](../src/middleware.ts)로 이동. 빌드 출력에 `ƒ Middleware  84.5 kB`가 표시되며 정상 컴파일 확인.
- 보너스 버그 수정: 기존 미들웨어는 `/session-guest/*`, `/session-player/*`도 `.startsWith('/session')`로 함께 차단했음. 게스트 진입 경로 화이트리스트(`/join/[code]`, `/session-guest/[code]`, `/session-player/[id]?guest=true`)로 정상화.

### 스모크 테스트 결과 (dev 서버)
| 경로 | 기대 | 실제 |
|---|---|---|
| `/` (미인증) | 307 → `/auth/login` | ✓ |
| `/sheets` (미인증) | 307 → `/auth/login` | ✓ |
| `/session/abc` (미인증) | 307 → `/auth/login` | ✓ |
| `/session-player/abc` (미인증) | 307 → `/auth/login` | ✓ |
| `/session-player/abc?guest=true` | 200 | ✓ |
| `/session-guest/[code]` | 200 | ✓ |
| `/join/[code]` | 200 | ✓ |
| `/profile` (미인증) | 307 → `/auth/login` | ✓ |
| `/api/signed-url` (빈 path) | 400 invalid path | ✓ |
| `/api/signed-url?path=../etc/passwd` | 400 invalid path | ✓ |
| `/api/signed-url?path=valid/file.pdf` (미인증) | 403 forbidden | ✓ |
| `/sw.js`, `/sw-version.js`, `/manifest.json` | 200 | ✓ |

빌드: `npx tsc --noEmit` 0 오류, `npm run build` 13/13 페이지 성공, Middleware 84.5 kB.

### 2026-04-18 (3차) — Prod 적용 & 실계정 검증

Supabase Management API(`api.supabase.com/v1/projects/{ref}/database/query`)로 033/034/035를 순차 적용.

**적용 중 발견된 추가 공개 정책** (022/023에서 drop 누락한 legacy 정책):
- `Public can view sheets`, `Public can view song_forms` (둘 다 `USING (true)`)
- 035 migration에 `DROP POLICY IF EXISTS`로 추가 후 재적용.

**Post-patch 상태 (DB 쿼리로 검증)**:
```sql
SELECT (SELECT count(*) FROM pg_proc WHERE proname IN (…)) AS rpcs_installed,
       (SELECT count(*) FROM pg_policies WHERE qual = 'true'
          AND tablename IN ('sheets','sheet_versions','song_forms',
                            'session_songs','session_layers','guest_sessions'))
         AS public_select_policies_remaining;
-- [{"rpcs_installed":4, "public_select_policies_remaining":0}]
```

**실계정(tester2@hamo.app) E2E 검증 결과**:
| 시나리오 | 결과 |
|---|---|
| 익명 `/rest/v1/sheets` | 0 rows (이전: 악보 전체 노출) |
| 익명 `/rest/v1/sheet_versions` | 0 rows |
| 익명 `/rest/v1/song_forms` | 0 rows |
| 익명 `/rest/v1/session_songs` | 0 rows |
| 익명 `/rest/v1/session_layers` | 0 rows |
| 익명 `/rest/v1/guest_sessions` | 0 rows |
| tester2 인증 reads | teams 1 / sheets 4 / sessions 5 / session_songs 5 / song_forms 5 / session_layers 4 ✓ |
| `guest_load_session_bundle(invalid)` | `null` ✓ |
| `guest_load_session_bundle(valid)` | `{ session, items[2], layers[0] }`, 각 item에 sheet.sheet_versions + sheet.song_forms 포함 ✓ |
| `resolve_guest_code(valid)` | `[{session_id, expires_at}]` ✓ |
| `touch_guest_code(valid)` | HTTP 204 ✓ |
| Dev `/session-player/:id` (guest 없음) | 307 → `/auth/login` ✓ |
| Dev `/session-player/:id?guest=true` | 200 ✓ |
| Dev `/api/signed-url?path=...&guestCode=<valid>` | 200 + signedUrl 발급 ✓ |
| Dev `/api/signed-url?path=...&guestCode=WRONG` | 403 forbidden ✓ |
| Dev `/api/signed-url?path=...` (auth/guest 없음) | 403 forbidden ✓ |
| Dev log errors | 없음 ✓ |

**Status**: ✅ 모든 수정사항 prod 반영 완료, 실계정 + 실데이터로 검증 통과.

---

## 2026-04-18 — 전면 점검 & 보안/메모리/원자성 패치

전반 점검 결과 발견된 CRITICAL/HIGH/MEDIUM 이슈를 일괄 수정.

### 보안
- **signed-url 인증** ([src/app/api/signed-url/route.ts](../src/app/api/signed-url/route.ts))
  - 기존: 누구나 서비스 롤 키로 서명 URL 발급 가능 (전체 Storage 노출)
  - 수정: 쿠키 기반 사용자 인증 필요, 경로 화이트리스트 검증, `sheet_versions`에 실제 존재 확인, 게스트는 `guestCode` 파라미터로만 허용
- **Guest 코드 검증** ([src/app/join/[code]/page.tsx](../src/app/join/[code]/page.tsx), [src/app/session-guest/[code]/page.tsx](../src/app/session-guest/[code]/page.tsx))
  - 기존: `code`를 곧바로 `sessions.id`로 사용 → 세션 UUID 추측/유출로 Guest 모드 우회
  - 수정: `resolve_guest_code` RPC로 코드→session_id 교환, 만료 검사
- **guest_sessions RLS 타이트닝** ([supabase/migrations/034_tighten_guest_sessions_rls.sql](../supabase/migrations/034_tighten_guest_sessions_rls.sql))
  - 기존: `USING (true)` — 전체 공개 읽기
  - 수정: SELECT 정책을 session 소유자로 제한, `resolve_guest_code`/`touch_guest_code` RPC(SECURITY DEFINER)로 제한된 뷰 제공
- **업로드 경로 sanitization** ([src/app/sheets/page.tsx](../src/app/sheets/page.tsx))
  - 기존: `file.name.split('.').pop()`로 확장자 추출, 화이트리스트 없음
  - 수정: MIME → 허용 확장자 매핑, `crypto.randomUUID()` 기반 파일명, `contentType` 명시

### Realtime / 메모리
- **participantStore 재작성** ([src/stores/participantStore.ts](../src/stores/participantStore.ts))
  - 기존: 구 v1 문법 (`supabase.from('participants:...').on('*')`)으로 작성되어 supabase-js v2에서 동작하지 않았고, `removeChannel`도 없었음
  - 수정: `postgres_changes` 채널 + 올바른 테이블명(`session_participants`), cleanup 함수 반환
- **Drawing history 상한** ([src/stores/drawingStore.ts](../src/stores/drawingStore.ts))
  - `MAX_HISTORY = 100` 추가 — 긴 세션에서 메모리 무한 증가 방지
- **signedUrlCache TTL + LRU** ([src/lib/signedUrlCache.ts](../src/lib/signedUrlCache.ts))
  - 55분 TTL, 최대 200 엔트리, 만료 자동 삭제, guest 코드 세션별 무효화
- **setTimeout cleanup** — profile/teams 페이지의 토스트 타이머를 `useRef` + useEffect cleanup로 정리
- **PDFViewer destroy/cancel** ([src/components/PDFViewer.tsx](../src/components/PDFViewer.tsx))
  - 언마운트/파일 교체 시 `loadingTask.destroy()`, `pdfDocument.destroy()`, `renderTask.cancel()` 호출

### 원자성
- **saveItems RPC** ([supabase/migrations/033_save_session_items_rpc.sql](../supabase/migrations/033_save_session_items_rpc.sql))
  - 기존: UPDATE → DELETE → INSERT 3단계, 중간 실패 시 세트리스트 손실
  - 수정: `save_session_items(p_session_id, p_team_id, p_items jsonb)` 단일 트랜잭션, `SECURITY INVOKER`
  - 클라이언트는 `supabase.rpc('save_session_items', ...)` 한 번 호출 ([src/stores/sessionStore.ts](../src/stores/sessionStore.ts))

### 빌드 품질
- **`ignoreBuildErrors: false`** ([next.config.js](../next.config.js))
  - 3개 타입 오류 수정 (signed-url cookies await, `SongSection` import, `SongForm.tempo` DB nullable 반영)
  - 이제 타입 오류 시 빌드 실패

### 문서 정리
- CLAUDE.md 424줄 → 44줄로 축소, 세부 내용은 `docs/{tech-stack,api-and-rls,dev-setup,changelog}.md`로 분리

**검증**: `npm run build` 성공 (13/13 페이지), `npx tsc --noEmit` 오류 0건.

---

## 2026-04-17 — Realtime Subscription Fix

**이슈**: SessionPlayerPage useEffect race — 첫 진입 시 Realtime 구독 미작동
**원인**: useEffect 의존성 `currentUser` 포함 → 재실행 중 stale subscription 발생
**해결**: Active flag 패턴 (`let active = true` + cleanup에서 `active = false`)

**변경**: [src/app/session-player/[id]/page.tsx](../src/app/session-player/[id]/page.tsx) (+3 lines)
**아티팩트**: [docs/20260417-realtime-subscription-fix/](./20260417-realtime-subscription-fix/)

---

## 2026-04-14 — Design Pipeline v1

**결과물**:
- 디자인킷: [public/_design-kit/index.html](../public/_design-kit/index.html)
- 컬러 토큰: Primary, Secondary, Success, Error, Warning, Neutral (50-950)
- Dark Mode: Tailwind `darkMode: class`
- WCAG AA (4.5:1) 충족

**변경된 파일** (Stage 3):
- `tailwind.config.ts`, `src/styles/globals.css`
- `src/components/Button.tsx`, `Header.tsx`, `Modal.tsx`, `Toast.tsx`
- `public/_design-kit/index.html`

**아티팩트**: [docs/20260414-design/](./20260414-design/)

---

## 2026-04-16 — Session Player Feature

**아티팩트**: [docs/20260416-session-player-feature/](./20260416-session-player-feature/)

---

## 향후 개선 계획

- [ ] 음성 채팅 (WebRTC)
- [ ] 악보 OCR
- [ ] Yjs CRDT 멀티플레이어
- [ ] React Native 모바일
- [ ] Elasticsearch 검색
- [ ] AI 악보 추천
- [ ] AWS S3 백업
