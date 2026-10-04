import {
  AppendProductPhotosBody,
  CreateOrderBody,
  CreateProductBody,
  RequestUploadUrlBody,
  UpdateProductBody,
} from "@workspace/api-zod";

import { MAX_IMAGE_BYTES } from "./imageValidation";

const PRODUCT_FIELDS = [
  "available",
  "name",
  "subtitle",
  "price",
  "kind",
  "images",
] as const;

export const MAX_CATALOG_PRODUCTS = 1000;

export function canCreateCatalogProduct(productCount: number): boolean {
  return Number.isSafeInteger(productCount)
    && productCount >= 0
    && productCount < MAX_CATALOG_PRODUCTS;
}

const PRODUCT_IMAGE_PATH =
  /^\/objects\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type ValidatedProduct = {
  available: boolean;
  name: string;
  subtitle: string;
  price: string;
  kind: string;
  images: string[];
};

export type ValidatedProductUpdate = Partial<ValidatedProduct> & {
  hasChanges: boolean;
};

export type ValidatedProductPhotos = {
  images: string[];
};

export function parsePositiveIntegerParam(value: unknown): number | null {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function hasOnlyProductFields(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return Object.keys(value).every((key) =>
    (PRODUCT_FIELDS as readonly string[]).includes(key),
  );
}

function validateProductText(
  value: string,
  maxLength: number,
): string | null {
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= maxLength ? trimmed : null;
}

export function parseProductInput(value: unknown): ValidatedProduct | null {
  if (!hasOnlyProductFields(value)) {
    return null;
  }
  const parsed = CreateProductBody.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  const name = validateProductText(parsed.data.name, 200);
  const subtitle = validateProductText(parsed.data.subtitle, 500);
  const price = validateProductText(parsed.data.price, 200);
  const kind = validateProductText(parsed.data.kind, 200);
  const images = validateImagePaths(parsed.data.images);
  if (!name || !subtitle || !price || !kind || !images) {
    return null;
  }

  return {
    available: parsed.data.available,
    name,
    subtitle,
    price,
    kind,
    images,
  };
}

export function parseProductUpdate(value: unknown): ValidatedProductUpdate | null {
  if (!hasOnlyProductFields(value)) {
    return null;
  }
  const parsed = UpdateProductBody.safeParse(value);
  if (!parsed.success || Object.keys(value).length === 0) {
    return null;
  }

  const update: ValidatedProductUpdate = { hasChanges: true };
  if (parsed.data.available !== undefined) {
    update.available = parsed.data.available;
  }
  if (parsed.data.name !== undefined) {
    const text = validateProductText(parsed.data.name, 200);
    if (!text) {
      return null;
    }
    update.name = text;
  }
  if (parsed.data.subtitle !== undefined) {
    const text = validateProductText(parsed.data.subtitle, 500);
    if (!text) {
      return null;
    }
    update.subtitle = text;
  }
  if (parsed.data.price !== undefined) {
    const text = validateProductText(parsed.data.price, 200);
    if (!text) {
      return null;
    }
    update.price = text;
  }
  if (parsed.data.kind !== undefined) {
    const text = validateProductText(parsed.data.kind, 200);
    if (!text) {
      return null;
    }
    update.kind = text;
  }
  if (parsed.data.images !== undefined) {
    const images = validateImagePaths(parsed.data.images);
    if (!images) {
      return null;
    }
    update.images = images;
  }

  return update;
}

export function parseProductPhotosInput(
  value: unknown,
): ValidatedProductPhotos | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => key !== "images")
  ) {
    return null;
  }
  const parsed = AppendProductPhotosBody.safeParse(value);
  if (!parsed.success) {
    return null;
  }
  const images = validateImagePaths(parsed.data.images);
  return images ? { images } : null;
}

/**
 * Merge append-only photo paths without changing their order. Returning null
 * means the product's ten-image limit would be exceeded.
 */
export function mergeProductImages(
  currentImages: readonly string[],
  incomingImages: readonly string[],
): string[] | null {
  const merged = [...currentImages];
  for (const image of incomingImages) {
    if (!merged.includes(image)) {
      merged.push(image);
    }
  }
  return merged.length <= 10 ? merged : null;
}

export function validateImagePath(value: string): boolean {
  return PRODUCT_IMAGE_PATH.test(value);
}

export function validateImagePaths(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) {
    return null;
  }
  if (!value.every((path): path is string => typeof path === "string")) {
    return null;
  }
  if (!value.every(validateImagePath)) {
    return null;
  }
  return new Set(value).size === value.length ? value : null;
}

export function parseOrderInput(value: unknown): {
  productId: number | null;
  productIds: number[];
  productName: string | null;
  name: string;
  phone: string;
  email: string;
  message: string | null;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const parsed = CreateOrderBody.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  const name = parsed.data.name.trim();
  const phone = parsed.data.phone.trim();
  const email = parsed.data.email.trim().toLowerCase();
  const productIds = parsed.data.productIds
    ?? (parsed.data.productId === undefined ? [] : [parsed.data.productId]);
  const productName = parsed.data.productName?.trim() ?? "";
  const message = parsed.data.message?.trim() ?? "";
  const digitCount = (phone.match(/[0-9]/g) || []).length;
  if (
    productIds.length > MAX_CATALOG_PRODUCTS
    || (productIds.length === 0 && (productName.length < 2 || productName.length > 200))
    || (productIds.length > 0 && productName.length > 0)
    || (parsed.data.productId !== undefined
      && productIds.length > 0
      && productIds[0] !== parsed.data.productId)
    || new Set(productIds).size !== productIds.length
  ) {
    return null;
  }
  if (name.length < 2 || name.length > 100) {
    return null;
  }
  if (digitCount < 7 || digitCount > 15) {
    return null;
  }
  if (!email || email.length > 254) {
    return null;
  }

  return {
    productId: productIds[0] ?? null,
    productIds,
    productName: productIds.length === 0 ? productName : null,
    name,
    phone,
    email,
    message: message || null,
  };
}

export function parseUploadRequest(value: unknown): {
  name: string;
  size: number;
  contentType: "image/jpeg" | "image/png" | "image/webp";
} | null {
  const parsed = RequestUploadUrlBody.safeParse(value);
  if (!parsed.success || !Number.isSafeInteger(parsed.data.size)) {
    return null;
  }
  const name = parsed.data.name.trim();
  if (!name || name.length > 255 || name.includes("\u0000")) {
    return null;
  }
  if (parsed.data.size > MAX_IMAGE_BYTES) {
    return null;
  }
  return { name, size: parsed.data.size, contentType: parsed.data.contentType };
}