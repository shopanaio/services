# Build-Your-Own (BYOB / Mix & Match)

Пользователь выбирает товары из пула, чтобы собрать набор. Два режима: Pick N (выбери N штук) и Spend X (набери на сумму X).

## UI редактирования

### Основные поля

- **Режим** — radio: Pick N | Spend X
- **Группы товаров** — repeater секций:
  - Название группы
  - Товары в группе (multi-picker)
  - Ограничения выбора:
    - Min выбранных / Max выбранных (для Pick N)
    - Min сумма / Max сумма (для Spend X)
  - Обязательная группа (toggle)
- **Ценообразование** — select:
  - По ценам товаров (без скидки)
  - Скидка на набор (% или фикс)
  - Фиксированная цена набора

### Отличия от generic rule editor

- Condition builder **заменён** на понятные поля "min/max picks" и "min/max spend"
- Группы — визуальные секции с drag-n-drop товаров
- Правила генерируются из constraints групп автоматически
- Пользователь не видит subjects/operators — только бизнес-поля

### Генерируемые правила (dependency-rules)

```
Для каждой группы (Pick N):
  condition: GROUP_TOTAL_QTY(group) GTE minPicks
  condition: GROUP_TOTAL_QTY(group) LTE maxPicks
  action: SET_QTY_LIMITS(min: minPicks, max: maxPicks) на GROUP
  action: SET_REQUIRED(true) — если группа обязательная

Для каждой группы (Spend X):
  condition: GROUP_SUBTOTAL(group) GTE minSpend
  condition: GROUP_SUBTOTAL(group) LTE maxSpend
  action: SET_REQUIRED(true) — если группа обязательная

Ценообразование:
  condition: все группы удовлетворены (AND)
  action: ADJUST_PRICE на BUNDLE (priceType: PERCENT, priceValue: -N%)
  // или
  action: OVERRIDE_PRICE на BUNDLE (priceType: FIXED, priceValue: X)

Валидация (DISABLE кнопки "добавить в корзину"):
  condition: GROUP_TOTAL_QTY < minPicks (любая группа)
  action: DISABLE на BUNDLE
```

### Wireframe

```
┌─────────────────────────────────────────────────┐
│  Build Your Own                                 │
├─────────────────────────────────────────────────┤
│  Режим:  ● Pick N   ○ Spend X                  │
│                                                 │
│  ┌─ Группа: Основа ──────────────────────┐     │
│  │  ☑ Обязательная                        │     │
│  │  Выбрать от [_2_] до [_3_] товаров     │     │
│  │                                        │     │
│  │  Товары:                               │     │
│  │  • Pizza Base Classic                  │     │
│  │  • Pizza Base Thin                     │     │
│  │  • Pizza Base Stuffed                  │     │
│  │  [+ Добавить товары]                   │     │
│  └────────────────────────────────────────┘     │
│                                                 │
│  ┌─ Группа: Топпинги ────────────────────┐     │
│  │  ☐ Обязательная                        │     │
│  │  Выбрать от [_0_] до [_5_] товаров     │     │
│  │                                        │     │
│  │  Товары:                               │     │
│  │  • Pepperoni                           │     │
│  │  • Mushrooms                           │     │
│  │  • Olives                              │     │
│  │  [+ Добавить товары]                   │     │
│  └────────────────────────────────────────┘     │
│                                                 │
│  [+ Добавить группу]                            │
│                                                 │
│  Цена набора                                    │
│  ○ Сумма товаров (без скидки)                   │
│  ○ Скидка на набор     [___10___] %             │
│  ○ Фиксированная цена  [___999__]              │
└─────────────────────────────────────────────────┘
```
