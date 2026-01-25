# Add-On / Attach Offer

Скидка на "прикреплённые" товары только вместе с триггер-товаром. Upsell аксессуара: купи ноутбук — получи чехол со скидкой.

## UI редактирования

### Основные поля

- **Основной товар (триггер)** — product picker
- **Add-on товары** — repeater:
  - Товар (picker)
  - Скидка — radio: Скидка % | Скидка фикс | Спец. цена
  - Значение (number input)
  - Max количество (number input, default 1)
- **Поведение** — checkboxes:
  - ☑ Скрывать add-ons пока триггер не выбран
  - ☐ Разрешить add-on без триггера (по полной цене)

### Генерируемые правила (dependency-rules)

```
Начальное состояние (add-ons скрыты):
  action: HIDE на ITEM(addon1)
  action: HIDE на ITEM(addon2)

Показать add-ons при выборе триггера:
  condition: ITEM_SELECTED(trigger) IS_SELECTED
  action: SHOW на ITEM(addon1)
  action: SHOW на ITEM(addon2)
  action: ENABLE на ITEM(addon1)
  action: ENABLE на ITEM(addon2)

Скидка на каждый add-on:
  condition: ITEM_SELECTED(trigger) IS_SELECTED
  action: ADJUST_PRICE на ITEM(addon1) (priceType: PERCENT, priceValue: -30)
  action: ADJUST_PRICE на ITEM(addon2) (priceType: FIXED_AMOUNT, priceValue: -500)

Лимит количества:
  action: SET_QTY_LIMITS на ITEM(addon1) (min: 0, max: 1)
  action: SET_QTY_LIMITS на ITEM(addon2) (min: 0, max: 2)

Скрыть при убирании триггера:
  condition: ITEM_SELECTED(trigger) IS_NOT_SELECTED
  action: HIDE на ITEM(addon1)
  action: HIDE на ITEM(addon2)
```

### Wireframe

```
┌─────────────────────────────────────────────────────┐
│  Add-On / Attach Offer                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Основной товар                                     │
│  ┌──────────────────────────────────────┐           │
│  │ MacBook Pro 16"                      │           │
│  └──────────────────────────────────────┘           │
│                                                     │
│  ☑ Скрывать add-ons пока триггер не выбран          │
│                                                     │
│  Add-on товары                                      │
│  ┌───────────────────┬──────────┬───────┬─────┬──┐ │
│  │ Товар             │ Скидка   │ Знач. │ Max │  │ │
│  ├───────────────────┼──────────┼───────┼─────┼──┤ │
│  │ Leather Case      │ Скидка % │  30%  │  1  │✕ │ │
│  │ USB-C Hub         │ Спец.цена│  1999 │  1  │✕ │ │
│  │ Screen Protector  │ Скидка ₽ │  500  │  2  │✕ │ │
│  └───────────────────┴──────────┴───────┴─────┴──┘ │
│  [+ Добавить add-on]                                │
└─────────────────────────────────────────────────────┘
```
