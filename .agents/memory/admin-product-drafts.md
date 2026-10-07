---
name: Admin product drafts
description: Scope and lifecycle of unfinished new-product forms in SKALA's owner admin.
---

New-product drafts are kept in owner-scoped browser storage, not on the server. Closing or switching away keeps the draft; successfully creating the product clears it; deliberate discard requires confirmation. Drafts are available only in the same browser and account.

**Why:** Keep unfinished content recoverable without creating incomplete catalog records or expanding the product API and database.

**How to apply:** When changing draft behavior, preserve owner isolation and do not clear drafts on close. Keep the distinction between an unfinished browser draft and a saved catalog product.
