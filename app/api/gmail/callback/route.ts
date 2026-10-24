import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { cookieOptions, exchangeCode, gmailAddress, seal, SESSION_COOKIE, STATE_COOKIE } from '@/lib/gmail';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const back = (status: string) => {
    const response = NextResponse.redirect(new URL(`/?gmail=${status}`, request.url));
    response.cookies.delete(STATE_COOKIE);
    return response;
  };
  if (url.searchParams.get('error')) return back('denied');
  const code = url.searchParams.get('code'), state = url.searchParams.get('state');
  const expected = (await cookies()).get(STATE_COOKIE)?.value;
  if (!code || !state || state !== expected) return back('error');
  try {
    const tokens = await exchangeCode(code, request);
    if (!tokens.refresh_token) return back('error');
    const email = await gmailAddress(tokens.access_token);
    const response = back('connected');
    response.cookies.set(SESSION_COOKIE, seal({ rt: tokens.refresh_token, email }), cookieOptions(request, 60 * 60 * 24 * 30));
    return response;
  } catch (error) {
    console.error('Gmail callback failed:', error instanceof Error ? error.name : 'unknown');
    return back('error');
  }
}
