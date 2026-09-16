---
name: Owner asset imports
description: Identity requirement for agent-assisted imports into the owner-managed photo catalog.
---

Any agent-assisted catalog photo import must resolve the current configured owner to a Clerk user with a verified matching email before creating upload records.

**Why:** Storage paths and product rows can be created without a browser session, but the editor validates every image against the authenticated owner ID. An arbitrary owner marker would make imported images impossible for the real owner to edit or replace.

**How to apply:** If the current Clerk environment has no verified matching owner, stop before uploading bytes or writing product data. Ask the owner to authenticate and verify the account in that environment, then retry the import.