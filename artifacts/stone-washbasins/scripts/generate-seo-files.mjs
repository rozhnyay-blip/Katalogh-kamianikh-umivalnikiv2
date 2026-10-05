import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

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
html = html.replace(
  '<head>',
  `<head>\n    <link rel="canonical" href="${siteUrl}" />\n    <meta property="og:url" content="${siteUrl}" />`,
);
html = html
  .replaceAll('content="/images/og-skala.webp"', `content="${socialImageUrl}"`)
  .replaceAll('href="/logo.svg"', `href="${logoUrl}"`);
await Promise.all([
  writeFile(indexPath, html, 'utf8'),
  writeFile(resolve(publicDir, 'sitemap.xml'), sitemap, 'utf8'),
  writeFile(resolve(publicDir, 'robots.txt'), robots, 'utf8'),
]);
console.log(`[seo] Generated sitemap.xml for ${siteUrl}`);
