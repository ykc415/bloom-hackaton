'use client';

import { useState } from 'react';
import { ArrowUpRight, Sparkles, Star } from 'lucide-react';
import { money, type Product } from '@/lib/types';

export function ProductCard({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const best = product.offers[0];
  const highest = Math.max(...product.offers.map(o => o.price));
  return (
    <article className="card">
      <a className="card-media" href={best.url} target="_blank" rel="noopener noreferrer" tabIndex={-1}>
        {product.image ? <img src={product.image} alt="" loading="lazy" /> : <span className="noimg">No image</span>}
      </a>
      <div className="card-body">
        <p className="card-brand">{product.brand || product.category || 'Product'}</p>
        <h3 className="card-title">{product.title}</h3>
        {product.reason && <p className="card-reason"><Sparkles size={13} aria-hidden />{product.reason}</p>}
        <div className="card-price">
          <strong>{money(best.price)}</strong>
          {best.compareAt && <s>{money(best.compareAt)}</s>}
          <span>at {best.merchant}</span>
        </div>
        {product.offers.length > 1 && highest > best.price && (
          <p className="card-save">Best price of {product.offers.length} stores · save {money(highest - best.price)}</p>
        )}
        {product.rating && (
          <p className="card-rating"><Star size={12} aria-hidden /> {product.rating.value.toFixed(1)} · {product.rating.count.toLocaleString('en-US')} reviews</p>
        )}
        <div className="card-actions">
          <a className="btn primary sm" href={best.url} target="_blank" rel="noopener noreferrer">Buy <ArrowUpRight size={14} aria-hidden /></a>
          {product.offers.length > 1 && (
            <button type="button" className="btn ghost sm" aria-expanded={open} onClick={() => setOpen(o => !o)}>
              {open ? 'Hide stores' : `Compare ${product.offers.length} stores`}
            </button>
          )}
        </div>
        {open && (
          <ul className="offers">
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
