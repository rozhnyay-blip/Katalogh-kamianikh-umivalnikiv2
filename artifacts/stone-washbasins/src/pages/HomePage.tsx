import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Heart, X, Instagram } from 'lucide-react';
import { useListProducts, useCreateOrder, useGetOwnerStatus, getGetOwnerStatusQueryKey, type Product } from '@workspace/api-client-react';
import { useAuth } from '@clerk/react';
import { Link } from 'wouter';
import { Brand } from '../components/Brand';
import { useFocusScope } from '../hooks/useFocusScope';
import { ProductImage } from '../components/ProductImage';
import { EditableProductMedia } from '../components/EditableProductMedia';

const basePath = (import.meta.env.BASE_URL || '').replace(/\/$/, '');

function getImageUrl(path: string) {
  return `${basePath}/api/storage${path}`;
}

export function HomePage() {
  const { isLoaded, userId } = useAuth();
  const { data: owner } = useGetOwnerStatus({
    query: { enabled: isLoaded, queryKey: [...getGetOwnerStatusQueryKey(), userId] },
  });
  const canEdit = Boolean(isLoaded && owner?.signedIn && owner?.isOwner);
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

  const { data: products = [], isLoading, isError, refetch } = useListProducts();

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
          <span>Kameň, ktorý si pamätá vodu</span>
          <span className="topline-note">Prírodný kameň · Ručná práca</span>
        </div>
      </div>

      <header className="container-wide nav">
        <a className="brand" href="#domov"><Brand /></a>
        <nav className="nav-links" aria-label="Hlavná navigácia">
          <a href="#katalog">Katalóg</a>
          <a href="#pribeh">Príbeh</a>
          <a href="#detaily">Detaily</a>
        </nav>
        <div className="nav-contact">
          <Link className="owner-nav-link" href="/admin">{canEdit ? 'Správa' : 'Prihlásenie majiteľa'}</Link>
          <a className="round-button" href="https://www.instagram.com/skala_sk_/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <Instagram size={16} />
          </a>
        </div>
      </header>

      <main>
        <section className="hero container-wide" id="domov">
          <div className="hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">Tvar · Kameň · Voda</span>
              <h1 className="display hero-title">Príroda<br />vo vašej <em>kúpeľni.</em></h1>
              <p className="hero-lede">Nachádzame kameň a dávame mu nový život — umývadlo, aké nebude mať nikto iný.</p>
              <div className="hero-actions">
                <a className="button-primary" href="#katalog">Pozrieť kolekciu <ChevronDown size={15} /></a>
                <a className="button-quiet" href="#pribeh">Ako to vzniká</a>
              </div>
            </div>
            <div className="hero-visual" aria-label="Skulpturálne umývadlo z prírodného kameňa">
              <span className="hero-index">01 — TVAR / VODA</span>
              <div className="hero-orb" />
              <div className="hero-stamp"><span>100%<br />prírodný<br />kameň</span></div>
            </div>
          </div>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {Array.from({ length: 2 }).flatMap((_, copyIndex) => ['ručná práca', 'prírodný kameň', 'jediný exemplár', 'pokojné rána'].map((item) => (
              <span className="marquee-item" key={`${copyIndex}-${item}`}><span className="marquee-dot" />{item}</span>
            )))}
          </div>
        </div>

        <section className="story container-wide" id="pribeh">
          <div className="story-grid">
            <div>
              <span className="eyebrow">01 / náš prístup</span>
              <h2 className="display story-heading">Nie ideálny.<br /><em>Skutočný.</em></h2>
              <p className="story-copy">V SKALA neopravujeme prírodu. Odhaľujeme ju — brúsime líniu, zachovávame žilky, ponechávame haptickosť. Každý tvar sa rodí z konkrétneho kameňa, nie naopak.</p>
              <p className="story-note">Kameň spracúvame ručne s dôrazom na detail a rešpektom k materiálu.</p>
            </div>
            <div className="process">
              <div className="process-step">
                <span className="process-number">01 — Nájsť</span>
                <h3>Dopriať kameňu čas</h3>
                <p>Vyberáme kusy s prirodzenou plasticitou a hustou štruktúrou.</p>
              </div>
              <div className="process-step">
                <span className="process-number">02 — Precítiť</span>
                <h3>Uvidieť tvar</h3>
                <p>Najskôr počúvame faktúru. Potom opatrne odhaľujeme misu bez zmazania charakteru.</p>
              </div>
              <div className="process-step">
                <span className="process-number">03 — Odovzdať</span>
                <h3>Poslať ďalej</h3>
                <p>Kameň ošetríme, otestujeme s vodou a bezpečne zabalíme na cestu k vám.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="catalog" id="katalog">
          <div className="container-wide">
            <div className="catalog-head">
              <div>
                <span className="eyebrow">02 / hotové tvary</span>
                <h2 className="display catalog-title">Nájdite svoj<br /><em>kameň.</em></h2>
              </div>
              <p className="catalog-intro">Každé umývadlo je originál. To, čo vidíte, je presne to, čo dostanete.</p>
            </div>
            {canEdit && <div className="owner-catalog-toolbar">
              <div><strong>Vaše fotografie, priamo v katalógu</strong><p>Podržte prst na fotografii alebo klepnite na Pridať fotografiu.</p></div>
              <Link className="button-primary" href="/admin?new=1">Pridať umývadlo</Link>
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
                <p>Zatiaľ tu nie sú žiadne umývadlá. Sledujte náš <a href="https://www.instagram.com/skala_sk_/" target="_blank" rel="noreferrer" className="text-[#d99c8b] hover:underline">Instagram</a> pre novinky.</p>
                {canEdit && <Link className="owner-empty-add" href="/admin?new=1">Pridať prvé umývadlo a fotografie</Link>}
              </div>
            ) : (
              <div className="catalog-grid">
                {products.map((product) => (
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
          </div>
        </section>

        <section className="details-band" id="detaily">
          <div className="container-wide details-grid">
            <div>
              <span className="eyebrow">03 / detaily, na ktorých záleží</span>
              <h2 className="display details-title">Kameň si pýta<br /><em>pozornosť.</em></h2>
              <p className="details-text">Pri výbere si pozrite fotografie, materiál a rozmery konkrétneho umývadla. Na podrobnosti o montáži, údržbe a doručení sa môžete opýtať v dopyte alebo na Instagrame.</p>
            </div>
            <dl className="spec-list">
              <div className="spec-row"><dt>Materiál a rozmery</dt><dd>Pri konkrétnom výrobku</dd></div>
              <div className="spec-row"><dt>Fotografie</dt><dd>Detail každého kusu</dd></div>
              <div className="spec-row"><dt>Príslušenstvo a montáž</dt><dd>Informácie na vyžiadanie</dd></div>
              <div className="spec-row"><dt>Dodanie</dt><dd>Podľa dohody</dd></div>
            </dl>
          </div>
        </section>
      </main>

      <footer className="footer" id="kontakty">
        <div className="container-wide">
          <div className="footer-grid">
            <div>
              <Brand light />
              <p>Umývadlá z prírodného kameňa. Tvar pre vaše každodenné rituály.</p>
            </div>
            <div>
              <h3>Navigácia</h3>
              <div className="footer-links">
                <a href="#katalog">Katalóg výrobkov</a>
                <a href="#pribeh">O nás</a>
                <a href="#detaily">Starostlivosť o kameň</a>
              </div>
            </div>
            <div>
              <h3>Sledujte nás</h3>
              <a className="footer-contact" href="https://www.instagram.com/skala_sk_/" target="_blank" rel="noopener noreferrer">@skala_sk_</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} SKALA</span>
            <span>Kameň sa neopakuje. A to je dobre.</span>
            <Link href="/admin" className="admin-link">Prihlásenie majiteľa</Link>
          </div>
        </div>
      </footer>

      {savedNotice && <div className="saved-toast" role="status">{savedNotice}</div>}
      {orderProduct && <OrderModal product={orderProduct} onClose={() => setOrderProduct(null)} />}
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
