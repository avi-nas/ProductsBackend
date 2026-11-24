# ProductsBackend decisions

## Technical decisions

| Decision | Reason and trade-off |
| --- | --- |
| Express with TypeScript, organized by route/service/adapter | Familiar and quick for the time-box while keeping business rules separate from I/O. A larger clean-architecture or DI framework would add ceremony without useful scope. |
| `ProductProvider` and `EmailProvider` ports | Fake Store and Nodemailer/Mailpit can change independently; services and route tests use in-memory fakes. |
| Node's built-in `fetch` for Fake Store | Avoids an HTTP dependency. The adapter checks status, timeout/abort, and runtime response shape before mapping to the domain model. |
| A backend-owned product DTO | The iOS contract stays stable. `image` becomes `imageUrl`, and undocumented upstream `rating` is represented as nullable rather than assumed present. |
| Compute discovery features in memory | The upstream dataset is currently 20 products, so local search and category ranking are simpler and deterministic. This will not scale to a large catalog. |
| Featured products are configured IDs | `FEATURED_PRODUCT_IDS` contains exactly five distinct positive IDs. Home preserves configured order and fails explicitly if an ID is absent, supporting deliberate merchandising without persistence. |
| A category has two top-rated products | Sort products within the selected category using the same rating/count/ID rule; expose the first two as `topRated` and the remainder as `additional`. Two ensures the current four-product categories still satisfy both parts of the acceptance criterion. |
| Nodemailer over SMTP, Mailpit locally | Matches the required stack and needs no account. The endpoint waits for SMTP acceptance, returns `200`, and lets the client show “Thank you”; acceptance is not proof that a person read the email. |
| No persistence | Enquiries are email-only and product data remains upstream-owned. Adding a database is not justified by the challenge. |

## Evidence and assumptions

- The supplied OpenAPI 3.1 document defines product `id`, `title`, `price`, `description`, `category`, and `image`, but not `rating`.
- The captured `GET /products` and `GET /products/1` responses contain `rating.rate` and `rating.count`; the backend accepts them only after runtime validation and emits `rating: null` when unavailable.
- Captured POST/PUT responses echo changes, but a later GET returns the original product. Fake Store writes are therefore treated as simulated/non-persistent and are not exposed by ProductsBackend.
- Search is a title/description substring match, case-insensitive after trimming/lowercasing. It is sufficient for 20 records; typo tolerance, stemming, relevance scoring, and full-text infrastructure are out of scope.
- Fake Store payloads are untrusted. Required product fields are validated; a missing or malformed rating becomes `null`; timeouts, network/HTTP failures, invalid JSON/shapes, and product-not-found remain distinct provider outcomes.
- Prices and category labels are passed through from the source. Currency is assumed to be USD for UI presentation, but currency conversion and localization are not backend responsibilities in this challenge.
- “Contact details” means a required name and email address; a phone number is not required. The enquiry message is optional because product identity is already supplied by `productId`.
- One configured recipient receives all enquiries. The sender address is server-controlled; the user's address is set as `replyTo` to avoid spoofing the SMTP envelope sender.
- Local development assumes Mailpit SMTP on `localhost:1025` and its UI on `localhost:8025`; configuration remains environment-driven.

## Scope limitations

- No authentication, authorization, rate limiting, durable enquiry audit, retries/queue, analytics, catalog mutations, pagination, cache, deployment infrastructure, or service-level guarantees. None is needed to demonstrate the five acceptance paths inside the time-box.
- No live external dependencies in automated tests and no attempt to correct upstream content or availability.
- Validation is intentionally small and endpoint-specific; adopt a schema library only if the API grows enough to justify it.
- The iOS Simulator is the supported mobile target. Physical-device networking and production email delivery are deliberately deferred.

## With another day

In priority order: add structured request logging and short-lived product caching; protect enquiries with rate limiting and a durable delivery queue; generate OpenAPI documentation and test a production SMTP adapter; then add pagination/search infrastructure only when catalogue size requires it.
