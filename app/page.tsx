'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowRight, ArrowUp, ArrowUpRight, Bookmark, Brain, Check, Globe2, LogOut, Menu, Search, Sparkles, Square, UserRound } from 'lucide-react';
import { HomeView } from '@/components/home-view';
import { MemoryView } from '@/components/memory-view';
import { ProductCard } from '@/components/product-card';
import { Sidebar } from '@/components/sidebar';
import { money, type ChatEvent, type Fact, type PriceInsight, type Product, type Saved, type SyncEvent } from '@/lib/types';

type View = 'home' | 'chat' | 'memory' | 'saved';
type Message = {
  id: string; role: 'user' | 'assistant'; text: string;
  products?: Product[]; suggestions?: string[]; auto?: boolean; error?: boolean; memoryUsed?: number; memoryAdded?: number;
};
type Conversation = { id: string; title: string; updatedAt: string; messages: Message[] };
type Stored = { facts: Fact[]; conversations: Conversation[]; summary: string | null; orders: number; lastSync: string | null; saved: Saved[] };
type Gmail = { connected: boolean; email?: string };
type Sync = { status: string; merchants: string[]; emails: number };

const STORAGE_KEY = 'magent.v2';
const EMPTY: Stored = { facts: [], conversations: [], summary: null, orders: 0, lastSync: null, saved: [] };
const PICKS_PROMPT = 'Based on my profile, pick a few things I would love right now.';

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
    <>
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i}>{para.split(/(\*\*[^*]+\*\*)/g).map((chunk, j): ReactNode =>
          chunk.startsWith('**') && chunk.endsWith('**') ? <strong key={j}>{chunk.slice(2, -2)}</strong> : chunk)}</p>
      ))}
    </>
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
  const [view, setView] = useState<View>('home');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState('');
  const dataRef = useRef(EMPTY);
  const activeRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const syncingRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function update(change: (current: Stored) => Stored) {
    dataRef.current = change(dataRef.current);
    setData(dataRef.current);
  }
  function activate(id: string | null, next: View) {
    activeRef.current = id;
    setActiveId(id);
    setView(next);
    setMobileOpen(false);
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
    void checkSaved();
    // runSync and checkSaved only read refs, so running this once on mount is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const conversations = data.conversations.slice(0, 30).map(c => ({ ...c, messages: c.messages.slice(-40) }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, conversations }));
    } catch { /* storage full */ }
  }, [data, hydrated]);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 4000); return () => clearTimeout(t); } }, [toast]);

  const active = data.conversations.find(c => c.id === activeId);
  const messages = view === 'chat' ? active?.messages ?? [] : [];
  useEffect(() => { if (busy) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

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
          else setToast(orders ? `Added ${orders} new order${orders > 1 ? 's' : ''} from Gmail to your memory` : 'Gmail checked · no new orders');
        }
      });
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Sync failed. Please try again.');
    } finally {
      syncingRef.current = false;
      setSync(null);
    }
    if (picks) void send(PICKS_PROMPT, { auto: true, fresh: true });
  }

  async function send(raw: string, options: { auto?: boolean; fresh?: boolean } = {}) {
    const text = raw.trim();
    if (!text || abortRef.current) return;
    const current = options.fresh ? undefined : dataRef.current.conversations.find(c => c.id === activeRef.current);
    const chatId = current?.id ?? crypto.randomUUID();
    const now = new Date().toISOString();
    const facts = dataRef.current.facts;
    const user: Message = { id: crypto.randomUUID(), role: 'user', text, auto: options.auto };
    const assistant: Message = { id: crypto.randomUUID(), role: 'assistant', text: '', memoryUsed: facts.length };
    const history = [...(current?.messages ?? []).filter(m => !m.error), user].slice(-20);
    while (history[0]?.role === 'assistant') history.shift();
    const recentProducts = history.flatMap(m => m.products ?? []).slice(-12);

    update(d => {
      const base = d.conversations.find(c => c.id === chatId) ?? { id: chatId, title: options.auto ? 'Your personalized picks' : text.slice(0, 60), updatedAt: now, messages: [] };
      const chat = { ...base, updatedAt: now, messages: [...base.messages, user, assistant] };
      return { ...d, conversations: [chat, ...d.conversations.filter(c => c.id !== chatId)].slice(0, 30) };
    });
    const patch = (change: (m: Message) => Message) => update(d => ({
      ...d, conversations: d.conversations.map(c => c.id === chatId ? { ...c, messages: c.messages.map(m => (m.id === assistant.id ? change(m) : m)) } : c),
    }));

    activate(chatId, 'chat');
    const controller = new AbortController();
    abortRef.current = controller;
    setDraft('');
    setBusy(true);
    setStatus('Thinking…');
    window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 60);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ messages: history.map(m => ({ role: m.role, text: apiText(m) })), facts, recentProducts }),
      });
      await readEvents<ChatEvent>(response, event => {
        if (event.type === 'text') patch(m => ({ ...m, text: m.text + event.delta }));
        else if (event.type === 'products') patch(m => ({ ...m, products: [...(m.products ?? []), ...event.products], suggestions: event.suggestions }));
        else if (event.type === 'status') setStatus(event.message);
        else if (event.type === 'fact') {
          update(d => ({ ...d, facts: [event.fact, ...d.facts.filter(f => f.key !== event.fact.key)] }));
          patch(m => ({ ...m, memoryAdded: (m.memoryAdded ?? 0) + 1 }));
        } else if (event.type === 'error') patch(m => ({ ...m, text: m.text ? `${m.text}\n\n${event.message}` : event.message, error: !m.text && !m.products }));
      });
    } catch (error) {
      if (controller.signal.aborted) patch(m => ({ ...m, text: m.text || 'Stopped. You can refine your request and try again.' }));
      else patch(m => ({ ...m, text: m.text || (error instanceof Error ? error.message : 'Something went wrong.'), error: true }));
    } finally {
      abortRef.current = null;
      setBusy(false);
      setStatus('');
    }
  }

  function stop() { abortRef.current?.abort(); }
  function newChat() {
    stop();
    activate(null, 'home');
    setDraft('');
    window.scrollTo({ top: 0 });
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }
  function openView(next: 'memory' | 'saved') { setMenuOpen(false); activate(activeRef.current, next); window.scrollTo({ top: 0 }); }

  function toggleSave(product: Product, insight: PriceInsight | null) {
    if (dataRef.current.saved.some(s => s.product.id === product.id)) {
      update(d => ({ ...d, saved: d.saved.filter(s => s.product.id !== product.id) }));
      setToast('Removed from saved');
      return;
    }
    const price = insight?.current ?? product.offers[0].price; // compare like with like on the next check
    update(d => ({ ...d, saved: [{ product, price, current: price, savedAt: new Date().toISOString() }, ...d.saved].slice(0, 50) }));
    setToast('Saved. magent will tell you when the price drops.');
  }

  async function checkSaved() {
    const list = dataRef.current.saved;
    if (!list.length) return;
    const latest = await Promise.all(list.map(s =>
      fetch(`/api/price/${encodeURIComponent(s.product.id)}`).then(r => (r.ok ? r.json() : null)).catch(() => null) as Promise<PriceInsight | null>));
    const prices = new Map(list.flatMap((s, i) => (latest[i] ? [[s.product.id, latest[i]!.current] as const] : [])));
    update(d => ({ ...d, saved: d.saved.map(s => (prices.has(s.product.id) ? { ...s, current: prices.get(s.product.id)! } : s)) }));
    const drops = list.filter(s => (prices.get(s.product.id) ?? s.price) < s.price - 0.5);
    if (drops.length) {
      const s = drops[0];
      setToast(`Price drop: ${s.product.title.slice(0, 40)} is now ${money(prices.get(s.product.id)!)} (was ${money(s.price)})${drops.length > 1 ? ` · +${drops.length - 1} more` : ''}`);
    }
  }

  // Log out = revoke Gmail at Google, drop the cookie, and wipe everything stored on this device.
  async function logout() {
    setMenuOpen(false);
    if (!window.confirm('Log out of magent? This disconnects Gmail and deletes your memory, chats and saved finds on this device.')) return;
    stop();
    await fetch('/api/gmail/disconnect', { method: 'POST' }).catch(() => undefined);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
    update(() => EMPTY);
    setGmail({ connected: false });
    activate(null, 'home');
    window.scrollTo({ top: 0 });
    setToast('Logged out. Gmail access was revoked and your data on this device was deleted.');
  }

  async function disconnect() {
    await fetch('/api/gmail/disconnect', { method: 'POST' }).catch(() => undefined);
    setGmail({ connected: false });
    setToast('Gmail disconnected. Access was revoked at Google.');
  }

  const connect = () => { location.href = '/api/gmail/connect'; };
  const gmailEmail = gmail?.connected ? gmail.email ?? 'Gmail' : null;
  function submit(e: FormEvent) { e.preventDefault(); void send(draft); }
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(draft); }
  }

  const composer = (home: boolean) => (
    <form className={`composer ${home ? 'home-composer' : 'chat-composer'}`} onSubmit={submit}>
      {home && <Search size={22} className="composer-search-icon" aria-hidden />}
      <label htmlFor="prompt" className="sr-only">What are you shopping for?</label>
      <textarea
        ref={inputRef}
        id="prompt"
        rows={1}
        value={draft}
        maxLength={4000}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={home ? 'Tell me what you’re shopping for…' : 'Refine your search, or ask about these picks…'}
        disabled={!hydrated}
      />
      {busy
        ? <button className="send-button stop-button" type="button" onClick={stop} aria-label="Stop response"><Square size={16} fill="currentColor" /></button>
        : <button className="send-button" type="submit" disabled={!draft.trim() || !hydrated} aria-label="Send">{home && <span>Find it</span>}{home ? <ArrowRight size={18} /> : <ArrowUp size={19} />}</button>}
    </form>
  );

  const breadcrumb = view === 'memory' ? 'Your memory' : view === 'saved' ? 'Saved finds' : view === 'chat' && active ? active.title : 'Find what you’ll love';

  return (
    <div className="studio-shell">
      <Sidebar
        open={mobileOpen}
        conversations={data.conversations}
        activeId={view === 'chat' ? activeId : null}
        memoryActive={view === 'memory'}
        factCount={data.facts.length}
        gmailEmail={gmailEmail}
        syncing={!!sync}
        onNew={newChat}
        onSelect={id => { stop(); activate(id, 'chat'); window.scrollTo({ top: 0 }); }}
        onDelete={id => { if (id === activeRef.current) newChat(); update(d => ({ ...d, conversations: d.conversations.filter(c => c.id !== id) })); }}
        onMemory={() => openView('memory')}
        onConnect={connect}
        onClose={() => setMobileOpen(false)}
      />

      <div className="studio-content">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
            <button type="button" className="header-home" onClick={newChat} aria-label="magent home">
              <img src="/brand/magent-symbol.webp" alt="" className="header-symbol" />
              <img src="/brand/magent-wordmark.webp" alt="magent" className="header-wordmark" />
            </button>
            <span className="breadcrumb-slash">/</span>
            <span className="breadcrumb-label">{breadcrumb}</span>
          </div>
          <div className="topbar-right">
            <span className="region"><Globe2 size={14} aria-hidden />US · USD</span>
            <button type="button" className={`saved-button${view === 'saved' ? ' active' : ''}`} onClick={() => openView('saved')}>
              <Bookmark size={16} aria-hidden /><span className="saved-label">Saved finds</span>{data.saved.length > 0 && <span className="saved-count">{data.saved.length}</span>}
            </button>
            <div className="account-menu-wrap">
              <button type="button" className="avatar-button" onClick={() => setMenuOpen(o => !o)} aria-label="Account menu" aria-haspopup="menu" aria-expanded={menuOpen}><UserRound size={18} /></button>
              {menuOpen && (
                <>
                  <button type="button" className="menu-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
                  <div className="account-menu" role="menu" onKeyDown={e => { if (e.key === 'Escape') setMenuOpen(false); }}>
                    <div className="account-menu-head">
                      <strong>{gmailEmail ?? 'Not connected'}</strong>
                      <small>{gmailEmail ? 'Gmail connected' : 'Your data stays on this device'}</small>
                    </div>
                    <button type="button" role="menuitem" onClick={() => openView('memory')}><Brain size={16} aria-hidden /> Your memory</button>
                    <button type="button" role="menuitem" onClick={() => openView('saved')}><Bookmark size={16} aria-hidden /> Saved finds</button>
                    {!gmailEmail && <button type="button" role="menuitem" onClick={connect}><Sparkles size={16} aria-hidden /> Connect Gmail</button>}
                    <button type="button" role="menuitem" className="danger" onClick={() => void logout()}><LogOut size={16} aria-hidden /> Log out</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main id="main" className={view === 'chat' ? 'chat-main' : view === 'home' ? 'home-main' : 'page-main'}>
          {view === 'home' && (
            <HomeView
              composer={composer(true)}
              disabled={!hydrated || busy}
              onPrompt={text => void send(text, { fresh: true })}
              gmailEmail={gmailEmail}
              gmailChecked={gmail !== null}
              sync={sync}
              summary={data.summary}
              facts={data.facts}
              orders={data.orders}
              onConnect={connect}
              onPicks={() => void send(PICKS_PROMPT, { auto: true, fresh: true })}
              onSync={() => void runSync(data.lastSync, false)}
              onMemory={() => openView('memory')}
            />
          )}

          {view === 'chat' && (
            <div className="conversation-content">
              {messages.map((m, index) => m.role === 'user'
                ? (m.auto
                  ? <div key={m.id} className="auto-request"><Sparkles size={14} aria-hidden /> Personalized picks from your memory</div>
                  : <div key={m.id} className="user-message"><span>You</span><div>{m.text}</div></div>)
                : (
                  <section key={m.id} className="assistant-message" aria-label="magent response">
                    <div className="assistant-heading">
                      <span className="assistant-avatar"><img src="/brand/magent-symbol.webp" alt="" /></span>
                      <strong>magent</strong>
                      {(!!m.memoryUsed || !!m.memoryAdded) && (
                        <button type="button" className="memory-context-chip" onClick={() => openView('memory')}>
                          <Brain size={13} aria-hidden />{m.memoryAdded ? 'Memory updated' : `Personalized with ${m.memoryUsed} ${m.memoryUsed === 1 ? 'memory' : 'memories'}`}
                        </button>
                      )}
                    </div>
                    {m.text && <div className={`assistant-copy${m.error ? ' response-error' : ''}`}><RichText text={m.text} /></div>}
                    {!!m.products?.length && (
                      <>
                        <div className={`product-grid${m.products.length === 2 ? ' two-products' : ''}`}>
                          {m.products.map(p => <ProductCard key={p.id} product={p} saved={data.saved.some(s => s.product.id === p.id)} onSave={toggleSave} />)}
                        </div>
                        <p className="recommendation-note">Prices and availability can change. Confirm size and final price at the retailer.</p>
                      </>
                    )}
                    {busy && index === messages.length - 1 && (
                      <div className="thinking-status" role="status"><span className="thinking-dots"><i /><i /><i /></span>{status}</div>
                    )}
                    {!(busy && index === messages.length - 1) && !m.error && !!m.suggestions?.length && (
                      <div className="followups">
                        <p>Where should we go from here?</p>
                        <div>{m.suggestions.map(s => <button type="button" key={s} disabled={busy} onClick={() => void send(s)}>{s}<ArrowUpRight size={14} aria-hidden /></button>)}</div>
                      </div>
                    )}
                  </section>
                ))}
              <div ref={bottomRef} className="conversation-bottom" />
            </div>
          )}

          {view === 'memory' && (
            <MemoryView
              facts={data.facts}
              summary={data.summary}
              orders={data.orders}
              lastSync={data.lastSync}
              gmailEmail={gmailEmail}
              syncing={!!sync}
              onDelete={key => update(d => ({ ...d, facts: d.facts.filter(f => f.key !== key) }))}
              onClear={() => update(d => ({ ...d, facts: [], summary: null, orders: 0, lastSync: null }))}
              onConnect={connect}
              onSync={() => void runSync(data.lastSync, false)}
              onDisconnect={() => void disconnect()}
            />
          )}

          {view === 'saved' && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">THE ONES WORTH KEEPING</p>
                  <h1>Your saved finds<span>.</span></h1>
                  <p>A shortlist with your name on it. magent checks prices each time you come back.</p>
                </div>
              </div>
              {data.saved.length ? (
                <div className="product-grid">
                  {data.saved.map(s => (
                    <ProductCard key={s.product.id} product={s.product} saved onSave={toggleSave} drop={s.price - s.current > 0.5 ? s.price - s.current : undefined} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Bookmark size={28} strokeWidth={1.3} aria-hidden />
                  <h2>Nothing saved yet.</h2>
                  <p>Tap the bookmark on any pick to save it. magent will tell you when the price drops.</p>
                  <button type="button" className="primary-button" onClick={newChat}>Start looking <ArrowRight size={16} aria-hidden /></button>
                </div>
              )}
            </>
          )}
        </main>

        {view === 'chat' && <div className="composer-dock">{composer(false)}</div>}
      </div>

      {toast && <div className="toast" role="status"><Check size={16} aria-hidden />{toast}</div>}
    </div>
  );
}
