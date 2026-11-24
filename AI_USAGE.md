# AI usage

## Tools

- OpenAI Codex desktop agent for planning, review, and implementation assistance.

## Influential moments

1. Compared the initial documentation with the original challenge and corrected category behavior from ranking categories to partitioning products within a category.
2. Kept `ProductProvider` and `EmailProvider` as the only replaceable integration boundaries instead of adding a DI framework or repository layer.
3. Scoped the first implementation pass to application bootstrap, configuration, health/error handling, Mailpit, and test tooling.
4. Added `APP_ENV`-selected development, staging, and production files while retaining standard `NODE_ENV` behavior and runtime secret overrides.
5. Directed the catalogue pass to use configured featured IDs, native `fetch`, runtime DTO validation, deterministic category ranking, and provider fakes in HTTP tests; enquiry/email logic remained deferred.
6. Completed the enquiry phase with route-level input validation, product verification through the existing provider, plain-text message composition, and a replaceable SMTP adapter that waits for recipient acceptance.

## Review corrections

- The first plan interpreted “category ranking” as ranking categories by average rating. Reviewing the acceptance criteria caught this, and the contract now returns two top-rated products plus additional products in the selected category.
- The first featured-products decision derived the five highest ratings. The implementation request clarified that the five products are configured, so `FEATURED_PRODUCT_IDS` and the home contract replaced that assumption.
- Dependency review caught vulnerable initial Nodemailer/Vitest resolutions; both were moved to patched versions and the audit returned clean.
- Provider self-review removed unsafe assumptions around the undocumented rating object: required product fields are validated, while absent or malformed ratings normalize to `null`.
- Enquiry review kept the customer address out of the SMTP envelope sender: configured addresses remain `from`/`to`, and the validated customer address is used only as `replyTo`.

## Time log

Record the final wall-clock split across planning, building, testing, and review immediately before submission; the AI interaction history above is current through the completed backend implementation. No elapsed-time values were invented during implementation.
