# Cart-Level Promotions Plan

Cart-level promotions НЕ создают отдельный продукт. Они работают как условия/скидки на уровне cart. Требуют отдельной подсистемы (pricing/promotions service).

---

## Общая модель

Все cart-level promotions разделяют общие черты:

```typescript
interface BasePromotion {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;          // для conflict resolution

  // Scheduling
  startDate: Date | null;
  endDate: Date | null;

  // Limits
  usageLimit: number | null;       // всего использований
  customerLimit: number | null;    // на одного покупателя
  combinesWith: {
    otherPromotions: boolean;
    discountCodes: boolean;
    shippingDiscounts: boolean;
  };
}
```

---

## 4. Discount Bundle (Bundle as Promotion)

**Что это:** Купи A+B → получи скидку. Нет "нового продукта", скидка применяется к существующим line items.

### Пример A: "Shampoo + Conditioner = 15% off both"

```typescript
{
  type: "DISCOUNT_BUNDLE",
  name: "Hair Care Duo",
  conditions: [
    { type: "PRODUCT", targetId: "shampoo_argan", minQuantity: 1 },
    { type: "PRODUCT", targetId: "conditioner_argan", minQuantity: 1 },
  ],
  conditionLogic: "ALL",
  discount: { type: "PERCENT", value: 15, applyTo: "EACH_ITEM" }
}
// Корзина: Shampoo $18 + Conditioner $16 = $34 → $28.90 (save $5.10)
```

### Пример B: "Laptop + любые 2 аксессуара = $50 off"

```typescript
{
  type: "DISCOUNT_BUNDLE",
  name: "Laptop Bundle Deal",
  conditions: [
    { type: "COLLECTION", targetId: "laptops", minQuantity: 1 },
    { type: "COLLECTION", targetId: "laptop_accessories", minQuantity: 2 },
  ],
  conditionLogic: "ALL",
  discount: { type: "FIXED_AMOUNT", value: 5000, applyTo: "BUNDLE_TOTAL" }
}
// MacBook $1299 + Case $49 + Mouse $79 = $1427 → $1377
```

### Пример C: "Outfit Builder — 3+ items from Clothing = cheapest free"

```typescript
{
  type: "DISCOUNT_BUNDLE",
  name: "Mix & Match Clothing",
  conditions: [
    { type: "COLLECTION", targetId: "clothing", minQuantity: 3 },
  ],
  conditionLogic: "ALL",
  discount: { type: "PERCENT", value: 100, applyTo: "CHEAPEST" }
}
// Jacket $120 + Jeans $80 + T-shirt $30 → cheapest free → $200 (save $30)
```

### Модель

```typescript
interface DiscountBundle extends BasePromotion {
  type: "DISCOUNT_BUNDLE";

  // Что должно быть в корзине
  conditions: DiscountBundleCondition[];
  conditionLogic: "ALL" | "ANY";  // все условия или любое

  // Что происходит
  discount: DiscountDefinition;
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

### Что нужно реализовать

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

## 5. BXGY / BOGO (Buy X Get Y)

**Что это:** Купи X — получи Y бесплатно или со скидкой.

### Пример A: "Buy 2 T-shirts, Get 3rd Free"

```typescript
{
  type: "BXGY",
  name: "3rd T-shirt Free",
  buyConditions: [
    { type: "COLLECTION", targetIds: ["tshirts"], quantity: 2 }
  ],
  getRewards: [
    { type: "SAME", targetIds: [], quantity: 1, discount: { type: "FREE", value: 100 } }
  ],
  applicationLimit: null,  // unlimited — купи 6 → 2 бесплатных
  stackable: true
}
// Cart: T-shirt $25 × 3 → cheapest one free → $50 (save $25)
// Cart: T-shirt $25 × 6 → 2 cheapest free → $100 (save $50)
```

### Пример B: "Buy Phone → Case for $1"

```typescript
{
  type: "BXGY",
  name: "Phone + Case Deal",
  buyConditions: [
    { type: "COLLECTION", targetIds: ["smartphones"], quantity: 1 }
  ],
  getRewards: [
    { type: "COLLECTION", targetIds: ["phone_cases"], quantity: 1,
      discount: { type: "FIXED_PRICE", value: 100 },  // $1
      maxUsesPerOrder: 1 }
  ],
  applicationLimit: 1,
  stackable: false
}
// Cart: iPhone $999 + Silicone Case (was $39) → $999 + $1 = $1000
```

### Пример C: "Buy 1 Coffee Bag → Get Sample Pack Free" (auto-add)

```typescript
{
  type: "BXGY",
  name: "Free Sample with Coffee",
  buyConditions: [
    { type: "PRODUCT", targetIds: ["coffee_1kg_bag"], quantity: 1 }
  ],
  getRewards: [
    { type: "PRODUCT", targetIds: ["sample_pack_3x50g"], quantity: 1,
      discount: { type: "FREE", value: 100 },
      maxUsesPerOrder: 1 }
  ],
  autoAdd: true,  // система сама добавляет sample в корзину
  applicationLimit: 1,
  stackable: false
}
// Cart: Coffee Bag $28 → auto-adds Sample Pack ($0) → total $28
```

### Модель

```typescript
interface BXGYPromotion extends BasePromotion {
  type: "BXGY";

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

  // Поведение
  autoAdd: boolean;                // auto-add free item в корзину
  applicationLimit: number | null; // null = unlimited
  stackable: boolean;              // 6 = 2x BOGO?
}
```

### Что нужно реализовать

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

## 6. Volume / Quantity Breaks

**Что это:** Прогрессивные скидки по количеству.

### Пример A: "Sticker Packs — the more you buy, the more you save"

```typescript
{
  type: "VOLUME_BREAKS",
  name: "Sticker Volume Discount",
  target: { type: "PRODUCT", targetIds: ["custom_sticker_pack"] },
  quantitySource: "LINE_QUANTITY",
  tiers: [
    { minQuantity: 1,  discount: { type: "FIXED_UNIT_PRICE", value: 500 } },  // $5 each
    { minQuantity: 5,  discount: { type: "FIXED_UNIT_PRICE", value: 400 }, label: "Popular" },  // $4 each
    { minQuantity: 10, discount: { type: "FIXED_UNIT_PRICE", value: 350 } },  // $3.50 each
    { minQuantity: 25, discount: { type: "FIXED_UNIT_PRICE", value: 280 }, label: "Best value" }, // $2.80 each
    { minQuantity: 50, discount: { type: "FIXED_UNIT_PRICE", value: 200 } },  // $2 each
  ],
  showOnPDP: true,   // таблица на странице товара
  showInCart: true    // "Add 3 more for $3.50/each!"
}
// PDP показывает:
// | Qty   | Price/each | You save |
// |-------|-----------|----------|
// | 1-4   | $5.00     | —        |
// | 5-9   | $4.00     | 20%      |
// | 10-24 | $3.50     | 30%      |
// | 25-49 | $2.80     | 44%      |
// | 50+   | $2.00     | 60%      |
```

### Пример B: "Wholesale: any items from collection"

```typescript
{
  type: "VOLUME_BREAKS",
  name: "Office Supplies Bulk",
  target: { type: "COLLECTION", targetIds: ["office_supplies"] },
  quantitySource: "CART_TOTAL_OF_TARGET",  // суммарно любых товаров из коллекции
  tiers: [
    { minQuantity: 10, discount: { type: "PERCENT", value: 5 } },
    { minQuantity: 25, discount: { type: "PERCENT", value: 10 } },
    { minQuantity: 50, discount: { type: "PERCENT", value: 15 } },
  ],
  showOnPDP: true,
  showInCart: true
}
// Cart: 8 pens + 5 notebooks + 3 folders = 16 items → 5% off all
// Cart nudge: "Add 9 more office supplies for 10% off!"
```

### Пример C: "Subscription-like tiers with fixed prices"

```typescript
{
  type: "VOLUME_BREAKS",
  name: "Protein Bar Packs",
  target: { type: "PRODUCT", targetIds: ["protein_bar"] },
  quantitySource: "LINE_QUANTITY",
  tiers: [
    { minQuantity: 1,  discount: { type: "FIXED_UNIT_PRICE", value: 350 } },  // $3.50
    { minQuantity: 12, discount: { type: "FIXED_UNIT_PRICE", value: 300 }, label: "Monthly box" }, // $3
    { minQuantity: 24, discount: { type: "FIXED_UNIT_PRICE", value: 250 }, label: "2-month supply" }, // $2.50
  ],
  showOnPDP: true,
  showInCart: false
}
```

### Модель

```typescript
interface VolumeDiscount extends BasePromotion {
  type: "VOLUME_BREAKS";

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

### Что нужно реализовать

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

**Частично уже поддерживается** через dependency rules внутри product bundles:
```
Rule: "Volume 3+"
WHEN: QTY_GTE(item_A, 3)
THEN: ADJUST_PRICE(BUNDLE, DISCOUNT_PERCENT, 10)

Rule: "Volume 5+"  (priority higher)
WHEN: QTY_GTE(item_A, 5)
THEN: ADJUST_PRICE(BUNDLE, DISCOUNT_PERCENT, 20)
```
Но это работает только внутри бандла. Для standalone products нужна cart-level подсистема.

---

## 7. Free Gift / Add-ons

**Что это:** Подарок или доп. опции при достижении условия.

### Пример A: "Spend $75+ → Free Tote Bag" (auto-add с progress bar)

```typescript
{
  type: "FREE_GIFT",
  name: "Free Tote Bag over $75",
  trigger: { type: "CART_SUBTOTAL_GTE", value: 7500 },  // $75
  rewards: [
    { type: "FREE_PRODUCT", productId: "branded_tote_bag", maxQuantity: 1,
      discount: { type: "FREE", value: 100 } }
  ],
  autoAdd: true,
  removableByCustomer: true,
  showProgressBar: true
}
// Cart $50: progress bar "Spend $25 more for a FREE Tote Bag!"
// Cart $80: auto-adds "Branded Tote Bag — FREE"
// Cart drops to $70: removes tote bag, shows "Add $5 more to get it back"
```

### Пример B: "Buy 3 items → pick your gift" (suggest, не auto-add)

```typescript
{
  type: "FREE_GIFT",
  name: "Pick a Gift (3+ items)",
  trigger: { type: "CART_ITEMS_COUNT_GTE", value: 3 },
  rewards: [
    { type: "ADDON_GROUP", collectionId: "gift_options", maxQuantity: 1,
      discount: { type: "FREE", value: 100 } }
  ],
  autoAdd: false,  // показать выбор
  removableByCustomer: false,
  showProgressBar: true
}
// Collection "gift_options" содержит: Mini Candle, Lip Balm, Sample Set
// Cart 3+ items → drawer: "Pick your free gift!" → покупатель выбирает
```

### Пример C: "Tiered gifts — $50/$100/$200" (несколько порогов)

```typescript
[
  {
    type: "FREE_GIFT",
    name: "Tier 1: $50+ → Sample",
    trigger: { type: "CART_SUBTOTAL_GTE", value: 5000 },
    rewards: [{ type: "FREE_PRODUCT", productId: "perfume_sample", maxQuantity: 1, discount: { type: "FREE", value: 100 } }],
    autoAdd: true, showProgressBar: true
  },
  {
    type: "FREE_GIFT",
    name: "Tier 2: $100+ → Travel Size",
    trigger: { type: "CART_SUBTOTAL_GTE", value: 10000 },
    rewards: [{ type: "FREE_PRODUCT", productId: "travel_size_cream", maxQuantity: 1, discount: { type: "FREE", value: 100 } }],
    autoAdd: true, showProgressBar: true
  },
  {
    type: "FREE_GIFT",
    name: "Tier 3: $200+ → Full-size Gift",
    trigger: { type: "CART_SUBTOTAL_GTE", value: 20000 },
    rewards: [{ type: "FREE_PRODUCT", productId: "full_size_serum", maxQuantity: 1, discount: { type: "FREE", value: 100 } }],
    autoAdd: true, showProgressBar: true
  }
]
// Cart $85: shows Sample + "Spend $15 more for Travel Size Cream!"
// Cart $150: shows Sample + Travel Size + "Spend $50 more for Full-size Serum!"
```

### Пример D: "Unlock Add-on Group" (платные аддоны по условию)

```typescript
{
  type: "ADDON_UNLOCK",
  name: "Premium Add-ons for VIP Buyers",
  trigger: { type: "CART_SUBTOTAL_GTE", value: 15000 },  // $150
  rewards: [
    { type: "ADDON_GROUP", collectionId: "premium_addons", maxQuantity: 3,
      discount: { type: "PERCENT", value: 50 } }  // 50% off add-ons
  ],
  autoAdd: false,
  showProgressBar: true
}
// Cart $150+: shows "Unlocked! Premium add-ons at 50% off:"
// - Engraving Service ($20 → $10)
// - Gift Message Card ($5 → $2.50)
// - Express Packaging ($15 → $7.50)
```

### Модель

```typescript
interface GiftPromotion extends BasePromotion {
  type: "FREE_GIFT" | "ADDON_UNLOCK";

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

### Что нужно реализовать

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

## 8. Dynamic Bundle (Cart Transform)

**Что это:** Система автоматически группирует cart lines в "виртуальный бандл" для отображения/расчёта.

### Пример A: "Frequently Bought Together" — PDP widget + auto-discount

```typescript
{
  type: "DYNAMIC_BUNDLE",
  name: "Camera Essentials Combo",
  source: "MANUAL",
  matchRules: [
    { type: "PRODUCT", targetId: "canon_eos_r50", minQuantity: 1 },
    { type: "PRODUCT", targetId: "sandisk_64gb", minQuantity: 1 },
    { type: "PRODUCT", targetId: "camera_bag", minQuantity: 1 },
  ],
  matchMode: "ALL_REQUIRED",
  transform: {
    displayAsBundle: true,
    bundleTitle: "Camera Essentials Combo",
    collapseLines: false,
  },
  discount: { type: "FIXED_AMOUNT", value: 3000, applyTo: "BUNDLE_TOTAL" }  // -$30
}
// PDP widget:
// ┌─────────────────────────────────────────┐
// │ Frequently bought together              │
// │ ☑ Canon EOS R50        $799            │
// │ ☑ SanDisk 64GB SD      $29             │
// │ ☑ Camera Bag Lowepro   $89             │
// │                         ────            │
// │ Total: $887 (save $30!)  [Add All]     │
// └─────────────────────────────────────────┘
//
// Cart (все добавлены):
// ┌ Camera Essentials Combo (save $30!) ────┐
// │  Canon EOS R50           $799           │
// │  SanDisk 64GB SD          $29           │
// │  Camera Bag Lowepro       $89           │
// │  Bundle discount         -$30           │
// └─────────────────────── Total: $887 ─────┘
```

### Пример B: "Any 3 from Skincare → 10% off" (partial match nudge)

```typescript
{
  type: "DYNAMIC_BUNDLE",
  name: "Skincare Routine Bundle",
  source: "MANUAL",
  matchRules: [
    { type: "COLLECTION", targetId: "skincare", minQuantity: 3 },
  ],
  matchMode: "ALL_REQUIRED",
  transform: {
    displayAsBundle: true,
    bundleTitle: "Your Skincare Routine",
    collapseLines: false,
  },
  discount: { type: "PERCENT", value: 10, applyTo: "EACH_ITEM" }
}
// Cart: Cleanser $30 + Toner $25 (2 из 3)
// Nudge: "Add 1 more skincare product for 10% off all 3!"
//
// Cart: Cleanser $30 + Toner $25 + Serum $50 (3/3 matched!)
// ┌ Your Skincare Routine (10% off!) ───────┐
// │  Cleanser    $30 → $27                  │
// │  Toner       $25 → $22.50              │
// │  Serum       $50 → $45                 │
// └──────────────────── Total: $94.50 ──────┘
```

### Пример C: "AI-recommended combo" (frequently bought together from analytics)

```typescript
{
  type: "DYNAMIC_BUNDLE",
  name: "Auto-detected: Yoga Starter",
  source: "FREQUENTLY_BOUGHT_TOGETHER",  // определён аналитикой
  matchRules: [
    { type: "PRODUCT", targetId: "yoga_mat", minQuantity: 1 },
    { type: "PRODUCT", targetId: "yoga_blocks_2pk", minQuantity: 1 },
    { type: "PRODUCT", targetId: "yoga_strap", minQuantity: 1 },
  ],
  matchMode: "ANY_N_OF",
  minMatchCount: 2,  // достаточно 2 из 3
  transform: {
    displayAsBundle: true,
    bundleTitle: "Yoga Starter Pack",
    collapseLines: false,
  },
  discount: { type: "PERCENT", value: 8, applyTo: "EACH_ITEM" }
}
// Покупатель добавляет Yoga Mat → PDP показывает:
// "Customers also bought: Yoga Blocks + Strap — get 8% off all 3!"
//
// Покупатель добавляет Mat + Blocks (2/3) → скидка 8% уже применяется
// Nudge: "Add Yoga Strap for 8% off it too!"
```

### Модель

```typescript
interface DynamicBundleRule extends BasePromotion {
  type: "DYNAMIC_BUNDLE";

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

### Что нужно реализовать

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

## Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                    ADMIN UI (admin-next)                  │
├─────────────────────────────────────────────────────────┤
│  Promotions:                                             │
│  ├── Discount Bundles (conditions + discount)            │
│  ├── BXGY / BOGO (buy X get Y)                          │
│  ├── Volume Breaks (tier table)                          │
│  ├── Free Gifts (threshold + reward)                     │
│  └── Dynamic Bundles (match + transform)                 │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              PRICING / PROMOTIONS SERVICE                 │
├─────────────────────────────────────────────────────────┤
│  • Discount bundle CRUD                                  │
│  • BXGY rules                                            │
│  • Volume tiers                                          │
│  • Gift promotions                                       │
│  • Dynamic bundle rules                                  │
│  • Evaluation engine (conditions → actions)              │
│  • Conflict resolution (priority, combinesWith)          │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   CHECKOUT SERVICE                        │
├─────────────────────────────────────────────────────────┤
│  Cart Middleware Pipeline:                               │
│  1. Evaluate discount bundles → apply cart discounts     │
│  2. Evaluate BXGY → add/discount reward lines           │
│  3. Evaluate volume breaks → adjust unit prices         │
│  4. Evaluate gifts → add promotional lines              │
│  5. Apply dynamic transforms → group lines              │
│  6. Final price calculation                              │
└─────────────────────────────────────────────────────────┘
```

---

## Приоритеты реализации

### Phase 1: Volume Breaks + Discount Bundles
- [ ] Новая модель `VolumeDiscount` в pricing service
- [ ] Новая модель `DiscountBundle` в pricing service
- [ ] Cart middleware: evaluate + apply
- [ ] PDP widgets: tier table, "bundle & save" badge
- [ ] Cart UI: savings breakdown, nudges

### Phase 2: BXGY + Free Gifts
- [ ] Новая модель `BXGYPromotion`
- [ ] Новая модель `GiftPromotion`
- [ ] Cart engine: match + auto-add/suggest
- [ ] Gift line type + UI
- [ ] Progress bar ("$15 away from free gift")

### Phase 3: Dynamic Bundles
- [ ] Новая модель `DynamicBundleRule`
- [ ] Cart transform middleware
- [ ] "Frequently bought together" widget
- [ ] Partial match nudges
- [ ] Cart line grouping UI

---

## Расширения типов

```typescript
// Cart line additions for promotional items
interface CartLine {
  // ...existing fields
  lineType: "REGULAR" | "BUNDLE_PARENT" | "BUNDLE_CHILD" | "GIFT" | "BXGY_REWARD";
  promotionId?: string;    // какая промо-акция применена
  bundleId?: string;       // для dynamic bundle grouping
}
```
