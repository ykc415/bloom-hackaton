'use client';

import type { ReactNode } from 'react';
import { ArrowRight, ArrowUpRight, Brain, Check, Footprints, Gift, Headphones, Lamp, Luggage, Mail, RefreshCw, Shirt, ShieldCheck, Sparkles } from 'lucide-react';
import { useI18n, type MessageKey } from '@/lib/i18n';
import type { Fact } from '@/lib/types';

const prompts = [
  { icon: Luggage, text: 'home.prompt1' },
  { icon: Footprints, text: 'home.prompt2' },
  { icon: Gift, text: 'home.prompt3' },
] as const;

const categories = [
  { icon: Shirt, n: 1 },
  { icon: Sparkles, n: 2 },
  { icon: Lamp, n: 3 },
  { icon: Headphones, n: 4 },
] as const;

const budgets = [1, 2, 3] as const;
const tryAsking = ['personal.try1', 'personal.try2', 'personal.try3'] as const;

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
  ready: { orders: number } | null;
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

function FactChips({ facts }: { facts: Fact[] }) {
  return (
    <div className="fact-chips">
      {facts.slice(0, 6).map(f => <span key={f.key} title={f.evidence}><b>{f.title}</b>{f.text}</span>)}
    </div>
  );
}

function PersonalCard({ gmailEmail, gmailChecked, sync, summary, facts, orders, ready, onConnect, onPicks, onSync, onMemory, onPrompt }: Omit<Props, 'composer' | 'disabled'>) {
  const { t, tc } = useI18n();
  if (sync) {
    return (
      <div className="personal-card" aria-live="polite">
        <span className="personal-icon syncing"><RefreshCw size={22} strokeWidth={1.5} className="spin" aria-hidden /></span>
        <div className="personal-copy">
          <p className="personal-kicker">{t('personal.readingKicker')}</p>
          <h3>{sync.status}</h3>
          {sync.merchants.length > 0 && (
            <>
              <p>{t('personal.found', { count: sync.emails })}</p>
              <div className="merchant-chips">{sync.merchants.map(name => <span key={name}>{name}</span>)}</div>
            </>
          )}
        </div>
      </div>
    );
  }
  if (gmailEmail && facts.length && ready) {
    return (
      <div className="personal-card profile ready" role="status">
        <span className="personal-icon done"><Check size={24} strokeWidth={2} aria-hidden /></span>
        <div className="personal-copy">
          <p className="personal-kicker">{tc('personal.readyKicker', ready.orders)}</p>
          <h3>{t('personal.readyTitle')}</h3>
          {summary && <p>{summary}</p>}
          <FactChips facts={facts} />
          <p className="ready-try">{t('personal.tryAsking')}</p>
          <div className="ready-prompts">
            {tryAsking.map(key => <button type="button" key={key} onClick={() => onPrompt(t(key))}>{t(key)}<ArrowUpRight size={13} aria-hidden /></button>)}
          </div>
          <div className="personal-actions">
            <button type="button" className="primary-button" onClick={onPicks}>{t('personal.showPicks')} <ArrowRight size={16} aria-hidden /></button>
            <button type="button" className="secondary-button" onClick={onMemory}>{t('personal.review')}</button>
          </div>
        </div>
      </div>
    );
  }
  if (gmailEmail && facts.length) {
    return (
      <div className="personal-card profile">
        <span className="personal-icon"><Brain size={22} strokeWidth={1.5} aria-hidden /></span>
        <div className="personal-copy">
          <p className="personal-kicker">{t('personal.profileKicker')}{orders ? tc('personal.profileFrom', orders) : ''}</p>
          <h3>{summary ?? t('personal.profileDefault')}</h3>
          <FactChips facts={facts} />
          <div className="personal-actions">
            <button type="button" className="primary-button" onClick={onPicks}>{t('personal.showPicks')} <ArrowRight size={16} aria-hidden /></button>
            <button type="button" className="secondary-button" onClick={onMemory}>{t('personal.openMemory')}</button>
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
          <p className="personal-kicker">{t('personal.connectedKicker', { email: gmailEmail })}</p>
          <h3>{t('personal.noOrdersTitle')}</h3>
          <p>{t('personal.noOrdersText')}</p>
          <div className="personal-actions"><button type="button" className="secondary-button" onClick={onSync}><RefreshCw size={15} aria-hidden /> {t('personal.checkAgain')}</button></div>
        </div>
      </div>
    );
  }
  return (
    <div className="personal-card">
      <span className="personal-icon"><Mail size={22} strokeWidth={1.5} aria-hidden /></span>
      <div className="personal-copy">
        <p className="personal-kicker">{t('personal.skipKicker')}</p>
        <h3>{t('personal.skipTitle')}</h3>
        <p>{t('personal.skipText')}</p>
        <p className="privacy-line"><ShieldCheck size={14} aria-hidden /> {t('personal.privacy')}</p>
        <div className="personal-actions">
          <button type="button" className="primary-button" onClick={onConnect} disabled={!gmailChecked}>{t('common.connectGmail')} <ArrowRight size={16} aria-hidden /></button>
        </div>
      </div>
      <div className="personal-preview" aria-hidden>
        <p>{t('personal.previewTitle')}</p>
        <span><b>{t('personal.previewBrands')}</b>{t('personal.previewBrandsValue')}</span>
        <span><b>{t('personal.previewSizes')}</b>{t('personal.previewSizesValue')}</span>
        <span><b>{t('personal.previewBudget')}</b>{t('personal.previewBudgetValue')}</span>
        <span><b>{t('personal.previewStyle')}</b>{t('personal.previewStyleValue')}</span>
      </div>
    </div>
  );
}

export function HomeView({ composer, disabled, ...personal }: Props) {
  const { t } = useI18n();
  const { onPrompt } = personal;
  const k = (key: string) => t(key as MessageKey);
  return (
    <>
      <section className="home-hero">
        <div className="hero-kicker"><span /><span>{t('home.kicker')}</span></div>
        <h1>{t('home.title')}</h1>
        <p>{t('home.lede1')}<br className="desktop-break" /> {t('home.lede2')}</p>
        {composer}
        <div className="composer-hint"><span>{t('home.hint')}</span><span><kbd>↵</kbd> {t('home.hintEnter')}</span></div>
        <div className="prompt-chips">
          {prompts.map(({ icon: Icon, text }) => (
            <button type="button" key={text} disabled={disabled} onClick={() => onPrompt(t(text))}><Icon size={14} aria-hidden />{t(text)}<ArrowUpRight size={13} aria-hidden /></button>
          ))}
        </div>
      </section>

      <section className="home-section" id="personal" aria-labelledby="personal-title">
        <SectionHeading id="personal-title" title={t('home.personalTitle')} text={t('home.personalText')} label={t('home.personalLabel')} />
        <PersonalCard {...personal} />
      </section>

      <section className="home-section" aria-labelledby="style-title">
        <SectionHeading id="style-title" title={t('home.styleTitle')} text={t('home.styleText')} label={t('home.styleLabel')} />
        <div className="category-grid">
          {categories.map(({ icon: Icon, n }) => (
            <button type="button" className="category-card" key={n} disabled={disabled} onClick={() => onPrompt(k(`home.cat${n}Prompt`))}>
              <Icon size={24} strokeWidth={1.5} aria-hidden />
              <ArrowUpRight size={15} className="card-arrow" aria-hidden />
              <strong>{k(`home.cat${n}Name`)}</strong>
              <span>{k(`home.cat${n}Text`)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="home-section" aria-labelledby="budget-title">
        <SectionHeading id="budget-title" title={t('home.budgetTitle')} text={t('home.budgetText')} label={t('home.budgetLabel')} />
        <div className="budget-grid">
          {budgets.map(n => (
            <button type="button" className={`budget-card${n === 2 ? ' accent' : ''}`} key={n} disabled={disabled} onClick={() => onPrompt(k(`home.budget${n}Prompt`))}>
              <span className="budget-label">{k(`home.budget${n}Label`)}</span>
              <ArrowUpRight size={15} className="card-arrow" aria-hidden />
              <strong>{k(`home.budget${n}Title`)}</strong>
              <span className="budget-text">{k(`home.budget${n}Text`)}</span>
              <span className="budget-note">{k(`home.budget${n}Note`)}</span>
            </button>
          ))}
        </div>
      </section>

      <footer className="home-footer">
        <img src="/brand/magent-symbol.webp" alt="" className="footer-symbol" />
        <p>{t('common.footer')}</p>
        <span>{t('common.footerMeta')}</span>
      </footer>
    </>
  );
}
