import { writeFile } from 'node:fs/promises';
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

const siteUrl = `${parsedUrl.origin}/`;
const escapeXml = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${escapeXml(siteUrl)}</loc>\n  </url>\n</urlset>\n`;
const robots = [
  'User-agent: *',
  'Allow: /',
  'Disallow: /admin',
  'Disallow: /sign-in',
  'Disallow: /sign-up',
  `Sitemap: ${siteUrl}sitemap.xml`,
  '',
].join('\n');

const publicDir = resolve(import.meta.dirname, '../dist/public');
await Promise.all([
  writeFile(resolve(publicDir, 'sitemap.xml'), sitemap, 'utf8'),
  writeFile(resolve(publicDir, 'robots.txt'), robots, 'utf8'),
]);
console.log(`[seo] Generated sitemap.xml for ${siteUrl}`);
