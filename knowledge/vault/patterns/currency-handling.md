---
tags:
  - patterns
  - currency
  - pricing
  - admin-ui
related:
  - configuration/federation-config
  - patterns/admin-graphql-layer
  - patterns/resolver
---

# Currency Handling

## Rule

Shopana APIs return all monetary amounts in the project's default currency.

The Admin UI must render monetary amounts using the project's default currency everywhere. It must not render the currency code that may be present in an individual entity, price object, order, or payload.

## API Contract

- Treat the project's default currency as the canonical currency for API responses.
- Price, subtotal, total, discount, tax, shipping, and other monetary response fields are already expressed in the project default currency.
- Do not infer the displayed currency from a money-bearing object unless that object explicitly represents a currency configuration record.
- When an API payload contains a `currency`, `currencyCode`, or similarly named field near an amount, that field is not the Admin UI display source for standard monetary rendering.

## Admin UI Contract

- Resolve the project default currency from project configuration or the shared Admin UI project context.
- Use that default currency for every formatted amount in Admin UI screens, tables, forms, summaries, and order details.
- Keep amount formatting centralized through the existing money or currency formatter instead of formatting ad hoc in components.
- Do not pass per-record currency values into display formatters for normal admin monetary values.

## Implementation Guidance

- Backend pricing and order flows should normalize money to the project default currency before returning API data.
- GraphQL resolvers should expose monetary values as default-currency values unless a field is explicitly documented as a currency configuration field.
- Admin UI components should receive either already formatted money or an amount plus the project default currency.
- If a future feature needs multi-currency display, add an explicit field or view model for that purpose instead of changing the default Admin UI rendering rule.

## Examples

```typescript
// Good: Admin UI formats with the project default currency.
formatMoney(price.amount, project.defaultCurrencyCode);

// Bad: Admin UI formats with the currency attached to a product, price, or order payload.
formatMoney(price.amount, price.currencyCode);
```

```typescript
// Good: resolver response values are already normalized to project default currency.
return {
  subtotalAmount: totals.subtotalAmount,
  totalAmount: totals.totalAmount,
};
```

## See Also

- [[configuration/federation-config]] - Gateway context and header propagation.
- [[patterns/admin-graphql-layer]] - Admin GraphQL layer conventions.
- [[patterns/resolver]] - Resolver context and field resolution patterns.
