# Bundle Types Implementation Plan

## Current System Overview

Existing primitives:

| Primitive | Description |
|-----------|-------------|
| `IComponentGroup` | Группа компонентов: `minSelection`, `maxSelection` (min=0 → optional, max>1 → multiple) |
| `ComponentItem` | Элемент группы: product/variant + pricing rule |
| `IDependencyRule` | Правило: conditions (WHEN) → actions (THEN) |
| `ComponentPriceType` | BASE, FIXED, MARKUP_%, DISCOUNT_%, MARKUP_FIXED, DISCOUNT_FIXED, FREE, INCLUDED |
| `IBundleSettings` | Display style, stock behavior |

Dependency rule capabilities:
- **Conditions**: IS_SELECTED, IS_NOT_SELECTED, QTY_GTE/LTE/EQ, GROUP_UNIQUE_GTE, GROUP_TOTAL_QTY_GTE
- **Actions**: SHOW, HIDE, ENABLE, DISABLE, SET_QTY, OVERRIDE_PRICE, ADJUST_PRICE
- **Targets**: ITEM, GROUP, BUNDLE

---

## Уровень 1: Product Bundles (бандл = новый продукт)

Эти типы создают отдельный продукт-бандл с children. Полностью покрываются текущей моделью component groups + dependency rules.

---

### 1. Fixed Bundle (Kit)

**Что это:** Набор с фиксированным составом. Мерчант выбирает товары, покупатель берёт "как есть".

**Примеры:** "Starter Kit", "Gift Set", "Camera Bundle (body + lens + bag)"

**Маппинг на текущую модель:**

```
Bundle Product
├── Group: "Состав набора"
│   ├── minSelection: 3 (все обязательны, = кол-ву items)
│   ├── maxSelection: 3 (ровно столько же)
│   └── Items:
│       ├── Item A (priceType: INCLUDED)
│       ├── Item B (priceType: INCLUDED)
│       └── Item C (priceType: INCLUDED)
```

**Что нужно добавить:**

1. `BundleType` enum:
   ```typescript
   enum BundleType {
     FIXED = "FIXED",
     // ... other types
   }
   ```

2. Поле `bundleType` на уровне продукта/бандла — определяет UI и validation logic.

3. При `bundleType: FIXED`:
   - Все группы `minSelection = maxSelection = items.length`
   - Все items авто-выбраны, UI не показывает selection controls
   - Покупатель видит только список "что входит" + единую цену
   - Storefront рендерит как карточку с содержимым, без интерактива

**Pricing strategies:**
- `INCLUDED` — цена каждого компонента "входит" в общую цену бандла (мерчант ставит цену бандла вручную)
- `FIXED` per item — фиксированная цена компонента (сумма = цена бандла)
- `DISCOUNT_PERCENT` — "каждый со скидкой 20%", итог = сумма скидочных цен

**Dependency rules:** Обычно не нужны для fixed bundle. Возможное исключение — conditional pricing ("если берут kit → override цену bundle").

---

### 2. Multipack

**Что это:** Несколько штук одного товара. Частный случай Fixed Bundle.

**Примеры:** "3-pack socks", "6-pack beer", "Case of 12"

**Маппинг на текущую модель:**

```
Bundle Product
├── Group: "Товар"
│   ├── minSelection: 1
│   ├── maxSelection: 1
│   └── Items:
│       └── Item A (priceType: DISCOUNT_PERCENT, priceValue: 15)
│           └── quantity: 3 (НОВОЕ ПОЛЕ)
```

**Что нужно добавить:**

1. `defaultQuantity` поле на `ComponentItem`:
   ```typescript
   interface ComponentItem {
     // ...existing
     defaultQuantity: number;  // default 1, for multipack = N
     quantityLocked: boolean;  // true = покупатель не может менять qty
   }
   ```

2. При `bundleType: MULTIPACK`:
   - Одна группа, один item с `defaultQuantity > 1`
   - `quantityLocked: true` — покупатель берёт ровно N штук
   - UI показывает "3-pack" badge, единую цену

3. Variant selection для multipack:
   - Вариант 1: все одинаковые (lock variant)
   - Вариант 2: "3 любых варианта" → это уже mix-and-match

**Pricing:** Обычно `DISCOUNT_PERCENT` или `FIXED` (cheaper per unit than buying individually).

**Inventory:** При покупке multipack списывается `N` единиц стока товара A.

---

### 3. Mix-and-Match / Build-a-Box

**Что это:** Покупатель сам выбирает из разрешённого списка по правилам.

**Примеры:** "Собери коробку конфет (выбери 6)", "Build your own salad bowl", "Pick any 3 toppings"

**Маппинг на текущую модель:**

```
Bundle Product
├── Group: "Выберите конфеты"
│   ├── minSelection: 6        (обязательная, min >= 1)
│   ├── maxSelection: 6        (или null для "до 6")
│   └── Items:
│       ├── Candy A (priceType: INCLUDED)
│       ├── Candy B (priceType: INCLUDED)
│       ├── Candy C (priceType: INCLUDED)
│       └── ... (10 вариантов)
│
├── Group: "Добавить упаковку" (опционально)
│   ├── minSelection: 0        (опциональная, min = 0)
│   ├── maxSelection: 1        (single select)
│   └── Items:
│       ├── Gift wrap (priceType: FIXED, priceValue: 5.00)
│       └── Premium box (priceType: FIXED, priceValue: 12.00)
```

**Что нужно добавить:**

1. `selectionMode` на группу:
   ```typescript
   enum SelectionMode {
     PICK_ITEMS = "PICK_ITEMS",           // выбери какие (текущий)
     PICK_QUANTITIES = "PICK_QUANTITIES", // выбери сколько каждого
   }
   ```
   - `PICK_ITEMS`: выбрал/не выбрал (maxSelection определяет сколько можно)
   - `PICK_QUANTITIES`: можно несколько штук одного item (нужен min/max per item)

2. Per-item quantity constraints:
   ```typescript
   interface ComponentItem {
     // ...existing
     minQuantity: number;    // min per item (default 0)
     maxQuantity: number | null; // max per item (null = unlimited within group max)
   }
   ```

3. `totalQuantity` constraint на группу (отличается от selection count):
   ```typescript
   interface IComponentGroup {
     // ...existing
     minTotalQuantity: number | null; // сумма qty всех выбранных items >= N
     maxTotalQuantity: number | null; // сумма qty всех выбранных items <= N
   }
   ```
   Пример: "выбери любые конфеты, всего 10 штук" — `minTotalQuantity: 10, maxTotalQuantity: 10`

4. Dependency rules для cross-group logic:
   ```
   Rule: "Заполни коробку полностью"
   WHEN: GROUP_TOTAL_QTY_GTE(group_candies, 6)
   THEN: ENABLE(group_packaging)   ← открыть выбор упаковки только после
   ```

**Display styles:** wizard (пошагово), accordion, tabs — уже есть в `BundleDisplaySettings`.

**Pricing strategies:**
- Flat rate: все INCLUDED, бандл имеет фиксированную цену
- Per-item: каждый item имеет свою цену (BASE / FIXED)
- Tiered: dependency rule с GROUP_TOTAL_QTY_GTE → ADJUST_PRICE на BUNDLE

---

## Уровень 2: Cart-Level Bundles (бандл = правило в корзине)

Эти типы НЕ создают отдельный продукт. Они работают как условия/скидки на уровне cart. Требуют новой подсистемы.

---

### 4. Discount Bundle (Bundle as Promotion)

**Что это:** Купи A+B → получи скидку. Нет "нового продукта", скидка применяется к существующим line items.

**Примеры:** "Купи шампунь + кондиционер = -15%", "Laptop + Case + Mouse = -$50"

**Новая модель (расширение pricing/promotions):**

```typescript
interface DiscountBundle {
  id: string;
  name: string;
  type: "DISCOUNT_BUNDLE";
  enabled: boolean;
  priority: number;

  // Что должно быть в корзине
  conditions: DiscountBundleCondition[];
  conditionLogic: "ALL" | "ANY";  // все условия или любое

  // Что происходит
  discount: DiscountDefinition;

  // Ограничения
  usageLimit: number | null;
  customerLimit: number | null;
  startDate: Date | null;
  endDate: Date | null;
  combinesWith: CombinesWithConfig;
}

interface DiscountBundleCondition {
  id: string;
  type: "PRODUCT" | "VARIANT" | "COLLECTION" | "TAG";
  targetId: string;
  minQuantity: number;        // default 1
}

interface DiscountDefinition {
  type: "PERCENT" | "FIXED_AMOUNT" | "FIXED_PRICE";
  value: number;
  applyTo: "EACH_ITEM" | "BUNDLE_TOTAL" | "CHEAPEST" | "MOST_EXPENSIVE";
}
```

**Что нужно реализовать:**

1. **Сервис promotions/discounts** — новый или расширение pricing service:
   - CRUD для discount bundles
   - Evaluation engine: проверяет cart lines → матчит условия → применяет скидку

2. **Cart middleware** (в checkout service):
   - При каждом изменении корзины: eval все active discount bundles
   - Применить скидки, показать "bundle savings" в UI
   - Conflict resolution: priority-based, combinesWith rules

3. **Storefront UI:**
   - Badge "Bundle & Save" на PDP
   - "Add remaining items" suggestion в корзине
   - Breakdown скидки в cart summary

4. **Admin UI:**
   - Новый раздел: Promotions → Discount Bundles
   - Визуальный конфигуратор: выбрать продукты + задать скидку
   - Analytics: сколько раз сработал, revenue impact

---

### 5. BXGY / BOGO (Buy X Get Y)

**Что это:** Купи X — получи Y бесплатно или со скидкой.

**Примеры:** "Купи 2 футболки — 3-я бесплатно", "Купи телефон — чехол за 1$"

**Модель (расширение DiscountBundle):**

```typescript
interface BXGYPromotion {
  id: string;
  name: string;
  type: "BXGY";
  enabled: boolean;

  // "Buy" часть
  buyConditions: {
    type: "PRODUCT" | "COLLECTION" | "ANY";
    targetIds: string[];     // конкретные продукты / коллекции
    quantity: number;        // сколько купить
  }[];

  // "Get" часть
  getRewards: {
    type: "PRODUCT" | "COLLECTION" | "SAME";  // SAME = тот же что купил
    targetIds: string[];
    quantity: number;        // сколько получить
    discount: {
      type: "FREE" | "PERCENT" | "FIXED_PRICE";
      value: number;         // 100 для FREE, или конкретный %/сумма
    };
    maxUsesPerOrder: number | null;
  }[];

  // Сколько раз можно применить за один заказ
  applicationLimit: number | null; // null = unlimited
  stackable: boolean;              // 6 = 2x BOGO?
}
```

**Что нужно реализовать:**

1. **Engine в checkout/pricing:**
   - Match buy conditions в cart
   - Auto-add или suggest "get" items
   - Calculate discounted price для "get" items
   - Handle stacking: купил 6 → применить BOGO 3 раза?

2. **Cart behavior (2 стратегии):**
   - **Auto-add:** система сама добавляет free item в корзину (как special line)
   - **Suggest:** показать "Вы можете добавить Y бесплатно" → покупатель кликает

3. **Inventory implications:**
   - Free items тоже списывают stock
   - Нужен отдельный tracking "promotional units given"

4. **Admin UI:**
   - Visual builder: "Buy [product picker] × [qty] → Get [product picker] × [qty] @ [discount]"
   - Preview: как это выглядит в корзине

---

### 6. Volume / Quantity Breaks

**Что это:** Прогрессивные скидки по количеству.

**Примеры:** "3+ шт = -10%", "5+ = -20%", "10+ = -30%"

**Модель:**

```typescript
interface VolumeDiscount {
  id: string;
  name: string;
  type: "VOLUME_BREAKS";
  enabled: boolean;

  // К чему применяется
  target: {
    type: "PRODUCT" | "VARIANT" | "COLLECTION" | "TAG" | "ALL";
    targetIds: string[];
  };

  // Пороги
  tiers: VolumeTier[];

  // Как считать quantity
  quantitySource: "LINE_QUANTITY" | "CART_TOTAL_OF_TARGET";
  // LINE = qty конкретной строки, CART_TOTAL = сумма qty всех matching lines

  // Display
  showOnPDP: boolean;       // показывать таблицу скидок на PDP
  showInCart: boolean;       // показывать "add N more for better price"
}

interface VolumeTier {
  minQuantity: number;
  discount: {
    type: "PERCENT" | "FIXED_AMOUNT" | "FIXED_UNIT_PRICE";
    value: number;
  };
  label?: string;           // "Best value!", "Most popular"
}
```

**Что нужно реализовать:**

1. **Pricing engine extension:**
   - При расчёте цены line item: check volume tiers
   - Найти applicable tier (max matching minQuantity)
   - Применить discount к unit price

2. **PDP widget:**
   - Таблица quantity breaks: "Buy 3+ save 10%, Buy 5+ save 20%"
   - Highlight current tier, show "buy N more" nudge

3. **Cart calculation:**
   - Recalculate при изменении qty
   - Show savings vs regular price
   - "Add 2 more for 20% off!" nudge

4. **Совместимость с product bundles:**
   - Volume discount может применяться К бандлу (купи 3 kit → скидка)
   - Или к items ВНУТРИ mix-and-match (dependency rule QTY_GTE → ADJUST_PRICE уже есть!)

**Частично уже поддерживается** через dependency rules:
```
Rule: "Volume 3+"
WHEN: QTY_GTE(item_A, 3)
THEN: ADJUST_PRICE(BUNDLE, DISCOUNT_PERCENT, 10)

Rule: "Volume 5+"  (priority higher)
WHEN: QTY_GTE(item_A, 5)
THEN: ADJUST_PRICE(BUNDLE, DISCOUNT_PERCENT, 20)
```
Но это работает только внутри бандла. Для standalone products нужна отдельная подсистема.

---

### 7. Free Gift / Add-ons

**Что это:** Подарок или доп. опции при достижении условия.

**Примеры:** "Добавь ещё 1 товар → получи подарок", "При заказе от $100 → бесплатная доставка + подарок"

**Модель:**

```typescript
interface GiftPromotion {
  id: string;
  name: string;
  type: "FREE_GIFT" | "ADDON_UNLOCK";
  enabled: boolean;

  // Условие
  trigger: GiftTrigger;

  // Что даём
  rewards: GiftReward[];

  // Поведение
  autoAdd: boolean;          // auto-add или suggest
  removableByCustomer: boolean;
  showProgressBar: boolean;  // "Ещё $20 до подарка!"
}

interface GiftTrigger {
  type: "CART_SUBTOTAL_GTE"     // сумма корзины >= X
       | "CART_ITEMS_COUNT_GTE" // кол-во позиций >= N
       | "CART_TOTAL_QTY_GTE"   // общее qty >= N
       | "SPECIFIC_PRODUCT"     // конкретный товар в корзине
       | "COLLECTION_COUNT_GTE"; // N товаров из коллекции
  value: number;
  targetIds?: string[];          // для SPECIFIC_PRODUCT / COLLECTION
}

interface GiftReward {
  type: "FREE_PRODUCT" | "DISCOUNTED_PRODUCT" | "ADDON_GROUP";
  productId?: string;          // для FREE/DISCOUNTED
  collectionId?: string;       // для ADDON_GROUP (выбери из...)
  maxQuantity: number;
  discount?: {
    type: "FREE" | "PERCENT" | "FIXED_PRICE";
    value: number;
  };
}
```

**Что нужно реализовать:**

1. **Cart evaluation engine:**
   - Watch cart changes → eval triggers
   - Add/remove gift lines при threshold crossing
   - Progress tracking: "You're $15 away from a free gift!"

2. **Gift line item type:**
   - Special cart line: `lineType: "GIFT"` или `"PROMOTIONAL_ADDON"`
   - Visual distinction в UI (badge, color)
   - Cannot be purchased standalone at this price

3. **Addon unlock UX:**
   - When trigger met → show addon selector overlay/drawer
   - "Congrats! Pick your free gift:" + product grid

4. **Edge cases:**
   - Customer removes item → drops below threshold → remove gift
   - Gift goes out of stock → show alternative or remove
   - Multiple gift promotions stack?

**Пересечение с product bundles:**
Внутри mix-and-match можно использовать dependency rules:
```
Rule: "Unlock bonus group"
WHEN: GROUP_TOTAL_QTY_GTE(group_main, 5)
THEN: SHOW(group_bonus)
```
Это уже работает в текущей системе для in-bundle add-ons.

---

### 8. Dynamic Bundle (Cart Transform)

**Что это:** Система автоматически группирует cart lines в "виртуальный бандл" для отображения/расчёта.

**Примеры:**
- Покупатель добавил A, B, C по отдельности → система показывает "Bundle: A+B+C, save $10"
- "Frequently bought together" → при добавлении всех → auto-discount

**Модель:**

```typescript
interface DynamicBundleRule {
  id: string;
  name: string;
  type: "DYNAMIC_BUNDLE";
  enabled: boolean;

  // Какие line items группировать
  matchRules: DynamicMatchRule[];
  matchMode: "ALL_REQUIRED" | "ANY_N_OF";  // все обязательны или N из M
  minMatchCount?: number;                   // для ANY_N_OF

  // Как трансформировать
  transform: {
    displayAsBundle: boolean;     // визуально объединить в cart
    bundleTitle: string;          // "Your custom bundle"
    bundleImage?: string;
    collapseLines: boolean;       // свернуть children или показать flat
  };

  // Pricing
  discount: DiscountDefinition;

  // Откуда берётся рекомендация
  source: "MANUAL" | "AI_RECOMMENDATION" | "FREQUENTLY_BOUGHT_TOGETHER";
}

interface DynamicMatchRule {
  type: "PRODUCT" | "VARIANT" | "COLLECTION" | "TAG";
  targetId: string;
  minQuantity: number;
}
```

**Что нужно реализовать:**

1. **Cart Transform middleware:**
   - After cart update: scan lines → match dynamic bundle rules
   - Group matching lines under virtual parent
   - Calculate bundle discount
   - Return transformed cart structure for display

2. **Cart line grouping:**
   ```typescript
   // Before transform:
   CartLine { product: A, qty: 1, price: $30 }
   CartLine { product: B, qty: 1, price: $20 }
   CartLine { product: C, qty: 1, price: $15 }

   // After transform:
   CartLine {
     title: "Bundle: A+B+C",
     price: $55 (was $65, save $10),
     children: [A, B, C],
     discountApplied: true
   }
   ```

3. **"Frequently Bought Together" integration:**
   - ML/analytics: определить пары/тройки товаров
   - PDP widget: "Frequently bought together" с чекбоксами
   - One-click "Add all" → dynamic bundle applies в корзине

4. **Partial match UX:**
   - "Add product C to complete your bundle and save $10!"
   - Progress indicator: "2/3 items added"

5. **Conflict resolution:**
   - Один line может матчить несколько dynamic bundles
   - Priority + "best deal for customer" logic

---

## Архитектура: Где что живёт

```
┌─────────────────────────────────────────────────────────┐
│                    ADMIN UI (admin-next)                  │
├─────────────────────────────────────────────────────────┤
│  Product Bundles:          │  Promotions:                │
│  ├── Fixed Bundle config   │  ├── Discount Bundles       │
│  ├── Multipack config      │  ├── BXGY / BOGO            │
│  ├── Mix-and-Match config  │  ├── Volume Breaks          │
│  └── Dependency Chart      │  ├── Free Gifts             │
│                            │  └── Dynamic Bundles        │
└─────────────┬──────────────┴──────────────┬─────────────┘
              │                              │
              ▼                              ▼
┌─────────────────────┐      ┌─────────────────────────────┐
│  INVENTORY SERVICE   │      │  PRICING / PROMOTIONS SVC   │
│  (product bundles)   │      │  (cart-level bundles)        │
├─────────────────────┤      ├─────────────────────────────┤
│  • Bundle CRUD       │      │  • Discount bundle CRUD     │
│  • Component Groups  │      │  • BXGY rules               │
│  • Dependency Rules  │      │  • Volume tiers             │
│  • Stock management  │      │  • Gift promotions          │
│  • Variant handling  │      │  • Dynamic bundle rules     │
└─────────┬───────────┘      └──────────────┬──────────────┘
          │                                   │
          ▼                                   ▼
┌─────────────────────────────────────────────────────────┐
│                   CHECKOUT SERVICE                        │
├─────────────────────────────────────────────────────────┤
│  Cart Middleware Pipeline:                               │
│  1. Resolve product bundles → expand to child lines     │
│  2. Evaluate discount bundles → apply cart discounts    │
│  3. Evaluate BXGY → add/discount reward lines          │
│  4. Evaluate volume breaks → adjust unit prices        │
│  5. Evaluate gifts → add promotional lines             │
│  6. Apply dynamic transforms → group lines             │
│  7. Final price calculation                             │
└─────────────────────────────────────────────────────────┘
```

---

## Приоритеты реализации

### Phase 1: Product Bundles (расширение текущего)
- [ ] Добавить `BundleType` enum (FIXED, MULTIPACK, MIX_AND_MATCH)
- [ ] Добавить `defaultQuantity`, `quantityLocked` на ComponentItem
- [ ] Добавить `selectionMode`, `minTotalQuantity`, `maxTotalQuantity` на IComponentGroup (minSelection/maxSelection уже есть)
- [ ] Добавить `minQuantity`, `maxQuantity` per item
- [ ] Storefront UI для каждого типа
- [ ] Checkout: expand bundle → child lines с pricing

### Phase 2: Volume Breaks + Discount Bundles
- [ ] Новая модель `VolumeDiscount` в pricing service
- [ ] Новая модель `DiscountBundle` в pricing service
- [ ] Cart middleware: evaluate + apply
- [ ] PDP widgets: tier table, "bundle & save" badge
- [ ] Cart UI: savings breakdown, nudges

### Phase 3: BXGY + Free Gifts
- [ ] Новая модель `BXGYPromotion`
- [ ] Новая модель `GiftPromotion`
- [ ] Cart engine: match + auto-add/suggest
- [ ] Gift line type + UI
- [ ] Progress bar ("$15 away from free gift")

### Phase 4: Dynamic Bundles
- [ ] Новая модель `DynamicBundleRule`
- [ ] Cart transform middleware
- [ ] "Frequently bought together" widget
- [ ] Partial match nudges
- [ ] Cart line grouping UI

---

## Расширения текущих типов

```typescript
// === Additions to existing types ===

enum BundleType {
  FIXED = "FIXED",
  MULTIPACK = "MULTIPACK",
  MIX_AND_MATCH = "MIX_AND_MATCH",
}

enum SelectionMode {
  PICK_ITEMS = "PICK_ITEMS",
  PICK_QUANTITIES = "PICK_QUANTITIES",
}

// ComponentItem additions
interface ComponentItem {
  // ...existing fields
  defaultQuantity: number;       // default 1
  quantityLocked: boolean;       // default false
  minQuantity: number;           // default 0
  maxQuantity: number | null;    // default null
}

// IComponentGroup additions
interface IComponentGroup {
  // ...existing fields (minSelection, maxSelection already exist)
  selectionMode: SelectionMode;
  minTotalQuantity: number | null;
  maxTotalQuantity: number | null;
}

// Cart line additions
interface CartLine {
  // ...existing fields
  lineType: "REGULAR" | "BUNDLE_PARENT" | "BUNDLE_CHILD" | "GIFT" | "BXGY_REWARD";
  promotionId?: string;
  bundleId?: string;
}
```
