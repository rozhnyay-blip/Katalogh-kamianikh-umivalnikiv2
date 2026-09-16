import { useState, useRef } from 'react';
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
  type Product,
  type Order
} from '@workspace/api-client-react';
import { LogOut, Plus, Edit2, Trash2, X, UploadCloud, GripVertical, Check } from 'lucide-react';
import { queryClient } from '../lib/queryClient';
import { getListProductsQueryKey, getListOrdersQueryKey } from '@workspace/api-client-react';
import { useFocusScope } from '../hooks/useFocusScope';
import { useLongPress } from '../hooks/useLongPress';
import { usePhotoUpload } from '../hooks/usePhotoUpload';
import { PhotoPickerSheet } from '../components/PhotoPickerSheet';
import { ProductImage } from '../components/ProductImage';

const basePath = (import.meta.env.BASE_URL || '').replace(/\/$/, '');

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
  
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
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
        <button className="button-primary" onClick={onAdd}>
          <Plus size={16} /> Pridať umývadlo
        </button>
      </div>
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

  const setAsCover = (index: number) => {
    if (index === 0) return;
    setForm(prev => {
      const copy = [...prev.images];
      const [item] = copy.splice(index, 1);
      copy.unshift(item);
      return { ...prev, images: copy };
    });
  };

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
            <label htmlFor="product-subtitle">Materiál a rozmery</label>
            <input id="product-subtitle" maxLength={500} type="text" value={form.subtitle} onChange={e => handleField('subtitle', e.target.value)} required disabled={isSaving || isUploading} />
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

          <p className="photo-quality-note">Podržte prst na fotografii, ak chcete pridať ďalšiu. Nový produkt zverejníte tlačidlom Uložiť produkt.</p>
          <div className="upload-grid photo-press-target" {...photoPress}>
            {form.images.map((img, i) => (
              <div key={img} className="upload-item">
                <ProductImage path={img} alt={`Fotografia ${i+1}`} sizes="160px" />
                <button type="button" className="remove-btn" aria-label={`Odstrániť fotografiu ${i + 1}`} onClick={() => removeImage(i)} disabled={isUploading || isSaving} style={{ opacity: (isUploading || isSaving) ? 0.5 : 1 }}><X size={14}/></button>
                {i === 0 ? (
                  <div className="cover-badge">HLAVNÁ</div>
                ) : (
                  <button type="button" className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-2 py-1 rounded disabled:opacity-50" onClick={() => setAsCover(i)} disabled={isUploading || isSaving}>
                    Nastaviť ako hlavnú
                  </button>
                )}
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
