# Checkout Children Items - Документация реализации

## Обзор

Реализована поддержка дочерних товаров (children) в checkout для работы с бандлами и комплектами. Родительский товар может содержать несколько дочерних товаров с различными стратегиями ценообразования.

## Типы ценообразования (ChildPriceType)

| Тип | Описание | Формула |
|-----|----------|---------|
| `FREE` | Бесплатно | `price = 0` |
| `BASE` | Базовая цена без изменений | `price = originalPrice` |
| `DISCOUNT_AMOUNT` | Скидка фиксированной суммой | `price = originalPrice - amount` |
| `DISCOUNT_PERCENT` | Скидка в процентах | `price = originalPrice * (100 - percent) / 100` |
| `MARKUP_AMOUNT` | Наценка фиксированной суммой | `price = originalPrice + amount` |
| `MARKUP_PERCENT` | Наценка в процентах | `price = originalPrice * (100 + percent) / 100` |
| `OVERRIDE` | Фиксированная цена | `price = amount` |

**Важно:** Значения `amount` и `percent` всегда положительные. Тип определяет операцию (скидка или наценка).

## Архитектура

### Иерархия данных

```
CheckoutLine (parent)
├── lineId: "parent-uuid"
├── parentLineId: null
├── priceConfig: null
├── quantity: 1
├── children:
│   ├── CheckoutLine (child 1)
│   │   ├── lineId: "child-1-uuid"
│   │   ├── parentLineId: "parent-uuid"
│   │   ├── priceConfig: { type: "DISCOUNT_PERCENT", percent: 20 }
│   │   └── quantity: 2
│   └── CheckoutLine (child 2)
│       ├── lineId: "child-2-uuid"
│       ├── parentLineId: "parent-uuid"
│       ├── priceConfig: { type: "FREE" }
│       └── quantity: 1
```

### Хранение в БД

Данные хранятся плоско (flat) в таблице `checkout_line_items`. Иерархия строится на уровне read model через поле `parent_line_item_id`.

## Изменения по компонентам

### 1. Domain Layer

**Файл:** `services/checkout/src/domain/checkout/types.ts`

```typescript
export enum ChildPriceType {
  FREE = "FREE",
  BASE = "BASE",
  DISCOUNT_AMOUNT = "DISCOUNT_AMOUNT",
  DISCOUNT_PERCENT = "DISCOUNT_PERCENT",
  MARKUP_AMOUNT = "MARKUP_AMOUNT",
  MARKUP_PERCENT = "MARKUP_PERCENT",
  OVERRIDE = "OVERRIDE",
}

export type ChildPriceConfig = {
  type: ChildPriceType;
  amount?: number;  // minor units
  percent?: number; // e.g., 10 for 10%
};

export type CheckoutLineItemState = {
  lineId: string;
  parentLineId: string | null;
  priceConfig: ChildPriceConfig | null;
  quantity: number;
  tag: {...} | null;
  unit: {
    id: string;
    price: Money;
    originalPrice: Money;  // цена до применения priceConfig
    compareAtPrice: Money | null;
    // ...
  };
};
```

### 2. Database Migration

**Файл:** `platform/migrations/cmd/0004_checkout_line_item_price_config.go`

Добавлены колонки в `checkout_line_items`:

| Колонка | Тип | Описание |
|---------|-----|----------|
| `price_type` | `VARCHAR(20)` | Тип ценообразования |
| `price_amount` | `BIGINT` | Сумма (minor units, >= 0) |
| `price_percent` | `NUMERIC(5,2)` | Процент (>= 0) |
| `unit_original_price` | `BIGINT` | Оригинальная цена (>= 0) |

Существующие записи получают `unit_original_price = unit_price` при миграции.

### 3. Plugin SDK

**Файл:** `packages/plugin-sdk/src/inventory.ts`

```typescript
export type ChildPriceType =
  | 'FREE' | 'BASE'
  | 'DISCOUNT_AMOUNT' | 'DISCOUNT_PERCENT'
  | 'MARKUP_AMOUNT' | 'MARKUP_PERCENT'
  | 'OVERRIDE';

export type ChildPriceConfigInput = Readonly<{
  type: ChildPriceType;
  amount?: number;
  percent?: number;
}>;

export type GetOffersItemInput = Readonly<{
  lineId: string;
  purchasableId: string;
  quantity: number;
  parentLineId?: string;
  priceConfig?: ChildPriceConfigInput;
}>;

export type InventoryOffer = Readonly<{
  purchasableId: string;
  unitPrice: number;           // финальная цена после priceConfig
  unitOriginalPrice: number;   // оригинальная цена
  // ...
  appliedPriceConfig?: ChildPriceConfigInput;
}>;
```

### 4. Inventory Plugin

**Файл:** `packages/inventory-plugin-shopana/src/provider.ts`

Функция `applyPriceConfig()` реализует все 7 типов ценообразования:

```typescript
function applyPriceConfig(
  originalPrice: number,
  config: ChildPriceConfigInput
): number {
  switch (config.type) {
    case "FREE":
      return 0;
    case "BASE":
      return originalPrice;
    case "DISCOUNT_AMOUNT":
      return Math.max(0, originalPrice - (config.amount ?? 0));
    case "DISCOUNT_PERCENT":
      return Math.max(0, Math.floor((originalPrice * (100 - percent)) / 100));
    case "MARKUP_AMOUNT":
      return originalPrice + (config.amount ?? 0);
    case "MARKUP_PERCENT":
      return Math.floor((originalPrice * (100 + percent)) / 100);
    case "OVERRIDE":
      return config.amount ?? originalPrice;
    default:
      return originalPrice;
  }
}
```

### 5. Read Model

**Файл:** `services/checkout/src/application/read/checkoutLineItemsReadRepository.ts`

Метод `buildLinesHierarchy()` строит дерево из плоского списка:

```typescript
private buildLinesHierarchy(rows: CheckoutLineItemReadPortRow[]): CheckoutLineItemReadView[] {
  const linesMap = new Map<string, CheckoutLineItemReadView>();
  const rootLines: CheckoutLineItemReadView[] = [];

  // Первый проход: создаем все элементы
  for (const row of rows) {
    linesMap.set(row.id, { ...this.mapRowToView(row), children: [] });
  }

  // Второй проход: строим иерархию
  for (const row of rows) {
    const line = linesMap.get(row.id)!;
    if (row.parent_line_item_id) {
      const parent = linesMap.get(row.parent_line_item_id);
      if (parent) parent.children.push(line);
    } else {
      rootLines.push(line);
    }
  }

  return rootLines;
}
```

### 6. GraphQL Schema

**Файл:** `services/checkout/src/interfaces/gql-storefront-api/schema/checkoutLine.graphql`

```graphql
enum ChildPriceType {
  FREE
  BASE
  DISCOUNT_AMOUNT
  DISCOUNT_PERCENT
  MARKUP_AMOUNT
  MARKUP_PERCENT
  OVERRIDE
}

type CheckoutLinePriceConfig {
  type: ChildPriceType!
  amount: Int
  percent: Float
}

type CheckoutLine implements Node @key(fields: "id") {
  id: ID!
  # ...existing fields...
  originalPrice: Money!
  priceConfig: CheckoutLinePriceConfig
  children: [CheckoutLine!]!
}

input CheckoutChildLineInput {
  quantity: Int!
  purchasableId: ID!
  purchasableSnapshot: PurchasableSnapshotInput
  priceType: ChildPriceType
  priceAmount: Int
  pricePercent: Float
}

input CheckoutLineAddInput {
  quantity: Int!
  purchasableId: ID!
  purchasableSnapshot: PurchasableSnapshotInput
  tagSlug: String
  children: [CheckoutChildLineInput!]
}
```

### 7. Use Cases

#### AddCheckoutLinesUseCase

- Обрабатывает `children` в input
- Валидирует положительность `priceAmount` и `pricePercent`
- Создает записи для родителя и детей с корректными `parentLineId`

#### UpdateCheckoutLinesUseCase

- Блокирует прямое обновление дочерних строк
- Каскадное удаление детей при `quantity = 0` родителя

#### RemoveCheckoutLinesUseCase

- Каскадное удаление всех дочерних строк при удалении родителя

## API Usage

### Добавление бандла с дочерними товарами

```graphql
mutation AddBundleToCheckout {
  checkoutLinesAdd(input: {
    checkoutId: "checkout-123"
    lines: [{
      purchasableId: "parent-product-id"
      quantity: 1
      children: [
        {
          purchasableId: "child-product-1"
          quantity: 2
          priceType: DISCOUNT_PERCENT
          pricePercent: 20
        },
        {
          purchasableId: "child-product-2"
          quantity: 1
          priceType: FREE
        }
      ]
    }]
  }) {
    checkout {
      lines {
        id
        title
        originalPrice { amount }
        priceConfig {
          type
          amount
          percent
        }
        children {
          id
          title
          originalPrice { amount }
          priceConfig {
            type
            percent
          }
          cost {
            unitPrice { amount }
          }
        }
      }
    }
  }
}
```

### Обновление количества (только родителя)

```graphql
mutation UpdateParentQuantity {
  checkoutLinesUpdate(input: {
    checkoutId: "checkout-123"
    lines: [{
      lineId: "parent-line-id"
      quantity: 2
    }]
  }) {
    checkout { ... }
  }
}
```

### Удаление бандла (каскадное)

```graphql
mutation RemoveBundle {
  checkoutLinesDelete(input: {
    checkoutId: "checkout-123"
    lineIds: ["parent-line-id"]
  }) {
    checkout { ... }
  }
}
```

## Ограничения

1. **Дочерние строки нельзя обновлять напрямую** - только через родителя
2. **Дочерние строки не могут иметь теги** - `tag` всегда `null`
3. **Удаление родителя удаляет всех детей** - каскадное удаление
4. **Глубина иерархии = 1** - дети не могут иметь своих детей

## Файлы изменений

| Файл | Изменения |
|------|-----------|
| `domain/checkout/types.ts` | ChildPriceType enum, ChildPriceConfig, CheckoutLineItemState |
| `domain/checkout/dto.ts` | CheckoutUnit.originalPrice, CheckoutLinesAddedLine |
| `platform/migrations/cmd/0004_*.go` | Database migration |
| `plugin-sdk/src/inventory.ts` | Types for price config |
| `inventory-plugin-shopana/src/provider.ts` | applyPriceConfig() |
| `infrastructure/writeModel/checkoutWriteRepository.ts` | New columns in upsert |
| `infrastructure/readModel/checkoutLineItemsReadRepository.ts` | Read new columns |
| `application/read/checkoutLineItemsReadRepository.ts` | buildLinesHierarchy() |
| `gql-storefront-api/schema/checkoutLine.graphql` | GraphQL schema |
| `gql-storefront-api/mapper/checkoutLine.ts` | GraphQL mapper |
| `application/checkout/types.ts` | CheckoutChildLineInput |
| `application/usecases/addCheckoutLinesUseCase.ts` | Children handling |
| `application/usecases/updateCheckoutLinesUseCase.ts` | Cascade delete |
| `application/usecases/useCase.ts` | mapLinesToDtoLines() |
