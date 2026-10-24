'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Bookmark, Package, Sparkles, Store, TrendingDown, TrendingUp } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { money, type PriceInsight, type Product } from '@/lib/types';

type Props = {
  product: Product;
  saved: boolean;
  onSave: (product: Product, insight: PriceInsight | null) => void;
  onDetail: (product: Product) => void;
  drop?: number; // how much the price fell since it was saved
};

// Judge the price we show, not Channel3's canonical "current" price (it can be another store or variant).
function InsightBadge({ insight, price }: { insight: PriceInsight; price: number }) {
  const { t } = useI18n();
  const avg = { price: money(insight.mean) };
  if (price <= insight.min || price < insight.mean * 0.92) return <p className="insight low"><TrendingDown size={13} aria-hidden /> {t('product.low', avg)}</p>;
  if (price > insight.mean * 1.08) return <p className="insight high"><TrendingUp size={13} aria-hidden /> {t('product.high', avg)}</p>;
  return <p className="insight">{t('product.fair', avg)}</p>;
}

export function ProductCard({ product, saved, onSave, onDetail, drop }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [insight, setInsight] = useState<PriceInsight | null>(null);
  const best = product.offers[0];
  const savings = Math.max(...product.offers.map(o => o.price)) - best.price;

  useEffect(() => {
    let alive = true;
    fetch(`/api/price/${encodeURIComponent(product.id)}`)
      .then(r => (r.ok ? r.json() : null))
      .then((data: PriceInsight | null) => { if (alive) setInsight(data); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [product.id]);

  return (
    <article className="product-card">
      <div className="product-card-top">
        <span>{product.brand || t('product.pickedForYou')}</span>
        <button
          type="button"
          className={`icon-button save-icon${saved ? ' is-saved' : ''}`}
          onClick={() => onSave(product, insight)}
          aria-pressed={saved}
          aria-label={t(saved ? 'product.unsave' : 'product.save', { title: product.title })}
          title={saved ? t('product.savedTip') : t('product.saveTip')}
        >
          <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <button type="button" className="product-photo" onClick={() => onDetail(product)} aria-label={t('product.closerLookAt', { title: product.title })}>
        {product.image && !failed
          ? <img src={product.image} alt="" loading="lazy" onError={() => setFailed(true)} />
          : <span className="photo-fallback"><Package size={36} strokeWidth={1} aria-hidden /><span>{t('product.noImage')}</span></span>}
        <span className="photo-arrow" aria-hidden><ArrowUpRight size={17} /></span>
      </button>
      <div className="product-copy">
        <p className="product-category">{product.category || t('product.selectedForYou')}</p>
        <h3><button type="button" onClick={() => onDetail(product)}>{product.title}</button></h3>
        <div className="price-row">
          <strong>{money(best.price)}</strong>
          {best.compareAt && <del>{money(best.compareAt)}</del>}
          <span>{t('product.at', { merchant: best.merchant })}</span>
        </div>
        {drop ? <p className="insight low"><TrendingDown size={13} aria-hidden /> {t('product.dropped', { amount: money(drop) })}</p> : insight && <InsightBadge insight={insight} price={best.price} />}
        {product.reason && <p className="product-reason"><Sparkles size={13} aria-hidden />{product.reason}</p>}
        <p className="product-stores">
          <span className={`stock-dot${best.inStock ? ' green' : ''}`} />
          {product.offers.length > 1
            ? t('product.bestOf', { count: product.offers.length }) + (savings > 0.5 ? t('product.save_amount', { amount: money(savings) }) : '')
            : best.inStock ? t('product.inStock') : t('product.unconfirmed')}
        </p>
        <div className="product-actions">
          <button type="button" className="explore-button" onClick={() => onDetail(product)}>{t('product.explore')} <ArrowUpRight size={15} aria-hidden /></button>
          {product.offers.length > 1 && (
            <button
              type="button"
              className={`icon-button compare-toggle${open ? ' selected' : ''}`}
              onClick={() => setOpen(o => !o)}
              aria-expanded={open}
              aria-label={t('product.compare', { count: product.offers.length })}
              title={t('product.compare', { count: product.offers.length })}
            >
              <Store size={17} />
            </button>
          )}
        </div>
        {open && (
          <ul className="offer-list">
            {product.offers.map(o => (
              <li key={o.url}>
                <a href={o.url} target="_blank" rel="noopener noreferrer">
                  <span>{o.merchant}</span>
                  <span>{o.inStock ? '' : t('product.outOfStock')}{money(o.price)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
