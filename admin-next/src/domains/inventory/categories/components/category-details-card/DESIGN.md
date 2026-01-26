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
│  │  [Featured Image]   Title             Status Badge    │  │
│  │                     /electronics/audio                │  │
│  │                     Description excerpt...            │  │
│  │                     Created: Jan 12  ·  Updated: Jan 25│  │
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

### 1. CategoryInfoHeader

| Element             | Component                        | Notes                                   |
| ------------------- | -------------------------------- | --------------------------------------- |
| Featured image      | `Avatar` (80x80)                 | Fallback: category icon                 |
| Title               | `Typography.Title` lv 4          | Editable inline                         |
| Slug                | `Typography.Text` type=secondary | LinkOutlined icon                       |
| Status badge        | `Tag` color-coded                | ACTIVE=green, DRAFT=gold, ARCHIVED=gray |
| Description excerpt | `Typography.Paragraph`           | Ellipsis 2 lines                        |
| Dates               | `Typography.Text`                | Created / Updated                       |
| Actions             | `Dropdown` + `Button`            | Edit, Duplicate, Archive, Delete        |

### 2. HierarchySection

| Element         | Component           | Notes                                                |
| --------------- | ------------------- | ---------------------------------------------------- |
| Breadcrumb      | `Breadcrumb`        | Root -> ... -> Parent -> **Current**                 |
| Parent category | `Tag` + icon        | Clickable, navigates to parent                       |
| Subcategories   | Grid 4-column cards | Each card: featured img, title, productCount, status |
| Add subcategory | `Button` dashed     | Opens create subcategory modal                       |
| Empty state     | `Empty`             | "This is a leaf category with no subcategories"      |

**SubcategoryCard:**

```
┌────────────────┐
│  [Featured]    │
│  Title         │
│  32 products   │
│  Active        │
└────────────────┘
```

`Paper` with hover effect. Click navigates to subcategory detail.

### 3. MediaSection

Reuses the same pattern as product `media-section`: 8-column CSS grid, featured 2x2, preview, upload.

| Feature        | Behavior                                                 |
| -------------- | -------------------------------------------------------- |
| Featured badge | `FeaturedBadge` on first image                           |
| Image hover    | Eye icon -> `useMediaPreview`                            |
| Upload slot    | Last cell dashed placeholder -> `onEditSection("media")` |
| Overflow       | `+N` badge when > 12 images                              |

### 4. ProductsSection

Table of products assigned to this category.

**Columns:**

| #   | Column  | Content            | Width |
| --- | ------- | ------------------ | ----- |
| 1   | Product | Avatar + title     | flex  |
| 2   | SKU     | Monospace text     | 120px |
| 3   | Price   | Formatted currency | 100px |
| 4   | Status  | Dot + label        | 100px |

**Features:**

- Search input in header (client-side filter by title/SKU)
- "Assign Products" button -> opens product picker modal
- Pagination: Previous / Next + `Showing X-Y of Z`
- Sort: By name, price, status
- Empty state: "No products in this category yet"
- Row click -> navigates to product detail

### 5. TagsSection

Same as product `tags-section`:

- `Tag` with `Dropdown` (remove)
- "Add Tag" button -> `useTagPicker()`
- Empty state: "No tags assigned"

### 6. SeoBlock

Same as product `SeoBlock`:

| Field       | Component              | Notes                                            |
| ----------- | ---------------------- | ------------------------------------------------ |
| SEO Title   | `Typography.Text`      | Length indicator (55 char ideal)                 |
| Description | `Typography.Paragraph` | Length indicator (155 char ideal)                |
| URL path    | `Typography.Text` code | Full slug chain: `/categories/electronics/audio` |
| Preview     | Custom SERP card       | Title + URL + description styled as Google       |

---

## State Management

### Hook: `useCategoryModals`

```typescript
function useCategoryModals(category: ICategory) {
  return {
    // Section edit modals
    openEditInfo: () => void;
    openEditMedia: () => void;
    openEditSeo: () => void;

    // Relationship modals
    openProductPicker: () => void;
    openSubcategoryCreate: () => void;
    openParentCategoryPicker: () => void;
    openTagPicker: () => void;

    // Danger zone
    openArchiveConfirm: () => void;
    openDeleteConfirm: () => void;
  };
}
```

---

## Component Dependencies

```
category-details-card.tsx
├── ui-kit/Paper
├── ui-kit/PaperHeader
├── ui-kit/EditAction
├── ui-kit/FeaturedBadge
├── antd/Flex
├── antd/Tag
├── antd/Typography
├── antd/Breadcrumb
├── antd/Avatar
├── antd/Button
├── antd/Dropdown
├── antd/Image
├── antd/Table (ProductsSection)
├── antd/Input.Search (ProductsSection)
├── antd/Empty
├── hooks/useCategoryModals
├── hooks/useMediaPreview
├── hooks/useTagPicker
└── sections/*
```

---

## Responsive Behavior

| Breakpoint | Behavior                                         |
| ---------- | ------------------------------------------------ |
| >= 1200px  | Full layout, 4-col subcategory grid              |
| 992-1199px | 3-col subcategory grid                           |
| 768-991px  | 2-col subcategory grid                           |
| < 768px    | 1-col subcategories, vertical stack all sections |

---

## Empty States

| Section       | Empty Message                                   | Action                 |
| ------------- | ----------------------------------------------- | ---------------------- |
| Subcategories | "This is a leaf category with no subcategories" | [+ Create Subcategory] |
| Products      | "No products assigned to this category yet"     | [+ Assign Products]    |
| Media         | "No images uploaded"                            | [+ Upload]             |
| Tags          | "No tags assigned"                              | [+ Add Tag]            |
| SEO           | "SEO metadata not configured"                   | [Edit SEO]             |

---

## Color Semantics

| Color | Token               | Usage             |
| ----- | ------------------- | ----------------- |
| Green | `colorSuccess`      | Active status     |
| Gold  | `colorWarning`      | Draft status      |
| Red   | `colorError`        | Archived          |
| Blue  | `colorInfo`         | Primary indicator |
| Gray  | `colorTextTertiary` | Disabled          |
