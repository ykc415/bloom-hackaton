import { AppError } from './server';
import type { Offer, PriceInsight, Product, ProductDetail, VariantOption } from './types';

const record = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.slice(0, max) : '');
const strings = (v: unknown, count: number, max = 300) => list(v).filter((x): x is string => typeof x === 'string' && !!x.trim()).slice(0, count).map(x => x.slice(0, max));

function httpUrl(value: unknown) {
  try { const url = new URL(str(value, 2000)); return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null; }
  catch { return null; }
}

function toProduct(raw: unknown, allowNoOffers = false): Product | null {
  const p = record(raw);
  const id = str(p.id, 250), title = str(p.title);
  if (!id || !title) return null;
  const offers: Offer[] = list(p.offers).flatMap(o => {
    const offer = record(o), price = record(offer.price), url = httpUrl(offer.url);
    if (!url || price.currency !== 'USD' || typeof price.price !== 'number' || !(price.price >= 0)) return [];
    const compareAt = typeof price.compare_at_price === 'number' && price.compare_at_price > price.price ? price.compare_at_price : null;
    return [{ merchant: str(offer.domain, 100) || new URL(url).hostname, url, price: price.price, compareAt, inStock: offer.availability === 'InStock' }];
  }).sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.price - b.price);
  if (!offers.length && !allowNoOffers) return null;
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
  return list(record(await res.json()).products).map(p => toProduct(p)).filter((p): p is Product => !!p);
}

/** Where today's price sits in the last 90 days. Null when there is no usable history. */
export async function priceInsight(id: string): Promise<PriceInsight | null> {
  const key = process.env.CHANNEL3_API_KEY;
  if (!key) return null;
  const res = await fetch(`https://api.trychannel3.com/v0/price-tracking/history/${encodeURIComponent(id)}?days=90`, {
    headers: { 'x-api-key': key }, signal: AbortSignal.timeout(10_000), cache: 'no-store',
  });
  if (!res.ok) return null;
  const s = record(record(await res.json()).statistics);
  const status = s.current_status;
  const numbers = [s.current_price, s.mean, s.min_price, s.max_price];
  if (s.currency !== 'USD' || (status !== 'low' && status !== 'typical' && status !== 'high') || !numbers.every(n => typeof n === 'number' && n >= 0)) return null;
  const [current, mean, min, max] = numbers as number[];
  return { status, current, mean, min, max };
}

const humanize = (key: string) => key.replace(/[-_]+/g, ' ').replace(/^./, c => c.toUpperCase());

/** Full product with images, details and variant options. `requested` maps option names to labels (e.g. { Size: "10" }). */
export async function getProductDetail(id: string, requested: Record<string, string>): Promise<ProductDetail> {
  const key = process.env.CHANNEL3_API_KEY;
  if (!key) throw new AppError('Product details are not configured yet.');
  const params = new URLSearchParams({ country: 'US', currency: 'USD', language: 'en' });
  for (const [name, label] of Object.entries(requested)) params.set(`option_${name}`, label);
  const res = await fetch(`https://api.trychannel3.com/v1/products/${encodeURIComponent(id)}?${params}`, {
    headers: { 'x-api-key': key }, signal: AbortSignal.timeout(20_000), cache: 'no-store',
  });
  if (res.status === 404) throw new AppError('This product is no longer available.');
  if (!res.ok) throw new AppError('Could not load product details. Please try again.');
  const raw = record(await res.json());
  const base = toProduct(raw, true);
  if (!base) throw new AppError('Could not read this product.');
  const images = [...new Set(list(raw.images).map(record)
    .sort((a, b) => Number(!!b.is_main_image) - Number(!!a.is_main_image))
    .map(img => httpUrl(img.cleaned_url) ?? httpUrl(img.url)).filter((u): u is string => !!u))].slice(0, 10);
  const variants = record(raw.variants);
  const selected: Record<string, string> = {};
  for (const s of list(variants.selected).map(record)) if (str(s.name) && str(s.label)) selected[str(s.name, 100)] = str(s.label, 200);
  const options: VariantOption[] = list(variants.options).map(record).filter(o => str(o.name)).slice(0, 6).map(o => ({
    name: str(o.name, 100),
    values: list(o.values).map(record).filter(v => str(v.label)).slice(0, 60).map(v => ({
      label: str(v.label, 200), exists: v.exists !== false, productId: str(v.product_id, 250) || null, thumbnail: httpUrl(v.thumbnail_url),
    })),
  }));
  const attributes = Object.entries(record(raw.structured_attributes)).slice(0, 10)
    .map(([k, v]) => [humanize(k).slice(0, 60), strings(v, 4, 80)] as [string, string[]]).filter(([, v]) => v.length);
  return {
    ...base,
    images: images.length ? images : base.image ? [base.image] : [],
    description: str(raw.description, 3000),
    materials: strings(raw.materials, 8, 80),
    features: strings(raw.key_features, 8),
    attributes,
    options,
    selected,
    matched: Object.entries(requested).every(([name, label]) => selected[name] === label),
  };
}
