import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import searchContent from '../src/lib/searchContent.json' with { type: 'json' };

const configuredSiteUrl = process.env.VITE_PUBLIC_SITE_URL?.trim();
if (!configuredSiteUrl) {
  console.warn(
    '[seo] VITE_PUBLIC_SITE_URL is unset; absolute sitemap.xml will be generated after the published site URL is configured.',
  );
  process.exit(0);
}

const parsedUrl = new URL(configuredSiteUrl);
if (parsedUrl.protocol !== 'https:' || parsedUrl.pathname !== '/' || parsedUrl.search || parsedUrl.hash) {
  throw new Error('VITE_PUBLIC_SITE_URL must be an HTTPS site origin, for example https://skala.sk');
}

const configuredBasePath = process.env.BASE_PATH?.trim();
if (
  !configuredBasePath ||
  !configuredBasePath.startsWith('/') ||
  configuredBasePath.startsWith('//') ||
  /[?#]/.test(configuredBasePath) ||
  configuredBasePath.split('/').includes('..')
) {
  throw new Error('BASE_PATH must be an absolute site path, for example / or /stone-washbasins/.');
}

const basePath = configuredBasePath === '/'
  ? ''
  : `/${configuredBasePath.split('/').filter(Boolean).join('/')}`;
const siteUrl = new URL(`${basePath || ''}/`, parsedUrl.origin).href;
const escapeXml = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${escapeXml(siteUrl)}</loc>\n  </url>\n</urlset>\n`;
const robots = [
  'User-agent: *',
  'Allow: /',
  `Disallow: ${basePath}/admin`,
  `Disallow: ${basePath}/sign-in`,
  `Disallow: ${basePath}/sign-up`,
  `Sitemap: ${siteUrl}sitemap.xml`,
  '',
].join('\n');

const publicDir = resolve(import.meta.dirname, '../dist/public');
const indexPath = resolve(publicDir, 'index.html');
let html = await readFile(indexPath, 'utf8');
const socialImageUrl = new URL(`${basePath || ''}/images/og-skala.webp`, parsedUrl.origin).href;
const logoUrl = new URL(`${basePath || ''}/logo.svg`, parsedUrl.origin).href;
const copy = searchContent.sk;
const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}#organization`,
      name: 'SKALA',
      url: siteUrl,
      description: 'Luxusné kamenné umývadlá z mramoru, granitu, labradoritu a pieskovca. Vyrábame aj na objednávku.',
      logo: logoUrl,
      sameAs: ['https://www.instagram.com/skala_sk_/'],
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}#website`,
      url: siteUrl,
      name: copy.title,
      description: copy.description,
      inLanguage: 'sk-SK',
      publisher: { '@id': `${siteUrl}#organization` },
    },
    {
      '@type': 'FAQPage',
      '@id': `${siteUrl}#vyber-umyvadla`,
      url: `${siteUrl}#vyber-umyvadla`,
      inLanguage: 'sk-SK',
      mainEntity: copy.questions.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    },
  ],
};
html = html.replace(
  /(<script id="skala-seo-schema" type="application\/ld\+json">)[\s\S]*?(<\/script>)/,
  (_, open, close) => `${open}${JSON.stringify(schema).replaceAll('<', '\\u003c')}${close}`,
);
html = html.replace(
  '<head>',
  `<head>\n    <link rel="canonical" href="${siteUrl}" />\n    <meta property="og:url" content="${siteUrl}" />`,
);
html = html
  .replaceAll(`content="${basePath}/images/og-skala.webp"`, `content="${socialImageUrl}"`)
  .replaceAll(`content="/images/og-skala.webp"`, `content="${socialImageUrl}"`)
  .replaceAll(`href="${basePath}/logo.svg"`, `href="${logoUrl}"`)
  .replaceAll('href="/logo.svg"', `href="${logoUrl}"`);
await Promise.all([
  writeFile(indexPath, html, 'utf8'),
  writeFile(resolve(publicDir, 'sitemap.xml'), sitemap, 'utf8'),
  writeFile(resolve(publicDir, 'robots.txt'), robots, 'utf8'),
]);
console.log(`[seo] Generated sitemap.xml for ${siteUrl}`);
