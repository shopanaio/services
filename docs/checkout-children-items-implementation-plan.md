# План реализации Children Checkout Items

## Обзор

Реализация поддержки дочерних элементов (children) для checkout line items. Позволяет создавать наборы товаров с корректным расчётом цен, скидок и totals.

## Текущее состояние

| Компонент | Статус |
|-----------|--------|
| GraphQL схема (`children: [CheckoutLine]!`) | Поле объявлено, возвращает `[]` |
| Domain model (`CheckoutLineItemState`) | Нет поддержки parent/child |
| БД (`checkout_line_items`) | Нет `parent_line_id` |
| Cost Service | Работает с плоским списком |
| Inventory API | Не поддерживает bundled items |

---

## Режимы ценообразования Children

| Режим | Описание | Формула | SQL |
|-------|----------|---------|-----|
| `FREE` | Бесплатно | `price = 0` | `0` |
| `BASE` | Без изменений | `price = originalPrice` | `unit_original_price` |
| `DISCOUNT_AMOUNT` | Скидка суммой | `price = originalPrice - amount` | `unit_original_price - price_amount` |
| `DISCOUNT_PERCENT` | Скидка процентом | `price = originalPrice * (1 - percent/100)` | `unit_original_price * (100 - price_percent) / 100` |
| `MARKUP_AMOUNT` | Наценка суммой | `price = originalPrice + amount` | `unit_original_price + price_amount` |
| `MARKUP_PERCENT` | Наценка процентом | `price = originalPrice * (1 + percent/100)` | `unit_original_price * (100 + price_percent) / 100` |
| `OVERRIDE` | Фиксированная цена | `price = amount` | `price_amount` |

> **Важно:** Значения `amount` и `percent` всегда положительные. Тип определяет действие (скидка или наценка).

---

## Фаза 1: Расширение Domain Model

### 1.1 Добавить `ChildPriceType` enum

**Файл:** `services/checkout/src/domain/checkout/types.ts`

```typescript
export enum ChildPriceType {
  FREE = 'FREE',
  BASE = 'BASE',
  DISCOUNT_AMOUNT = 'DISCOUNT_AMOUNT',
  DISCOUNT_PERCENT = 'DISCOUNT_PERCENT',
  MARKUP_AMOUNT = 'MARKUP_AMOUNT',
  MARKUP_PERCENT = 'MARKUP_PERCENT',
  OVERRIDE = 'OVERRIDE',
}

export type ChildPriceConfig = {
  type: ChildPriceType;
  amount?: number;   // minor units, for DISCOUNT_AMOUNT, MARKUP_AMOUNT, OVERRIDE
  percent?: number;  // for DISCOUNT_PERCENT, MARKUP_PERCENT (e.g., 10 for 10%)
};
```

### 1.2 Обновить `CheckoutLineItemState`

**Файл:** `services/checkout/src/domain/checkout/types.ts`

```typescript
export type CheckoutLineItemState = {
  lineId: string;
  parentLineId: string | null;           // NEW: parent relationship
  priceConfig: ChildPriceConfig | null;  // NEW: price adjustment for children
  quantity: number;
  tag: { ... } | null;
  unit: {
    id: string;
    price: Money;              // Final adjusted price
    originalPrice: Money;      // NEW: Original price before adjustments
    compareAtPrice: Money | null;
    title: string;
    imageUrl: string | null;
    sku: string | null;
    snapshot: Record<string, unknown> | null;
  };
};
```

### 1.3 Обновить DTO

**Файл:** `services/checkout/src/domain/checkout/dto.ts`

```typescript
export type CheckoutUnit = Readonly<{
  id: string;
  price: Money;
  originalPrice: Money;            // NEW
  compareAtPrice: Money | null;
  title: string;
  imageUrl: string | null;
  sku: string | null;
  snapshot: Record<string, unknown> | null;
}>;

export type CheckoutLinesAddedLine = Readonly<{
  lineId: string;
  parentLineId: string | null;           // NEW
  priceType: ChildPriceType | null;      // NEW
  priceAmount: number | null;            // NEW: minor units (always positive)
  pricePercent: number | null;           // NEW (always positive)
  quantity: number;
  tagId: string | null;
  unit: CheckoutUnit;
}>;
```

---

## Фаза 2: Миграция БД

### 2.1 Добавить колонки в `checkout_line_items`

```sql
ALTER TABLE platform.checkout_line_items
  ADD COLUMN parent_line_id UUID REFERENCES platform.checkout_line_items(id) ON DELETE CASCADE,
  ADD COLUMN price_type VARCHAR(20) CHECK (price_type IN (
    'FREE', 'BASE',
    'DISCOUNT_AMOUNT', 'DISCOUNT_PERCENT',
    'MARKUP_AMOUNT', 'MARKUP_PERCENT',
    'OVERRIDE'
  )),
  ADD COLUMN price_amount BIGINT,         -- minor units (always positive)
  ADD COLUMN price_percent NUMERIC(5,2),  -- percentage (always positive, e.g., 10.00)
  ADD COLUMN unit_original_price BIGINT;  -- original price before adjustments

CREATE INDEX idx_checkout_line_items_parent ON platform.checkout_line_items(parent_line_id);

-- Computed column for final price (for SQL queries)
COMMENT ON COLUMN platform.checkout_line_items.price_type IS
  'Price calculation:
   FREE = 0,
   BASE = unit_original_price,
   DISCOUNT_AMOUNT = unit_original_price - price_amount,
   DISCOUNT_PERCENT = unit_original_price * (100 - price_percent) / 100,
   MARKUP_AMOUNT = unit_original_price + price_amount,
   MARKUP_PERCENT = unit_original_price * (100 + price_percent) / 100,
   OVERRIDE = price_amount';
```

### 2.2 SQL для расчёта цены

```sql
-- Вычисление финальной цены в SQL
SELECT
  cli.*,
  CASE cli.price_type
    WHEN 'FREE' THEN 0
    WHEN 'BASE' THEN cli.unit_original_price
    WHEN 'DISCOUNT_AMOUNT' THEN GREATEST(0, cli.unit_original_price - cli.price_amount)
    WHEN 'DISCOUNT_PERCENT' THEN GREATEST(0, cli.unit_original_price * (100 - cli.price_percent) / 100)
    WHEN 'MARKUP_AMOUNT' THEN cli.unit_original_price + cli.price_amount
    WHEN 'MARKUP_PERCENT' THEN cli.unit_original_price * (100 + cli.price_percent) / 100
    WHEN 'OVERRIDE' THEN cli.price_amount
    ELSE cli.unit_original_price
  END AS computed_unit_price
FROM platform.checkout_line_items cli;
```

---

## Фаза 3: Inventory API Integration

### 3.1 Расширить `GetOffersInput`

**Файл:** `packages/plugin-sdk/src/inventory.ts`

```typescript
export type ChildPriceConfigInput = Readonly<{
  type: 'FREE' | 'BASE' | 'DISCOUNT_AMOUNT' | 'DISCOUNT_PERCENT' |
        'MARKUP_AMOUNT' | 'MARKUP_PERCENT' | 'OVERRIDE';
  amount?: number;   // minor units (always positive)
  percent?: number;  // always positive
}>;

export type GetOffersItemInput = Readonly<{
  lineId: string;
  purchasableId: string;
  quantity: number;
  // NEW: For bundled items
  parentLineId?: string;
  priceConfig?: ChildPriceConfigInput;
}>;
```

### 3.2 Расширить `InventoryOffer`

**Файл:** `packages/plugin-sdk/src/inventory.ts`

```typescript
export type InventoryOffer = Readonly<{
  purchasableId: string;
  unitPrice: number;           // Final adjusted price (minor units)
  unitOriginalPrice: number;   // NEW: Original price before adjustments
  unitCompareAtPrice?: number | null;
  isAvailable: boolean;
  isPhysical: boolean;
  paymentMode: PaymentMode;
  purchasableSnapshot?: PurchasableSnapshot;
  providerPayload?: Record<string, unknown>;
  // NEW: Applied price adjustment info
  appliedPriceConfig?: ChildPriceConfigInput;
}>;
```

### 3.3 Обновить `inventory-plugin-shopana`

**Файл:** `packages/inventory-plugin-shopana/src/provider.ts`

```typescript
private applyPriceConfig(
  originalPrice: number,
  config: ChildPriceConfigInput
): number {
  switch (config.type) {
    case 'FREE':
      return 0;

    case 'BASE':
      return originalPrice;

    case 'DISCOUNT_AMOUNT':
      return Math.max(0, originalPrice - (config.amount ?? 0));

    case 'DISCOUNT_PERCENT':
      const discountPercent = config.percent ?? 0;
      return Math.max(0, Math.floor(originalPrice * (100 - discountPercent) / 100));

    case 'MARKUP_AMOUNT':
      return originalPrice + (config.amount ?? 0);

    case 'MARKUP_PERCENT':
      const markupPercent = config.percent ?? 0;
      return Math.floor(originalPrice * (100 + markupPercent) / 100);

    case 'OVERRIDE':
      return config.amount ?? originalPrice;

    default:
      return originalPrice;
  }
}
```

---

## Фаза 4: Обновление Repositories

### 4.1 Write Repository

**Файл:** `services/checkout/src/infrastructure/writeModel/checkoutWriteRepository.ts`

```typescript
const values = data.checkoutLines.map((l) => ({
  // ... existing fields
  parent_line_id: l.parentLineId,
  price_type: l.priceType,
  price_amount: l.priceAmount,       // always positive
  price_percent: l.pricePercent,     // always positive
  unit_original_price: this.toBigintSql(l.unit.originalPrice),
}));
```

### 4.2 Read Repository

**Файл:** `services/checkout/src/infrastructure/readModel/checkoutLineItemsReadRepository.ts`

```typescript
.select(
  // ... existing columns
  "cli.parent_line_id",
  "cli.price_type",
  "cli.price_amount",
  "cli.price_percent",
  "cli.unit_original_price",
)
```

### 4.3 Read View Type

**Файл:** `services/checkout/src/application/read/checkoutLineItemsReadRepository.ts`

```typescript
export type CheckoutLineItemReadView = {
  // ... existing fields
  parentLineId: string | null;
  priceConfig: {
    type: ChildPriceType;
    amount: number | null;   // always positive
    percent: number | null;  // always positive
  } | null;
  unit: {
    // ... existing fields
    originalPrice: Money;
  };
  children: CheckoutLineItemReadView[];
};
```

---

## Фаза 5: Логика расчёта цен

### 5.1 Обновить `CheckoutCostService`

**Файл:** `services/checkout/src/application/services/checkoutCostService.ts`

```typescript
async computeTotals(input: ComputeTotalsInput): Promise<ComputeTotalsResult> {
  // 1. Group lines by parent
  const { parentLines, childrenByParent } = this.groupLinesByParent(input.checkoutLines);

  // 2. Build base line items (prices already adjusted by Inventory API)
  const allLineCosts = this.buildBaseLineItems(input.checkoutLines);

  // 3. Resolve discounts
  const discountsResult = await this.resolveDiscounts(input);

  // 4. Calculate checkout totals
  const checkoutCost = this.calculateCheckoutCost(
    allLineCosts,
    parentLines,
    childrenByParent,
    discountsResult
  );

  return {
    checkoutCost,
    checkoutLinesCost: this.buildLinesCostMap(allLineCosts),
    appliedDiscounts: discountsResult.aggregatedDiscounts,
  };
}

private calculateCheckoutCost(
  allLineCosts: CheckoutLineItemCost[],
  parentLines: CheckoutLineItemState[],
  childrenByParent: Map<string, CheckoutLineItemState[]>,
  discountsResult: DiscountsResult
): CheckoutCost {
  // Subtotal = sum of all lines (parent + children)
  // Children prices are already adjusted by their priceConfig
  const subtotal = allLineCosts.reduce(
    (sum, line) => sum.add(line.subtotal),
    Money.zero()
  );

  // Quantity = only parent quantities (children are part of parent)
  const totalQuantity = parentLines.reduce(
    (sum, line) => sum + line.quantity,
    0
  );

  const discountTotal = this.calculateDiscountAmount(
    subtotal,
    discountsResult.aggregatedDiscounts
  );
  const grandTotal = subtotal.subtract(discountTotal);

  return {
    subtotal,
    discountTotal,
    taxTotal: Money.zero(),
    shippingTotal: Money.zero(),
    grandTotal,
    totalQuantity,
  };
}
```

### 5.2 Поддержка FIXED скидок

```typescript
private calculateDiscountAmount(amount: Money, discounts: Discount[]): Money {
  return discounts.reduce((total, discount) => {
    switch (discount.type) {
      case DiscountType.PERCENTAGE:
        const amountMinor = amount.amountMinor();
        const discountMinor = (amountMinor * BigInt(discount.value)) / 100n;
        return total.add(Money.fromMinor(discountMinor, amount.currency().code));

      case DiscountType.FIXED:
        return total.add(Money.fromMinor(BigInt(discount.value), amount.currency().code));

      default:
        return total;
    }
  }, Money.zero());
}
```

---

## Фаза 6: GraphQL API

### 6.1 Обновить схему

**Файл:** `services/checkout/src/interfaces/gql-storefront-api/schema/checkoutLine.graphql`

```graphql
"""
Price adjustment type for child items in a bundle.
Values are always positive - the type determines the operation.
"""
enum ChildPriceType {
  """Item is free (price = 0)"""
  FREE

  """Use original price without adjustments"""
  BASE

  """Subtract fixed amount from original price"""
  DISCOUNT_AMOUNT

  """Subtract percentage from original price"""
  DISCOUNT_PERCENT

  """Add fixed amount to original price"""
  MARKUP_AMOUNT

  """Add percentage to original price"""
  MARKUP_PERCENT

  """Override with fixed price"""
  OVERRIDE
}

input CheckoutLineAddInput {
  quantity: Int!
  purchasableId: ID!
  purchasableSnapshot: PurchasableSnapshotInput
  tagSlug: String

  """
  Child items for this line. If provided, this line becomes a parent.
  """
  children: [CheckoutChildLineInput!]
}

input CheckoutChildLineInput {
  """Quantity of child item."""
  quantity: Int!

  """ID of the purchasable for child item."""
  purchasableId: ID!

  """Snapshot data for child purchasable."""
  purchasableSnapshot: PurchasableSnapshotInput

  """Price adjustment type for this child. Defaults to BASE if not specified."""
  priceType: ChildPriceType

  """
  Amount for DISCOUNT_AMOUNT, MARKUP_AMOUNT or OVERRIDE (in minor units).
  Must be positive.
  """
  priceAmount: Int

  """
  Percentage for DISCOUNT_PERCENT or MARKUP_PERCENT.
  Must be positive (e.g., 10 for 10%).
  """
  pricePercent: Float
}

type CheckoutLine implements Node @key(fields: "id") {
  # ... existing fields ...

  """Original price before any adjustments."""
  originalPrice: Money!

  """Price adjustment applied to this line (for children)."""
  priceConfig: CheckoutLinePriceConfig

  """Child items that make up this checkout line."""
  children: [CheckoutLine!]!
}

type CheckoutLinePriceConfig {
  type: ChildPriceType!

  """Amount in minor units (always positive)."""
  amount: Int

  """Percentage (always positive)."""
  percent: Float
}
```

### 6.2 Обновить mapper

**Файл:** `services/checkout/src/interfaces/gql-storefront-api/mapper/checkoutLine.ts`

```typescript
export function mapCheckoutLineReadToApi(
  read: CheckoutLineItemReadView
): ApiCheckoutLine {
  return {
    id: encodeGlobalIdByType(read.id, GlobalIdEntity.CheckoutLine),
    quantity: read.quantity,
    children: read.children.map(mapCheckoutLineReadToApi),
    imageSrc: read.unit.imageUrl,
    sku: read.unit.sku,
    title: read.unit.title,
    purchasableId: encodeGlobalIdByType(read.unit.id, GlobalIdEntity.ProductVariant),
    purchasableSnapshot: read.unit.snapshot,
    originalPrice: moneyToApi(read.unit.originalPrice),
    priceConfig: read.priceConfig ? {
      type: read.priceConfig.type,
      amount: read.priceConfig.amount,
      percent: read.priceConfig.percent,
    } : null,
    tag: read.tag ? { /* ... */ } : null,
    cost: {
      compareAtUnitPrice: moneyToApi(read.unit.compareAtPrice ?? Money.zero()),
      unitPrice: moneyToApi(read.unit.price),
      subtotalAmount: moneyToApi(read.subtotalAmount),
      discountAmount: moneyToApi(read.discountAmount),
      taxAmount: moneyToApi(read.taxAmount),
      totalAmount: moneyToApi(read.totalAmount),
    },
  };
}
```

---

## Фаза 7: Use Cases

### 7.1 AddCheckoutLinesUseCase

**Файл:** `services/checkout/src/application/usecases/addCheckoutLinesUseCase.ts`

```typescript
async execute(input: CheckoutLinesAddInput): Promise<string> {
  // Validate price config values are positive
  for (const line of businessInput.lines) {
    for (const child of line.children ?? []) {
      if (child.priceAmount != null && child.priceAmount < 0) {
        throw new Error('priceAmount must be positive');
      }
      if (child.pricePercent != null && child.pricePercent < 0) {
        throw new Error('pricePercent must be positive');
      }
    }
  }

  // Build items list including children with price configs
  const itemsForOffers: GetOffersItemInput[] = [];

  for (const line of businessInput.lines) {
    const parentLineId = uuidv7();

    // Add parent item
    itemsForOffers.push({
      lineId: parentLineId,
      purchasableId: line.purchasableId,
      quantity: line.quantity,
    });

    // Add children with price configs
    for (const child of line.children ?? []) {
      itemsForOffers.push({
        lineId: uuidv7(),
        purchasableId: child.purchasableId,
        quantity: child.quantity,
        parentLineId: parentLineId,
        priceConfig: child.priceType ? {
          type: child.priceType,
          amount: child.priceAmount ?? undefined,
          percent: child.pricePercent ?? undefined,
        } : undefined,
      });
    }
  }

  // Get offers with adjusted prices from Inventory API
  const { offers } = await this.checkoutService.getOffers({
    apiKey: ctx.apiKey,
    currency: state.currencyCode,
    projectId: ctx.project.id,
    items: itemsForOffers,
  });

  // Build checkout lines from offers
  const newLines: CheckoutLineItemState[] = itemsForOffers.map((item) => {
    const offer = offers.get(item.purchasableId);
    if (!offer?.isAvailable) {
      throw new Error(`Product not found in inventory`);
    }

    return {
      lineId: item.lineId,
      parentLineId: item.parentLineId ?? null,
      priceConfig: item.priceConfig ?? null,
      quantity: item.quantity,
      tag: null,
      unit: {
        id: item.purchasableId,
        title: offer.purchasableSnapshot?.title ?? "",
        sku: offer.purchasableSnapshot?.sku ?? null,
        price: Money.fromMinor(BigInt(offer.unitPrice)),
        originalPrice: Money.fromMinor(BigInt(offer.unitOriginalPrice)),
        compareAtPrice: offer.unitCompareAtPrice != null
          ? Money.fromMinor(BigInt(offer.unitCompareAtPrice))
          : null,
        imageUrl: offer.purchasableSnapshot?.imageUrl ?? null,
        snapshot: offer.purchasableSnapshot?.data ?? null,
      },
    };
  });

  // ... rest of the method
}
```

### 7.2 UpdateCheckoutLinesUseCase

- Changing parent quantity does NOT change children quantities
- Children are updated separately via their lineId

### 7.3 RemoveCheckoutLinesUseCase

- Deleting parent automatically deletes children (DB CASCADE)
- Deleting child recalculates totals

---

## Фаза 8: Read Model Adapter

### 8.1 Build hierarchy

**Файл:** `services/checkout/src/application/read/checkoutReadModelAdapter.ts`

```typescript
private buildLinesHierarchy(
  flatLines: CheckoutLineItemReadPortRow[]
): CheckoutLineItemReadView[] {
  const linesMap = new Map<string, CheckoutLineItemReadView>();
  const rootLines: CheckoutLineItemReadView[] = [];

  // First pass: create all items
  for (const row of flatLines) {
    linesMap.set(row.id, {
      ...this.mapRowToView(row),
      priceConfig: row.price_type ? {
        type: row.price_type as ChildPriceType,
        amount: row.price_amount,
        percent: row.price_percent,
      } : null,
      children: [],
    });
  }

  // Second pass: build hierarchy
  for (const row of flatLines) {
    const line = linesMap.get(row.id)!;
    if (row.parent_line_id) {
      const parent = linesMap.get(row.parent_line_id);
      if (parent) {
        parent.children.push(line);
      }
    } else {
      rootLines.push(line);
    }
  }

  // Sort children by created_at
  for (const line of linesMap.values()) {
    line.children.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  return rootLines;
}
```

---

## Порядок реализации

| # | Задача | Файлы | Приоритет |
|---|--------|-------|-----------|
| 1 | Domain types + ChildPriceType enum | `types.ts`, `dto.ts` | High |
| 2 | DB migration | SQL migration | High |
| 3 | Inventory API types | `plugin-sdk/inventory.ts` | High |
| 4 | Inventory plugin (price adjustments) | `inventory-plugin-shopana/provider.ts` | High |
| 5 | Write repository | `checkoutWriteRepository.ts` | High |
| 6 | Read repository | `checkoutLineItemsReadRepository.ts` | High |
| 7 | Read adapter (hierarchy) | `checkoutReadModelAdapter.ts` | High |
| 8 | Cost service (FIXED discount support) | `checkoutCostService.ts` | High |
| 9 | GraphQL schema | `checkoutLine.graphql` | Medium |
| 10 | GraphQL types | `types.ts` | Medium |
| 11 | GraphQL mapper | `checkoutLine.ts` | Medium |
| 12 | AddCheckoutLinesUseCase | `addCheckoutLinesUseCase.ts` | Medium |
| 13 | UpdateCheckoutLinesUseCase | `updateCheckoutLinesUseCase.ts` | Medium |
| 14 | RemoveCheckoutLinesUseCase | `removeCheckoutLinesUseCase.ts` | Medium |
| 15 | Unit tests | `*.test.ts` | Low |
| 16 | Integration tests | `*.integration.test.ts` | Low |

---

## Маппинг с Platform ProductGroupPriceType

| Platform (Go) | Checkout (TS) | Примечание |
|--------------|---------------|------------|
| `FREE` | `FREE` | Одинаково |
| `BASE` | `BASE` | Одинаково |
| `BASE_ADJUST_AMOUNT` (+) | `MARKUP_AMOUNT` | Положительное значение |
| `BASE_ADJUST_AMOUNT` (-) | `DISCOUNT_AMOUNT` | Отрицательное значение → положительное |
| `BASE_ADJUST_PERCENT` (+) | `MARKUP_PERCENT` | Положительное значение |
| `BASE_ADJUST_PERCENT` (-) | `DISCOUNT_PERCENT` | Отрицательное значение → положительное |
| `BASE_OVERRIDE` | `OVERRIDE` | Переименовано |

---

## Edge Cases

### 1. Nested children
- **Solution:** Forbid. Child cannot have children.

### 2. Negative prices after discount
- **Solution:** `Math.max(0, adjustedPrice)` — price cannot go below zero.

### 3. FREE children with discounts
- FREE items have price = 0, checkout discounts don't affect them.

### 4. Deleting last child
- Parent remains with its own price only.

### 5. Different currencies
- All items use checkout currency (`state.currencyCode`).

### 6. Negative values in input
- **Solution:** Validate and reject. `priceAmount` and `pricePercent` must be >= 0.

---

## Тестирование

### Unit Tests

```typescript
describe('CheckoutCostService', () => {
  describe('computeTotals with children', () => {
    it('should calculate FREE child correctly', async () => {
      // Parent: $50, Child: FREE
      // Expected: Total = $50
    });

    it('should calculate BASE child correctly', async () => {
      // Parent: $50, Child: $20 (BASE)
      // Expected: Total = $70
    });

    it('should calculate DISCOUNT_AMOUNT correctly', async () => {
      // Parent: $50, Child: original $20, DISCOUNT_AMOUNT = 500 ($5)
      // Expected: Child price = $15, Total = $65
    });

    it('should calculate DISCOUNT_PERCENT correctly', async () => {
      // Parent: $50, Child: original $20, DISCOUNT_PERCENT = 25
      // Expected: Child price = $15, Total = $65
    });

    it('should calculate MARKUP_AMOUNT correctly', async () => {
      // Parent: $50, Child: original $20, MARKUP_AMOUNT = 500 ($5)
      // Expected: Child price = $25, Total = $75
    });

    it('should calculate MARKUP_PERCENT correctly', async () => {
      // Parent: $50, Child: original $20, MARKUP_PERCENT = 25
      // Expected: Child price = $25, Total = $75
    });

    it('should calculate OVERRIDE correctly', async () => {
      // Parent: $50, Child: original $20, OVERRIDE = 999 ($9.99)
      // Expected: Child price = $9.99, Total = $59.99
    });

    it('should clamp price to zero on large discount', async () => {
      // Child: original $20, DISCOUNT_AMOUNT = 5000 ($50)
      // Expected: Child price = $0 (not negative)
    });
  });
});
```

### Integration Tests

```typescript
describe('Checkout with bundled items', () => {
  it('should create checkout with various price adjustments', async () => {
    const result = await checkoutCreate({
      lines: [{
        purchasableId: 'parent-1',
        quantity: 1,
        children: [
          {
            purchasableId: 'child-1',
            quantity: 2,
            priceType: 'DISCOUNT_PERCENT',
            pricePercent: 10,  // 10% off
          },
          {
            purchasableId: 'child-2',
            quantity: 1,
            priceType: 'FREE',
          },
          {
            purchasableId: 'child-3',
            quantity: 1,
            priceType: 'MARKUP_AMOUNT',
            priceAmount: 500,  // +$5
          },
        ],
      }],
    });

    expect(result.checkout.lines[0].children).toHaveLength(3);
    expect(result.checkout.lines[0].children[1].cost.unitPrice.amount).toBe(0);
  });

  it('should reject negative priceAmount', async () => {
    await expect(checkoutCreate({
      lines: [{
        purchasableId: 'parent-1',
        quantity: 1,
        children: [{
          purchasableId: 'child-1',
          quantity: 1,
          priceType: 'DISCOUNT_AMOUNT',
          priceAmount: -500,  // INVALID
        }],
      }],
    })).rejects.toThrow('priceAmount must be positive');
  });
});
```

---

## Пример запроса

```graphql
mutation CreateCheckoutWithBundle {
  checkoutCreate(input: {
    lines: [{
      purchasableId: "gid://shopana/ProductVariant/main-product"
      quantity: 1
      children: [
        {
          purchasableId: "gid://shopana/ProductVariant/addon-1"
          quantity: 2
          priceType: DISCOUNT_PERCENT
          pricePercent: 15  # 15% off original price
        }
        {
          purchasableId: "gid://shopana/ProductVariant/gift"
          quantity: 1
          priceType: FREE
        }
        {
          purchasableId: "gid://shopana/ProductVariant/premium-upgrade"
          quantity: 1
          priceType: MARKUP_AMOUNT
          priceAmount: 1000  # +$10.00
        }
        {
          purchasableId: "gid://shopana/ProductVariant/fixed-price-item"
          quantity: 1
          priceType: OVERRIDE
          priceAmount: 999  # Fixed $9.99
        }
      ]
    }]
  }) {
    checkout {
      id
      lines {
        id
        title
        quantity
        cost {
          unitPrice { amount currencyCode }
          subtotalAmount { amount }
        }
        originalPrice { amount }
        priceConfig {
          type
          amount
          percent
        }
        children {
          id
          title
          cost {
            unitPrice { amount }
          }
          originalPrice { amount }
          priceConfig {
            type
            amount
            percent
          }
        }
      }
      cost {
        subtotalAmount { amount }
        grandTotal { amount }
      }
    }
  }
}
```
