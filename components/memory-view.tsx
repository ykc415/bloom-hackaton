'use client';

import { useState, type FormEvent } from 'react';
import {
  ArrowUpRight, Brain, Check, ChevronRight, FileText, Folder, History, Lock, Mail, MessageSquare, Pencil, Plus, RefreshCw, Search, SlidersHorizontal, Sparkles, Trash2, X,
} from 'lucide-react';
import { factCategories, type Fact, type FactCategory } from '@/lib/types';

type Conversation = { id: string; title: string; updatedAt: string };
type Settings = { memoryEnabled: boolean; learnFromChat: boolean };
type Props = Settings & {
  facts: Fact[];
  summary: string | null;
  orders: number;
  lastSync: string | null;
  gmailEmail: string | null;
  syncing: boolean;
  conversations: Conversation[];
  onSaveFact: (fact: Fact, previousKey?: string) => void;
  onDelete: (key: string) => void;
  onClear: () => void;
  onSync: () => void;
  onDisconnect: () => void;
  onOpenConversation: (id: string) => void;
  onNewChat: () => void;
  onSettings: (patch: Partial<Settings>) => void;
};

const files: Record<FactCategory, { name: string; file: string; kicker: string; description: string }> = {
  brands: { name: 'Brands you love', file: 'brands.md', kicker: 'NAMES YOU TRUST', description: 'Brands you come back to. magent leans toward them, but never locks you in.' },
  sizes: { name: 'Size & fit', file: 'fit.md', kicker: 'HOW THINGS FIT', description: 'Sizes and fit notes. magent never converts or guesses a size for you.' },
  budget: { name: 'Budget', file: 'budget.md', kicker: 'WHAT FEELS RIGHT TO SPEND', description: 'Usual price ranges. Your current request always comes first.' },
  style: { name: 'Style & taste', file: 'style.md', kicker: 'WHAT FEELS LIKE YOU', description: 'Colors, silhouettes and looks you gravitate to.' },
  interests: { name: 'Interests', file: 'interests.md', kicker: 'WHAT YOU LOVE DOING', description: 'Hobbies and passions that shape what you need.' },
  household: { name: 'Household', file: 'household.md', kicker: 'WHO YOU SHOP FOR', description: 'Pets, kids and the people you often buy for.' },
};

type FileId = 'overview' | 'settings' | FactCategory | `history:${string}`;
type Editor = { key?: string; category: FactCategory; title: string; text: string };

const day = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const when = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'note';
const userMade = (f: Fact) => f.source === 'chat';

function SourceLine({ fact }: { fact: Fact }) {
  return (
    <span className={`source-pill ${fact.source}`}>
      {fact.source === 'chat'
        ? <><MessageSquare size={12} aria-hidden /> {fact.evidence.startsWith('Added') || fact.evidence.startsWith('Edited') ? fact.evidence : 'You said this in chat'}</>
        : <><Mail size={12} aria-hidden /> Inferred from Gmail · {fact.evidence}</>}
      <span className="source-date">· {when(fact.updatedAt)}</span>
    </span>
  );
}

export function MemoryView(props: Props) {
  const { facts, summary, orders, lastSync, gmailEmail, syncing, conversations, memoryEnabled, learnFromChat } = props;
  const [file, setFile] = useState<FileId>('overview');
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);

  const days = [...new Set(conversations.map(c => day(c.updatedAt)))].sort().reverse().slice(0, 10);
  const counts = Object.fromEntries(factCategories.map(c => [c, facts.filter(f => f.category === c).length])) as Record<FactCategory, number>;
  const q = query.trim().toLowerCase();
  const results = q ? facts.filter(f => `${f.title} ${f.text} ${f.evidence}`.toLowerCase().includes(q)) : [];

  function open(next: FileId) { setFile(next); setEditor(null); setQuery(''); }
  function startAdd() { setEditor({ category: factCategories.includes(file as FactCategory) ? (file as FactCategory) : 'style', title: '', text: '' }); }
  function save(e: FormEvent) {
    e.preventDefault();
    if (!editor || !editor.title.trim() || !editor.text.trim()) return;
    const taken = new Set(facts.map(f => f.key));
    let key = editor.key ?? slug(editor.title);
    if (!editor.key) for (let i = 2; taken.has(key); i++) key = `${slug(editor.title)}-${i}`;
    props.onSaveFact({
      key, category: editor.category, title: editor.title.trim().slice(0, 120), text: editor.text.trim().slice(0, 500),
      source: 'chat', evidence: editor.key ? 'Edited in Memory' : 'Added in Memory', updatedAt: new Date().toISOString(),
    }, editor.key);
    setFile(editor.category);
    setEditor(null);
  }

  const entry = (f: Fact, showFile = false) => (
    <li key={f.key} className="memory-entry">
      <div>
        {showFile && <span className="entry-file">{files[f.category].file}</span>}
        <strong>{f.title}</strong>
        <p>{f.text}</p>
        <SourceLine fact={f} />
      </div>
      <div className="entry-actions">
        <button type="button" className="icon-button" onClick={() => setEditor({ key: f.key, category: f.category, title: f.title, text: f.text })} aria-label={`Edit ${f.title}`}><Pencil size={15} /></button>
        <button type="button" className="icon-button" onClick={() => props.onDelete(f.key)} aria-label={`Forget ${f.title}`}><Trash2 size={15} /></button>
      </div>
    </li>
  );

  const crumb = editor ? (editor.key ? 'edit.md' : 'new.md')
    : q ? 'search'
    : file === 'overview' ? 'overview.md' : file === 'settings' ? 'settings'
    : file.startsWith('history:') ? `${file.slice(8)}.md` : files[file as FactCategory].file;

  let body: React.ReactNode;
  if (editor) {
    body = (
      <form className="memory-editor" onSubmit={save}>
        <p className="eyebrow">{editor.key ? 'EDIT MEMORY' : 'ADD MEMORY'}</p>
        <h2>{editor.key ? 'Refine what magent knows' : 'Tell magent something about you'}</h2>
        <p className="memory-doc-lede">Things you write here count as your own words, so they always win over what magent inferred from Gmail.</p>
        <label>File
          <select value={editor.category} onChange={e => setEditor({ ...editor, category: e.target.value as FactCategory })}>
            {factCategories.map(c => <option key={c} value={c}>{files[c].name}</option>)}
          </select>
        </label>
        <label>Title<input value={editor.title} maxLength={120} placeholder="e.g. Shoe size" onChange={e => setEditor({ ...editor, title: e.target.value })} /></label>
        <label>Detail<textarea value={editor.text} maxLength={500} rows={3} placeholder="e.g. US men's 10.5, wide feet" onChange={e => setEditor({ ...editor, text: e.target.value })} /></label>
        <div className="memory-editor-actions">
          <button type="submit" className="primary-button" disabled={!editor.title.trim() || !editor.text.trim()}><Check size={16} aria-hidden /> Save</button>
          <button type="button" className="secondary-button" onClick={() => setEditor(null)}><X size={15} aria-hidden /> Cancel</button>
        </div>
      </form>
    );
  } else if (q) {
    body = (
      <>
        <p className="eyebrow">SEARCH</p>
        <h2>Results for “{query.trim()}”</h2>
        {results.length ? <ul className="memory-entries">{results.map(f => entry(f, true))}</ul> : <p className="memory-doc-lede">Nothing in your memory matches that yet.</p>}
      </>
    );
  } else if (file === 'overview') {
    body = (
      <>
        <p className="eyebrow">YOUR MEMORY AT A GLANCE</p>
        <h2>Overview</h2>
        <p className="memory-doc-lede">{summary ?? 'Everything magent uses to make a find feel like you. Connect Gmail or just chat, and it fills in.'}</p>
        <div className="memory-stats">
          <div><strong>{facts.length}</strong><span>things remembered</span></div>
          <div><strong>{orders}</strong><span>orders analyzed</span></div>
          <div><strong>{conversations.length}</strong><span>conversations</span></div>
        </div>
        <div className="memory-connection">
          <span className={`profile-avatar${gmailEmail ? ' connected' : ''}`}><Mail size={16} aria-hidden /></span>
          <div>
            <strong>{gmailEmail ? `Gmail connected · ${gmailEmail}` : 'Gmail not connected'}</strong>
            <p>{lastSync ? `Last checked ${when(lastSync)}. magent checks for new orders when you come back.` : 'magent reads only order emails and never stores them.'}</p>
          </div>
          {gmailEmail && <button type="button" className="secondary-button" onClick={props.onSync} disabled={syncing}><RefreshCw size={15} className={syncing ? 'spin' : ''} aria-hidden /> {syncing ? 'Syncing…' : 'Sync now'}</button>}
        </div>
        <ul className="memory-file-cards">
          {factCategories.map(c => (
            <li key={c}><button type="button" onClick={() => open(c)}><FileText size={16} aria-hidden /><span>{files[c].name}</span><small>{counts[c]}</small><ChevronRight size={15} aria-hidden /></button></li>
          ))}
        </ul>
      </>
    );
  } else if (file === 'settings') {
    body = (
      <>
        <p className="eyebrow">HOW MEMORY WORKS FOR YOU</p>
        <h2>Memory settings</h2>
        <p className="memory-doc-lede">Changes apply to your next message.</p>
        <label className="memory-setting">
          <span><strong>Use memory for recommendations</strong><small>When off, magent shops only from what you say in the current chat.</small></span>
          <input type="checkbox" role="switch" checked={memoryEnabled} onChange={e => props.onSettings({ memoryEnabled: e.target.checked })} />
        </label>
        <label className="memory-setting">
          <span><strong>Learn from my chats</strong><small>Save lasting details you state, like your size or a brand you avoid.</small></span>
          <input type="checkbox" role="switch" checked={learnFromChat} onChange={e => props.onSettings({ learnFromChat: e.target.checked })} />
        </label>
        <div className="memory-setting static">
          <span><strong>Gmail</strong><small>{gmailEmail ? `Connected as ${gmailEmail}` : 'Not connected'}</small></span>
          {gmailEmail && <button type="button" className="secondary-button" onClick={props.onDisconnect}>Disconnect</button>}
        </div>
        <div className="memory-setting static">
          <span><strong>Clear memory</strong><small>Delete everything magent remembers on this device. Chats stay.</small></span>
          <button type="button" className="secondary-button danger" onClick={props.onClear} disabled={!facts.length}><Trash2 size={15} aria-hidden /> Clear</button>
        </div>
      </>
    );
  } else if (file.startsWith('history:')) {
    const date = file.slice(8);
    const items = conversations.filter(c => day(c.updatedAt) === date);
    body = (
      <>
        <p className="eyebrow">WHAT YOU LOOKED FOR</p>
        <h2>{new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</h2>
        <p className="memory-doc-lede">History is activity, not taste. magent doesn&apos;t assume a one-time search is what you like.</p>
        <ul className="memory-entries">
          {items.map(c => (
            <li key={c.id} className="memory-entry">
              <div><strong>{c.title}</strong><span className="source-pill"><History size={12} aria-hidden /> {time(c.updatedAt)}</span></div>
              <button type="button" className="secondary-button" onClick={() => props.onOpenConversation(c.id)}>Open <ArrowUpRight size={14} aria-hidden /></button>
            </li>
          ))}
        </ul>
      </>
    );
  } else {
    const meta = files[file as FactCategory];
    const items = facts.filter(f => f.category === file);
    body = (
      <>
        <p className="eyebrow">{meta.kicker}</p>
        <h2>{meta.name}</h2>
        <p className="memory-doc-lede">{meta.description}</p>
        {items.length ? <ul className="memory-entries">{items.map(f => entry(f))}</ul> : (
          <div className="memory-empty">
            <span><Sparkles size={24} strokeWidth={1.4} aria-hidden /></span>
            <h3>Good recommendations start with you.</h3>
            <p>Share your usual size, a style you love, or what you tend to avoid. magent keeps the useful details as you chat.</p>
            <button type="button" className="secondary-button" onClick={props.onNewChat}>Start a conversation <ArrowUpRight size={14} aria-hidden /></button>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR PERSONAL CONTEXT</p>
          <h1>Memory<span>.</span></h1>
          <p>The little things that make a find feel like you.</p>
        </div>
        <button type="button" className="primary-button" onClick={startAdd}><Plus size={16} aria-hidden /> Add memory</button>
      </div>

      <div className="memory-workspace">
        <aside className="memory-files">
          <label className="memory-search">
            <Search size={16} aria-hidden />
            <input value={query} onChange={e => { setQuery(e.target.value); setEditor(null); }} placeholder="Search memory…" aria-label="Search memory" />
          </label>
          <div className="memory-file-group">
            <span><Folder size={14} aria-hidden /> YOUR MEMORY</span>
            <button type="button" className={file === 'overview' && !q ? 'active' : ''} onClick={() => open('overview')}><Brain size={16} aria-hidden /><span>Overview</span></button>
            {factCategories.map(c => (
              <button type="button" key={c} className={file === c && !q ? 'active' : ''} onClick={() => open(c)}>
                <FileText size={16} aria-hidden /><span>{files[c].name}</span><small>{counts[c]}</small>
              </button>
            ))}
          </div>
          {days.length > 0 && (
            <div className="memory-file-group">
              <span><History size={14} aria-hidden /> HISTORY</span>
              {days.map(d => (
                <button type="button" key={d} className={file === `history:${d}` && !q ? 'active' : ''} onClick={() => open(`history:${d}`)}>
                  <FileText size={16} aria-hidden /><span>{d}.md</span>
                </button>
              ))}
            </div>
          )}
          <button type="button" className={`memory-settings-link${file === 'settings' && !q ? ' active' : ''}`} onClick={() => open('settings')}>
            <SlidersHorizontal size={16} aria-hidden /><span>Memory settings</span><ChevronRight size={15} aria-hidden />
          </button>
          <p className="memory-local"><Lock size={13} aria-hidden /> Saved in this browser</p>
        </aside>

        <section className="memory-document" aria-live="polite">
          <div className="memory-document-bar">
            <span><Folder size={15} aria-hidden /> memory <ChevronRight size={13} aria-hidden /> <b>{crumb}</b></span>
            <span className={`memory-status${memoryEnabled ? '' : ' off'}`}><i /> {memoryEnabled ? 'Memory on' : 'Memory off'}</span>
          </div>
          <div className="memory-document-body">
            {body}
            <p className="memory-footnote"><Check size={14} aria-hidden /> Saved from what you explicitly share, write here, or buy (via Gmail). A one-time search stays in history; it isn&apos;t assumed to be your taste.</p>
          </div>
        </section>
      </div>
    </>
  );
}
