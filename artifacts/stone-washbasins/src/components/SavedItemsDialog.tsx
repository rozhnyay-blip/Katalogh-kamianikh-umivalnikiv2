import { useRef } from 'react';
import { X } from 'lucide-react';
import type { Product } from '@workspace/api-client-react';
import { ProductImage } from './ProductImage';
import { useFocusScope } from '../hooks/useFocusScope';
import { localizeProduct, translate, type Locale } from '../lib/localization';

export type SavedItem = {
  id: number;
  product: Product | null;
};

type SavedItemsDialogProps = {
  items: SavedItem[];
  cartIds: number[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onAddToCart: (product: Product) => void;
  onRemove: (item: SavedItem) => void;
  onClose: () => void;
  locale: Locale;
};

export function SavedItemsDialog({
  locale,
  items,
  cartIds,
  isLoading,
  isError,
  onRetry,
  onAddToCart,
  onRemove,
  onClose,
}: SavedItemsDialogProps) {
  const modalRef = useRef<HTMLElement>(null);
  useFocusScope(modalRef, onClose);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={modalRef}
        className="order-modal saved-items-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-items-title"
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label={`${translate(locale, 'Zavrieť')} ${translate(locale, 'Obľúbené')}`}>
          <X size={19} />
        </button>
        <span className="eyebrow">{translate(locale, 'Obľúbené')}</span>
        <h2 className="display modal-title" id="saved-items-title">
          {translate(locale, 'Uložené')}<br /><em>{translate(locale, 'umývadlá.')}</em>
        </h2>
        <p className="saved-items-intro">
          Produkty označené srdiečkom nájdete tu. Môžete ich pridať do košíka alebo odstrániť zo zoznamu.
        </p>

        {isLoading ? (
          <div className="saved-items-state" role="status">Načítavam uložené produkty...</div>
        ) : isError ? (
          <div className="saved-items-state">
            <p>Nepodarilo sa načítať katalóg.</p>
            <button className="button-quiet" type="button" onClick={onRetry}>Skúsiť znova</button>
          </div>
        ) : items.length === 0 ? (
          <div className="saved-items-state">
            Zatiaľ tu nič nie je. Uložte si produkt klepnutím na srdiečko v katalógu.
          </div>
        ) : (
          <div className="saved-items-list" aria-label="Uložené produkty">
            {items.map(({ id, product }) => {
              const isInCart = cartIds.includes(id);
              const displayProduct = product ? localizeProduct(product, locale) : null;

              return (
                <article className="cart-item-card saved-item-card" key={id}>
                  <div className="cart-item-card-media">
                    {product && product.images.length > 0 ? (
                      <ProductImage
                        className="cart-item-card-image"
                        path={product.images[0]}
                        alt={`${translate(locale, 'Umývadlá')} ${displayProduct?.name}`}
                        sizes="72px"
                      />
                    ) : (
                      <div className="cart-item-card-placeholder">BEZ FOTOGRAFIE</div>
                    )}
                  </div>
                  <div className="cart-item-card-content">
                    <span className="cart-item-kind">{displayProduct?.kind ?? translate(locale, 'Uložený produkt')}</span>
                    <strong className="cart-item-name">{displayProduct?.name ?? translate(locale, 'Produkt už nie je v katalógu')}</strong>
                    {product && (
                      <span className="cart-item-details">
                        {product.price?.trim() || translate(locale, 'Cena na vyžiadanie')}
                      </span>
                    )}
                    {product && !product.available && (
                      <span className="cart-item-unavailable">{translate(locale, 'Už nie je dostupný')}</span>
                    )}
                    <div className="saved-item-actions">
                      <button
                        className="cart-item-remove"
                        type="button"
                        onClick={() => onRemove({ id, product })}
                        aria-label={`Odstrániť ${product?.name ?? 'produkt'} z uložených`}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                      <button
                        className="button-primary saved-item-add"
                        type="button"
                        disabled={!product?.available || isInCart}
                        onClick={() => product && onAddToCart(product)}
                      >
                        {translate(locale, isInCart ? 'V košíku' : product?.available ? 'Do košíka' : 'Nedostupné')}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}