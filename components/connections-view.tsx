'use client';

import { useState } from 'react';
import { BellRing, Brain, Check, ChevronRight, Lock, Plus, Search, TrendingDown } from 'lucide-react';
import { useI18n, type Locale } from '@/lib/i18n';

type Category = 'email' | 'us' | 'kr' | 'jp' | 'pay' | 'taste';
type Service = { id: string; name: string; domain: string; category: Category; color: string; desc: Record<Locale, string>; icon?: string };

// UI preview for upcoming integrations. Only Gmail is wired up today.
const services: Service[] = [
  { id: 'gmail', name: 'Gmail', domain: 'mail.google.com', icon: 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico', category: 'email', color: '#ea4335', desc: { en: 'Learn your taste from order emails', ko: '주문 메일에서 취향 배우기', ja: '注文メールから好みを学ぶ' } },
  { id: 'gcal', name: 'Google Calendar', domain: 'calendar.google.com', icon: 'https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_31_2x.png', category: 'email', color: '#1a73e8', desc: { en: 'Remember birthdays and events for gift ideas', ko: '생일과 일정에 맞춰 선물 아이디어 받기', ja: '誕生日や予定に合わせてギフトを提案' } },
  { id: 'outlook', name: 'Outlook', domain: 'outlook.live.com', category: 'email', color: '#0a64ad', desc: { en: 'Order emails from Outlook', ko: '아웃룩 주문 메일 읽기', ja: 'Outlookの注文メールを読む' } },
  { id: 'amazon', name: 'Amazon', domain: 'amazon.com', category: 'us', color: '#ff9900', desc: { en: 'Order history, deliveries and reorders', ko: '주문 내역, 배송 확인, 재주문', ja: '注文履歴、配送確認、再注文' } },
  { id: 'walmart', name: 'Walmart', domain: 'walmart.com', category: 'us', color: '#0071ce', desc: { en: 'Orders, pickups and price checks', ko: '주문, 픽업, 가격 확인', ja: '注文、店舗受け取り、価格チェック' } },
  { id: 'target', name: 'Target', domain: 'target.com', category: 'us', color: '#cc0000', desc: { en: 'Orders, Circle deals and pickups', ko: '주문, Circle 할인, 픽업', ja: '注文、Circleのお得情報、受け取り' } },
  { id: 'costco', name: 'Costco', domain: 'costco.com', category: 'us', color: '#e31837', desc: { en: 'Warehouse orders and member deals', ko: '창고형 매장 주문과 회원 할인', ja: '倉庫店の注文と会員限定セール' } },
  { id: 'bestbuy', name: 'Best Buy', domain: 'bestbuy.com', category: 'us', color: '#0046be', desc: { en: 'Electronics orders and price tracking', ko: '전자제품 주문과 가격 추적', ja: '家電の注文と価格追跡' } },
  { id: 'ebay', name: 'eBay', domain: 'ebay.com', category: 'us', color: '#e53238', desc: { en: 'Watch items and track bids', ko: '관심 상품과 입찰 확인', ja: 'ウォッチ中の商品と入札を確認' } },
  { id: 'etsy', name: 'Etsy', domain: 'etsy.com', category: 'us', color: '#f1641e', desc: { en: 'Favorite shops and handmade finds', ko: '즐겨찾는 샵과 핸드메이드 아이템', ja: 'お気に入りショップとハンドメイド品' } },
  { id: 'nike', name: 'Nike', domain: 'nike.com', category: 'us', color: '#111111', desc: { en: 'Orders, sizes and member drops', ko: '주문, 사이즈, 멤버 전용 발매', ja: '注文、サイズ、メンバー限定発売' } },
  { id: 'sephora', name: 'Sephora', domain: 'sephora.com', category: 'us', color: '#000000', desc: { en: 'Beauty orders and Beauty Insider points', ko: '뷰티 주문과 Beauty Insider 포인트', ja: 'コスメの注文とBeauty Insiderポイント' } },
  { id: 'instacart', name: 'Instacart', domain: 'instacart.com', category: 'us', color: '#43b02a', desc: { en: 'Grocery orders and restocks', ko: '장보기 주문과 재구매', ja: '食料品の注文と買い足し' } },
  { id: 'coupang', name: 'Coupang', domain: 'coupang.com', category: 'kr', color: '#e52528', desc: { en: 'Orders, Rocket delivery and reorders', ko: '주문 내역과 로켓배송 확인, 재주문', ja: '注文履歴、ロケット配送、再注文' } },
  { id: 'musinsa', name: 'Musinsa', domain: 'musinsa.com', category: 'kr', color: '#000000', desc: { en: 'Fashion orders, sizes and sale alerts', ko: '옷 주문과 배송 확인, 세일 알림', ja: '服の注文、サイズ、セール通知' } },
  { id: 'oliveyoung', name: 'Olive Young', domain: 'oliveyoung.co.kr', category: 'kr', color: '#9bce26', desc: { en: 'Beauty orders, delivery and sales', ko: '화장품 주문과 배송, 세일 확인', ja: 'コスメの注文、配送、セール' } },
  { id: 'kurly', name: 'Kurly', domain: 'kurly.com', category: 'kr', color: '#5f0080', desc: { en: 'Grocery orders and dawn delivery', ko: '장보기 주문하기, 새벽배송 확인', ja: '食料品の注文と早朝配送' } },
  { id: '11st', name: '11st', domain: '11st.co.kr', category: 'kr', color: '#ff0038', desc: { en: 'Orders, deliveries and product search', ko: '주문 내역과 배송 조회, 상품 검색', ja: '注文履歴、配送状況、商品検索' } },
  { id: 'ssg', name: 'SSG.COM', domain: 'ssg.com', category: 'kr', color: '#ff5452', desc: { en: 'Groceries, orders and delivery', ko: '장보기와 주문, 배송 확인', ja: '食料品、注文、配送確認' } },
  { id: 'rakuten', name: 'Rakuten', domain: 'rakuten.co.jp', category: 'jp', color: '#bf0000', desc: { en: 'Orders, points and favorite shops', ko: '주문, 포인트, 즐겨찾는 샵', ja: '注文、ポイント、お気に入りショップ' } },
  { id: 'zozo', name: 'ZOZOTOWN', domain: 'zozo.jp', category: 'jp', color: '#000000', desc: { en: 'Fashion orders and sizes', ko: '패션 주문과 사이즈', ja: 'ファッションの注文とサイズ' } },
  { id: 'mercari', name: 'Mercari', domain: 'jp.mercari.com', category: 'jp', color: '#ff333f', desc: { en: 'Buy and sell secondhand items', ko: '중고 물건 사고팔기', ja: '中古品の売り買い' } },
  { id: 'amazonjp', name: 'Amazon Japan', domain: 'amazon.co.jp', category: 'jp', color: '#ff9900', desc: { en: 'Orders and deliveries in Japan', ko: '일본 아마존 주문과 배송', ja: 'Amazon.co.jpの注文と配送' } },
  { id: 'paypal', name: 'PayPal', domain: 'paypal.com', category: 'pay', color: '#003087', desc: { en: 'Receipts from every store you pay with PayPal', ko: 'PayPal로 결제한 모든 쇼핑몰의 영수증', ja: 'PayPalで支払ったすべてのショップの領収書' } },
  { id: 'applewallet', name: 'Apple Wallet', domain: 'apple.com', category: 'pay', color: '#000000', desc: { en: 'Card receipts and order tracking', ko: '카드 결제 내역과 주문 추적', ja: 'カードの利用明細と注文追跡' } },
  { id: 'klarna', name: 'Klarna', domain: 'klarna.com', category: 'pay', color: '#ffb3c7', desc: { en: 'Pay-later purchases and returns', ko: '나중 결제 구매와 반품', ja: '後払いの購入と返品' } },
  { id: 'pinterest', name: 'Pinterest', domain: 'pinterest.com', category: 'taste', color: '#e60023', desc: { en: 'Boards that show your style', ko: '내 스타일이 담긴 보드', ja: 'あなたのスタイルが分かるボード' } },
  { id: 'instagram', name: 'Instagram', domain: 'instagram.com', category: 'taste', color: '#d62976', desc: { en: 'Saved posts and shops you follow', ko: '저장한 게시물과 팔로우한 샵', ja: '保存した投稿とフォロー中のショップ' } },
];

const filters: (Category | 'all' | 'connected')[] = ['all', 'email', 'us', 'kr', 'jp', 'pay', 'taste'];

function ServiceIcon({ service }: { service: Service }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="service-icon" style={failed ? { background: service.color, color: '#fff' } : undefined}>
      {failed
        ? service.name[0]
        : <img src={service.icon ?? `https://www.google.com/s2/favicons?domain=${service.domain}&sz=128`} alt="" loading="lazy" onError={() => setFailed(true)} />}
    </span>
  );
}

type Props = { gmailEmail: string | null; onConnectGmail: () => void; onToast: (message: string) => void };

export function ConnectionsView({ gmailEmail, onConnectGmail, onToast }: Props) {
  const { t, locale } = useI18n();
  const [filter, setFilter] = useState<(typeof filters)[number]>('all');
  const [query, setQuery] = useState('');
  const isConnected = (s: Service) => s.id === 'gmail' && !!gmailEmail;
  const connected = services.filter(isConnected);
  const q = query.trim().toLowerCase();
  const visible = services.filter(s =>
    (filter === 'all' || (filter === 'connected' ? isConnected(s) : s.category === filter))
    && (!q || `${s.name} ${s.desc[locale]}`.toLowerCase().includes(q)));

  const builtins = [
    { icon: Search, title: t('connections.b1Title'), text: t('connections.b1Text') },
    { icon: TrendingDown, title: t('connections.b2Title'), text: t('connections.b2Text') },
    { icon: BellRing, title: t('connections.b3Title'), text: t('connections.b3Text') },
    { icon: Brain, title: t('connections.b4Title'), text: t('connections.b4Text') },
  ];

  return (
    <div className="connections">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t('connections.kicker')}</p>
          <h1>{t('connections.title')}<span>.</span></h1>
          <p>{t('connections.lede')}</p>
        </div>
        <button type="button" className="secondary-button" onClick={() => onToast(t('connections.requested'))}><Plus size={16} aria-hidden /> {t('connections.request')}</button>
      </div>

      <div className="secure-card">
        <span><Lock size={20} strokeWidth={1.6} aria-hidden /></span>
        <div><strong>{t('connections.secureTitle')}</strong><p>{t('connections.secureText')}</p></div>
      </div>

      <div className="service-filters" role="tablist">
        {filters.map(f => (
          <button type="button" role="tab" key={f} aria-selected={filter === f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {t(`connections.${f}`)}
          </button>
        ))}
      </div>

      <div className="service-panel">
        <button type="button" className="connected-row" onClick={() => setFilter(filter === 'connected' ? 'all' : 'connected')}>
          <strong>{t('connections.connected')}</strong>
          <span className="connected-icons">{connected.map(s => <ServiceIcon key={s.id} service={s} />)}</span>
          <span className="connected-count">{connected.length}</span>
          <ChevronRight size={16} aria-hidden />
        </button>
        {visible.length ? (
          <ul className="service-list">
            {visible.map(s => (
              <li key={s.id}>
                <ServiceIcon service={s} />
                <div><strong>{s.name}</strong><p>{s.desc[locale]}</p></div>
                {isConnected(s)
                  ? <span className="service-connected"><Check size={14} aria-hidden /> {t('connections.connected')}</span>
                  : s.id === 'gmail'
                    ? <button type="button" className="primary-button service-connect" onClick={onConnectGmail}>{t('connections.connect')}</button>
                    : <button type="button" className="service-add" aria-label={t('connections.add', { name: s.name })} onClick={() => onToast(t('connections.soon', { name: s.name }))}><Plus size={18} /></button>}
              </li>
            ))}
          </ul>
        ) : <p className="service-empty">{t('connections.noResults', { query: query.trim() })}</p>}
      </div>

      <section className="builtin-section">
        <h2>{t('connections.builtinTitle')}</h2>
        <p>{t('connections.builtinText')}</p>
        <ul className="service-list builtin">
          {builtins.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <span className="service-icon builtin-icon"><Icon size={20} strokeWidth={1.6} aria-hidden /></span>
              <div><strong>{title}</strong><p>{text}</p></div>
              <span className="service-connected"><Check size={14} aria-hidden /></span>
            </li>
          ))}
        </ul>
      </section>

      <label className="service-search">
        <Search size={18} aria-hidden />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('connections.search')} aria-label={t('connections.search')} />
      </label>
    </div>
  );
}
