# ProductsBackend

Node.js/TypeScript backend for the ProductsApp iOS catalogue. Express provides a small HTTP layer; Fake Store access is isolated behind a replaceable `ProductProvider`.

Catalogue browsing is implemented. Enquiry and email behavior remains intentionally deferred.

## Prerequisites

- Node.js 20 or newer
- Docker Desktop with Docker Compose
- Xcode for the separate iOS application

## Run locally

Create the ignored development configuration from the committed reference, then start Mailpit and the API:

```sh
cp .env.example .env.dev
npm ci
docker compose up -d mailpit
npm run dev
```

Verify the backend:

```sh
curl http://127.0.0.1:3000/health
```

Expected response: `{"status":"ok"}`. Mailpit is available at <http://127.0.0.1:8025>. The iOS Simulator should use `http://127.0.0.1:3000` as its backend base URL.

## API contracts

All catalogue responses use `{ "data": ... }`. Errors use `{ "error": { "code", "message", "details"? } }`.

| Method and path | Response |
| --- | --- |
| `GET /health` | `{ "status": "ok" }` |
| `GET /api/v1/home` | `{ "data": { "featuredProducts": Product[] } }` in configured ID order |
| `GET /api/v1/categories` | `{ "data": string[] }` with distinct alphabetical categories |
| `GET /api/v1/categories/:category/products` | `{ "data": { "category", "topRated": Product[], "additional": Product[] } }` |
| `GET /api/v1/products/search?q=` | `{ "data": Product[] }`; title/description substring search, including an empty array |
| `GET /api/v1/products/:id` | `{ "data": Product }` or `PRODUCT_NOT_FOUND` |

`Product` contains `id`, `title`, `price`, `description`, `category`, `imageUrl`, and nullable `{ rate, count }` rating fields. Invalid query/path inputs return `VALIDATION_ERROR`; product-source failures return a safe `502` error.

## Verify changes

```sh
npm run typecheck
npm run build
npm test
docker compose config --quiet
```

## Environments

`APP_ENV` selects one configuration file. The supported values and scripts are:

| Environment | File | Development server | Compiled server |
| --- | --- | --- | --- |
| Development | `.env.dev` | `npm run dev` | `npm run start:dev` |
| Staging | `.env.stage` | `APP_ENV=stage npx tsx src/server.ts` | `npm run start:stage` |
| Production | `.env.prod` | Not recommended | `npm run start:prod` |

Run `npm run build` before a compiled-server command. Alternatively, set `APP_ENV` directly and use `npm start`, for example `APP_ENV=stage npm start`.

Create each required file from `.env.example` and adjust its values:

```sh
cp .env.example .env.dev
cp .env.example .env.stage
cp .env.example .env.prod
```

Set `NODE_ENV=development` in `.env.dev` and `NODE_ENV=production` in `.env.stage` and `.env.prod`; `APP_ENV` still distinguishes staging from production. Development defaults route SMTP to Mailpit at `127.0.0.1:1025` with `SMTP_SECURE=false` and blank credentials. For staging and production, configure the real `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, sender, recipient, and—when required—the `SMTP_USER`/`SMTP_PASSWORD` pair.

`FEATURED_PRODUCT_IDS` must contain exactly five distinct positive IDs, for example `1,2,3,4,5`. The home response preserves this order and startup rejects malformed configuration.

All configuration is loaded from the selected file and validated once at startup. Existing runtime variables override file values, allowing hosted environments to inject secrets. `.env.dev`, `.env.stage`, `.env.prod`, and other `.env.*` files are ignored; only `.env.example` is committed. Never commit credentials. Docker Compose is local development tooling only, not deployment infrastructure.
