'use client';

import dynamic from 'next/dynamic';
import type { IDrawerDefinition } from '@/layouts/drawers/types';

/**
 * All drawer definitions for the application.
 * This file is imported on the client side for drawer registration.
 */
export function getDrawerDefinitions(): IDrawerDefinition[] {
  return [
    // Inventory - Products
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
    // Inventory - Categories
    {
      type: 'category',
      component: dynamic(() =>
        import('@/domains/inventory/categories/drawers/CategoryDrawer').then(
          (m) => m.CategoryDrawer
        )
      ),
      width: 'calc(100vw - 100px)',
      confirmOnDirtyClose: true,
    },
  ];
}
