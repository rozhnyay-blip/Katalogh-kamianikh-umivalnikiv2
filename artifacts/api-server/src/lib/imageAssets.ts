import { and, arrayContains, eq } from "drizzle-orm";
import type { File } from "@google-cloud/storage";

import { db, products, uploads } from "@workspace/db";

import { ObjectStorageService } from "./objectStorage";
import { verifyImageFile, type VerifiedImage } from "./imageValidation";

export class ImageAssetValidationError extends Error {
  constructor() {
    super("Invalid image asset");
    this.name = "ImageAssetValidationError";
  }
}

const objectStorageService = new ObjectStorageService();

export async function getUploadAsset(objectPath: string) {
  const [asset] = await db
    .select()
    .from(uploads)
    .where(eq(uploads.objectPath, objectPath))
    .limit(1);
  return asset;
}

async function getOwnedAndPresentImage(
  objectPath: string,
  ownerClerkId: string,
): Promise<{
  asset: NonNullable<Awaited<ReturnType<typeof getUploadAsset>>>;
  file: File;
  verified: VerifiedImage;
}> {
  const asset = await getUploadAsset(objectPath);
  if (!asset || asset.ownerClerkId !== ownerClerkId) {
    throw new ImageAssetValidationError();
  }

  let file: File;
  try {
    file = await objectStorageService.getObjectEntityFile(objectPath);
  } catch {
    throw new ImageAssetValidationError();
  }

  let verified: VerifiedImage;
  try {
    verified = await verifyImageFile(
      file,
      asset.declaredSize,
      asset.declaredContentType,
    );
  } catch {
    throw new ImageAssetValidationError();
  }

  if (
    asset.verifiedGeneration &&
    asset.verifiedGeneration !== verified.generation
  ) {
    throw new ImageAssetValidationError();
  }

  return { asset, file, verified };
}

/**
 * Validate every path before a product write. Verification is bound to the
 * object's generation; a later direct PUT to the same path is not silently
 * served as the old catalog image.
 */
export async function validateOwnedProductImages(
  objectPaths: string[],
  ownerClerkId: string,
): Promise<void> {
  for (const objectPath of objectPaths) {
    const { asset, verified } = await getOwnedAndPresentImage(
      objectPath,
      ownerClerkId,
    );

    if (
      asset.verifiedGeneration !== verified.generation ||
      asset.verifiedSize !== verified.size ||
      asset.verifiedContentType !== verified.contentType
    ) {
      await db
        .update(uploads)
        .set({
          verifiedGeneration: verified.generation,
          verifiedSize: verified.size,
          verifiedContentType: verified.contentType,
          verifiedAt: new Date(),
        })
        .where(
          and(
            eq(uploads.objectPath, objectPath),
            eq(uploads.ownerClerkId, ownerClerkId),
          ),
        );
    }
  }
}

export async function isReferencedByProduct(
  objectPath: string,
): Promise<boolean> {
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(arrayContains(products.images, [objectPath]))
    .limit(1);
  return Boolean(product);
}

/**
 * Public image serving always re-checks the stored generation and content
 * headers/magic bytes. This makes removed or replaced private objects
 * inaccessible even while an old signed upload URL remains valid.
 */
export async function getValidatedImageForServing(objectPath: string): Promise<{
  asset: NonNullable<Awaited<ReturnType<typeof getUploadAsset>>>;
  file: File;
  verified: VerifiedImage;
}> {
  const asset = await getUploadAsset(objectPath);
  if (!asset || !asset.verifiedGeneration) {
    throw new ImageAssetValidationError();
  }

  let file: File;
  try {
    file = await objectStorageService.getObjectEntityFile(objectPath);
  } catch {
    throw new ImageAssetValidationError();
  }

  let verified: VerifiedImage;
  try {
    verified = await verifyImageFile(
      file,
      asset.declaredSize,
      asset.declaredContentType,
    );
  } catch {
    throw new ImageAssetValidationError();
  }
  if (
    verified.generation !== asset.verifiedGeneration ||
    verified.size !== asset.verifiedSize ||
    verified.contentType !== asset.verifiedContentType
  ) {
    throw new ImageAssetValidationError();
  }

  return { asset, file, verified };
}

export { objectStorageService };