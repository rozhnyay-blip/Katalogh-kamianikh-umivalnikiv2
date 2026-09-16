import { useRef, useState } from 'react';
import { requestUploadUrl, type UploadUrlRequestContentType } from '@workspace/api-client-react';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export function usePhotoUpload() {
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [failedFiles, setFailedFiles] = useState<File[]>([]);
  const active = useRef(false);
  const upload = async (files: File[], remaining: number) => {
    if (active.current) return { paths: [] as string[], failed: true };
    setError('');
    if (files.length > remaining) {
      setError(`Môžete pridať ešte ${remaining} fotografií. Maximum je 10 na produkt.`);
      return { paths: [] as string[], failed: true };
    }
    for (const file of files) {
      if (!TYPES.includes(file.type) || file.size === 0 || file.size > 10 * 1024 * 1024) {
        setError(!TYPES.includes(file.type)
          ? `Súbor „${file.name}“ nie je JPEG, PNG ani WebP. Na iPhone vyberte export fotografie ako JPEG.`
          : `Fotografia „${file.name}“ musí mať najviac 10 MB a nesmie byť prázdna.`);
        return { paths: [] as string[], failed: true };
      }
    }
    const paths: string[] = [];
    const failures: string[] = [];
    const retryFiles: File[] = [];
    setFailedFiles([]);
    active.current = true;
    try {
      for (const [index, file] of files.entries()) {
        setProgress(`Nahrávam fotografiu ${index + 1} z ${files.length}…`);
        try {
          const { uploadURL, objectPath } = await requestUploadUrl({
            name: file.name, size: file.size, contentType: file.type as UploadUrlRequestContentType,
          });
          // Upload the original File unchanged: no client-side recompression.
          const response = await fetch(uploadURL, {
            method: 'PUT', body: file, headers: { 'Content-Type': file.type },
            signal: AbortSignal.timeout(90_000),
          });
          if (!response.ok) throw new Error('upload');
          paths.push(objectPath);
        } catch {
          failures.push(file.name);
          retryFiles.push(file);
        }
      }
      setFailedFiles(retryFiles);
      if (failures.length) setError(`Nepodarilo sa nahrať: ${failures.join(', ')}. Fotografie zostávajú pripravené v tejto otvorenej stránke. Klepnite na opätovné nahratie; nemusíte ich vyberať ani fotiť znova.`);
      return { paths, failed: failures.length > 0 };
    } finally {
      active.current = false;
      setProgress('');
    }
  };
  return {
    upload, progress, error, failedFiles,
    clearError: () => setError(''),
    discardFailed: () => { setFailedFiles([]); setError(''); },
  };
}