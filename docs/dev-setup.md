# 개발 환경 & 배포 & 트러블슈팅

## 환경변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxx   # 서버(API 라우트) 전용
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> 서비스 롤 키는 절대 클라이언트 번들에 포함되면 안 됨.

## 설치 & 실행

```bash
cd /Users/c-connect/Documents/GitHub/hamo
npm install
npm run dev   # http://localhost:3000
npm run build && npm run start
```

## Supabase 설정

1. supabase.com에서 프로젝트 생성
2. SQL 에디터에서 `supabase/migrations/*.sql` 순서대로 실행 (001 ~ 032)
3. Storage 버킷 `sheets` 생성 후 migration 010/021 적용
4. RLS 활성화 확인

## 배포

### Vercel
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

## 테스트 (예정)

```bash
npm run test
npm run test:integration
npm run test:e2e
```

## 트러블슈팅

### Service Worker 캐시
```
DevTools → Application → Cache Storage → Clear
DevTools → Application → Service Workers → Unregister
Hard reload (Cmd+Shift+R)
```

### Supabase 연결 오류
- `.env.local` 검증
- Supabase 프로젝트 상태 확인 (paused 여부)

### PDF.js 워커 오류
`next.config.js`에 alias 설정:
```js
config.resolve.alias = {
  ...config.resolve.alias,
  'pdfjs-dist/build/pdf.worker': 'pdfjs-dist/build/pdf.worker.js',
};
```

## 성능 최적화 원칙
- Next Image 최적화
- 동적 import (code splitting)
- Zustand `useShallow` 선택 구독
- Service Worker 캐싱
- PDF.js Worker Thread
