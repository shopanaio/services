# Loyalty Service

Loyalty is the store-scoped bounded context for enterprise loyalty programs,
versioned earning and redemption policies, customer points accounts, an
append-only ledger, expiring point lots, Checkout reservations, tiers, issued
reward entitlements, and currency-specific monetary cashback/store-credit
wallets.

The service runtime follows the shared Shopana service architecture. Its NestJS
module initializes the broker, kernel, database and transaction infrastructure,
request-scoped contexts and loaders, and the Admin and Storefront GraphQL
subgraph servers. `BootstrapModule` imports `LoyaltyModule` as part of the
modular-monolith composition root. Domain repositories and their Drizzle models
mirror the SQL-first schema; actions, event handlers, workflows, and resolvers
share the implemented application services. Broker actions and durable workflows
own checkout redemption, order rewards, maintenance, store closure, external
earning facts, and audited manual adjustments. GraphQL resolvers remain a
separate transport layer.

## Ownership boundaries

- Customers owns customer identity, lifecycle, and PII. Loyalty stores only a
  stable `customer_id` reference and never creates a cross-service foreign key.
- Orders owns the immutable order and refund facts used for earning and
  reversal. Orders does not calculate points.
- Pricing owns product, order, and delivery discounts. A Loyalty redemption is
  a tender-like reduction applied by Checkout after the Pricing quote.
- Checkout owns orchestration and persists Loyalty quote/reservation snapshots.
- Loyalty exclusively owns conversion rules, balances, reservations, lot
  allocation, expiry, redemption, debt, reward entitlement lifecycle, monetary
  wallet balances, and loyalty audit history.

Every store-scoped Loyalty row carries `store_id`. New extensibility tables use
stable entity IDs in foreign keys, as required by the project migration rules,
and constraint triggers validate store/program agreement for denormalized scope
columns. Repositories must still apply the request store filter to every query.

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

## Universal earning rules

The fixed purchase conversion fields on `program_version` remain the optimized
default purchase-points policy. Additional earning mechanics are represented by
immutable `earning_rule` rows owned by the same program version.

An earning rule has four independently versioned parts:

- a trigger (`ORDER`, `SIGNUP`, `REVIEW`, `REFERRAL`, `BIRTHDAY`,
  `ANNIVERSARY`, `LOGIN`, `SUBSCRIPTION_RENEWAL`, or `CUSTOM_EVENT`);
- a canonical boolean condition expression for segments, channels, catalog
  selectors, payment methods, first-purchase checks, and schedules;
- a typed action for fixed points, spend conversion, cashback, multipliers, or
  reward issuance;
- limits for event, account, time-window, campaign-budget, points, and monetary
  caps.

`earning_rule_usage` is a lockable, rebuildable projection used to enforce
concurrent limits. `event_fact` and `event_evaluation` remain the audit source
for rebuilding it. Big integer values inside JSON policies are decimal strings,
never JSON numbers.

## External loyalty event facts

`event_fact` stores the immutable, hashed snapshot received from an owning
service. Producer plus external event ID is the idempotency identity. A fact is
evaluated independently against each matching rule and account, producing one
append-only `event_evaluation` decision. Unknown external events use the
`CUSTOM_EVENT` trigger; they do not require a database enum migration.

## Rewards and entitlements

`reward_definition` is immutable with its program version and describes points,
vouchers, fixed or percentage discounts, free shipping, free products, member
benefits, or monetary credit. `reward_entitlement` is the customer-owned issued
instance and stores the immutable definition snapshot plus its reservation,
redemption, expiration, revocation, and external Pricing/Checkout reference.

Pricing continues to calculate discounts. Loyalty owns eligibility and issuance;
the external reference identifies the concrete Pricing voucher or benefit.
`tier_reward_benefit` attaches version-compatible reward definitions to a tier.

## Tier policy

`tier_policy` defines lifetime, rolling, or calendar evaluation windows,
membership duration, downgrade grace, and automatic or manual requalification.
Each tier stores versioned qualification and maintenance boolean expressions.
Expressions can combine spend, earned points, order count, referrals, or custom
metrics with explicit `ALL`, `ANY`, and `NOT` nodes. Tier benefits are reward
definition links rather than untyped fields embedded in the tier row.

## Monetary wallets

Real cashback and store credit use `monetary_wallet`,
`monetary_transaction`, `monetary_ledger_entry`, and monetary credit lots. A
wallet is bound to exactly one account, wallet type, and ISO currency. Monetary
minor units never enter the points ledger or `account_balance`; conversion
between points and money always creates separately audited transactions.

A monetary transaction and all of its ledger entries must be created in one
PostgreSQL transaction. The writer sets `entries_finalized` only after the last
entry is inserted; a deferred constraint rejects an unfinalized transaction at
commit, and finalized transactions reject additional entries.

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

### Storefront presentation projections

Storefront clients never receive policy JSON and never calculate eligibility,
points, cashback, limits, priority, or customer-facing loyalty copy.

`Product.loyalty` and `ProductVariant.loyalty` are server-computed projections
using the active store, channel, market, currency, locale, published Pricing
state, program version, and viewer context. `primaryOpportunity` is selected by
the server for compact product cards; the client must not rerank alternatives.
Product purchase values use quantity one and are estimates until cart/checkout
provides the authoritative Pricing and eligibility snapshot.

`LoyaltyAccount.opportunities` contains server-ranked account actions, while
`LoyaltyAccount.availableRewards` contains only entitlements that are usable at
request time. Expired, redeemed, revoked, future, and otherwise unusable rewards
are excluded on the server.

All presentation copy is already localized and merchant-configured. Structured
reward values remain available for native widgets and analytics, but a generic
client can render only `presentation`/`copy` without branching on reward kind.
