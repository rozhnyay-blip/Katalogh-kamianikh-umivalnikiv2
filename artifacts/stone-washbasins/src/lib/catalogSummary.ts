export const CATALOG_SUMMARY_REFRESH_OPTIONS = {
  refetchOnMount: 'always',
  refetchOnWindowFocus: 'always',
  refetchInterval: 15_000,
  // Report a failed refresh immediately rather than showing old totals during retries.
  retry: false,
} as const;

/** Exact, non-negative EUR amounts only; ranges and enquiry-only prices are excluded. */
export function parseEuroCents(price: string): number | null {
  let value = price.trim().replace(/^(?:EUR|€)\s*/i, '').replace(/\s*(?:EUR|€)$/i, '')
    .trim().replace(/[\u00a0\u202f]/g, ' ');
  if (value.includes(' ')) {
    if (!/^\d{1,3}(?: \d{3})+(?:[.,]\d{1,2})?$/.test(value)) return null;
    value = value.replaceAll(' ', '');
  }
  if (!/^\d+(?:[.,]\d+)*$/.test(value)) return null;
  const decimal = value.match(/([.,])(\d{1,2})$/);
  const integer = decimal ? value.slice(0, -decimal[0].length) : value;
  if (decimal && integer.includes(decimal[1])) return null;
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+|\d{1,3}(?:,\d{3})+)$/.test(integer)) return null;
  const cents = Number(integer.replace(/[.,]/g, '')) * 100 + Number(decimal?.[2].padEnd(2, '0') ?? 0);
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
}

export function summarizeCatalog(products: readonly { price: string }[]) {
  let totalCents = 0;
  let pricedCount = 0;
  for (const product of products) {
    const cents = parseEuroCents(product.price);
    if (cents !== null && Number.isSafeInteger(totalCents + cents)) {
      totalCents += cents;
      pricedCount += 1;
    }
  }
  return { count: products.length, totalCents, pricedCount, unpricedCount: products.length - pricedCount };
}
