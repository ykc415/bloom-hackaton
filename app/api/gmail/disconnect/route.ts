import { cookies } from 'next/headers';
import { revoke, SESSION_COOKIE, unseal } from '@/lib/gmail';
import { sameOrigin } from '@/lib/server';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Request not allowed.' }, { status: 403 });
  const jar = await cookies();
  const session = unseal(jar.get(SESSION_COOKIE)?.value);
  if (session) await revoke(session.rt);
  jar.delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
