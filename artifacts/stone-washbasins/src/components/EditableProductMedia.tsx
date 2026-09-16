import { useRef, useState, type ReactNode } from 'react';
import { ImagePlus } from 'lucide-react';
import { appendProductPhotos, getListProductsQueryKey, type Product } from '@workspace/api-client-react';
import { queryClient } from '../lib/queryClient';
import { useLongPress } from '../hooks/useLongPress';
import { usePhotoUpload } from '../hooks/usePhotoUpload';
import { PhotoPickerSheet } from './PhotoPickerSheet';

export function EditableProductMedia({ product, canEdit, children }: { product: Product; canEdit: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { upload, progress, error: uploadError, clearError, failedFiles, discardFailed } = usePhotoUpload();
  const working = useRef(false);
  const openPicker = () => {
    if (!canEdit || working.current) return;
    setError('');
    clearError();
    setOpen(true);
  };
  const press = useLongPress(openPicker, canEdit);
  const close = () => {
    if (working.current) return;
    if ((pending.length || failedFiles.length) && !window.confirm('Niektoré fotografie ešte nie sú uložené. Zavrieť a zahodiť tieto pripravené fotografie?')) return;
    setPending([]);
    discardFailed();
    setOpen(false);
  };
  const save = async (paths: string[], closeOnSuccess: boolean) => {
    setSaving(true);
    setError('');
    try {
      // Append under a server-side row lock; retries cannot remove other photos.
      await appendProductPhotos(product.id, { images: paths });
      await queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      setPending([]);
      setNotice('Fotografie boli pridané a uložené.');
      if (closeOnSuccess) setOpen(false);
    } catch (failure) {
      const status = failure && typeof failure === 'object' && 'status' in failure ? failure.status : undefined;
      setError(status === 409
        ? 'Produkt už má maximum 10 fotografií. Odstráňte niektoré v správe produktu a skúste uloženie znova.'
        : 'Fotografie sa nepodarilo pridať k produktu. Zostávajú pripravené na opätovné uloženie. Overte prihlásenie a skúste to znova.');
    } finally {
      setSaving(false);
    }
  };
  const onFiles = async (files: File[]) => {
    if (working.current) return;
    working.current = true;
    try {
      const result = await upload(files, 10 - product.images.length);
      if (result.paths.length) {
        setPending(result.paths);
        await save(result.paths, !result.failed);
      }
    } finally { working.current = false; }
  };
  const retry = async () => {
    if (working.current) return;
    working.current = true;
    try { await save(pending, failedFiles.length === 0); } finally { working.current = false; }
  };
  return <>
    <div className={`product-media${canEdit ? ' photo-press-target' : ''}`} {...press}>
      {children}
    </div>
    {canEdit && <div className="owner-photo-tools">
      <button className="owner-add-photo" onClick={openPicker}><ImagePlus size={18} /> Pridať fotografiu</button>
      <span>Podržte prst na fotografii</span>
      {notice && <p role="status">{notice}</p>}
    </div>}
    {canEdit && open && <PhotoPickerSheet
      title={product.name}
      remaining={10 - product.images.length}
      onFiles={onFiles}
      onClose={close}
      progress={progress || (saving ? 'Ukladám fotografie k produktu…' : '')}
      error={error || uploadError}
      onRetry={pending.length ? () => void retry() : undefined}
      onRetryUpload={failedFiles.length ? () => void onFiles(failedFiles) : undefined}
    />}
  </>;
}