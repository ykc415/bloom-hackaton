'use client';

import { Brain, ChevronRight, Mail, MessageSquare, Plus, SlidersHorizontal, Sparkles, Trash2, UserRound } from 'lucide-react';

type Props = {
  open: boolean;
  conversations: { id: string; title: string }[];
  activeId: string | null;
  memoryActive: boolean;
  factCount: number;
  gmailEmail: string | null;
  syncing: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onMemory: () => void;
  onConnect: () => void;
  onClose: () => void;
};

export function Sidebar({ open, conversations, activeId, memoryActive, factCount, gmailEmail, syncing, onNew, onSelect, onDelete, onMemory, onConnect, onClose }: Props) {
  return (
    <>
      {open && <button type="button" className="sidebar-scrim" aria-label="Close navigation" onClick={onClose} />}
      <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
        <button type="button" className="brand-lockup" onClick={onNew} aria-label="magent home">
          <img src="/brand/magent-symbol.webp" alt="" className="brand-symbol" />
          <span>
            <img src="/brand/magent-wordmark.webp" alt="magent" className="brand-wordmark" />
            <small>SHOPPING CONCIERGE</small>
          </span>
        </button>
        <div className="sidebar-main">
          <button type="button" className="new-chat-button" onClick={onNew}><Plus size={17} aria-hidden />New conversation</button>
          <button type="button" className={`memory-nav-button${memoryActive ? ' active' : ''}`} onClick={onMemory}>
            <Brain size={17} aria-hidden /><span>Memory</span><small>{factCount ? `${factCount} things` : 'Yours to shape'}</small>
          </button>
          <p className="history-heading">RECENT CONVERSATIONS</p>
          <nav className="conversation-list" aria-label="Recent conversations">
            {conversations.length ? conversations.map(chat => (
              <div key={chat.id} className={`history-row${chat.id === activeId ? ' active' : ''}`}>
                <button type="button" onClick={() => onSelect(chat.id)}>
                  <span className="history-dot" /><span className="history-title">{chat.title}</span><ChevronRight size={14} aria-hidden />
                </button>
                <button type="button" className="history-delete" onClick={() => onDelete(chat.id)} aria-label={`Delete ${chat.title}`}><Trash2 size={14} /></button>
              </div>
            )) : (
              <div className="history-empty">
                <MessageSquare size={20} strokeWidth={1.4} aria-hidden />
                <p>A little conversation.<br />A great new find.</p>
                <small>Your chats will appear here.</small>
              </div>
            )}
          </nav>
          <div className="sidebar-note">
            <span className="tiny-sparkle"><Sparkles size={15} aria-hidden /></span>
            <p>Less searching.<br /><strong>More finding your thing.</strong></p>
          </div>
        </div>
        <button type="button" className="local-profile" onClick={gmailEmail ? onMemory : onConnect}>
          <span className={`profile-avatar${gmailEmail ? ' connected' : ''}`}>{gmailEmail ? <Mail size={16} /> : <UserRound size={18} />}</span>
          <span>
            <strong>{gmailEmail ? (syncing ? 'Reading your orders…' : 'Gmail connected') : 'Your personal space'}</strong>
            <small>{gmailEmail ?? 'Connect Gmail to personalize'}</small>
          </span>
          <SlidersHorizontal size={16} aria-hidden />
        </button>
      </aside>
    </>
  );
}
