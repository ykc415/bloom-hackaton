'use client';

import { ArrowRight, BellRing, Brain, Lock, Mail, ShieldCheck, ShoppingBag, Sparkles, Store, Tags, TrendingDown } from 'lucide-react';

const steps = [
  { icon: Mail, title: 'Connect Gmail', text: 'One tap with Google. magent looks only for order confirmations, receipts and shipping notices.' },
  { icon: Brain, title: 'magent learns your taste', text: 'Claude reads your past orders and builds a profile of the brands, sizes and budgets you already love.' },
  { icon: ShoppingBag, title: 'Shop like it knows you', text: 'Ask for anything. Get picks across every category, with prices compared across stores.' },
];

const features = [
  { icon: Tags, title: 'Every category', text: 'Fashion, beauty, home, tech and more, from retailers across the US.' },
  { icon: Store, title: 'Best price, every time', text: 'Compare stores side by side and see where today’s price sits against the last 90 days.' },
  { icon: BellRing, title: 'Price-drop alerts', text: 'Save a find and magent tells you when it gets cheaper.' },
  { icon: Sparkles, title: 'Memory you control', text: 'Tell magent your size or style once. See or delete everything it knows, anytime.' },
];

const promises = [
  'Reads only order emails, never your conversations',
  'Never stores your emails',
  'Your taste profile stays in your browser',
  'Log out anytime to revoke access',
];

export function Landing({ onConnect }: { onConnect: () => void }) {
  const cta = (label: string) => (
    <button type="button" className="primary-button landing-cta" onClick={onConnect}>
      <Mail size={17} aria-hidden /> {label} <ArrowRight size={17} aria-hidden />
    </button>
  );

  return (
    <div className="landing">
      <header className="landing-nav">
        <a className="landing-brand" href="/" aria-label="magent home">
          <img src="/brand/magent-symbol.webp" alt="" className="brand-symbol" />
          <img src="/brand/magent-wordmark.webp" alt="magent" className="landing-wordmark" />
        </a>
        <nav>
          <a href="#how">How it works</a>
          <a href="#privacy">Privacy</a>
          <button type="button" className="primary-button" onClick={onConnect}>Log in with Gmail</button>
        </nav>
      </header>

      <main id="main">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="hero-kicker"><span /><span>YOUR PERSONAL SHOPPING CONCIERGE</span></div>
            <h1>Shopping that already <em>knows you.</em></h1>
            <p>magent learns your brands, sizes and budgets from your order emails, then finds what you&apos;ll love next, at the best price across stores.</p>
            {cta('Continue with Gmail')}
            <p className="landing-fineprint"><ShieldCheck size={14} aria-hidden /> Reads only order emails · Never stores your emails</p>
            <p className="landing-fineprint muted">During our beta, Google may show an &quot;unverified app&quot; screen. Choose Advanced, then Go to magent.</p>
          </div>

          <div className="landing-visual" aria-hidden>
            <div className="visual-card visual-profile">
              <p className="visual-kicker">YOUR TASTE PROFILE · FROM 37 ORDERS</p>
              <p className="visual-summary">You love clean, minimal basics and run a few times a week.</p>
              <div className="visual-chips">
                <span><b>Brands</b>HOKA · Uniqlo</span>
                <span><b>Shoes</b>US 10.5</span>
                <span><b>Budget</b>$80–150</span>
              </div>
            </div>
            <div className="visual-card visual-pick">
              <span className="visual-thumb"><ShoppingBag size={22} strokeWidth={1.4} /></span>
              <div>
                <p className="visual-brand">HOKA</p>
                <p className="visual-title">Clifton 10 Running Shoes</p>
                <p className="visual-price"><strong>$109.99</strong><span><TrendingDown size={12} /> Lower than usual</span></p>
                <p className="visual-reason"><Sparkles size={12} /> Your usual size 10.5, under your $150 budget</p>
              </div>
            </div>
            <div className="visual-card visual-pick">
              <span className="visual-thumb"><Tags size={22} strokeWidth={1.4} /></span>
              <div>
                <p className="visual-brand">UNIQLO</p>
                <p className="visual-title">Supima Cotton Crew Tee</p>
                <p className="visual-price"><strong>$14.90</strong><span className="neutral">Best price of 3 stores</span></p>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section" id="how" aria-labelledby="how-title">
          <div className="section-heading">
            <div><h2 id="how-title">How it works</h2><p>Three steps from inbox to the right pick.</p></div>
            <span>01 — HOW IT WORKS</span>
          </div>
          <div className="landing-steps">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <article key={title} className="landing-step">
                <span className="step-number">0{i + 1}</span>
                <Icon size={24} strokeWidth={1.5} aria-hidden />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section" aria-labelledby="features-title">
          <div className="section-heading">
            <div><h2 id="features-title">Less searching. More finding your thing.</h2><p>Everything you need to buy the right thing, once.</p></div>
            <span>02 — WHAT YOU GET</span>
          </div>
          <div className="landing-features">
            {features.map(({ icon: Icon, title, text }) => (
              <article key={title} className="category-card">
                <Icon size={24} strokeWidth={1.5} aria-hidden />
                <strong>{title}</strong>
                <span>{text}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section" id="privacy" aria-labelledby="privacy-title">
          <div className="landing-privacy">
            <span className="personal-icon"><Lock size={22} strokeWidth={1.5} aria-hidden /></span>
            <div>
              <p className="personal-kicker">PRIVACY BY DESIGN</p>
              <h2 id="privacy-title">Your inbox stays yours.</h2>
              <ul>{promises.map(p => <li key={p}><ShieldCheck size={15} aria-hidden />{p}</li>)}</ul>
              <a href="/privacy">Read our privacy policy</a>
            </div>
          </div>
        </section>

        <section className="landing-final">
          <h2>Ready to skip the searching?</h2>
          <p>Connect Gmail and get your first personalized picks in about a minute.</p>
          {cta('Get my picks')}
        </section>
      </main>

      <footer className="home-footer landing-footer">
        <img src="/brand/magent-symbol.webp" alt="" className="footer-symbol" />
        <p>A better way to find what you&apos;ll love.</p>
        <span><a href="/privacy">Privacy</a> · US retailers · Prices in USD</span>
      </footer>
    </div>
  );
}
