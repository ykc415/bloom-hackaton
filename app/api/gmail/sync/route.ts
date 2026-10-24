import { cookies } from 'next/headers';
import { accessToken, emailDigest, GmailAuthError, purchaseMessageIds, senderName, SESSION_COOKIE, unseal } from '@/lib/gmail';
import { extractPurchase, synthesizeProfile, type Purchase } from '@/lib/profile';
import { syncSchema } from '@/lib/schemas';
import { mapLimit, ndjson, sameOrigin } from '@/lib/server';
import type { Fact, SyncEvent } from '@/lib/types';

export const maxDuration = 300;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Request not allowed.' }, { status: 403 });
  const input = syncSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: 'Invalid request.' }, { status: 400 });
  const session = unseal((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return Response.json({ error: 'Gmail is not connected.' }, { status: 401 });
  const { after, facts } = input.data;

  return ndjson<SyncEvent>(request, async (emit, signal) => {
    const syncedAt = new Date().toISOString();
    emit({ type: 'status', message: 'Connecting to Gmail…' });
    let token: string;
    try { token = await accessToken(session.rt); }
    catch (error) { if (error instanceof GmailAuthError) return emit({ type: 'reconnect' }); throw error; }

    emit({ type: 'status', message: after ? 'Checking for new orders…' : 'Looking for order emails from the last 12 months…' });
    const ids = await purchaseMessageIds(token, after ? new Date(after) : null, signal);
    if (!ids.length) return emit({ type: 'profile', summary: null, facts: null, orders: 0, syncedAt });

    const emails = await mapLimit(ids, 10, id => emailDigest(token, id, signal));
    const counts = new Map<string, number>();
    for (const e of emails) { const name = senderName(e.from); counts.set(name, (counts.get(name) ?? 0) + 1); }
    emit({ type: 'merchants', merchants: [...counts].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name]) => name), emails: emails.length });

    emit({ type: 'status', message: `Reading ${emails.length} emails with Claude Haiku…` });
    const failures: unknown[] = [];
    const purchases = (await mapLimit(emails, 8, e => extractPurchase(e).catch(error => { failures.push(error); return null; })))
      .filter((p): p is Purchase => !!p);
    if (!purchases.length && failures.length === emails.length) throw failures[0];
    if (!purchases.length) return emit({ type: 'profile', summary: null, facts: null, orders: 0, syncedAt });

    emit({ type: 'status', message: `Building your taste profile from ${purchases.length} orders with Claude Opus…` });
    const profile = await synthesizeProfile(purchases, facts);
    const userKeys = new Set(facts.filter(f => f.source === 'chat').map(f => f.key));
    const gmailFacts: Fact[] = profile.facts
      .filter(f => !userKeys.has(f.key))
      .slice(0, 16)
      .map(f => ({ ...f, key: f.key.slice(0, 64), title: f.title.slice(0, 120), text: f.text.slice(0, 500), evidence: f.evidence.slice(0, 300), source: 'gmail', updatedAt: syncedAt }));
    emit({ type: 'profile', summary: profile.summary.slice(0, 400), facts: gmailFacts, orders: purchases.length, syncedAt });
    emit({ type: 'done' });
  });
}
