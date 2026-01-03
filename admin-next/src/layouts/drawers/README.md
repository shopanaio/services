# Drawers Module

A powerful, type-safe drawer management system for React/Next.js applications. This module provides a registry-based architecture that allows domains to register their own drawers while maintaining full TypeScript support.

## Features

- **Registry Pattern**: Register drawers from any domain
- **Type-Safe**: Full TypeScript support with module augmentation for payload types
- **Nested Drawers**: Support for stacked/nested drawers with proper lifecycle management
- **Dirty State Handling**: Built-in confirmation dialogs for unsaved changes
- **Lazy Loading**: Support for `next/dynamic` for code splitting
- **SSR Compatible**: Client-side registration that works with Next.js App Router

## Architecture

```
layouts/drawers/
├── registry/
│   └── drawerRegistry.ts    # Global drawer registry
├── store/
│   └── drawers.ts           # Zustand store for drawer state
├── hooks/
│   ├── useDrawer.ts         # Hook to open drawers
│   └── useDrawerContext.ts  # Hook to access drawer context
├── components/
│   ├── Drawers.tsx              # Root component (place once in layout)
│   ├── Drawer.tsx               # Individual drawer wrapper
│   ├── DrawersRegistration.tsx  # Client-side registration component
│   └── Provider.tsx             # Context provider
├── context/
│   └── context.tsx          # React context definitions
├── types.ts                 # Type definitions
└── index.ts                 # Public exports

domains/
└── drawers.tsx              # Centralized drawer definitions
```

## Quick Start

### 1. Configure createLayout with getDrawers

```tsx
// app/[[...slug]]/layout.tsx
import { createLayout } from "@/registry";
import { AppLayout } from "@/layouts/app/components/Layout/Layout";
import { getDrawerDefinitions } from "@/domains/drawers";

const { Layout: ModuleLayout } = createLayout({
  modulesContext: require.context("../../domains", true, /(register|domain)\.tsx?$/),
  getDrawers: getDrawerDefinitions,  // ← Drawer registration
});

export default function Layout({ children }) {
  return (
    <ModuleLayout>
      <AppLayout>{children}</AppLayout>
    </ModuleLayout>
  );
}
```

### 2. Add `<Drawers />` to your app layout

```tsx
// layouts/app/components/Layout/Layout.tsx
'use client';

import { Drawers } from '@/layouts/drawers';

export const AppLayout = ({ children }) => {
  return (
    <Layout>
      {children}
      <Drawers />
    </Layout>
  );
};
```

### 3. Create drawer definitions file

```tsx
// domains/drawers.tsx
'use client';

import dynamic from 'next/dynamic';
import type { IDrawerDefinition } from '@/layouts/drawers/types';

export function getDrawerDefinitions(): IDrawerDefinition[] {
  return [
    {
      type: 'product',
      component: dynamic(() =>
        import('@/domains/inventory/products/drawers/ProductDrawer').then(
          (m) => m.ProductDrawer
        )
      ),
      width: 'calc(100vw - 100px)',
      confirmOnDirtyClose: true,
    },
    {
      type: 'category',
      component: dynamic(() =>
        import('@/domains/inventory/categories/drawers/CategoryDrawer').then(
          (m) => m.CategoryDrawer
        )
      ),
    },
  ];
}
```

### 4. Create a drawer component in your domain

```tsx
// domains/products/drawers/ProductDrawer.tsx
'use client';

import { useDrawerContext } from '@/layouts/drawers';
import type { ProductDrawerPayload } from './types';

export const ProductDrawer = () => {
  const { payload, close, setDirty } = useDrawerContext<ProductDrawerPayload>();

  return (
    <div>
      <h1>Product: {payload.entityId}</h1>
      <button onClick={close}>Close</button>
    </div>
  );
};
```

### 5. Define payload types with module augmentation

```tsx
// domains/products/drawers/types.ts
import type { IDrawerPayload } from '@/layouts/drawers';

export interface ProductDrawerPayload extends IDrawerPayload {
  entityId: string;
  mode?: 'view' | 'edit';
}

// Module augmentation for type-safe access
declare module '@/layouts/drawers' {
  interface DrawerPayloads {
    product: ProductDrawerPayload;
  }
}
```

### 6. Use the drawer

```tsx
// Any client component
'use client';

import { useDrawer } from '@/layouts/drawers';
import '../drawers/types'; // Import for type augmentation

function ProductList() {
  const openProduct = useDrawer('product');

  const handleClick = (id: string) => {
    // Fully typed! TypeScript knows payload shape
    openProduct({ entityId: id, mode: 'view' });
  };

  return <button onClick={() => handleClick('123')}>Open Product</button>;
}
```

## API Reference

### Components

#### `<Drawers />`

Root component that renders all open drawers. Place once in your app layout.

#### `<DrawersRegistration getDrawers={fn} />`

Client-side registration component. Must be placed in a client component layout.

```tsx
<DrawersRegistration getDrawers={() => [
  { type: 'product', component: ProductDrawer },
]} />
```

### Hooks

#### `useDrawer(type)`

Returns a function to open a drawer of the specified type.

```tsx
const openProduct = useDrawer('product');
const uuid = openProduct({ entityId: '123' }); // Returns drawer UUID
```

#### `useDrawerContext<T>()`

Access the current drawer's context inside a drawer component.

```tsx
const {
  uuid,           // Unique drawer instance ID
  type,           // Drawer type
  payload,        // Typed payload data
  isDirty,        // Whether drawer has unsaved changes
  close,          // Close with confirmation if dirty
  forceClose,     // Close without confirmation
  setDirty,       // Mark drawer as dirty/clean
  updatePayload,  // Update payload data
} = useDrawerContext<ProductDrawerPayload>();
```

#### `useDrawerActions()`

Get all drawer actions without specifying a type.

```tsx
const { open, close, closeTop, closeAll } = useDrawerActions();

open('product', { entityId: '123' });
closeTop();    // Close topmost drawer
closeAll();    // Close all drawers
```

### Drawer Definition

```tsx
interface IDrawerDefinition {
  type: string;                    // Unique drawer type identifier
  component: ComponentType;         // React component or dynamic import
  width?: number | string;         // Drawer width (default: 'calc(100vw - 100px)')
  confirmOnDirtyClose?: boolean;   // Show confirmation when dirty (default: true)
  closeConfirmMessage?: string;    // Custom confirmation message
}
```

### Types

```tsx
interface IDrawerPayload {
  entityId?: string | number;
  mode?: 'view' | 'edit' | 'create';
  [key: string]: unknown;
}

interface IDrawerContext<T> {
  uuid: string;
  type: string;
  payload: T;
  isDirty: boolean;
  close: () => void;
  forceClose: () => void;
  setDirty: (dirty: boolean) => void;
  updatePayload: (payload: Partial<T>) => void;
}
```

## Patterns

### Domain-based Organization

```
domains/
├── drawers.tsx                # Centralized drawer definitions
├── products/
│   └── drawers/
│       ├── types.ts           # Payload types + module augmentation
│       └── ProductDrawer.tsx  # Drawer component
├── orders/
│   └── drawers/
│       ├── types.ts
│       └── OrderDrawer.tsx
```

### Opening Nested Drawers

```tsx
// Inside ProductDrawer
const openCategory = useDrawer('category');

const handleCategoryClick = () => {
  // Opens category drawer stacked on top of product drawer
  openCategory({ entityId: product.categoryId });
};
```

### Handling Dirty State

```tsx
const { setDirty, close } = useDrawerContext();

// Mark as dirty when form changes
const handleFormChange = () => {
  setDirty(true);
};

// User will see confirmation dialog when trying to close
<button onClick={close}>Close</button>
```

### Create Mode

```tsx
// types.ts
export interface ProductCreatePayload extends IDrawerPayload {
  mode: 'create';
  categoryId?: string;
  duplicateFromId?: string;
}

declare module '@/layouts/drawers' {
  interface DrawerPayloads {
    'product-create': ProductCreatePayload;
  }
}

// Usage
const openCreate = useDrawer('product-create');
openCreate({ mode: 'create', categoryId: 'electronics' });
```

## Adding a New Drawer

1. **Create the drawer component** in your domain:
   ```
   domains/mymodule/drawers/MyDrawer.tsx
   ```

2. **Define payload types** with module augmentation:
   ```
   domains/mymodule/drawers/types.ts
   ```

3. **Add to drawer definitions**:
   ```tsx
   // domains/drawers.tsx
   {
     type: 'my-drawer',
     component: dynamic(() =>
       import('@/domains/mymodule/drawers/MyDrawer').then(m => m.MyDrawer)
     ),
   }
   ```

4. **Import types where needed** and use `useDrawer('my-drawer')`

## Best Practices

1. **Always use module augmentation** for type safety
2. **Use `next/dynamic`** for lazy loading drawer components
3. **Keep drawer components in their domain** folder
4. **Centralize definitions** in `domains/drawers.tsx`
5. **Use meaningful type names** that reflect the entity and action (e.g., `product`, `product-create`, `product-bulk-edit`)
6. **Import type files** where you use `useDrawer()` for proper TypeScript inference
