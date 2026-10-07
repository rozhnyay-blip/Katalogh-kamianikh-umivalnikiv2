---
name: Admin product drafts
description: Scope and lifecycle of unfinished new-product forms in SKALA's owner admin.
---

New-product drafts are kept in owner-scoped browser storage, not on the server. Closing or switching away keeps the draft; successfully creating the product clears it; deliberate discard requires confirmation. Drafts are available only in the same browser and account.

The owner product editor has separate material, dimensions, and weight inputs. It combines them into the existing `subtitle` field for API compatibility and keeps unrecognized legacy subtitle text in the optional additional-details input.

**Why:** Keep unfinished content recoverable without creating incomplete catalog records or expanding the product API and database.

**How to apply:** When changing draft behavior, preserve owner isolation and do not clear drafts on close. When changing product details, keep the separate inputs, parse existing subtitles when opening old products, and preserve the current API contract unless a broader data migration is requested.
