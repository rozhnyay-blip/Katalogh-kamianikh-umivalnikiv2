import type { File } from "@google-cloud/storage";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export interface VerifiedImage {
  size: number;
  contentType: AllowedImageType;
  generation: string;
}

export function isAllowedImageType(
  contentType: string,
): contentType is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(contentType);
}

function detectedType(header: Buffer): AllowedImageType | null {
  if (
    header.length >= 3 &&
    header[0] === 0xff &&
    header[1] === 0xd8 &&
    header[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    header.length >= 8 &&
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    header.length >= 12 &&
    header.subarray(0, 4).toString("ascii") === "RIFF" &&
    header.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

async function readFirst16Bytes(file: File): Promise<Buffer> {
  const stream = file.createReadStream({
    start: 0,
    end: 15,
    validation: false,
  });
  const chunks: Buffer[] = [];
  let total = 0;

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };

    stream.on("data", (chunk: Buffer | Uint8Array) => {
      if (settled) {
        return;
      }
      const remaining = 16 - total;
      if (remaining <= 0) {
        stream.destroy();
        finish();
        return;
      }
      const bytes = Buffer.from(chunk).subarray(0, remaining);
      chunks.push(bytes);
      total += bytes.length;
      if (total >= 16) {
        stream.destroy();
        finish();
      }
    });
    stream.once("end", () => finish());
    stream.once("error", (error) => finish(error));
  });

  return Buffer.concat(chunks, total);
}

/**
 * Validate metadata and magic bytes while limiting content inspection to the
 * first 16 bytes. A second metadata read prevents binding a generation when a
 * direct signed PUT replaced the object while it was being inspected.
 */
export async function verifyImageFile(
  file: File,
  declaredSize: number,
  declaredContentType: string,
): Promise<VerifiedImage> {
  if (!isAllowedImageType(declaredContentType)) {
    throw new Error("Invalid image type");
  }

  const [metadataBefore] = await file.getMetadata();
  const actualSize = Number(metadataBefore.size);
  const actualContentType = String(metadataBefore.contentType || "");
  const generation = String(metadataBefore.generation || "");

  if (
    !Number.isSafeInteger(actualSize) ||
    actualSize < 1 ||
    actualSize > MAX_IMAGE_BYTES ||
    actualSize !== declaredSize ||
    actualContentType !== declaredContentType ||
    !generation
  ) {
    throw new Error("Invalid image metadata");
  }

  const header = await readFirst16Bytes(file);
  if (detectedType(header) !== declaredContentType) {
    throw new Error("Invalid image content");
  }

  const [metadataAfter] = await file.getMetadata();
  const afterGeneration = String(metadataAfter.generation || "");
  if (!afterGeneration || afterGeneration !== generation) {
    throw new Error("Image changed during validation");
  }

  return {
    size: actualSize,
    contentType: declaredContentType,
    generation,
  };
}

export function safeGenerationNumber(generation: string): number {
  const value = Number(generation);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error("Invalid object generation");
  }
  return value;
}