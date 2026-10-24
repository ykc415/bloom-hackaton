'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Bookmark, Package, Sparkles, Store, TrendingDown, TrendingUp } from 'lucide-react';
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
  if (price <= insight.min || price < insight.mean * 0.92) return <p className="insight low"><TrendingDown size={13} aria-hidden /> Lower than usual · 90-day avg {money(insight.mean)}</p>;
  if (price > insight.mean * 1.08) return <p className="insight high"><TrendingUp size={13} aria-hidden /> Higher than usual · 90-day avg {money(insight.mean)}</p>;
  return <p className="insight">Fair price · 90-day avg {money(insight.mean)}</p>;
}

export function ProductCard({ product, saved, onSave, onDetail, drop }: Props) {
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
        <span>{product.brand || 'Picked for you'}</span>
        <button
          type="button"
          className={`icon-button save-icon${saved ? ' is-saved' : ''}`}
          onClick={() => onSave(product, insight)}
          aria-pressed={saved}
          aria-label={`${saved ? 'Unsave' : 'Save'} ${product.title}`}
          title={saved ? 'Saved. We will tell you if the price drops.' : 'Save and watch the price'}
        >
          <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <button type="button" className="product-photo" onClick={() => onDetail(product)} aria-label={`A closer look at ${product.title}`}>
        {product.image && !failed
          ? <img src={product.image} alt="" loading="lazy" onError={() => setFailed(true)} />
          : <span className="photo-fallback"><Package size={36} strokeWidth={1} aria-hidden /><span>Image unavailable</span></span>}
        <span className="photo-arrow" aria-hidden><ArrowUpRight size={17} /></span>
      </button>
      <div className="product-copy">
        <p className="product-category">{product.category || 'Selected for you'}</p>
        <h3><button type="button" onClick={() => onDetail(product)}>{product.title}</button></h3>
        <div className="price-row">
          <strong>{money(best.price)}</strong>
          {best.compareAt && <del>{money(best.compareAt)}</del>}
          <span>at {best.merchant}</span>
        </div>
        {drop ? <p className="insight low"><TrendingDown size={13} aria-hidden /> Dropped {money(drop)} since you saved it</p> : insight && <InsightBadge insight={insight} price={best.price} />}
        {product.reason && <p className="product-reason"><Sparkles size={13} aria-hidden />{product.reason}</p>}
        <p className="product-stores">
          <span className={`stock-dot${best.inStock ? ' green' : ''}`} />
          {product.offers.length > 1
            ? `Best price of ${product.offers.length} stores${savings > 0.5 ? ` · save ${money(savings)}` : ''}`
            : best.inStock ? 'Retailer reports in stock' : 'Availability not confirmed'}
        </p>
        <div className="product-actions">
          <button type="button" className="explore-button" onClick={() => onDetail(product)}>Explore this find <ArrowUpRight size={15} aria-hidden /></button>
          {product.offers.length > 1 && (
            <button
              type="button"
              className={`icon-button compare-toggle${open ? ' selected' : ''}`}
              onClick={() => setOpen(o => !o)}
              aria-expanded={open}
              aria-label={`Compare ${product.offers.length} stores`}
              title={`Compare ${product.offers.length} stores`}
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
                  <span>{o.inStock ? '' : 'Out of stock · '}{money(o.price)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
