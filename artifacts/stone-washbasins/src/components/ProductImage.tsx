import { useState } from 'react';

const base = (import.meta.env.BASE_URL || '').replace(/\/$/, '');
export const originalImageUrl = (path: string) => `${base}/api/storage${path}`;

/** Browser selects a sharp, uncropped variant for its screen pixel density. */
export function ProductImage({ path, alt, className, sizes = '(max-width: 620px) calc(100vw - 32px), (max-width: 900px) 70vw, 45vw' }: {
  path: string;
  alt: string;
  className?: string;
  sizes?: string;
}) {
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const original = originalImageUrl(path);
  return <img
    src={failedPath === path ? original : `${original}?width=960`}
    srcSet={failedPath === path ? undefined : [480, 960, 1440, 1920].map(width => `${original}?width=${width} ${width}w`).join(', ')}
    sizes={sizes}
    alt={alt}
    className={className}
    loading="lazy"
    decoding="async"
    draggable={false}
    onError={() => setFailedPath(path)}
  />;
}