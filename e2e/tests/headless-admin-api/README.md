# Headless Admin API e2e

This directory contains pending contract suites for the Admin GraphQL surface
owned by the bundled `shopana-headless` App.

The suites follow `docs/apps/headless-storefront-access-gateway-plan.ru.md` and
the current Headless GraphQL schema:

- storefront connection queries and lifecycle;
- initial public/private credentials and private credential rotation;
- permission catalog and revisioned access policy;
- Admin authorization, installation ownership, and store isolation;
- lifecycle idempotency and concurrency;
- Storefront Gateway effects of Admin changes;
- token and observability secret hygiene.

All suites are intentionally skipped until the Headless App can be installed by
an e2e fixture and dedicated GraphQL query documents exist. Every implemented
case must verify `userErrors`, Headless-owned persistence, effects on the next
Storefront request, and absence of changes in another store or installation.

Generic App installation lifecycle remains covered by
`e2e/tests/apps-admin-api`.
