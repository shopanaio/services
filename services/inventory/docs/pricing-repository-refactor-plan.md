# PricingRepository Refactor Plan

## Overview

Refactor `PricingRepository.ts` to use `createRelayQuery` from `@shopana/drizzle-query` instead of manual cursor pagination implementation.

## Current Issues

1. **Manual cursor handling** in `getPriceHistory` (lines 189-240):
   - Custom `decodeCursor` method
   - Extra query to fetch `cursorEffectiveFrom`
   - Manual cursor condition building

2. **Missing transaction** in `setPrice` — race condition between `closeCurrent` and `create`

3. **No error handling** in `decodeCursor` for invalid base64

4. **Duplicated overlap condition** in `getPriceHistory` and `getPriceStatistics`

## Refactor Steps

### Step 1: Create RelayQuery for Pricing

```typescript
const pricingRelayQuery = createRelayQuery(
  createQuery(itemPricing)
    .include(["id", "variantId", "currency", "effectiveFrom", "effectiveTo"])
    .maxLimit(100)
    .defaultLimit(20),
  {
    name: "itemPricing",
    tieBreaker: "id"
  }
);

export type PricingRelayInput = InferRelayInput<typeof pricingRelayQuery>;
```

### Step 2: Replace `getPriceHistory` with RelayQuery

**Before:**
```typescript
async getPriceHistory(input: GetPriceHistoryInput): Promise<ItemPricing[]> {
  const cursorId = this.decodeCursor(input.after);
  // ... 50 lines of manual cursor logic
}
```

**After:**
```typescript
async getPriceHistory(input: GetPriceHistoryInput) {
  return pricingRelayQuery.execute(this.connection, {
    first: input.limit,
    after: input.after,
    where: {
      projectId: { _eq: this.storeId },
      variantId: { _eq: input.variantId },
      currency: { _eq: input.currency },
      effectiveFrom: { _lte: input.to },
      _or: [
        { effectiveTo: { _isNull: true } },
        { effectiveTo: { _gte: input.from } }
      ]
    },
    order: [{ effectiveFrom: "desc" }]
  });
}
```

### Step 3: Remove Dead Code

- Delete `decodeCursor` method
- Remove `pricingPaginationQuery` if unused after refactor
- Remove `PricingCursorInput` type if unused

### Step 4: Add Transaction to `setPrice`

```typescript
async setPrice(
  variantId: string,
  data: {
    currency: Currency;
    amountMinor: number;
    compareAtMinor?: number | null;
  }
): Promise<ItemPricing> {
  return this.connection.transaction(async (tx) => {
    await tx
      .update(itemPricing)
      .set({ effectiveTo: new Date() })
      .where(
        and(
          eq(itemPricing.projectId, this.storeId),
          eq(itemPricing.variantId, variantId),
          eq(itemPricing.currency, data.currency),
          isNull(itemPricing.effectiveTo)
        )
      );

    const id = randomUUID();
    const now = new Date();
    const result = await tx
      .insert(itemPricing)
      .values({
        projectId: this.storeId,
        id,
        variantId,
        currency: data.currency,
        amountMinor: data.amountMinor,
        compareAtMinor: data.compareAtMinor ?? null,
        effectiveFrom: now,
        effectiveTo: null,
        recordedAt: now,
      })
      .returning();

    return result[0]!;
  });
}
```

### Step 5: Extract Overlap Condition Helper

```typescript
private buildOverlapWhere(from: Date, to: Date) {
  return {
    effectiveFrom: { _lte: to },
    _or: [
      { effectiveTo: { _isNull: true } },
      { effectiveTo: { _gte: from } }
    ]
  };
}
```

Use in both `getPriceHistory` and `getPriceStatistics`.

## Files to Modify

- `services/inventory/src/repositories/pricing/PricingRepository.ts`

## Testing

1. Verify `getPriceHistory` returns same results with new implementation
2. Test cursor pagination works correctly (first page, next page, empty page)
3. Test `setPrice` transaction rollback on failure
4. Test overlap condition edge cases:
   - Price with `effectiveTo = null` (current price)
   - Price fully within range
   - Price overlapping start/end of range

## Estimated Changes

- Lines removed: ~50 (manual cursor logic)
- Lines added: ~20 (relay query setup + helper)
- Net reduction: ~30 lines
