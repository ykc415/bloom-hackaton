'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { locales, useI18n, type Locale } from '@/lib/i18n';

const labels: Record<Locale, string> = { ko: 'KO', en: 'EN', ja: 'JA' };
const names: Record<Locale, string> = { ko: '한국어', en: 'English', ja: '日本語' };

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="lang-switcher" ref={ref}>
      <button type="button" className="lang-button" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label={t('lang.label')}>
        {labels[locale]}{open ? <ChevronUp size={15} aria-hidden /> : <ChevronDown size={15} aria-hidden />}
      </button>
      {open && (
        <ul className="lang-menu" role="listbox" aria-label={t('lang.label')}>
          {locales.map(l => (
            <li key={l}>
              <button type="button" role="option" aria-selected={l === locale} className={l === locale ? 'active' : ''} title={names[l]} onClick={() => { setLocale(l); setOpen(false); }}>
                {labels[l]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
