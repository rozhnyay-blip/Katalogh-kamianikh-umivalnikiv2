---
name: GitHub Pages source verification
description: Confirm which source actually publishes the public Pages site before claiming an Actions deployment is active.
---

GitHub Pages may keep publishing a branch-root site through its generated Jekyll workflow even when a separate GitHub Actions deployment workflow exists. Verify the public HTML, identify which Pages workflow produced it, and confirm the deployment workflow ran against the repository's actual default branch. A local commit is not a live change until it reaches GitHub.

**Why:** A Pages workflow that targets the wrong branch and an unpushed local change can leave the live site unchanged while local builds pass.

**How to apply:** For Pages work, inspect the deployed URL and recent Actions runs before and after the change; distinguish successful Jekyll branch deployments from the intended app build.

GitHub Pages should redirect visitors to the complete published SKALA site rather than host a separate partial catalog.

**Why:** The user explicitly asked for GitHub-page visitors to reach the full site.

**How to apply:** Keep Pages as an entry point; obtain the current production URL from deployment metadata before changing its redirect.
