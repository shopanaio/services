# Pricing Checkout Actions — implementation plan

## Goal

Реализовать Pricing-owned actions:

- `PricingCheckoutActions.calculatePreliminaryQuote`;
- `PricingCheckoutActions.finalizeQuote`.

Actions принимают и возвращают contracts из `@shopana/broker-types`. Pricing
является единственным владельцем merchandise quote, discounts, allocations,
rounding и totals.

## Implementation

1. Добавить provider-side Zod schemas/parsers для обоих request/result contracts
   и проверок provenance/revisions.
2. Реализовать `PricingCatalogMerchandisePort` через
   `CatalogCheckoutActions.resolveMerchandise`, используя существующий
   `toCatalogMerchandiseParams()`.
3. Реализовать `PricingCheckoutQuotePort.calculatePreliminaryQuote()`:
   - разрешить все source/component lines через Catalog;
   - сформировать canonical transformed lines, lineage, availability и delivery
     intent;
   - разрешить automatic/code discount owners на `effectiveAt`;
   - выполнить native/App line и order discounts, combination policy,
     allocation и minor-unit rounding;
   - вернуть code resolutions, usage requirements, totals и deterministic
     revisions.
4. Реализовать `finalizeQuote()` только поверх parsed preliminary snapshot и
   Delivery snapshot: применить shipping discounts, не менять merchandise
   lineage/availability, вычислить final totals; tax в v1 равен zero согласно
   текущему contract decision.
5. Реализовать idempotent `PricingQuoteSnapshotPort` для immutable preliminary и
   final snapshots; одинаковый canonical input даёт одинаковую revision.
6. Добавить `PricingCheckoutBrokerActions extends BrokerActions`, зарегистрировать
   exact action names через `@Action`, собрать dependencies в `PricingModule`/
   `Kernel`.

## Verification

- empty cart, physical/non-physical cart, nested components и subscription;
- applied/pending/rejected codes, automatic discounts и incompatible discounts;
- delivery discount появляется только в final quote;
- stale/malformed Catalog или Delivery revision отклоняется;
- одинаковый input даёт те же IDs/revisions/totals;
- broker contract tests парсят результат Checkout-side canonical parsers.

## Done

Оба actions зарегистрированы и возвращают contract-valid immutable snapshots
без checkout persistence, discount usage reservation или delivery/payment logic.

## Non-Goals

- Checkout mutation integration и CAS commit.
- Discount usage reservation при order placement.
- Реальный tax engine после v1.
