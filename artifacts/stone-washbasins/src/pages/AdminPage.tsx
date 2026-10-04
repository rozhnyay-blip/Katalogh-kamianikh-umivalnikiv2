import { useEffect, useState, useRef } from 'react';
import { useAuth, useClerk } from '@clerk/react';
import { Redirect } from 'wouter';
import { 
  useGetOwnerStatus, 
  getGetOwnerStatusQueryKey,
  useListProducts, 
  useListOrders,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useGetSiteContent,
  useUpdateSiteContent,
  type SiteContent,
  type Product,
  type Order
} from '@workspace/api-client-react';
import { LogOut, Plus, Edit2, Trash2, X, UploadCloud, GripVertical, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { queryClient } from '../lib/queryClient';
import { getGetSiteContentQueryKey, getListProductsQueryKey, getListOrdersQueryKey } from '@workspace/api-client-react';
import { useFocusScope } from '../hooks/useFocusScope';
import { useLongPress } from '../hooks/useLongPress';
import { usePhotoUpload } from '../hooks/usePhotoUpload';
import { PhotoPickerSheet } from '../components/PhotoPickerSheet';
import { ProductImage } from '../components/ProductImage';

const basePath = (import.meta.env.BASE_URL || '').replace(/\/$/, '');
const MAX_CATALOG_PRODUCTS = 1000;

function getImageUrl(path: string) {
  return `${basePath}/api/storage${path}`;
}

export function AdminPage() {
  const { isLoaded } = useAuth();
  const { data: status, isPending: statusLoading, isError: statusError, refetch: retryStatus } = useGetOwnerStatus({
    query: {
      enabled: isLoaded,
      queryKey: getGetOwnerStatusQueryKey()
    }
  });
  const { signOut } = useClerk();
  
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'site'>('products');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdding, setIsAdding] = useState(() => new URLSearchParams(window.location.search).get('new') === '1');

  if (!isLoaded || statusLoading) return <div className="flex items-center justify-center min-h-[100dvh]">Načítavam...</div>;
  if (statusError) return <div className="flex flex-col gap-4 items-center justify-center min-h-[100dvh]"><p>Prístup sa nepodarilo overiť. Skúste to znova.</p><button className="button-primary" onClick={() => retryStatus()}>Skúsiť znova</button><a href={basePath || '/'}>Späť do katalógu</a></div>;
  
  if (!status?.signedIn) {
    return <Redirect to="/sign-in" />;
  }
  
  if (!status?.isOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-background gap-4">
        <h2 className="display text-3xl">Prístup odopretý</h2>
        <p className="text-muted-foreground">Tento účet nemá administrátorské práva.</p>
        <a className="button-quiet" href={basePath || '/'}>Späť do katalógu</a>
        <button className="button-quiet" onClick={() => signOut({ redirectUrl: basePath || "/" })}>Odhlásiť sa</button>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <a className="admin-brand" href={basePath || '/'}>SKALA</a>
        <a className="admin-nav-item" href={basePath || '/'}>Zobraziť katalóg</a>
        <nav className="admin-nav">
          <button 
            className={`admin-nav-item ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            Umývadlá
          </button>
          <button 
            className={`admin-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Dopyty
          </button>
          <button
            className={`admin-nav-item ${activeTab === 'site' ? 'active' : ''}`}
            onClick={() => setActiveTab('site')}
          >
            Obsah stránky
          </button>
        </nav>
        <div className="admin-sidebar-bottom">
          <button className="admin-nav-item" onClick={() => signOut({ redirectUrl: basePath || "/" })}>
            <LogOut size={16} /> Odhlásiť sa
          </button>
        </div>
      </aside>
      <main className="admin-content">
        {(editingProduct || isAdding) ? (
          <ProductEditor 
            product={editingProduct} 
            onClose={() => { setEditingProduct(null); setIsAdding(false); }} 
          />
        ) : (
          <>
            {activeTab === 'products' && (
              <ProductsManager 
                onAdd={() => setIsAdding(true)} 
                onEdit={(p) => setEditingProduct(p)} 
              />
            )}
            {activeTab === 'orders' && <OrdersManager />}
            {activeTab === 'site' && <SiteContentEditor />}
          </>
        )}
      </main>
    </div>
  );
}

function ProductsManager({ onAdd, onEdit }: { onAdd: () => void, onEdit: (p: Product) => void }) {
  const { data: products = [], isLoading, isError, refetch } = useListProducts();
  const deleteProduct = useDeleteProduct();

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Naozaj chcete vymazať produkt "${name}"?`)) {
      deleteProduct.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        }
      });
    }
  };

  if (isLoading) return <div>Načítavam produkty...</div>;
  if (isError) return <div className="admin-card" role="alert"><p>Nepodarilo sa načítať produkty.</p><button className="button-quiet" onClick={() => refetch()}>Skúsiť znova</button></div>;

  return (
    <div>
      <div className="admin-header">
        <h1 className="admin-title">Umývadlá</h1>
        <button
          className="button-primary"
          onClick={onAdd}
          disabled={products.length >= MAX_CATALOG_PRODUCTS}
          title={products.length >= MAX_CATALOG_PRODUCTS ? 'Dosiahli ste limit 1000 inzerátov.' : undefined}
        >
          <Plus size={16} /> Pridať umývadlo
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{products.length} / {MAX_CATALOG_PRODUCTS} inzerátov</p>
      {deleteProduct.isError && <p role="alert" className="text-destructive mb-4">Produkt sa nepodarilo vymazať. Skúste to znova.</p>}
      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Foto</th>
              <th>Názov</th>
              <th>Kolekcia</th>
              <th>Cena</th>
              <th>Stav</th>
              <th>Akcie</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td className="font-mono text-xs">{p.id}</td>
                <td>
                  {p.images[0] ? (
                    <img src={getImageUrl(p.images[0])} alt={p.name} className="w-10 h-10 object-cover rounded" />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground">0</div>
                  )}
                </td>
                <td className="font-semibold">{p.name}</td>
                <td className="text-muted-foreground">{p.kind}</td>
                <td>{p.price || '-'}</td>
                <td>
                  <span className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-wider font-mono ${p.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {p.available ? 'Dostupné' : 'Predané'}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-muted-foreground hover:text-primary transition-colors" onClick={() => onEdit(p)} title="Upraviť">
                      <Edit2 size={16} />
                    </button>
                    <button className="p-2 text-muted-foreground hover:text-destructive transition-colors" onClick={() => handleDelete(p.id, p.name)} title="Vymazať" disabled={deleteProduct.isPending}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground py-8">Zatiaľ neboli pridané žiadne produkty.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrdersManager() {
  const { data: orders = [], isLoading, isError, refetch } = useListOrders();

  if (isLoading) return <div>Načítavam dopyty...</div>;
  if (isError) return (
    <div className="admin-card text-center p-8">
      <p className="text-destructive mb-4">Nepodarilo sa načítať dopyty.</p>
      <button className="button-quiet" onClick={() => refetch()}>Skúsiť znova</button>
    </div>
  );

  return (
    <div>
      <div className="admin-header">
        <h1 className="admin-title">Dopyty</h1>
      </div>
      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Dátum</th>
              <th>Produkt</th>
              <th>Meno zákazníka</th>
              <th>Telefón</th>
              <th>E-mail</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td className="font-mono text-xs">#{o.id}</td>
                <td className="text-sm whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                <td className="font-semibold">{o.productName}</td>
                <td>{o.name}</td>
                <td className="font-mono text-sm">{o.phone}</td>
                <td className="text-sm"><a href={`mailto:${o.email}`} className="text-primary hover:underline">{o.email}</a></td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted-foreground py-8">Žiadne dopyty zatiaľ.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SiteContentEditor() {
  const { data, isLoading, isError, refetch } = useGetSiteContent();
  const updateContent = useUpdateSiteContent();
  const [form, setForm] = useState<SiteContent | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (isLoading || !form) return <div>Načítavam obsah stránky...</div>;
  if (isError) return (
    <div className="admin-card" role="alert">
      <p>Obsah stránky sa nepodarilo načítať.</p>
      <button className="button-quiet" type="button" onClick={() => refetch()}>Skúsiť znova</button>
    </div>
  );

  const updateSectionField = (section: keyof Pick<SiteContent, 'topline' | 'nav' | 'contact' | 'hero' | 'story' | 'catalog' | 'details' | 'footer'>, field: string, value: string) => {
    setForm((current) => {
      if (!current) return current;
      const sectionValue = current[section] as unknown as Record<string, unknown>;
      return { ...current, [section]: { ...sectionValue, [field]: value } } as SiteContent;
    });
    setSaved(false);
  };

  const updateMarquee = (index: number, value: string) => {
    setForm((current) => current ? { ...current, marquee: current.marquee.map((item, itemIndex) => itemIndex === index ? value : item) } : current);
    setSaved(false);
  };

  const updateStep = (index: number, field: 'number' | 'title' | 'description', value: string) => {
    setForm((current) => current ? {
      ...current,
      story: { ...current.story, steps: current.story.steps.map((step, stepIndex) => stepIndex === index ? { ...step, [field]: value } : step) },
    } : current);
    setSaved(false);
  };

  const updateSpec = (index: number, field: 'label' | 'value', value: string) => {
    setForm((current) => current ? {
      ...current,
      details: { ...current.details, specs: current.details.specs.map((spec, specIndex) => specIndex === index ? { ...spec, [field]: value } : spec) },
    } : current);
    setSaved(false);
  };

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateContent.mutate({ data: form }, {
      onSuccess: (next) => {
        setForm(next);
        setSaved(true);
        queryClient.invalidateQueries({ queryKey: getGetSiteContentQueryKey() });
      },
    });
  };

  return (
    <form className="site-content-editor" onSubmit={save}>
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Obsah stránky</h1>
          <p className="text-muted-foreground mt-2">Všetky tieto zmeny vidia návštevníci po uložení.</p>
        </div>
      </div>

      <section className="admin-card">
        <h2>Horná lišta a navigácia</h2>
        <div className="editor-grid">
          <ContentField label="Horný text" value={form.topline.tagline} onChange={(value) => updateSectionField('topline', 'tagline', value)} />
          <ContentField label="Horná poznámka" value={form.topline.note} onChange={(value) => updateSectionField('topline', 'note', value)} />
          <ContentField label="Katalóg v navigácii" value={form.nav.catalog} onChange={(value) => updateSectionField('nav', 'catalog', value)} />
          <ContentField label="Príbeh v navigácii" value={form.nav.story} onChange={(value) => updateSectionField('nav', 'story', value)} />
          <ContentField label="Detaily v navigácii" value={form.nav.details} onChange={(value) => updateSectionField('nav', 'details', value)} />
          <ContentField label="Instagram URL" value={form.nav.instagramUrl} onChange={(value) => updateSectionField('nav', 'instagramUrl', value)} type="url" />
        </div>
      </section>

      <section className="admin-card">
        <h2>Kontakt na ľavej strane</h2>
        <div className="editor-grid">
          <ContentField label="Názov kontaktu" value={form.contact.label} onChange={(value) => updateSectionField('contact', 'label', value)} />
          <ContentField label="Telefón" value={form.contact.phone} onChange={(value) => updateSectionField('contact', 'phone', value)} type="tel" />
          <ContentField label="Viber" value={form.contact.viberLabel} onChange={(value) => updateSectionField('contact', 'viberLabel', value)} />
          <ContentField label="WhatsApp" value={form.contact.whatsappLabel} onChange={(value) => updateSectionField('contact', 'whatsappLabel', value)} />
          <ContentField label="Instagram" value={form.contact.instagramLabel} onChange={(value) => updateSectionField('contact', 'instagramLabel', value)} />
        </div>
      </section>

      <section className="admin-card">
        <h2>Hlavný blok</h2>
        <div className="editor-grid">
          <ContentField label="Malý nadpis" value={form.hero.eyebrow} onChange={(value) => updateSectionField('hero', 'eyebrow', value)} />
          <ContentField label="Prvý riadok nadpisu" value={form.hero.titleLead} onChange={(value) => updateSectionField('hero', 'titleLead', value)} />
          <ContentField label="Druhý riadok nadpisu" value={form.hero.titleMiddle} onChange={(value) => updateSectionField('hero', 'titleMiddle', value)} />
          <ContentField label="Zvýraznený text nadpisu" value={form.hero.titleEmphasis} onChange={(value) => updateSectionField('hero', 'titleEmphasis', value)} />
          <ContentField label="Hlavný text" value={form.hero.lede} onChange={(value) => updateSectionField('hero', 'lede', value)} multiline />
          <ContentField label="Hlavné tlačidlo" value={form.hero.primaryCta} onChange={(value) => updateSectionField('hero', 'primaryCta', value)} />
          <ContentField label="Druhé tlačidlo" value={form.hero.secondaryCta} onChange={(value) => updateSectionField('hero', 'secondaryCta', value)} />
          <ContentField label="Popis vizuálu pre čítačky" value={form.hero.visualAria} onChange={(value) => updateSectionField('hero', 'visualAria', value)} />
          <ContentField label="Index vizuálu" value={form.hero.visualIndex} onChange={(value) => updateSectionField('hero', 'visualIndex', value)} />
          <ContentField label="Pečiatka — riadok 1" value={form.hero.stampLine1} onChange={(value) => updateSectionField('hero', 'stampLine1', value)} />
          <ContentField label="Pečiatka — riadok 2" value={form.hero.stampLine2} onChange={(value) => updateSectionField('hero', 'stampLine2', value)} />
          <ContentField label="Pečiatka — riadok 3" value={form.hero.stampLine3} onChange={(value) => updateSectionField('hero', 'stampLine3', value)} />
          <ContentField label="Cena umývadla" value={form.hero.price} onChange={(value) => updateSectionField('hero', 'price', value)} />
          <ContentField label="Rozmery umývadla" value={form.hero.dimensions} onChange={(value) => updateSectionField('hero', 'dimensions', value)} />
          <ContentField label="Hmotnosť umývadla" value={form.hero.weight} onChange={(value) => updateSectionField('hero', 'weight', value)} />
          <ContentField label="Tlačidlo objednávky" value={form.hero.orderCta} onChange={(value) => updateSectionField('hero', 'orderCta', value)} />
        </div>
      </section>

      <section className="admin-card">
        <h2>Bežiaci pás</h2>
        <div className="editor-grid">
          {form.marquee.map((item, index) => (
            <div className="field" key={`marquee-${index}`}>
              <label htmlFor={`marquee-${index}`}>Text {index + 1}</label>
              <div className="flex gap-2">
                <input id={`marquee-${index}`} value={item} onChange={(event) => updateMarquee(index, event.target.value)} />
                {form.marquee.length > 1 && <button className="button-quiet" type="button" onClick={() => setForm((current) => current ? { ...current, marquee: current.marquee.filter((_, itemIndex) => itemIndex !== index) } : current)} aria-label={`Odstrániť text ${index + 1}`}>×</button>}
              </div>
            </div>
          ))}
        </div>
        {form.marquee.length < 8 && <button className="button-quiet" type="button" onClick={() => setForm((current) => current ? { ...current, marquee: [...current.marquee, 'nový text'] } : current)}>+ Pridať text</button>}
      </section>

      <section className="admin-card">
        <h2>Príbeh a proces</h2>
        <ContentField label="Nadpis sekcie" value={form.story.eyebrow} onChange={(value) => updateSectionField('story', 'eyebrow', value)} />
        <div className="editor-grid">
          <ContentField label="Prvý riadok nadpisu" value={form.story.titleLead} onChange={(value) => updateSectionField('story', 'titleLead', value)} />
          <ContentField label="Zvýraznený riadok nadpisu" value={form.story.titleEmphasis} onChange={(value) => updateSectionField('story', 'titleEmphasis', value)} />
        </div>
        <ContentField label="Text príbehu" value={form.story.copy} onChange={(value) => updateSectionField('story', 'copy', value)} multiline />
        <ContentField label="Poznámka" value={form.story.note} onChange={(value) => updateSectionField('story', 'note', value)} multiline />
        <div className="editor-grid-wide">
          {form.story.steps.map((step, index) => (
            <div key={`step-${index}`} className="border-t border-border pt-4">
              <ContentField label={`Krok ${index + 1}`} value={step.number} onChange={(value) => updateStep(index, 'number', value)} />
              <ContentField label="Názov" value={step.title} onChange={(value) => updateStep(index, 'title', value)} />
              <ContentField label="Popis" value={step.description} onChange={(value) => updateStep(index, 'description', value)} multiline />
            </div>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <h2>Katalóg a detaily</h2>
        <div className="editor-grid">
          <ContentField label="Katalóg — malý nadpis" value={form.catalog.eyebrow} onChange={(value) => updateSectionField('catalog', 'eyebrow', value)} />
          <ContentField label="Katalóg — prvý riadok" value={form.catalog.titleLead} onChange={(value) => updateSectionField('catalog', 'titleLead', value)} />
          <ContentField label="Katalóg — zvýraznený riadok" value={form.catalog.titleEmphasis} onChange={(value) => updateSectionField('catalog', 'titleEmphasis', value)} />
          <ContentField label="Úvod katalógu" value={form.catalog.intro} onChange={(value) => updateSectionField('catalog', 'intro', value)} multiline />
          <ContentField label="Text pre vlastníka" value={form.catalog.ownerToolbarTitle} onChange={(value) => updateSectionField('catalog', 'ownerToolbarTitle', value)} />
          <ContentField label="Pomoc pre vlastníka" value={form.catalog.ownerToolbarHelp} onChange={(value) => updateSectionField('catalog', 'ownerToolbarHelp', value)} multiline />
          <ContentField label="Pridať produkt" value={form.catalog.addProductLabel} onChange={(value) => updateSectionField('catalog', 'addProductLabel', value)} />
          <ContentField label="Prázdny katalóg" value={form.catalog.emptyMessage} onChange={(value) => updateSectionField('catalog', 'emptyMessage', value)} multiline />
          <ContentField label="Pridať prvý produkt" value={form.catalog.emptyAddLabel} onChange={(value) => updateSectionField('catalog', 'emptyAddLabel', value)} />
          <ContentField label="Detaily — malý nadpis" value={form.details.eyebrow} onChange={(value) => updateSectionField('details', 'eyebrow', value)} />
          <ContentField label="Detaily — prvý riadok" value={form.details.titleLead} onChange={(value) => updateSectionField('details', 'titleLead', value)} />
          <ContentField label="Detaily — zvýraznený riadok" value={form.details.titleEmphasis} onChange={(value) => updateSectionField('details', 'titleEmphasis', value)} />
        </div>
        <ContentField label="Text detailov" value={form.details.text} onChange={(value) => updateSectionField('details', 'text', value)} multiline />
        <div className="editor-grid">
          {form.details.specs.map((spec, index) => (
            <div key={`spec-${index}`} className="border-t border-border pt-4">
              <ContentField label={`Detail ${index + 1}`} value={spec.label} onChange={(value) => updateSpec(index, 'label', value)} />
              <ContentField label="Hodnota" value={spec.value} onChange={(value) => updateSpec(index, 'value', value)} />
            </div>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <h2>Pätička</h2>
        <div className="editor-grid">
          <ContentField label="Popis" value={form.footer.description} onChange={(value) => updateSectionField('footer', 'description', value)} multiline />
          <ContentField label="Nadpis navigácie" value={form.footer.navigationTitle} onChange={(value) => updateSectionField('footer', 'navigationTitle', value)} />
          <ContentField label="Odkaz katalógu" value={form.footer.catalogLink} onChange={(value) => updateSectionField('footer', 'catalogLink', value)} />
          <ContentField label="Odkaz o nás" value={form.footer.storyLink} onChange={(value) => updateSectionField('footer', 'storyLink', value)} />
          <ContentField label="Odkaz starostlivosti" value={form.footer.detailsLink} onChange={(value) => updateSectionField('footer', 'detailsLink', value)} />
          <ContentField label="Sociálne siete — nadpis" value={form.footer.socialTitle} onChange={(value) => updateSectionField('footer', 'socialTitle', value)} />
          <ContentField label="Instagram účet" value={form.footer.socialHandle} onChange={(value) => updateSectionField('footer', 'socialHandle', value)} />
          <ContentField label="Spodný slogan" value={form.footer.bottomSlogan} onChange={(value) => updateSectionField('footer', 'bottomSlogan', value)} />
        </div>
      </section>

      <div className="admin-card editor-actions">
        {saved && <span className="editor-success" role="status">Obsah bol uložený.</span>}
        {updateContent.isError && <span className="text-destructive text-sm" role="alert">Obsah sa nepodarilo uložiť.</span>}
        <button className="button-primary" type="submit" disabled={updateContent.isPending}>{updateContent.isPending ? 'Ukladám...' : 'Uložiť celý obsah'}</button>
      </div>
    </form>
  );
}

function ContentField({ label, value, onChange, multiline = false, type = 'text' }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} /> : <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />}
    </div>
  );
}

function ProductEditor({ product, onClose }: { product: Product | null, onClose: () => void }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    subtitle: product?.subtitle || '',
    price: product?.price || '',
    kind: product?.kind || '',
    available: product?.available ?? true,
    images: product?.images || []
  });
  const [error, setError] = useState('');
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { upload, progress: uploadProgress, error: photoError, clearError, failedFiles, discardFailed } = usePhotoUpload();
  const [pickerOpen, setPickerOpen] = useState(false);
  const isUploading = Boolean(uploadProgress);
  const modalRef = useRef<HTMLDivElement>(null);

  const isSaving = createProduct.isPending || updateProduct.isPending;
  useFocusScope(modalRef, onClose, isUploading || isSaving, !pickerOpen);
  const openPicker = () => { if (!isSaving && !isUploading) { clearError(); setPickerOpen(true); } };
  const photoPress = useLongPress(openPicker, !isSaving && !isUploading);

  const handleField = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || isUploading) return;
    setError('');

    if (!form.name || !form.subtitle || !form.price || !form.kind) {
      setError('Všetky textové polia musia byť vyplnené.');
      return;
    }
    if (form.images.length === 0) {
      setError('Produkt musí mať aspoň jednu fotografiu.');
      return;
    }

    const payload = {
      name: form.name,
      subtitle: form.subtitle,
      price: form.price,
      kind: form.kind,
      available: form.available,
      images: form.images
    };

    const extractError = (err: unknown) => {
      // safe narrowing for error objects
      if (typeof err === 'object' && err !== null) {
        const e = err as { data?: { error?: string }, message?: string };
        return e.data?.error || e.message || 'Nastala chyba pri ukladaní.';
      }
      return 'Nastala chyba pri ukladaní.';
    };

    if (product) {
      updateProduct.mutate({ id: product.id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          onClose();
        },
        onError: (err) => setError(extractError(err))
      });
    } else {
      createProduct.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          onClose();
        },
        onError: (err) => setError(extractError(err))
      });
    }
  };

  const handleFiles = async (files: File[]) => {
    const result = await upload(files, 10 - form.images.length);
    setForm(prev => ({ ...prev, images: [...prev.images, ...result.paths] }));
    if (!result.failed) setPickerOpen(false);
  };

  const removeImage = (index: number) => {
    setForm(prev => {
      const copy = [...prev.images];
      copy.splice(index, 1);
      return { ...prev, images: copy };
    });
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= form.images.length) return;
    setForm(prev => {
      const copy = [...prev.images];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      return { ...prev, images: copy };
    });
  };

  const setAsCover = (index: number) => moveImage(index, 0);

  return (
    <div ref={modalRef} className="admin-card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="admin-title text-2xl">{product ? 'Upraviť produkt' : 'Pridať nový produkt'}</h2>
        <button className="modal-close relative" aria-label="Zavrieť editor" onClick={onClose} disabled={isSaving || isUploading}><X size={20} /></button>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="field">
            <label htmlFor="product-name">Názov umývadla</label>
            <input id="product-name" maxLength={200} type="text" value={form.name} onChange={e => handleField('name', e.target.value)} required disabled={isSaving || isUploading} />
          </div>
          <div className="field">
            <label htmlFor="product-subtitle">Materiál, rozmery a hmotnosť</label>
            <input id="product-subtitle" maxLength={500} type="text" placeholder="Napr. prírodný kameň · 56 × 32 × 13 cm · 40 kg" value={form.subtitle} onChange={e => handleField('subtitle', e.target.value)} required disabled={isSaving || isUploading} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="field">
              <label htmlFor="product-kind">Kolekcia alebo typ</label>
              <input id="product-kind" maxLength={200} type="text" value={form.kind} onChange={e => handleField('kind', e.target.value)} required disabled={isSaving || isUploading} />
            </div>
            <div className="field">
              <label htmlFor="product-price">Cena v EUR (so znakom €)</label>
              <input id="product-price" maxLength={200} type="text" value={form.price} onChange={e => handleField('price', e.target.value)} required disabled={isSaving || isUploading} />
            </div>
          </div>
          <div className="field flex flex-row items-center gap-3 pt-2">
            <input 
              type="checkbox" 
              id="available-check" 
              checked={form.available} 
              onChange={e => handleField('available', e.target.checked)} 
              className="w-5 h-5"
              disabled={isSaving || isUploading}
            />
            <label htmlFor="available-check" className="text-sm font-semibold m-0" style={{ cursor: 'pointer' }}>Produkt je dostupný na objednanie</label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-widest mb-3">Fotografie ({form.images.length}/10)</label>
          
          <button 
            type="button" 
            className="upload-zone" 
            onClick={openPicker}
            disabled={isUploading || isSaving || form.images.length >= 10}
            style={{ opacity: (isUploading || form.images.length >= 10) ? 0.5 : 1 }}
          >
            <UploadCloud size={32} className="text-muted-foreground" />
            <span className="text-sm font-semibold">{isUploading ? uploadProgress : 'Pridať fotografiu'}</span>
            <span className="text-xs text-muted-foreground">Galéria alebo fotoaparát · plná kvalita originálu</span>
          </button>

          <p className="photo-quality-note">Podržte prst na fotografii, ak chcete pridať ďalšiu. Poradie zmeňte potiahnutím alebo šípkami; prvá fotografia bude hlavná. Zmeny uložte tlačidlom Uložiť produkt.</p>
          <div className="upload-grid photo-press-target" {...photoPress}>
            {form.images.map((img, i) => (
              <div
                key={img}
                className={`upload-item ${draggedImageIndex === i ? 'upload-item-dragging' : ''}`}
                draggable={!isUploading && !isSaving}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', String(i));
                  setDraggedImageIndex(i);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const fromIndex = Number(event.dataTransfer.getData('text/plain'));
                  if (Number.isInteger(fromIndex)) moveImage(fromIndex, i);
                  setDraggedImageIndex(null);
                }}
                onDragEnd={() => setDraggedImageIndex(null)}
              >
                <ProductImage path={img} alt={`Fotografia ${i+1}`} sizes="160px" />
                <button type="button" className="remove-btn" aria-label={`Odstrániť fotografiu ${i + 1}`} onClick={() => removeImage(i)} disabled={isUploading || isSaving} style={{ opacity: (isUploading || isSaving) ? 0.5 : 1 }}><X size={14}/></button>
                <div className="photo-order-controls">
                  <button
                    type="button"
                    className="photo-order-button"
                    aria-label={`Posunúť fotografiu ${i + 1} dopredu`}
                    title="Posunúť dopredu"
                    onClick={() => moveImage(i, i - 1)}
                    disabled={i === 0 || isUploading || isSaving}
                  >
                    <ArrowLeft size={18} aria-hidden="true" />
                  </button>
                  {i === 0 ? (
                    <span className="cover-badge">HLAVNÁ</span>
                  ) : (
                    <button type="button" className="set-cover-button" onClick={() => setAsCover(i)} disabled={isUploading || isSaving}>
                      Nastaviť ako hlavnú
                    </button>
                  )}
                  <button
                    type="button"
                    className="photo-order-button"
                    aria-label={`Posunúť fotografiu ${i + 1} dozadu`}
                    title="Posunúť dozadu"
                    onClick={() => moveImage(i, i + 1)}
                    disabled={i === form.images.length - 1 || isUploading || isSaving}
                  >
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 pt-4 border-t border-border flex items-center justify-between">
          {error ? <span className="text-destructive text-sm">{error}</span> : <div></div>}
          <div className="flex gap-4">
            <button type="button" className="button-quiet" onClick={onClose} disabled={isSaving || isUploading}>Zrušiť</button>
            <button type="submit" className="button-primary" disabled={isSaving || isUploading}>
              {isSaving ? 'Ukladám...' : 'Uložiť produkt'}
            </button>
          </div>
        </div>
      </form>
      {pickerOpen && <PhotoPickerSheet
        title={form.name || 'Nové umývadlo'}
        remaining={10 - form.images.length}
        onFiles={handleFiles}
        onClose={() => {
          if (failedFiles.length && !window.confirm('Zahodiť fotografie, ktoré sa ešte nepodarilo nahrať?')) return;
          discardFailed();
          setPickerOpen(false);
        }}
        progress={uploadProgress}
        error={photoError}
        onRetryUpload={failedFiles.length ? () => void handleFiles(failedFiles) : undefined}
      />}
    </div>
  );
}
