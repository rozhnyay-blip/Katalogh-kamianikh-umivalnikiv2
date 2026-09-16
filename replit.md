# SKALA — Kamenné umývadlá

Slovak-language natural stone washbasin catalog with a private owner portal for product and photo management.

## Run & Operate

- Use managed workflows `artifacts/api-server: API Server` and `artifacts/stone-washbasins: web` for previews.
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Runtime configuration: database connection, managed Clerk keys, App Storage configuration, and server-only `OWNER_EMAIL`. Do not put values into source files.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/stone-washbasins/src/` — public catalog, owner portal, authentication pages, Slovak UI
- `artifacts/api-server/src/` — authenticated product, storage and enquiry endpoints
- `lib/api-spec/openapi.yaml` — API source of truth
- `lib/db/src/schema/` — database schema

## Architecture decisions

- The owner is the verified Clerk account matching server-only `OWNER_EMAIL`, never the first registered visitor. Public registration must not grant management permissions.
- Product data and enquiries persist in PostgreSQL. Photo bytes persist in App Storage; only paths/metadata go into PostgreSQL.
- Favorites are browser-local; catalog changes are shared across visitors.
- No invented stock, prices, contact details or product images. The user rejected the original demo products. Keep an honest empty state until actual owner photos are uploaded.

## Product

- Public browsing, saved items, per-product carousels (up to 10 photos), and enquiries with name, phone and email.
- Owner-only product editing, availability management, photo upload/removal/reordering and enquiry inbox.

## User preferences

- All site content, auth, owner UI, validation and accessibility labels must be Slovak. Chat language is independent of the site's language.
- Instagram: https://www.instagram.com/skala_sk_/

## Gotchas

- Workflows provide `PORT` and `BASE_PATH`. Do not create duplicate workflows or hardcode service ports in browser code.
- Clerk development and production accounts are separate. The configured owner must authenticate and verify their email in each environment they use.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
