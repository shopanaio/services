# План реализации EditComponentsModal на мок-данных

## Обзор

Пошаговый план разработки модалки редактирования компонентов продукта с использованием мок-данных для тестирования UI.

---

## Структура файлов

```
/modals/EditComponentsModal/
├── index.tsx                    # Главный компонент модалки
├── types.ts                     # TypeScript типы
├── styles.ts                    # createStyles определения
├── mocks/
│   └── mockData.ts              # Все мок-данные для UI
├── hooks/
│   ├── useComponentGroups.ts    # Управление состоянием групп
│   └── usePricingCalculation.ts # Расчёт цен
└── components/
    ├── GroupCard.tsx            # Карточка группы (аккордеон)
    ├── GroupSettings.tsx        # Форма настроек группы
    ├── ComponentsTable.tsx      # AG-Grid таблица позиций
    ├── PricingRulesTab.tsx      # Вкладка правил цен
    ├── PreviewTab.tsx           # Вкладка превью
    ├── SettingsTab.tsx          # Вкладка настроек
    ├── ProductPicker.tsx        # Модалка выбора продуктов
    └── VariantSettingsModal.tsx # Модалка настройки вариантов
```

---

## Этап 1: Типы и мок-данные

### 1.1 Создать types.ts

```typescript
// Тип компонента
export enum ComponentItemType {
  SIMPLE_PRODUCT = "SIMPLE_PRODUCT",
  SINGLE_VARIANT = "SINGLE_VARIANT",
  PRODUCT_WITH_VARIANTS = "PRODUCT_WITH_VARIANTS",
}

// Типы правил ценообразования
export enum ComponentPriceType {
  BASE = "BASE",
  FIXED = "FIXED",
  MARKUP_PERCENT = "MARKUP_PERCENT",
  DISCOUNT_PERCENT = "DISCOUNT_PERCENT",
  MARKUP_FIXED = "MARKUP_FIXED",
  DISCOUNT_FIXED = "DISCOUNT_FIXED",
  FREE = "FREE",
  INCLUDED = "INCLUDED",
}

// Режим расчёта бандла
export enum BundleCalcMode {
  ADDITIVE = "ADDITIVE",
  INCLUSIVE = "INCLUSIVE",
  HYBRID = "HYBRID",
}

// Интерфейсы: IComponentGroup, IComponentItem, IPricingRuleTemplate, ITieredDiscount
// (полные определения в design.md)
```

### 1.2 Создать mocks/mockData.ts

```typescript
// Мок продукты для ProductPicker
export const mockProducts = [
  {
    id: "prod-1",
    title: "Чехол Premium",
    sku: "CASE-PREM",
    price: 2500,
    priceMax: 4500,
    image: "/placeholder.png",
    hasVariants: true,
    stock: 234,
    variants: [
      { id: "var-1", title: "Чёрный / Кожа", sku: "CASE-BLK-LTH", price: 4500, stock: 45 },
      { id: "var-2", title: "Чёрный / Силикон", sku: "CASE-BLK-SIL", price: 2500, stock: 67 },
      { id: "var-3", title: "Белый / Кожа", sku: "CASE-WHT-LTH", price: 4500, stock: 23 },
      { id: "var-4", title: "Белый / Силикон", sku: "CASE-WHT-SIL", price: 2500, stock: 56 },
      { id: "var-5", title: "Синий / Кожа", sku: "CASE-BLU-LTH", price: 4500, stock: 0 },
      { id: "var-6", title: "Синий / Силикон", sku: "CASE-BLU-SIL", price: 2500, stock: 43 },
    ],
    options: [
      { id: "opt-color", name: "Цвет", values: ["Чёрный", "Белый", "Синий"] },
      { id: "opt-material", name: "Материал", values: ["Кожа", "Силикон"] },
    ],
  },
  {
    id: "prod-2",
    title: "Зарядка Pro 65W",
    sku: "CHG-PRO-001",
    price: 3200,
    image: "/placeholder.png",
    hasVariants: false,
    stock: 45,
  },
  {
    id: "prod-3",
    title: "Защитное стекло",
    sku: "SCR-PRO-001",
    price: 1200,
    image: "/placeholder.png",
    hasVariants: false,
    stock: 89,
  },
  {
    id: "prod-4",
    title: "Премиум кабель USB-C",
    sku: "CBL-USBC-001",
    price: 990,
    image: "/placeholder.png",
    hasVariants: false,
    stock: 156,
  },
];

// Мок гарантий
export const mockWarranties = [
  { id: "war-1", title: "1 год стандартная", price: 0 },
  { id: "war-2", title: "2 года расширенная", price: 12990 },
  { id: "war-3", title: "3 года AppleCare+", price: 24990 },
];

// Мок группы компонентов
export const mockGroups: IComponentGroup[] = [
  {
    id: "grp-1",
    title: "Аксессуары",
    slug: "accessories",
    sortIndex: 0,
    isRequired: true,
    isMultiple: true,
    minSelection: 1,
    maxSelection: 5,
    defaultItemIds: [],
    items: [
      {
        id: "item-1",
        itemType: ComponentItemType.PRODUCT_WITH_VARIANTS,
        productId: "prod-1",
        priceType: ComponentPriceType.MARKUP_PERCENT,
        priceValue: 10,
        basePrice: 2500,
        basePriceMax: 4500,
        finalPrice: 2750,
        finalPriceMax: 4950,
        sortIndex: 0,
        isAvailable: true,
        totalStock: 234,
        availableVariantIds: ["var-1", "var-2", "var-3", "var-4"],
        autoHideOutOfStock: true,
      },
      {
        id: "item-2",
        itemType: ComponentItemType.SINGLE_VARIANT,
        productId: "prod-1",
        variantId: "var-5",
        priceType: ComponentPriceType.FIXED,
        priceValue: 3990,
        basePrice: 4500,
        finalPrice: 3990,
        sortIndex: 1,
        isAvailable: false,
        stockStatus: "Нет в наличии",
      },
      {
        id: "item-3",
        itemType: ComponentItemType.SIMPLE_PRODUCT,
        productId: "prod-2",
        priceType: ComponentPriceType.DISCOUNT_PERCENT,
        priceValue: 10,
        basePrice: 3200,
        finalPrice: 2880,
        sortIndex: 2,
        isAvailable: true,
      },
      {
        id: "item-4",
        itemType: ComponentItemType.SIMPLE_PRODUCT,
        productId: "prod-3",
        priceType: ComponentPriceType.FREE,
        priceValue: null,
        basePrice: 1200,
        finalPrice: 0,
        sortIndex: 3,
        isAvailable: true,
      },
    ],
  },
  {
    id: "grp-2",
    title: "Гарантия",
    slug: "warranty",
    sortIndex: 1,
    isRequired: false,
    isMultiple: false,
    minSelection: 0,
    maxSelection: 1,
    defaultItemIds: ["item-5"],
    items: [
      {
        id: "item-5",
        itemType: ComponentItemType.SIMPLE_PRODUCT,
        productId: "war-1",
        priceType: ComponentPriceType.INCLUDED,
        priceValue: null,
        basePrice: 0,
        finalPrice: 0,
        sortIndex: 0,
        isAvailable: true,
        customTitle: "1 год стандартная гарантия",
      },
      {
        id: "item-6",
        itemType: ComponentItemType.SIMPLE_PRODUCT,
        productId: "war-2",
        priceType: ComponentPriceType.FIXED,
        priceValue: 12990,
        basePrice: 12990,
        finalPrice: 12990,
        sortIndex: 1,
        isAvailable: true,
        customTitle: "2 года расширенная гарантия",
      },
      {
        id: "item-7",
        itemType: ComponentItemType.SIMPLE_PRODUCT,
        productId: "war-3",
        priceType: ComponentPriceType.FIXED,
        priceValue: 24990,
        basePrice: 24990,
        finalPrice: 24990,
        sortIndex: 2,
        isAvailable: true,
        customTitle: "3 года AppleCare+",
      },
    ],
  },
  {
    id: "grp-3",
    title: "Подарочная упаковка",
    slug: "gift-wrap",
    sortIndex: 2,
    isRequired: false,
    isMultiple: false,
    minSelection: 0,
    maxSelection: 1,
    defaultItemIds: [],
    items: [],
  },
];

// Мок шаблоны правил ценообразования
export const mockPricingTemplates: IPricingRuleTemplate[] = [
  { id: "tpl-1", name: "Скидка бандла", priceType: ComponentPriceType.DISCOUNT_PERCENT, priceValue: 15, applyToGroupIds: "all" },
  { id: "tpl-2", name: "Наценка аксессуаров", priceType: ComponentPriceType.MARKUP_PERCENT, priceValue: 10, applyToGroupIds: ["grp-1"] },
  { id: "tpl-3", name: "Фикс. гарантия", priceType: ComponentPriceType.FIXED, priceValue: 4990, applyToGroupIds: ["grp-2"] },
  { id: "tpl-4", name: "Бесплатный подарок", priceType: ComponentPriceType.FREE, priceValue: null, applyToGroupIds: ["grp-3"] },
];

// Мок многоуровневые скидки
export const mockTieredDiscounts: ITieredDiscount[] = [
  { id: "tier-1", minItems: 2, discountPercent: 5 },
  { id: "tier-2", minItems: 4, discountPercent: 10 },
  { id: "tier-3", minItems: 6, discountPercent: 15 },
];

// Мок настройки модалки
export const mockModalSettings = {
  bundleCalcMode: BundleCalcMode.ADDITIVE,
  displayStyle: "accordion" as const,
  showImages: true,
  showSku: true,
  showStock: true,
  showComparePrice: false,
  outOfStockBehavior: "disable" as const,
  inheritStock: true,
  validationMessage: "Пожалуйста, выберите обязательные аксессуары перед продолжением",
};
```

---

## Этап 2: Каркас модалки

### 2.1 Создать index.tsx

```typescript
import { useState } from "react";
import { Tabs } from "antd";
import { ModalLayout, ModalHeader } from "@/layouts/modals";
import { mockGroups, mockModalSettings } from "./mocks/mockData";

export const EditComponentsModal = () => {
  const [activeTab, setActiveTab] = useState("groups");
  const [groups, setGroups] = useState(mockGroups);
  const [isDirty, setIsDirty] = useState(false);

  const tabItems = [
    { key: "groups", label: "Группы", children: <GroupsTab /> },
    { key: "pricing", label: "Правила цен", children: <PricingRulesTab /> },
    { key: "preview", label: "Превью", children: <PreviewTab /> },
    { key: "settings", label: "Настройки", children: <SettingsTab /> },
  ];

  return (
    <ModalLayout width={900}>
      <ModalHeader
        title="Редактирование компонентов продукта"
        onCancel={handleCancel}
        onSave={handleSave}
      />
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </ModalLayout>
  );
};
```

---

## Этап 3: Вкладка "Группы"

### 3.1 GroupCard.tsx — Карточка группы

**Свёрнутое состояние:**
- Иконка ▶
- Название группы (bold)
- Теги: `Обязат.` | `Множеств.` | `5 позиций` | `₽2,500 - ₽4,500`
- Кнопка меню ⋮

**Развёрнутое состояние:**
- Иконка ▼
- Заголовок + теги
- GroupSettings форма
- Разделитель
- ComponentsTable

### 3.2 GroupSettings.tsx — Настройки группы

| Поле | Компонент | Описание |
|------|-----------|----------|
| Название | Input | Текстовое поле |
| Slug | Input | Автогенерация из названия |
| Обязательный | Checkbox | isRequired |
| Множественный | Checkbox | isMultiple |
| Мин | InputNumber | minSelection |
| Макс | InputNumber | maxSelection |
| По умолчанию | Select | defaultItemIds |

### 3.3 ComponentsTable.tsx — AG-Grid таблица

**Колонки:**

| Колонка | Ширина | Компонент | Описание |
|---------|--------|-----------|----------|
| Drag | 40px | rowDrag | Ручка перетаскивания |
| Тип | 50px | TypeIconRenderer | 📦/🏷️/📄 |
| Продукт | flex:2 | ProductCellRenderer | Изображение + название + артикул |
| Базовая цена | 120px | PriceCellRenderer | ₽X,XXX или диапазон |
| Правило цены | 150px | PriceRuleCellRenderer | Dropdown с типами |
| Итого | 120px | FinalPriceCellRenderer | Итоговая цена |
| Действия | 50px | ActionsRenderer | Меню ⋮ |

**Custom Cell Renderers:**

```typescript
// TypeIconRenderer
const TypeIconRenderer = ({ value }) => {
  const icons = {
    PRODUCT_WITH_VARIANTS: "📦",
    SINGLE_VARIANT: "🏷️",
    SIMPLE_PRODUCT: "📄",
  };
  return <span>{icons[value]}</span>;
};

// ProductCellRenderer
const ProductCellRenderer = ({ data }) => (
  <Flex gap={8} align="center">
    <img src={data.image} width={40} height={40} />
    <div>
      <div>{data.title}</div>
      <Typography.Text type="secondary">{data.sku}</Typography.Text>
      {data.itemType === "PRODUCT_WITH_VARIANTS" && (
        <Tag color="blue">{data.variantsCount} вариантов</Tag>
      )}
    </div>
  </Flex>
);

// PriceRuleCellRenderer
const PriceRuleCellRenderer = ({ data, api }) => {
  const options = [
    { value: "BASE", label: "Без изменений" },
    { value: "FIXED", label: "Фикс. цена" },
    { value: "MARKUP_PERCENT", label: "% наценка" },
    { value: "DISCOUNT_PERCENT", label: "% скидка" },
    { value: "FREE", label: "Бесплатно" },
    { value: "INCLUDED", label: "Включено" },
  ];
  return <Select options={options} value={data.priceType} />;
};
```

---

## Этап 4: ProductPicker модалка

### 4.1 Структура

```
+----------------------------------------------------------+
| [x] Добавить компоненты в группу       [Отмена][Добавить] |
+----------------------------------------------------------+
| [🔍 Поиск...]                                             |
| Фильтры: [Категория v] [Тип v] [Наличие v]               |
| Режим: (•) Отдельные варианты  ( ) Продукт с выбором     |
+----------------------------------------------------------+
| РЕЗУЛЬТАТЫ (N товаров)                                    |
| +------------------------------------------------------+ |
| | [ ] [img] Продукт 1                      ₽X,XXX      | |
| | [ ] [img] Продукт 2 (вариативный)   ₽X,XXX - ₽X,XXX | |
| |     └─ [▼ Развернуть варианты]                       | |
| +------------------------------------------------------+ |
+----------------------------------------------------------+
| Выбрано: X позиций                      [Отмена][Добавить]|
+----------------------------------------------------------+
```

### 4.2 Состояние

```typescript
const [searchQuery, setSearchQuery] = useState("");
const [selectedIds, setSelectedIds] = useState<string[]>([]);
const [addMode, setAddMode] = useState<"variants" | "product">("variants");
const [expandedProducts, setExpandedProducts] = useState<string[]>([]);
```

---

## Этап 5: VariantSettingsModal

### 5.1 Секции

1. **Режим отображения** — Radio.Group (Селектор опций / Список вариантов)
2. **Доступные опции** — Checkbox группы по каждой опции
3. **Матрица вариантов** — Grid с чекбоксами
4. **Превью** — Визуализация выбора на витрине

---

## Этап 6: Вкладка "Правила цен"

### 6.1 Секции

1. **Режим расчёта бандла** — Radio.Group (Добавить к базе / Включить в бандл / Гибридный)
2. **Правила по умолчанию** — Select
3. **Шаблоны правил** — Таблица с CRUD
4. **Многоуровневые скидки** — Таблица с настройкой порогов

---

## Этап 7: Вкладка "Превью"

### 7.1 Компоненты

1. **DeviceSwitcher** — кнопки Desktop/Tablet/Mobile
2. **PreviewContainer** — контейнер с адаптивной шириной
3. **StorefrontPreview** — визуализация конфигуратора
4. **PriceSummary** — расчёт итоговой цены

---

## Этап 8: Вкладка "Настройки"

### 8.1 Секции

1. **Настройки отображения**
   - Select: стиль (accordion/tabs/flat/wizard)
   - Checkbox: показывать изображения
   - Checkbox: показывать артикулы
   - Checkbox: показывать наличие
   - Checkbox: показывать зачёркнутые цены

2. **Склад и наличие**
   - Radio: поведение при отсутствии (hide/disable/backorder)
   - Checkbox: наследовать трекинг
   - Checkbox: отдельный пул склада

3. **Правила валидации**
   - Checkbox: требовать все обязательные
   - Checkbox: inline ошибки
   - Checkbox: подсветка незаполненных
   - Input: кастомное сообщение

---

## Чеклист реализации

### Приоритет 🔴 Высокий

- [ ] types.ts — все TypeScript типы
- [ ] mocks/mockData.ts — тестовые данные
- [ ] index.tsx — каркас модалки с табами
- [ ] GroupCard.tsx — аккордеон группы
- [ ] GroupSettings.tsx — форма настроек
- [ ] ComponentsTable.tsx — AG-Grid базовый

### Приоритет 🟡 Средний

- [ ] AG-Grid custom renderers (Type, Product, Price, Actions)
- [ ] AG-Grid row drag & drop
- [ ] ProductPicker.tsx — модалка выбора
- [ ] VariantSettingsModal.tsx — настройка вариантов
- [ ] Меню действий группы (дублировать, удалить)
- [ ] Меню действий строки (изменить цену, удалить)

### Приоритет 🟢 Низкий

- [ ] PricingRulesTab.tsx — вкладка правил
- [ ] PreviewTab.tsx — вкладка превью
- [ ] SettingsTab.tsx — вкладка настроек
- [ ] Горячие клавиши
- [ ] Адаптив (mobile/tablet)

---

## Зависимости

```json
{
  "ag-grid-react": "^31.x",
  "ag-grid-community": "^31.x",
  "antd": "^5.x",
  "@ant-design/icons": "^5.x"
}
```

---

## Заметки

- Все данные берутся из `mocks/mockData.ts` — никаких API-вызовов
- Состояние управляется через `useState` локально в модалке
- При сохранении просто логировать данные в консоль
- Фокус на визуальной точности согласно design.md
