import { useEffect, useRef, useState, type FormEvent, type TouchEvent as ReactTouchEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Heart, X, Instagram, MessageCircle, Plus, ShoppingCart } from 'lucide-react';
import { useListProducts, useCreateOrder, useGetOwnerStatus, getGetOwnerStatusQueryKey, getGetSiteContentQueryKey, useGetSiteContent, useUpdateSiteContent, type Product, type SiteContent } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import { Link } from 'wouter';
import { Brand } from '../components/Brand';
import { useFocusScope } from '../hooks/useFocusScope';
import { preloadProductImage, ProductImage } from '../components/ProductImage';
import { EditableProductMedia } from '../components/EditableProductMedia';
import { SavedItemsDialog, type SavedItem } from '../components/SavedItemsDialog';
import { SiteTextEditorOverlay } from '../components/SiteTextEditorOverlay';
import { ContactDock } from '../components/ContactDock';
import { AnalyticsConsent } from '../components/AnalyticsConsent';
import { trackSiteEvent, trackSitePageView } from '../lib/analytics';
import { SITE_CONTENT_DEFAULTS } from '../lib/siteContentDefaults';
import { formatProductDetailLines } from '../lib/productDetails';
import { CATALOG_CATEGORIES, type CatalogCategoryId } from '../lib/catalogCategories';

const basePath = (import.meta.env.BASE_URL || '').replace(/\/$/, '');
const heroProductImage = `${basePath}/images/hero-basin.webp`;
const CATALOG_BATCH_SIZE = 20;
const MAX_CATALOG_PRODUCTS = 1000;

function normalizeCatalogText(value: string): string {
  return value
    .toLocaleLowerCase('sk')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function matchesCatalogCategory(product: Product, categoryId: CatalogCategoryId): boolean {
  const searchableText = normalizeCatalogText(`${product.name} ${product.subtitle} ${product.kind}`);
  const category = CATALOG_CATEGORIES.find((item) => item.id === categoryId);
  if (!category) return true;

  if (categoryId === 'washbasins') {
    const otherCategories = CATALOG_CATEGORIES.filter((item) => item.id !== 'washbasins');
    const isAccessory = otherCategories.some((item) =>
      item.terms.some((term) => searchableText.includes(normalizeCatalogText(term))),
    );
    return !isAccessory || category.terms.some((term) => searchableText.includes(normalizeCatalogText(term)));
  }

  return category.terms.some((term) => searchableText.includes(normalizeCatalogText(term)));
}

function readStoredIds(key: string): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(stored)
      ? [...new Set(stored.filter((id): id is number => Number.isSafeInteger(id) && id > 0))]
      : [];
  } catch {
    return [];
  }
}

function formatProductPrice(price: string): string {
  const value = price.trim();
  if (!value || /(?:€|EUR)/iu.test(value)) return value;
  return /^\d[\d\s.,]*$/u.test(value) ? `${value} €` : value;
}

function getImageUrl(path: string) {
  return `${basePath}/api/storage${path}`;
}

export function HomePage() {
  const { isLoaded, userId } = useAuth();
  const { data: owner, isPending: ownerStatusPending } = useGetOwnerStatus({
    query: { enabled: isLoaded, queryKey: [...getGetOwnerStatusQueryKey(), userId] },
  });
  const canEdit = Boolean(isLoaded && owner?.signedIn && owner?.isOwner);
  const canTrack = Boolean(isLoaded && !ownerStatusPending && owner && !owner.isOwner);
  const { data: storedContent, isLoading: contentLoading, isError: contentError } = useGetSiteContent();
  const content = storedContent ?? SITE_CONTENT_DEFAULTS;
  const queryClient = useQueryClient();
  const updateSiteContent = useUpdateSiteContent();
  const [savedIds, setSavedIds] = useState<number[]>(() => readStoredIds('skala-saved'));
  const [cartIds, setCartIds] = useState<number[]>(() => readStoredIds('skala-cart'));
  const [savedNotice, setSavedNotice] = useState('');
  const [savedOpen, setSavedOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [heroOrderOpen, setHeroOrderOpen] = useState(false);
  const [visibleProductCount, setVisibleProductCount] = useState(CATALOG_BATCH_SIZE);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [activeCatalogCategory, setActiveCatalogCategory] = useState<CatalogCategoryId | null>(null);
  const categoryPickerRef = useRef<HTMLDivElement>(null);
  const categoryTriggerRef = useRef<HTMLButtonElement>(null);

  const { data: products = [], isLoading, isError, refetch } = useListProducts();
  const activeCategory = CATALOG_CATEGORIES.find((category) => category.id === activeCatalogCategory);
  const catalogProducts = activeCatalogCategory
    ? products.filter((product) => matchesCatalogCategory(product, activeCatalogCategory))
    : products;
  const visibleProducts = catalogProducts.slice(0, visibleProductCount);
  const cartItems = cartIds.map((id) => ({
    id,
    product: products.find((product) => product.id === id) ?? null,
  }));
  const savedItems: SavedItem[] = savedIds.map((id) => ({
    id,
    product: products.find((product) => product.id === id) ?? null,
  }));
  useEffect(() => {
    if (canTrack) trackSitePageView();
  }, [canTrack]);

  useEffect(() => {
    try {
      window.localStorage.setItem('skala-saved', JSON.stringify(savedIds));
    } catch {
      setSavedNotice('Prehliadač neumožňuje trvalé uloženie. Výber zostane uložený len počas tejto návštevy.');
    }
  }, [savedIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem('skala-cart', JSON.stringify(cartIds));
    } catch {
      setSavedNotice('Košík zostane uložený len počas tejto návštevy.');
    }
  }, [cartIds]);

  useEffect(() => {
    if (!savedNotice) return;
    const timeout = window.setTimeout(() => setSavedNotice(''), 2400);
    return () => window.clearTimeout(timeout);
  }, [savedNotice]);

  useEffect(() => {
    if (!categoryMenuOpen) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (event.target instanceof Node && !categoryPickerRef.current?.contains(event.target)) {
        setCategoryMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setCategoryMenuOpen(false);
      categoryTriggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [categoryMenuOpen]);

  const selectCatalogCategory = (categoryId: CatalogCategoryId) => {
    setActiveCatalogCategory(categoryId);
    setVisibleProductCount(CATALOG_BATCH_SIZE);
    setCategoryMenuOpen(false);
    window.requestAnimationFrame(() => {
      document.getElementById('katalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const showAllCatalogProducts = () => {
    setActiveCatalogCategory(null);
    setVisibleProductCount(CATALOG_BATCH_SIZE);
  };

  const toggleSaved = (product: Product) => {
    const isSaved = savedIds.includes(product.id);
    if (canTrack) {
      trackSiteEvent(isSaved ? 'favorite_remove' : 'favorite_add', product.id);
    }
    setSavedIds((current) => isSaved ? current.filter((id) => id !== product.id) : [...current, product.id]);
    setSavedNotice(isSaved ? `${product.name} odstránené z uložených` : `${product.name} uložené pre vás`);
  };

  const openCart = () => {
    if (canTrack) trackSiteEvent('enquiry_started');
    setCartOpen(true);
  };

  const addToCart = (product: Product) => {
    if (!product.available) return;
    if (cartIds.includes(product.id)) {
      setCartOpen(true);
      return;
    }
    setCartIds((current) => current.includes(product.id) ? current : [...current, product.id]);
    setSavedNotice(`${product.name} pridané do košíka`);
  };

  const saveTextOverride = async (key: string, source: string, text: string) => {
    const queryKey = getGetSiteContentQueryKey();
    const current = queryClient.getQueryData<SiteContent>(queryKey) ?? content;
    const updated = await updateSiteContent.mutateAsync({
      data: {
        ...current,
        textOverrides: { ...current.textOverrides, [key]: { source, text } },
      },
    });
    queryClient.setQueryData(queryKey, updated);
  };

  const resetTextOverride = async (key: string) => {
    const queryKey = getGetSiteContentQueryKey();
    const current = queryClient.getQueryData<SiteContent>(queryKey) ?? content;
    const textOverrides = { ...current.textOverrides };
    delete textOverrides[key];
    const updated = await updateSiteContent.mutateAsync({
      data: { ...current, textOverrides },
    });
    queryClient.setQueryData(queryKey, updated);
  };

  return (
    <div className="site-shell">
      <div className="topline">
        <div className="container-wide topline-inner">
           <span>{content.topline.tagline}</span>
           <div className="topline-actions">
             <span className="topline-note">{content.topline.note}</span>
             <button
               className="topline-saved-button"
               type="button"
               onClick={() => setSavedOpen(true)}
               aria-haspopup="dialog"
               aria-label={`Obľúbené produkty, ${savedIds.length} položiek`}
             >
               <Heart size={17} aria-hidden="true" />
               <span className="topline-cart-count" aria-live="polite">{savedIds.length}</span>
             </button>
             <button className="topline-cart-button" type="button" onClick={openCart} aria-haspopup="dialog" aria-label={`Košík, ${cartIds.length} položiek`}>
               <ShoppingCart size={18} aria-hidden="true" />
               <span>Košík</span>
               <span className="topline-cart-count" aria-live="polite">{cartIds.length}</span>
             </button>
           </div>
        </div>
      </div>

      <header className="container-wide nav">
        <a className="brand" href="#domov"><Brand /></a>
        <nav className="nav-links" aria-label="Hlavná navigácia">
           <a href="#katalog">{content.nav.catalog}</a>
           <a href="#pribeh">{content.nav.story}</a>
           <a href="#detaily">{content.nav.details}</a>
        </nav>
        <div className="nav-contact">
          <Link className="owner-nav-link" href="/admin">{canEdit ? 'Správa' : 'Prihlásenie majiteľa'}</Link>
          <a className="round-button" href={content.nav.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <Instagram size={16} />
          </a>
        </div>
      </header>

      <main>
        <section className="hero container-wide" id="domov">
          <div className="hero-grid">
            <div className="hero-copy">
               <span className="eyebrow">{content.hero.eyebrow}</span>
               <h1 className="display hero-title">{content.hero.titleLead}<br />{content.hero.titleMiddle} <em>{content.hero.titleEmphasis}</em></h1>
               <p className="hero-lede">{content.hero.lede}</p>
               <div className="hero-actions">
                  <div className={`hero-category-picker ${categoryMenuOpen ? 'is-open' : ''}`} ref={categoryPickerRef}>
                    <button
                      className="button-primary hero-category-trigger"
                      type="button"
                      ref={categoryTriggerRef}
                      aria-expanded={categoryMenuOpen}
                      aria-controls="hero-category-menu"
                      onClick={() => setCategoryMenuOpen((open) => !open)}
                    >
                      {content.hero.primaryCta}
                      <ChevronDown className={categoryMenuOpen ? 'is-rotated' : ''} size={15} aria-hidden="true" />
                    </button>
                    {categoryMenuOpen && (
                      <div className="hero-category-menu" id="hero-category-menu" role="group" aria-label="Vybrať kategóriu">
                        {CATALOG_CATEGORIES.map((category) => (
                          <button
                            className="hero-category-option"
                            key={category.id}
                            type="button"
                            aria-pressed={activeCatalogCategory === category.id}
                            onClick={() => selectCatalogCategory(category.id)}
                          >
                            <span className="hero-category-option-copy">
                              <strong>{category.label}</strong>
                              <small>{category.detail}</small>
                            </span>
                            <ArrowRight size={15} aria-hidden="true" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                 <a className="button-quiet" href="#pribeh">{content.hero.secondaryCta}</a>
              </div>
            </div>
            <div className="hero-visual" aria-label={content.hero.visualAria}>
               <span className="hero-index">{content.hero.visualIndex}</span>
                <img
                  className="hero-product-image"
                  src={heroProductImage}
                  alt="Ručne opracované luxusné umývadlo z prírodného kameňa SKALA"
                  width={1600}
                  height={1183}
                  loading="eager"
                  fetchPriority="high"
                />
               <div className="hero-stamp"><span>{content.hero.stampLine1}<br />{content.hero.stampLine2}<br />{content.hero.stampLine3}</span></div>
              <dl className="hero-product-details" aria-label="Informácie o umývadle">
                <div><dt>Cena</dt><dd>{content.hero.price}</dd></div>
                <div><dt>Rozmery</dt><dd>{content.hero.dimensions}</dd></div>
                <div><dt>Hmotnosť</dt><dd>{content.hero.weight}</dd></div>
              </dl>
              <button
                className="hero-order-button"
                type="button"
                aria-haspopup="dialog"
                onClick={() => {
                  if (canTrack) trackSiteEvent('enquiry_started');
                  setHeroOrderOpen(true);
                }}
              >
                <MessageCircle size={18} aria-hidden="true" />
                <span>{content.hero.orderCta}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
             {Array.from({ length: 2 }).flatMap((_, copyIndex) => content.marquee.map((item) => (
              <span className="marquee-item" key={`${copyIndex}-${item}`}><span className="marquee-dot" />{item}</span>
            )))}
          </div>
        </div>

        <section className="catalog" id="katalog">
          <div className="container-wide">
            <div className="catalog-head">
              <div>
                 <span className="eyebrow">{content.catalog.eyebrow}</span>
                 <h2 className="display catalog-title">{content.catalog.titleLead}<br /><em>{content.catalog.titleEmphasis}</em></h2>
                  <p className="catalog-materials-note">
                    V ponuke SKALA nájdete kamenné umývadlá z mramoru, granitu (žuly), labradoritu a pieskovca. Každý kus má osobitú kresbu prírodného kameňa. Vyrábame aj na objednávku.
                  </p>
              </div>
               <p className="catalog-intro">{content.catalog.intro}</p>
            </div>
            {canEdit && <div className="owner-catalog-toolbar">
               <div><strong>{content.catalog.ownerToolbarTitle}</strong><p>{content.catalog.ownerToolbarHelp}</p></div>
            </div>}

            {activeCategory && (
              <div className="catalog-active-filter" aria-live="polite">
                <span>Zvolená kategória: <strong>{activeCategory.label}</strong></span>
                <button type="button" onClick={showAllCatalogProducts}>Zobraziť všetky produkty</button>
              </div>
            )}

            {isLoading ? (
              <div className="catalog-status">
                <p>Načítavam katalóg...</p>
              </div>
            ) : isError ? (
              <div className="catalog-status error-state">
                <p>Nepodarilo sa načítať katalóg.</p>
                <button className="button-quiet" onClick={() => refetch()}>Skúsiť znova</button>
              </div>
            ) : catalogProducts.length === 0 ? (
              <div className="catalog-status">
                 <p>{activeCategory ? `V kategórii ${activeCategory.label} zatiaľ nie sú produkty.` : content.catalog.emptyMessage}</p>
                 {activeCategory && <button className="button-quiet" type="button" onClick={showAllCatalogProducts}>Zobraziť všetky produkty</button>}
              </div>
            ) : (
              <div className="catalog-grid">
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    canEdit={canEdit}
                    saved={savedIds.includes(product.id)}
                    isInCart={cartIds.includes(product.id)}
                    onToggleSaved={toggleSaved}
                    onAddToCart={addToCart}
                  />
                ))}
              </div>
            )}
            {!isLoading && !isError && visibleProductCount < MAX_CATALOG_PRODUCTS && catalogProducts.length > visibleProducts.length && (
              <button
                className="catalog-show-more"
                type="button"
                onClick={() => {
                  if (canTrack) trackSiteEvent('catalog_load_more');
                  setVisibleProductCount((count) => Math.min(count + CATALOG_BATCH_SIZE, MAX_CATALOG_PRODUCTS));
                }}
              >
                Zobraziť ďalších {Math.min(CATALOG_BATCH_SIZE, catalogProducts.length - visibleProducts.length)} produktov
              </button>
            )}
            {canEdit && !isLoading && !isError && (
              <div className="catalog-bottom-actions">
                <span className="catalog-product-count">{products.length} / {MAX_CATALOG_PRODUCTS} inzerátov</span>
                {products.length < MAX_CATALOG_PRODUCTS ? (
                  <Link className="button-primary catalog-add-product" href="/admin?new=1">
                    <Plus size={17} aria-hidden="true" />
                    Pridať inzerát
                  </Link>
                ) : (
                  <p className="catalog-limit-message" role="status">Dosiahli ste limit 1000 inzerátov.</p>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="story container-wide" id="pribeh">
          <div className="story-grid">
            <div>
               <span className="eyebrow">{content.story.eyebrow}</span>
               <h2 className="display story-heading">{content.story.titleLead}<br /><em>{content.story.titleEmphasis}</em></h2>
               <p className="story-copy">{content.story.copy}</p>
               <p className="story-note">{content.story.note}</p>
            </div>
            <div className="process">
              {content.story.steps.map((step) => (
                <div className="process-step" key={step.number}>
                  <span className="process-number">{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="details-band" id="detaily">
          <div className="container-wide details-grid">
            <div>
               <span className="eyebrow">{content.details.eyebrow}</span>
               <h2 className="display details-title">{content.details.titleLead}<br /><em>{content.details.titleEmphasis}</em></h2>
               <p className="details-text">{content.details.text}</p>
            </div>
            <dl className="spec-list">
               {content.details.specs.map((spec) => <div className="spec-row" key={spec.label}><dt>{spec.label}</dt><dd>{spec.value}</dd></div>)}
            </dl>
          </div>
        </section>
      </main>

      <footer className="footer" id="kontakty">
        <div className="container-wide">
          <div className="footer-grid">
            <div>
              <Brand light />
               <p>{content.footer.description}</p>
            </div>
            <div>
               <h3>{content.footer.navigationTitle}</h3>
              <div className="footer-links">
                 <a href="#katalog">{content.footer.catalogLink}</a>
                 <a href="#pribeh">{content.footer.storyLink}</a>
                 <a href="#detaily">{content.footer.detailsLink}</a>
              </div>
            </div>
            <div>
               <h3>{content.footer.socialTitle}</h3>
               <a className="footer-contact" href={content.nav.instagramUrl} target="_blank" rel="noopener noreferrer">{content.footer.socialHandle}</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} SKALA</span>
             <span>{content.footer.bottomSlogan}</span>
            <Link href="/admin" className="admin-link">Prihlásenie majiteľa</Link>
          </div>
        </div>
      </footer>

      {savedNotice && <div className="saved-toast" role="status">{savedNotice}</div>}
      {savedOpen && (
        <SavedItemsDialog
          items={savedItems}
          cartIds={cartIds}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          onAddToCart={addToCart}
          onRemove={(item) => {
            if (item.product) {
              toggleSaved(item.product);
            } else {
              setSavedIds((current) => current.filter((id) => id !== item.id));
              setSavedNotice('Položka odstránená z uložených');
            }
          }}
          onClose={() => setSavedOpen(false)}
        />
      )}
      {(cartOpen || heroOrderOpen) && (
        <OrderModal
          items={heroOrderOpen ? [] : cartItems}
          featured={heroOrderOpen ? {
            productName: 'Umývadlo z hlavnej fotografie',
            name: 'Umývadlo z hlavnej fotografie',
            image: heroProductImage,
            details: [
              `Cena: ${content.hero.price}`,
              `Rozmery: ${content.hero.dimensions}`,
              `Hmotnosť: ${content.hero.weight}`,
            ],
          } : undefined}
          onRemove={(id) => setCartIds((current) => current.filter((itemId) => itemId !== id))}
          onClose={() => {
            setCartOpen(false);
            setHeroOrderOpen(false);
          }}
          onSuccess={() => {
            if (!heroOrderOpen) setCartIds([]);
          }}
          ownerMode={canEdit}
          analyticsEnabled={canTrack}
        />
      )}
      <ContactDock content={content} analyticsEnabled={canTrack} />
      {canTrack && <AnalyticsConsent />}
      <SiteTextEditorOverlay
        enabled={canEdit && Boolean(storedContent) && !contentLoading && !contentError}
        overrides={content.textOverrides}
        isSaving={updateSiteContent.isPending}
        onSave={saveTextOverride}
        onReset={resetTextOverride}
      />
    </div>
  );
}

function ProductCard({
  product,
  canEdit,
  saved,
  isInCart,
  onToggleSaved,
  onAddToCart,
}: {
  product: Product;
  canEdit: boolean;
  saved: boolean;
  isInCart: boolean;
  onToggleSaved: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const imageCount = Math.min(product.images.length, 10);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const preloadedImages = useRef(new Map<string, HTMLImageElement>());
  useEffect(() => {
    setImageIndex(0);
    swipeStart.current = null;
    preloadedImages.current.clear();
  }, [product.images.join('|')]);

  const nextImage = () => setImageIndex((current) => (current + 1) % imageCount);
  const previousImage = () => setImageIndex((current) => (current - 1 + imageCount) % imageCount);
  const preloadImageAt = (index: number) => {
    const path = product.images[index];
    if (!path || preloadedImages.current.has(path)) return;
    preloadedImages.current.set(path, preloadProductImage(path));
  };
  const preloadNextImage = () => {
    if (imageCount < 2 || imageIndex >= imageCount - 1) return;
    preloadImageAt(imageIndex + 1);
  };
  const startImageSwipe = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (imageCount < 2 || event.touches.length !== 1) {
      swipeStart.current = null;
      return;
    }
    if ((event.target as HTMLElement).closest('button, a, input')) {
      swipeStart.current = null;
      return;
    }
    const touch = event.touches[0];
    swipeStart.current = { x: touch.clientX, y: touch.clientY };
  };
  const moveImageSwipe = (event: ReactTouchEvent<HTMLDivElement>) => {
    const start = swipeStart.current;
    const touch = event.touches[0];
    if (!start || !touch || imageCount < 2) return;

    const distanceX = touch.clientX - start.x;
    const distanceY = touch.clientY - start.y;
    if (Math.abs(distanceX) < 8 || Math.abs(distanceY) > Math.abs(distanceX)) return;
    preloadImageAt((imageIndex + (distanceX < 0 ? 1 : imageCount - 1)) % imageCount);
  };
  const finishImageSwipe = (event: ReactTouchEvent<HTMLDivElement>) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch || imageCount < 2) return;

    const distanceX = touch.clientX - start.x;
    const distanceY = touch.clientY - start.y;
    if (Math.abs(distanceX) < 36 || Math.abs(distanceX) < Math.abs(distanceY) * 1.2) return;

    if (distanceX < 0) nextImage();
    else previousImage();
  };

  return (
    <article className={`product-card ${!product.available ? 'is-unavailable' : ''}`}>
      <EditableProductMedia product={product} canEdit={canEdit}>
        <div
          className="product-gallery"
          onTouchStart={startImageSwipe}
          onTouchMove={moveImageSwipe}
          onTouchEnd={finishImageSwipe}
          onTouchCancel={() => { swipeStart.current = null; }}
        >
          {product.images.length > 0 ? (
            <ProductImage
              className="product-image"
              path={product.images[imageIndex] || product.images[0]}
              alt={`Umývadlo ${product.name}`}
              onLoad={preloadNextImage}
            />
          ) : (
            <div className="product-image-placeholder flex items-center justify-center h-full bg-[#3e5e60] text-[#eef0dd] text-xs font-mono tracking-widest">BEZ FOTOGRAFIE</div>
          )}
          <span className="media-shade" aria-hidden="true" />
          <div className="product-meta-top">
            <span className="product-kind">{product.kind}</span>
            <button
              className={`save-button ${saved ? 'is-saved' : ''}`}
              type="button"
              onClick={() => onToggleSaved(product)}
              aria-label={saved ? `Odstrániť ${product.name} z uložených` : `Uložiť ${product.name}`}
            >
              <Heart size={15} strokeWidth={saved ? 2.6 : 1.7} fill={saved ? 'currentColor' : 'none'} />
            </button>
          </div>
          {imageCount > 1 && (
            <div className="product-arrows">
              <button
                className="media-arrow"
                type="button"
                onClick={previousImage}
                onPointerEnter={() => preloadImageAt((imageIndex - 1 + imageCount) % imageCount)}
                onFocus={() => preloadImageAt((imageIndex - 1 + imageCount) % imageCount)}
                aria-label="Predchádzajúca fotka"
              >
                <ArrowLeft size={14} />
              </button>
              <button
                className="media-arrow"
                type="button"
                onClick={nextImage}
                onPointerEnter={() => preloadImageAt((imageIndex + 1) % imageCount)}
                onFocus={() => preloadImageAt((imageIndex + 1) % imageCount)}
                aria-label="Nasledujúca fotka"
              >
                <ArrowRight size={14} />
              </button>
            </div>
          )}
          {imageCount > 0 && (
            <span className="position-count">
              {String(imageIndex + 1).padStart(2, '0')} / {String(imageCount).padStart(2, '0')}
            </span>
          )}
          {!product.available && (
            <div className="product-badge-unavailable">PREDANÉ</div>
          )}
        </div>
      </EditableProductMedia>
      <div className="product-info">
        <div className="product-info-main">
          <h3 className="product-name">{product.name}</h3>
          <p className="product-details">
            {formatProductDetailLines(product.subtitle).map((line, index) => (
              <span key={`${index}-${line}`}>{line}</span>
            ))}
          </p>
        </div>
        <span className="product-price">
          {product.price?.trim() ? formatProductPrice(product.price) : 'Cena na vyžiadanie'}
        </span>
        <div className="product-actions">
          <button
            className="order-link quiet"
            type="button"
            onClick={() => onToggleSaved(product)}
          >
            {saved ? 'Uložené' : 'Uložiť'}
          </button>
          <button
            className="order-link primary add-to-cart"
            type="button"
            onClick={() => onAddToCart(product)}
            disabled={!product.available}
            aria-label={isInCart ? `${product.name} je v košíku` : `Pridať ${product.name} do košíka`}
          >
            {isInCart ? 'V košíku' : product.available ? 'Pridať do košíka' : 'Nedostupné'}
            {isInCart ? <Check size={14} /> : <ShoppingCart size={14} />}
          </button>
        </div>
      </div>
    </article>
  );
}

type CartEntry = { id: number; product: Product | null };

type FeaturedInquiry = {
  productName: string;
  name: string;
  image: string;
  details: string[];
};

function OrderModal({
  items,
  featured,
  onRemove,
  onClose,
  onSuccess,
  ownerMode,
  analyticsEnabled,
}: {
  items: CartEntry[];
  featured?: FeaturedInquiry;
  onRemove: (id: number) => void;
  onClose: () => void;
  onSuccess: () => void;
  ownerMode: boolean;
  analyticsEnabled: boolean;
}) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [receiptId, setReceiptId] = useState<number | null>(null);
  const availableProducts = items.flatMap((item) =>
    item.product?.available ? [item.product] : [],
  );
  const hasUnavailableProducts = availableProducts.length !== items.length;
  const hasEnquiryTarget = items.length > 0 || Boolean(featured);

  const createOrder = useCreateOrder();

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: '' }));
  };

  const submitOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createOrder.isPending) return;
    const nextErrors: Record<string, string> = {};
    if (!hasEnquiryTarget) nextErrors.form = 'Košík je prázdny.';
    if (hasUnavailableProducts) {
      nextErrors.form = 'Niektorý produkt už nie je dostupný. Odstráňte ho z košíka a skúste znova.';
    }
    if (form.name.trim().length < 2) nextErrors.name = 'Uveďte, prosím, vaše meno';
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (!/^[+0-9\s()\-]+$/.test(form.phone.trim()) || phoneDigits.length < 7 || phoneDigits.length > 15) nextErrors.phone = 'Zadajte platné telefónne číslo';
    if (!/^[^\s@]+@gmail\.com$/i.test(form.email.trim())) {
      nextErrors.email = 'Zadajte platnú Gmail adresu';
    }
    
    setErrors(nextErrors);
    
    if (Object.keys(nextErrors).length === 0) {
      createOrder.mutate({
        data: {
          ...(availableProducts.length > 0
            ? {
                productId: availableProducts[0].id,
                productIds: availableProducts.map((product) => product.id),
              }
            : { productName: featured!.productName }),
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          ...(form.message.trim() ? { message: form.message.trim() } : {}),
        }
      }, {
        onSuccess: (receipt) => {
          if (analyticsEnabled) trackSiteEvent('enquiry_submitted');
          onSuccess();
          setReceiptId(receipt.id);
          setSubmitted(true);
        },
        onError: () => {
          setErrors({ form: 'Dopyt sa nepodarilo odoslať. Skontrolujte, či sú vybrané produkty stále dostupné, a skúste to znova.' });
        }
      });
    }
  };

  const modalRef = useRef<HTMLElement>(null);

  useFocusScope(modalRef, onClose, createOrder.isPending);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => !createOrder.isPending && event.target === event.currentTarget && onClose()}>
      <section ref={modalRef} className="order-modal" role="dialog" aria-modal="true" aria-labelledby="order-title">
        <button className="modal-close" type="button" onClick={onClose} disabled={createOrder.isPending} aria-label="Zavrieť formulár">
          <X size={19} />
        </button>
        {submitted && receiptId ? (
          <div className="success-state">
            <div className="success-mark"><Check size={25} /></div>
            <h2 className="display" id="order-title">Dopyt prijatý</h2>
            <p>{featured
              ? `Váš dopyt č. ${receiptId} na ${featured.productName.toLowerCase()} bol uložený. Majiteľ vás bude kontaktovať s ďalšími informáciami. Odoslanie formulára nie je platbou ani záväznou objednávkou.`
              : `Váš spoločný dopyt č. ${receiptId} na vybrané produkty bol uložený. Majiteľ vás bude kontaktovať s potvrdením dostupnosti a ďalšími informáciami. Odoslanie formulára nie je platbou ani záväznou objednávkou.`}</p>
            <button className="button-primary" type="button" onClick={onClose}>Späť do katalógu</button>
          </div>
        ) : items.length === 0 && !featured ? (
          <div className="cart-empty-state">
            <span className="eyebrow">Košík</span>
            <h2 className="display modal-title" id="order-title">Zatiaľ je prázdny</h2>
            <p>Pridajte si do košíka umývadlá, o ktoré máte záujem, a pošlite jeden spoločný dopyt.</p>
            {ownerMode && <OwnerCartTools />}
            <button className="button-primary" type="button" onClick={onClose}>Späť do katalógu</button>
          </div>
        ) : (
          <>
            <span className="eyebrow">{featured ? 'Dopyt · hlavné umývadlo' : 'Košík · spoločný dopyt'}</span>
            <h2 className="display modal-title" id="order-title">
              {featured ? <>Máte záujem?<br /><em>Napíšte nám.</em></> : <>Váš výber —<br /><em>na jednom mieste</em></>}
            </h2>
            <div className="cart-items-list" aria-label="Vybrané produkty">
              {featured && (
                <article className="cart-item-card" key="featured">
                  <div className="cart-item-card-media">
                    <img className="cart-item-card-image" src={featured.image} alt={featured.name} />
                  </div>
                  <div className="cart-item-card-content">
                    <span className="cart-item-kind">Hlavná ponuka</span>
                    <strong className="cart-item-name">{featured.name}</strong>
                    <p className="cart-item-details">
                      {featured.details.map((line) => <span key={line}>{line}</span>)}
                    </p>
                  </div>
                </article>
              )}
              {items.map(({ id, product }) => (
                <article className="cart-item-card" key={id}>
                  <div className="cart-item-card-media">
                    {product && product.images.length > 0 ? (
                      <ProductImage
                        className="cart-item-card-image"
                        path={product.images[0]}
                        alt={`Umývadlo ${product.name}`}
                        sizes="72px"
                      />
                    ) : (
                      <div className="cart-item-card-placeholder">BEZ FOTOGRAFIE</div>
                    )}
                  </div>
                  <div className="cart-item-card-content">
                    <span className="cart-item-kind">{product?.kind ?? 'Produkt'}</span>
                    <strong className="cart-item-name">{product?.name ?? `Produkt #${id}`}</strong>
                    {product?.subtitle && (
                      <p className="cart-item-details">
                        {formatProductDetailLines(product.subtitle).map((line, index) => (
                          <span key={`${index}-${line}`}>{line}</span>
                        ))}
                      </p>
                    )}
                    {(!product || !product.available) && (
                      <span className="cart-item-unavailable">Už nie je dostupný</span>
                    )}
                    <div className="cart-item-card-footer">
                      <span className="cart-item-price">
                        {product?.price?.trim() ? formatProductPrice(product.price) : 'Cena na vyžiadanie'}
                      </span>
                      <button
                        className="cart-item-remove"
                        type="button"
                        onClick={() => onRemove(id)}
                        aria-label={`Odstrániť ${product?.name ?? 'produkt'} z košíka`}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {ownerMode && <OwnerCartTools />}
            <p className="modal-product">Cena je uvedená pri každom produkte. Dopyt nie je platbou ani záväznou objednávkou.</p>
            <form className="order-form" onSubmit={submitOrder} noValidate>
              <div className="field">
                <label htmlFor="order-name">Meno a priezvisko</label>
                <input id="order-name" type="text" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Ako vás môžeme oslovovať?" autoComplete="name" disabled={createOrder.isPending} />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>
              <div className="field">
                <label htmlFor="order-phone">Telefón</label>
                <input id="order-phone" type="tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="+421 900 000 000" autoComplete="tel" disabled={createOrder.isPending} />
                {errors.phone && <span className="field-error">{errors.phone}</span>}
              </div>
              <div className="field">
                <label htmlFor="order-email">Gmail</label>
                <input id="order-email" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="vasa.adresa@gmail.com" autoComplete="email" disabled={createOrder.isPending} />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>
              <div className="field">
                <label htmlFor="order-message">Správa (voliteľná)</label>
                <textarea id="order-message" value={form.message} onChange={(event) => updateField('message', event.target.value)} placeholder="Čo by ste sa chceli opýtať?" maxLength={2000} rows={4} disabled={createOrder.isPending} />
              </div>
              {errors.form && <div className="field-error">{errors.form}</div>}
              <p className="text-xs text-muted-foreground">{featured
                ? 'Kontaktné údaje a správu odošlete majiteľovi SKALA, aby vám mohol odpovedať na dopyt.'
                : 'Kontaktné údaje a správu odošlete majiteľovi SKALA, aby mohol vybaviť spoločný dopyt.'}</p>
              <button className="form-submit" type="submit" disabled={createOrder.isPending || hasUnavailableProducts}>
                {createOrder.isPending
                  ? 'Odosielam...'
                  : featured
                    ? 'Odoslať dopyt'
                    : `Odoslať spoločný dopyt (${availableProducts.length})`} <ArrowRight size={16} />
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

function OwnerCartTools() {
  return (
    <nav className="owner-cart-tools" aria-label="Možnosti majiteľa">
      <span>Možnosti majiteľa</span>
      <Link href="/admin?tab=products">Správa produktov</Link>
      <Link href="/admin?tab=orders">Vstupné dopyty</Link>
    </nav>
  );
}
