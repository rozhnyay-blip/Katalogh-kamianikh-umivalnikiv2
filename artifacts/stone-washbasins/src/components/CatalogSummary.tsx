import { useState } from 'react';
import { getListProductsQueryKey, useListProducts } from '@workspace/api-client-react';
import { readInitialLocale } from '../lib/localePreference';
import { CATALOG_SUMMARY_REFRESH_OPTIONS, summarizeCatalog } from '../lib/catalogSummary';
import translations from '../lib/catalogSummaryCopy.json';

export function CatalogSummary() {
  const [locale] = useState(readInitialLocale);
  const copy = translations[locale];
  const { data: products, isPending, isError, refetch, isFetching } = useListProducts({
    query: { queryKey: getListProductsQueryKey(), ...CATALOG_SUMMARY_REFRESH_OPTIONS },
  });
  const summary = products ? summarizeCatalog(products) : null;
  const currency = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' });
  return (
    <section className="skala-analytics skala-analytics__inventory" aria-labelledby="catalog-summary-title">
      <h2 id="catalog-summary-title">{copy.heading}</h2>
      {isPending ? <p role="status">{copy.loading}</p> : isError || !summary ? (
        <div role="alert">
          <p>{copy.error}</p>
          <button className="skala-analytics__retry" type="button" disabled={isFetching} onClick={() => refetch()}>{copy.retry}</button>
        </div>
      ) : (
        <div aria-live="polite">
          <div className="skala-analytics__inventory-grid">
            <article className="skala-analytics__metric">
              <h3>{copy.count}</h3>
              <strong className="skala-analytics__metric-value" data-testid="catalog-listing-count">{new Intl.NumberFormat(locale).format(summary.count)}</strong>
              <p>{copy.countNote}</p>
            </article>
            <article className="skala-analytics__metric">
              <h3>{copy.total}</h3>
              <strong className="skala-analytics__metric-value" data-testid="catalog-listing-value">
                {summary.count > 0 && summary.pricedCount === 0 ? '—' : currency.format(summary.totalCents / 100)}
              </strong>
              <p>{copy.totalNote}</p>
            </article>
          </div>
          {summary.unpricedCount > 0 && <p role="status" className="skala-analytics__quiet-note">{copy.excluded} {summary.unpricedCount}</p>}
        </div>
      )}
    </section>
  );
}
