import type { Locale } from './localization';

const STORAGE_KEY = 'skala-locale';

export function resolveInitialLocale(saved: string | null, languages: readonly string[]): Locale {
  if (saved === 'sk' || saved === 'cs' || saved === 'en' || saved === 'uk') return saved;
  // Use only the preferred browser language, not secondary fallback languages.
  const preferred = languages[0]?.toLowerCase().split(/[-_]/)[0];
  return preferred === 'cs' ? 'cs' : 'sk';
}

export function readInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'sk';
  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Browser language detection still works when storage is blocked.
  }
  const languages = window.navigator.languages?.length
    ? window.navigator.languages
    : [window.navigator.language];
  return resolveInitialLocale(saved, languages);
}

export function saveLocalePreference(locale: Locale): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // The caller keeps the selected language in state for this visit.
  }
}
