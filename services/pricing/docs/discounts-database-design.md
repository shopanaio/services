# Pricing discounts database design

## Scope

This baseline models the four native discount flows represented by the Admin UI references:

- amount off products;
- buy X get Y;
- amount off order;
- free shipping.

Every kind supports code or automatic activation where the product contract allows it. Shared capabilities include buyer eligibility, minimum requirements, usage limits, customer limits, sales channels, tags, combinations, scheduling, redemption accounting, optimistic revisions, and external synchronization.

## Aggregate boundaries

`pricing.discount` is the tenant-scoped aggregate root. It owns lifecycle, activation method, native kind/class, schedule, currency, purchase modes, aggregate usage limits, and an optimistic concurrency revision. Configuration updates advance the revision but do not create immutable configuration snapshots.

Behavior-specific data is normalized into exactly one applicable subtype:

- `discount_amount_off` for product and order amount-off rules;
- `discount_buy_x_get_y` for qualifier/benefit quantities and values;
- `discount_free_shipping` for shipping-rate limits.

The pricing service validates complete non-draft aggregates inside the transaction that persists configuration changes. Drafts can be assembled incrementally, while incompatible subtypes, targets, and contexts are rejected by application-level aggregate validation.

## Cross-service references

Catalog product, variant, and collection IDs, customer and segment IDs, checkout IDs, and order IDs are stored with `store_id` but intentionally have no cross-service foreign keys. Their owner service validates them. Pricing keeps a `VALID`/`STALE` reference state where a long-lived rule needs reconciliation without silently losing historical configuration.

Local child relationships use stable entity identifiers in primary and foreign keys. `store_id` remains a tenant-scope column used by repository predicates, unique constraints, and lookup indexes, but does not participate in foreign keys.

## Money and percentages

Money uses signed PostgreSQL `bigint` minor units with non-negative or positive checks. Every discount stores the project-default currency at creation so historical rule and redemption values remain explicit if project configuration later changes.

Percentages use basis points (`1..10000`) rather than floating point. This supports two decimal places without precision loss.

## Targeting and eligibility

`discount_target_selection` defines one `QUALIFIER` or `BENEFIT` selection as all products, products, variants, or collections. Specific selections own rows in `discount_target`; all-product selections own none.

`discount_buyer_context` selects all buyers, specific customers, or customer segments. Customer and segment rows are mutually exclusive by context.

`discount_channel` is open to first-party and app-provided channel codes. Applicability is represented by row presence; `is_featured` is separate presentation metadata for shareable/featured channels.

## Usage correctness

Finite usage is protected through transactionally maintained aggregate and code counters plus expiring checkout reservations. The service must lock the relevant counter rows before checking and reserving capacity.

Committed `discount_redemption` rows are accounting headers keyed idempotently to orders. Allocation rows identify order, order-line, or shipping-line impact. The pricing service validates allocation totals and applies reversals inside the same transaction as counter updates.

## Integrations

`discount_external_reference` maps native aggregates to imported/exported provider identities without putting provider-specific payloads into the normalized rule tables. Pricing does not keep a separate configuration snapshot or domain-event timeline for discounts.

## Read models

- `discount_list_view` derives scheduled/active/expired status from lifecycle and time without cron-based state mutation.
- `discount_configuration_view` provides a complete Admin detail projection.
- `discount_usage_summary_view` exposes reserved, committed, reversed, consumed, and remaining usage.
- `discount_code_list_view` provides bulk-code administration and per-code usage.

## Migration ownership

```text
0000_foundation  schema and enums
0100_discounts   aggregate roots, redeem codes, tags
0200_rules       native rule subtypes and minimum requirements
0300_targets     catalog target selections
0400_eligibility buyer contexts, customers, segments
0500_availability sales channels and featured access
0600_combinations compatible discount classes
0700_usage       counters, reservations, redemptions, allocations
0900_integrations external system mappings
9000_read_models Admin and usage projections
```
