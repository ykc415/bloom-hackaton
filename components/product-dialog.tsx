'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Bookmark, Package, X } from 'lucide-react';
import { money, type Product, type ProductDetail, type VariantOption } from '@/lib/types';

type Props = { product: Product; saved: boolean; onSave: (product: Product) => void; onClose: () => void };

const without = (selection: Record<string, string>, name: string) => Object.fromEntries(Object.entries(selection).filter(([key]) => key !== name));

export function ProductDialog({ product, saved, onSave, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [productId, setProductId] = useState(product.id);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => { dialogRef.current?.showModal(); }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const params = new URLSearchParams(Object.entries(selection).map(([name, label]) => [`option_${name}`, label]));
    fetch(`/api/products/${encodeURIComponent(productId)}?${params}`, { signal: controller.signal })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Could not load product details.');
        return data as ProductDetail;
      })
      .then(data => { setDetail(data); setImageIndex(i => (i < data.images.length ? i : 0)); })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Could not load product details.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [productId, selection]);

  // Colors are often separate products upstream; other options narrow the offers of this one.
  function choose(option: VariantOption, value: VariantOption['values'][number]) {
    if (value.productId && value.productId !== (detail?.id ?? productId)) {
      setProductId(value.productId);
      setSelection(current => without(current, option.name));
      setImageIndex(0);
      return;
    }
    setSelection(current => (current[option.name] === value.label ? without(current, option.name) : { ...current, [option.name]: value.label }));
  }

  const view: ProductDetail = detail ?? {
    ...product, images: product.image ? [product.image] : [], description: '', materials: [], features: [], attributes: [], options: [], selected: {}, matched: true,
  };
  const image = view.images[imageIndex];
  const close = () => dialogRef.current?.close();
  const hasAbout = !!(view.description || view.materials.length || view.features.length || view.attributes.length);

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="detail-title"
      onClose={onClose}
      onClick={e => { if (e.target === dialogRef.current) close(); }}
    >
      <div className="modal-panel">
        <header className="modal-heading">
          <h2>A closer look</h2>
          <button type="button" className="icon-button" onClick={close} aria-label="Close"><X size={20} /></button>
        </header>

        <div className="detail-grid">
          <div className="detail-gallery">
            <div className="detail-photo">
              {image ? <img src={image} alt={view.title} /> : <span className="photo-fallback"><Package size={44} strokeWidth={1} aria-hidden /><span>Image unavailable</span></span>}
            </div>
            {view.images.length > 1 && (
              <div className="detail-thumbs">
                {view.images.map((src, i) => (
                  <button type="button" key={src} className={i === imageIndex ? 'active' : ''} onClick={() => setImageIndex(i)} aria-label={`Show image ${i + 1}`}>
                    <img src={src} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="detail-info">
            <p className="detail-brand">{view.brand || 'Product'}</p>
            <h3 id="detail-title">{view.title}</h3>
            {view.category && <p className="detail-category">{view.category}</p>}

            {view.options.map(option => (
              <div className="detail-option" key={option.name}>
                <p><strong>{option.name}</strong><span>{view.selected[option.name] ?? 'Select an option'}</span></p>
                <div className="option-values">
                  {option.values.map(value => (
                    <button
                      type="button"
                      key={value.label}
                      className={view.selected[option.name] === value.label ? 'selected' : ''}
                      disabled={!value.exists || loading}
                      aria-pressed={view.selected[option.name] === value.label}
                      onClick={() => choose(option, value)}
                    >
                      {value.thumbnail && <img src={value.thumbnail} alt="" />}
                      {value.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="detail-offers">
              <h4>{Object.keys(selection).length ? 'Offers for these options' : 'Where to buy'}</h4>
              {loading && !detail ? <p className="detail-muted">Checking stores…</p>
                : error ? <p className="detail-error">{error}</p>
                : !view.matched ? <p className="detail-muted">That combination isn&apos;t available right now. Try another option.</p>
                : view.offers.length ? (
                  <ul>
                    {view.offers.map(offer => (
                      <li key={offer.url}>
                        <a href={offer.url} target="_blank" rel="noopener noreferrer">
                          <span><strong>{offer.merchant}</strong><small>{offer.inStock ? 'Retailer reports in stock' : 'Availability not confirmed'}</small></span>
                          <span className="offer-price">
                            {offer.compareAt && <del>{money(offer.compareAt)}</del>}
                            <strong>{money(offer.price)}</strong>
                            <ArrowUpRight size={18} aria-hidden />
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : <p className="detail-muted">No store has this option right now.</p>}
              <p className="detail-fineprint">Prices exclude shipping and tax. Confirm your size, delivery and final price at the retailer.</p>
            </div>

            <button type="button" className={`detail-save${saved ? ' is-saved' : ''}`} onClick={() => onSave(product)} aria-pressed={saved}>
              <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} aria-hidden />{saved ? 'Saved · watching the price' : 'Save this find'}
            </button>
          </div>
        </div>

        {hasAbout && (
          <section className="detail-about">
            <h3>About this product</h3>
            {view.description && <p>{view.description}</p>}
            {view.materials.length > 0 && <p className="detail-materials"><strong>Materials</strong> {view.materials.join(', ')}</p>}
            {view.features.length > 0 && <ul className="detail-features">{view.features.map(f => <li key={f}>{f}</li>)}</ul>}
            {view.attributes.length > 0 && (
              <div className="detail-tags">{view.attributes.map(([name, values]) => <span key={name}><b>{name}</b> {values.join(', ')}</span>)}</div>
            )}
          </section>
        )}
      </div>
    </dialog>
  );
}
