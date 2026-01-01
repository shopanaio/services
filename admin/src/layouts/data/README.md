# DataLayout

Universal layout component for data pages (tables, cards, lists).

## Features

- **Slot-based architecture** - every section can be replaced
- **Quick props** - simple cases with minimal code
- **Compound components** - full control when needed
- **Sticky toolbar/footer** - configurable sticky behavior
- **Loading state** - built-in loading indicator

## Structure

```
┌─────────────────────────────────────────────────────────┐
│  HEADER                                                 │
│  [Title + Badge]                        [Actions slot]  │
├─────────────────────────────────────────────────────────┤
│  TOOLBAR (sticky)                                       │
│  [Left slot]              [Center slot]    [Right slot] │
├─────────────────────────────────────────────────────────┤
│  CONTENT                                                │
│  [children]                                             │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  FOOTER (sticky)                                        │
│  [Left slot]                               [Right slot] │
└─────────────────────────────────────────────────────────┘
```

## Usage

### Minimal

```tsx
import { DataLayout } from '@/layouts/data';

<DataLayout title="Products">
  <ProductTable />
</DataLayout>
```

### With Quick Props

```tsx
<DataLayout
  title="Products"
  count={150}
  actions={<Button type="primary">Add Product</Button>}
  toolbar={<FilterWidget {...filterProps} />}
  footer={<Pagination {...paginationProps} />}
>
  <ProductTable data={products} />
</DataLayout>
```

### With Toolbar Slots

```tsx
<DataLayout
  title="Products"
  count={150}
  actions={<Button type="primary">Add Product</Button>}
  footer={<Pagination {...paginationProps} />}
>
  <DataLayout.Toolbar left={<FilterWidget />} right={<SearchInput />} />
  <ProductTable data={products} />
</DataLayout>
```

### Full Compound Components

```tsx
<DataLayout>
  <DataLayout.Header>
    <Breadcrumb items={breadcrumbs} />
    <DataLayout.HeaderActions>
      <Button>Export</Button>
      <Button>Import</Button>
      <Button type="primary">Create</Button>
    </DataLayout.HeaderActions>
  </DataLayout.Header>

  <DataLayout.Toolbar sticky>
    <DataLayout.ToolbarLeft>
      {selectedRows.length > 0 && <BulkActions rows={selectedRows} />}
      <FilterWidget {...filterProps} />
    </DataLayout.ToolbarLeft>
    <DataLayout.ToolbarRight>
      <SearchInput value={search} onChange={setSearch} />
      <ColumnSelector />
    </DataLayout.ToolbarRight>
  </DataLayout.Toolbar>

  <ProductTable data={products} />

  <DataLayout.Footer left={<Pagination />} right={<RowsPerPage />} />
</DataLayout>
```

### Custom Header

```tsx
<DataLayout toolbar={<Toolbar />} footer={<Pagination />}>
  <DataLayout.Header>
    <Flex justify="space-between" align="center">
      <Flex vertical>
        <Typography.Title level={4}>Products</Typography.Title>
        <Typography.Text type="secondary">
          Manage your product catalog
        </Typography.Text>
      </Flex>
      <Space>
        <Button icon={<DownloadOutlined />}>Export</Button>
        <Button type="primary" icon={<PlusOutlined />}>
          Add Product
        </Button>
      </Space>
    </Flex>
  </DataLayout.Header>

  <ProductTable />
</DataLayout>
```

### Loading State

```tsx
<DataLayout title="Products" loading={isLoading}>
  <ProductTable data={products} />
</DataLayout>
```

## API

### DataLayout Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | **required** | Content (table, cards, etc.) |
| `title` | `ReactNode` | - | Page title |
| `count` | `number` | - | Badge count next to title |
| `actions` | `ReactNode` | - | Action buttons in header |
| `toolbar` | `ReactNode` | - | Toolbar content |
| `footer` | `ReactNode` | - | Footer content |
| `loading` | `boolean` | `false` | Show loading state |
| `stickyToolbar` | `boolean` | `true` | Make toolbar sticky |
| `stickyFooter` | `boolean` | `true` | Make footer sticky |
| `name` | `string` | - | Test ID prefix |
| `className` | `string` | - | Additional CSS class |

### Compound Components

#### `<DataLayout.Header>`

Custom header section.

```tsx
<DataLayout.Header className="my-header">
  {/* any content */}
</DataLayout.Header>
```

#### `<DataLayout.Title>`

Title with optional badge.

```tsx
<DataLayout.Title count={150}>Products</DataLayout.Title>
```

| Prop | Type | Description |
|------|------|-------------|
| `children` | `ReactNode` | Title text |
| `count` | `number` | Badge count |

#### `<DataLayout.HeaderActions>`

Container for header action buttons.

```tsx
<DataLayout.HeaderActions>
  <Button>Export</Button>
  <Button type="primary">Create</Button>
</DataLayout.HeaderActions>
```

#### `<DataLayout.Toolbar>`

Toolbar section with optional slots.

```tsx
// With children
<DataLayout.Toolbar sticky>
  <MyToolbarContent />
</DataLayout.Toolbar>

// With slots
<DataLayout.Toolbar
  left={<Filters />}
  center={<Tabs />}
  right={<Search />}
  sticky
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Full custom content |
| `left` | `ReactNode` | - | Left slot |
| `center` | `ReactNode` | - | Center slot |
| `right` | `ReactNode` | - | Right slot |
| `sticky` | `boolean` | `true` | Sticky position |

#### `<DataLayout.Toolbar.Left>`, `<DataLayout.Toolbar.Center>`, `<DataLayout.Toolbar.Right>`

Slot components for toolbar composition.

```tsx
<DataLayout.Toolbar>
  <DataLayout.ToolbarLeft>
    <Filters />
  </DataLayout.ToolbarLeft>
  <DataLayout.ToolbarRight>
    <Search />
  </DataLayout.ToolbarRight>
</DataLayout.Toolbar>
```

#### `<DataLayout.Content>`

Content wrapper (automatically wraps children).

#### `<DataLayout.Footer>`

Footer section with optional slots.

```tsx
// With children
<DataLayout.Footer sticky>
  <MyFooterContent />
</DataLayout.Footer>

// With slots
<DataLayout.Footer left={<Pagination />} right={<RowsPerPage />} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Full custom content |
| `left` | `ReactNode` | - | Left slot |
| `right` | `ReactNode` | - | Right slot |
| `sticky` | `boolean` | `true` | Sticky position |

## Hooks

### `useDataLayoutContext()`

Access layout context inside children.

```tsx
const { loading } = useDataLayoutContext();
```

## Examples

### Products Page

```tsx
'use client';

import { useState } from 'react';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { DataLayout } from '@/layouts/data';
import { FilterWidget, useFilters } from '@/layouts/filters';
import { useDrawer } from '@/layouts/drawers';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const { filters, widgetProps } = useFilters({ schema: filterSchema });
  const openProduct = useDrawer('product');

  return (
    <DataLayout
      title="Products"
      count={products.length}
      actions={
        <Button type="primary" icon={<PlusOutlined />}>
          Add Product
        </Button>
      }
    >
      <DataLayout.Toolbar
        left={<FilterWidget {...widgetProps} searchProps={{ searchValue: search, onChangeSearchValue: setSearch }} />}
      />

      <ProductTable
        data={products}
        onRowClick={(row) => openProduct({ entityId: row.id })}
      />

      <DataLayout.Footer left={<Pagination page={1} total={100} />} />
    </DataLayout>
  );
}
```

### Orders Page with Bulk Actions

```tsx
'use client';

import { useState } from 'react';
import { DataLayout } from '@/layouts/data';
import { BulkActions } from '@/components/BulkActions';

export default function OrdersPage() {
  const [selectedRows, setSelectedRows] = useState([]);

  return (
    <DataLayout title="Orders" count={orders.length}>
      <DataLayout.Toolbar
        left={
          <>
            {selectedRows.length > 0 && (
              <BulkActions
                count={selectedRows.length}
                onDelete={() => handleDelete(selectedRows)}
                onArchive={() => handleArchive(selectedRows)}
              />
            )}
            <FilterWidget {...filterProps} />
          </>
        }
        right={<SearchInput />}
      />

      <OrdersTable
        data={orders}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
      />

      <DataLayout.Footer left={<Pagination />} />
    </DataLayout>
  );
}
```
