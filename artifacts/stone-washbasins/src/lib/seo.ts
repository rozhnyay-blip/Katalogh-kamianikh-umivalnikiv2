const siteDescription =
  'Objavte luxusné kamenné umývadlá z prírodného kameňa SKALA. Ručne opracované solitéry pre výnimočné kúpeľne, každý kus s jedinečným tvarom a kresbou.';
const siteName = 'Luxusné kamenné umývadlá z prírodného kameňa | SKALA';

function setMeta(selector: string, value: string): void {
  const tag = document.querySelector<HTMLMetaElement>(selector);
  if (tag) tag.content = value;
}

export function applySeoMetadata(): void {
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

  document.documentElement.lang = 'sk';
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) canonical.href = canonicalUrl;

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
          description: 'Ručne opracované luxusné umývadlá z prírodného kameňa.',
          logo: logoUrl,
          sameAs: ['https://www.instagram.com/skala_sk_/'],
        },
        {
          '@type': 'WebSite',
          '@id': `${canonicalUrl}#website`,
          url: canonicalUrl,
          name: siteName,
          description: siteDescription,
          inLanguage: 'sk-SK',
          publisher: { '@id': `${canonicalUrl}#organization` },
        },
      ],
    });
  }
}
