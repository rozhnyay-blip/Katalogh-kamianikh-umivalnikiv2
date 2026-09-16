import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import type { File } from "@google-cloud/storage";

import { verifyImageFile } from "./imageValidation";

const tinyPng = Buffer.from(
  "89504e470d0a1a0a0000000d49484452",
  "hex",
);

function fakeFile(bytes: Buffer, contentType: string): File {
  return {
    async getMetadata() {
      return [
        {
          size: String(bytes.length),
          contentType,
          generation: "12345",
        },
      ];
    },
    createReadStream(options?: { start?: number; end?: number }) {
      assert.deepEqual(options, {
        start: 0,
        end: 15,
        validation: false,
      });
      return Readable.from([bytes.subarray(0, 16)]);
    },
  } as unknown as File;
}

test("image validation checks declared metadata and PNG magic bytes", async () => {
  const verified = await verifyImageFile(
    fakeFile(tinyPng, "image/png"),
    tinyPng.length,
    "image/png",
  );
  assert.deepEqual(verified, {
    size: tinyPng.length,
    contentType: "image/png",
    generation: "12345",
  });
});

test("image validation rejects HTML even when declared as PNG", async () => {
  const html = Buffer.from("<!doctype html><html>", "utf8");
  await assert.rejects(
    verifyImageFile(fakeFile(html, "image/png"), html.length, "image/png"),
  );
});