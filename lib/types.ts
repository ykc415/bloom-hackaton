export type Offer = { merchant: string; url: string; price: number; compareAt: number | null; inStock: boolean };

export type Product = {
  id: string;
  title: string;
  brand: string;
  image: string | null;
  category: string;
  rating: { value: number; count: number } | null;
  offers: Offer[]; // sorted: in stock first, then cheapest
  reason?: string;
};

export type VariantOption = { name: string; values: { label: string; exists: boolean; productId: string | null; thumbnail: string | null }[] };

/** Everything the detail view needs. `offers` are for the selected options; `matched` is false when the retailer data could not honor the selection. */
export type ProductDetail = Product & {
  images: string[];
  description: string;
  materials: string[];
  features: string[];
  attributes: [string, string[]][];
  options: VariantOption[];
  selected: Record<string, string>;
  matched: boolean;
};

/** 90-day price statistics for a product (Channel3 price history). */
export type PriceInsight = { status: 'low' | 'typical' | 'high'; current: number; mean: number; min: number; max: number };

/** A saved product. `price` is the baseline used to detect price drops on later visits. */
export type Saved = { product: Product; price: number; current: number; savedAt: string };

export const homeIcons = [
  'shirt', 'shoe', 'sparkles', 'lamp', 'headphones', 'coffee', 'dumbbell', 'gift', 'baby', 'dog', 'book', 'gamepad', 'plane', 'utensils', 'watch',
  'bag', 'luggage', 'leaf', 'music', 'camera', 'bike', 'paw', 'house', 'laptop', 'gem', 'palette', 'tent', 'wine', 'flower', 'car',
] as const;
export type HomeIcon = (typeof homeIcons)[number];

/** Home-screen shortcuts written from the shopper's memory. */
export type HomeContent = {
  prompts: { icon: HomeIcon; text: string }[];
  categories: { icon: HomeIcon; name: string; description: string; prompt: string }[];
  budgets: { label: string; title: string; text: string; note: string; prompt: string }[];
  usualTier: number;
};

export const artifactKinds = ['storefront', 'gift', 'restock'] as const;
export type ArtifactKind = (typeof artifactKinds)[number];
export const artifactAccents = ['orange', 'blue', 'green', 'plum', 'sand', 'ink'] as const;
export type ArtifactAccent = (typeof artifactAccents)[number];

/** A personal shopping page magent builds from memory and recent searches. */
export type Artifact = {
  id: string;
  kind: ArtifactKind;
  title: string;
  tagline: string;
  intro: string;
  accent: ArtifactAccent;
  basedOn: string[];
  sections: { title: string; description: string; products: Product[] }[];
  prompt: string;
  createdAt: string;
};

export type ArtifactEvent =
  | { type: 'status'; code: 'planning' | 'assembling' }
  | { type: 'status'; code: 'searching'; count: number }
  | { type: 'artifact'; artifact: Artifact }
  | { type: 'error'; message: string }
  | { type: 'done' };

export const factCategories = ['brands', 'sizes', 'budget', 'style', 'interests', 'household', 'returns'] as const;
export type FactCategory = (typeof factCategories)[number];

// "chat" facts were stated by the user and always win over "gmail" inferences with the same key.
export type Fact = {
  key: string;
  category: FactCategory;
  title: string;
  text: string;
  source: 'gmail' | 'chat';
  evidence: string;
  updatedAt: string;
};

export type ChatEvent =
  | { type: 'status'; code: 'thinking' }
  | { type: 'status'; code: 'searching'; query: string }
  | { type: 'text'; delta: string }
  | { type: 'products'; products: Product[]; suggestions: string[] }
  | { type: 'fact'; fact: Fact }
  | { type: 'error'; message: string }
  | { type: 'done' };

export type SyncEvent =
  | { type: 'status'; code: 'connecting' | 'looking' | 'checking' }
  | { type: 'status'; code: 'reading' | 'building'; count: number }
  | { type: 'merchants'; merchants: string[]; emails: number }
  | { type: 'profile'; summary: string | null; facts: Fact[] | null; orders: number; syncedAt: string }
  | { type: 'reconnect' }
  | { type: 'error'; message: string }
  | { type: 'done' };

export const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: value % 1 ? 2 : 0 }).format(value);
