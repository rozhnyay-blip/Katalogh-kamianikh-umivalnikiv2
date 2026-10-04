---
name: API TypeScript tests
description: Run API-server TypeScript node:test files without adding a dedicated runner dependency.
---

Bundle API-server TypeScript test entrypoints with the package's existing esbuild dependency to a temporary `.mjs` file, then run that file with `node --test`. Node 24's native type stripping did not resolve the test files' extensionless relative imports, and `tsx` is not installed.

**Why:** This keeps validation tests runnable without adding a test-runner dependency solely for the existing server tests.

**How to apply:** For tests under `artifacts/api-server/src`, run esbuild from the API server package with `--bundle --platform=node --format=esm` and write temporary output outside the workspace.