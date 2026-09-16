import assert from "node:assert/strict";
import test from "node:test";

import {
  mergeProductImages,
  parseOrderInput,
  parseProductInput,
  parseProductPhotosInput,
  parseUploadRequest,
  validateImagePath,
} from "./validation";

const imagePath = "/objects/uploads/123e4567-e89b-12d3-a456-426614174000";
const secondImagePath =
  "/objects/uploads/123e4567-e89b-12d3-a456-426614174001";

test("product validation trims bounded text and accepts catalog fields", () => {
  const product = parseProductInput({
    available: false,
    name: "  Stone basin  ",
    subtitle: "  Hand-finished  ",
    price: "  1200 EUR ",
    kind: "  stone ",
    images: [imagePath],
  });

  assert.deepEqual(product, {
    available: false,
    name: "Stone basin",
    subtitle: "Hand-finished",
    price: "1200 EUR",
    kind: "stone",
    images: [imagePath],
  });
});

test("product validation rejects duplicate, remote, and overlong image/text input", () => {
  assert.equal(
    parseProductInput({
      available: true,
      name: "Basin",
      subtitle: "A".repeat(501),
      price: "1200",
      kind: "stone",
      images: [imagePath],
    }),
    null,
  );
  assert.equal(
    parseProductInput({
      available: true,
      name: "Basin",
      subtitle: "Description",
      price: "1200",
      kind: "stone",
      images: [imagePath, imagePath],
    }),
    null,
  );
  assert.equal(validateImagePath("https://example.test/image.png"), false);
  assert.equal(validateImagePath("/tmp/image.png"), false);
});

test("append photo validation and merge are idempotent and enforce ten images", () => {
  assert.deepEqual(parseProductPhotosInput({ images: [imagePath] }), {
    images: [imagePath],
  });
  assert.equal(
    parseProductPhotosInput({ images: [imagePath, imagePath] }),
    null,
  );
  assert.equal(
    parseProductPhotosInput({ images: ["https://example.test/photo.png"] }),
    null,
  );

  assert.deepEqual(mergeProductImages([imagePath], [imagePath]), [imagePath]);
  assert.deepEqual(
    mergeProductImages([imagePath], [secondImagePath, imagePath]),
    [imagePath, secondImagePath],
  );
  assert.equal(
    mergeProductImages(
      Array.from(
        { length: 9 },
        (_, index) =>
          `/objects/uploads/123e4567-e89b-12d3-a456-4266141740${index}`,
      ),
      [imagePath, secondImagePath],
    ),
    null,
  );
});

test("order validation requires 7 to 15 decimal digits in the phone", () => {
  const valid = parseOrderInput({
    productId: 1,
    name: "Customer",
    phone: "+421 900 123 456",
    email: "customer@example.test",
  });
  assert.equal(valid?.phone, "+421 900 123 456");

  assert.equal(
    parseOrderInput({
      productId: 1,
      name: "Customer",
      phone: "123456",
      email: "customer@example.test",
    }),
    null,
  );
  assert.equal(
    parseOrderInput({
      productId: 1,
      name: "Customer",
      phone: "1234567890123456",
      email: "customer@example.test",
    }),
    null,
  );
});

test("upload validation enforces image type and 10 MiB size limit", () => {
  assert.deepEqual(
    parseUploadRequest({
      name: "basin.png",
      size: 68,
      contentType: "image/png",
    }),
    { name: "basin.png", size: 68, contentType: "image/png" },
  );
  assert.equal(
    parseUploadRequest({
      name: "basin.svg",
      size: 68,
      contentType: "image/svg+xml",
    }),
    null,
  );
  assert.equal(
    parseUploadRequest({
      name: "basin.png",
      size: 10 * 1024 * 1024 + 1,
      contentType: "image/png",
    }),
    null,
  );
});