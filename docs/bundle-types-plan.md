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

## Философия: Data-Driven Behavior

`bundleType` — это **UI-пресет** (editor mode/template), а НЕ жёсткая бизнес-категория.

**Поведение определяется данными:**

| Что определяет | Откуда берётся |
|----------------|----------------|
| Что можно выбрать | `minSelection`, `maxSelection`, `selectionMode` на группах |
| Сколько штук | `defaultQuantity`, `quantityLocked`, `minQuantity`, `maxQuantity` на items |
| Сколько штук суммарно | `minTotalQuantity`, `maxTotalQuantity` на группе |
| Как считаем цену | `priceType`/`priceValue` на items + bundle price mode |
| Анлоки/скрытия | dependency rules |
| Как отображать | `displayStyle` в bundle settings |

**`bundleType` лишь:**
- Выставляет дефолтные настройки при создании
- Адаптирует UI редактора (показывает/скрывает элементы)
- Подсказывает валидации (hints, не hard blocks)
- Используется для аналитики и фильтрации

**Почему не жёсткая категория:**
- "Fixed kit" + 1 configurable slot (PC bundle с выбором RAM) — это FIXED, но с выбором
- "Multipack 12-pack mixed" — это MULTIPACK, но по сути mix-and-match по количествам
- "Build-a-box flat rate" vs "Build-a-box line pricing" — один тип, разный pricing

Движок не проверяет `bundleType` — он работает с constraints напрямую.

---

## Product Bundles

Все типы создают отдельный продукт-бандл с children. Полностью покрываются текущей моделью component groups + dependency rules.

---

### 1. Fixed Bundle (Kit)

**Что это:** Набор с фиксированным составом. Мерчант выбирает товары, покупатель берёт "как есть".

#### Пример A: "Camera Starter Kit" — $899 (вместо $1150 по отдельности)

```typescript
{
  bundleType: "FIXED",
  title: "Camera Starter Kit",
  price: 89900, // $899 — мерчант ставит вручную
  groups: [
    {
      title: "Состав набора",
      minSelection: 3,
      maxSelection: 3,
      items: [
        { assignedProduct: "Canon EOS R50",     priceType: "INCLUDED" }, // $799
        { assignedProduct: "SanDisk 64GB SD",   priceType: "INCLUDED" }, // $29
        { assignedProduct: "Camera Bag Lowepro", priceType: "INCLUDED" }, // $89
      ]
    }
  ],
  dependencyRules: [] // не нужны
}
```

Storefront: покупатель видит карточку "Camera Starter Kit — $899", список содержимого, кнопку Add to Cart. Никаких выборов.

#### Пример B: "Skincare Gift Set" — компоненты со скидкой 25%

```typescript
{
  bundleType: "FIXED",
  title: "Skincare Gift Set",
  // price = сумма скидочных цен (считается автоматически)
  groups: [
    {
      title: "Уход за лицом",
      minSelection: 2,
      maxSelection: 2,
      items: [
        { assignedProduct: "Cleanser 200ml",  priceType: "DISCOUNT_PERCENT", priceValue: 25 }, // $30 → $22.50
        { assignedProduct: "Moisturizer 50ml", priceType: "DISCOUNT_PERCENT", priceValue: 25 }, // $45 → $33.75
      ]
    },
    {
      title: "Бонус",
      minSelection: 1,
      maxSelection: 1,
      items: [
        { assignedProduct: "Travel Pouch", priceType: "FREE" }, // $0
      ]
    }
  ]
}
```

#### Пример C: "Gaming PC Bundle" — с вариантами (покупатель выбирает RAM)

```typescript
{
  bundleType: "FIXED",
  title: "Gaming PC Bundle",
  groups: [
    {
      title: "Основа",
      minSelection: 2,
      maxSelection: 2,
      items: [
        { assignedProduct: "RTX 4070 GPU",  priceType: "INCLUDED" },
        { assignedProduct: "750W PSU",      priceType: "INCLUDED" },
      ]
    },
    {
      title: "Оперативная память",  // покупатель выбирает вариант
      minSelection: 1,
      maxSelection: 1,
      items: [
        { assignedVariant: "32GB DDR5-5600", priceType: "INCLUDED" },
        { assignedVariant: "64GB DDR5-5600", priceType: "MARKUP_FIXED", priceValue: 8000 }, // +$80
      ]
    }
  ]
}
```

Здесь `minSelection: 1, maxSelection: 1` в группе RAM — покупатель обязан выбрать один вариант. Это fixed bundle с одним configurable slot.

**Пресет FIXED в редакторе:**

При выборе "Fixed Bundle" в UI:
- Создаёт 1 группу "Состав набора", `minSelection = maxSelection = items.length`
- Скрывает selection controls на storefront (items авто-выбраны)
- Показывает hint если группа позволяет выбор ("configurable slot detected")
- НО не запрещает добавить группу с `maxSelection: 1` (configurable slot, как RAM в примере C)

**Pricing strategies:**
- `INCLUDED` — цена компонента "входит" в общую цену (мерчант ставит цену бандла вручную)
- `DISCOUNT_PERCENT` — "каждый со скидкой X%", итог = сумма скидочных цен
- `FREE` — бонусный item бесплатно
- `MARKUP_FIXED` — upgrade за доплату (как в примере C с RAM)

---

### 2. Multipack

**Что это:** Несколько штук одного товара. Частный случай Fixed Bundle.

#### Пример A: "3-Pack Black Socks" — фиксированный вариант, скидка за объём

```typescript
{
  bundleType: "MULTIPACK",
  title: "3-Pack Black Socks",
  groups: [
    {
      title: "Товар",
      minSelection: 1,
      maxSelection: 1,
      items: [
        {
          assignedVariant: "Black Cotton Sock, Size M",
          priceType: "DISCOUNT_PERCENT",
          priceValue: 20,        // -20% на каждую пару
          defaultQuantity: 3,    // 3 штуки
          quantityLocked: true,  // нельзя менять
        }
      ]
    }
  ]
}
// Цена: $12/pair × 3 × 0.8 = $28.80 (вместо $36)
```

#### Пример B: "6-Pack Craft Beer" — выбор варианта (IPA / Lager / Stout)

```typescript
{
  bundleType: "MULTIPACK",
  title: "6-Pack Craft Beer",
  groups: [
    {
      title: "Выберите сорт",
      minSelection: 1,
      maxSelection: 1,  // только один сорт
      items: [
        { assignedVariant: "Hazy IPA",   priceType: "FIXED", priceValue: 1200, defaultQuantity: 6, quantityLocked: true },
        { assignedVariant: "Dark Lager", priceType: "FIXED", priceValue: 1100, defaultQuantity: 6, quantityLocked: true },
        { assignedVariant: "Oat Stout",  priceType: "FIXED", priceValue: 1300, defaultQuantity: 6, quantityLocked: true },
      ]
    }
  ]
}
// Покупатель выбирает сорт, получает 6 бутылок
```

#### Пример C: "Case of 12 — Mixed" (переход к mix-and-match)

```typescript
{
  bundleType: "MULTIPACK",  // или MIX_AND_MATCH — граница размыта
  title: "Build Your Own 12-Pack",
  groups: [
    {
      title: "Выберите напитки",
      selectionMode: "PICK_QUANTITIES",  // можно несколько штук каждого
      minSelection: 1,                   // хотя бы 1 вид
      maxSelection: null,                // любое кол-во видов
      minTotalQuantity: 12,              // ровно 12 штук всего
      maxTotalQuantity: 12,
      items: [
        { assignedVariant: "Hazy IPA",   priceType: "FIXED", priceValue: 200, minQuantity: 0, maxQuantity: 12 },
        { assignedVariant: "Dark Lager", priceType: "FIXED", priceValue: 190, minQuantity: 0, maxQuantity: 12 },
        { assignedVariant: "Pale Ale",   priceType: "FIXED", priceValue: 210, minQuantity: 0, maxQuantity: 12 },
        { assignedVariant: "Oat Stout",  priceType: "FIXED", priceValue: 220, minQuantity: 0, maxQuantity: 12 },
      ]
    }
  ]
}
// "Собери свою дюжину" — по $2-2.20 за бутылку (вместо $3 по одной)
```

**Пресет MULTIPACK в редакторе:**

При выборе "Multipack" в UI:
- Создаёт 1 группу, 1 item
- Выставляет `defaultQuantity = N`, `quantityLocked = true`
- Показывает "pack badge" UI, цена за pack, savings vs single
- НО не запрещает добавить больше items или включить `PICK_QUANTITIES` (→ mixed pack, как пример C)

**Когда данные "ведут себя как multipack":**
- `quantityLocked: true` && `defaultQuantity > 1` → storefront показывает pack UI
- Не важно какой `bundleType` стоит — поведение определяется constraints

**Inventory:** При покупке списывается `defaultQuantity` единиц стока.

---

### 3. Mix-and-Match / Build-a-Box

**Что это:** Покупатель сам выбирает из разрешённого списка по правилам.

#### Пример A: "Собери коробку конфет" — flat rate, pick exactly 6

```typescript
{
  bundleType: "MIX_AND_MATCH",
  title: "Build Your Chocolate Box",
  price: 2400, // $24 фиксированная цена за коробку
  displayStyle: "flat",
  groups: [
    {
      title: "Выберите 6 конфет",
      selectionMode: "PICK_QUANTITIES",
      minSelection: 1,           // хотя бы 1 вид
      maxSelection: null,        // любое кол-во видов
      minTotalQuantity: 6,       // ровно 6 штук
      maxTotalQuantity: 6,
      items: [
        { assignedProduct: "Dark Truffle",     priceType: "INCLUDED", minQuantity: 0, maxQuantity: 6 },
        { assignedProduct: "Milk Caramel",     priceType: "INCLUDED", minQuantity: 0, maxQuantity: 6 },
        { assignedProduct: "White Raspberry",  priceType: "INCLUDED", minQuantity: 0, maxQuantity: 6 },
        { assignedProduct: "Hazelnut Praline", priceType: "INCLUDED", minQuantity: 0, maxQuantity: 6 },
        { assignedProduct: "Espresso Crunch",  priceType: "INCLUDED", minQuantity: 0, maxQuantity: 6 },
        { assignedProduct: "Sea Salt Dark",    priceType: "INCLUDED", minQuantity: 0, maxQuantity: 6 },
        { assignedProduct: "Matcha Green Tea", priceType: "INCLUDED", minQuantity: 0, maxQuantity: 6 },
        { assignedProduct: "Pistachio Rose",   priceType: "INCLUDED", minQuantity: 0, maxQuantity: 6 },
      ]
    }
  ]
}
// Покупатель: 3× Dark Truffle + 2× Matcha + 1× Pistachio = $24
```

#### Пример B: "Build Your Salad" — multi-group wizard с dependency rules

```typescript
{
  bundleType: "MIX_AND_MATCH",
  title: "Build Your Own Salad Bowl",
  displayStyle: "wizard",  // пошаговый UI
  groups: [
    {
      id: "base",
      title: "1. Выберите основу",
      selectionMode: "PICK_ITEMS",
      minSelection: 1,
      maxSelection: 1,           // ровно одна основа
      items: [
        { assignedProduct: "Mixed Greens",  priceType: "INCLUDED" },
        { assignedProduct: "Quinoa Bowl",   priceType: "INCLUDED" },
        { assignedProduct: "Rice Noodles",  priceType: "INCLUDED" },
      ]
    },
    {
      id: "protein",
      title: "2. Добавьте белок",
      selectionMode: "PICK_ITEMS",
      minSelection: 1,
      maxSelection: 2,           // 1-2 белка
      items: [
        { assignedProduct: "Grilled Chicken", priceType: "INCLUDED" },
        { assignedProduct: "Smoked Salmon",   priceType: "MARKUP_FIXED", priceValue: 300 }, // +$3
        { assignedProduct: "Crispy Tofu",     priceType: "INCLUDED" },
        { assignedProduct: "Shrimp",          priceType: "MARKUP_FIXED", priceValue: 400 }, // +$4
      ]
    },
    {
      id: "toppings",
      title: "3. Топинги (до 5)",
      selectionMode: "PICK_ITEMS",
      minSelection: 0,
      maxSelection: 5,
      items: [
        { assignedProduct: "Avocado",      priceType: "MARKUP_FIXED", priceValue: 200 }, // +$2
        { assignedProduct: "Cherry Tomato", priceType: "INCLUDED" },
        { assignedProduct: "Feta Cheese",  priceType: "INCLUDED" },
        { assignedProduct: "Corn",         priceType: "INCLUDED" },
        { assignedProduct: "Olives",       priceType: "INCLUDED" },
        { assignedProduct: "Egg",          priceType: "MARKUP_FIXED", priceValue: 100 }, // +$1
        { assignedProduct: "Croutons",     priceType: "INCLUDED" },
        { assignedProduct: "Seeds Mix",    priceType: "INCLUDED" },
      ]
    },
    {
      id: "dressing",
      title: "4. Соус",
      selectionMode: "PICK_ITEMS",
      minSelection: 1,
      maxSelection: 1,
      items: [
        { assignedProduct: "Caesar",     priceType: "INCLUDED" },
        { assignedProduct: "Balsamic",   priceType: "INCLUDED" },
        { assignedProduct: "Sesame Soy", priceType: "INCLUDED" },
        { assignedProduct: "Ranch",      priceType: "INCLUDED" },
      ]
    },
    {
      id: "extras",
      title: "5. Экстра (опционально)",
      selectionMode: "PICK_ITEMS",
      minSelection: 0,           // опционально
      maxSelection: 3,
      items: [
        { assignedProduct: "Extra Protein",   priceType: "FIXED", priceValue: 400 },  // $4
        { assignedProduct: "Side of Bread",   priceType: "FIXED", priceValue: 200 },  // $2
        { assignedProduct: "Soup of the Day", priceType: "FIXED", priceValue: 500 },  // $5
      ]
    }
  ],
  dependencyRules: [
    {
      name: "Premium base unlocks premium toppings",
      conditions: [{ conditionType: "IS_SELECTED", targetType: "ITEM", targetId: "quinoa_bowl" }],
      actions: [{ actionType: "SHOW", targetType: "ITEM", targetId: "truffle_oil" }]
    },
    {
      name: "5 toppings = free dressing upgrade",
      conditions: [{ conditionType: "GROUP_UNIQUE_GTE", targetType: "GROUP", targetId: "toppings", value: 5 }],
      actions: [{ actionType: "ADJUST_PRICE", targetType: "BUNDLE", priceType: "DISCOUNT_FIXED", priceValue: 100 }]
    }
  ]
}
// Base $12 + Salmon(+$3) + Avocado(+$2) + 4 included toppings + Caesar = $17
```

#### Пример C: "Custom Gift Box" — pick items + tiered pricing

```typescript
{
  bundleType: "MIX_AND_MATCH",
  title: "Custom Gift Box",
  displayStyle: "accordion",
  groups: [
    {
      id: "items",
      title: "Выберите от 3 до 8 товаров",
      selectionMode: "PICK_ITEMS",
      minSelection: 3,
      maxSelection: 8,
      items: [
        { assignedProduct: "Scented Candle",   priceType: "FIXED", priceValue: 1500 },
        { assignedProduct: "Bath Bomb Set",    priceType: "FIXED", priceValue: 1200 },
        { assignedProduct: "Silk Eye Mask",    priceType: "FIXED", priceValue: 2000 },
        { assignedProduct: "Hand Cream",       priceType: "FIXED", priceValue: 900 },
        { assignedProduct: "Tea Sampler",      priceType: "FIXED", priceValue: 1800 },
        { assignedProduct: "Chocolate Truffles", priceType: "FIXED", priceValue: 1400 },
        { assignedProduct: "Journal Notebook", priceType: "FIXED", priceValue: 1600 },
        { assignedProduct: "Aromatherapy Oil", priceType: "FIXED", priceValue: 2200 },
      ]
    },
    {
      id: "wrapping",
      title: "Упаковка",
      selectionMode: "PICK_ITEMS",
      minSelection: 1,
      maxSelection: 1,
      items: [
        { assignedProduct: "Standard Box",   priceType: "FREE" },
        { assignedProduct: "Premium Gift Wrap", priceType: "FIXED", priceValue: 500 },
        { assignedProduct: "Luxury Wooden Box", priceType: "FIXED", priceValue: 1500 },
      ]
    }
  ],
  dependencyRules: [
    {
      name: "5+ items: 10% off",
      priority: 1,
      conditions: [{ conditionType: "GROUP_UNIQUE_GTE", targetType: "GROUP", targetId: "items", value: 5 }],
      actions: [{ actionType: "ADJUST_PRICE", targetType: "BUNDLE", priceType: "DISCOUNT_PERCENT", priceValue: 10 }]
    },
    {
      name: "7+ items: 15% off",
      priority: 2,
      conditions: [{ conditionType: "GROUP_UNIQUE_GTE", targetType: "GROUP", targetId: "items", value: 7 }],
      actions: [{ actionType: "ADJUST_PRICE", targetType: "BUNDLE", priceType: "DISCOUNT_PERCENT", priceValue: 15 }]
    },
    {
      name: "6+ items unlocks luxury box",
      conditions: [{ conditionType: "GROUP_UNIQUE_GTE", targetType: "GROUP", targetId: "items", value: 6 }],
      actions: [{ actionType: "SHOW", targetType: "ITEM", targetId: "luxury_wooden_box" }]
    },
    {
      name: "Unlock wrapping after items selected",
      conditions: [{ conditionType: "GROUP_UNIQUE_GTE", targetType: "GROUP", targetId: "items", value: 3 }],
      actions: [{ actionType: "ENABLE", targetType: "GROUP", targetId: "wrapping" }]
    }
  ]
}
// 5 items × ~$15 avg = $75 → -10% = $67.50 + Premium Wrap($5) = $72.50
```

**Пресет MIX_AND_MATCH в редакторе:**

При выборе "Mix-and-Match" в UI:
- Показывает `selectionMode` toggle (PICK_ITEMS vs PICK_QUANTITIES)
- Включает `totalQuantity` constraints UI
- Предлагает wizard/accordion/tabs display style
- Показывает dependency rules chart

**Когда данные "ведут себя как mix-and-match":**
- `selectionMode: PICK_QUANTITIES` || `maxSelection > 1` || `minTotalQuantity != null`
- Не важно какой `bundleType` стоит

**Разница `minSelection` vs `minTotalQuantity`:**
- `minSelection/maxSelection` — сколько ВИДОВ выбрать (unique items toggled on)
- `minTotalQuantity/maxTotalQuantity` — сколько ШТУК в сумме (across all items)
- Пример: "выбери 3 вида конфет, всего 12 штук" → `minSelection: 3, minTotalQuantity: 12`

**Dependency rules для cross-group logic:**
- Unlock groups пошагово (wizard-like)
- Tiered pricing через GROUP_UNIQUE_GTE → ADJUST_PRICE
- Conditional items: show premium options при условиях

---

## Приоритеты реализации

- [ ] Добавить `defaultQuantity`, `quantityLocked` на ComponentItem
- [ ] Добавить `selectionMode`, `minTotalQuantity`, `maxTotalQuantity` на IComponentGroup
- [ ] Добавить `minQuantity`, `maxQuantity` per item
- [ ] Добавить `bundleType` как UI preset (editor mode, не влияет на движок)
- [ ] Storefront: рендер на основе constraints (не bundleType)
- [ ] Checkout: expand bundle → child lines с pricing

---

## Расширения текущих типов

```typescript
// === bundleType — UI preset, не бизнес-логика ===
// Используется для: дефолты при создании, UI editor mode, аналитика
// НЕ используется в: pricing engine, checkout, storefront rendering logic
enum BundleType {
  FIXED = "FIXED",
  MULTIPACK = "MULTIPACK",
  MIX_AND_MATCH = "MIX_AND_MATCH",
}

enum SelectionMode {
  PICK_ITEMS = "PICK_ITEMS",           // toggle on/off, count = unique items selected
  PICK_QUANTITIES = "PICK_QUANTITIES", // +/- stepper per item, count = sum of quantities
}

// ComponentItem additions
interface ComponentItem {
  // ...existing fields
  defaultQuantity: number;       // default 1
  quantityLocked: boolean;       // default false
  minQuantity: number;           // default 0 (per-item min in PICK_QUANTITIES mode)
  maxQuantity: number | null;    // default null (per-item max)
}

// IComponentGroup additions
interface IComponentGroup {
  // ...existing fields (minSelection, maxSelection already exist)
  selectionMode: SelectionMode;        // default PICK_ITEMS
  minTotalQuantity: number | null;     // sum of all item quantities >= N
  maxTotalQuantity: number | null;     // sum of all item quantities <= N
}

// Storefront определяет режим отображения по constraints:
// - all groups have min=max=items.length && no selection UI → render as "fixed kit"
// - quantityLocked && defaultQuantity > 1 → render as "X-pack"
// - selectionMode=PICK_QUANTITIES || maxSelection > 1 → render as "build-a-box"
// bundleType может быть hint, но constraints — источник правды
```

---

See also: [Cart-Level Promotions Plan](./cart-promotions-plan.md) — Discount Bundles, BXGY, Volume Breaks, Free Gifts, Dynamic Bundles.
