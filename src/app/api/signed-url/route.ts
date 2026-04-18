import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// path format expected: "<userId>/<timestamp>.<ext>"
function isSafePath(p: string): boolean {
  if (!p || p.length > 256) return false;
  if (p.includes('..') || p.startsWith('/') || p.includes('\\')) return false;
  return /^[A-Za-z0-9/_.-]+$/.test(p);
}

async function pathExistsInSheetVersions(path: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('sheet_versions')
    .select('id')
    .eq('file_path', path)
    .limit(1)
    .maybeSingle();
  return !error && !!data;
}

async function guestCanAccessPath(code: string, path: string): Promise<boolean> {
  const now = new Date().toISOString();
  const { data: gs, error: gsErr } = await supabaseAdmin
    .from('guest_sessions')
    .select('session_id, expires_at')
    .eq('code', code)
    .maybeSingle();
  if (gsErr || !gs) return false;
  if (gs.expires_at && gs.expires_at < now) return false;

  // Path must reference a sheet_version used by a song in this session.
  const { data, error } = await supabaseAdmin
    .from('session_songs')
    .select('sheet_id, sheet:sheets!inner(sheet_versions!inner(file_path))')
    .eq('session_id', gs.session_id);
  if (error || !data) return false;
  for (const row of data as Array<{ sheet?: { sheet_versions?: Array<{ file_path?: string }> } }>) {
    const versions = row.sheet?.sheet_versions ?? [];
    if (versions.some((v) => v.file_path === path)) return true;
  }
  return false;
}

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path');
  const guestCode = request.nextUrl.searchParams.get('guestCode');

  if (!path || !isSafePath(path)) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 });
  }

  // 1) Authenticated user path: verify the session cookie resolves to a user
  //    and that the path exists in sheet_versions (RLS on sheet_versions +
  //    downstream policies will govern whether the user *should* see the sheet;
  //    at minimum we block anonymous enumeration).
  const cookieStore = await cookies();
  const supabaseUser = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(_name: string, _value: string, _options: CookieOptions) {
          // no-op for read-only route
        },
        remove(_name: string, _options: CookieOptions) {
          // no-op
        },
      },
    }
  );
  const { data: { user } } = await supabaseUser.auth.getUser();

  let authorized = false;
  if (user) {
    // User-scoped select — RLS decides visibility of sheet_versions.
    const { data, error } = await supabaseUser
      .from('sheet_versions')
      .select('id')
      .eq('file_path', path)
      .limit(1)
      .maybeSingle();
    authorized = !error && !!data;
  } else if (guestCode) {
    authorized = await guestCanAccessPath(guestCode, path);
  }

  if (!authorized) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Extra safety: path must correspond to an actual sheet version (admin check).
  if (!(await pathExistsInSheetVersions(path))) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from('sheets')
    .createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create signed URL' }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl });
}
