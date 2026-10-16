import searchContent from './searchContent.json';
import type { Locale } from './localization';

const languageTags: Record<Locale, string> = { sk: 'sk-SK', cs: 'cs-CZ', en: 'en', uk: 'uk-UA' };

function setMeta(selector: string, value: string): void {
  const tag = document.querySelector<HTMLMetaElement>(selector);
  if (tag) tag.content = value;
}

export function applySeoMetadata(locale: Locale = 'sk'): void {
  const copy = searchContent[locale];
  const siteName = copy.title;
  const siteDescription = copy.description;
  const configuredUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.trim();
  const siteOrigin = configuredUrl
    ? (() => {
        const url = new URL(configuredUrl);
        if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash) {
          throw new Error('VITE_PUBLIC_SITE_URL must be an HTTPS site origin, for example https://skala.sk');
        }
        return url.origin;
      })()
    : window.location.origin;
  const basePath = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  const canonicalUrl = new URL(`${basePath || ''}/`, siteOrigin).href;
  const socialImageUrl = new URL(`${basePath || ''}/images/og-skala.webp`, siteOrigin).href;
  const logoUrl = new URL(`${basePath || ''}/logo.svg`, siteOrigin).href;

  document.documentElement.lang = locale;
  document.title = siteName;
  setMeta('meta[name="description"]', siteDescription);
  setMeta('meta[property="og:title"]', siteName);
  setMeta('meta[property="og:description"]', siteDescription);
  setMeta('meta[property="og:locale"]', languageTags[locale].replace('-', '_'));
  setMeta('meta[name="twitter:title"]', siteName);
  setMeta('meta[name="twitter:description"]', siteDescription);
  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.append(canonical);
  }
  canonical.href = canonicalUrl;

  setMeta('meta[property="og:url"]', canonicalUrl);
  setMeta('meta[property="og:image"]', socialImageUrl);
  setMeta('meta[name="twitter:image"]', socialImageUrl);

  const schema = document.getElementById('skala-seo-schema');
  if (schema) {
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${canonicalUrl}#organization`,
          name: 'SKALA',
          url: canonicalUrl,
          description:
            'Luxusné kamenné umývadlá SKALA z mramoru, granitu (žuly), labradoritu a pieskovca. Vyrábame aj na objednávku.',
          logo: logoUrl,
          sameAs: ['https://www.instagram.com/skala_sk_/'],
        },
        {
          '@type': 'WebSite',
          '@id': `${canonicalUrl}#website`,
          url: canonicalUrl,
          name: siteName,
          description: siteDescription,
          inLanguage: languageTags[locale],
          publisher: { '@id': `${canonicalUrl}#organization` },
        },
        {
          '@type': 'FAQPage',
          '@id': `${canonicalUrl}#vyber-umyvadla`,
          url: `${canonicalUrl}#vyber-umyvadla`,
          inLanguage: languageTags[locale],
          mainEntity: copy.questions.map(({ question, answer }) => ({
            '@type': 'Question',
            name: question,
            acceptedAnswer: { '@type': 'Answer', text: answer },
          })),
        },
      ],
    });
  }
}
