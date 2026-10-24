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

/** 90-day price statistics for a product (Channel3 price history). */
export type PriceInsight = { status: 'low' | 'typical' | 'high'; current: number; mean: number; min: number; max: number };

/** A saved product. `price` is the baseline used to detect price drops on later visits. */
export type Saved = { product: Product; price: number; current: number; savedAt: string };

export const factCategories = ['brands', 'sizes', 'budget', 'style', 'interests', 'household'] as const;
export type FactCategory = (typeof factCategories)[number];
export const categoryLabels: Record<FactCategory, string> = {
  brands: 'Brands', sizes: 'Sizes', budget: 'Budget', style: 'Style', interests: 'Interests', household: 'Household',
};

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
  | { type: 'status'; message: string }
  | { type: 'text'; delta: string }
  | { type: 'products'; products: Product[]; suggestions: string[] }
  | { type: 'fact'; fact: Fact }
  | { type: 'error'; message: string }
  | { type: 'done' };

export type SyncEvent =
  | { type: 'status'; message: string }
  | { type: 'merchants'; merchants: string[]; emails: number }
  | { type: 'profile'; summary: string | null; facts: Fact[] | null; orders: number; syncedAt: string }
  | { type: 'reconnect' }
  | { type: 'error'; message: string }
  | { type: 'done' };

export const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: value % 1 ? 2 : 0 }).format(value);
