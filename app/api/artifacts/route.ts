import { buildArtifact } from '@/lib/artifact';
import { artifactSchema } from '@/lib/schemas';
import { ndjson, sameOrigin } from '@/lib/server';
import type { ArtifactEvent } from '@/lib/types';

export const maxDuration = 120;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Request not allowed.' }, { status: 403 });
  const input = artifactSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: 'Invalid request.' }, { status: 400 });
  return ndjson<ArtifactEvent>(request, (emit, signal) => buildArtifact(input.data, emit, signal));
}
