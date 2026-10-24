import Anthropic from '@anthropic-ai/sdk';

/** An error whose message is safe to show to the user. */
export class AppError extends Error {}

export function userMessage(error: unknown) {
  if (error instanceof AppError) return error.message;
  if (error instanceof Anthropic.RateLimitError) return 'magent is busy right now. Please try again in a moment.';
  if (error instanceof Anthropic.AuthenticationError) return 'The AI service is not configured yet.';
  if (error instanceof Anthropic.APIError) return 'The AI service had a problem. Please try again.';
  return 'Something went wrong. Please try again.';
}

/** Blocks cross-site POSTs: the browser always sends Origin on them. */
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === (request.headers.get('host') ?? new URL(request.url).host); }
  catch { return false; }
}

/** Streams newline-delimited JSON events; errors become a final `error` event. */
export function ndjson<E extends { type: string }>(request: Request, run: (emit: (event: E) => void, signal: AbortSignal) => Promise<void>) {
  const encoder = new TextEncoder();
  const cancelled = new AbortController();
  const signal = AbortSignal.any([request.signal, cancelled.signal]);
  const body = new ReadableStream({
    async start(controller) {
      const emit = (event: E) => { if (!signal.aborted) controller.enqueue(encoder.encode(JSON.stringify(event) + '\n')); };
      try { await run(emit, signal); }
      catch (error) {
        if (!signal.aborted) {
          console.error('Stream failed:', error instanceof Error ? `${error.name}: ${error.message}` : 'unknown');
          emit({ type: 'error', message: userMessage(error) } as unknown as E);
        }
      } finally { try { controller.close(); } catch { /* client went away */ } }
    },
    cancel() { cancelled.abort(); },
  });
  return new Response(body, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' } });
}

/** Promise.all with at most `limit` tasks in flight. */
export async function mapLimit<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => { while (next < items.length) { const i = next++; results[i] = await task(items[i]); } };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
