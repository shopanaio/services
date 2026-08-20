# Checkout service readiness audit

**Audit date:** 2026-08-20  
**Service:** `services/checkout`  
**Audit type:** static, read-only implementation and contract review  
**Target state:** every declared Storefront API operation and its business semantics are complete  
**Overall assessment:** **65% — NO-GO for feature-complete or production-ready status**

## Executive summary

Checkout has a substantial implementation rather than a skeleton. The service has a canonical
recalculation pipeline, versioned snapshots, compare-and-swap mutation commits, delivery and payment
selection, loyalty, durable order placement, compensations, payment monitoring, retention, and
tenant/visitor isolation. Both declared queries and all declared mutations are wired to resolvers.

The service is nevertheless not complete against its own public schema and implementation plans.
The principal blockers are:

1. `checkoutCreate` does not expose caller-provided idempotency, so a transport retry can create a
   second checkout.
2. `Checkout.notifications` is declared and covered by current E2E scenarios, but the public mapper
   always returns an empty array.
3. `/readyz` does not check the broker actions required by ordinary checkout recalculation and can
   report a false-positive ready state.
4. Several public read-model fields are placeholders or have semantics different from their GraphQL
   descriptions: bundle `priceConfig`, purchase type, promo value/timestamps, tag timestamps, and
   localized address names.
5. Tax calculation, Media integration, and multi-currency behavior are explicitly outside the
   implemented V1 scope. They must either be completed or removed/reworded as product promises before
   the service can be described as fully complete.
6. The repository contains 189 current checkout Storefront E2E scenarios, but they were not executed
   during this audit. Several notification assertions are statically incompatible with the mapper.

## Scope and evidence

The audit reviewed:

- the Storefront GraphQL schema under `src/interfaces/gql-storefront-api/schema/`;
- resolver registration, DTO validation, use cases, mutation coordination, pipeline boundaries,
  persistence, and public mapping;
- the DBOS order-placement, payment-monitoring, maintenance, recovery, and compensation workflows;
- checkout migrations and operational readiness checks;
- relevant Pricing, Catalog, Delivery, Payments, Customers, and Loyalty checkout boundaries;
- current `e2e/tests/checkout-storefront-api/` scenarios;
- the checkout implementation plans under the repository-level `docs/checkout/` directory;
- relevant architecture guidance from `knowledge/vault/`.

The audit did **not** run tests, `tsc`, a development server, or a browser. This follows the project
instructions in the root `AGENTS.md`. Consequently:

- findings backed by direct code/schema contradictions are considered confirmed;
- test suite status is **unverified**, not assumed green;
- runtime-only failures not visible through static review may still exist.

## Readiness scorecard

| Area | Weight | Score | Assessment |
| --- | ---: | ---: | --- |
| Public operation wiring | 10 | 10 | Both queries and all 26 mutations are registered |
| Mutation correctness and concurrency | 15 | 12 | Strong coordinator/CAS model; create retry semantics are incomplete |
| Canonical recalculation pipeline | 15 | 13 | Six stages and strict boundary parsing are implemented |
| Public read-model fidelity | 15 | 7 | Several declared fields are empty, hardcoded, or semantically inaccurate |
| Delivery, payments, and loyalty | 15 | 12 | Substantial integration and selection logic; runtime verification pending |
| Order placement and recovery | 15 | 12 | Durable orchestration and compensation are extensive |
| Security and tenancy | 5 | 4 | Store/visitor/credential boundaries are present; full runtime proof pending |
| Operations and observability | 5 | 2 | Metrics/readiness exist, but readiness dependency coverage is incomplete |
| Verification evidence | 5 | 3 | Broad E2E suite exists, but was not executed and contains static contradictions |
| **Total** | **100** | **65** | **NO-GO** |

The percentage is an engineering readiness estimate, not test coverage and not a claim that 65% of
individual lines are correct.

## Public API inventory

### Queries

| Operation | Resolver | Static status | Notes |
| --- | --- | --- | --- |
| `checkout(id)` | `checkoutQuery.ts` | Implemented | Store and visitor ownership enforced through `loadOwned` |
| `checkoutPlacement(id)` | `checkoutPlacement.ts` | Implemented | Store, credential, and visitor ownership enforced |

### Mutations

| Operation | Static status | Pipeline behavior | Important notes |
| --- | --- | --- | --- |
| `checkoutCreate` | **Incomplete** | Full recalculation | Caller cannot supply an idempotency key |
| `checkoutLinesAdd` | Implemented | Full recalculation | Batch use case and canonical line intent |
| `checkoutLinesUpdate` | Implemented | Full recalculation | Quantity zero removes a line |
| `checkoutLinesReplace` | Implemented | Full recalculation | Source-to-target replacement semantics |
| `checkoutLinesDelete` | Implemented | Full recalculation | Batch validation and removal |
| `checkoutLinesClear` | Implemented | Full recalculation | Clears lines and affected references |
| `checkoutCustomerIdentityUpdate` | Implemented | Full recalculation | Authenticated customer ownership comes from trusted context |
| `checkoutCustomerNoteUpdate` | Implemented | CAS-only | Does not change pipeline result revision |
| `checkoutLanguageCodeUpdate` | Implemented | Full recalculation | Recalculates localized outputs |
| `checkoutCurrencyCodeUpdate` | Implemented | Full recalculation | Actual support depends on Pricing/Catalog data |
| `checkoutBillingAddressUpdate` | Partially complete | CAS-only | Stored and passed at placement; not part of recalculation/validation |
| `checkoutDeliveryAddressesAdd` | Implemented | Full recalculation | Multi-destination batch mutation |
| `checkoutDeliveryAddressesUpdate` | Implemented | Full recalculation | Batch update |
| `checkoutDeliveryAddressesRemove` | Implemented | Full recalculation | Resets dependent selections |
| `checkoutDeliveryMethodUpdate` | Implemented | Full recalculation | Opaque option handle and private customer input |
| `checkoutDeliveryRecipientsAdd` | Implemented | Full recalculation | Recipient data updates destination intent |
| `checkoutDeliveryRecipientsUpdate` | Implemented | Full recalculation | Batch update |
| `checkoutDeliveryRecipientsRemove` | Implemented | Full recalculation | Batch removal |
| `checkoutPromoCodeAdd` | Implemented | Full recalculation | Public promo projection has semantic defects |
| `checkoutPromoCodeRemove` | Implemented | Full recalculation | Normalized/idempotent removal |
| `checkoutTagCreate` | Implemented | CAS-only | Per-tag timestamps are not persisted |
| `checkoutTagUpdate` | Implemented | CAS-only | Uniqueness validation exists; timestamp projection is inaccurate |
| `checkoutTagDelete` | Implemented | CAS-only | Assignment cleanup is atomic |
| `checkoutPaymentMethodUpdate` | Implemented | Full recalculation | Opaque handle and private customer input |
| `checkoutLoyaltyRedemptionUpdate` | Implemented | Full recalculation | Supports points and reward entitlements internally |
| `checkoutLoyaltyRedemptionRemove` | Implemented | Full recalculation | No-op semantics for absent selection |
| `placeOrder` | Implemented | Durable workflow | Client idempotency is exposed here, unlike checkout creation |

Operation registration is therefore complete in shape, but operation semantics are not all complete.

## Confirmed blocking findings

### B-01 — Checkout creation cannot be retried safely by a client

**Severity:** Blocker  
**Affected API:** `Mutation.checkoutCreate`  
**Risk:** duplicate checkouts after timeout, lost response, proxy retry, or mobile reconnect

The normative mutation integration plan requires an opaque, mandatory `idempotencyKey` in
`CheckoutCreateInput`, scoped by store and stable Headless `connectionId`. The current GraphQL input
does not have that field. `CreateCheckoutUseCase` instead executes `uuidv7()` for every request and
uses that generated value as the persistence identity.

Evidence:

- `src/interfaces/gql-storefront-api/schema/checkout.graphql` — `CheckoutCreateInput` has no
  `idempotencyKey`;
- `src/application/usecases/createCheckoutUseCase.ts` — `const idempotencyKey = uuidv7()`;
- `../../../docs/checkout/checkout-pipeline-mutations-integration-plan.md` — requires client-scoped,
  replayable create idempotency and explicitly prohibits resolver-generated random keys.

The persistence repository itself has useful reservation, lease, conflict, replay, and final-failure
states. The problem is that the public/application boundary never allows a retry to reuse an identity.

Required completion:

1. Add a bounded opaque `idempotencyKey: String!` to `CheckoutCreateInput`.
2. Add it to generated types, DTO, resolver command, and application input.
3. Remove server generation of the create idempotency key.
4. Preserve server-generated checkout/line/tag IDs inside the existing idempotency reservation.
5. Add E2E coverage for same-key/same-input replay, same-key/different-input conflict, concurrent
   in-progress requests, retryable failure recovery, and credential rotation on the same connection.

### B-02 — Checkout notifications are declared but never returned

**Severity:** Blocker  
**Affected API:** `Checkout.notifications`  
**Risk:** storefront cannot explain automatic quantity changes, price changes, stock loss, or removed
merchandise

The schema declares four notification codes and a non-null notification collection. Current E2E
scenarios assert `NOT_ENOUGH_STOCK`, `PRICE_CHANGED`, `OUT_OF_STOCK`, and `ITEM_UNAVAILABLE`.
`mapCommittedCheckoutToApi` nevertheless assigns `notifications: []` unconditionally. The same empty
projection also appears in the checkout DTO used for order placement.

This is not merely absent test coverage: the current implementation and current E2E expectations are
directly contradictory.

Required completion:

1. Define the canonical source of notifications. Prefer explicit pipeline output or deterministic
   derivation from source-line resolutions plus previous committed state.
2. Persist enough provenance for `PRICE_CHANGED`; it cannot be reconstructed from only the current
   quote without a previous price reference.
3. Define deterministic notification IDs and ordering.
4. Either implement acknowledgement/dismissal persistence or remove `isDismissed` until it has real
   semantics.
5. Map the same canonical notifications consistently to Storefront checkout and order input, if the
   order contract needs them.

### B-03 — Readiness can report a false-positive healthy service

**Severity:** Blocker for production readiness  
**Affected endpoint:** `/readyz`  
**Risk:** traffic reaches an instance on which every checkout mutation fails at recalculation

The readiness probe checks PostgreSQL, a DBOS call, place-order actions, and selected workflows. It
does not require the core actions used by ordinary checkout creation and mutation, including:

- customer eligibility resolution;
- preliminary pricing;
- delivery option calculation;
- final pricing;
- loyalty quotation;
- payment-method discovery;
- validation-function binding discovery.

It also omits several actions required for placement finalization and compensation, such as inventory
confirmation, discount release/reversal, delivery release, and loyalty reserve/commit/release.

Required completion:

1. Split dependencies into recalculation-critical, placement-critical, and recovery-critical groups.
2. Require all recalculation-critical actions for readiness.
3. Decide whether recovery-only missing dependencies make the instance unready or degraded; expose the
   distinction explicitly.
4. Add a unit-level inventory test that proves every broker action/workflow referenced by checkout
   runtime code is classified by readiness policy.

## High-priority contract and business gaps

### H-01 — Checkout line projection drops supported domain data

**Affected fields:** `CheckoutLine.image`, `priceConfig`, `purchase`

The mapper currently hardcodes:

```ts
image: null
purchase: { type: "ONE_TIME" }
priceConfig: null
```

Consequences:

- the schema declares bundle price-adjustment details, but no child line can return them;
- internal DTO and pipeline contracts support `SUBSCRIPTION` with `sellingPlanId`, while the public
  schema exposes only `ONE_TIME` and the mapper discards the actual quote purchase mode;
- the schema describes a Media-federated image, but the V1 pipeline deliberately returns no stable
  Media reference.

The bundle price rule is available while Catalog/Pricing transform the line but is dropped from the
final quoted-line contract. Exact `FREE`, amount, percentage, and override semantics therefore cannot
be faithfully reconstructed in the checkout mapper.

Required completion:

1. Carry a canonical component price-rule snapshot into the final quote or public projection source.
2. Map every `ChildPriceType` and validate amount/percent shape.
3. Add `SUBSCRIPTION` and `sellingPlanId` to the GraphQL contract if subscriptions remain in scope;
   otherwise remove the dead internal branch and update the plan.
4. Carry the actual `line.purchase` value instead of hardcoding `ONE_TIME`.
5. Introduce a stable Media ID boundary or explicitly redefine `image` as unsupported in the target
   release.

### H-02 — Promo-code projection violates its public field descriptions

**Affected fields:** `CheckoutPromoCode.value`, `discountType`, `appliedAt`

The schema documents `value` as a percentage. The mapper returns
`Number(discount.amount.amountMinor)`, which is the allocated monetary discount in minor units.
For a percentage promotion, a shopper may therefore receive `1500` instead of `15`. For a fixed
promotion, the field description remains wrong.

`appliedAt` is populated with the checkout's latest `updatedAt`. An unrelated note, address, line, or
tag mutation changes the reported application time of every promo code.

Required completion:

1. Replace the ambiguous shape with a discriminated representation, for example percentage or Money.
2. Persist the actual application/acceptance timestamp if it is part of the API contract.
3. Separate discount definition type from discount class (`PRODUCT`, `ORDER`, `SHIPPING`).
4. Add percentage, fixed-amount, Buy-X-Get-Y, and automatic-discount projection tests.

### H-03 — Tag timestamps are fabricated from checkout timestamps

`CheckoutTag.createdAt` and `updatedAt` are declared as tag timestamps, but `CheckoutTagDefinition`
persists only `id`, `slug`, and `isUnique`. The mapper uses checkout-level timestamps for every tag.

Effects:

- a tag created after checkout creation reports the checkout creation time;
- updating any unrelated checkout field changes every tag's `updatedAt`;
- updating one tag cannot be distinguished from updating another.

Required completion: persist tag-level `createdAt` and `updatedAt`, update only the affected tag, and
preserve timestamps through snapshot serialization and CAS-only commits.

### H-04 — Address name fields are codes, not localized names

Delivery and billing address types describe `country` and `province` as localized names. Billing
mapping returns `countryCode` as `country` and `provinceCode` as `province`. Delivery mapping also
falls back to code-shaped data rather than a Storefront localization boundary.

Required completion: either resolve locale-aware display names from a stable Project/localization
snapshot or rename/remove the misleading fields and leave only codes.

### H-05 — Billing address does not participate in recalculation validation

The schema says billing address is used by payment providers. It is stored via a CAS-only mutation and
later passed when creating a payment session, but it does not enter payment-method discovery or native
checkout validation.

This may be acceptable only if the product rule is explicitly: billing address is never required for
method eligibility and is validated exclusively by the selected provider at payment-session creation.
If providers may require country, postal code, or billing identity before checkout becomes `READY`, the
current behavior is incomplete.

Required decision: codify the above policy or add billing-address facts to the payment/validation
pipeline and convert the mutation to a recalculating mutation.

## Explicitly incomplete product scope

The Pricing implementation plan explicitly lists the following V1 non-goals:

- tax engine: `taxTotal` is always zero;
- Media service integration: checkout line image is null;
- multi-currency checkout: all money must use one context/store currency.

These are valid milestone boundaries, but they conflict with the requirement that all business logic
be complete unless the release contract explicitly declares these limitations. Before calling the
service complete, choose one of two approaches for each item:

1. implement the feature and its tests; or
2. make the limitation explicit in the public/product contract and remove misleading semantic claims.

## Architecture strengths confirmed by static review

### Canonical mutation pipeline

- One prospective draft is built for a mutation.
- Required mutations run one recalculation through the coordinator.
- The pipeline executes preliminary pricing, delivery, final pricing, loyalty, payments, and
  validation.
- Every untrusted broker boundary is parsed and validated.
- Failed/incomplete required stages are not committed as a canonical checkout snapshot.
- Validation-invalid but fully calculated checkouts can be persisted as `OPEN` with ordered issues.
- Result revisions are deterministic and content-derived.

### Concurrency and persistence

- Existing checkout mutation commits use expected-version CAS.
- A conflict returns a retryable checkout version error without automatic pipeline replay.
- Batch operations apply to a cloned draft and commit once.
- Metadata-only operations use versioned CAS without changing the pipeline result revision.
- Store and visitor ownership are enforced on public reads and mutation snapshot loading.
- Current snapshots and checkout rows are linked by store/checkout/version constraints.
- Snapshot quarantine exists for malformed persisted data.

### Delivery and payment selection

- Public inputs use opaque option/method handles.
- Provider/customer input remains private and is not projected back through Storefront API.
- Selection reset preserves previous handles and canonical reset reasons.
- Positive payable totals require an explicit selected payment method before placement.
- Zero-payable checkout can bypass payment creation.

### Durable order placement

- `placeOrder` exposes caller-provided idempotency.
- Placement claims an immutable checkout version/result revision.
- Inventory, discount usage, delivery, loyalty, order creation, and payment creation are orchestrated
  as durable workflow operations.
- Compensation failures are recorded for maintenance recovery.
- Pending payment sessions have a monitor and recovery path.
- Placement status is queryable with Storefront ownership checks.
- Return URLs have a dedicated allow-list/security policy.

### Retention and privacy

- Active TTL and snapshot retention are configurable and validated.
- Expiration/retention maintenance is durable and idempotent by minute bucket.
- PII stripping covers buyer identity, billing address, customer note, destinations, and nested
  provider customer input.
- Reads and placement queries require the correct store and Storefront owner.

## Verification assessment

There are 12 current checkout Storefront spec files containing 189 test cases:

- creation and reads;
- customer context and billing address;
- lines, merchandise, bundles, availability, and projections;
- pricing and promotions;
- delivery;
- payment Apps;
- loyalty;
- validation and concurrency;
- order placement;
- payment monitoring and recovery;
- maintenance and retention;
- tags.

No skipped/todo checkout tests were found by static search. This is strong breadth, but it is not proof
of a passing suite. At minimum, notification scenarios conflict with the unconditional empty mapper.

Additional verification gaps to add or make explicit:

- client-provided create idempotency replay and key-reuse conflict;
- bundle `priceConfig` projection for every declared adjustment type;
- subscription purchase input/output, if retained in scope;
- true tag timestamps;
- true promo percentage/value and application timestamps;
- readiness dependency completeness;
- localized address display names;
- billing-address eligibility policy;
- tax behavior for a non-zero tax jurisdiction, if tax becomes in scope;
- Media image reference, if Media becomes in scope.

## Completion plan

### Phase 0 — Contract decisions

1. Decide whether tax, Media images, subscription purchase, multi-currency, billing-address method
   eligibility, and notification dismissal are part of the target release.
2. Align schema, implementation plans, and E2E expectations. Do not retain fields that permanently
   return placeholders while describing richer semantics.
3. Lock corrected promo and tag contracts before persistence changes.

### Phase 1 — Release blockers

1. Add client-provided create idempotency end to end.
2. Implement canonical notifications and persistence/provenance needed by `PRICE_CHANGED`.
3. Expand readiness to cover all recalculation-critical dependencies.
4. Add focused E2E/contract scenarios for these three blockers.

### Phase 2 — Public read-model fidelity

1. Preserve and project line purchase and component price-rule data.
2. Correct promo value/type/timestamp semantics.
3. Persist tag timestamps.
4. Correct localized address names or simplify the contract.
5. Remove remaining hardcoded public placeholders.

### Phase 3 — Deliberate V1 exclusions

Implement or explicitly contract-limit:

- non-zero taxes;
- Media images;
- subscription purchase;
- multi-currency rules.

### Phase 4 — Verification gate

Following project rules, run verification through the approved `shopana-cli` workflow:

1. build only when a new code version is required;
2. regenerate/compose the Storefront schema after schema changes;
3. run checkout E2E files individually with one worker;
4. fix and rerun the same file before moving to the next one;
5. verify migrations from an empty database;
6. record the command, commit/version, and result for every checkout spec file;
7. require zero skipped checkout scenarios and zero unresolved blocker/high findings.

## Definition of done for checkout readiness

Checkout can be marked complete only when all of the following are true:

- every declared query and mutation is implemented with its documented semantics;
- `checkoutCreate` is safely replayable using a caller-provided key;
- all mutation batches and snapshot commits remain atomic under conflicts and failures;
- no public field is unconditionally empty, null, hardcoded, or timestamped from an unrelated entity
  unless that behavior is explicitly the contract;
- notifications correctly describe line removal, quantity adjustment, price change, and availability;
- bundle price adjustments and purchase modes survive the pipeline and public projection;
- promo, tag, and address fields match their GraphQL descriptions;
- readiness fails when any dependency required for checkout recalculation is unavailable;
- placement, pending payment, compensation, maintenance, and retention recovery paths pass their E2E
  scenarios;
- all 12 current checkout Storefront spec files pass individually in the approved environment;
- the composed Storefront schema is current and passes the schema gate;
- every deliberate product limitation is explicitly documented and accepted as part of the release
  contract.

## Final verdict

The checkout service has a strong architectural core and a broad intended verification matrix, but it
does not yet satisfy the requested condition that all declared API and business logic be complete.
The immediate release blockers are create idempotency, notifications, and readiness correctness.
After those, public projection fidelity and explicit V1 scope decisions are required before a final
green verification run.

**Current release decision: NO-GO.**
