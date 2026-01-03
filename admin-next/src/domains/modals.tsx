'use client';

import dynamic from 'next/dynamic';
import type { IModalStackDefinition } from '@/layouts/modals/types';

/**
 * All modal stack definitions for the application.
 * This file is imported on the client side for modal stack registration.
 */
export function getModalStackDefinitions(): IModalStackDefinition[] {
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
