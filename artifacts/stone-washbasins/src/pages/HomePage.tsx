import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Heart, X, Instagram, MessageCircle, Plus } from 'lucide-react';
import { useListProducts, useCreateOrder, useGetOwnerStatus, getGetOwnerStatusQueryKey, useGetSiteContent, type Product } from '@workspace/api-client-react';
import { useAuth } from '@clerk/react';
import { Link } from 'wouter';
import { Brand } from '../components/Brand';
import { useFocusScope } from '../hooks/useFocusScope';
import { ProductImage } from '../components/ProductImage';
import { EditableProductMedia } from '../components/EditableProductMedia';
import { ContactDock } from '../components/ContactDock';
import { SITE_CONTENT_DEFAULTS } from '../lib/siteContentDefaults';
import { toInternationalPhoneNumber } from '../lib/phone';
import heroProductImage from '@assets/image_1789628614912.png';

const basePath = (import.meta.env.BASE_URL || '').replace(/\/$/, '');
const CATALOG_BATCH_SIZE = 20;
const MAX_CATALOG_PRODUCTS = 1000;

function getImageUrl(path: string) {
  return `${basePath}/api/storage${path}`;
}

export function HomePage() {
  const { isLoaded, userId } = useAuth();
  const { data: owner } = useGetOwnerStatus({
    query: { enabled: isLoaded, queryKey: [...getGetOwnerStatusQueryKey(), userId] },
  });
  const canEdit = Boolean(isLoaded && owner?.signedIn && owner?.isOwner);
  const { data: content = SITE_CONTENT_DEFAULTS } = useGetSiteContent();
  const [savedIds, setSavedIds] = useState<number[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = JSON.parse(window.localStorage.getItem('skala-saved') || '[]');
      return Array.isArray(stored) ? stored.filter((id): id is number => Number.isSafeInteger(id) && id > 0) : [];
    } catch {
      return [];
    }
  });
  const [savedNotice, setSavedNotice] = useState('');
  const [orderProduct, setOrderProduct] = useState<Product | null>(null);
  const [visibleProductCount, setVisibleProductCount] = useState(CATALOG_BATCH_SIZE);

  const { data: products = [], isLoading, isError, refetch } = useListProducts();
  const visibleProducts = products.slice(0, visibleProductCount);
  const orderMessage = `Dobrý deň, mám záujem o kamenné umývadlo z hlavnej stránky SKALA. Cena: ${content.hero.price}; rozmery: ${content.hero.dimensions}; hmotnosť: ${content.hero.weight}. Prosím o informácie k objednávke.`;
  const orderHref = `https://wa.me/${toInternationalPhoneNumber(content.contact.phone)}?text=${encodeURIComponent(orderMessage)}`;

  useEffect(() => {
    try {
      window.localStorage.setItem('skala-saved', JSON.stringify(savedIds));
    } catch {
      setSavedNotice('Prehliadač neumožňuje trvalé uloženie. Výber zostane uložený len počas tejto návštevy.');
    }
  }, [savedIds]);

  useEffect(() => {
    if (!savedNotice) return;
    const timeout = window.setTimeout(() => setSavedNotice(''), 2400);
    return () => window.clearTimeout(timeout);
  }, [savedNotice]);

  const toggleSaved = (product: Product) => {
    const isSaved = savedIds.includes(product.id);
    setSavedIds((current) => isSaved ? current.filter((id) => id !== product.id) : [...current, product.id]);
    setSavedNotice(isSaved ? `${product.name} odstránené z uložených` : `${product.name} uložené pre vás`);
  };

  return (
    <div className="site-shell">
      <div className="topline">
        <div className="container-wide topline-inner">
           <span>{content.topline.tagline}</span>
           <span className="topline-note">{content.topline.note}</span>
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
                 <a className="button-primary" href="#katalog">{content.hero.primaryCta} <ChevronDown size={15} /></a>
                 <a className="button-quiet" href="#pribeh">{content.hero.secondaryCta}</a>
              </div>
            </div>
            <div className="hero-visual" aria-label={content.hero.visualAria}>
               <span className="hero-index">{content.hero.visualIndex}</span>
               <img className="hero-product-image" src={heroProductImage} alt="" />
               <div className="hero-stamp"><span>{content.hero.stampLine1}<br />{content.hero.stampLine2}<br />{content.hero.stampLine3}</span></div>
              <dl className="hero-product-details" aria-label="Informácie o umývadle">
                <div><dt>Cena</dt><dd>{content.hero.price}</dd></div>
                <div><dt>Rozmery</dt><dd>{content.hero.dimensions}</dd></div>
                <div><dt>Hmotnosť</dt><dd>{content.hero.weight}</dd></div>
              </dl>
              <a className="hero-order-button" href={orderHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={18} aria-hidden="true" />
                <span>{content.hero.orderCta}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </a>
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
              </div>
               <p className="catalog-intro">{content.catalog.intro}</p>
            </div>
            {canEdit && <div className="owner-catalog-toolbar">
               <div><strong>{content.catalog.ownerToolbarTitle}</strong><p>{content.catalog.ownerToolbarHelp}</p></div>
            </div>}

            {isLoading ? (
              <div className="catalog-status">
                <p>Načítavam katalóg...</p>
              </div>
            ) : isError ? (
              <div className="catalog-status error-state">
                <p>Nepodarilo sa načítať katalóg.</p>
                <button className="button-quiet" onClick={() => refetch()}>Skúsiť znova</button>
              </div>
            ) : products.length === 0 ? (
              <div className="catalog-status">
                 <p>{content.catalog.emptyMessage}</p>
              </div>
            ) : (
              <div className="catalog-grid">
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    canEdit={canEdit}
                    saved={savedIds.includes(product.id)}
                    onToggleSaved={toggleSaved}
                    onOrder={setOrderProduct}
                  />
                ))}
              </div>
            )}
            {!isLoading && !isError && visibleProductCount < MAX_CATALOG_PRODUCTS && products.length > visibleProducts.length && (
              <button
                className="catalog-show-more"
                type="button"
                onClick={() => setVisibleProductCount((count) => Math.min(count + CATALOG_BATCH_SIZE, MAX_CATALOG_PRODUCTS))}
              >
                Zobraziť ďalších {Math.min(CATALOG_BATCH_SIZE, products.length - visibleProducts.length)} inzerátov
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
      {orderProduct && <OrderModal product={orderProduct} onClose={() => setOrderProduct(null)} />}
      <ContactDock content={content} />
    </div>
  );
}

function ProductCard({
  product,
  canEdit,
  saved,
  onToggleSaved,
  onOrder,
}: {
  product: Product;
  canEdit: boolean;
  saved: boolean;
  onToggleSaved: (product: Product) => void;
  onOrder: (product: Product) => void;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const imageCount = Math.min(product.images.length, 10);
  useEffect(() => { setImageIndex(0); }, [product.images.join('|')]);

  const nextImage = () => setImageIndex((current) => (current + 1) % imageCount);
  const previousImage = () => setImageIndex((current) => (current - 1 + imageCount) % imageCount);

  return (
    <article className={`product-card ${!product.available ? 'is-unavailable' : ''}`}>
      <EditableProductMedia product={product} canEdit={canEdit}>
        {product.images.length > 0 ? (
          <ProductImage
            className="product-image"
            path={product.images[imageIndex] || product.images[0]}
            alt={`Umývadlo ${product.name}`}
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
            <button className="media-arrow" type="button" onClick={previousImage} aria-label="Predchádzajúca fotka">
              <ArrowLeft size={14} />
            </button>
            <button className="media-arrow" type="button" onClick={nextImage} aria-label="Nasledujúca fotka">
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
      </EditableProductMedia>
      <div className="product-info">
        <div className="w-full">
          <h3 className="product-name">{product.name}</h3>
          <p className="product-details">{product.subtitle}</p>
          <div className="product-actions">
            <button 
              className="order-link quiet" 
              type="button" 
              onClick={() => onToggleSaved(product)}
            >
              {saved ? 'Uložené' : 'Uložiť'}
            </button>
            <button 
              className="order-link primary ml-auto" 
              type="button" 
              onClick={() => onOrder(product)}
              disabled={!product.available}
              style={{ opacity: product.available ? 1 : 0.5 }}
            >
              Objednať <ArrowRight size={14} />
            </button>
          </div>
        </div>
        {product.price && <span className="product-price">{product.price}</span>}
      </div>
    </article>
  );
}

function OrderModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [receiptId, setReceiptId] = useState<number | null>(null);

  const createOrder = useCreateOrder();

  const updateField = (field: 'name' | 'phone' | 'email', value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: '' }));
  };

  const submitOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createOrder.isPending) return;
    const nextErrors: Record<string, string> = {};
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
          productId: product.id,
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
        }
      }, {
        onSuccess: (receipt) => {
          setReceiptId(receipt.id);
          setSubmitted(true);
        },
        onError: () => {
          setErrors({ form: 'Nepodarilo sa odoslať objednávku. Skúste to prosím neskôr.' });
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
            <p>Váš dopyt č. {receiptId} na umývadlo „{product.name}“ bol uložený. Majiteľ vás bude kontaktovať s potvrdením dostupnosti a ďalšími informáciami. Odoslanie formulára nie je platbou ani záväznou objednávkou.</p>
            <button className="button-primary" type="button" onClick={onClose}>Späť do katalógu</button>
          </div>
        ) : (
          <>
            <span className="eyebrow">Dopyt na produkt</span>
            <h2 className="display modal-title" id="order-title">Váš kameň —<br /><em>{product.name}</em></h2>
            <p className="modal-product">Vybrané: {product.name} · {product.subtitle} {product.price ? `· ${product.price}` : ''}</p>
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
              {errors.form && <div className="field-error">{errors.form}</div>}
              <p className="text-xs text-muted-foreground">Kontaktné údaje odošlete majiteľovi SKALA, aby mohol vybaviť tento dopyt.</p>
              <button className="form-submit" type="submit" disabled={createOrder.isPending}>
                {createOrder.isPending ? 'Odosielam...' : 'Odoslať dopyt'} <ArrowRight size={16} />
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
