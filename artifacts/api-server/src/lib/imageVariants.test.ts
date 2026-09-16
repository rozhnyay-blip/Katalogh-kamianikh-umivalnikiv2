import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";

import {
  createImageVariant,
  getOrCreateImageVariant,
  MAX_PENDING_VARIANT_JOBS,
  parseImageVariantWidth,
  VariantOverloadedError,
} from "./imageVariants";

async function createTestImage(
  width: number,
  height: number,
  orientation?: 1 | 3 | 6 | 8,
): Promise<Buffer> {
  const image = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 44, g: 93, b: 138 },
    },
  });
  if (orientation === undefined) {
    return image.png().toBuffer();
  }
  return image.withMetadata({ orientation }).jpeg().toBuffer();
}

test("image variants are webp, resize to the requested width, and do not upscale", async () => {
  const source = await createTestImage(1200, 600);
  const variant = await createImageVariant(source, 480);
  const metadata = await sharp(variant).metadata();

  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 480);
  assert.equal(metadata.height, 240);

  const smallSource = await createTestImage(120, 60);
  const smallVariant = await createImageVariant(smallSource, 480);
  const smallMetadata = await sharp(smallVariant).metadata();
  assert.equal(smallMetadata.width, 120);
  assert.equal(smallMetadata.height, 60);
});

test("image variants auto-orient EXIF images before resizing", async () => {
  const source = await createTestImage(40, 20, 6);
  const variant = await createImageVariant(source, 480);
  const metadata = await sharp(variant).metadata();

  // Orientation 6 rotates a 40x20 source to a displayed 20x40 image. The
  // output is physically oriented and no longer needs the EXIF transform.
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 20);
  assert.equal(metadata.height, 40);
  assert.notEqual(metadata.orientation, 6);
});

test("image variant widths reject unsupported values", () => {
  assert.equal(parseImageVariantWidth(undefined), undefined);
  assert.equal(parseImageVariantWidth("480"), 480);
  assert.equal(parseImageVariantWidth("1920"), 1920);
  assert.equal(parseImageVariantWidth("320"), null);
  assert.equal(parseImageVariantWidth("0480"), null);
  assert.equal(parseImageVariantWidth(["480"]), null);
});

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) {
      return;
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  throw new Error("Timed out waiting for image variant jobs");
}

test("image variants cap active work, bound pending work, and start queued source reads later", async () => {
  const source = await createTestImage(32, 16);
  const release = deferred<void>();
  let sourceReads = 0;
  const jobs = Array.from(
    { length: MAX_PENDING_VARIANT_JOBS + 2 },
    (_, index) =>
      getOrCreateImageVariant({
        objectPath: `/objects/uploads/queue-${index}`,
        verifiedGeneration: "1",
        width: 480,
        readPinnedSource: async () => {
          sourceReads += 1;
          await release.promise;
          return source;
        },
      }),
  );

  await waitFor(() => sourceReads === 2);
  assert.equal(sourceReads, 2);
  await assert.rejects(
    getOrCreateImageVariant({
      objectPath: "/objects/uploads/queue-overflow",
      verifiedGeneration: "1",
      width: 480,
      readPinnedSource: async () => {
        throw new Error("queued source should not be read");
      },
    }),
    VariantOverloadedError,
  );

  release.resolve();
  await Promise.all(jobs);
});

test("identical image variant requests share one queued job", async () => {
  const source = await createTestImage(32, 16);
  const release = deferred<void>();
  let sourceReads = 0;
  const request = {
    objectPath: "/objects/uploads/dedup",
    verifiedGeneration: "1",
    width: 480 as const,
    readPinnedSource: async () => {
      sourceReads += 1;
      await release.promise;
      return source;
    },
  };

  const first = getOrCreateImageVariant(request);
  const second = getOrCreateImageVariant(request);
  assert.strictEqual(first, second);
  await waitFor(() => sourceReads === 1);
  release.resolve();
  await Promise.all([first, second]);
  assert.equal(sourceReads, 1);
});
