import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register'];

const ROLE_PATHS: Record<string, string[]> = {
  PARTICIPANT: ['/portal'],
  VOLUNTEER: ['/checkin', '/finish', '/distribution'],
  ORGANIZER: ['/events', '/races', '/participants', '/registrations', '/volunteers', '/organizations', '/attendance'],
  ADMIN: ['/events', '/races', '/participants', '/registrations', '/volunteers', '/organizations', '/attendance', '/checkin', '/finish', '/distribution', '/portal'],
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get('access_token')?.value;
  const role = req.cookies.get('user_role')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (role) {
    const allowed = ROLE_PATHS[role] ?? ROLE_PATHS['ORGANIZER'];
    const isAllowed = allowed.some((p) => pathname.startsWith(p));
    if (!isAllowed) {
      const defaultPath = role === 'VOLUNTEER' ? '/checkin' : role === 'PARTICIPANT' ? '/portal/my-registrations' : '/events';
      return NextResponse.redirect(new URL(defaultPath, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'],
};
