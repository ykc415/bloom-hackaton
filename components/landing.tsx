'use client';

import { useState } from 'react';
import { ArrowRight, BellRing, Brain, Lock, Mail, ShieldCheck, ShoppingBag, Sparkles, Store, Tags, TrendingDown, type LucideIcon } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useI18n, type MessageKey } from '@/lib/i18n';

const steps = [
  { icon: Mail, n: 1 },
  { icon: Brain, n: 2 },
  { icon: ShoppingBag, n: 3 },
] as const;

const features = [
  { icon: Tags, n: 1 },
  { icon: Store, n: 2 },
  { icon: BellRing, n: 3 },
  { icon: Sparkles, n: 4 },
] as const;

const promises = ['landing.promise1', 'landing.promise2', 'landing.promise3', 'landing.promise4'] as const;

// Real catalog photos (Channel3) for the illustrative picks; fall back to an icon if the CDN is unavailable.
const HOKA_IMAGE = 'https://cdn.trychannel3.com/cleaned/v1/505607fc-5254-4a78-a9aa-d52fbaa3903a?aid=01M5P67DHNAGC3CWTXZDHYG5AT&mid=3KLu';
const TEE_IMAGE = 'https://cdn.trychannel3.com/4caa435a-3bb8-4335-b812-82662c7968ef?aid=01M5P67FF40YSNHKV8D6VB9NAB&mid=fJnd';

function Thumb({ src, icon: Icon, cover }: { src: string; icon: LucideIcon; cover?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="visual-thumb">
      {failed ? <Icon size={22} strokeWidth={1.4} /> : <img src={src} alt="" className={cover ? 'cover' : ''} onError={() => setFailed(true)} />}
    </span>
  );
}

export function Landing({ onConnect }: { onConnect: () => void }) {
  const { t } = useI18n();
  const k = (key: string) => t(key as MessageKey);
  const cta = (label: string) => (
    <button type="button" className="primary-button landing-cta" onClick={onConnect}>
      <Mail size={17} aria-hidden /> {label} <ArrowRight size={17} aria-hidden />
    </button>
  );

  return (
    <div className="landing">
      <header className="landing-nav">
        <a className="landing-brand" href="/" aria-label={t('common.home')}>
          <img src="/brand/magent-symbol.webp" alt="" className="brand-symbol" />
          <img src="/brand/magent-wordmark.webp" alt="magent" className="landing-wordmark" />
        </a>
        <nav>
          <a href="#how">{t('landing.howItWorks')}</a>
          <a href="#privacy">{t('common.privacy')}</a>
          <LanguageSwitcher />
          <button type="button" className="primary-button" onClick={onConnect}>{t('landing.login')}</button>
        </nav>
      </header>

      <main id="main">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="hero-kicker"><span /><span>{t('landing.kicker')}</span></div>
            <h1>{t('landing.title1')}<br /><em>{t('landing.title2')}</em></h1>
            <p>{t('landing.lede')}</p>
            {cta(t('landing.cta'))}
            <p className="landing-fineprint"><ShieldCheck size={14} aria-hidden /> {t('landing.fine1')}</p>
            <p className="landing-fineprint muted">{t('landing.fine2')}</p>
          </div>

          <div className="landing-visual" aria-hidden>
            <div className="visual-card visual-profile">
              <p className="visual-kicker">{t('landing.visualKicker')}</p>
              <p className="visual-summary">{t('landing.visualSummary')}</p>
              <div className="visual-chips">
                <span><b>{t('landing.visualBrands')}</b>HOKA · Uniqlo</span>
                <span><b>{t('landing.visualShoes')}</b>US 10.5</span>
                <span><b>{t('landing.visualBudget')}</b>$80–150</span>
              </div>
            </div>
            <div className="visual-card visual-pick">
              <Thumb src={HOKA_IMAGE} icon={ShoppingBag} />
              <div>
                <p className="visual-brand">HOKA</p>
                <p className="visual-title">{t('landing.visualPick1')}</p>
                <p className="visual-price"><strong>$109.99</strong><span><TrendingDown size={12} /> {t('landing.visualLow')}</span></p>
                <p className="visual-reason"><Sparkles size={12} /> {t('landing.visualReason')}</p>
              </div>
            </div>
            <div className="visual-card visual-pick">
              <Thumb src={TEE_IMAGE} icon={Tags} cover />
              <div>
                <p className="visual-brand">UNIQLO</p>
                <p className="visual-title">{t('landing.visualPick2')}</p>
                <p className="visual-price"><strong>$14.90</strong><span className="neutral">{t('landing.visualStores')}</span></p>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section" id="how" aria-labelledby="how-title">
          <div className="section-heading">
            <div><h2 id="how-title">{t('landing.howTitle')}</h2><p>{t('landing.howText')}</p></div>
            <span>{t('landing.howLabel')}</span>
          </div>
          <div className="landing-steps">
            {steps.map(({ icon: Icon, n }) => (
              <article key={n} className="landing-step">
                <span className="step-number">0{n}</span>
                <Icon size={24} strokeWidth={1.5} aria-hidden />
                <h3>{k(`landing.step${n}Title`)}</h3>
                <p>{k(`landing.step${n}Text`)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section" aria-labelledby="features-title">
          <div className="section-heading">
            <div><h2 id="features-title">{t('landing.featuresTitle')}</h2><p>{t('landing.featuresText')}</p></div>
            <span>{t('landing.featuresLabel')}</span>
          </div>
          <div className="landing-features">
            {features.map(({ icon: Icon, n }) => (
              <article key={n} className="category-card">
                <Icon size={24} strokeWidth={1.5} aria-hidden />
                <strong>{k(`landing.feature${n}Title`)}</strong>
                <span>{k(`landing.feature${n}Text`)}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section" id="privacy" aria-labelledby="privacy-title">
          <div className="landing-privacy">
            <span className="personal-icon"><Lock size={22} strokeWidth={1.5} aria-hidden /></span>
            <div>
              <p className="personal-kicker">{t('landing.privacyKicker')}</p>
              <h2 id="privacy-title">{t('landing.privacyTitle')}</h2>
              <ul>{promises.map(p => <li key={p}><ShieldCheck size={15} aria-hidden />{t(p)}</li>)}</ul>
              <a href="/privacy">{t('landing.privacyLink')}</a>
            </div>
          </div>
        </section>

        <section className="landing-final">
          <h2>{t('landing.finalTitle')}</h2>
          <p>{t('landing.finalText')}</p>
          {cta(t('landing.finalCta'))}
        </section>
      </main>

      <footer className="home-footer landing-footer">
        <img src="/brand/magent-symbol.webp" alt="" className="footer-symbol" />
        <p>{t('common.footer')}</p>
        <span><a href="/privacy">{t('common.privacy')}</a> · {t('common.footerMeta')}</span>
      </footer>
    </div>
  );
}
