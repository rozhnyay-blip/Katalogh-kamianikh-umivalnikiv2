import { useState } from 'react';

const base = (import.meta.env.BASE_URL || '').replace(/\/$/, '');
export const originalImageUrl = (path: string) => `${base}/api/storage${path}`;
export const PRODUCT_IMAGE_SIZES = '(max-width: 620px) calc(100vw - 32px), (max-width: 900px) 70vw, min(35vw, 480px)';

/** Browser selects a sharp, uncropped variant for its screen pixel density. */
export function ProductImage({ path, alt, className, sizes = PRODUCT_IMAGE_SIZES, onLoad }: {
  path: string;
  alt: string;
  className?: string;
  sizes?: string;
  onLoad?: () => void;
}) {
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const original = originalImageUrl(path);
  return <img
    src={failedPath === path ? original : `${original}?width=960`}
    srcSet={failedPath === path ? undefined : getProductImageSrcSet(path)}
    sizes={sizes}
    alt={alt}
    className={className}
    loading="lazy"
    decoding="async"
    draggable={false}
    onError={() => setFailedPath(path)}
    onLoad={onLoad}
  />;
}

export function getProductImageSrcSet(path: string): string {
  const original = originalImageUrl(path);
  return [480, 960, 1440, 1920, 3840].map(width => `${original}?width=${width} ${width}w`).join(', ');
}

/** Warm one gallery image using the same responsive candidate the visible image will select. */
export function preloadProductImage(path: string, sizes = PRODUCT_IMAGE_SIZES): HTMLImageElement {
  const image = new Image();
  image.decoding = 'async';
  image.sizes = sizes;
  image.srcset = getProductImageSrcSet(path);
  image.src = `${originalImageUrl(path)}?width=960`;
  return image;
}