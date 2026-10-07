import { createEmptyProductDetails, parseProductDetails, type ProductDetailsFields } from './productDetails';

export type ProductEditorForm = {
  name: string;
  price: string;
  kind: string;
  available: boolean;
  images: string[];
} & ProductDetailsFields;

export type NewProductDraft = {
  form: ProductEditorForm;
  savedAt: number;
};

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const DRAFT_VERSION = 2;
const LEGACY_DRAFT_VERSION = 1;
const DRAFT_KEY_PREFIX = 'skala:new-product-draft:v1:';

export function createEmptyProductForm(): ProductEditorForm {
  return {
    name: '',
    price: '',
    kind: '',
    available: true,
    images: [],
    ...createEmptyProductDetails(),
  };
}

function getStorageKey(ownerId: string): string {
  return `${DRAFT_KEY_PREFIX}${encodeURIComponent(ownerId)}`;
}

function getBrowserStorage(): DraftStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isProductEditorForm(value: unknown): value is ProductEditorForm {
  if (!isRecord(value)) return false;
  return typeof value.name === 'string'
    && value.name.length <= 200
    && typeof value.price === 'string'
    && value.price.length <= 200
    && typeof value.kind === 'string'
    && value.kind.length <= 200
    && typeof value.material === 'string'
    && value.material.length <= 500
    && typeof value.dimensions === 'string'
    && value.dimensions.length <= 500
    && typeof value.weight === 'string'
    && value.weight.length <= 500
    && typeof value.additionalDetails === 'string'
    && value.additionalDetails.length <= 500
    && typeof value.available === 'boolean'
    && Array.isArray(value.images)
    && value.images.length <= 10
    && value.images.every((image) => typeof image === 'string' && image.length > 0 && image.length <= 2048);
}

function isLegacyProductEditorForm(value: unknown): value is {
  name: string;
  subtitle: string;
  price: string;
  kind: string;
  available: boolean;
  images: string[];
} {
  if (!isRecord(value)) return false;
  return typeof value.name === 'string'
    && value.name.length <= 200
    && typeof value.subtitle === 'string'
    && value.subtitle.length <= 500
    && typeof value.price === 'string'
    && value.price.length <= 200
    && typeof value.kind === 'string'
    && value.kind.length <= 200
    && typeof value.available === 'boolean'
    && Array.isArray(value.images)
    && value.images.length <= 10
    && value.images.every((image) => typeof image === 'string' && image.length > 0 && image.length <= 2048);
}

export function readNewProductDraft(
  ownerId: string,
  storage: DraftStorage | null = getBrowserStorage(),
): NewProductDraft | null {
  if (!ownerId || !storage) return null;
  try {
    const serialized = storage.getItem(getStorageKey(ownerId));
    if (!serialized || serialized.length > 30_000) return null;
    const value: unknown = JSON.parse(serialized);
    if (!isRecord(value) || typeof value.savedAt !== 'number' || !Number.isFinite(value.savedAt)) return null;
    let form: ProductEditorForm | null = null;
    if (value.version === DRAFT_VERSION && isProductEditorForm(value.form)) {
      form = value.form;
    } else if (value.version === LEGACY_DRAFT_VERSION && isLegacyProductEditorForm(value.form)) {
      form = {
        name: value.form.name,
        price: value.form.price,
        kind: value.form.kind,
        available: value.form.available,
        images: [...value.form.images],
        ...parseProductDetails(value.form.subtitle),
      };
    }
    if (!form) return null;
    return {
      form: { ...form, images: [...form.images] },
      savedAt: value.savedAt,
    };
  } catch {
    return null;
  }
}

export function saveNewProductDraft(
  ownerId: string,
  form: ProductEditorForm,
  storage: DraftStorage | null = getBrowserStorage(),
): number | null {
  if (!ownerId || !storage || !isProductEditorForm(form)) return null;
  const savedAt = Date.now();
  try {
    storage.setItem(getStorageKey(ownerId), JSON.stringify({
      version: DRAFT_VERSION,
      savedAt,
      form,
    }));
    return savedAt;
  } catch {
    return null;
  }
}

export function removeNewProductDraft(
  ownerId: string,
  storage: DraftStorage | null = getBrowserStorage(),
): boolean {
  if (!ownerId || !storage) return false;
  try {
    storage.removeItem(getStorageKey(ownerId));
    return true;
  } catch {
    return false;
  }
}
