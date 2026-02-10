# Universal Filter System

A universal filtering system that is API-agnostic. Supports pluggable adapters for converting filters to any format.

## Table of Contents

- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Core API](#core-api)
  - [FilterType](#filtertype)
  - [FilterOperator](#filteroperator)
  - [IFilterSchema](#ifilterschema)
  - [IFilterValue](#ifiltervalue)
  - [IFilterAdapter](#ifilteradapter)
- [Components](#components)
  - [FilterWidget](#filterwidget)
  - [FilterValueControl](#filtervaluecontrol)
  - [RelationControl](#relationcontrol)
- [Hooks](#hooks)
  - [useFilters](#usefilters)
  - [useFilterState](#usefilterstate)
- [Operators](#operators)
- [Creating an Adapter](#creating-an-adapter)
- [Registering RelationControl](#registering-relationcontrol)
- [Examples](#examples)
- [Roadmap](#roadmap)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer (React)                         │
│  FilterWidget → filter selection → IFilterValue[]          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Core (pure functions)                    │
│  IFilterValue[] — unified filter state format              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Adapter (project-specific)                     │
│  IFilterAdapter → converts to your API format              │
└─────────────────────────────────────────────────────────────┘
```

### Principles

1. **API Independence** — the core knows nothing about your backend format
2. **Pluggable Adapters** — each project implements its own adapter
3. **Declarative Schema** — filters are described via configuration
4. **Type-safe** — full TypeScript typing

---

## Quick Start

### 1. Define the filter schema

```tsx
import {
  type IFilterSchema,
  FilterType,
  numberOperators,
  stringOperators,
  enumOperators,
} from '@/layouts/filters';

const productFilterSchema: IFilterSchema[] = [
  {
    key: 'status',
    label: 'Status',
    description: 'Filter by product status',
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: 'status',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Draft', value: 'draft' },
    ],
  },
  {
    key: 'price',
    label: 'Price',
    description: 'Filter by price',
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: 'variants.price',
  },
  {
    key: 'name',
    label: 'Name',
    description: 'Filter by product name',
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: 'title',
  },
];
```

### 2. Use the useFilters hook

```tsx
import { useFilters, FilterWidget } from '@/layouts/filters';

function ProductsPage() {
  const [searchValue, setSearchValue] = useState('');
  const { filters, widgetProps } = useFilters({
    schema: productFilterSchema,
  });

  return (
    <FilterWidget
      {...widgetProps}
      searchProps={{
        searchValue,
        onChangeSearchValue: setSearchValue,
      }}
    />
  );
}
```

### 3. (Optional) Create an adapter for your API

```tsx
import { type IFilterAdapter, useFilters } from '@/layouts/filters';

const graphqlAdapter: IFilterAdapter = {
  name: 'graphql',
  convert: (filter, schema) => {
    // Convert filter to GraphQL format
    return {
      [filter.payloadKey]: {
        [filter.operator]: filter.value,
      },
    };
  },
  combine: (filters, logic) => {
    return { [logic]: filters };
  },
  build: (combined) => combined,
};

// Usage
const { payload } = useFilters({
  schema: productFilterSchema,
  adapter: graphqlAdapter,
});

// payload is ready for GraphQL query
const { data } = useQuery(GET_PRODUCTS, {
  variables: { where: payload },
});
```

---

## Core API

### FilterType

Filter types that determine which control will be used.

```typescript
enum FilterType {
  String = 'String',           // Text input
  Number = 'Number',           // Numeric input
  Integer = 'Integer',         // Integer input
  Date = 'Date',               // Date picker
  DateRange = 'DateRange',     // Date range picker
  Boolean = 'Boolean',         // Yes/No
  Enum = 'Enum',               // Select from list
  Relation = 'Relation',       // Relation to another entity
  Price = 'Price',             // Price (numeric)
  Weight = 'Weight',           // Weight (numeric)
  Translatable = 'Translatable', // Translatable field
  Locale = 'Locale',           // Locale selector
}
```

### FilterOperator

Comparison operators.

```typescript
enum FilterOperator {
  Eq = 'Eq',           // =    Equal to
  NotEq = 'NotEq',     // !=   Not equal to
  Gt = 'Gt',           // >    Greater than
  Gte = 'Gte',         // >=   Greater than or equal to
  Lt = 'Lt',           // <    Less than
  Lte = 'Lte',         // <=   Less than or equal to
  In = 'In',           // in   One of
  NotIn = 'NotIn',     // not in   Not one of
  Like = 'Like',       // matches   Contains
  NotLike = 'NotLike', // not matches   Does not contain
  ILike = 'ILike',     // matches (case-insensitive)
  NotILike = 'NotILike',
  Is = 'Is',           // is
  IsNot = 'IsNot',     // is not
  Between = 'Between', // <>   Between
}
```

### IFilterSchema

Filter schema (configuration). Defines available filters for an entity.

```typescript
interface IFilterSchema {
  /** Unique filter key */
  key: string;

  /** Display label */
  label: React.ReactNode | string;

  /** Filter type */
  type: FilterType;

  /** Available operators */
  operators: FilterOperator[];

  /** Key for API payload (can be nested: 'variants.price') */
  payloadKey: string;

  /** Description (shown in UI) */
  description?: React.ReactNode | string;

  /** For Relation type — entity identifier */
  entity?: string;

  /** For Enum type — available options */
  options?: IFilterOption[];

  /** Nested filters (for relations) */
  children?: IFilterSchema[];

  /** Cannot be removed (fixed filter) */
  fixed?: boolean;
}
```

### IFilterValue

Active filter value (state).

```typescript
interface IFilterValue {
  /** Reference to schema key */
  schemaKey: string;

  /** Display label */
  label: string;

  /** Filter type */
  type: FilterType;

  /** Selected operator */
  operator: FilterOperator;

  /** Filter value */
  value: unknown;

  /** Path to filter (for nested) */
  keyPath: string[];

  /** Key for API payload */
  payloadKey: string;

  /** Entity (for Relation) */
  entity?: string;

  /** Cannot be removed */
  fixed?: boolean;
}
```

### IFilterAdapter

Adapter interface for converting filters to API format.

```typescript
interface IFilterAdapter<TOutput = unknown> {
  /** Adapter name (for debugging) */
  name: string;

  /**
   * Convert a single filter
   * @param filter - Filter value
   * @param schema - Filter schema (can be null)
   * @returns Converted value or null
   */
  convert(filter: IFilterValue, schema: IFilterSchema | null): TOutput | null;

  /**
   * Combine multiple filters
   * @param filters - Array of converted filters
   * @param logic - Combination logic ('AND' | 'OR')
   */
  combine(filters: TOutput[], logic: 'AND' | 'OR'): TOutput;

  /**
   * Build final payload
   * @param combined - Combined filters
   */
  build(combined: TOutput): unknown;
}
```

---

## Components

### FilterWidget

Main UI component for selecting and managing filters.

```tsx
import { FilterWidget } from '@/layouts/filters';

<FilterWidget
  // Available filters (schema)
  options={filterSchema}

  // Current active filters
  value={filters}

  // Change callback
  onChange={setFilters}

  // Search props (optional)
  searchProps={{
    searchValue: '',
    onChangeSearchValue: (value) => {},
  }}

  // Search placeholder
  searchPlaceholder="Type to search..."

  // Filter button text
  filterButtonLabel="Filter"
/>
```

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `IFilterSchema[]` | Yes | Schema of available filters |
| `value` | `IFilterValue[]` | Yes | Current active filters |
| `onChange` | `(value: IFilterValue[]) => void` | Yes | Change callback |
| `searchProps` | `IFilterWidgetSearchProps` | No | Props for search field |
| `searchPlaceholder` | `string` | No | Search placeholder |
| `filterButtonLabel` | `string` | No | "Filter" button text |

### FilterValueControl

Control for entering filter value. Automatically selected based on type.

```tsx
import { FilterValueControl } from '@/layouts/filters';

<FilterValueControl
  schema={filterSchema}
  value={filterValue}
  onChange={(newValue) => {}}
/>
```

| FilterType | Component |
|------------|-----------|
| `String`, `Translatable` | `Input` |
| `Number`, `Price`, `Weight`, `Integer` | `InputNumber` |
| `Date` | `DatePicker` |
| `DateRange`, `Date` + `Between` | `DatePicker.RangePicker` |
| `Boolean` | `Select` (True/False) |
| `Enum` | `Select` with options |
| `Relation` | `RelationControl` (from registry) |

### RelationControl

Dynamic control for relations. Uses registry to get the component.

```tsx
import { RelationControl } from '@/layouts/filters';

<RelationControl
  entity="Category"
  value={selectedCategories}
  onChange={(value) => {}}
  isMultiple={true}
  variant="borderless"
/>
```

---

## Hooks

### useFilters

Main hook for managing filter state.

```tsx
import { useFilters } from '@/layouts/filters';

const {
  // Current filters
  filters,

  // Set filters directly
  setFilters,

  // Add a filter
  addFilter,

  // Remove filter by index
  removeFilter,

  // Update filter by index
  updateFilter,

  // Reset all filters
  reset,

  // Props for FilterWidget
  widgetProps,

  // Payload from adapter (if provided)
  payload,
} = useFilters({
  // Filter schema (required)
  schema: filterSchema,

  // Initial filters (optional)
  initialFilters: [],

  // API adapter (optional)
  adapter: myAdapter,

  // Change callback (optional)
  onChange: (filters) => {},
});
```

#### Return Values

| Field | Type | Description |
|-------|------|-------------|
| `filters` | `IFilterValue[]` | Current active filters |
| `setFilters` | `(filters: IFilterValue[]) => void` | Set filters |
| `addFilter` | `(filter: IFilterValue) => void` | Add a filter |
| `removeFilter` | `(index: number) => void` | Remove by index |
| `updateFilter` | `(index: number, updates: Partial<IFilterValue>) => void` | Update |
| `reset` | `() => void` | Reset to initialFilters |
| `widgetProps` | `{ options, value, onChange }` | Props for FilterWidget |
| `payload` | `TPayload \| null` | Adapter result |

### useFilterState

Simplified version without adapter.

```tsx
import { useFilterState } from '@/layouts/filters';

const filterState = useFilterState(filterSchema);
```

---

## Operators

### Operator Presets

```typescript
import {
  numberOperators,      // Eq, Gt, Gte, Lt, Lte
  stringOperators,      // ILike
  dateOperators,        // Between
  enumOperators,        // In
  booleanOperators,     // Is, IsNot
  relationOperators,    // In
  priceOperators,       // = numberOperators
  translatableOperators, // = stringOperators
  localeOperators,      // Is
} from '@/layouts/filters';
```

### Operator Metadata

```typescript
import { operatorsMeta, getOperatorMeta } from '@/layouts/filters';

// Get operator metadata
const meta = getOperatorMeta(FilterOperator.Gte);
// { value: 'Gte', literal: '>=', label: 'Is greater than or equal to' }

// All metadata
operatorsMeta[FilterOperator.In];
// { value: 'In', literal: 'in', label: 'Is one of' }
```

### Utilities

```typescript
import { isMultipleValueOperator, isRangeOperator } from '@/layouts/filters';

isMultipleValueOperator(FilterOperator.In);      // true
isMultipleValueOperator(FilterOperator.Eq);      // false

isRangeOperator(FilterOperator.Between);         // true
isRangeOperator(FilterOperator.Gte);             // false
```

---

## Creating an Adapter

### GraphQL Adapter

```typescript
import { IFilterAdapter, IFilterValue, IFilterSchema, FilterOperator } from '@/layouts/filters';

type WhereInput = Record<string, unknown>;

export const graphqlAdapter: IFilterAdapter<WhereInput> = {
  name: 'graphql',

  convert(filter: IFilterValue, schema: IFilterSchema | null): WhereInput | null {
    if (!filter.value || (Array.isArray(filter.value) && !filter.value.length)) {
      return null;
    }

    // Handle nested keys (variants.price → { variants: { price: ... } })
    const keyPath = filter.payloadKey.split('.');
    const operatorValue = { [filter.operator]: filter.value };

    return keyPath.reduceRight(
      (acc, key) => ({ [key]: acc }),
      operatorValue as WhereInput
    );
  },

  combine(filters: WhereInput[], logic: 'AND' | 'OR'): WhereInput {
    if (filters.length === 0) return {};
    if (filters.length === 1) return filters[0];
    return { [logic]: filters };
  },

  build(combined: WhereInput): WhereInput {
    return combined;
  },
};
```

### REST Adapter

```typescript
import { IFilterAdapter, IFilterValue, FilterOperator } from '@/layouts/filters';

type QueryParams = Record<string, string>;

export const restAdapter: IFilterAdapter<QueryParams> = {
  name: 'rest',

  convert(filter: IFilterValue): QueryParams | null {
    if (!filter.value || (Array.isArray(filter.value) && !filter.value.length)) {
      return null;
    }

    const key = filter.payloadKey.replace(/\./g, '_');
    const op = filter.operator.toLowerCase();
    const value = Array.isArray(filter.value)
      ? filter.value.join(',')
      : String(filter.value);

    // price_gte=100
    return { [`${key}_${op}`]: value };
  },

  combine(filters: QueryParams[]): QueryParams {
    return filters.reduce((acc, f) => ({ ...acc, ...f }), {});
  },

  build(combined: QueryParams): string {
    return new URLSearchParams(combined).toString();
  },
};
```

### Client-side Adapter

```typescript
import { IFilterAdapter, IFilterValue, FilterOperator } from '@/layouts/filters';

type Predicate<T> = (item: T) => boolean;

export function createClientAdapter<T extends Record<string, unknown>>(): IFilterAdapter<Predicate<T>> {
  return {
    name: 'client',

    convert(filter: IFilterValue): Predicate<T> | null {
      if (!filter.value || (Array.isArray(filter.value) && !filter.value.length)) {
        return null;
      }

      return (item: T) => {
        const itemValue = getNestedValue(item, filter.payloadKey);
        const filterValue = filter.value;

        switch (filter.operator) {
          case FilterOperator.Eq:
            return itemValue === (filterValue as unknown[])[0];
          case FilterOperator.In:
            return (filterValue as unknown[]).includes(itemValue);
          case FilterOperator.Gte:
            return (itemValue as number) >= (filterValue as number[])[0];
          case FilterOperator.ILike:
            return String(itemValue)
              .toLowerCase()
              .includes(String((filterValue as unknown[])[0]).toLowerCase());
          default:
            return true;
        }
      };
    },

    combine(predicates: Predicate<T>[], logic: 'AND' | 'OR'): Predicate<T> {
      if (logic === 'AND') {
        return (item) => predicates.every((p) => p(item));
      }
      return (item) => predicates.some((p) => p(item));
    },

    build(combined: Predicate<T>): Predicate<T> {
      return combined;
    },
  };
}

// Usage
const clientAdapter = createClientAdapter<IProduct>();
const { payload: predicate } = useFilters({ schema, adapter: clientAdapter });
const filtered = products.filter(predicate);
```

---

## Registering RelationControl

For `Relation` type, you need to register an entity selection component.

### Registration

```typescript
// In your app initialization or module file
import { relationControlRegistry } from '@/layouts/filters';
import { CategorySelect } from '@/modules/categories/components/CategorySelect';
import { TagSelect } from '@/modules/tags/components/TagSelect';

// Register components
relationControlRegistry.register('Category', CategorySelect);
relationControlRegistry.register('Tag', TagSelect);
```

### Component Requirements

```typescript
import { IRelationControlProps } from '@/layouts/filters';

// Component must match the interface
interface IRelationControlProps {
  value: unknown;
  onChange: (value: unknown) => void;
  isMultiple: boolean;
  entity: string;
  status?: 'error';
  variant?: 'outlined' | 'borderless' | 'filled';
}

// Example implementation
const CategorySelect: React.FC<IRelationControlProps> = ({
  value,
  onChange,
  isMultiple,
  variant,
}) => {
  return (
    <Select
      mode={isMultiple ? 'multiple' : undefined}
      value={value}
      onChange={onChange}
      variant={variant}
      options={categories}
      style={{ minWidth: 150 }}
    />
  );
};
```

### Registry API

```typescript
// Register
relationControlRegistry.register(entity: string, component: RelationControlComponent);

// Unregister
relationControlRegistry.unregister(entity: string);

// Check
relationControlRegistry.has(entity: string): boolean;

// Get
relationControlRegistry.get(entity: string): RelationControlComponent | undefined;

// List registered entities
relationControlRegistry.getRegisteredEntities(): string[];

// Clear all
relationControlRegistry.clear();
```

---

## Examples

### Full Page Example

```tsx
'use client';

import { useState, useMemo } from 'react';
import {
  useFilters,
  FilterWidget,
  FilterType,
  FilterOperator,
  numberOperators,
  stringOperators,
  enumOperators,
  type IFilterSchema,
  type IFilterValue,
} from '@/layouts/filters';

// Filter schema
const productFilterSchema: IFilterSchema[] = [
  {
    key: 'status',
    label: 'Status',
    description: 'Filter by product status',
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: 'status',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Draft', value: 'draft' },
      { label: 'Archived', value: 'archived' },
    ],
  },
  {
    key: 'price',
    label: 'Price',
    description: 'Filter by price',
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: 'price',
  },
  {
    key: 'name',
    label: 'Name',
    description: 'Filter by product name',
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: 'name',
  },
  {
    key: 'category',
    label: 'Category',
    description: 'Filter by category',
    type: FilterType.Relation,
    operators: [FilterOperator.In],
    payloadKey: 'categoryId',
    entity: 'Category',
  },
];

// Client-side filtering
function applyFilters<T extends Record<string, unknown>>(
  data: T[],
  filters: IFilterValue[],
): T[] {
  return data.filter((item) =>
    filters.every((filter) => {
      const value = item[filter.payloadKey as keyof T];
      const filterValue = filter.value as unknown[];

      if (!filterValue?.length) return true;

      switch (filter.operator) {
        case FilterOperator.In:
          return filterValue.includes(value);
        case FilterOperator.Gte:
          return (value as number) >= (filterValue[0] as number);
        case FilterOperator.ILike:
          return String(value)
            .toLowerCase()
            .includes(String(filterValue[0]).toLowerCase());
        default:
          return true;
      }
    }),
  );
}

export default function ProductsPage() {
  const [searchValue, setSearchValue] = useState('');
  const { filters, widgetProps } = useFilters({
    schema: productFilterSchema,
  });

  const filteredProducts = useMemo(() => {
    let result = products;

    // Search
    if (searchValue) {
      const search = searchValue.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(search),
      );
    }

    // Filters
    return applyFilters(result, filters);
  }, [searchValue, filters]);

  return (
    <div>
      <FilterWidget
        {...widgetProps}
        searchProps={{
          searchValue,
          onChangeSearchValue: setSearchValue,
        }}
      />
      <ProductTable data={filteredProducts} />
    </div>
  );
}
```

### GraphQL Example

```tsx
import { useFilters } from '@/layouts/filters';
import { graphqlAdapter } from '@/adapters/graphql';
import { useQuery } from '@apollo/client';

function ProductsPage() {
  const { widgetProps, payload } = useFilters({
    schema: productFilterSchema,
    adapter: graphqlAdapter,
  });

  const { data, loading } = useQuery(GET_PRODUCTS, {
    variables: {
      where: payload || {},
    },
  });

  return (
    <>
      <FilterWidget {...widgetProps} />
      <ProductTable data={data?.products} loading={loading} />
    </>
  );
}
```

### Nested Filters (Relations)

```tsx
const orderFilterSchema: IFilterSchema[] = [
  {
    key: 'customer',
    label: 'Customer',
    type: FilterType.Relation,
    operators: [FilterOperator.In],
    payloadKey: 'customerId',
    entity: 'Customer',
    // Nested filters for the related entity
    children: [
      {
        key: 'email',
        label: 'Email',
        type: FilterType.String,
        operators: stringOperators,
        payloadKey: 'customer.email',
      },
      {
        key: 'country',
        label: 'Country',
        type: FilterType.Enum,
        operators: enumOperators,
        payloadKey: 'customer.country',
        options: countries,
      },
    ],
  },
];
```

---

## Migration from UiFilter

If you're using the old `UiFilter` system, here's the type mapping:

| Old | New |
|-----|-----|
| `UiFilter.UiFilterType.String` | `FilterType.String` |
| `UiFilter.UiFilterType.Number` | `FilterType.Number` |
| `UiFilter.UiFilterType.IsConstant` | `FilterType.Enum` |
| `UiFilter.UiFilterType.Date` | `FilterType.Date` |
| `UiFilter.UiFilterType.Relation` | `FilterType.Relation` |
| `UiFilter.UiFilterType.Price` | `FilterType.Price` |
| `UiFilter.UiFilterOperator.*` | `FilterOperator.*` |
| `UiFilter.uiNumberFilterOperators` | `numberOperators` |
| `UiFilter.uiStringFilterOperators` | `stringOperators` |
| `useUiFilters` | `useFilters` |
| `UiFilterWidget` | `FilterWidget` |

---

## File Structure

```
src/layouts/filters/
├── core/
│   ├── types.ts          # Types: IFilterSchema, IFilterValue, IFilterAdapter
│   ├── operators.ts      # Operator metadata
│   ├── constants.ts      # Presets: numberOperators, stringOperators, etc.
│   └── index.ts
│
├── components/
│   ├── FilterWidget/
│   │   ├── FilterWidget.tsx
│   │   ├── FilterValueControl.tsx
│   │   ├── styles.ts
│   │   └── index.ts
│   ├── RelationControl/
│   │   ├── RelationControl.tsx
│   │   ├── registry.ts
│   │   └── index.ts
│   └── index.ts
│
├── hooks/
│   ├── useFilters.ts
│   └── index.ts
│
├── utils/
│   ├── findFilter.ts
│   └── index.ts
│
├── index.ts              # Public API
└── README.md
```

---

## Roadmap

### High Priority

- [ ] **Replace `document.querySelector` with React refs** — `FilterWidget.tsx` uses direct DOM queries which breaks with multiple widgets on page
- [ ] **Add URL serialization** — Functions to save/restore filters from URL query params
- [ ] **Add i18n support** — Extract hardcoded labels (`'Is equal to'`, `'True'`, etc.) to translation keys

### Medium Priority

- [ ] **Add filter validation** — Built-in validation for filter values before applying
- [ ] **Add debounce for text inputs** — Prevent excessive re-renders on typing in `FilterValueControl`
- [ ] **Fix boolean value handling** — Remove string conversion in boolean filters (`FilterValueControl.tsx:175`)
- [ ] **Reuse `findFilter` in `useFilters`** — Remove duplicated `findSchema` logic in hook

### Low Priority

- [ ] **Improve type safety for `IFilterOption`** — Use generics for value type instead of `unknown`
- [ ] **Remove empty menu prop** — Clean up unused `menu={{ items: [] }}` in `FilterWidget.tsx`
- [ ] **Extract z-index to CSS variables** — Move hardcoded `z-index: 9` to design tokens
- [ ] **Fix input trim behavior** — Only trim on blur/submit, not on every change
- [ ] **Consider registry isolation** — Evaluate singleton pattern for SSR/testing scenarios
