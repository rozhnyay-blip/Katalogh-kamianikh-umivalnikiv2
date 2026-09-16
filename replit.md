# FORMA STONE

Адаптивний український каталог умивальників із натурального каменю з каруселями фото, збереженням виробів і формою заявки.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/stone-washbasins/src/App.tsx` — каталог, каруселі, збереження та форма замовлення
- `artifacts/stone-washbasins/src/index.css` — візуальна система та адаптивні стилі
- `artifacts/stone-washbasins/public/images/` — локальні зображення виробів

## Architecture decisions

- Перший реліз працює без бекенду: збережені вироби зберігаються в `localStorage`, а заявка підтверджується локально.
- Каталог використовує локальні зображення, щоб прев’ю не залежало від зовнішніх CDN.
- Візуальна мова свідомо відділена від сайту-референсу: власний бренд FORMA STONE і українські тексти.

## Product

- Перегляд колекції натуральних умивальників.
- Перегортання до 10 фото в кожній картці товару стрілками.
- Збереження виробів у браузері з видимим підтвердженням.
- Форма заявки з валідацією імені, телефону та Gmail.

## User preferences

- Інтерфейс і тексти — українською мовою.

## Gotchas

- Для запуску вебартефакту потрібні змінні `PORT` і `BASE_PATH`, їх додає workflow.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
