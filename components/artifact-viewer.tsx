'use client';

import { ArrowLeft, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { useI18n } from '@/lib/i18n';
import type { Artifact, PriceInsight, Product } from '@/lib/types';

type Props = {
  artifact: Artifact;
  savedIds: Set<string>;
  onBack: () => void;
  onDelete: () => void;
  onRemake: () => void;
  onSave: (product: Product, insight: PriceInsight | null) => void;
  onDetail: (product: Product) => void;
};

export function ArtifactViewer({ artifact, savedIds, onBack, onDelete, onRemake, onSave, onDetail }: Props) {
  const { t, dateLocale } = useI18n();
  const date = new Date(artifact.createdAt).toLocaleDateString(dateLocale, { year: 'numeric', month: 'short', day: 'numeric' });
  return (
    <div className={`artifact-page accent-${artifact.accent}`}>
      <div className="artifact-toolbar">
        <button type="button" className="text-button" onClick={onBack}><ArrowLeft size={16} aria-hidden /> {t('nav.artifacts')}</button>
        <div>
          <button type="button" className="secondary-button" onClick={onRemake}><RefreshCw size={15} aria-hidden /> {t('artifacts.remake')}</button>
          <button type="button" className="icon-button" onClick={onDelete} aria-label={t('artifacts.delete')}><Trash2 size={16} /></button>
        </div>
      </div>

      <header className="artifact-hero">
        <p className="artifact-hero-kind"><Sparkles size={14} aria-hidden /> {t(`artifacts.kind.${artifact.kind}`)}</p>
        <h1>{artifact.title}</h1>
        <p className="artifact-tagline">{artifact.tagline}</p>
        <p className="artifact-intro">{artifact.intro}</p>
        {artifact.basedOn.length > 0 && (
          <div className="artifact-based">
            <span>{t('artifacts.basedOn')}</span>
            {artifact.basedOn.map(label => <em key={label}>{label}</em>)}
          </div>
        )}
      </header>

      {artifact.sections.map(section => (
        <section key={section.title} className="artifact-section">
          <div className="section-heading">
            <div><h2>{section.title}</h2><p>{section.description}</p></div>
            <span>{t('artifacts.items', { count: section.products.length })}</span>
          </div>
          <div className="product-grid four">
            {section.products.map(p => <ProductCard key={p.id} product={p} saved={savedIds.has(p.id)} onSave={onSave} onDetail={onDetail} />)}
          </div>
        </section>
      ))}

      <footer className="artifact-footer">
        <img src="/brand/magent-symbol.webp" alt="" />
        <span>{t('artifacts.madeBy', { date })}</span>
      </footer>
    </div>
  );
}
