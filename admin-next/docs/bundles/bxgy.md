# Buy X Get Y (BXGY / BOGO)

Купи X — получи Y со скидкой (бесплатно / % off / фикс off). Классический BOGO: купи 1 — получи 2-й бесплатно.

## UI редактирования

### Основные поля

- **Триггер (Buy X):**
  - Товары-триггеры (multi-picker)
  - Количество для активации (number input)
- **Награда (Get Y):**
  - Товары-награды (multi-picker) — может совпадать с триггерами (BOGO)
  - Количество награды (number input, default 1)
  - Тип скидки на Y — radio: Бесплатно | Скидка % | Скидка фикс
  - Значение скидки (number input, если не "бесплатно")
- **Лимит** — max повторений акции (number input или ∞)

### Отличия от generic rule editor

- UI разделён на **две явные секции**: "Купи" и "Получи"
- Нет абстрактных conditions/actions — всё через бизнес-термины
- Товары-триггеры и товары-награды — отдельные пикеры
- Тип скидки — radio вместо actionType + priceType

### Генерируемые правила (dependency-rules)

```
Показать Y когда X выбран:
  condition: ITEM_SELECTED(X) IS_SELECTED
  // или для количественного триггера:
  condition: ITEM_QTY(X) GTE(triggerQty)
  action: SHOW на ITEM(Y)
  action: ENABLE на ITEM(Y)

Ценообразование Y:
  condition: ITEM_SELECTED(X) IS_SELECTED
  action: OVERRIDE_PRICE на ITEM(Y) (priceType: FIXED, priceValue: 0)
  // или
  action: ADJUST_PRICE на ITEM(Y) (priceType: PERCENT, priceValue: -50)

Лимит количества Y:
  action: SET_QTY_LIMITS на ITEM(Y) (min: 0, max: rewardQty)

Скрыть Y когда X не выбран:
  condition: ITEM_SELECTED(X) IS_NOT_SELECTED
  action: HIDE на ITEM(Y)
```

### Wireframe

```
┌─────────────────────────────────────────────────┐
│  Buy X Get Y                                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─ Купи (X) ────────────────────────────┐     │
│  │  Товары:                               │     │
│  │  • Running Shoes Pro                   │     │
│  │  • Running Shoes Lite                  │     │
│  │  [+ Добавить]                          │     │
│  │                                        │     │
│  │  Количество: [__1__]                   │     │
│  └────────────────────────────────────────┘     │
│                                                 │
│  ┌─ Получи (Y) ──────────────────────────┐     │
│  │  Товары:                               │     │
│  │  • Sport Socks Pack                    │     │
│  │  [+ Добавить]                          │     │
│  │                                        │     │
│  │  Количество: [__1__]                   │     │
│  │                                        │     │
│  │  Скидка:                               │     │
│  │  ● Бесплатно                           │     │
│  │  ○ Скидка %    [____]                  │     │
│  │  ○ Скидка ₽    [____]                  │     │
│  └────────────────────────────────────────┘     │
│                                                 │
│  Макс. повторений: [__∞__]                      │
└─────────────────────────────────────────────────┘
```
