---
name: Admin product drafts
description: Scope and lifecycle of unfinished new-product forms in SKALA's owner admin.
---

New-product drafts are kept in owner-scoped browser storage, not on the server. Closing or switching away keeps the draft; successfully creating the product clears it; deliberate discard requires confirmation. Drafts are available only in the same browser and account.

The owner product editor has separate material, dimensions, and weight inputs. Material is selected from Granit, Mramor, Pieskovec, or Labradorit rather than typed; an unrecognized legacy value remains selectable when editing an older product. The details are combined into the existing `subtitle` field for API compatibility, and unrecognized legacy subtitle text remains in the optional additional-details input.

**Why:** The user wants material, dimensions, and weight entered independently, and wants material chosen from presets instead of typed; browser-local drafts keep unfinished entries recoverable while the existing API continues storing the composed summary in `subtitle`.

**How to apply:** When changing draft behavior, preserve owner isolation and do not clear drafts on close. When changing product details, keep the separate inputs, parse existing subtitles when opening old products, and preserve the current API contract unless a broader data migration is requested.
