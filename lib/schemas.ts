import { z } from 'zod';
import { artifactKinds, factCategories } from './types';

export const localeSchema = z.enum(['en', 'ko', 'ja']).default('en');

export const factSchema = z.object({
  key: z.string().min(1).max(64),
  category: z.enum(factCategories),
  title: z.string().min(1).max(120),
  text: z.string().min(1).max(500),
  source: z.enum(['gmail', 'chat']),
  evidence: z.string().max(300),
  updatedAt: z.string().max(40),
});

const offerSchema = z.object({
  merchant: z.string().max(100), url: z.string().url().max(2000), price: z.number().nonnegative(),
  compareAt: z.number().nullable(), inStock: z.boolean(),
});
export const productSchema = z.object({
  id: z.string().min(1).max(250), title: z.string().max(300), brand: z.string().max(300), image: z.string().max(2000).nullable(),
  category: z.string().max(100), rating: z.object({ value: z.number(), count: z.number() }).nullable(),
  offers: z.array(offerSchema).max(8), reason: z.string().max(300).optional(),
});

export const chatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(8000) })).min(1).max(30)
    .refine(m => m.at(-1)?.role === 'user' && !!m.at(-1)?.text.trim(), 'The last message must be a non-empty user message.'),
  facts: z.array(factSchema).max(80).default([]),
  recentProducts: z.array(productSchema).max(12).default([]),
  capture: z.boolean().default(true),
  locale: localeSchema,
});
export type ChatInput = z.infer<typeof chatSchema>;

export const artifactSchema = z.object({
  kind: z.enum(artifactKinds),
  prompt: z.string().max(500).default(''),
  facts: z.array(factSchema).max(80).default([]),
  history: z.array(z.string().max(200)).max(20).default([]),
  locale: localeSchema,
});

export const homeSchema = z.object({
  facts: z.array(factSchema).min(1).max(80),
  locale: localeSchema,
});

export const syncSchema = z.object({
  after: z.string().datetime().nullable().default(null),
  facts: z.array(factSchema).max(80).default([]),
  locale: localeSchema,
});
