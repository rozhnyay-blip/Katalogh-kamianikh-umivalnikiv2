import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatProductDetailLines, parseProductDetails } from '../src/lib/productDetails.ts';

test('availability notes are not duplicated among product specifications', () => {
  const subtitle = 'Skladom • Materiál: granit • Rozmery: 52 × 43 × 13 cm • Hmotnosť: 40 kg';
  assert.deepEqual(formatProductDetailLines(subtitle), [
    'Materiál: granit',
    'Rozmery: 52 × 43 × 13 cm',
    'Hmotnosť: 40 kg',
  ]);
  assert.equal(parseProductDetails(subtitle).additionalDetails, '');
});

test('localized legacy stock labels are filtered while other details remain', () => {
  for (const status of ['Na sklade', 'Skladem', 'In stock', 'У наявності', 'Skladom✅', 'Na objednávku']) {
    assert.deepEqual(formatProductDetailLines(`${status} · Rozmery: 55 cm`), ['Rozmery: 55 cm'], status);
  }
});
