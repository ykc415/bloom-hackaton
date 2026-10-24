import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { authUrl, cookieOptions, STATE_COOKIE } from '@/lib/gmail';

export async function GET(request: Request) {
  const state = randomBytes(16).toString('hex');
  try {
    const response = NextResponse.redirect(authUrl(request, state));
    response.cookies.set(STATE_COOKIE, state, cookieOptions(request, 600));
    return response;
  } catch {
    return NextResponse.redirect(new URL('/?gmail=unavailable', request.url));
  }
}
