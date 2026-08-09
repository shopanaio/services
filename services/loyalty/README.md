# Loyalty Service

Loyalty is the store-scoped bounded context for enterprise loyalty programs,
versioned earning and redemption policies, customer points accounts, an
append-only ledger, expiring point lots, Checkout reservations, and tiers.

This change intentionally provides contracts only. `config.yml` keeps the
subgraph disabled until resolvers, repositories, event handlers, and workflows
are implemented. The package exports an empty `LoyaltyModule` so later runtime
work can add providers without changing the public package name.

## Ownership boundaries

- Customers owns customer identity, lifecycle, and PII. Loyalty stores only a
  stable `customer_id` reference and never creates a cross-service foreign key.
- Orders owns the immutable order and refund facts used for earning and
  reversal. Orders does not calculate points.
- Pricing owns product, order, and delivery discounts. A Loyalty redemption is
  a tender-like reduction applied by Checkout after the Pricing quote.
- Checkout owns orchestration and persists Loyalty quote/reservation snapshots.
- Loyalty exclusively owns conversion rules, balances, reservations, lot
  allocation, expiry, redemption, debt, and points audit history.

All Loyalty-owned foreign keys include `store_id` in their relational contract.
The database therefore rejects cross-store links even if a future repository
forgets to apply its tenant filter.

## Authoritative and projected data

`loyalty.transaction`, `loyalty.ledger_entry`, `loyalty.point_lot`, and
`loyalty.lot_allocation` are append-only. Corrections are represented by new
transactions. `loyalty.account_balance` is a rebuildable projection and must
never be used as the audit source of truth.

Balances are separated into `PENDING`, `AVAILABLE`, `RESERVED`, and `DEBT`.
Points use PostgreSQL `bigint` and API decimal strings; floating point values
are forbidden. Point lots provide deterministic earliest-expiry-first
allocation and preserve the original expiration policy.

## Program versions

Published program versions are immutable. Every earning or redemption
transaction records the exact `program_version_id` and policy snapshot used for
calculation. New policy takes effect through a new version; historical ledger
records are never recalculated.

### Eligibility policy

Program eligibility uses an explicit audience discriminator:

- `ALL` allows every customer after channel and excluded-segment checks;
- `SEGMENTS` requires `ANY` or `ALL` of the configured included segments;
- excluded segments always take precedence over a positive audience match.

Every create or publish path must call `createLoyaltyProgramRulesV1`, reject a
policy with semantic validation issues, and persist only the returned canonical
rules. Earning and redemption paths must both call
`evaluateLoyaltyProgramEligibility`; they must not implement independent match
logic. Channel codes and segment IDs are evaluated from the immutable customer
eligibility snapshot carried by Checkout or Orders.

Cross-service references must be checked while editing a draft and immediately
before publication. Reconciliation state such as `VALID` or `STALE` is mutable
operational data and must be stored outside the immutable `rules` JSON. A stale
reference must never be removed from an already published policy or historical
calculation snapshot.

## Event contracts

Loyalty consumes:

- `orderRewardEligible` — immutable Orders facts for a newly eligible amount;
- `orderRewardReversed` — incremental refund/cancellation/correction facts;
- `customerMerged` — transfers economic control without rewriting ledger rows;
- `customerDeleted` — removes access/PII linkage while retaining audit data;
- `storeDeleted` — closes store-scoped accounts through a durable process.

Loyalty emits typed earned, activated, reserved, redeemed, released, expired,
reversed, restored, and adjusted point events through `@shopana/events`.
Economic events tied to earning, lots, reservations, or redemption require the
exact published `programVersionId`; only version-independent adjustments may
carry a null version.

Every event-driven mutation must derive idempotency from the immutable event ID,
not from delivery attempt. Every direct action accepts an explicit stable
idempotency key and, where the payload can vary, a canonical request hash.
Order reward facts also carry immutable channel, customer eligibility, and
segment membership snapshots so historical calculations never hydrate mutable
Customers state.

## Checkout action sequence

1. `loyalty.quoteCheckoutLoyaltyRedemption`
2. `loyalty.reserveCheckoutLoyaltyRedemption`
3. `loyalty.commitCheckoutLoyaltyRedemption` after order creation
4. `loyalty.releaseCheckoutLoyaltyRedemption` on cancellation/failure
5. `loyalty.reverseCheckoutLoyaltyRedemption` for an eligible refund

Reservation and commit operations are expected to lock the account, append
ledger entries, allocate lots, update the balance projection, and write the
reservation audit event in one PostgreSQL transaction.
Reservation expiry is owned by Loyalty and is taken from the verified quote;
Checkout cannot replace or extend it when reserving points.
Each reservation also persists the exact `program_version_id` selected by that
quote so later commit, release, reversal, and emitted events remain auditable.

## API surfaces

- Admin GraphQL exposes program/version lifecycle, account and balance reads,
  ledger history, manual adjustment with audit reason, and reservation support.
- Storefront GraphQL extends the authenticated `Customer` with balances, tiers,
  expirations, and customer-safe transaction history.
- Storefront does not expose direct reserve/commit mutations. Redemption is a
  Checkout operation and uses the broker contracts in `@shopana/broker-types`.
