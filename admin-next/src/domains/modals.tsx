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
    // Edit title modal
    {
      type: 'product-edit-title',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/EditTitleModal').then(
          (m) => m.EditTitleModal
        )
      ),
    },
    // Edit description modal
    {
      type: 'product-edit-description',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/EditDescriptionModal').then(
          (m) => m.EditDescriptionModal
        )
      ),
    },
  ];
}
