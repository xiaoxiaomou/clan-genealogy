// LanguageSwitcher.tsx
import { useState } from 'react';
import { Languages, Check } from 'lucide-react';
import { useLocale, useT, SUPPORTED_LOCALES } from '../../i18n';

export function LanguageSwitcher() {
  const [locale, setLocale] = useLocale();
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 items-center gap-1.5 rounded-md border border-border/40 bg-background/60 px-2 text-xs transition-colors hover:bg-foreground/5"
        aria-label={t('common.search')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Languages className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="font-medium">
          {locale === 'zh-CN' ? '中' : 'EN'}
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} aria-hidden="true" />
          <ul
            role="listbox"
            className="absolute right-0 top-full z-30 mt-1 w-36 overflow-hidden rounded-md border border-border bg-card shadow-lg"
          >
            {SUPPORTED_LOCALES.map((l) => (
              <li key={l}>
                <button
                  role="option"
                  aria-selected={locale === l}
                  onClick={() => { setLocale(l); setOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-foreground/5"
                >
                  <span className="flex-1 text-left">
                    {t('language.' + l, l)}
                  </span>
                  {locale === l && <Check className="h-3 w-3 text-primary" aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
