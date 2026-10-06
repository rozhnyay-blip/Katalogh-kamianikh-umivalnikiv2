---
name: SEO fallback visibility
description: SKALA's preference for a clean first load without a visible static SEO copy panel.
---

Do not render a visible SEO fallback text block inside the React root before the app mounts. Preserve document metadata and structured data separately.

**Why:** The user does not want the initial SEO copy panel to appear while the page loads.

**How to apply:** Keep the HTML app root empty until React mounts; do not restore visible fallback copy as a loading state.
