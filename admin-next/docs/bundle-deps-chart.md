Ок — только **граф + UI + механика + алгоритм подсчёта** (без БД/GraphQL).

---

# 1) Что такое граф в редакторе

## Узлы (nodes)

1. **ItemNode** — компонент (product/variant) внутри группы
   Показывает: название, базовый статус (в группе), возможно базовую цену.
   Имеет **выходы-события** (ports):
   - `selected`
   - `deselected`
   - `qtyChanged` (если есть регулируемое qty)

2. **GroupNode** — группа компонентов
   Имеет события (по желанию):
   - `countsChanged` (unique/total изменились)
   - `valid` / `invalid` (выполнены min/max)

3. **RuleNode** — правило (“WHEN… THEN…”)
   Это _карточка логики_.
   - входы: “условия/триггеры”
   - выходы: “действия”

4. (опционально) **BundleNode** — один узел “весь бандл”
   Нужен, если в правилах есть глобальные действия (например “скидка на весь бандл”, сообщение).

---

## Рёбра (edges)

Рёбра не содержат бизнес-логики целиком, они просто **визуализируют** связи Rule:

- **TriggerEdge**: `Item/Group event → RuleNode`
  (подписано: selected / deselected / qtyChanged / valid / invalid)

- **ActionEdge**: `RuleNode → Item/Group/Bundle`
  (подписано: hide/show/enable/disable/setQty/price…)

Важно: **Rule — это единица хранения и выполнения**, edges — просто “проводки”.

---

# 2) Как выглядит UI и как пользователь это собирает

## Канвас

- Пользователь видит items, groups, rules как блоки.
- Может:
  - создать RuleNode кнопкой “+ Rule”
  - соединить стрелкой item→rule (выбрать тип события)
  - соединить rule→target (выбрать тип действия)

## Сайдбар (инспектор)

Открывается при клике на RuleNode. В нём редактируются **данные правила**:

### 2.1 Верх

- Enabled toggle
- Name
- Priority (число)

### 2.2 WHEN

- Trigger type (selected / deselected / qtyChanged / groupValid / …)
- Source (какой item/group)
- Доп. условия (чипсы):
  - `AND selected(Item B)`
  - `AND qty(Item C) >= 2`
  - `AND totalQty(Group X) >= 5`
  - (минимальный MVP: только selected/deselected + один source)

### 2.3 THEN

Список действий (каждое — строка):

- Тип действия (dropdown): `show/hide/enable/disable/setQty/price…`
- Target (item/group/bundle)
- Value (если нужно): qty/процент/сумма
- Label/Reason (для объяснения в админке)
- Drag для порядка

### 2.4 Политика конфликтов (минимум)

- “При конфликте по одному target”:
  - **Higher priority wins** (рекомендую)

- Для price:
  - Overrides — всегда priority wins
  - Adjustments — stack или max-only (в MVP можно просто stack)

## Автосинхронизация графа и формы

- Если пользователь добавил условие “selected(Item A)” → на канвасе появляется edge `ItemA.selected → Rule`.
- Если он добавил action “disable Item B” → появляется edge `Rule → ItemB (disable)`.
- И наоборот: нарисовал edge мышкой → форма rule заполнилась.

---

# 3) Что именно может делать THEN (в рамках графа)

## 3.1 Доступность/видимость

- `hide(target)` / `show(target)`
- `disable(target)` / `enable(target)`

## 3.2 Количество

- `setQty(item, n)`
- `clampQty(item, min,max)` (опционально)

## 3.3 Цена (как “переопределение поверх базы”)

Два типа actions:

### A) Price Override (не стакается)

- `overridePrice(item, FIXED 19.99)` или `FREE`/`INCLUDED`
- если несколько override на один item → выигрывает **самый высокий priority**

### B) Price Adjustment (может стакается)

- `+5`, `-5`, `+10%`, `-10%`
- если несколько adjustments → применяются последовательно (или max-only)

---

# 4) Механика выполнения графа (runtime)

## 4.1 Входное “состояние”

То, что есть в момент расчёта:

- `selected[itemId] = true/false`
- `qty[itemId] = number` (если выбран)
- вычисляемые метрики:
  - `uniqueSelectedInGroup[groupId]`
  - `totalQtyInGroup[groupId]`

## 4.2 Как определить, какие правила активны

Для каждого RuleNode:

1. берём `when`
2. считаем `eval(when, state)` → `true/false`
3. если `true` и rule enabled → rule активен

> Обычно WHEN не зависит от “скрыт/disabled”, а зависит от выбора/qty/счётчиков. Так проще.

---

# 5) Алгоритм подсчёта эффектов (доступность + qty + цена)

Ниже алгоритм, который даёт понятный и детерминированный результат.

## Шаг A: собрать “кандидаты действий”

- `activeRules = all rules where eval(when)=true`
- `actions = activeRules.flatMap(rule.then)`
  Каждому action прикрепляем `ruleId`, `priority`, `label`.

## Шаг B: применить действия на состояния (visibility/availability/qty)

### B1) Visibility (hide/show)

- группируем actions по target
- если есть `hide` и `show` одновременно:
  - выбираем по **priority**
  - (или простое правило: hide сильнее show при равном priority)

- получаем `effectiveVisibility[target]`

### B2) Availability (enable/disable)

- аналогично: по target выбираем победителя по priority
- получаем `effectiveAvailability[target]`

### B3) Quantity (setQty / clamp)

- если есть `setQty` на item:
  - берём setQty с максимальным priority

- затем применяем clamp (если есть), либо тоже по priority
- получаем `effectiveQty[item]`

### Важно про “стабилизацию”

Если qty влияет на условия (например totalQty>=5), то после B3 у тебя меняются метрики.
Простой и рабочий вариант:

- сделать **2 прохода**:
  1. вычислить actions → применить qty
  2. пересчитать метрики → снова вычислить actions → применить
     Обычно хватает 2; можно поставить лимит 3–5, если боишься редких каскадов.

---

## Шаг C: подсчёт цены по каждому item (base → overrides → adjustments)

Для каждого выбранного item:

1. `baseUnitPrice` = цена из базового pricingRule (у item)
2. `override = top priority overridePrice(item)` (если есть)
   - если override есть → `unit = overrideResult`
   - иначе `unit = baseUnitPrice`

3. применяем adjustments по порядку (если есть):
   - порядок фиксируешь один раз и не меняешь:
     - например: сначала fixed (+/-$), потом percent (+/-%)
     - внутри каждого типа — по priority desc

4. `lineTotal = unit * effectiveQty`

Параллельно собираешь breakdown:

- base
- override winner (или нет)
- список adjustments с промежуточными результатами

---

# 6) Как в это вписываются tiers (глобально)

Tiers ты считаешь **после** того, как получил все lineTotal (т.е. после зависимостей).

- считаешь `basisValue` (unique или total quantity)
- выбираешь лучший tier (обычно самый высокий minCount, который проходит)
- скидка применяется к `componentsSubtotal` (или к total — но это отдельное правило)

---

# 7) Что видит админка (для прозрачности)

Из алгоритма ты можешь вывести:

- “какие Rule активны”
- “какие действия применились и почему”
- по каждому item: base → override → adjustments → итог
- tiers: basisValue, tier applied, discount amount

---

Если хочешь — я могу следующим сообщением привести **очень короткий псевдокод** (без огромных простыней) на 30–40 строк: `evalRules(state) -> effects`, `applyEffectsToPrice(selection) -> breakdown`.

Ниже 2 примера **схем UI**: как выглядит **чарт (canvas)** + **сайдбар** в типичных кейсах.

---

## Пример 1 — “Выбрал A → отключить B/C и показать Extras”

### Canvas (React Flow)

```
┌───────────────┐     selected      ┌───────────────────────┐
│ 🧩 Item A      ├──────────────────▶│ ⚙️ Rule #1            │
│ (Premium)      │                  │ WHEN selected(A)      │
└───────────────┘                  │ THEN:                 │
                                  │  disable(B)           │
                                  │  disable(C)           │
                                  │  show(Extras group)   │
                                  └───────┬─────────┬─────┘
                                          │         │
                                     disable│    disable│      show
                                          ▼         ▼          ▼
                              ┌───────────────┐ ┌───────────────┐ ┌──────────────────┐
                              │ 🧩 Item B      │ │ 🧩 Item C      │ │ 📦 Group Extras   │
                              │ state: disabled│ │ state: disabled│ │ state: visible    │
                              └───────────────┘ └───────────────┘ └──────────────────┘
```

### Sidebar (выбран Rule #1)

```
RULE
[Enabled ◉]   Name: [Premium blocks basics]
Priority: [100]

WHEN
Trigger: [Item selected ▼]
Source:  [🧩 Item A ▼]
(+ Add condition)

THEN (Actions)
1) Action: [disable ▼]  Target: [🧩 Item B ▼]   Label: [Not compatible]
2) Action: [disable ▼]  Target: [🧩 Item C ▼]   Label: [Not compatible]
3) Action: [show ▼]     Target: [📦 Group Extras ▼]

Conflicts
(●) Higher priority wins

[Save]
```

---

## Пример 2 — “Комбо A+B = 10%, A+B+C = 20% + скрыть группу”

### Canvas (React Flow)

```
┌───────────────┐   selected   ┌──────────────────────────┐   apply discount   ┌──────────────────────┐
│ 🧩 Item A      ├─────────────▶│ ⚙️ Rule #10 (A+B)        ├───────────────────▶│ 💰 Bundle Discount    │
└───────────────┘              │ WHEN selected(A)         │                    │ -10% (exclusive)      │
┌───────────────┐   selected   │  AND selected(B)         │                    └──────────────────────┘
│ 🧩 Item B      ├─────────────▶│ THEN apply -10%          │
└───────────────┘              └──────────────────────────┘


┌───────────────┐   selected   ┌──────────────────────────┐   apply discount   ┌──────────────────────┐
│ 🧩 Item A      ├─────────────▶│ ⚙️ Rule #11 (A+B+C)      ├───────────────────▶│ 💰 Bundle Discount    │
└───────────────┘              │ WHEN selected(A)         │                    │ -20% (exclusive)      │
┌───────────────┐   selected   │  AND selected(B)         │                    └──────────────────────┘
│ 🧩 Item B      ├─────────────▶│  AND selected(C)         │
└───────────────┘              │ THEN apply -20%          │
┌───────────────┐   selected   │      + hide(Group X)     │      hide           ┌──────────────────┐
│ 🧩 Item C      ├─────────────▶└───────────────┬─────────┘────────────────────▶│ 📦 Group X        │
└───────────────┘                              │                               │ state: hidden     │
                                               └───────────────────────────────└──────────────────┘

(Правило #11 имеет Priority выше, поэтому 20% перекрывает 10%)
```

### Sidebar (выбран Rule #11)

```
RULE
[Enabled ◉]   Name: [ABC combo deal]
Priority: [200]

WHEN
Mode: [All selected ▼]
Items: [🧩 Item A] [🧩 Item B] [🧩 Item C]

THEN (Actions)
1) Action: [bundle discount ▼]
   Type:   [PERCENT ▼]  Value: [20]
   ApplyTo:[Components subtotal ▼]
   ExclusiveGroup: [bundleDiscount]
   Label:  ["Combo A+B+C"]

2) Action: [hide ▼]  Target: [📦 Group X ▼]
   Label:  ["Hidden for this combo"]

Conflicts
(●) Higher priority wins
Discount policy: (●) Exclusive by group "bundleDiscount"

[Save]
```

---

Если хочешь, могу сделать 3-й пример — **цена на item** (override/adjustment) прямо в THEN: “выбрал Premium → Item D +$5 и Item E FREE”, и показать как это будет выглядеть и на канвасе, и в сайдбаре.

---

Вот **пример компактной таблицы правил** (как у тебя “variant”-стайл: плотные строки, минимум колонок, всё читабельно).

### Компактный вид (таблица)

```
Rules  (24)                         Search: [__________]  Sort: Priority ↓  Filter: [All ▼]  [+ Rule]

┌────┬───┬─────┬──────────────────┬───────────────────────────────┬─────────────┬───┐
│ ↕  │On │ Prio│ Name             │ WHEN → THEN                    │ Targets     │ ! │
├────┼───┼─────┼──────────────────┼───────────────────────────────┼─────────────┼───┤
│ ↕  │ ◉ │ 200 │ ABC combo        │ A+B+C → -20% , hide Group X    │ 💰 📦X       │   │
│ ↕  │ ◉ │ 120 │ Premium locks    │ A → disable B,C ; show Extras  │ 🧩B 🧩C 📦E   │   │
│ ↕  │ ◉ │ 100 │ A+B discount     │ A+B → -10% (exclusive)         │ 💰           │ ⚠ │
│ ↕  │ ○ │  80 │ Qty clamp        │ totalQty(Drinks)≥5 → clamp 1..5│ 📦Drinks     │   │
│ ↕  │ ◉ │  60 │ Hide upsells     │ C selected → hide Upsell group │ 📦Upsell     │   │
└────┴───┴─────┴──────────────────┴───────────────────────────────┴─────────────┴───┘
Legend: ◉ enabled, ○ disabled, ⚠ conflict/warn
```

## Что тут компактно и полезно

- **↕**: drag handle для реордера (меняет priority)
- **On**: быстрый toggle включено/выключено
- **Prio**: число (клик → inline edit)
- **Name**: коротко
- **WHEN → THEN**: одна строка “суть правила” (самое важное)
- **Targets**: иконки целей (чтобы быстро понимать масштаб)
- **!**: статус (⚠ конфликт, ⛔ ошибка). По клику — открывает details в сайдбаре.

---

## Пример “WHEN → THEN” формата (чтобы всегда было одинаково)

- Комбо: `A+B+C → -20% , hide Group X`
- Доступность: `A → disable B,C ; show Extras`
- Кол-во: `totalQty(Drinks)≥5 → clamp 1..5`
- Цена на айтем: `Premium → Item D +$5 ; Item E FREE`

---

## Поведение клика

- **Клик по строке** → открыть редактирование правила в stack modal (full width)
- **Клик по “On”** → toggle без открытия
- **Drag за ↕** → меняет порядок и пересчитывает priority

---

Если хочешь, могу ещё сделать **ультра-компактный** вариант (без колонки Targets, иконки прямо в WHEN→THEN), или вариант где `WHEN` и `THEN` в две строки внутри одной ячейки (но всё равно низкая высота строки).

Ок — в модалке **только chart + sidebar**. Вот 2 нормальных компактных лейаута.

---

## Вариант A (самый простой): 2 колонки (Chart слева, Sidebar справа)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Package Dependencies                                  [Auto-layout] [✕ Close]│
│ Product: Starter Pack                                                    [ ? ]│
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┬──────────────────────────────┐ │
│ │ CHART (React Flow)                        │ INSPECTOR (Sidebar)          │ │
│ │ ┌───────────────────────────────────────┐ │ ┌──────────────────────────┐ │ │
│ │ │ (nodes + edges canvas)                │ │ │ Rule #11                  │ │ │
│ │ │                                       │ │ │ [Enabled ◉]  Prio [200]   │ │ │
│ │ │  [MiniMap] [Controls]                 │ │ │ Name [ABC combo]          │ │ │
│ │ └───────────────────────────────────────┘ │ ├──────────────────────────┤ │ │
│ │                                           │ │ WHEN                     │ │ │
│ │                                           │ │ Trigger [Item selected]  │ │ │
│ │                                           │ │ Source  [Item A ▼]       │ │ │
│ │                                           │ │ + Add condition          │ │ │
│ │                                           │ ├──────────────────────────┤ │ │
│ │                                           │ │ THEN                     │ │ │
│ │                                           │ │ 1) [disable] [Item B ▼]  │ │ │
│ │                                           │ │ 2) [show]    [Group X▼]  │ │ │
│ │                                           │ ├──────────────────────────┤ │ │
│ │                                           │ │ Conflicts: priority wins │ │ │
│ │                                           │ └──────────────────────────┘ │ │
│ └───────────────────────────────────────────┴──────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Cancel]                                              [Save changes]         │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Когда не выбран rule/node:** sidebar показывает “Select a rule” + кнопку “+ New rule”.

---

## Вариант B (сворачиваемый sidebar): больше места под граф

Сайдбар можно свернуть, чтоб редактировать на большом canvas.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Package Dependencies                                   [Debug] [✕ Close]     │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ CHART (React Flow)                                                       │ │
│ │ ┌──────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ canvas ...                                                            │ │ │
│ │ └──────────────────────────────────────────────────────────────────────┘ │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│ ┌───────────────┐                                                          │
│ │ ◀ Inspector   │   (collapsed tab)                                         │
│ └───────────────┘                                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Cancel]                                              [Save changes]         │
└──────────────────────────────────────────────────────────────────────────────┘
```

При раскрытии sidebar “наезжает” поверх графа или сдвигает его (как тебе удобнее).

---

## Микро-детали UX (чтобы модалка была удобной)

- Header: **Auto-layout**, **Zoom to fit**, **Debug**, **Close**
- Footer: **Cancel / Save changes**
- Sidebar: sticky, скролл внутри, чтобы не скроллить всю модалку
- Canvas: MiniMap + Controls + “fit view” кнопка

Если хочешь — нарисую ещё вариант, где sidebar снизу (для узких экранов), и правила редактируются в “drawer”.
