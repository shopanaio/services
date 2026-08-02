# Checkout pipeline-backed mutations

Storefront Checkout has one canonical mutation path. A mutation first changes a
prospective `CheckoutMutationDraft`, runs the five-stage checkout pipeline once,
and then commits the draft and complete result with compare-and-swap on the
checkout version.

```text
GraphQL mutation
  -> transport validation / Global ID decoding
  -> pure draft operation
  -> Preliminary Pricing
  -> Delivery
  -> Final Pricing
  -> Payment
  -> Validation
  -> atomic V -> V+1 commit
```

No database transaction is held while broker actions run. A failed or skipped
stage prevents the checkout commit. Successful Validation with `valid: false`
is canonical state and is committed together with its ordered issues.

## Stored state

`checkout.checkout_current_snapshots` is the single current source for both the
next mutation draft and public reads. Its JSON snapshot contains the complete
checkout-owned draft and the parsed pipeline result. Root checkout columns keep
the CAS version and frequently queried canonical totals/revisions. The old line,
discount, delivery, payment, tag, customer-identity, and API-key projections are
removed rather than dual-written.

Every update checks `checkoutId + storeId + expectedVersion`. The root and
snapshot transition are performed by one PostgreSQL statement. A stale result
returns `CHECKOUT_VERSION_CONFLICT` and is never retried automatically.

## Create idempotency

Create identity is
`storeId + storefrontAccess.connectionId + CHECKOUT_CREATE + idempotencyKey`.
The canonical request hash excludes the key, generated IDs, and timestamps.
The reservation owns stable checkout/line/tag IDs, supports leased retry of
retryable failures, rejects key reuse with a different hash, and replays the
committed snapshot. Checkout insert and `COMMITTED` idempotency transition occur
in the same statement. Every acquired lease receives a fencing token; failure
and commit operations only accept the current token, and create atomically locks
the reservation before inserting checkout state. `credentialId` is audit-only;
storefront credential/token material is never persisted.

## Public state

Mutation responses are mapped directly from the committed snapshot, with no
post-commit reread. Queries use the same snapshot. Delivery and payment
selection identity is an opaque handle, and public mapping preserves
`NONE`, `SELECTED`, and `RESET` exactly. Pricing quotes are the only source of
merchandise, availability, discounts, and money; Delivery and Payments are the
only sources of their options and methods.

Customer segment eligibility is resolved from Customers at the attempt's
immutable `effectiveAt`. It exists only in the pipeline request and is not
copied into checkout persistence.
