import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'node:test';
import copy from '../src/lib/searchContent.json' with { type: 'json' };

const project = resolve(import.meta.dirname, '..');

for (const basePath of ['/', '/stone-washbasins/']) {
  test(`SEO files use absolute published URLs at ${basePath}`, async () => {
    const fixture = await mkdtemp(resolve(tmpdir(), 'skala-seo-'));
    try {
      await Promise.all(['scripts', 'src/lib', 'dist/public'].map((path) => mkdir(resolve(fixture, path), { recursive: true })));
      await copyFile(resolve(project, 'scripts/generate-seo-files.mjs'), resolve(fixture, 'scripts/generate-seo-files.mjs'));
      await copyFile(resolve(project, 'src/lib/searchContent.json'), resolve(fixture, 'src/lib/searchContent.json'));
      const source = await readFile(resolve(project, 'index.html'), 'utf8');
      const input = source.replaceAll('content="/images/', `content="${basePath}images/`).replace('href="/logo.svg"', `href="${basePath}logo.svg"`);
      await writeFile(resolve(fixture, 'dist/public/index.html'), input);
      const origin = 'https://skala.example';
      execFileSync(process.execPath, [resolve(fixture, 'scripts/generate-seo-files.mjs')], {
        env: { ...process.env, VITE_PUBLIC_SITE_URL: origin, BASE_PATH: basePath },
      });
      const html = await readFile(resolve(fixture, 'dist/public/index.html'), 'utf8');
      const robots = await readFile(resolve(fixture, 'dist/public/robots.txt'), 'utf8');
      const sitemap = await readFile(resolve(fixture, 'dist/public/sitemap.xml'), 'utf8');
      const url = `${origin}${basePath}`;
      assert.ok(html.includes(`rel="canonical" href="${url}"`));
      assert.ok(html.includes(`property="og:url" content="${url}"`));
      assert.ok(html.includes(`content="${url}images/og-skala.webp"`));
      assert.ok(html.includes(`href="${url}logo.svg"`));
      assert.ok(sitemap.includes(`<loc>${url}</loc>`));
      assert.ok(robots.includes(`Sitemap: ${url}sitemap.xml`));
      assert.ok(robots.includes(`Disallow: ${basePath}admin`));
      const schema = JSON.parse(html.match(/<script id="skala-seo-schema" type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
      const website = schema['@graph'].find((node) => node['@type'] === 'WebSite');
      assert.equal(website.url, url);
      assert.equal(website.inLanguage, 'sk-SK');
      assert.equal(website.name, copy.sk.title);
      assert.ok(html.includes(`<title>${copy.sk.title}</title>`));
      assert.ok(html.includes(`name="description" content="${copy.sk.description}"`));
      const faq = schema['@graph'].find((node) => node['@type'] === 'FAQPage');
      assert.deepEqual(faq.mainEntity.map((item) => [item.name, item.acceptedAnswer.text]), copy.sk.questions.map((item) => [item.question, item.answer]));
      assert.ok(html.includes('<div id="root"></div>'), 'no visible SEO fallback before React mounts');
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  });
}

test('all supported locales have complete buyer guidance and metadata', () => {
  for (const locale of ['sk', 'cs', 'en', 'uk']) {
    assert.deepEqual(Object.keys(copy[locale]).sort(), Object.keys(copy.sk).sort());
    for (const value of Object.values(copy[locale])) {
      if (typeof value === 'string') assert.ok(value.trim().length > 0);
    }
    assert.equal(copy[locale].questions.length, 3);
    for (const item of copy[locale].questions) {
      assert.ok(item.question.length > 10);
      assert.ok(item.answer.length > 100);
    }
  }
});
