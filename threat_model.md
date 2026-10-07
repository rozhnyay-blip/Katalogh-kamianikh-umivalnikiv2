# Threat Model

## Project Overview

SKALA is a Slovak-language catalog for natural-stone washbasins. Visitors browse
products and submit enquiries; the owner manages catalog text, products, and
photos. The workspace uses a Vite/React frontend, an Express API, PostgreSQL
through Drizzle, Replit-managed Clerk authentication, and Replit App Storage.
The enquiry flow is not a checkout or payment system.

## Assets

- **Owner account and sessions** — compromise permits changes to the catalog,
  site content, and uploaded product photos.
- **Customer enquiries** — contact details and messages are private business
  data and must not be exposed to visitors or written to routine logs.
- **Catalog and site content** — unauthorized changes can mislead customers or
  damage the business's public presence.
- **Uploaded media** — owner photos must be validated and associated with the
  verified owner before they can be managed or published.
- **Application access** — Clerk, database, and storage credentials grant access
  to authentication, customer data, and stored assets; they belong only in
  workspace secrets and server-side code.

## Trust Boundaries

- **Visitor browser to frontend/API** — all client input is untrusted; the API
  validates it and makes authorization decisions.
- **Authenticated owner to public visitor** — owner-only product, content, and
  upload operations require server-side owner verification, not UI visibility.
- **API to PostgreSQL** — the API can read and modify business data; queries
  must remain parameterized and responses narrowly scoped.
- **API to Clerk** — session identity is verified by Clerk; the Clerk frontend
  proxy uses a server-side secret and a fixed upstream host.
- **API to App Storage** — uploads use short-lived signed URLs and server-side
  ownership/path checks.

## Scan Anchors

- Production API entry and common middleware: `artifacts/api-server/src/app.ts`.
- Highest-risk routes: `artifacts/api-server/src/routes/{orders,products,siteContent,storage}.ts`.
- Authorization, CSRF, Clerk proxy, and upload validation:
  `artifacts/api-server/src/lib/auth.ts`,
  `artifacts/api-server/src/middlewares/`,
  `artifacts/api-server/src/lib/imageValidation.ts`, and
  `artifacts/api-server/src/lib/imageAssets.ts`.
- Public catalog reads coexist with owner-protected writes; review route
  middleware when adding endpoints.
- `artifacts/mockup-sandbox/` and API-spec generation dependencies are
  development tooling, not production request handlers.

## Threat Categories

### Spoofing

An attacker could replay or forge a session to access owner functions. Protected
routes MUST rely on Clerk-verified identity and the server-side configured-owner
check, which fails closed. The client must never be trusted to assert owner
status. Clerk proxy credentials MUST remain server-side.

### Tampering

Unauthenticated or non-owner requests could alter product or site content, or
attach an attacker-controlled upload. Every write MUST validate its request
with the shared schemas, enforce owner authorization on the server, and use
parameterized database operations. Image uploads MUST be limited by size and
verified by actual file type before use. Enquiry contents are data, not
instructions or trusted business logic.

### Repudiation

Routine request logs intentionally omit bodies, credentials, and customer
contact details. Sensitive owner mutations should have a separate, minimized
audit record containing actor, operation, time, and result without copying
enquiry contents or secrets.

### Information Disclosure

Enquiries, owner-only data, session material, and storage credentials must not
be returned to public routes or included in logs and error responses. Only
deliberately public catalog content and media may be served to visitors.
Authentication cookies and authorization headers must remain redacted.

### Denial of Service

Large request bodies, repeated API calls, uploads, or oversized upstream
responses could exhaust service resources. Request bodies and image uploads
MUST remain size-limited; API routes MUST retain rate limits; and the Clerk
proxy MUST have an upstream timeout and a bound on buffered responses. Rate
limits are a baseline control, not protection from a distributed flood.

### Elevation of Privilege

The main privilege boundary is the configured owner account. Every owner
operation MUST enforce the owner check on the API, including reads of private
uploads and all create/update/delete actions. Object paths and request
parameters must not grant access to another owner's data. SQL values must be
passed through Drizzle's parameterized query APIs; secrets and production
credentials must not be committed to source control.
