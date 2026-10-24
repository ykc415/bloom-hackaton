import { personalizeHome } from '@/lib/home';
import { homeSchema } from '@/lib/schemas';
import { sameOrigin, userMessage } from '@/lib/server';

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Request not allowed.' }, { status: 403 });
  const input = homeSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: 'Invalid request.' }, { status: 400 });
  try {
    return Response.json(await personalizeHome(input.data.facts, input.data.locale), { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('Home personalization failed:', error instanceof Error ? error.name : 'unknown');
    return Response.json({ error: userMessage(error) }, { status: 502 });
  }
}
