'use client';

import { Brain, LogOut, Mail, MessageSquare, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { categoryLabels, factCategories, type Fact } from '@/lib/types';

type Props = {
  facts: Fact[];
  summary: string | null;
  orders: number;
  lastSync: string | null;
  gmailEmail: string | null;
  syncing: boolean;
  onDelete: (key: string) => void;
  onClear: () => void;
  onConnect: () => void;
  onSync: () => void;
  onDisconnect: () => void;
};

const when = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function MemoryView({ facts, summary, orders, lastSync, gmailEmail, syncing, onDelete, onClear, onConnect, onSync, onDisconnect }: Props) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOURS TO SHAPE</p>
          <h1>Your memory<span>.</span></h1>
          <p>What magent knows to personalize your picks. Stored only in this browser.</p>
        </div>
        {facts.length > 0 && <button type="button" className="secondary-button" onClick={onClear}><Trash2 size={15} aria-hidden /> Clear memory</button>}
      </div>

      <div className="memory-layout">
        <aside className="memory-side">
          <div className="memory-card">
            <span className={`profile-avatar${gmailEmail ? ' connected' : ''}`}><Mail size={16} aria-hidden /></span>
            <strong>{gmailEmail ? 'Gmail connected' : 'Gmail not connected'}</strong>
            <p>{gmailEmail ?? 'Connect Gmail and magent learns your brands, sizes and budgets from your order emails.'}</p>
            {gmailEmail && <p className="memory-meta">{orders ? `${orders} order${orders === 1 ? '' : 's'} analyzed` : 'No orders analyzed yet'}{lastSync ? ` · checked ${when(lastSync)}` : ''}</p>}
            <div className="memory-card-actions">
              {gmailEmail ? (
                <>
                  <button type="button" className="secondary-button" onClick={onSync} disabled={syncing}><RefreshCw size={15} className={syncing ? 'spin' : ''} aria-hidden /> {syncing ? 'Syncing…' : 'Sync now'}</button>
                  <button type="button" className="text-button" onClick={onDisconnect}><LogOut size={14} aria-hidden /> Disconnect</button>
                </>
              ) : <button type="button" className="primary-button" onClick={onConnect}>Connect Gmail</button>}
            </div>
          </div>
          <div className="memory-card quiet">
            <ShieldCheck size={18} strokeWidth={1.5} aria-hidden />
            <p>magent reads only order emails and never stores them. Disconnecting revokes access at Google. To correct anything, delete it here or just tell magent in chat.</p>
          </div>
        </aside>

        <div className="memory-doc">
          {summary && <p className="memory-summary">{summary}</p>}
          {!facts.length && (
            <div className="empty-state compact">
              <Brain size={28} strokeWidth={1.3} aria-hidden />
              <h2>Nothing here yet.</h2>
              <p>Connect Gmail, or tell magent things like your shoe size, budget or favorite brands while you chat.</p>
            </div>
          )}
          {factCategories.map(category => {
            const items = facts.filter(f => f.category === category);
            if (!items.length) return null;
            return (
              <section key={category} className="memory-group">
                <h3>{categoryLabels[category]}</h3>
                <ul>
                  {items.map(f => (
                    <li key={f.key}>
                      <div>
                        <strong>{f.title}</strong>
                        <p>{f.text}</p>
                        <span className={`source-pill ${f.source}`}>
                          {f.source === 'chat' ? <><MessageSquare size={12} aria-hidden /> You said</> : <><Mail size={12} aria-hidden /> From Gmail · {f.evidence}</>}
                        </span>
                      </div>
                      <button type="button" className="icon-button" onClick={() => onDelete(f.key)} aria-label={`Forget ${f.title}`}><Trash2 size={15} /></button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
