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

  const pathname = request.nextUrl.pathname;

  // Guest-accessible routes (no auth required):
  //  - /join/[code]            — enter guest flow
  //  - /session-guest/[code]   — guest-only session view
  //  - /session-player/[id]    — only when ?guest=true (presence of guest code
  //                              itself is validated server-side via RPC)
  const isGuestJoinOrView =
    /^\/join\/[^/]+$/.test(pathname) ||
    /^\/session-guest\/[^/]+$/.test(pathname);
  const isGuestPlayer =
    /^\/session-player\/[^/]+$/.test(pathname) &&
    request.nextUrl.searchParams.get('guest') === 'true';

  // Protected prefixes (auth required unless marked guest above).
  // IMPORTANT: check exact segment, not prefix — '/session' must not match
  // '/session-guest' or '/session-player'.
  const isProtectedRoute =
    pathname === '/sheets' || pathname.startsWith('/sheets/') ||
    pathname === '/sessions' || pathname.startsWith('/sessions/') ||
    pathname === '/teams' || pathname.startsWith('/teams/') ||
    pathname === '/session' || pathname.startsWith('/session/') ||
    pathname === '/session-player' || pathname.startsWith('/session-player/') ||
    pathname === '/profile' || pathname.startsWith('/profile/');

  const isPublicAccess = isGuestJoinOrView || isGuestPlayer;

  if (isProtectedRoute && !isPublicAccess && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // 이미 인증된 사용자가 auth 페이지에 접근하면 sheets로 리다이렉트
  // 단, reset-password는 비밀번호 변경 처리를 위해 허용
  const isResetPassword = request.nextUrl.pathname === '/auth/reset-password';
  if (user && request.nextUrl.pathname.startsWith('/auth/') && !isResetPassword) {
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
