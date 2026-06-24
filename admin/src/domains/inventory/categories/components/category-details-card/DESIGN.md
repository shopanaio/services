# Category Details Card — Design Document

## Overview

Карточка детального просмотра категории каталога.
Секционная компоновка, UI-kit компоненты (`Paper`, `PaperHeader`, `EditAction`), Ant Design, модальное редактирование через хуки.

---

## File Structure

```
category-details-card/
├── category-details-card.tsx            # Root component
├── category-details-card.styles.ts      # createStyles (antd-style)
├── types.ts                             # Interfaces & Props
├── index.ts                             # Barrel export
├── hooks/
│   ├── use-category-modals.ts           # Modal orchestration hook
│   └── index.ts
└── sections/
    ├── hierarchy-section.tsx             # Parent + Breadcrumb + Subcategories
    ├── products-section.tsx              # Products table
    ├── media-section.tsx                 # Featured image + Gallery
    ├── tags-section.tsx                  # Tags
    └── index.ts
```

---

## Data Model

```typescript
interface ICategory {
  id: ID;
  title: string;
  slug: string;
  description: string | null;
  excerpt: string | null;
  status: EntityStatus; // ACTIVE | DRAFT | ARCHIVED
  featured: IMediaFile | null;
  gallery: IMediaFile[];
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ICategoryParent {
  id: ID;
  title: string;
  slug: string;
}

interface ICategoryChild {
  id: ID;
  title: string;
  slug: string;
  status: EntityStatus;
  productCount: number;
  featured: IMediaFile | null;
}

interface ICategoryProduct {
  id: ID;
  title: string;
  sku: string | null;
  price: number;
  featured: IMediaFile | null;
  status: EntityStatus;
  inStock: boolean;
}
```

---

## Props

```typescript
interface ICategoryDetailsCardProps {
  category: ICategory;
  mockData: ICategoryDetailsMockData;
  onEditSection?: (section: CategorySection) => void;
}

interface ICategoryDetailsMockData {
  hierarchy: {
    ancestors: ICategoryParent[]; // root -> ... -> direct parent
    children: ICategoryChild[];
  };
  products: {
    items: ICategoryProduct[];
    totalCount: number;
    hasNextPage: boolean;
  };
  tags: ITag[];
}

type CategorySection =
  | "info"
  | "hierarchy"
  | "products"
  | "media"
  | "seo"
  | "tags";
```

---

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│  CategoryInfoHeader                                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  [ACTIVE ●]  Jan 25 by Admin    [🔗][👁][↗] [⋯]     │  │
│  │                                                       │  │
│  │  Audio Equipment                                      │  │
│  │  [/ electronics/audio]  [ID 3f8a…]                    │  │
│  │  ─────────────────────────────────                    │  │
│  │  Browse our collection of premium audio equipment...  │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  CategoryContentTabs                                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  [Description] [Excerpt]           [✨ AI]  [⋯]      │  │
│  │                                                       │  │
│  │  Browse our extensive collection of premium audio     │  │
│  │  equipment. From professional-grade headphones to...  │  │
│  │  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ gradient fade ▒▒▒▒▒▒▒▒  │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  HierarchySection                                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Breadcrumb:  Home > Electronics > Audio              │  │
│  │                                                       │  │
│  │  Parent Category:   [Electronics]  (clickable tag)    │  │
│  │                                                       │  │
│  │  Subcategories (4):            [+ Add Subcategory]    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │  │
│  │  │ Headpho- │ │ Speakers │ │ Ampli-   │ │ Cables & │ │  │
│  │  │ nes      │ │          │ │ fiers    │ │ Adapters │ │  │
│  │  │ 45 prods │ │ 32 prods │ │ 18 prods │ │ 33 prods │ │  │
│  │  │ (active) │ │ (active) │ │ (draft)  │ │ (active) │ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  MediaSection                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ┌─────────────────┐  ┌─────┐ ┌─────┐ ┌─────┐       │  │
│  │  │                 │  │     │ │     │ │     │       │  │
│  │  │   Featured      │  │  2  │ │  3  │ │  4  │       │  │
│  │  │   (2x2)         │  │     │ │     │ │     │       │  │
│  │  │                 │  ├─────┤ ├─────┤ ├─────┤       │  │
│  │  │                 │  │     │ │     │ │     │       │  │
│  │  └─────────────────┘  │  5  │ │  6  │ │ +N  │       │  │
│  │                       │     │ │     │ │     │       │  │
│  │                       └─────┘ └─────┘ └─────┘       │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ProductsSection                                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Products (128)               [Search]  [+ Assign]    │  │
│  │                                                       │  │
│  │  ┌────────────────────────────────────────────────┐   │  │
│  │  │ Product         │ SKU      │ Price  │ Status   │   │  │
│  │  ├─────────────────┼──────────┼────────┼──────────┤   │  │
│  │  │ [img] Sony WH-  │ SNY-1000 │ $349   │ Active   │   │  │
│  │  │ [img] AirPods   │ APL-APRO │ $249   │ Active   │   │  │
│  │  │ [img] Bose QC   │ BSE-QC45 │ $279   │ Active   │   │  │
│  │  │ [img] JBL Flip  │ JBL-FL6  │  $99   │ Draft    │   │  │
│  │  │ ...              │          │        │          │   │  │
│  │  └────────────────────────────────────────────────┘   │  │
│  │                                                       │  │
│  │  Showing 1-10 of 128              [< Prev]  [Next >]  │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  TagsSection                                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Tags                                    [+ Add Tag]  │  │
│  │  [Featured] [New Arrivals] [Holiday Sale]             │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  SeoBlock                                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  SEO & Metadata                           [Edit]      │  │
│  │                                                       │  │
│  │  Title:        Audio Equipment - Shopana Store        │  │
│  │  Description:  Browse our selection of premium audio  │  │
│  │                equipment including headphones...       │  │
│  │  URL:          /categories/electronics/audio          │  │
│  │                                                       │  │
│  │  ┌─ Google Preview ─────────────────────────────┐     │  │
│  │  │  Audio Equipment - Shopana Store              │     │  │
│  │  │  shopana.store/categories/electronics/audio   │     │  │
│  │  │  Browse our selection of premium audio...     │     │  │
│  │  └───────────────────────────────────────────────┘     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Sections Detail

Каждая секция обёрнута в `Paper` > `PaperHeader` > контент.
Паттерн один к одному с `product-details-card/sections/*`.

---

### 1. CategoryInfoHeader

Отдельный компонент `category-info-header/`, структура как `product-info-header/`.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Paper                                                                   │
│                                                                          │
│  ┌─ PaperHeader ──────────────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │  title:                                     actions:               │  │
│  │  ┌─ Flex align="center" gap={8} ─────┐      ┌─ Flex gap={8} ───┐  │  │
│  │  │ [ACTIVE ●] Tag color="success"    │      │ [🔗] [👁] [↗]   │  │  │
│  │  │                                   │      │ btn  btn  popover│  │  │
│  │  │ "Jan 25 by "                      │      │                  │  │  │
│  │  │ [Admin] ← Popover(UserCard)       │      │ [⋯] Dropdown     │  │  │
│  │  └───────────────────────────────────┘      └──────────────────┘  │  │
│  │                                                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Flex vertical gap={8} ────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │  Typography.Title level={3} ellipsis={{ rows: 2 }}                 │  │
│  │  "Audio Equipment"                                                 │  │
│  │                                                                    │  │
│  │  ┌─ Flex align="center" gap={12} ─────────────────────────────┐    │  │
│  │  │ CopyableChip label="/" value="electronics/audio"           │    │  │
│  │  │ CopyableChip label="ID" value="3f8a…" mono                │    │  │
│  │  └────────────────────────────────────────────────────────────┘    │  │
│  │                                                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ──────────────────────── Divider ────────────────────────────            │
│                                                                          │
│  ┌─ Description ──────────────────────────────────────────────────────┐  │
│  │  Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }}      │  │
│  │  "Browse our collection of premium audio equipment including..."    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**PaperHeader title** — `Flex align="center" gap={8}`:
- `Tag` color-coded status: ACTIVE → `success` + `CheckOutlined`, DRAFT → `warning` + `EditOutlined`, ARCHIVED → `default` + `InboxOutlined`
- `Typography.Text` type="secondary" fontSize 12 — дата + "by" + `Popover` с `UserPopoverContent`

**PaperHeader actions** — `Flex align="center" gap={12}`:
- `Button` text `LinkOutlined` — copy admin URL to clipboard
- `Button` text `EyeOutlined` — open storefront URL in new tab
- `Popover` trigger="click" с `SharePopoverContent` — share storefront link
- `Dropdown` с `Button` size="small" `MoreOutlined`:

```
  ┌──────────────────┐
  │ Edit title       │  ← onClick → openEditTitleModal
  │ ──────────────── │
  │ Duplicate        │
  │ Export           │
  │ ──────────────── │
  │ Archive          │  ← danger: true
  └──────────────────┘
```

**Title section:**
- `Typography.Title` level={3}, `ellipsis={{ rows: 2, tooltip }}`, `margin: 0`
- `CopyableChip` label="/" value={slug} — slug
- `CopyableChip` label="ID" value={id} displayValue={id.slice(0,8)} mono

---

### 2. CategoryContentTabs

Один к одному копия `product-content-tabs/product-content-tabs.tsx`.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Paper  minHeight: 120                                                   │
│                                                                          │
│  ┌─ Tabs type="card" size="middle" ───────────────────────────────────┐  │
│  │                                                                    │  │
│  │  ┌────────────┐ ┌────────────┐           tabBarExtraContent:       │  │
│  │  │Description │ │  Excerpt   │           [✨ AI]  [⋯]              │  │
│  │  │  (active)  │ │            │           AIButton  Dropdown:       │  │
│  │  └────────────┘ └────────────┘             [Edit content]          │  │
│  │                                                                    │  │
│  │  ┌─ Tab: Description ──────────────────────────────────────────┐   │  │
│  │  │                                                             │   │  │
│  │  │  renderedContent: dangerouslySetInnerHTML                   │   │  │
│  │  │  fontSize 13, lineHeight 1.6                                │   │  │
│  │  │  minHeight 80, maxHeight 120, overflow hidden               │   │  │
│  │  │                                                             │   │  │
│  │  │  Browse our extensive collection of premium audio           │   │  │
│  │  │  equipment. From professional-grade headphones to           │   │  │
│  │  │  portable speakers, we offer top brands at...               │   │  │
│  │  │  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ ← gradient fade          │   │  │
│  │  └─────────────────────────────────────────────────────────────┘   │  │
│  │                                                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Tabs:**
- `Description` — `description.html` через `dangerouslySetInnerHTML`, max 120px с gradient fade (`::after`)
- `Excerpt` — `excerpt` как `<p>`, тот же стиль

**tabBarExtraContent:**
- `AIButton` → `openAIWriterModal({ product, onApply })` — генерация контента через AI
- `Dropdown` → `[Edit content]` → `openEditDescriptionModal({ description, excerpt, product, onSave })`

**Empty state** (per tab):

```
  ⚠ No description added  [Add now]    ← WarningOutlined + Text secondary 12px + Button type="link"
```

**Rendered content styles:**
- `p` margin: 0 0 8px, `h3` fontSize 14, `ul/ol` paddingLeft 20
- Gradient fade: `::after` height 40px, `linear-gradient(transparent, colorBgContainer)`

---

### 3. HierarchySection

Уникальная секция категории. Локальный стейт не нужен — данные из props.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Paper                                                                   │
│  ┌─ PaperHeader ──────────────────────────────────────────────────────┐  │
│  │  Hierarchy                                         [Edit ✎]        │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Breadcrumb:  Home  ›  Electronics  ›  **Audio**                         │
│                                                                          │
│  Parent:  [📁 Electronics ⋯]                                             │  ← Tag color="blue", Dropdown: navigate / change parent
│                                                                          │
│  ── SUBCATEGORIES (4) ── label uppercase 10px ──────────────────         │
│                                                                          │
│  ┌─ Grid 4 col, gap 12 ──────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────┐ │  │
│  │  │ [Avatar 48]  │  │ [Avatar 48]  │  │ [Avatar 48]  │  │[Av 48] │ │  │
│  │  │              │  │              │  │              │  │        │ │  │
│  │  │  Headphones  │  │  Speakers    │  │  Amplifiers  │  │ Cables │ │  │
│  │  │  45 products │  │  32 products │  │  18 products │  │ 33 pr. │ │  │
│  │  │  ● Active    │  │  ● Active    │  │  ○ Draft     │  │● Active│ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────┘ │  │
│  │                                                                    │  │
│  │  ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐                                                 │  │
│  │  ╎   [+]         ╎   ← dashed cell, same height as cards          │  │
│  │  ╎ Add Subcategory╎                                                │  │
│  │  └╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘                                                 │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

**SubcategoryCard** — отдельный sub-component:

```
┌───────────────────┐
│  [Avatar 48×48]   │  ← src=child.featured?.url, fallback=FolderOutlined
│                   │
│  Headphones       │  ← Typography.Text strong, ellipsis 1 line
│  45 products      │  ← Typography.Text type="secondary", fontSize 12
│  ● Active         │  ← color dot + label (success/warning/error)
└───────────────────┘
   border: 1px solid colorBorderSecondary
   borderRadius: borderRadiusLG
   padding: 12
   cursor: pointer
   hover → borderColor: colorPrimary, boxShadow: boxShadowTertiary
```

**Empty state** (нет subcategories):

```
   ┌────────────────────────────────────────────────┐
   │                  📂                             │
   │  This is a leaf category with no subcategories  │
   │            [+ Create Subcategory]               │  ← Button dashed
   └────────────────────────────────────────────────┘
```

**Edit action** → opens parent category picker (CategoryTreePicker).

---

### 4. MediaSection

Один к одному копия `product-details-card/sections/media-section.tsx`.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Paper                                                                   │
│  ┌─ PaperHeader ──────────────────────────────────────────────────────┐  │
│  │  Media                                             [Edit ✎]        │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ mediaGrid: CSS Grid 8 col, gap 8 ────────────────────────────────┐  │
│  │                                                                    │  │
│  │  ┌─────────────────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │  │
│  │  │ ★ FeaturedBadge     │  │         │  │         │  │         │   │  │
│  │  │                     │  │  img 2  │  │  img 3  │  │  img 4  │   │  │
│  │  │  img 1  (span 2×2)  │  │  1×1    │  │  1×1    │  │  1×1    │   │  │
│  │  │                     │  ├─────────┤  ├─────────┤  ├─────────┤   │  │
│  │  │  hover → mask:      │  │         │  │         │  │╌╌╌╌╌╌╌╌╌│   │  │
│  │  │   👁 Preview        │  │  img 5  │  │  img 6  │  │╌  [+]  ╌│   │  │
│  │  └─────────────────────┘  │  1×1    │  │  1×1    │  │╌Upload ╌│   │  │
│  │                            └─────────┘  └─────────┘  └╌╌╌╌╌╌╌╌╌┘   │  │
│  │                                                                    │  │
│  │  ┌─ mediaOverlay (absolute, pointer-events:none) ──────────────┐   │  │
│  │  │  [spacer][spacer]...[MediaFilePlaceholder][Placeholder]...  │   │  │
│  │  └─────────────────────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  <MediaPreview visible={…} items={gallery} currentIndex={…} />           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Ключевые детали:**
- `gallery.slice(0, showMore ? 11 : 12)` — обрезка до 12 ячеек
- Если `gallery.length > 12` → последняя видимая ячейка = `+{gallery.length - 11}` (кнопка `mediaMoreButton`)
- Последняя ячейка всегда `uploadArea` (dashed border, `PlusOutlined`, onClick → `onEdit`)
- `mediaOverlay` — абсолютный overlay поверх грида с `MediaFilePlaceholder` для пустых ячеек
- `MediaPreview` — lightbox-компонент через `useMediaPreview` hook
- Upload cell: `role="button"`, `tabIndex={0}`, `onKeyDown` для accessibility

---

### 5. ProductsSection

По паттерну `variants-table-section.tsx` — кастомная `<table>`, не Ant Table.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Paper                                                                   │
│  ┌─ PaperHeader ──────────────────────────────────────────────────────┐  │
│  │  Products                  [🔍 Input.Search w=200]                 │  │
│  │                            [↕ Sort]  [+ Assign Products ✎]        │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ <table> productsTable (overflowX: auto) ─────────────────────────┐  │
│  │                                                                    │  │
│  │  ┌──────────────────────┬───────────┬──────────┬─────────────────┐ │  │
│  │  │ PRODUCT              │ SKU       │ PRICE    │ STATUS          │ │  │ ← th: uppercase 11px, 500 weight
│  │  ├──────────────────────┼───────────┼──────────┼─────────────────┤ │  │
│  │  │ [img 40×40] Sony WH  │ SNY-1000  │ ₴ 14,900│ ● In Stock      │ │  │
│  │  │             1000XM5  │ monospace │ right    │ success         │ │  │
│  │  ├──────────────────────┼───────────┼──────────┼─────────────────┤ │  │
│  │  │ [img] AirPods Pro    │ APL-APRO  │ ₴ 10,500│ ● In Stock      │ │  │
│  │  ├──────────────────────┼───────────┼──────────┼─────────────────┤ │  │
│  │  │ [img] Bose QC 45     │ BSE-QC45  │ ₴ 11,900│ ○ Low Stock     │ │  │
│  │  │                      │           │          │ warning         │ │  │
│  │  ├──────────────────────┼───────────┼──────────┼─────────────────┤ │  │
│  │  │ [placeholder 40×40]  │ —         │ ₴  4,200│ ✕ Out of Stock  │ │  │
│  │  │  JBL Flip 6          │           │          │ error           │ │  │
│  │  └──────────────────────┴───────────┴──────────┴─────────────────┘ │  │
│  │                                                                    │  │
│  │  even rows → background: colorBgLayout                             │  │
│  │  hover rows → background: colorBgLayout                            │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Pagination (borderTop, padding 8px 0) ────────────────────────────┐  │
│  │  128 products                                    [◄]  [►]          │  │
│  │  fontSize 12, secondary                   disabled if !hasPrev/Next│  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Product row** — sub-component `ProductRow`:

```
td[0]: Flex align="flex-start" gap={8}
       │  [Image 40×40 borderRadius 4] или [placeholder 40×40 gray]
       │  Flex vertical:
       │    Typography.Text strong fontSize 13 — title
       │    Typography.Text secondary fontSize 12 — subtitle (optional)
td[1]: Typography.Text monospace fontSize 11 secondary — SKU или "—"
td[2]: Typography.Text — formatPrice(product.price)
td[3]: Flex align="center" gap={4}
       │  <span> dot icon 10px color </span>
       │  <span> label 11px color </span>
```

**Stock status config** (как в variants-table-section):

```
IN_STOCK     → ● colorSuccess  "In Stock"
LOW_STOCK    → ○ colorWarning  "Low Stock"
OUT_OF_STOCK → ✕ colorError    "Out of Stock"
```

**Sort menu** (Dropdown):

```
Name A → Z
Name Z → A
───────────
Price: Low → High
Price: High → Low
───────────
Stock: Low → High
Stock: High → Low
```

**Empty state:**

```
  [+ Add Tag]  No products assigned     ← inline, как в TagsSection
```

---

### 6. TagsSection

Один к одному копия `product-details-card/sections/tags-section.tsx`.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Paper                                                                   │
│  ┌─ PaperHeader ──────────────────────────────────────────────────────┐  │
│  │  Tags                                                              │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Flex gap={4} wrap="wrap" ─────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │  ┌─ Dropdown ──────────┐  ┌─ Dropdown ──────────┐                  │  │
│  │  │ Tag: "Featured" [⋯] │  │ Tag: "New Items" [⋯]│  ...             │  │
│  │  └─────────────────────┘  └─────────────────────┘                  │  │
│  │       click → menu:            click → menu:                       │  │
│  │       [Delete tag]             [Delete tag]                        │  │
│  │                                                                    │  │
│  │  ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐                                        │  │
│  │  ╎ Tag outlined dashed:   ╎  ← onClick → useTagPicker().openPicker │  │
│  │  ╎  [+] Add Tag          ╎                                        │  │
│  │  └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘                                        │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Стейт:**
- `useState<ITag[]>(initialTags)` — локальный массив тегов
- `deleteTag(id)` → filter из массива
- `useTagPicker({ initialSelection, onConfirm })` → merge с существующими

**Empty state** (когда `tags.length === 0`):

```
  [+ Add Tag]  No tags assigned    ← Tag dashed + Typography.Text secondary fontSize 12
```

---

### 7. SeoBlock

Реюзается `product-details-card/../seo/seo-block.tsx` + `seo-preview.tsx`.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Paper                                                                   │
│  ┌─ PaperHeader ──────────────────────────────────────────────────────┐  │
│  │  SEO          [⚠ 2 issues]                        [Edit SEO ✎]    │  │
│  │               error text, fontSize 11                              │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ SeoPreview ───────────────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │  ┌─ Google Search Preview ──────────────────────────────────────┐  │  │
│  │  │                                                              │  │  │
│  │  │  Audio Equipment - Shopana Store                             │  │  │  ← #1a0dab, 18px
│  │  │  https://shopana.store › categories › electronics › audio    │  │  │  ← #006621, 14px
│  │  │  Browse our selection of premium audio equipment             │  │  │  ← #545454, 14px
│  │  │  including headphones, speakers, and amplifiers...           │  │  │
│  │  │                                                              │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │  ┌─ Social Preview (OG) ────────────────────────────────────────┐  │  │
│  │  │  ┌────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │                    [OG Image]                          │  │  │  │
│  │  │  ├────────────────────────────────────────────────────────┤  │  │  │
│  │  │  │  shopana.store                                        │  │  │  │
│  │  │  │  Audio Equipment - Shopana Store                      │  │  │  │
│  │  │  │  Browse our selection of premium audio...             │  │  │  │
│  │  │  └────────────────────────────────────────────────────────┘  │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

**PaperHeader extras:**
- `extra` = issues badge: `WarningOutlined` + `"N issues"` (red), показан если `!seoTitle || !seoDescription`
- `actions` = `EditAction` label="Edit SEO"

**SeoPreview data mapping:**
- `seoTitle` → Google title (fallback: `category.title`)
- `seoDescription` → Google description (fallback: `category.excerpt`)
- `productSlug` → URL path (`/categories/electronics/audio`)
- `ogTitle`, `ogDescription`, `ogImage` → Social preview card

---

## State Management

### `useCategoryModals` hook

По паттерну `use-product-modals.ts`: импорт `{ push }` из каждого модального хука, `useCallback` обёртки.

```
useCategoryModals(category)
  │
  ├── openEditInfo      → useEditTitleModal().push({ title, handle, onSave })
  ├── editMedia         → useEditMediaModal().push({ productId, featured, gallery, onSave })
  ├── editSeo           → useEditSeoModal().push({ productId, productTitle, productSlug, seoTitle, seoDescription, onSave })
  ├── editTags          → useEditTagsModal().push({ productId, selectedTagIds, onSave })
  ├── editHierarchy     → useCategoryPicker().openPicker({ selectedIds, onConfirm })
  ├── openProductPicker → product picker modal
  ├── addSubcategory    → create category modal (parentId pre-filled)
  ├── archiveCategory   → confirm modal (warning)
  └── deleteCategory    → confirm modal (danger)
```

Каждый handler:
- `useCallback` с dependency array `[category.id, category.*, push]`
- Трансформирует `category` → modal payload
- `onSave` пока `console.log`

---

## Component Dependencies

```
category-details-card.tsx
├── ../category-info-header (CategoryInfoHeader)
├── ../seo (SeoBlock, SeoPreview)
├── ./sections/hierarchy-section
├── ./sections/media-section
├── ./sections/products-section
├── ./sections/tags-section
├── ./hooks/use-category-modals
│
├── ui-kit/Paper, PaperHeader, EditAction
├── ui-kit/FeaturedBadge
├── ui-kit/KPITile
├── ui-kit/CopyableChip
│
├── shared/entity-picker-modal (useCategoryPicker, useTagPicker)
├── media/components/media-preview (MediaPreview, useMediaPreview)
├── media/components/media-file-placeholder
│
├── antd: Flex, Tag, Typography, Breadcrumb, Avatar, Button,
│         Dropdown, Image, Divider, Skeleton, Tooltip, Popover
│
└── @ant-design/icons: MoreOutlined, PlusOutlined, EyeOutlined,
                       FolderOutlined, StarFilled, LinkOutlined,
                       CheckOutlined, ShareAltOutlined, WarningOutlined
```

---

## Responsive Behavior

| Breakpoint | Subcategory Grid | Products Table | Media Grid |
| ---------- | ---------------- | -------------- | ---------- |
| >= 1200px  | 4 columns        | Full columns   | 8 columns  |
| 992–1199px | 3 columns        | Full columns   | 6 columns  |
| 768–991px  | 2 columns        | Hide SKU col   | 4 columns  |
| < 768px    | 1 column         | Product + Price| 4 columns  |

---

## Empty States

| Section       | Message                                         | CTA                    |
| ------------- | ----------------------------------------------- | ---------------------- |
| Subcategories | "This is a leaf category with no subcategories" | [+ Create Subcategory] |
| Products      | "No products assigned to this category yet"     | [+ Assign Products]    |
| Media         | grid of `MediaFilePlaceholder` (no text)        | Upload cell            |
| Tags          | "No tags assigned" (inline secondary text)      | [+ Add Tag]            |
| SEO           | `WarningOutlined` + "2 issues" (in header)      | [Edit SEO]             |

---

## Color Semantics

| Color | Token               | Usage                    |
| ----- | ------------------- | ------------------------ |
| Green | `colorSuccess`      | Active, In Stock         |
| Gold  | `colorWarning`      | Draft, Low Stock         |
| Red   | `colorError`        | Archived, Out of Stock, SEO issues |
| Blue  | `colorPrimary`      | Primary actions, links   |
| Gray  | `colorTextTertiary` | Secondary text, disabled |
