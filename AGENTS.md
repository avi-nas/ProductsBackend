# ProductsBackend agent guide

This repository is the standalone backend for ProductsApp. Implement only the contracts in `PLAN.md`; record deliberate contract or scope changes in `DECISIONS.md`. Favor the smallest complete solution that fits the challenge time-box.

## Conventions

- Use strict TypeScript and ES modules. Avoid `any`; narrow `unknown` at external boundaries.
- Prefer small named functions, explicit return types on exported APIs, `async`/`await`, and immutable transformations.
- Use kebab-case filenames, PascalCase types/classes, camelCase values/functions, and `UPPER_SNAKE_CASE` environment names.
- Keep `app.ts` side-effect free and do not call `listen()` outside `server.ts`.
- Use the provided stack. Do not add a database, DI framework, HTTP client, schema library, logger, or other dependency without a concrete requirement.

## Architectural boundaries

- Routes parse HTTP input, call one service operation, and translate its result; they do not call `fetch`, Nodemailer, or implement ranking/search rules.
- Services contain product discovery and enquiry use cases and depend only on domain types and ports.
- Adapters implement exactly one external concern. Fake Store response shapes must not leak outside its adapter; Nodemailer types must not leak outside the email adapter.
- Construct dependencies once in the composition root and inject them. Tests must be able to supply fake ports without network access.
- Domain models are backend-owned. Preserve the public API contract even when upstream fields are missing or extra.

## Implementation guidelines

- Read all configuration at startup, validate required values, and fail fast with a useful message. Do not read `process.env` throughout the application.
- For upstream calls, use a finite timeout, check HTTP status, parse as `unknown`, validate required fields, and normalize `rating` to a valid value or `null`.
- Return exactly five featured products. For a category, sort by the deterministic rating/count/ID rule, place the first two in `topRated`, and place every remaining same-category product in `additional`; do not rely on upstream array order.
- Validate and trim enquiry fields before looking up the product or sending mail. Escape or avoid HTML; a plain-text message is sufficient. Use a configured `from`, configured `to`, and the submitter's email only as `replyTo`.
- Keep controllers and adapters thin. Extract shared code only after a real second use; avoid speculative abstractions.

## Errors and security

- Throw/use typed application errors with stable machine codes. The centralized error middleware is the only place that formats error responses.
- Never expose stack traces, secrets, SMTP details, raw upstream payloads, or internal exception messages to clients. Log useful server-side context without enquiry message contents or email addresses.
- Reject malformed IDs, non-JSON bodies, oversized fields, and invalid email input. Configure a 16 KB JSON body limit. Never interpolate user input into headers, URLs, or logs without validation.
- Keep secrets out of source control. Commit only an `.env.example` with safe local Mailpit defaults; production values come from environment variables.
- Do not silently fall back to fabricated products or report success when email delivery fails.

## Testing expectations

- Use Vitest for unit tests and Supertest against the exported Express app for HTTP tests.
- Test the acceptance paths first: exactly five featured products, category partition/order/no overlap, positive and negative search matches, product detail success/not-found, and enquiry success/validation/provider failure. Also cover missing ratings, ordering ties, and product-source failure.
- Automated tests must never require Fake Store, Mailpit, time-sensitive data, or execution order. Inject fakes, restore mocks, and assert public responses and observable port calls.
- Before handing off implementation, run type-check, tests, and lint/format if configured. Add only tests relevant to changed behavior; do not chase coverage percentage at the expense of the time-box.

## Handoff expectations

- Keep `README.md` executable from a clean checkout: pin the Node version, document Mailpit startup and simulator URL, and verify setup in under 10 minutes.
- Maintain `AI_USAGE.md` with tools/models, 3–5 influential prompts or moments, and AI mistakes caught during review. Record actual time across planning, building, testing, and reviewing.
- Do not add production infrastructure for this exercise. If local Docker Compose is added for Mailpit, describe it as development tooling.
