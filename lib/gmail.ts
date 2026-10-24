import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { AppError } from './server';

export const SESSION_COOKIE = 'magent_gmail';
export const STATE_COOKIE = 'magent_oauth_state';
const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

/** The refresh token was revoked or expired: the user has to connect again. */
export class GmailAuthError extends Error {}

export type GmailSession = { rt: string; email: string };

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new AppError('Gmail connection is not configured yet.');
  return value;
}

// The refresh token lives only in this encrypted, httpOnly cookie. Nothing is stored server-side.
const cookieKey = () => createHash('sha256').update(env('SESSION_SECRET')).digest();

export function seal(session: GmailSession) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', cookieKey(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(session), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
}

export function unseal(value: string | undefined): GmailSession | null {
  if (!value) return null;
  try {
    const raw = Buffer.from(value, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', cookieKey(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const session = JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8'));
    return typeof session?.rt === 'string' && typeof session?.email === 'string' ? session : null;
  } catch { return null; }
}

export const cookieOptions = (request: Request, maxAge: number) =>
  ({ httpOnly: true, secure: new URL(request.url).protocol === 'https:', sameSite: 'lax' as const, path: '/', maxAge });

const redirectUri = (request: Request) => new URL('/api/gmail/callback', request.url).href;

export function authUrl(request: Request, state: string) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: env('GOOGLE_CLIENT_ID'), redirect_uri: redirectUri(request), response_type: 'code',
    scope: SCOPE, access_type: 'offline', prompt: 'consent', state,
  }).toString();
  return url.href;
}

async function token(params: Record<string, string>) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env('GOOGLE_CLIENT_ID'), client_secret: env('GOOGLE_CLIENT_SECRET'), ...params }),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 400 || res.status === 401) throw new GmailAuthError(String(data.error ?? 'invalid_grant'));
  if (!res.ok || typeof data.access_token !== 'string') throw new AppError('Could not reach Google. Please try again.');
  return data as { access_token: string; refresh_token?: string };
}

export const exchangeCode = (code: string, request: Request) =>
  token({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(request) });
export const accessToken = async (refreshToken: string) =>
  (await token({ grant_type: 'refresh_token', refresh_token: refreshToken })).access_token;

export async function revoke(refreshToken: string) {
  await fetch('https://oauth2.googleapis.com/revoke', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: refreshToken }),
  }).catch(() => undefined);
}

async function gmail(path: string, accessToken: string, signal?: AbortSignal) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { authorization: `Bearer ${accessToken}` }, signal, cache: 'no-store',
  });
  if (res.status === 401 || res.status === 403) throw new GmailAuthError(`gmail_${res.status}`);
  if (!res.ok) throw new AppError('Gmail is not responding. Please try again.');
  return res.json();
}

export const gmailAddress = async (accessToken: string) => String((await gmail('profile', accessToken)).emailAddress ?? '');

const PURCHASES = '(category:purchases OR subject:(order OR receipt OR invoice OR shipped OR "your purchase" OR 주문 OR 영수증 OR 결제 OR 배송))';

/** Up to 50 purchase-related emails from the last 12 months, or since `after`. */
export async function purchaseMessageIds(accessToken: string, after: Date | null, signal?: AbortSignal): Promise<string[]> {
  const since = after ? `after:${Math.floor(after.getTime() / 1000)}` : 'newer_than:1y';
  const q = `${since} ${PURCHASES} -in:spam -in:trash`;
  const data = await gmail(`messages?${new URLSearchParams({ q, maxResults: '50' })}`, accessToken, signal);
  return Array.isArray(data.messages) ? data.messages.map((m: { id: string }) => m.id) : [];
}

export type EmailDigest = { from: string; subject: string; date: string; text: string };

type Part = { mimeType?: string; body?: { data?: string }; parts?: Part[] };
const flatten = (part: Part): Part[] => [part, ...(part.parts ?? []).flatMap(flatten)];
const decode = (data: string) => Buffer.from(data, 'base64url').toString('utf8');

const entities: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function htmlToText(html: string) {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/tr|\/li|\/h\d)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) =>
      e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : entities[e.toLowerCase()] ?? m);
}

const tidy = (text: string) => text.replace(/https?:\/\/\S+/g, '').replace(/[ \t ​-‍]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();

/** Headers plus readable body text, trimmed. The email itself is never stored. */
export async function emailDigest(accessToken: string, id: string, signal?: AbortSignal): Promise<EmailDigest> {
  const message = await gmail(`messages/${encodeURIComponent(id)}?format=full`, accessToken, signal);
  const headers = new Map<string, string>((message.payload?.headers ?? []).map((h: { name: string; value: string }) => [h.name.toLowerCase(), h.value]));
  const parts = flatten(message.payload ?? {});
  const plain = parts.find(p => p.mimeType === 'text/plain' && p.body?.data);
  const html = parts.find(p => p.mimeType === 'text/html' && p.body?.data);
  const plainText = plain?.body?.data ? tidy(decode(plain.body.data)) : '';
  const text = plainText.length > 400 || !html?.body?.data ? plainText : tidy(htmlToText(decode(html.body.data)));
  return {
    from: headers.get('from') ?? '',
    subject: headers.get('subject') ?? '',
    date: new Date(Number(message.internalDate) || Date.now()).toISOString().slice(0, 10),
    text: (text || String(message.snippet ?? '')).slice(0, 4000),
  };
}

/** "Amazon.com" <auto-confirm@amazon.com> -> Amazon.com */
export function senderName(from: string) {
  const name = from.replace(/<[^>]*>/, '').replace(/"/g, '').trim();
  return name || from.match(/@([^>\s]+)/)?.[1] || from;
}
