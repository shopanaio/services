# Threshold Discount (Spend/Buy Threshold)

Если выполнен порог (сумма / количество / категория) → скидка на набор или его часть.

## UI редактирования

### Основные поля

- **Тип порога** — radio:
  - Сумма ≥ X (number input)
  - Количество ≥ N (number input)
  - Количество уникальных товаров ≥ N (number input)
- **Область порога** — select:
  - Весь набор (BUNDLE_SUBTOTAL / GROUP_TOTAL_QTY)
  - Конкретная группа (group picker)
- **Скидка:**
  - Тип — radio: Скидка % | Скидка фикс | Фиксированная цена
  - Значение (number input)
- **Применить скидку к** — radio:
  - Всему набору
  - Конкретным товарам (multi-picker)
  - Конкретной группе (group picker)

### Отличия от generic rule editor

- **Один порог → одна скидка** — без сложных цепочек
- Порог задаётся через бизнес-поля, а не через condition builder
- "Применить к" — отдельный селектор scope вместо targetType + targetId
- Можно комбинировать несколько порогов (stepped thresholds) как отдельные threshold-блоки

### Генерируемые правила (dependency-rules)

```
Порог по сумме:
  condition: BUNDLE_SUBTOTAL GTE(X)
  // или для группы:
  condition: GROUP_SUBTOTAL(group) GTE(X)

Порог по количеству:
  condition: GROUP_TOTAL_QTY(group) GTE(N)
  // или по уникальным:
  condition: GROUP_UNIQUE_COUNT(group) GTE(N)

Скидка:
  action: ADJUST_PRICE на BUNDLE (priceType: PERCENT, priceValue: -N%)
  // или на конкретный item/group:
  action: ADJUST_PRICE на ITEM(targetItem) (priceType: FIXED_AMOUNT, priceValue: -X)
  // или override:
  action: OVERRIDE_PRICE на BUNDLE (priceType: FIXED, priceValue: Y)

Stepped thresholds (несколько уровней):
  Rule 1 (priority: 1): BUNDLE_SUBTOTAL GTE(1000) → -5%
  Rule 2 (priority: 2): BUNDLE_SUBTOTAL GTE(2000) → -10%
  Rule 3 (priority: 3): BUNDLE_SUBTOTAL GTE(5000) → -15%
  // exclusiveKey одинаковый — применяется только один
```

### Wireframe

```
┌─────────────────────────────────────────────────┐
│  Threshold Discount                             │
├─────────────────────────────────────────────────┤
│                                                 │
│  Порог                                          │
│  Тип: ● Сумма  ○ Количество  ○ Уник. товары    │
│  Область: [▾ Весь набор_________]               │
│                                                 │
│  Уровни скидок                                  │
│  ┌──────────────┬────────────┬──────────┬───┐  │
│  │ Порог        │ Тип        │ Значение │   │  │
│  ├──────────────┼────────────┼──────────┼───┤  │
│  │ ≥ 1000 ₽    │ Скидка %   │   5%     │ ✕ │  │
│  │ ≥ 2000 ₽    │ Скидка %   │  10%     │ ✕ │  │
│  │ ≥ 5000 ₽    │ Скидка %   │  15%     │ ✕ │  │
│  └──────────────┴────────────┴──────────┴───┘  │
│  [+ Добавить уровень]                           │
│                                                 │
│  Применить скидку к:                            │
│  ● Всему набору                                 │
│  ○ Товарам: [select...]                         │
│  ○ Группе:  [select...]                         │
└─────────────────────────────────────────────────┘
```
