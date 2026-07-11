# Universal variant-term implementation audit

Дата: 2026-07-11  
Статус: implementation complete, verification restricted

## Legacy inventory

До cutover legacy OPTION writers находились в
`ListingBuildSyncWriteModelScript`, `ListingWriteIndexActionScript`, batch write
step и `ListingPostingBitmapRepository`. Readers находились в productMatches,
facet metadata/counts/virtual facets и старых storefront helper repositories.

Availability correctness зависела от `plan.inStock ?? true`, product/variant
`in_stock`, in-stock-only price/signature branches. Option signatures участвовали
в metadata, counts, virtual availability и price paths.

Все перечисленные runtime branches удалены или заменены canonical term algebra.
Repository-wide source search после cutover не находит `listing_option_signature`,
`signature_key`, `plan.inStock ?? true`, `variant + facet` reader/writer или
availability predicate на `vli.in_stock`.

## Implemented contract

- write model version `2`;
- `system.state=indexable`, explicit available/unavailable и OPTION terms;
- strict v1 encoder/decoder и registry validation;
- exact bounded reads, retained declared rows и merged deterministic delta;
- DB constraint for allowed entity/field pairs;
- one same-variant compiler and projection after terms/PRICE;
- isolated distinct-product counts and selected zero metadata;
- matched minimum price ASC/DESC with NULL-last products;
- both declared availability states in virtual metadata;
- sequential per-statement `READ COMMITTED` snapshots without an outer
  listing transaction;
- bounded cardinality/universe/partition/mapping/price/aggregate audit;
- option signature schema and code fully removed.

## Fixtures

P1–P11 normative records and expected availability/same-variant matrix are in
`e2e/fixtures/listing/universalVariantTerms.ts`. Direct listing seed now writes
universe, explicit availability and encoded OPTION terms and no signatures.

## Verification evidence

- Listing production build through Shopana CLI: successful.
- Local `listing` schema dropped only within the local development DB and
  reapplied through Shopana CLI: successful.
- Clean-schema inspection: zero `listing_option_signature*` tables; zero
  signature/availability columns in variant price index; posting entity/field
  constraint present.
- Changed e2e TypeScript files passed Node syntax checks.
- Direct `test`, `tsc` and Playwright were not run.

## Outstanding verification

Project `AGENTS.md` prohibits running tests. Therefore targeted Playwright,
snapshot concurrency and 10k performance specs were updated but not executed.
No pre-cutover performance artifact existed in the tracker before work began;
it cannot be recreated after cutover without restoring old code, and prohibited
git operations were not used.
