import { runAgent } from '@/lib/agent';
import { chatSchema } from '@/lib/schemas';
import { ndjson, sameOrigin } from '@/lib/server';
import type { ChatEvent } from '@/lib/types';

export const maxDuration = 300;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Request not allowed.' }, { status: 403 });
  const input = chatSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: 'Please enter a message.' }, { status: 400 });
  return ndjson<ChatEvent>(request, (emit, signal) => runAgent(input.data, emit, signal));
}
