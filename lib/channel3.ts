import { AppError } from './server';
import type { Offer, Product } from './types';

const record = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.slice(0, max) : '');

function httpUrl(value: unknown) {
  try { const url = new URL(str(value, 2000)); return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null; }
  catch { return null; }
}

function toProduct(raw: unknown): Product | null {
  const p = record(raw);
  const id = str(p.id, 250), title = str(p.title);
  if (!id || !title) return null;
  const offers: Offer[] = list(p.offers).flatMap(o => {
    const offer = record(o), price = record(offer.price), url = httpUrl(offer.url);
    if (!url || price.currency !== 'USD' || typeof price.price !== 'number' || !(price.price >= 0)) return [];
    const compareAt = typeof price.compare_at_price === 'number' && price.compare_at_price > price.price ? price.compare_at_price : null;
    return [{ merchant: str(offer.domain, 100) || new URL(url).hostname, url, price: price.price, compareAt, inStock: offer.availability === 'InStock' }];
  }).sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.price - b.price);
  if (!offers.length) return null;
  const images = list(p.images).map(record).sort((a, b) => Number(!!b.is_main_image) - Number(!!a.is_main_image));
  const ratings = record(p.ratings);
  return {
    id,
    title,
    brand: list(p.brands).map(b => str(record(b).name, 100)).filter(Boolean).join(' / '),
    image: images.map(img => httpUrl(img.cleaned_url) ?? httpUrl(img.url)).find(Boolean) ?? null,
    category: str(record(p.category).title, 100),
    rating: typeof ratings.value === 'number' && typeof ratings.count === 'number' && ratings.count > 0 ? { value: ratings.value, count: ratings.count } : null,
    offers: offers.slice(0, 8),
  };
}

/** US / USD product search across retailers. */
export async function searchProducts(query: string, price: { min?: number; max?: number }, signal?: AbortSignal): Promise<Product[]> {
  const key = process.env.CHANNEL3_API_KEY;
  if (!key) throw new AppError('Product search is not configured yet.');
  const priceFilter = price.min !== undefined || price.max !== undefined ? { price: { min_price: price.min ?? null, max_price: price.max ?? null } } : {};
  const timeout = AbortSignal.timeout(25_000);
  const res = await fetch('https://api.trychannel3.com/v1/search', {
    method: 'POST',
    headers: { 'x-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({ query, limit: 10, config: { country: 'US', currency: 'USD', language: 'en' }, filters: { availability: ['InStock'], ...priceFilter } }),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    cache: 'no-store',
  });
  if (!res.ok) {
    console.error('Channel3 search failed', res.status);
    throw new AppError(res.status === 429 ? 'Product search is busy. Please try again in a moment.' : 'Could not reach the product catalog.');
  }
  return list(record(await res.json()).products).map(toProduct).filter((p): p is Product => !!p);
}
