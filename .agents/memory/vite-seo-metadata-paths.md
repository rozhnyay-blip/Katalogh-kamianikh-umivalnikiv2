---
name: Vite SEO metadata paths
description: Vite HTML URL rewriting for social metadata and icons when an artifact is mounted under a base path.
---

Vite's HTML build can prefix leading-slash URLs used by Open Graph image metadata and favicon links with the configured artifact base path. Post-build SEO URL handling must recognize that prefix as well as the unprefixed path.

**Why:** A root-path build passed while a path-prefixed build kept the social image URL relative; crawlers need absolute URLs at the deployed mount.

**How to apply:** Validate SEO output with a non-root `BASE_PATH` and confirm canonical, Open Graph image, favicon, sitemap, and robots paths all match the deployed mount.
