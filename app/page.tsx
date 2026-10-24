'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowUp, Mail, Plus, RefreshCw, ShieldCheck, Sparkles, Square, UserRound } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { ProfilePanel } from '@/components/profile-panel';
import type { ChatEvent, Fact, Product, SyncEvent } from '@/lib/types';

type Message = { id: string; role: 'user' | 'assistant'; text: string; products?: Product[]; auto?: boolean; error?: boolean };
type Stored = { facts: Fact[]; messages: Message[]; summary: string | null; orders: number; lastSync: string | null };
type Gmail = { connected: boolean; email?: string };
type Sync = { status: string; merchants: string[]; emails: number };

const STORAGE_KEY = 'magent.v1';
const EMPTY: Stored = { facts: [], messages: [], summary: null, orders: 0, lastSync: null };
const PICKS_PROMPT = 'Based on my profile, pick a few things I would love right now.';
const EXAMPLES = ['A carry-on suitcase under $200', 'Running shoes for flat feet', 'A minimalist desk lamp', 'Gift for a coffee lover under $50'];

async function readEvents<E>(response: Response, onEvent: (event: E) => void) {
  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? 'Request failed. Please try again.');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) if (line.trim()) onEvent(JSON.parse(line) as E);
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer) as E);
}

// User-stated facts always win over Gmail inferences with the same key.
function mergeGmailFacts(current: Fact[], incoming: Fact[]) {
  const chat = current.filter(f => f.source === 'chat');
  const chatKeys = new Set(chat.map(f => f.key));
  return [...chat, ...incoming.filter(f => !chatKeys.has(f.key))];
}

// What the agent sees for earlier turns, including which products were shown.
function apiText(m: Message) {
  if (m.role === 'user') return m.text;
  const shown = m.products?.length ? `\n[Shown: ${m.products.map(p => `id=${p.id} "${p.title}" $${p.offers[0].price}`).join('; ')}]` : '';
  return (m.text + shown).trim() || '…';
}

function RichText({ text }: { text: string }) {
  return (
    <div className="rich">
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i}>{para.split(/(\*\*[^*]+\*\*)/g).map((chunk, j): ReactNode =>
          chunk.startsWith('**') && chunk.endsWith('**') ? <strong key={j}>{chunk.slice(2, -2)}</strong> : chunk)}</p>
      ))}
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<Stored>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [gmail, setGmail] = useState<Gmail | null>(null);
  const [sync, setSync] = useState<Sync | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [draft, setDraft] = useState('');
  const [panel, setPanel] = useState(false);
  const [toast, setToast] = useState('');
  const dataRef = useRef(EMPTY);
  const abortRef = useRef<AbortController | null>(null);
  const syncingRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function update(change: (current: Stored) => Stored) {
    dataRef.current = change(dataRef.current);
    setData(dataRef.current);
  }

  useEffect(() => {
    let stored = EMPTY;
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) stored = { ...EMPTY, ...JSON.parse(raw) }; } catch { /* start fresh */ }
    dataRef.current = stored;
    setData(stored);
    setHydrated(true);
    const param = new URLSearchParams(location.search).get('gmail');
    if (param) history.replaceState(null, '', location.pathname);
    if (param === 'denied') setToast('Gmail access was not granted.');
    if (param === 'error' || param === 'unavailable') setToast('Could not connect Gmail. Please try again.');
    fetch('/api/gmail/status').then(r => r.json()).then((s: Gmail) => {
      setGmail(s);
      if (!s.connected) return;
      if (param === 'connected') void runSync(null, true);
      else if (!stored.lastSync || Date.now() - Date.parse(stored.lastSync) > 30 * 60_000) void runSync(stored.lastSync, false);
    }).catch(() => setGmail({ connected: false }));
    // runSync only reads refs, so running this once on mount is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, messages: data.messages.slice(-40) })); } catch { /* storage full */ }
  }, [data, hydrated]);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 4000); return () => clearTimeout(t); } }, [toast]);
  useEffect(() => { if (busy || sync) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [data.messages, busy, sync]);

  async function runSync(after: string | null, initial: boolean) {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSync({ status: 'Connecting to Gmail…', merchants: [], emails: 0 });
    let picks = false;
    try {
      const response = await fetch('/api/gmail/sync', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ after, facts: dataRef.current.facts }),
      });
      if (response.status === 401) { setGmail({ connected: false }); return; }
      await readEvents<SyncEvent>(response, event => {
        if (event.type === 'status') setSync(s => s && { ...s, status: event.message });
        else if (event.type === 'merchants') setSync(s => s && { ...s, merchants: event.merchants, emails: event.emails });
        else if (event.type === 'reconnect') { setGmail({ connected: false }); setToast('Your Gmail connection expired. Please connect again.'); }
        else if (event.type === 'error') setToast(event.message);
        else if (event.type === 'profile') {
          const { facts, summary, orders, syncedAt } = event;
          update(d => facts
            ? { ...d, lastSync: syncedAt, facts: mergeGmailFacts(d.facts, facts), summary: summary ?? d.summary, orders: after ? d.orders + orders : orders }
            : { ...d, lastSync: syncedAt });
          if (initial) { picks = !!facts?.length; if (!facts?.length) setToast('No order emails found in the last 12 months.'); }
          else setToast(orders ? `Added ${orders} new order${orders > 1 ? 's' : ''} from Gmail to your profile` : 'Gmail checked · no new orders');
        }
      });
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Sync failed. Please try again.');
    } finally {
      syncingRef.current = false;
      setSync(null);
    }
    if (picks) void send(PICKS_PROMPT, true);
  }

  async function send(raw: string, auto = false) {
    const text = raw.trim();
    if (!text || abortRef.current) return;
    const user: Message = { id: crypto.randomUUID(), role: 'user', text, auto };
    const assistant: Message = { id: crypto.randomUUID(), role: 'assistant', text: '' };
    const history = [...dataRef.current.messages.filter(m => !m.error), user].slice(-20);
    while (history[0]?.role === 'assistant') history.shift();
    const recentProducts = history.flatMap(m => m.products ?? []).slice(-12);
    update(d => ({ ...d, messages: [...d.messages, user, assistant] }));
    const patch = (change: (m: Message) => Message) => update(d => ({ ...d, messages: d.messages.map(m => (m.id === assistant.id ? change(m) : m)) }));
    const controller = new AbortController();
    abortRef.current = controller;
    setDraft('');
    setBusy(true);
    setStatus('Thinking…');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ messages: history.map(m => ({ role: m.role, text: apiText(m) })), facts: dataRef.current.facts, recentProducts }),
      });
      await readEvents<ChatEvent>(response, event => {
        if (event.type === 'text') patch(m => ({ ...m, text: m.text + event.delta }));
        else if (event.type === 'products') patch(m => ({ ...m, products: [...(m.products ?? []), ...event.products] }));
        else if (event.type === 'status') setStatus(event.message);
        else if (event.type === 'fact') {
          update(d => ({ ...d, facts: [event.fact, ...d.facts.filter(f => f.key !== event.fact.key)] }));
          setToast(`Remembered: ${event.fact.title}`);
        } else if (event.type === 'error') patch(m => ({ ...m, text: m.text ? `${m.text}\n\n${event.message}` : event.message, error: !m.text && !m.products }));
      });
    } catch (error) {
      if (!controller.signal.aborted) patch(m => ({ ...m, text: m.text || (error instanceof Error ? error.message : 'Something went wrong.'), error: true }));
    } finally {
      abortRef.current = null;
      setBusy(false);
      setStatus('');
    }
  }

  async function disconnect() {
    await fetch('/api/gmail/disconnect', { method: 'POST' }).catch(() => undefined);
    setGmail({ connected: false });
    setToast('Gmail disconnected. Your access token was revoked.');
  }

  function submit(e: FormEvent) { e.preventDefault(); void send(draft); }
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(draft); }
  }

  const connect = () => { location.href = '/api/gmail/connect'; };
  const hasProfile = data.facts.length > 0;
  const showHero = hydrated && !data.messages.length && !sync;

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="/" aria-label="magent home">
          <img src="/brand/magent-symbol.webp" alt="" width={30} height={30} />
          <img src="/brand/magent-wordmark.webp" alt="magent" className="wordmark" />
        </a>
        <div className="top-actions">
          {data.messages.length > 0 && (
            <button type="button" className="btn ghost" onClick={() => update(d => ({ ...d, messages: [] }))} disabled={busy}><Plus size={16} aria-hidden /> New chat</button>
          )}
          {gmail?.connected ? (
            <span className="pill">
              <span className="dot" aria-hidden />
              <span className="pill-email">{gmail.email}</span>
              <button type="button" className="icon-btn" onClick={() => void runSync(data.lastSync, false)} disabled={!!sync} aria-label="Check Gmail for new orders">
                <RefreshCw size={14} className={sync ? 'spin' : ''} />
              </button>
            </span>
          ) : gmail && (
            <button type="button" className="btn ghost" onClick={connect}><Mail size={16} aria-hidden /> Connect Gmail</button>
          )}
          <button type="button" className="btn ghost" onClick={() => setPanel(true)}>
            <UserRound size={16} aria-hidden /> Profile{hasProfile && <span className="count">{data.facts.length}</span>}
          </button>
        </div>
      </header>

      <main className="main">
        {showHero && (
          <section className="hero">
            <p className="eyebrow"><Sparkles size={14} aria-hidden /> Your personal AI shopping agent</p>
            <h1>Shopping that <span>already knows you.</span></h1>
            <p className="lede">Connect Gmail and magent learns your brands, sizes and budgets from your past orders, then finds what you&apos;ll love next at the best price across stores.</p>
            <div className="hero-actions">
              {gmail?.connected
                ? <button type="button" className="btn primary lg" onClick={() => void send(PICKS_PROMPT, true)} disabled={!hasProfile}><Sparkles size={18} aria-hidden /> Show my picks</button>
                : <button type="button" className="btn primary lg" onClick={connect}><Mail size={18} aria-hidden /> Connect Gmail</button>}
              <span className="hero-or">or just ask below</span>
            </div>
            <p className="privacy"><ShieldCheck size={15} aria-hidden /> Reads only order emails · Never stores your emails · Your profile stays in this browser</p>
            <div className="examples">
              {EXAMPLES.map(example => <button type="button" key={example} className="chip" onClick={() => void send(example)}>{example}</button>)}
            </div>
          </section>
        )}

        {hasProfile && !showHero && data.summary && (
          <section className="profile-card">
            <div className="profile-card-head">
              <p className="eyebrow"><Sparkles size={14} aria-hidden /> Your taste profile{data.orders ? ` · from ${data.orders} orders` : ''}</p>
              <button type="button" className="link" onClick={() => setPanel(true)}>See all</button>
            </div>
            <p className="profile-summary">{data.summary}</p>
            <div className="fact-chips">
              {data.facts.slice(0, 8).map(f => <span key={f.key} className={`fact-chip ${f.source}`} title={f.evidence}><b>{f.title}</b> {f.text}</span>)}
            </div>
          </section>
        )}

        <div className="thread">
          {data.messages.map(m => m.role === 'user'
            ? (m.auto
              ? <p key={m.id} className="auto-label"><Sparkles size={14} aria-hidden /> Personalized picks from your profile</p>
              : <div key={m.id} className="bubble user">{m.text}</div>)
            : (
              <div key={m.id} className={`assistant${m.error ? ' error' : ''}`}>
                {!!m.products?.length && <div className="grid">{m.products.map(p => <ProductCard key={p.id} product={p} />)}</div>}
                {m.text && <RichText text={m.text} />}
              </div>
            ))}
          {sync && (
            <section className="sync-card" aria-live="polite">
              <div className="sync-head"><span className="spinner" aria-hidden /><p>{sync.status}</p></div>
              {sync.merchants.length > 0 && (
                <>
                  <p className="sync-sub">Found {sync.emails} order emails from</p>
                  <div className="merchants">{sync.merchants.map(name => <span key={name} className="chip static">{name}</span>)}</div>
                </>
              )}
            </section>
          )}
          {busy && <p className="status"><span className="spinner" aria-hidden />{status}</p>}
          <div ref={bottomRef} />
        </div>
      </main>

      <form className="composer" onSubmit={submit}>
        <div className="composer-box">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={hasProfile ? 'Ask for anything. magent knows your sizes and style.' : 'What are you shopping for?'}
            rows={1}
            maxLength={4000}
            aria-label="Message magent"
          />
          {busy
            ? <button type="button" className="send" onClick={() => abortRef.current?.abort()} aria-label="Stop"><Square size={16} /></button>
            : <button type="submit" className="send" disabled={!draft.trim()} aria-label="Send"><ArrowUp size={18} /></button>}
        </div>
      </form>

      {panel && (
        <ProfilePanel
          facts={data.facts}
          summary={data.summary}
          orders={data.orders}
          gmailEmail={gmail?.connected ? gmail.email ?? null : null}
          onDelete={key => update(d => ({ ...d, facts: d.facts.filter(f => f.key !== key) }))}
          onClear={() => update(d => ({ ...d, facts: [], summary: null, orders: 0, lastSync: null }))}
          onDisconnect={() => void disconnect()}
          onClose={() => setPanel(false)}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
