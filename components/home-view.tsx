'use client';

import type { ReactNode } from 'react';
import {
  ArrowRight, ArrowUpRight, Baby, Bike, BookOpen, Brain, Camera, Car, Check, Coffee, Dog, Dumbbell, Flower2, Footprints, Gamepad2, Gem, Gift, Headphones, House,
  Lamp, Laptop, Leaf, Luggage, Mail, Music, Palette, PawPrint, Plane, RefreshCw, Shirt, ShieldCheck, ShoppingBag, Sparkles, Tent, UtensilsCrossed, Watch, Wine,
  type LucideIcon,
} from 'lucide-react';
import { useI18n, type MessageKey } from '@/lib/i18n';
import type { Fact, HomeContent, HomeIcon } from '@/lib/types';

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

const icons: Record<HomeIcon, LucideIcon> = {
  shirt: Shirt, shoe: Footprints, sparkles: Sparkles, lamp: Lamp, headphones: Headphones, coffee: Coffee, dumbbell: Dumbbell, gift: Gift, baby: Baby,
  dog: Dog, book: BookOpen, gamepad: Gamepad2, plane: Plane, utensils: UtensilsCrossed, watch: Watch, bag: ShoppingBag, luggage: Luggage, leaf: Leaf,
  music: Music, camera: Camera, bike: Bike, paw: PawPrint, house: House, laptop: Laptop, gem: Gem, palette: Palette, tent: Tent, wine: Wine, flower: Flower2, car: Car,
};

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
  personalized: HomeContent | null;
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

function PersonalCard({ gmailEmail, gmailChecked, sync, summary, facts, orders, ready, onConnect, onPicks, onSync, onMemory, onPrompt }: Omit<Props, 'composer' | 'disabled' | 'personalized'>) {
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

export function HomeView({ composer, disabled, personalized, ...personal }: Props) {
  const { t } = useI18n();
  const { onPrompt } = personal;
  const k = (key: string) => t(key as MessageKey);
  // Personalized shortcuts when memory allows it; otherwise the default starting points.
  const chips = personalized
    ? personalized.prompts.map(p => ({ Icon: icons[p.icon] ?? Sparkles, text: p.text }))
    : prompts.map(p => ({ Icon: p.icon, text: t(p.text) }));
  const cards = personalized
    ? personalized.categories.map(c => ({ Icon: icons[c.icon] ?? Sparkles, name: c.name, description: c.description, prompt: c.prompt }))
    : categories.map(({ icon, n }) => ({ Icon: icon, name: k(`home.cat${n}Name`), description: k(`home.cat${n}Text`), prompt: k(`home.cat${n}Prompt`) }));
  const tiers = personalized
    ? personalized.budgets.map((b, i) => ({ ...b, usual: i === personalized.usualTier }))
    : budgets.map(n => ({ label: k(`home.budget${n}Label`), title: k(`home.budget${n}Title`), text: k(`home.budget${n}Text`), note: k(`home.budget${n}Note`), prompt: k(`home.budget${n}Prompt`), usual: n === 2 }));
  return (
    <>
      <section className="home-hero">
        <div className="hero-kicker"><span /><span>{t('home.kicker')}</span></div>
        <h1>{t('home.title')}</h1>
        <p>{t('home.lede1')}<br className="desktop-break" /> {t('home.lede2')}</p>
        {composer}
        <div className="composer-hint"><span>{t('home.hint')}</span><span><kbd>↵</kbd> {t('home.hintEnter')}</span></div>
        <div className="prompt-chips">
          {chips.map(({ Icon, text }) => (
            <button type="button" key={text} disabled={disabled} onClick={() => onPrompt(text)}><Icon size={14} aria-hidden />{text}<ArrowUpRight size={13} aria-hidden /></button>
          ))}
        </div>
      </section>

      <section className="home-section" id="personal" aria-labelledby="personal-title">
        <SectionHeading id="personal-title" title={t('home.personalTitle')} text={t('home.personalText')} label={t('home.personalLabel')} />
        <PersonalCard {...personal} />
      </section>

      <section className="home-section" aria-labelledby="style-title">
        <SectionHeading
          id="style-title"
          title={personalized ? t('home.styleTitleMine') : t('home.styleTitle')}
          text={personalized ? t('home.styleTextMine') : t('home.styleText')}
          label={personalized ? t('home.styleLabelMine') : t('home.styleLabel')}
        />
        <div className="category-grid">
          {cards.map(({ Icon, name, description, prompt }) => (
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
        <SectionHeading
          id="budget-title"
          title={personalized ? t('home.budgetTitleMine') : t('home.budgetTitle')}
          text={personalized ? t('home.budgetTextMine') : t('home.budgetText')}
          label={t('home.budgetLabel')}
        />
        <div className="budget-grid">
          {tiers.map(tier => (
            <button type="button" className={`budget-card${tier.usual ? ' accent' : ''}`} key={tier.title} disabled={disabled} onClick={() => onPrompt(tier.prompt)}>
              <span className="budget-label">{tier.label}{personalized && tier.usual && <em className="usual-pill">{t('home.usualTier')}</em>}</span>
              <ArrowUpRight size={15} className="card-arrow" aria-hidden />
              <strong>{tier.title}</strong>
              <span className="budget-text">{tier.text}</span>
              <span className="budget-note">{tier.note}</span>
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
