# Customers database schema

## Scope

The `customers` schema owns store-scoped customer business data. Authentication
credentials, sessions and verification tokens stay in IAM. Order truth stays in
Orders; customer statistics are projections that can be rebuilt from domain
events. Payment methods and store-credit ledgers are intentionally outside this
bounded context.

The baseline combines the common customer capabilities exposed by Shopify and
Adobe Commerce: profile/contact projections, multiple addresses with billing
and shipping defaults, groups, tags and segments, marketing consent, tax data,
purchase statistics, merge support and privacy requests.

## Domain migrations

| Prefix | Domain | Tables |
| --- | --- | --- |
| `0000` | Foundation | PostgreSQL schema and enums |
| `0100` | Profiles | `customer`, moderation metadata |
| `0200` | Addresses | `customer_address` |
| `0300` | Tax | `customer_tax_identifier`, `customer_tax_exemption` |
| `0400` | Marketing | `customer_consent`, `customer_consent_event` |
| `0500` | Classification | groups, tags, segments, memberships and segment revision metadata |
| `0700` | Integrations | `customer_external_reference` |
| `0800` | Read models | order and currency-specific monetary statistics |
| `0900` | Lifecycle | merges and privacy data requests |

Migration basenames are globally unique because `node-pg-migrate` tracks them
in `customers.pgmigrations` while loading `migrations/domains/**/*.sql` in glob
mode.

## Core decisions

### Identity boundary

`customer.iam_principal_id` is nullable. A guest or imported customer does not
require a fake IAM account. A linked principal is unique within a store, and the
database has no cross-service foreign key to IAM. Email and verification flags
in Customers are projections for administration and search; IAM remains the
source of truth for authentication.

### Tenant isolation

Every domain and projection table contains `store_id`. Primary and foreign keys
use stable entity identifiers and never include `store_id`, following the
project migration key rule. Repositories must always scope reads and writes by
the trusted store context.

### Identifiers and time

All persisted UUID identifiers default to PostgreSQL `uuidv7()`. Dates use
`date`; event and lifecycle timestamps use `timestamptz`. Money is stored as
integer minor units plus a three-letter currency code.

### Addresses

Customers can own multiple addresses. Separate partial unique indexes enforce
at most one active default shipping address and one active default billing
address per customer. One address can be both defaults. Country and region are
stored as stable codes plus display names; validation and optional coordinates
are first-class data.

### Consent

`customer_consent` is the current state per customer and channel.
`customer_consent_event` is the append-only evidence trail containing the
contact point, source, actor, request/idempotency keys and collection metadata.
This supports pending, subscribed, unsubscribed, invalid and redacted states as
well as single and confirmed opt-in.

### Classification

Groups support Adobe-style primary/default grouping while allowing additional
memberships. Tags support simple merchant labels. Segments support both manual
membership and dynamic rule/query definitions in the Shopify style. These are
separate concepts and are not collapsed into one array column.

Segment `revision` is aggregate concurrency state: definition updates and
manual membership changes increment it. An optional `color` is presentation
metadata owned by the merchant and validated as `#RRGGBB` when present.

### Moderation

`disabled` and `blocked` are distinct lifecycle states. Disabled means the
profile is administratively inactive without a risk decision. Blocked means
customer operations are explicitly prohibited and requires `blocked_reason`;
the reason is cleared when the profile leaves the blocked state.
`moderation_note` stores internal operator context separately from the general
merchant-facing note.

### Admin updates

The Admin `customerUpdate` command is customer-scoped and revision-guarded. It
can update the profile together with addresses, consent transitions,
tax identifiers, tax exemptions, group memberships, tag assignments and manual
segment memberships. Nested operation inputs deliberately omit `customer_id`;
the command must validate every referenced entity against the outer customer
and trusted Store scope.

Assignment sections use replacement semantics so an explicit empty list clears
manual assignments, while an omitted section leaves them unchanged. Consent
transitions remain evidence-producing state changes and are never represented
as booleans.

`customerSegmentUpdate` can update definition metadata and replace manual
customer memberships atomically under the same aggregate revision. The
dedicated membership-set command remains available for membership-only writes.

### Statistics and lifecycle

`customer_statistics` stores rebuildable order counters and first/last activity
references. `customer_monetary_statistics` separates totals by currency and
uses minor units. Merge jobs are idempotent and retain source/target audit data.
Privacy requests model access, export, correction and erasure workflows without
turning a destructive operation into a single unaudited flag update.

## Important invariants

- Active normalized email is unique per store.
- IAM principal link is unique per store and may be null.
- A merged customer must reference a different target customer.
- A blocked customer has a non-empty reason; other lifecycle states do not.
- Default address uniqueness is enforced independently for shipping and billing.
- Consent state and its collection/withdrawal timestamps must agree.
- Tax validity intervals and membership expiry intervals cannot be inverted.
- Monetary values are non-negative and `net = spent - refunded`.
- Cross-service IDs such as IAM principal, order, location and media file IDs do
  not receive database foreign keys.
- Customer segment revision is non-negative and covers definition and manual
  membership changes.
