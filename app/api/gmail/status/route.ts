import { cookies } from 'next/headers';
import { SESSION_COOKIE, unseal } from '@/lib/gmail';

export async function GET() {
  try {
    const session = unseal((await cookies()).get(SESSION_COOKIE)?.value);
    return Response.json(session ? { connected: true, email: session.email } : { connected: false }, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return Response.json({ connected: false }, { headers: { 'cache-control': 'no-store' } });
  }
}
