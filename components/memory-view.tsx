'use client';

import { useState, type FormEvent } from 'react';
import {
  ArrowUpRight, Brain, Check, ChevronRight, FileText, Folder, History, Lock, Mail, MessageSquare, Pencil, Plus, RefreshCw, Search, SlidersHorizontal, Sparkles, Trash2, X,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
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

const fileNames: Record<FactCategory, string> = {
  brands: 'brands.md', sizes: 'fit.md', budget: 'budget.md', style: 'style.md', interests: 'interests.md', household: 'household.md', returns: 'returns.md',
};
// Stored evidence values for facts written in the Memory editor; shown translated.
const ADDED = 'Added in Memory';
const EDITED = 'Edited in Memory';

type FileId = 'overview' | 'settings' | FactCategory | `history:${string}`;
type Editor = { key?: string; category: FactCategory; title: string; text: string };

const day = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'note';

export function MemoryView(props: Props) {
  const { facts, summary, orders, lastSync, gmailEmail, syncing, conversations, memoryEnabled, learnFromChat } = props;
  const { t, dateLocale } = useI18n();
  const [file, setFile] = useState<FileId>('overview');
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);

  const name = (c: FactCategory) => t(`file.${c}`);
  const when = (iso: string) => new Date(iso).toLocaleString(dateLocale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const time = (iso: string) => new Date(iso).toLocaleTimeString(dateLocale, { hour: 'numeric', minute: '2-digit' });
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
      source: 'chat', evidence: editor.key ? EDITED : ADDED, updatedAt: new Date().toISOString(),
    }, editor.key);
    setFile(editor.category);
    setEditor(null);
  }

  const source = (f: Fact) => (
    <span className={`source-pill ${f.source}`}>
      {f.source === 'chat'
        ? <><MessageSquare size={12} aria-hidden /> {f.evidence === ADDED ? t('memory.added') : f.evidence === EDITED ? t('memory.edited') : t('memory.youSaid')}</>
        : <><Mail size={12} aria-hidden /> {t('memory.fromGmail', { evidence: f.evidence })}</>}
      <span className="source-date">· {when(f.updatedAt)}</span>
    </span>
  );

  const entry = (f: Fact, showFile = false) => (
    <li key={f.key} className="memory-entry">
      <div>
        {showFile && <span className="entry-file">{fileNames[f.category]}</span>}
        <strong>{f.title}</strong>
        <p>{f.text}</p>
        {source(f)}
      </div>
      <div className="entry-actions">
        <button type="button" className="icon-button" onClick={() => setEditor({ key: f.key, category: f.category, title: f.title, text: f.text })} aria-label={t('memory.edit', { title: f.title })}><Pencil size={15} /></button>
        <button type="button" className="icon-button" onClick={() => props.onDelete(f.key)} aria-label={t('memory.forget', { title: f.title })}><Trash2 size={15} /></button>
      </div>
    </li>
  );

  const crumb = editor ? (editor.key ? 'edit.md' : 'new.md')
    : q ? 'search'
    : file === 'overview' ? 'overview.md' : file === 'settings' ? 'settings'
    : file.startsWith('history:') ? `${file.slice(8)}.md` : fileNames[file as FactCategory];

  let body: React.ReactNode;
  if (editor) {
    body = (
      <form className="memory-editor" onSubmit={save}>
        <p className="eyebrow">{editor.key ? t('memory.editKicker') : t('memory.addKicker')}</p>
        <h2>{editor.key ? t('memory.editTitle') : t('memory.addTitle')}</h2>
        <p className="memory-doc-lede">{t('memory.editorLede')}</p>
        <label>{t('memory.fieldFile')}
          <select value={editor.category} onChange={e => setEditor({ ...editor, category: e.target.value as FactCategory })}>
            {factCategories.map(c => <option key={c} value={c}>{name(c)}</option>)}
          </select>
        </label>
        <label>{t('memory.fieldTitle')}<input value={editor.title} maxLength={120} placeholder={t('memory.titlePlaceholder')} onChange={e => setEditor({ ...editor, title: e.target.value })} /></label>
        <label>{t('memory.fieldDetail')}<textarea value={editor.text} maxLength={500} rows={3} placeholder={t('memory.detailPlaceholder')} onChange={e => setEditor({ ...editor, text: e.target.value })} /></label>
        <div className="memory-editor-actions">
          <button type="submit" className="primary-button" disabled={!editor.title.trim() || !editor.text.trim()}><Check size={16} aria-hidden /> {t('memory.saveButton')}</button>
          <button type="button" className="secondary-button" onClick={() => setEditor(null)}><X size={15} aria-hidden /> {t('memory.cancel')}</button>
        </div>
      </form>
    );
  } else if (q) {
    body = (
      <>
        <p className="eyebrow">{t('memory.searchKicker')}</p>
        <h2>{t('memory.results', { query: query.trim() })}</h2>
        {results.length ? <ul className="memory-entries">{results.map(f => entry(f, true))}</ul> : <p className="memory-doc-lede">{t('memory.noResults')}</p>}
      </>
    );
  } else if (file === 'overview') {
    body = (
      <>
        <p className="eyebrow">{t('memory.overviewKicker')}</p>
        <h2>{t('memory.overview')}</h2>
        <p className="memory-doc-lede">{summary ?? t('memory.overviewLede')}</p>
        <div className="memory-stats">
          <div><strong>{facts.length}</strong><span>{t('memory.statFacts')}</span></div>
          <div><strong>{orders}</strong><span>{t('memory.statOrders')}</span></div>
          <div><strong>{conversations.length}</strong><span>{t('memory.statChats')}</span></div>
        </div>
        <div className="memory-connection">
          <span className={`profile-avatar${gmailEmail ? ' connected' : ''}`}><Mail size={16} aria-hidden /></span>
          <div>
            <strong>{gmailEmail ? t('memory.gmailConnectedAs', { email: gmailEmail }) : t('memory.gmailNotConnected')}</strong>
            <p>{lastSync ? t('memory.lastChecked', { date: when(lastSync) }) : t('memory.gmailPrivacy')}</p>
          </div>
          {gmailEmail && <button type="button" className="secondary-button" onClick={props.onSync} disabled={syncing}><RefreshCw size={15} className={syncing ? 'spin' : ''} aria-hidden /> {syncing ? t('memory.syncing') : t('memory.syncNow')}</button>}
        </div>
        <ul className="memory-file-cards">
          {factCategories.map(c => (
            <li key={c}><button type="button" onClick={() => open(c)}><FileText size={16} aria-hidden /><span>{name(c)}</span><small>{counts[c]}</small><ChevronRight size={15} aria-hidden /></button></li>
          ))}
        </ul>
      </>
    );
  } else if (file === 'settings') {
    body = (
      <>
        <p className="eyebrow">{t('memory.settingsKicker')}</p>
        <h2>{t('memory.settings')}</h2>
        <p className="memory-doc-lede">{t('memory.settingsLede')}</p>
        <label className="memory-setting">
          <span><strong>{t('memory.useTitle')}</strong><small>{t('memory.useText')}</small></span>
          <input type="checkbox" role="switch" checked={memoryEnabled} onChange={e => props.onSettings({ memoryEnabled: e.target.checked })} />
        </label>
        <label className="memory-setting">
          <span><strong>{t('memory.learnTitle')}</strong><small>{t('memory.learnText')}</small></span>
          <input type="checkbox" role="switch" checked={learnFromChat} onChange={e => props.onSettings({ learnFromChat: e.target.checked })} />
        </label>
        <div className="memory-setting static">
          <span><strong>{t('memory.gmail')}</strong><small>{gmailEmail ? t('memory.connectedAs', { email: gmailEmail }) : t('memory.gmailNotConnected')}</small></span>
          {gmailEmail && <button type="button" className="secondary-button" onClick={props.onDisconnect}>{t('memory.disconnect')}</button>}
        </div>
        <div className="memory-setting static">
          <span><strong>{t('memory.clearTitle')}</strong><small>{t('memory.clearText')}</small></span>
          <button type="button" className="secondary-button danger" onClick={props.onClear} disabled={!facts.length}><Trash2 size={15} aria-hidden /> {t('memory.clear')}</button>
        </div>
      </>
    );
  } else if (file.startsWith('history:')) {
    const date = file.slice(8);
    const items = conversations.filter(c => day(c.updatedAt) === date);
    body = (
      <>
        <p className="eyebrow">{t('memory.historyKicker')}</p>
        <h2>{new Date(`${date}T12:00:00`).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric', year: 'numeric' })}</h2>
        <p className="memory-doc-lede">{t('memory.historyLede')}</p>
        <ul className="memory-entries">
          {items.map(c => (
            <li key={c.id} className="memory-entry">
              <div><strong>{c.title}</strong><span className="source-pill"><History size={12} aria-hidden /> {time(c.updatedAt)}</span></div>
              <button type="button" className="secondary-button" onClick={() => props.onOpenConversation(c.id)}>{t('memory.open')} <ArrowUpRight size={14} aria-hidden /></button>
            </li>
          ))}
        </ul>
      </>
    );
  } else {
    const category = file as FactCategory;
    const items = facts.filter(f => f.category === category);
    body = (
      <>
        <p className="eyebrow">{t(`file.${category}Kicker`)}</p>
        <h2>{name(category)}</h2>
        <p className="memory-doc-lede">{t(`file.${category}Text`)}</p>
        {items.length ? <ul className="memory-entries">{items.map(f => entry(f))}</ul> : (
          <div className="memory-empty">
            <span><Sparkles size={24} strokeWidth={1.4} aria-hidden /></span>
            <h3>{t('memory.emptyTitle')}</h3>
            <p>{t('memory.emptyText')}</p>
            <button type="button" className="secondary-button" onClick={props.onNewChat}>{t('memory.startChat')} <ArrowUpRight size={14} aria-hidden /></button>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t('memory.kicker')}</p>
          <h1>{t('memory.title')}<span>.</span></h1>
          <p>{t('memory.lede')}</p>
        </div>
        <button type="button" className="primary-button" onClick={startAdd}><Plus size={16} aria-hidden /> {t('memory.add')}</button>
      </div>

      <div className="memory-workspace">
        <aside className="memory-files">
          <label className="memory-search">
            <Search size={16} aria-hidden />
            <input value={query} onChange={e => { setQuery(e.target.value); setEditor(null); }} placeholder={t('memory.search')} aria-label={t('memory.search')} />
          </label>
          <div className="memory-file-group">
            <span><Folder size={14} aria-hidden /> {t('memory.yourMemory')}</span>
            <button type="button" className={file === 'overview' && !q ? 'active' : ''} onClick={() => open('overview')}><Brain size={16} aria-hidden /><span>{t('memory.overview')}</span></button>
            {factCategories.map(c => (
              <button type="button" key={c} className={file === c && !q ? 'active' : ''} onClick={() => open(c)}>
                <FileText size={16} aria-hidden /><span>{name(c)}</span><small>{counts[c]}</small>
              </button>
            ))}
          </div>
          {days.length > 0 && (
            <div className="memory-file-group">
              <span><History size={14} aria-hidden /> {t('memory.history')}</span>
              {days.map(d => (
                <button type="button" key={d} className={file === `history:${d}` && !q ? 'active' : ''} onClick={() => open(`history:${d}`)}>
                  <FileText size={16} aria-hidden /><span>{d}.md</span>
                </button>
              ))}
            </div>
          )}
          <button type="button" className={`memory-settings-link${file === 'settings' && !q ? ' active' : ''}`} onClick={() => open('settings')}>
            <SlidersHorizontal size={16} aria-hidden /><span>{t('memory.settings')}</span><ChevronRight size={15} aria-hidden />
          </button>
          <p className="memory-local"><Lock size={13} aria-hidden /> {t('memory.local')}</p>
        </aside>

        <section className="memory-document" aria-live="polite">
          <div className="memory-document-bar">
            <span><Folder size={15} aria-hidden /> memory <ChevronRight size={13} aria-hidden /> <b>{crumb}</b></span>
            <span className={`memory-status${memoryEnabled ? '' : ' off'}`}><i /> {memoryEnabled ? t('memory.on') : t('memory.off')}</span>
          </div>
          <div className="memory-document-body">
            {body}
            <p className="memory-footnote"><Check size={14} aria-hidden /> {t('memory.footnote')}</p>
          </div>
        </section>
      </div>
    </>
  );
}
