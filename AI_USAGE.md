# AI usage

## Tools

- OpenAI Codex desktop agent for planning, review, and implementation assistance.

## Influential moments

1. Compared the initial documentation with the original challenge and corrected category behavior from ranking categories to partitioning products within a category.
2. Kept `ProductSource` and `EmailProvider` as the only planned replaceable integration boundaries instead of adding a DI framework or repository layer.
3. Scoped the first implementation pass to application bootstrap, configuration, health/error handling, Mailpit, and test tooling; product and enquiry logic remain deferred.

## Review corrections

- The first plan interpreted “category ranking” as ranking categories by average rating. Reviewing the acceptance criteria caught this, and the contract now returns two top-rated products plus additional products in the selected category.

## Time log

Update the final submission with actual minutes spent on planning, building, testing, and review.
