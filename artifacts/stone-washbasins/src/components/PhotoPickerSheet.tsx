import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Camera, ImagePlus, X } from 'lucide-react';
import { useFocusScope } from '../hooks/useFocusScope';

export function PhotoPickerSheet({ title, remaining, onFiles, onClose, progress, error, onRetry, onRetryUpload }: {
  title: string;
  remaining: number;
  onFiles: (files: File[]) => Promise<void>;
  onClose: () => void;
  progress?: string;
  error?: string;
  onRetry?: () => void;
  onRetryUpload?: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const id = useId();
  const busy = Boolean(progress);
  useFocusScope(ref, onClose, busy);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);
  const pick = (input: HTMLInputElement) => {
    const files = Array.from(input.files || []);
    input.value = '';
    if (files.length) void onFiles(files);
  };
  return createPortal(
    <div className="photo-sheet-backdrop" onClick={event => {
      if (!busy && event.target === event.currentTarget) onClose();
    }}>
      <section ref={ref} className="photo-sheet" role="dialog" aria-modal="true" aria-labelledby={id} aria-busy={busy}>
        <div className="photo-sheet-handle" aria-hidden="true" />
        <button className="modal-close" aria-label="Zavrieť ponuku fotografií" disabled={busy} onClick={onClose}><X size={22} /></button>
        <span className="eyebrow">Fotografie produktu</span>
        <h2 id={id}>Pridať fotografiu</h2>
        <p className="photo-sheet-product">{title}</p>
        <button className="photo-picker-button" disabled={busy || remaining <= 0 || Boolean(onRetry || onRetryUpload)} onClick={() => gallery.current?.click()}>
          <ImagePlus size={24} /><span>Pridať fotografiu<small>Vybrať z galérie telefónu</small></span>
        </button>
        <button className="photo-picker-button" disabled={busy || remaining <= 0 || Boolean(onRetry || onRetryUpload)} onClick={() => camera.current?.click()}>
          <Camera size={24} /><span>Odfotiť<small>Použiť fotoaparát</small></span>
        </button>
        <input hidden ref={gallery} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={event => pick(event.currentTarget)} />
        <input hidden ref={camera} type="file" capture="environment" accept="image/jpeg,image/png,image/webp" onChange={event => pick(event.currentTarget)} />
        <p className="photo-quality-note">Originál zostane v plnej kvalite. Pre telefóny sa automaticky pripraví ostrá, menšia verzia bez orezania.</p>
        <p className="photo-quality-note">{remaining > 0 ? `Ešte ${remaining} fotografií · JPEG, PNG, WebP · do 10 MB` : 'Dosiahli ste maximum 10 fotografií. Staršie fotografie môžete odstrániť v správe produktu.'}</p>
        {progress && <p role="status" className="photo-upload-status">{progress}</p>}
        {error && <p role="alert" className="field-error">{error}</p>}
        {onRetry && <button className="button-primary" disabled={busy} onClick={onRetry}>Skúsiť uložiť fotografie znova</button>}
        {!onRetry && onRetryUpload && <button className="button-primary" disabled={busy} onClick={onRetryUpload}>Skúsiť nahrať fotografie znova</button>}
      </section>
    </div>,
    document.body,
  );
}