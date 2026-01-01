# План переноса модуля Products из старой админки

## Обзор

Перенос модуля продуктов из `/admin/external-examples/admin/modules/products/` в `/admin/src/domains/inventory/products/` с адаптацией под новую архитектуру (Registry, Drawers, DataLayout, AG Grid).

**Подход:** Mock данные по старой структуре, без GraphQL, без трансформации данных.

---

## Фаза 1: Типы и Mock данные (Критично)

### 1.1 Типы - скопировать из старой админки

**Создать:** `domains/inventory/products/types/`

- `index.ts` - скопировать `IProductFormValues`, `IProductFormVariantValues` из `external-examples/admin/modules/products/types.ts`
- `enums.ts` - скопировать `EntityStatus`, `WeightUnit`, `DimensionUnit` и др.

### 1.2 Mock данные - 3 продукта

**Создать:** `domains/inventory/products/mocks/products.ts`

```typescript
// 3 mock продукта по старой структуре IProductFormValues:
// 1. Простой продукт (1 вариант)
// 2. Продукт с вариантами (Size: S/M/L)
// 3. Продукт с опциями и группами
```

---

## Фаза 2: Страница списка продуктов

### 2.1 Обновить `page/page.tsx`

- Заменить текущие mock данные на новые (по старой структуре)
- Настроить колонки AG Grid как в старой админке:
  - Product (изображение + название)
  - Status (Draft/Published/Archived)
  - Price / Old Price / Cost Price
  - SKU
  - Stock Status
  - Categories/Tags

### 2.2 Создать `page/columnDefs.ts`

- Скопировать логику колонок из `external-examples/admin/modules/products/defs.tsx`

### 2.3 Создать `page/filterSchema.ts`

- Скопировать `productDashboardFilters` из `defs.tsx`

---

## Фаза 3: Drawer продукта

### 3.1 Структура ProductDrawer

Скопировать и адаптировать из `external-examples/admin/modules/products/components/Form.tsx`:

```
drawers/ProductDrawer/
├── index.tsx           # Drawer с 3 табами (как в старой Form.tsx)
├── tabs/
│   ├── GeneralTab.tsx  # General tab
│   ├── OptionsTab.tsx  # Options & Variants tab
│   └── ComponentsTab.tsx # Components tab (groups)
```

### 3.2 Компоненты полей (скопировать из старой админки)

**Из:** `external-examples/admin/modules/products/components/`

| Новый путь                      | Источник             |
| ------------------------------- | -------------------- |
| `components/Pricing.tsx`        | `Pricing.tsx`        |
| `components/Inventory.tsx`      | `Inventory.tsx`      |
| `components/Availability.tsx`   | `Availability.tsx`   |
| `components/Shipping.tsx`       | `Shipping.tsx`       |
| `components/Media.tsx`          | `Media.tsx`          |
| `components/CategoriesTags.tsx` | `CategoriesTags.tsx` |

### 3.3 Зарегистрировать drawer в `domains/drawers.tsx`

---

## Фаза 4: Варианты

### 4.1 Таблица вариантов

**Скопировать:** `external-examples/admin/modules/products/components/variants/TableV2.tsx`
→ `components/variants/VariantsTable.tsx`

### 4.2 Форма варианта

**Скопировать:** `external-examples/admin/modules/products/components/variants/VariantForm.tsx`
→ `components/variants/VariantForm.tsx`

### 4.3 Утилиты вариантов

**Скопировать:** `external-examples/admin/modules/products/utils/variants/`
→ `utils/variants/`

---

## Фаза 5: Опции продукта

**Скопировать из:** `external-examples/admin/modules/products/components/options/`
→ `components/options/`

- `Options.tsx`
- `Form.tsx`
- `Table.tsx`
- `OptionControl.tsx`

---

## Фаза 6: Группы (Bundles)

**Скопировать из:** `external-examples/admin/modules/products/components/groups/`
→ `components/groups/`

- `Groups.tsx`
- `GroupsTable.tsx`
- `GroupForm.tsx`

---

## Целевая структура файлов

```
domains/inventory/products/
├── register.tsx              # (существует)
├── types/
│   └── index.ts              # IProductFormValues, IProductFormVariantValues
├── mocks/
│   └── products.ts           # 3 mock продукта
├── page/
│   ├── page.tsx              # (обновить)
│   ├── columnDefs.ts
│   └── filterSchema.ts
├── drawers/
│   ├── types.ts              # (обновить)
│   └── ProductDrawer/
│       ├── index.tsx
│       └── tabs/
│           ├── GeneralTab.tsx
│           ├── OptionsTab.tsx
│           └── ComponentsTab.tsx
├── components/
│   ├── Pricing.tsx
│   ├── Inventory.tsx
│   ├── Availability.tsx
│   ├── Shipping.tsx
│   ├── Media.tsx
│   ├── CategoriesTags.tsx
│   ├── variants/
│   │   ├── VariantsTable.tsx
│   │   └── VariantForm.tsx
│   ├── options/
│   │   ├── Options.tsx
│   │   ├── Form.tsx
│   │   └── Table.tsx
│   └── groups/
│       ├── Groups.tsx
│       ├── GroupsTable.tsx
│       └── GroupForm.tsx
└── utils/
    └── variants/
        ├── createVariantsByOptions.ts
        └── mapVariants.ts
```

---

## Порядок выполнения

1. **Шаг 1:** Типы + Mock данные (3 продукта)
2. **Шаг 2:** Обновить page.tsx с mock данными + колонки
3. **Шаг 3:** ProductDrawer + GeneralTab + компоненты полей
4. **Шаг 4:** OptionsTab + компоненты опций
5. **Шаг 5:** Варианты (таблица + форма)
6. **Шаг 6:** ComponentsTab + группы

---

## Ключевые файлы-источники

| Что копируем     | Откуда                                                          |
| ---------------- | --------------------------------------------------------------- |
| Типы форм        | `external-examples/admin/modules/products/types.ts`             |
| Структура формы  | `external-examples/admin/modules/products/components/Form.tsx`  |
| Колонки/фильтры  | `external-examples/admin/modules/products/defs.tsx`             |
| Компоненты полей | `external-examples/admin/modules/products/components/*.tsx`     |
| Варианты         | `external-examples/admin/modules/products/components/variants/` |
| Опции            | `external-examples/admin/modules/products/components/options/`  |
| Группы           | `external-examples/admin/modules/products/components/groups/`   |
