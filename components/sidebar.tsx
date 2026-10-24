'use client';

import { useI18n } from '@/lib/i18n';
import { Bookmark, Brain, ChevronRight, Mail, MessageSquare, Plug, Plus, Shapes, SlidersHorizontal, Sparkles, Trash2, UserRound } from 'lucide-react';

type Props = {
  open: boolean;
  conversations: { id: string; title: string }[];
  activeId: string | null;
  memoryActive: boolean;
  savedActive: boolean;
  savedCount: number;
  onSaved: () => void;
  connectionsActive: boolean;
  onConnections: () => void;
  artifactsActive: boolean;
  artifactsCount: number;
  onArtifacts: () => void;
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

export function Sidebar({ open, conversations, activeId, memoryActive, savedActive, savedCount, onSaved, connectionsActive, onConnections, artifactsActive, artifactsCount, onArtifacts, factCount, gmailEmail, syncing, onNew, onSelect, onDelete, onMemory, onConnect, onClose }: Props) {
  const { t } = useI18n();
  return (
    <>
      {open && <button type="button" className="sidebar-scrim" aria-label={t('nav.closeNav')} onClick={onClose} />}
      <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
        <button type="button" className="brand-lockup" onClick={onNew} aria-label={t('common.home')}>
          <img src="/brand/magent-symbol.webp" alt="" className="brand-symbol" />
          <span>
            <img src="/brand/magent-wordmark.webp" alt="magent" className="brand-wordmark" />
            <small>{t('brand.tagline')}</small>
          </span>
        </button>
        <div className="sidebar-main">
          <button type="button" className="new-chat-button" onClick={onNew}><Plus size={17} aria-hidden />{t('nav.newChat')}</button>
          <button type="button" className={`memory-nav-button${memoryActive ? ' active' : ''}`} onClick={onMemory}>
            <Brain size={17} aria-hidden /><span>{t('nav.memory')}</span><small>{factCount ? t('nav.memoryCount', { count: factCount }) : t('nav.memoryEmpty')}</small>
          </button>
          <button type="button" className={`memory-nav-button nav-secondary${savedActive ? ' active' : ''}`} onClick={onSaved}>
            <Bookmark size={17} aria-hidden /><span>{t('nav.savedFinds')}</span><small>{savedCount}</small>
          </button>
          <button type="button" className={`memory-nav-button nav-secondary${connectionsActive ? ' active' : ''}`} onClick={onConnections}>
            <Plug size={17} aria-hidden /><span>{t('nav.connections')}</span><small>{gmailEmail ? 1 : 0}</small>
          </button>
          <button type="button" className={`memory-nav-button nav-secondary${artifactsActive ? ' active' : ''}`} onClick={onArtifacts}>
            <Shapes size={17} aria-hidden /><span>{t('nav.artifacts')}</span><small>{artifactsCount}</small>
          </button>
          <p className="history-heading">{t('nav.recent')}</p>
          <nav className="conversation-list" aria-label={t('nav.recentAria')}>
            {conversations.length ? conversations.map(chat => (
              <div key={chat.id} className={`history-row${chat.id === activeId ? ' active' : ''}`}>
                <button type="button" onClick={() => onSelect(chat.id)}>
                  <span className="history-dot" /><span className="history-title">{chat.title}</span><ChevronRight size={14} aria-hidden />
                </button>
                <button type="button" className="history-delete" onClick={() => onDelete(chat.id)} aria-label={t('nav.delete', { title: chat.title })}><Trash2 size={14} /></button>
              </div>
            )) : (
              <div className="history-empty">
                <MessageSquare size={20} strokeWidth={1.4} aria-hidden />
                <p>{t('nav.empty1')}<br />{t('nav.empty2')}</p>
                <small>{t('nav.emptyHint')}</small>
              </div>
            )}
          </nav>
          <div className="sidebar-note">
            <span className="tiny-sparkle"><Sparkles size={15} aria-hidden /></span>
            <p>{t('nav.note1')}<br /><strong>{t('nav.note2')}</strong></p>
          </div>
        </div>
        <button type="button" className="local-profile" onClick={gmailEmail ? onMemory : onConnect}>
          <span className={`profile-avatar${gmailEmail ? ' connected' : ''}`}>{gmailEmail ? <Mail size={16} /> : <UserRound size={18} />}</span>
          <span>
            <strong>{gmailEmail ? (syncing ? t('nav.reading') : t('nav.gmailConnected')) : t('nav.personalSpace')}</strong>
            <small>{gmailEmail ?? t('nav.connectHint')}</small>
          </span>
          <SlidersHorizontal size={16} aria-hidden />
        </button>
      </aside>
    </>
  );
}
