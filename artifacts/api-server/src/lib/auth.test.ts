import assert from "node:assert/strict";
import test from "node:test";

import { hasVerifiedOwnerEmail } from "./auth";

test("owner predicate requires configured email and verified matching address", () => {
  const owner = "Owner@example.test";

  assert.equal(hasVerifiedOwnerEmail(undefined, []), false);
  assert.equal(
    hasVerifiedOwnerEmail(owner, [
      {
        emailAddress: "owner@example.test",
        verification: { status: "unverified" },
      },
    ]),
    false,
  );
  assert.equal(
    hasVerifiedOwnerEmail(owner, [
      {
        emailAddress: "other@example.test",
        verification: { status: "verified" },
      },
    ]),
    false,
  );
  assert.equal(
    hasVerifiedOwnerEmail(owner, [
      {
        emailAddress: "  OWNER@EXAMPLE.TEST ",
        verification: { status: "verified" },
      },
    ]),
    true,
  );
});

test("owner predicate never treats an unverified matching address as owner", () => {
  assert.equal(
    hasVerifiedOwnerEmail("owner@example.test", [
      {
        emailAddress: "owner@example.test",
        verification: null,
      },
      {
        emailAddress: "owner@example.test",
        verification: { status: "pending" },
      },
    ]),
    false,
  );
});