import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CATALOG_SUMMARY_REFRESH_OPTIONS, parseEuroCents, summarizeCatalog } from '../src/lib/catalogSummary.ts';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import translations from '../src/lib/catalogSummaryCopy.json' with { type: 'json' };

test('EUR prices accept numeric, currency and European and English separators', () => {
  for (const price of ['1250', '1 250', '1\u00a0250', '1\u202f250', '1.250', '1,250', '1250 €', 'EUR 1250']) {
    assert.equal(parseEuroCents(price), 125000, price);
  }
  for (const price of ['1 250,50 €', '1.250,50 EUR', '1,250.50', '1250,50', '1250.50']) {
    assert.equal(parseEuroCents(price), 125050, price);
  }
  assert.equal(parseEuroCents('0 €'), 0);
  assert.equal(parseEuroCents('19,9'), 1990);
});

test('ambiguous or invalid prices are excluded rather than silently added', () => {
  for (const price of ['', 'dohodou', 'na vyžiadanie', 'od 190 €', '190–260 €', '-10', '100 USD', '1 2', '1,234,50', '1.250.50', '1,234.567', '999999999999999999']) {
    assert.equal(parseEuroCents(price), null, price);
  }
});

test('totals include every listing, use cents and follow changed product lists', () => {
  const products = ['190', '460 €', '260', '200', '30'].map(price => ({ price }));
  assert.deepEqual(summarizeCatalog(products), { count: 5, totalCents: 114000, pricedCount: 5, unpricedCount: 0 });
  assert.equal(summarizeCatalog([...products, { price: '0,10' }, { price: '0.20' }]).totalCents, 114030);
  assert.equal(summarizeCatalog(products.slice(1)).count, 4);
  assert.equal(summarizeCatalog([{ price: '500' }, ...products.slice(1)]).totalCents, 145000);
  assert.deepEqual(summarizeCatalog([{ price: 'dohodou' }]), { count: 1, totalCents: 0, pricedCount: 0, unpricedCount: 1 });
  assert.deepEqual(summarizeCatalog([]), { count: 0, totalCents: 0, pricedCount: 0, unpricedCount: 0 });
});

test('all new labels are translated into each supported language', () => {
  for (const locale of ['sk', 'cs', 'en', 'uk']) {
    assert.deepEqual(Object.keys(translations[locale]).sort(), Object.keys(translations.sk).sort());
    assert.ok(Object.values(translations[locale]).every(value => value.trim().length > 0));
  }
});

test('failed refresh of cached totals immediately exposes an error instead of silently serving stale totals', async () => {
  const client = new QueryClient();
  const queryKey = ['catalog-summary-regression'];
  client.setQueryData(queryKey, [{ price: '190' }]);
  let attempts = 0;
  const observer = new QueryObserver(client, {
    queryKey,
    queryFn: async () => { attempts += 1; throw new Error('503'); },
    ...CATALOG_SUMMARY_REFRESH_OPTIONS,
  });
  const result = await observer.refetch();
  assert.equal(attempts, 1);
  assert.equal(result.isError, true, 'the UI error branch must become active even with cached data');
  assert.equal(result.isRefetchError, true);
  assert.deepEqual(result.data, [{ price: '190' }]);
  client.clear();
});
