import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 보호된 라우트 확인
  const isProtectedRoute = [
    '/sheets',
    '/sessions',
    '/teams',
    '/session',
    '/join',
  ].some(route => request.nextUrl.pathname.startsWith(route));

  // /join/[code] 경로는 미인증도 허용
  const isGuestRoute = request.nextUrl.pathname.match(/^\/join\/[^/]+$/);

  if (isProtectedRoute && !isGuestRoute && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // 이미 인증된 사용자가 auth 페이지에 접근하면 sheets로 리다이렉트
  if (user && request.nextUrl.pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/sheets', request.url));
  }

  // 홈페이지 자동 리다이렉트
  if (request.nextUrl.pathname === '/') {
    if (user) {
      return NextResponse.redirect(new URL('/sheets', request.url));
    } else {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * 정적 파일 및 다음 내부 라우트 제외
     * - .next/static (빌드 아티팩트)
     * - .next/image (이미지 최적화 파일)
     * - favicon.ico (파비콘)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
