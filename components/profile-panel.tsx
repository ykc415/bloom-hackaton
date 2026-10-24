'use client';

import { useEffect } from 'react';
import { Mail, MessageSquare, ShieldCheck, Trash2, X } from 'lucide-react';
import { categoryLabels, factCategories, type Fact } from '@/lib/types';

type Props = {
  facts: Fact[];
  summary: string | null;
  orders: number;
  gmailEmail: string | null;
  onDelete: (key: string) => void;
  onClear: () => void;
  onDisconnect: () => void;
  onClose: () => void;
};

export function ProfilePanel({ facts, summary, orders, gmailEmail, onDelete, onClear, onDisconnect, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <aside className="panel" role="dialog" aria-modal="true" aria-label="Your profile" onClick={e => e.stopPropagation()}>
        <header className="panel-head">
          <div>
            <h2>What magent knows about you</h2>
            <p>{orders ? `Built from ${orders} orders` : 'Built from your chats'}{gmailEmail ? ` · ${gmailEmail}` : ''}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        {summary && <p className="panel-summary">{summary}</p>}
        {!facts.length && <p className="panel-empty">Nothing yet. Connect Gmail or tell magent about your sizes, budget and style.</p>}
        {factCategories.map(category => {
          const items = facts.filter(f => f.category === category);
          if (!items.length) return null;
          return (
            <section key={category} className="fact-group">
              <h3>{categoryLabels[category]}</h3>
              <ul>
                {items.map(f => (
                  <li key={f.key} className="fact">
                    <div>
                      <p className="fact-title">{f.title}</p>
                      <p className="fact-text">{f.text}</p>
                      <p className={`fact-source ${f.source}`}>
                        {f.source === 'chat' ? <><MessageSquare size={12} aria-hidden /> You said</> : <><Mail size={12} aria-hidden /> Inferred from Gmail · {f.evidence}</>}
                      </p>
                    </div>
                    <button type="button" className="icon-btn" onClick={() => onDelete(f.key)} aria-label={`Forget ${f.title}`}><Trash2 size={15} /></button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        <footer className="panel-foot">
          <p><ShieldCheck size={14} aria-hidden /> magent reads only order emails, never stores your emails, and keeps this profile in your browser. To correct something, just tell magent in chat.</p>
          <div className="panel-actions">
            {facts.length > 0 && <button type="button" className="btn ghost sm" onClick={onClear}>Clear profile</button>}
            {gmailEmail && <button type="button" className="btn ghost sm" onClick={onDisconnect}>Disconnect Gmail</button>}
          </div>
        </footer>
      </aside>
    </div>
  );
}
