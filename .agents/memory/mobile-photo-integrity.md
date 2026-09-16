---
name: Mobile photo integrity
description: Data-preservation constraints behind mobile camera uploads and quick catalog photo addition.
---

Keep captured or selected files until upload is confirmed, and keep uploaded paths until attachment to the product is confirmed. Require explicit confirmation before discarding unfinished work.

**Why:** A camera capture may exist only in the browser's selected File. Resetting the file input and keeping only its filename makes a failed upload unrecoverable without taking the picture again. A network failure can also arrive after a server write has succeeded.

**How to apply:** Future uploader changes must retain a retryable source, avoid requiring reselection after transient failure, and distinguish upload retry from product-attachment retry.

Treat adding photos as an idempotent server-side append rather than replacing a list assembled by the browser.

**Why:** Fetching the latest list immediately before a replacement write still loses photos when two owner tabs or devices add images concurrently.

**How to apply:** Preserve atomic append semantics and the overall photo limit across retries and concurrent additions; do not simplify the quick uploader back to read/merge/replace.