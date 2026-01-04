'use client';

import dynamic from 'next/dynamic';
import type { IModalStackDefinition } from '@/layouts/modals/types';

/**
 * All modal stack definitions for the application.
 * This file is imported on the client side for modal stack registration.
 */
export function getModalStackDefinitions(): IModalStackDefinition[] {
  return [
    // Product modal
    {
      type: 'product',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/ProductModal').then(
          (m) => m.ProductModal
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
    // AI Writer modal
    {
      type: 'product-ai-writer',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/AIWriterModal').then(
          (m) => m.AIWriterModal
        )
      ),
    },
    // Price History modal
    {
      type: 'product-price-history',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/PriceHistoryModal').then(
          (m) => m.PriceHistoryModal
        )
      ),
    },
    // Edit Variant Pricing modal
    {
      type: 'product-edit-variant-pricing',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/EditVariantPricingModal').then(
          (m) => m.EditVariantPricingModal
        )
      ),
    },
    // Edit Variant Inventory modal
    {
      type: 'product-edit-variant-inventory',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/EditVariantInventoryModal').then(
          (m) => m.EditVariantInventoryModal
        )
      ),
    },
    // Edit Media modal
    {
      type: 'product-edit-media',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/EditMediaModal').then(
          (m) => m.EditMediaModal
        )
      ),
    },
  ];
}
