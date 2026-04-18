# API 엔드포인트 & RLS 정책

## 핵심 API (구현/예정)

### Authentication
- `POST /auth/signup` 회원가입
- `POST /auth/login` 로그인
- `POST /auth/logout` 로그아웃
- `GET  /auth/me` 현재 사용자

### Teams
- `GET/POST /teams`, `GET/PUT/DELETE /teams/:id`
- `POST /teams/:id/invite`
- `POST /teams/:id/members`

### Sheets
- `GET/POST /sheets`, `GET/PUT/DELETE /sheets/:id`
- `POST /sheets/:id/versions`

### Sessions
- `GET/POST /sessions`, `GET/PUT/DELETE /sessions/:id`
- `POST /sessions/:id/songs`
- `POST /sessions/:id/guest-link`

### Drawing (Realtime)
- `POST /drawing/shapes`
- `DELETE /drawing/shapes/:id`
- `PATCH /drawing/clear`

### Internal
- `GET /api/signed-url?path=...` — Supabase Storage signed URL 발급 (서버 전용)

## RLS 정책 요약

| 테이블 | 정책 |
|---|---|
| users | 자신의 프로필만 조회/수정 |
| teams | 소유자 또는 멤버만 조회 |
| sheets | 공개 읽기 (migration 022) |
| sessions | 팀 멤버 또는 참여자 |
| session_songs | 공개 읽기 (019) |
| song_forms, session_layers | 공개 읽기 (023) |
| guest_sessions | 공개 읽기 (`USING (true)`) |
| storage.sheets | 세션 포함 여부로 공개 읽기 (021) |

> 주의: 공개 읽기 정책이 광범위하게 적용되어 있음. 보안 점검 문서 참조.

## Realtime 구독 대상

```js
// 세션 상태
supabase.channel(`session:${sessionId}`)...

// 참여자
supabase.channel('session_participants')...

// 악보 잠금
supabase.channel('sheet_locks')...

// 드로잉
supabase.channel('drawing_shapes')...

// Layers, Song Forms (029)
```
