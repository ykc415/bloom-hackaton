'use client';

import { useState } from 'react';
import { Gift, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { artifactKinds, type Artifact, type ArtifactKind } from '@/lib/types';

type Props = {
  artifacts: Artifact[];
  factCount: number;
  searchCount: number;
  creating: { kind: ArtifactKind; status: string } | null;
  onCreate: (kind: ArtifactKind, prompt: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
};

// Small CSS mockups standing in for each template, like the tiles in AI tools' artifact galleries.
function TemplateArt({ kind }: { kind: ArtifactKind }) {
  if (kind === 'gift') {
    return <span className="tpl-art gift" aria-hidden><span className="tpl-box"><Gift size={26} strokeWidth={1.5} /></span><i /><i /></span>;
  }
  if (kind === 'restock') {
    return <span className="tpl-art restock" aria-hidden><span className="tpl-shelf"><i /><i /><i /></span><span className="tpl-shelf"><i /><i /></span><span className="tpl-shelf"><i /><i /><i /></span></span>;
  }
  return <span className="tpl-art storefront" aria-hidden><span className="tpl-window"><b /><span><i /><i /><i /><i /></span></span></span>;
}

export function ArtifactsView({ artifacts, factCount, searchCount, creating, onCreate, onOpen, onDelete }: Props) {
  const { t, dateLocale } = useI18n();
  const [tab, setTab] = useState<'all' | 'mine' | 'shared'>('all');
  const [kind, setKind] = useState<ArtifactKind | null>(null);
  const [prompt, setPrompt] = useState('');
  const active = creating?.kind ?? kind;
  const date = (iso: string) => new Date(iso).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });

  function pick(next: ArtifactKind) {
    if (creating) return;
    setKind(next);
    setPrompt('');
  }

  return (
    <div className="artifacts">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t('artifacts.kicker')}</p>
          <h1>{t('artifacts.title')}<span>.</span></h1>
          <p>{t('artifacts.lede')}</p>
        </div>
      </div>

      <div className="artifact-tabs">
        <div role="tablist">
          {(['all', 'mine', 'shared'] as const).map(id => (
            <button type="button" role="tab" key={id} aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
              {t(id === 'all' ? 'artifacts.tabAll' : id === 'mine' ? 'artifacts.tabMine' : 'artifacts.tabShared')}
            </button>
          ))}
        </div>
        <button type="button" className="icon-button" onClick={() => pick('storefront')} aria-label={t('artifacts.kind.storefront')}><Plus size={20} /></button>
      </div>

      <p className="artifact-label">{t('artifacts.createTitle')}</p>
      <div className="template-grid">
        {artifactKinds.map(k => (
          <button type="button" key={k} className={`template-card${active === k ? ' selected' : ''}`} onClick={() => pick(k)} disabled={!!creating && creating.kind !== k}>
            <TemplateArt kind={k} />
            <span className="template-name">{t(`artifacts.kind.${k}`)} <em>{t('artifacts.new')}</em></span>
            <span className="template-desc">{t(`artifacts.desc.${k}`)}</span>
          </button>
        ))}
      </div>

      {active && (
        <div className="artifact-composer" aria-live="polite">
          <div className="artifact-composer-head">
            <strong>{t(`artifacts.kind.${active}`)}</strong>
            <span>{t('artifacts.using', { facts: factCount, searches: searchCount })}</span>
          </div>
          {creating ? (
            <p className="artifact-progress"><span className="spinner" aria-hidden />{creating.status}</p>
          ) : (
            <form onSubmit={e => { e.preventDefault(); onCreate(active, prompt.trim()); }}>
              <textarea value={prompt} rows={2} maxLength={500} placeholder={t(`artifacts.placeholder.${active}`)} onChange={e => setPrompt(e.target.value)} />
              <div className="artifact-composer-actions">
                <button type="button" className="secondary-button" onClick={() => setKind(null)}>{t('artifacts.cancel')}</button>
                <button type="submit" className="primary-button" disabled={active === 'gift' && !prompt.trim()}><Sparkles size={15} aria-hidden /> {t('artifacts.create')}</button>
              </div>
            </form>
          )}
        </div>
      )}

      {tab === 'shared' ? (
        <div className="empty-state compact">{t('artifacts.sharedEmpty')}</div>
      ) : artifacts.length ? (
        <div className="artifact-grid">
          {artifacts.map(a => {
            const thumbs = a.sections.flatMap(s => s.products).map(p => p.image).filter((src): src is string => !!src).slice(0, 4);
            return (
              <article key={a.id} className={`artifact-card accent-${a.accent}`}>
                <button type="button" className="artifact-card-open" onClick={() => onOpen(a.id)}>
                  <span className="artifact-thumbs">{thumbs.map(src => <img key={src} src={src} alt="" loading="lazy" />)}</span>
                  <span className="artifact-card-body">
                    <span className="artifact-kind-tag">{t(`artifacts.kind.${a.kind}`)}</span>
                    <strong>{a.title}</strong>
                    <small>{t('artifacts.created', { date: date(a.createdAt) })}</small>
                  </span>
                </button>
                <button type="button" className="icon-button artifact-card-delete" onClick={() => onDelete(a.id)} aria-label={t('artifacts.delete')}><Trash2 size={15} /></button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state compact">
          <strong>{t('artifacts.emptyTitle')}</strong>
          <p>{t('artifacts.emptyText')}</p>
        </div>
      )}
    </div>
  );
}
