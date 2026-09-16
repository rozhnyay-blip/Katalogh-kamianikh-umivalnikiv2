---
name: Workspace catalog and Vite cache
description: Why a clean dependency tree and successful build may coexist with a React version mismatch in preview.
---

After changing React versions through the pnpm workspace catalog, do not assume a workflow restart invalidates Vite's optimized dependency cache.

**Why:** This workspace retained an older react-dom prebundle while serving the newer React package. Installed package versions matched and the production build passed, but the preview crashed.

**How to apply:** If preview reports mismatched React versions after a catalog upgrade, compare the active optimized bundle with the installed dependency tree before changing package versions again. Treat artifact-local optimized dependencies as disposable build output, not source code.