import assert from "node:assert/strict";
import test from "node:test";

import {
  canCreateCatalogProduct,
  mergeProductImages,
  parseOrderInput,
  parseProductInput,
  parseProductPhotosInput,
  parseProductUpdate,
  parseUploadRequest,
  validateImagePath,
} from "./validation";

test("catalog creation is allowed only below the 1000-product limit", () => {
  assert.equal(canCreateCatalogProduct(999), true);
  assert.equal(canCreateCatalogProduct(1000), false);
  assert.equal(canCreateCatalogProduct(1001), false);
  assert.equal(canCreateCatalogProduct(-1), false);
});

const imagePath = "/objects/uploads/123e4567-e89b-12d3-a456-426614174000";
const secondImagePath =
  "/objects/uploads/123e4567-e89b-12d3-a456-426614174001";

test("product validation trims bounded text and accepts catalog fields", () => {
  const product = parseProductInput({
    available: false,
    availabilityMode: "in_stock",
    stockQuantity: 1,
    name: "  Stone basin  ",
    subtitle: "  Hand-finished  ",
    price: "  1200 EUR ",
    kind: "  stone ",
    images: [imagePath],
  });

  assert.deepEqual(product, {
    available: false,
    availabilityMode: "in_stock",
    stockQuantity: 1,
    name: "Stone basin",
    subtitle: "Hand-finished",
    price: "1200 EUR",
    kind: "stone",
    images: [imagePath],
  });
});

test("inventory validation requires a positive stock count or zero for made-to-order", () => {
  const base = {
    available: true,
    name: "Basin",
    subtitle: "Hand-finished",
    price: "1200 EUR",
    kind: "stone",
    images: [imagePath],
  };
  assert.deepEqual(
    parseProductInput({ ...base, availabilityMode: "in_stock", stockQuantity: 3 })?.stockQuantity,
    3,
  );
  assert.deepEqual(
    parseProductInput({ ...base, availabilityMode: "made_to_order", stockQuantity: 0 })?.availabilityMode,
    "made_to_order",
  );
  for (const inventory of [
    { availabilityMode: "in_stock", stockQuantity: 0 },
    { availabilityMode: "in_stock", stockQuantity: -1 },
    { availabilityMode: "in_stock", stockQuantity: 1.5 },
    { availabilityMode: "in_stock", stockQuantity: 10000 },
    { availabilityMode: "made_to_order", stockQuantity: 1 },
    { availabilityMode: "unknown", stockQuantity: 0 },
  ]) {
    assert.equal(parseProductInput({ ...base, ...inventory }), null);
  }
});

test("inventory updates require both fields and enforce consistent values", () => {
  assert.equal(parseProductUpdate({ availabilityMode: "in_stock" }), null);
  assert.equal(parseProductUpdate({ stockQuantity: 2 }), null);
  assert.equal(parseProductUpdate({ availabilityMode: "in_stock", stockQuantity: 0 }), null);
  assert.deepEqual(
    parseProductUpdate({ availabilityMode: "in_stock", stockQuantity: 2 }),
    { hasChanges: true, availabilityMode: "in_stock", stockQuantity: 2 },
  );
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
  assert.deepEqual(valid?.productIds, [1]);

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

test("order validation accepts a unique multi-product basket as one enquiry", () => {
  const valid = parseOrderInput({
    productId: 4,
    productIds: [4, 9, 12],
    name: "Customer",
    phone: "+421 900 123 456",
    email: "customer@example.test",
  });
  assert.deepEqual(valid?.productIds, [4, 9, 12]);

  assert.equal(
    parseOrderInput({
      productId: 4,
      productIds: [4, 4],
      name: "Customer",
      phone: "+421 900 123 456",
      email: "customer@example.test",
    }),
    null,
  );
  assert.equal(
    parseOrderInput({
      productId: 9,
      productIds: [4, 9],
      name: "Customer",
      phone: "+421 900 123 456",
      email: "customer@example.test",
    }),
    null,
  );
});

test("order validation accepts a featured-item enquiry with an optional message", () => {
  const valid = parseOrderInput({
    productName: "Umývadlo z hlavnej fotografie",
    name: "Customer",
    phone: "+421 900 123 456",
    email: "CUSTOMER@gmail.com",
    message: "  Môžete mi poslať viac informácií?  ",
  });

  assert.deepEqual(valid, {
    productId: null,
    productIds: [],
    productName: "Umývadlo z hlavnej fotografie",
    name: "Customer",
    phone: "+421 900 123 456",
    email: "customer@gmail.com",
    message: "Môžete mi poslať viac informácií?",
  });
  assert.equal(
    parseOrderInput({
      name: "Customer",
      phone: "+421 900 123 456",
      email: "customer@gmail.com",
    }),
    null,
  );
  assert.equal(
    parseOrderInput({
      productName: "Umývadlo",
      productId: 1,
      name: "Customer",
      phone: "+421 900 123 456",
      email: "customer@gmail.com",
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