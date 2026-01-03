'use client';

import dynamic from 'next/dynamic';
import type { IModalDefinition } from '@/layouts/modals/types';

/**
 * All modal definitions for the application.
 * This file is imported on the client side for modal registration.
 */
export function getModalDefinitions(): IModalDefinition[] {
  return [
    // Test modal
    {
      type: 'product-test',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/TestModal').then(
          (m) => m.TestModal
        )
      ),
    },
  ];
}
