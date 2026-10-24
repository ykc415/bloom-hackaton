'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowRight, ArrowUp, ArrowUpRight, Bookmark, Brain, Check, Globe2, LogOut, Menu, Plug, Search, Sparkles, Square, UserRound } from 'lucide-react';
import { ArtifactViewer } from '@/components/artifact-viewer';
import { ArtifactsView } from '@/components/artifacts-view';
import { ConnectionsView } from '@/components/connections-view';
import { HomeView } from '@/components/home-view';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Landing } from '@/components/landing';
import { MemoryView } from '@/components/memory-view';
import { ProductCard } from '@/components/product-card';
import { ProductDialog } from '@/components/product-dialog';
import { Sidebar } from '@/components/sidebar';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { money, type Artifact, type ArtifactEvent, type ArtifactKind, type ChatEvent, type Fact, type HomeContent, type PriceInsight, type Product, type Saved, type SyncEvent } from '@/lib/types';

type View = 'home' | 'chat' | 'memory' | 'saved' | 'connections' | 'artifacts' | 'artifact';
type Message = {
  id: string; role: 'user' | 'assistant'; text: string;
  products?: Product[]; suggestions?: string[]; auto?: boolean; error?: boolean; memoryUsed?: number; memoryAdded?: number;
};
type Conversation = { id: string; title: string; updatedAt: string; messages: Message[] };
type Stored = {
  facts: Fact[]; conversations: Conversation[]; summary: string | null; orders: number; lastSync: string | null; saved: Saved[];
  memoryEnabled: boolean; learnFromChat: boolean;
  home: { key: string; data: HomeContent } | null;
  artifacts: Artifact[];
};
type Gmail = { connected: boolean; email?: string };
type Sync = { status: string; merchants: string[]; emails: number };

const STORAGE_KEY = 'magent.v2';
const EMPTY: Stored = { facts: [], conversations: [], summary: null, orders: 0, lastSync: null, saved: [], memoryEnabled: true, learnFromChat: true, home: null, artifacts: [] };

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

// Short fingerprint of the memory + language, so the personalized home is rebuilt only when either changes.
function homeKey(facts: Fact[], locale: string) {
  const source = locale + facts.map(f => `${f.key}:${f.text}`).sort().join('|');
  let hash = 5381;
  for (let i = 0; i < source.length; i++) hash = ((hash * 33) ^ source.charCodeAt(i)) >>> 0;
  return hash.toString(36);
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
  return <I18nProvider><App /></I18nProvider>;
}

function App() {
  const { t, tc, locale, dateLocale } = useI18n();
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
  const [detail, setDetail] = useState<Product | null>(null);
  const [ready, setReady] = useState<{ orders: number } | null>(null);
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ kind: ArtifactKind; status: string } | null>(null);
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
    if (param === 'denied') setToast(t('toast.gmailDenied'));
    if (param === 'error' || param === 'unavailable') setToast(t('toast.gmailError'));
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

  // Personalize the home shortcuts in the background whenever memory or language changes.
  const personalKey = data.memoryEnabled && data.facts.length ? homeKey(data.facts, locale) : null;
  useEffect(() => {
    if (!hydrated || !gmail?.connected || !personalKey || dataRef.current.home?.key === personalKey) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch('/api/home', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ facts: dataRef.current.facts, locale }),
      })
        .then(r => (r.ok ? r.json() : null))
        .then((content: HomeContent | null) => { if (content) update(d => ({ ...d, home: { key: personalKey, data: content } })); })
        .catch(() => undefined);
    }, 1500);
    return () => { window.clearTimeout(timer); controller.abort(); };
    // update only touches refs/state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, gmail?.connected, personalKey, locale]);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 4000); return () => clearTimeout(t); } }, [toast]);

  const active = data.conversations.find(c => c.id === activeId);
  const messages = view === 'chat' ? active?.messages ?? [] : [];
  useEffect(() => { if (busy) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

  async function runSync(after: string | null, initial: boolean) {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSync({ status: t('sync.connecting'), merchants: [], emails: 0 });
    if (initial) { setReady(null); window.setTimeout(() => document.getElementById('personal')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150); }
    try {
      const response = await fetch('/api/gmail/sync', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ after, facts: dataRef.current.facts, locale }),
      });
      if (response.status === 401) { setGmail({ connected: false }); return; }
      await readEvents<SyncEvent>(response, event => {
        if (event.type === 'status') setSync(s => s && { ...s, status: 'count' in event ? t(`sync.${event.code}`, { count: event.count }) : t(`sync.${event.code}`) });
        else if (event.type === 'merchants') setSync(s => s && { ...s, merchants: event.merchants, emails: event.emails });
        else if (event.type === 'reconnect') { setGmail({ connected: false }); setToast(t('toast.gmailExpired')); }
        else if (event.type === 'error') setToast(event.message);
        else if (event.type === 'profile') {
          const { facts, summary, orders, syncedAt } = event;
          update(d => facts
            ? { ...d, lastSync: syncedAt, facts: mergeGmailFacts(d.facts, facts), summary: summary ?? d.summary, orders: after ? d.orders + orders : orders }
            : { ...d, lastSync: syncedAt });
          // First sync: announce that picks are now personalized instead of jumping into recommendations.
          if (initial && facts?.length) { setReady({ orders }); setToast(t('toast.profileReady')); }
          else if (initial) setToast(t('toast.noOrders'));
          else setToast(orders ? tc('toast.newOrders', orders) : t('toast.noNewOrders'));
        }
      });
    } catch (error) {
      setToast(error instanceof Error ? error.message : t('toast.syncFailed'));
    } finally {
      syncingRef.current = false;
      setSync(null);
    }
  }

  async function send(raw: string, options: { auto?: boolean; fresh?: boolean } = {}) {
    const text = raw.trim();
    if (!text || abortRef.current) return;
    const current = options.fresh ? undefined : dataRef.current.conversations.find(c => c.id === activeRef.current);
    const chatId = current?.id ?? crypto.randomUUID();
    const now = new Date().toISOString();
    const facts = dataRef.current.memoryEnabled ? dataRef.current.facts : [];
    const user: Message = { id: crypto.randomUUID(), role: 'user', text, auto: options.auto };
    const assistant: Message = { id: crypto.randomUUID(), role: 'assistant', text: '', memoryUsed: facts.length };
    const history = [...(current?.messages ?? []).filter(m => !m.error), user].slice(-20);
    while (history[0]?.role === 'assistant') history.shift();
    const recentProducts = history.flatMap(m => m.products ?? []).slice(-12);

    update(d => {
      const base = d.conversations.find(c => c.id === chatId) ?? { id: chatId, title: options.auto ? t('chat.picksTitle', { date: new Date().toLocaleString(dateLocale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }) : text.slice(0, 60), updatedAt: now, messages: [] };
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
    setStatus(t('status.thinking'));
    window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 60);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ messages: history.map(m => ({ role: m.role, text: apiText(m) })), facts, recentProducts, capture: dataRef.current.learnFromChat, locale }),
      });
      await readEvents<ChatEvent>(response, event => {
        if (event.type === 'text') patch(m => ({ ...m, text: m.text + event.delta }));
        else if (event.type === 'products') patch(m => ({ ...m, products: [...(m.products ?? []), ...event.products], suggestions: event.suggestions }));
        else if (event.type === 'status') setStatus(event.code === 'searching' ? t('status.searching', { query: event.query }) : t('status.thinking'));
        else if (event.type === 'fact') {
          update(d => ({ ...d, facts: [event.fact, ...d.facts.filter(f => f.key !== event.fact.key)] }));
          patch(m => ({ ...m, memoryAdded: (m.memoryAdded ?? 0) + 1 }));
        } else if (event.type === 'error') patch(m => ({ ...m, text: m.text ? `${m.text}\n\n${event.message}` : event.message, error: !m.text && !m.products }));
      });
    } catch (error) {
      if (controller.signal.aborted) patch(m => ({ ...m, text: m.text || t('chat.stopped') }));
      else patch(m => ({ ...m, text: m.text || (error instanceof Error ? error.message : t('chat.error')), error: true }));
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
  function openView(next: 'memory' | 'saved' | 'connections' | 'artifacts') { setMenuOpen(false); activate(activeRef.current, next); window.scrollTo({ top: 0 }); }

  function toggleSave(product: Product, insight: PriceInsight | null) {
    if (dataRef.current.saved.some(s => s.product.id === product.id)) {
      update(d => ({ ...d, saved: d.saved.filter(s => s.product.id !== product.id) }));
      setToast(t('toast.unsaved'));
      return;
    }
    const price = insight?.current ?? product.offers[0].price; // compare like with like on the next check
    update(d => ({ ...d, saved: [{ product, price, current: price, savedAt: new Date().toISOString() }, ...d.saved].slice(0, 50) }));
    setToast(t('toast.saved'));
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
      setToast(t('toast.priceDrop', { title: s.product.title.slice(0, 40), price: money(prices.get(s.product.id)!), old: money(s.price) }) + (drops.length > 1 ? t('toast.priceDropMore', { count: drops.length - 1 }) : ''));
    }
  }

  // Log out = revoke Gmail at Google, drop the cookie, and wipe everything stored on this device.
  async function logout() {
    setMenuOpen(false);
    if (!window.confirm(t('confirm.logout'))) return;
    stop();
    await fetch('/api/gmail/disconnect', { method: 'POST' }).catch(() => undefined);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
    update(() => EMPTY);
    setGmail({ connected: false });
    activate(null, 'home');
    window.scrollTo({ top: 0 });
    setToast(t('toast.loggedOut'));
  }

  // What the user searched for recently, for artifact pages.
  const recentSearches = () => dataRef.current.conversations
    .flatMap(c => c.messages.filter(m => m.role === 'user' && !m.auto).map(m => m.text.slice(0, 200)))
    .slice(0, 15);

  async function createArtifact(kind: ArtifactKind, prompt: string) {
    if (creating) return;
    setCreating({ kind, status: t('artifacts.planning') });
    try {
      const response = await fetch('/api/artifacts', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, prompt, facts: dataRef.current.memoryEnabled ? dataRef.current.facts : [], history: recentSearches(), locale }),
      });
      await readEvents<ArtifactEvent>(response, event => {
        if (event.type === 'status') setCreating({ kind, status: event.code === 'searching' ? t('artifacts.searching', { count: event.count }) : t(`artifacts.${event.code}`) });
        else if (event.type === 'error') setToast(event.message);
        else if (event.type === 'artifact') {
          update(d => ({ ...d, artifacts: [event.artifact, ...d.artifacts].slice(0, 12) }));
          setArtifactId(event.artifact.id);
          activate(activeRef.current, 'artifact');
          window.scrollTo({ top: 0 });
        }
      });
    } catch (error) {
      setToast(error instanceof Error ? error.message : t('artifacts.failed'));
    } finally {
      setCreating(null);
    }
  }

  function deleteArtifact(id: string) {
    if (!window.confirm(t('artifacts.confirmDelete'))) return;
    update(d => ({ ...d, artifacts: d.artifacts.filter(a => a.id !== id) }));
    if (artifactId === id) { setArtifactId(null); setView('artifacts'); }
  }

  async function disconnect() {
    await fetch('/api/gmail/disconnect', { method: 'POST' }).catch(() => undefined);
    setGmail({ connected: false });
    setToast(t('toast.disconnected'));
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
      <label htmlFor="prompt" className="sr-only">{t('composer.label')}</label>
      <textarea
        ref={inputRef}
        id="prompt"
        rows={1}
        value={draft}
        maxLength={4000}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={home ? t('composer.homePlaceholder') : t('composer.chatPlaceholder')}
        disabled={!hydrated}
      />
      {busy
        ? <button className="send-button stop-button" type="button" onClick={stop} aria-label={t('composer.stop')}><Square size={16} fill="currentColor" /></button>
        : <button className="send-button" type="submit" disabled={!draft.trim() || !hydrated} aria-label={t('composer.send')}>{home && <span>{t('composer.find')}</span>}{home ? <ArrowRight size={18} /> : <ArrowUp size={19} />}</button>}
    </form>
  );

  const openArtifact = view === 'artifact' ? data.artifacts.find(a => a.id === artifactId) : undefined;
  const breadcrumb = view === 'memory' ? t('nav.yourMemory') : view === 'saved' ? t('nav.savedFinds') : view === 'connections' ? t('nav.connections') : view === 'artifacts' ? t('nav.artifacts') : openArtifact ? openArtifact.title : view === 'chat' && active ? active.title : '';

  // Logged out (no Gmail connection): show the service introduction instead of the app.
  if (!gmail) return <div className="boot" aria-busy="true"><img src="/brand/magent-symbol.webp" alt="magent" /></div>;
  if (!gmail.connected) {
    return (
      <>
        <Landing onConnect={connect} />
        {toast && <div className="toast centered" role="status"><Check size={16} aria-hidden />{toast}</div>}
      </>
    );
  }

  return (
    <div className="studio-shell">
      <Sidebar
        open={mobileOpen}
        conversations={data.conversations}
        activeId={view === 'chat' ? activeId : null}
        memoryActive={view === 'memory'}
        savedActive={view === 'saved'}
        savedCount={data.saved.length}
        onSaved={() => openView('saved')}
        connectionsActive={view === 'connections'}
        artifactsActive={view === 'artifacts' || view === 'artifact'}
        artifactsCount={data.artifacts.length}
        onArtifacts={() => openView('artifacts')}
        onConnections={() => openView('connections')}
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
            <button type="button" className="icon-button mobile-menu" aria-label={t('nav.openNav')} onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
            <button type="button" className="header-home" onClick={newChat} aria-label={t('common.home')}>
              <img src="/brand/magent-symbol.webp" alt="" className="header-symbol" />
              <img src="/brand/magent-wordmark.webp" alt="magent" className="header-wordmark" />
            </button>
            {breadcrumb && <><span className="breadcrumb-slash">/</span><span className="breadcrumb-label">{breadcrumb}</span></>}
          </div>
          <div className="topbar-right">
            <span className="region"><Globe2 size={14} aria-hidden />{t('common.region')}</span>
            <LanguageSwitcher />
            <div className="account-menu-wrap">
              <button type="button" className="avatar-button" onClick={() => setMenuOpen(o => !o)} aria-label={t('nav.accountMenu')} aria-haspopup="menu" aria-expanded={menuOpen}><UserRound size={18} /></button>
              {menuOpen && (
                <>
                  <button type="button" className="menu-scrim" aria-label={t('common.close')} onClick={() => setMenuOpen(false)} />
                  <div className="account-menu" role="menu" onKeyDown={e => { if (e.key === 'Escape') setMenuOpen(false); }}>
                    <div className="account-menu-head">
                      <strong>{gmailEmail ?? t('account.notConnected')}</strong>
                      <small>{gmailEmail ? t('nav.gmailConnected') : t('account.local')}</small>
                    </div>
                    <button type="button" role="menuitem" onClick={() => openView('memory')}><Brain size={16} aria-hidden /> {t('nav.yourMemory')}</button>
                    <button type="button" role="menuitem" onClick={() => openView('saved')}><Bookmark size={16} aria-hidden /> {t('nav.savedFinds')}</button>
                    <button type="button" role="menuitem" onClick={() => openView('connections')}><Plug size={16} aria-hidden /> {t('nav.connections')}</button>
                    {!gmailEmail && <button type="button" role="menuitem" onClick={connect}><Sparkles size={16} aria-hidden /> {t('common.connectGmail')}</button>}
                    <button type="button" role="menuitem" className="danger" onClick={() => void logout()}><LogOut size={16} aria-hidden /> {t('account.logout')}</button>
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
              ready={ready}
              personalized={personalKey && data.home ? data.home.data : null}
              onPicks={() => void send(t('chat.picksPrompt'), { auto: true, fresh: true })}
              onSync={() => void runSync(data.lastSync, false)}
              onMemory={() => openView('memory')}
            />
          )}

          {view === 'chat' && (
            <div className="conversation-content">
              {messages.map((m, index) => m.role === 'user'
                ? (m.auto
                  ? <div key={m.id} className="auto-request"><Sparkles size={14} aria-hidden /> {t('chat.autoRequest')}</div>
                  : <div key={m.id} className="user-message"><span>{t('chat.you')}</span><div>{m.text}</div></div>)
                : (
                  <section key={m.id} className="assistant-message" aria-label={t('chat.response')}>
                    <div className="assistant-heading">
                      <span className="assistant-avatar"><img src="/brand/magent-symbol.webp" alt="" /></span>
                      <strong>magent</strong>
                      {(!!m.memoryUsed || !!m.memoryAdded) && (
                        <button type="button" className="memory-context-chip" onClick={() => openView('memory')}>
                          <Brain size={13} aria-hidden />{m.memoryAdded ? t('chat.memoryUpdated') : tc('chat.memoryUsed', m.memoryUsed ?? 0)}
                        </button>
                      )}
                    </div>
                    {m.text && <div className={`assistant-copy${m.error ? ' response-error' : ''}`}><RichText text={m.text} /></div>}
                    {!!m.products?.length && (
                      <>
                        <div className={`product-grid${m.products.length === 2 ? ' two-products' : ''}`}>
                          {m.products.map(p => <ProductCard key={p.id} product={p} saved={data.saved.some(s => s.product.id === p.id)} onSave={toggleSave} onDetail={setDetail} />)}
                        </div>
                        <p className="recommendation-note">{t('chat.note')}</p>
                      </>
                    )}
                    {busy && index === messages.length - 1 && (
                      <div className="thinking-status" role="status"><span className="thinking-dots"><i /><i /><i /></span>{status}</div>
                    )}
                    {!(busy && index === messages.length - 1) && !m.error && !!m.suggestions?.length && (
                      <div className="followups">
                        <p>{t('chat.followups')}</p>
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
              conversations={data.conversations}
              memoryEnabled={data.memoryEnabled}
              learnFromChat={data.learnFromChat}
              onSaveFact={(fact, previousKey) => update(d => ({ ...d, facts: [fact, ...d.facts.filter(f => f.key !== fact.key && f.key !== previousKey)] }))}
              onDelete={key => update(d => ({ ...d, facts: d.facts.filter(f => f.key !== key) }))}
              onClear={() => { if (window.confirm(t('confirm.clearMemory'))) update(d => ({ ...d, facts: [], summary: null, orders: 0, lastSync: null })); }}
              onSync={() => void runSync(data.lastSync, false)}
              onDisconnect={() => void disconnect()}
              onOpenConversation={id => { activate(id, 'chat'); window.scrollTo({ top: 0 }); }}
              onNewChat={newChat}
              onSettings={patch => update(d => ({ ...d, ...patch }))}
            />
          )}

          {view === 'artifacts' && (
            <ArtifactsView
              artifacts={data.artifacts}
              factCount={data.memoryEnabled ? data.facts.length : 0}
              searchCount={recentSearches().length}
              creating={creating}
              onCreate={(kind, prompt) => void createArtifact(kind, prompt)}
              onOpen={id => { setArtifactId(id); activate(activeRef.current, 'artifact'); window.scrollTo({ top: 0 }); }}
              onDelete={deleteArtifact}
            />
          )}

          {view === 'artifact' && openArtifact && (
            <ArtifactViewer
              artifact={openArtifact}
              savedIds={new Set(data.saved.map(s => s.product.id))}
              onBack={() => openView('artifacts')}
              onDelete={() => deleteArtifact(openArtifact.id)}
              onRemake={() => { openView('artifacts'); void createArtifact(openArtifact.kind, openArtifact.prompt); }}
              onSave={toggleSave}
              onDetail={setDetail}
            />
          )}

          {view === 'connections' && <ConnectionsView gmailEmail={gmailEmail} onConnectGmail={connect} onToast={setToast} />}

          {view === 'saved' && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">{t('saved.kicker')}</p>
                  <h1>{t('saved.title')}<span>.</span></h1>
                  <p>{t('saved.lede')}</p>
                </div>
              </div>
              {data.saved.length ? (
                <div className="product-grid">
                  {data.saved.map(s => (
                    <ProductCard key={s.product.id} product={s.product} saved onSave={toggleSave} onDetail={setDetail} drop={s.price - s.current > 0.5 ? s.price - s.current : undefined} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Bookmark size={28} strokeWidth={1.3} aria-hidden />
                  <h2>{t('saved.emptyTitle')}</h2>
                  <p>{t('saved.emptyText')}</p>
                  <button type="button" className="primary-button" onClick={newChat}>{t('saved.start')} <ArrowRight size={16} aria-hidden /></button>
                </div>
              )}
            </>
          )}
        </main>

        {view === 'chat' && <div className="composer-dock">{composer(false)}</div>}
      </div>

      {detail && (
        <ProductDialog
          product={detail}
          saved={data.saved.some(s => s.product.id === detail.id)}
          onSave={p => toggleSave(p, null)}
          onClose={() => setDetail(null)}
        />
      )}
      {toast && <div className="toast" role="status"><Check size={16} aria-hidden />{toast}</div>}
    </div>
  );
}
