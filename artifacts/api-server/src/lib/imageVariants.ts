import sharp from "sharp";

export const IMAGE_VARIANT_WIDTHS = [480, 960, 1440, 1920, 3840] as const;
export type ImageVariantWidth = (typeof IMAGE_VARIANT_WIDTHS)[number];

export const MAX_VARIANT_DECODE_PIXELS = 60_000_000;
export const MAX_VARIANT_CACHE_BYTES = 32 * 1024 * 1024;
export const MAX_ACTIVE_VARIANT_JOBS = 2;
export const MAX_PENDING_VARIANT_JOBS = 12;

/**
 * Returns undefined when no width was requested and null for a malformed or
 * unsupported width. Query strings are intentionally kept strict: accepting
 * arrays or coerced objects here would make duplicate query parameters
 * ambiguous.
 */
export function parseImageVariantWidth(
  value: unknown,
): ImageVariantWidth | undefined | null {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    return null;
  }

  const width = IMAGE_VARIANT_WIDTHS.find(
    (allowedWidth) => String(allowedWidth) === value,
  );
  return width ?? null;
}

/**
 * Transform an already-authorized image buffer. This function deliberately
 * has no storage or request dependencies so its pixel and orientation
 * behavior can be tested without real user objects.
 */
export async function createImageVariant(
  source: Buffer,
  width: ImageVariantWidth,
): Promise<Buffer> {
  return sharp(source, {
    limitInputPixels: MAX_VARIANT_DECODE_PIXELS,
    sequentialRead: true,
  })
    .rotate()
    .resize({
      width,
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({ quality: 88 })
    .toBuffer();
}

export class VariantOverloadedError extends Error {
  constructor() {
    super("Image variant processing is overloaded");
    this.name = "VariantOverloadedError";
    Object.setPrototypeOf(this, VariantOverloadedError.prototype);
  }
}

type VariantCacheEntry = {
  value: Buffer;
  size: number;
};

const variantCache = new Map<string, VariantCacheEntry>();
const inFlightVariants = new Map<string, Promise<Buffer>>();
const pendingVariantJobs: PendingVariantJob[] = [];
let cachedBytes = 0;
let activeVariantJobs = 0;

function cacheKey(
  objectPath: string,
  verifiedGeneration: string,
  width: ImageVariantWidth,
): string {
  return `${objectPath}\u0000${verifiedGeneration}\u0000${width}`;
}

function getCachedVariant(key: string): Buffer | undefined {
  const entry = variantCache.get(key);
  if (!entry) {
    return undefined;
  }

  // Map insertion order is the LRU order. Touching a key moves it to the
  // newest position without retaining any source/original bytes.
  variantCache.delete(key);
  variantCache.set(key, entry);
  return entry.value;
}

function cacheVariant(key: string, value: Buffer): void {
  const size = value.byteLength;
  if (size > MAX_VARIANT_CACHE_BYTES) {
    return;
  }

  const existing = variantCache.get(key);
  if (existing) {
    cachedBytes -= existing.size;
    variantCache.delete(key);
  }

  while (
    cachedBytes + size > MAX_VARIANT_CACHE_BYTES &&
    variantCache.size > 0
  ) {
    const oldestKey = variantCache.keys().next().value as string | undefined;
    if (oldestKey === undefined) {
      break;
    }
    const oldest = variantCache.get(oldestKey);
    variantCache.delete(oldestKey);
    if (oldest) {
      cachedBytes -= oldest.size;
    }
  }

  variantCache.set(key, { value, size });
  cachedBytes += size;
}

export interface ImageVariantRequest {
  objectPath: string;
  verifiedGeneration: string;
  width: ImageVariantWidth;
  readPinnedSource: () => Promise<Buffer>;
}

interface PendingVariantJob extends ImageVariantRequest {
  key: string;
  resolve: (value: Buffer) => void;
  reject: (reason?: unknown) => void;
}

function startVariantJob(job: PendingVariantJob): void {
  activeVariantJobs += 1;
  void (async () => {
    try {
      const source = await job.readPinnedSource();
      const variant = await createImageVariant(source, job.width);
      cacheVariant(job.key, variant);
      job.resolve(variant);
    } catch (error) {
      job.reject(error);
    } finally {
      activeVariantJobs -= 1;
      inFlightVariants.delete(job.key);
      startPendingVariantJobs();
    }
  })();
}

function startPendingVariantJobs(): void {
  while (
    activeVariantJobs < MAX_ACTIVE_VARIANT_JOBS &&
    pendingVariantJobs.length > 0
  ) {
    const next = pendingVariantJobs.shift();
    if (!next) {
      return;
    }
    startVariantJob(next);
  }
}

/**
 * Build a variant with bounded concurrency and per-generation in-flight
 * deduplication. There can be at most two active transforms and twelve
 * distinct pending jobs. Pending jobs retain only their source callback, so
 * original image bytes are not loaded until a slot is available.
 * Authorization and generation verification happen in the route before this
 * function is called, so the cache never becomes an ACL bypass.
 */
export function getOrCreateImageVariant({
  objectPath,
  verifiedGeneration,
  width,
  readPinnedSource,
}: ImageVariantRequest): Promise<Buffer> {
  const key = cacheKey(objectPath, verifiedGeneration, width);
  const cached = getCachedVariant(key);
  if (cached) {
    return Promise.resolve(cached);
  }

  const inFlight = inFlightVariants.get(key);
  if (inFlight) {
    return inFlight;
  }

  if (activeVariantJobs >= MAX_ACTIVE_VARIANT_JOBS) {
    if (pendingVariantJobs.length >= MAX_PENDING_VARIANT_JOBS) {
      return Promise.reject(new VariantOverloadedError());
    }
  }

  let resolve!: (value: Buffer) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<Buffer>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  const job: PendingVariantJob = {
    key,
    objectPath,
    verifiedGeneration,
    width,
    readPinnedSource,
    resolve,
    reject,
  };
  inFlightVariants.set(key, promise);

  if (activeVariantJobs < MAX_ACTIVE_VARIANT_JOBS) {
    startVariantJob(job);
  } else {
    pendingVariantJobs.push(job);
  }

  return promise;
}
