# ProductsBackend plan

## Goal and requirements

Build a small TypeScript/Express backend for the ProductsApp iOS client. It must:

- expose a stable product model instead of coupling iOS to Fake Store API quirks;
- provide product listing/detail, case-insensitive search, five featured products, and top-rated/additional products within each category;
- accept an enquiry and send it by email;
- run locally with Node.js and Mailpit only—no paid service or account;
- keep the product source and email delivery independently replaceable; and
- fit the backend portion of a 2–3 hour challenge that also includes the iOS app.

Authentication, product writes, persistence, pagination, deployment, and an admin UI are out of scope.

## Architecture

Use a thin route → service → port/adapter flow:

```text
iOS → Express routes → CatalogueService → ProductProvider → Fake Store API
                    → EnquiryService → EmailProvider → Nodemailer/SMTP → Mailpit
```

Routes own HTTP parsing and status codes. Services own search, featured selection, category ranking, and enquiry composition. Ports are small TypeScript interfaces; adapters contain external API/SMTP details. Dependencies are constructed in one composition root so tests can inject fakes. No database or framework-heavy DI layer is needed.

## Proposed structure

```text
src/
  app.ts                    # Express configuration; no listen()
  server.ts                 # config, dependency wiring, listen()
  config.ts                 # validated environment settings
  domain/product.ts
  domain/enquiry.ts
  ports/product-provider.ts
  ports/email-provider.ts
  adapters/fake-store-product-provider.ts
  adapters/nodemailer-email-provider.ts
  services/catalogue-service.ts
  services/enquiry-service.ts
  routes/catalogue.ts
  routes/enquiries.ts
  middleware/error-handler.ts
  errors.ts
tests/
  unit/
  integration/
```

## API contracts

Base path: `/api/v1`. JSON responses use `{ "data": ... }`; errors use `{ "error": { "code": string, "message": string, "details"?: Record<string, string[]> } }`.

`Product`:

```ts
{
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  imageUrl: string;
  rating: { rate: number; count: number } | null;
}
```

| Method and path | Contract |
| --- | --- |
| `GET /health` | `200 { "status": "ok" }`; does not call dependencies. |
| `GET /api/v1/home` | `200 { data: { featuredProducts: Product[] } }`. Returns exactly five products in the order specified by `FEATURED_PRODUCT_IDS`. |
| `GET /api/v1/categories` | `200 { data: string[] }`. Returns distinct category names alphabetically for category navigation. |
| `GET /api/v1/categories/:category/products` | `200 { data: { category: string, topRated: Product[], additional: Product[] } }`. The URL-encoded category is matched case-insensitively. The first two products by rating/count/ID are `topRated`; all remaining category products are `additional`. Returns `404 CATEGORY_NOT_FOUND` when empty. |
| `GET /api/v1/products/search?q=` | `200 { data: Product[] }`. `q` is required, trimmed, capped at 100 characters, and matched case-insensitively against title and description. No matches returns an empty array. |
| `GET /api/v1/products/:id` | `200 { data: Product }`; `400 VALIDATION_ERROR`; `404 PRODUCT_NOT_FOUND`. |
| `POST /api/v1/enquiries` | Body `{ name, email, productId, message? }`; validates name (1–100 characters), email (valid shape, at most 254), optional message (at most 2,000), positive integer ID, and product existence; sends a plain-text email; returns `200 { data: { submitted: true } }`. The iOS client shows its “Thank you” state only after this response. |

Invalid input returns `400 VALIDATION_ERROR`. Upstream product failures return `502 PRODUCT_SOURCE_UNAVAILABLE`; email delivery failures return `502 EMAIL_DELIVERY_FAILED`. Unexpected failures return `500 INTERNAL_ERROR`. Do not expose stack traces or SMTP/upstream response bodies.

## Local setup target

The README must name Node.js 20+, Docker Desktop, and Xcode as prerequisites and provide this backend path:

```sh
cp .env.example .env
npm ci
docker compose up -d mailpit
npm run dev
```

Safe local defaults use backend `http://127.0.0.1:3000`, Mailpit SMTP `127.0.0.1:1025`, and Mailpit UI `http://127.0.0.1:8025`. The README must include a `/health` check, a sample enquiry, test commands, and the same backend URL for the iOS Simulator. A physical-device networking path is out of scope. The expected clean-machine setup time, excluding prerequisite installation, is under 10 minutes. Docker Compose is local development tooling, not production infrastructure.

## Implementation phases

1. **Bootstrap (10 min):** TypeScript/Vitest setup, environment example, app/server split, health route.
2. **Products (20 min):** domain types, port/adapter, normalization, featured/search/detail/category behavior, and routes.
3. **Enquiries (10 min):** enquiry validation/service and Nodemailer adapter configured for Mailpit.
4. **Critical-path tests and integration (15 min):** focused unit/Supertest coverage and a Mailpit smoke test.
5. **Submission handoff (10 min):** README commands and technology rationale, `AI_USAGE.md`, actual time log, and PR description.

Target roughly 60–65 minutes for the backend, leaving about 65 minutes for iOS, 20 minutes for end-to-end integration, and 15 minutes for documentation/review within the 2–3 hour window. Preserve the critical paths if time tightens; skip caching, generated OpenAPI, and deployment work.

## Testing strategy

- **Unit:** provider mapping and failure handling (including absent/malformed rating), configured featured ordering, search matching, deterministic ranking/category partitioning, enquiry composition, and SMTP acceptance/error mapping using fake ports.
- **Integration with Supertest:** verify the catalogue paths plus enquiry success, validation, product-not-found, and email-delivery failure through injected providers and the common error envelope. No live Fake Store or SMTP calls in the automated suite.
- **Manual smoke test:** run Mailpit locally, submit one enquiry, and inspect the message in its web UI; optionally verify the real product adapter once.
- Tests must be deterministic, restore mocks, and cover behavior rather than private implementation details.

## Required submission artifacts

- `README.md`: technology choices and rationale, setup/run/test instructions, configuration, and simulator connection.
- `DECISIONS.md`: assumptions, justified cuts, growth path, and a prioritized “another day” plan.
- `AGENTS.md` and `PLAN.md`: committed AI instructions and plan.
- `AI_USAGE.md`: tools/models, 3–5 influential prompts or moments, and mistakes caught during review.
- Actual time spent, split across planning, building, testing, and review, plus an open feature-branch PR into `main` with a useful description.
