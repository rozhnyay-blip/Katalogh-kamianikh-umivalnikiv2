import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Heart,
  MapPin,
  Phone,
  X,
} from 'lucide-react';

type Product = {
  id: string;
  name: string;
  subtitle: string;
  price: string;
  kind: string;
  images: string[];
};

const products: Product[] = [
  {
    id: 'runa',
    name: 'Руна',
    subtitle: 'сланець · 46 × 38 см',
    price: 'від 18 900 ₴',
    kind: 'колекція 01',
    images: [
      '/images/basin-runa.jpg',
      '/images/basin-detail.jpg',
      '/images/basin-lena.jpg',
    ],
  },
  {
    id: 'dnipro',
    name: 'Дніпро',
    subtitle: 'пісковик · 52 × 40 см',
    price: 'від 22 400 ₴',
    kind: 'колекція 02',
    images: [
      '/images/basin-dnipro.jpg',
      '/images/basin-runa.jpg',
      '/images/basin-detail.jpg',
      '/images/basin-ozero.jpg',
    ],
  },
  {
    id: 'skelya',
    name: 'Скеля',
    subtitle: 'граніт · 44 × 44 см',
    price: 'від 24 700 ₴',
    kind: 'колекція 03',
    images: [
      '/images/basin-skelya.jpg',
      '/images/basin-ozero.jpg',
      '/images/basin-detail.jpg',
    ],
  },
  {
    id: 'lena',
    name: 'Лена',
    subtitle: 'річковий камінь · 68 × 38 см',
    price: 'від 27 600 ₴',
    kind: 'колекція 04',
    images: [
      '/images/basin-lena.jpg',
      '/images/basin-dnipro.jpg',
      '/images/basin-runa.jpg',
    ],
  },
  {
    id: 'ozero',
    name: 'Озеро',
    subtitle: 'базальт · 48 × 42 см',
    price: 'від 21 300 ₴',
    kind: 'колекція 05',
    images: [
      '/images/basin-ozero.jpg',
      '/images/basin-skelya.jpg',
      '/images/basin-detail.jpg',
    ],
  },
  {
    id: 'bereh',
    name: 'Берег',
    subtitle: 'вапняк · 51 × 39 см',
    price: 'від 19 800 ₴',
    kind: 'колекція 06',
    images: [
      '/images/basin-detail.jpg',
      '/images/basin-dnipro.jpg',
      '/images/basin-lena.jpg',
    ],
  },
];

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? 'brand-light' : ''}`} data-testid="brand-forma-stone">
      <span className="brand-mark" aria-hidden="true" />
      <span>
        <span className="brand-word">FORMA STONE</span>
        <span className="brand-sub">український камінь · ручна робота</span>
      </span>
    </div>
  );
}

function ProductCard({
  product,
  saved,
  onToggleSaved,
  onOrder,
}: {
  product: Product;
  saved: boolean;
  onToggleSaved: (product: Product) => void;
  onOrder: (product: Product) => void;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const imageCount = product.images.length;

  const nextImage = () => setImageIndex((current) => (current + 1) % imageCount);
  const previousImage = () => setImageIndex((current) => (current - 1 + imageCount) % imageCount);

  return (
    <article className="product-card" data-testid={`card-product-${product.id}`}>
      <div className="product-media">
        <img
          className="product-image"
          src={product.images[imageIndex]}
          alt={`Умивальник ${product.name} з натурального каменю`}
          data-testid={`img-product-${product.id}`}
        />
        <span className="media-shade" aria-hidden="true" />
        <div className="product-meta-top">
          <span className="product-kind">{product.kind}</span>
          <button
            className={`save-button ${saved ? 'is-saved' : ''}`}
            type="button"
            onClick={() => onToggleSaved(product)}
            aria-label={saved ? `Прибрати ${product.name} зі збережених` : `Зберегти ${product.name}`}
            data-testid={`button-save-${product.id}`}
          >
            <Heart size={15} strokeWidth={saved ? 2.6 : 1.7} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="product-arrows">
          <button
            className="media-arrow"
            type="button"
            onClick={previousImage}
            aria-label={`Попереднє фото ${product.name}`}
            data-testid={`button-previous-${product.id}`}
          >
            <ArrowLeft size={14} />
          </button>
          <button
            className="media-arrow"
            type="button"
            onClick={nextImage}
            aria-label={`Наступне фото ${product.name}`}
            data-testid={`button-next-${product.id}`}
          >
            <ArrowRight size={14} />
          </button>
        </div>
        <span className="position-count" data-testid={`text-position-${product.id}`}>
          {String(imageIndex + 1).padStart(2, '0')} / {String(imageCount).padStart(2, '0')}
        </span>
      </div>
      <div className="product-info">
        <div>
          <h3 className="product-name" data-testid={`text-product-name-${product.id}`}>{product.name}</h3>
          <p className="product-details">{product.subtitle}</p>
          <button className="order-link" type="button" onClick={() => onOrder(product)} data-testid={`button-order-${product.id}`}>
            Замовити <ArrowRight size={14} />
          </button>
        </div>
        <span className="product-price">{product.price}</span>
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

  const updateField = (field: 'name' | 'phone' | 'email', value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const submitOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (form.name.trim().length < 2) nextErrors.name = 'Вкажіть, будь ласка, ваше імʼя';
    if (!/^[+0-9\s()\-]{9,}$/.test(form.phone.trim())) nextErrors.phone = 'Введіть коректний номер телефону';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Введіть коректну Gmail-адресу';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setSubmitted(true);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="order-modal" role="dialog" aria-modal="true" aria-labelledby="order-title" data-testid="modal-order">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Закрити форму" data-testid="button-close-order">
          <X size={19} />
        </button>
        {submitted ? (
          <div className="success-state" data-testid="status-order-success">
            <div className="success-mark"><Check size={25} /></div>
            <h2 className="display">Заявку прийнято</h2>
            <p>Ми зв’яжемося з вами протягом робочого дня, щоб розповісти більше про «{product.name}».</p>
            <button className="button-primary" type="button" onClick={onClose} data-testid="button-finish-order">Повернутися до каталогу</button>
          </div>
        ) : (
          <>
            <span className="eyebrow">запит на виріб</span>
            <h2 className="display modal-title" id="order-title">Ваш камінь —<br /><em>{product.name}</em></h2>
            <p className="modal-product">Обрано: {product.name} · {product.subtitle} · {product.price}</p>
            <form className="order-form" onSubmit={submitOrder} noValidate>
              <div className="field">
                <label htmlFor="order-name">Імʼя</label>
                <input id="order-name" type="text" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Як до вас звертатися?" autoComplete="name" data-testid="input-name" />
                {errors.name && <span className="field-error" data-testid="error-name">{errors.name}</span>}
              </div>
              <div className="field">
                <label htmlFor="order-phone">Телефон</label>
                <input id="order-phone" type="tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="+380 00 000 00 00" autoComplete="tel" data-testid="input-phone" />
                {errors.phone && <span className="field-error" data-testid="error-phone">{errors.phone}</span>}
              </div>
              <div className="field">
                <label htmlFor="order-email">Gmail</label>
                <input id="order-email" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="ваша адреса@gmail.com" autoComplete="email" data-testid="input-gmail" />
                {errors.email && <span className="field-error" data-testid="error-gmail">{errors.email}</span>}
              </div>
              <button className="form-submit" type="submit" data-testid="button-submit-order">Надіслати запит <ArrowRight size={16} /></button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

function App() {
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = window.localStorage.getItem('forma-stone-saved');
    if (!stored) return [];
    try {
      return JSON.parse(stored) as string[];
    } catch {
      window.localStorage.removeItem('forma-stone-saved');
      return [];
    }
  });
  const [savedNotice, setSavedNotice] = useState('');
  const [orderProduct, setOrderProduct] = useState<Product | null>(null);

  useEffect(() => {
    window.localStorage.setItem('forma-stone-saved', JSON.stringify(savedIds));
  }, [savedIds]);

  useEffect(() => {
    if (!savedNotice) return;
    const timeout = window.setTimeout(() => setSavedNotice(''), 2400);
    return () => window.clearTimeout(timeout);
  }, [savedNotice]);

  const toggleSaved = (product: Product) => {
    const isSaved = savedIds.includes(product.id);
    setSavedIds((current) => isSaved ? current.filter((id) => id !== product.id) : [...current, product.id]);
    setSavedNotice(isSaved ? `${product.name} прибрано зі збережених` : `${product.name} збережено для вас`);
  };

  return (
    <div className="site-shell">
      <div className="topline">
        <div className="container-wide topline-inner">
          <span>Камінь, який памʼятає воду</span>
          <span className="topline-note">Виготовлення в Україні · доставка по всій країні</span>
        </div>
      </div>

      <header className="container-wide nav">
        <a className="brand" href="#початок" data-testid="link-home"><Brand /></a>
        <nav className="nav-links" aria-label="Основна навігація">
          <a href="#каталог" data-testid="link-catalog">Каталог</a>
          <a href="#майстерня" data-testid="link-workshop">Майстерня</a>
          <a href="#деталі" data-testid="link-details">Догляд</a>
        </nav>
        <div className="nav-contact">
          <a className="nav-phone" href="tel:+380671842610" data-testid="link-phone">+38 067 184 26 10</a>
          <a className="round-button" href="#контакти" aria-label="Контакти" data-testid="link-contact"><Phone size={15} /></a>
        </div>
      </header>

      <main>
        <section className="hero container-wide" id="початок">
          <div className="hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">форма · камінь · вода</span>
              <h1 className="display hero-title">Річка<br />у вашій <em>ванній.</em></h1>
              <p className="hero-lede">Ми знаходимо камінь у руслах українських річок і даємо йому нове життя — умивальник, якого більше не буде ні в кого.</p>
              <div className="hero-actions">
                <a className="button-primary" href="#каталог" data-testid="link-hero-catalog">Дивитися колекцію <ArrowDownIcon /></a>
                <a className="button-quiet" href="#майстерня" data-testid="link-hero-story">Як це зроблено</a>
              </div>
            </div>
            <div className="hero-visual" aria-label="Скульптурний умивальник з річкового каменю">
              <span className="hero-index">01 — ФОРМА / ВОДА</span>
              <div className="hero-orb" />
              <div className="hero-stamp"><span>100%<br />природний<br />камінь</span></div>
            </div>
          </div>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {Array.from({ length: 2 }).flatMap((_, copyIndex) => ['ручна робота', 'український камінь', 'один екземпляр', 'спокійні ранки'].map((item) => (
              <span className="marquee-item" key={`${copyIndex}-${item}`}><span className="marquee-dot" />{item}</span>
            )))}
          </div>
        </div>

        <section className="story container-wide" id="майстерня">
          <div className="story-grid">
            <div>
              <span className="eyebrow">01 / наша майстерня</span>
              <h2 className="display story-heading">Не ідеальний.<br /><em>Справжній.</em></h2>
              <p className="story-copy">У FORMA STONE ми не виправляємо природу. Відкриваємо її — шліфуємо лінію, зберігаємо прожилки, залишаємо тактильність. Кожна форма народжується з конкретного каменю, а не навпаки.</p>
              <p className="story-note">Камінь обробляється вручну в невеликій майстерні на заході України.</p>
            </div>
            <div className="process">
              <div className="process-step">
                <span className="process-number">01 — знайти</span>
                <h3>Дати каменю час</h3>
                <p>Відбираємо валуни з природною пластикою та щільною структурою. Ніяких карʼєрних заготовок.</p>
              </div>
              <div className="process-step">
                <span className="process-number">02 — відчути</span>
                <h3>Побачити форму</h3>
                <p>Спочатку слухаємо фактуру. Потім обережно відкриваємо чашу, не стираючи характер.</p>
              </div>
              <div className="process-step">
                <span className="process-number">03 — відпустити</span>
                <h3>Передати далі</h3>
                <p>Покриваємо камінь захистом, тестуємо воду й пакуємо так, щоб він приїхав цілим.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="catalog" id="каталог">
          <div className="container-wide">
            <div className="catalog-head">
              <div>
                <span className="eyebrow">02 / готові форми</span>
                <h2 className="display catalog-title">Знайдіть свій<br /><em>берег.</em></h2>
              </div>
              <p className="catalog-intro">Шість умивальників у наявності. Кожен можна замовити саме в тій формі, яку ви бачите.</p>
            </div>
            <div className="catalog-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  saved={savedIds.includes(product.id)}
                  onToggleSaved={toggleSaved}
                  onOrder={setOrderProduct}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="details-band" id="деталі">
          <div className="container-wide details-grid">
            <div>
              <span className="eyebrow">03 / деталі, які мають значення</span>
              <h2 className="display details-title">Камінь любить<br /><em>увагу.</em></h2>
              <p className="details-text">Ми підказуємо, як подружити природний камінь з вашою ванною кімнатою. У комплекті — зрозуміла інструкція з догляду та наша підтримка після покупки.</p>
            </div>
            <dl className="spec-list">
              <div className="spec-row"><dt>Фініш</dt><dd>матовий, шовковистий</dd></div>
              <div className="spec-row"><dt>Захист</dt><dd>гідрофобне покриття</dd></div>
              <div className="spec-row"><dt>Комплектація</dt><dd>злив + інструкція</dd></div>
              <div className="spec-row"><dt>Термін виготовлення</dt><dd>від 3 до 5 тижнів</dd></div>
              <div className="spec-row"><dt>Доставка</dt><dd>Нова пошта / курʼєр</dd></div>
            </dl>
          </div>
        </section>
      </main>

      <footer className="footer" id="контакти">
        <div className="container-wide">
          <div className="footer-grid">
            <div>
              <Brand light />
              <p>Невелика майстерня натуральних умивальників. Камінь з українських річок, форма для ваших тихих ритуалів.</p>
            </div>
            <div>
              <h3>Навігація</h3>
              <div className="footer-links">
                <a href="#каталог" data-testid="footer-link-catalog">Каталог виробів</a>
                <a href="#майстерня" data-testid="footer-link-workshop">Про майстерню</a>
                <a href="#деталі" data-testid="footer-link-care">Догляд за каменем</a>
              </div>
            </div>
            <div>
              <h3>Поговорімо</h3>
              <a className="footer-contact" href="tel:+380671842610" data-testid="footer-phone">+38 067 184 26 10</a>
              <a className="footer-contact" href="mailto:hello@formastone.ua" data-testid="footer-email">hello@formastone.ua</a>
              <p><MapPin size={13} /> Львів · Україна<br />Пн–Пт, 10:00–18:00</p>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2024 FORMA STONE</span>
            <span>Камінь не повторюється. І це добре.</span>
          </div>
        </div>
      </footer>

      {savedNotice && <div className="saved-toast" role="status" data-testid="status-saved">{savedNotice}</div>}
      {orderProduct && <OrderModal product={orderProduct} onClose={() => setOrderProduct(null)} />}
    </div>
  );
}

function ArrowDownIcon() {
  return <ChevronDown size={15} />;
}

export default App;