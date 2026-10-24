'use client';

import type { ReactNode } from 'react';
import { ArrowRight, ArrowUpRight, Brain, Footprints, Gift, Headphones, Lamp, Luggage, Mail, RefreshCw, Shirt, ShieldCheck, Sparkles } from 'lucide-react';
import type { Fact } from '@/lib/types';

const prompts = [
  { icon: Luggage, text: 'A carry-on suitcase under $200' },
  { icon: Footprints, text: 'Running shoes for flat feet' },
  { icon: Gift, text: 'A gift for a coffee lover under $50' },
];

const categories = [
  { icon: Shirt, name: 'Fashion & shoes', description: 'Everyday staples to statement pieces.', prompt: 'Find versatile everyday fashion pieces that fit my style.' },
  { icon: Sparkles, name: 'Beauty & self-care', description: 'Simple routines that actually work.', prompt: 'Recommend a simple, effective skincare routine for me.' },
  { icon: Lamp, name: 'Home & living', description: 'Make your space feel like you.', prompt: 'Find minimalist home decor and lighting for a small apartment.' },
  { icon: Headphones, name: 'Tech & gadgets', description: 'Smart picks for work and play.', prompt: 'Recommend genuinely useful tech gadgets under $100.' },
];

const budgets = [
  { label: 'THE EVERYDAY FIND', title: 'Under $50', text: 'Easy favorites. Even easier on your wallet.', note: 'Daily essentials & small upgrades', prompt: 'Show me great everyday finds under $50 that fit my style.' },
  { label: 'THE SWEET SPOT', title: '$50 – $150', text: 'A little extra in all the right places.', note: 'Quality staples & trusted brands', prompt: 'Find standout products between $50 and $150 that suit me.', accent: true },
  { label: 'THE SPECIAL ONE', title: '$150 & up', text: 'Considered details. Something different.', note: 'Premium materials & design', prompt: 'Show me special, premium picks over $150 that match my taste.' },
];

type Props = {
  composer: ReactNode;
  disabled: boolean;
  onPrompt: (text: string) => void;
  gmailEmail: string | null;
  gmailChecked: boolean;
  sync: { status: string; merchants: string[]; emails: number } | null;
  summary: string | null;
  facts: Fact[];
  orders: number;
  onConnect: () => void;
  onPicks: () => void;
  onSync: () => void;
  onMemory: () => void;
};

function SectionHeading({ id, title, text, label }: { id: string; title: string; text: string; label: string }) {
  return (
    <div className="section-heading">
      <div><h2 id={id}>{title}</h2><p>{text}</p></div>
      <span>{label}</span>
    </div>
  );
}

function PersonalCard({ gmailEmail, gmailChecked, sync, summary, facts, orders, onConnect, onPicks, onSync, onMemory }: Omit<Props, 'composer' | 'disabled' | 'onPrompt'>) {
  if (sync) {
    return (
      <div className="personal-card" aria-live="polite">
        <span className="personal-icon syncing"><RefreshCw size={22} strokeWidth={1.5} className="spin" aria-hidden /></span>
        <div className="personal-copy">
          <p className="personal-kicker">READING YOUR ORDERS</p>
          <h3>{sync.status}</h3>
          {sync.merchants.length > 0 && (
            <>
              <p>Found {sync.emails} order emails from</p>
              <div className="merchant-chips">{sync.merchants.map(name => <span key={name}>{name}</span>)}</div>
            </>
          )}
        </div>
      </div>
    );
  }
  if (gmailEmail && facts.length) {
    return (
      <div className="personal-card profile">
        <span className="personal-icon"><Brain size={22} strokeWidth={1.5} aria-hidden /></span>
        <div className="personal-copy">
          <p className="personal-kicker">YOUR TASTE PROFILE{orders ? ` · FROM ${orders} ORDERS` : ''}</p>
          <h3>{summary ?? 'magent knows your sizes, brands and budgets.'}</h3>
          <div className="fact-chips">
            {facts.slice(0, 6).map(f => <span key={f.key} title={f.evidence}><b>{f.title}</b>{f.text}</span>)}
          </div>
          <div className="personal-actions">
            <button type="button" className="primary-button" onClick={onPicks}>Show my picks <ArrowRight size={16} aria-hidden /></button>
            <button type="button" className="secondary-button" onClick={onMemory}>Open memory</button>
          </div>
        </div>
      </div>
    );
  }
  if (gmailEmail) {
    return (
      <div className="personal-card">
        <span className="personal-icon"><Mail size={22} strokeWidth={1.5} aria-hidden /></span>
        <div className="personal-copy">
          <p className="personal-kicker">GMAIL CONNECTED · {gmailEmail}</p>
          <h3>No recent orders found yet.</h3>
          <p>We look for order confirmations, receipts and shipping notices from the last 12 months. You can also just tell magent your sizes and style.</p>
          <div className="personal-actions"><button type="button" className="secondary-button" onClick={onSync}><RefreshCw size={15} aria-hidden /> Check again</button></div>
        </div>
      </div>
    );
  }
  return (
    <div className="personal-card">
      <span className="personal-icon"><Mail size={22} strokeWidth={1.5} aria-hidden /></span>
      <div className="personal-copy">
        <p className="personal-kicker">SKIP THE QUESTIONS</p>
        <h3>Connect Gmail. magent learns your taste from your orders.</h3>
        <p>Brands you love, the sizes you wear, what you usually spend. magent reads your order emails once, then shops like it already knows you.</p>
        <p className="privacy-line"><ShieldCheck size={14} aria-hidden /> Reads only order emails · Never stores your emails · Your profile stays in this browser</p>
        <div className="personal-actions">
          <button type="button" className="primary-button" onClick={onConnect} disabled={!gmailChecked}>Connect Gmail <ArrowRight size={16} aria-hidden /></button>
        </div>
      </div>
      <div className="personal-preview" aria-hidden>
        <p>WHAT MAGENT LEARNS</p>
        <span><b>Brands</b>HOKA, Uniqlo, The Ordinary</span>
        <span><b>Sizes</b>Shoes US 10.5 · Tops M</span>
        <span><b>Budget</b>Usually $80–150 on shoes</span>
        <span><b>Style</b>Minimal, neutral colors</span>
      </div>
    </div>
  );
}

export function HomeView({ composer, disabled, onPrompt, ...personal }: Props) {
  return (
    <>
      <section className="home-hero">
        <div className="hero-kicker"><span /><span>A LITTLE GUIDANCE. A GREAT FIND.</span></div>
        <h1>What are you looking for?</h1>
        <p>Tell us your style, your plans, your budget.<br className="desktop-break" /> We&apos;ll find things that feel like you.</p>
        {composer}
        <div className="composer-hint"><span>Made for your next find.</span><span><kbd>↵</kbd> to start a conversation</span></div>
        <div className="prompt-chips">
          {prompts.map(({ icon: Icon, text }) => (
            <button type="button" key={text} disabled={disabled} onClick={() => onPrompt(text)}><Icon size={14} aria-hidden />{text}<ArrowUpRight size={13} aria-hidden /></button>
          ))}
        </div>
      </section>

      <section className="home-section" aria-labelledby="personal-title">
        <SectionHeading id="personal-title" title="Make it personal." text="Your taste, learned from what you already buy." label="01 — YOUR TASTE" />
        <PersonalCard {...personal} />
      </section>

      <section className="home-section" aria-labelledby="style-title">
        <SectionHeading id="style-title" title="Start anywhere" text="A few good places to start." label="02 — YOUR STYLE" />
        <div className="category-grid">
          {categories.map(({ icon: Icon, name, description, prompt }) => (
            <button type="button" className="category-card" key={name} disabled={disabled} onClick={() => onPrompt(prompt)}>
              <Icon size={24} strokeWidth={1.5} aria-hidden />
              <ArrowUpRight size={15} className="card-arrow" aria-hidden />
              <strong>{name}</strong>
              <span>{description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="home-section" aria-labelledby="budget-title">
        <SectionHeading id="budget-title" title="Great finds. Your budget." text="Find your sweet spot." label="03 — YOUR BUDGET" />
        <div className="budget-grid">
          {budgets.map(b => (
            <button type="button" className={`budget-card${b.accent ? ' accent' : ''}`} key={b.title} disabled={disabled} onClick={() => onPrompt(b.prompt)}>
              <span className="budget-label">{b.label}</span>
              <ArrowUpRight size={15} className="card-arrow" aria-hidden />
              <strong>{b.title}</strong>
              <span className="budget-text">{b.text}</span>
              <span className="budget-note">{b.note}</span>
            </button>
          ))}
        </div>
      </section>

      <footer className="home-footer">
        <img src="/brand/magent-symbol.webp" alt="" className="footer-symbol" />
        <p>A better way to find what you&apos;ll love.</p>
        <span>US retailers · Prices in USD</span>
      </footer>
    </>
  );
}
