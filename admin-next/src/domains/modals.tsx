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
    // Edit Media modal
    {
      type: 'product-edit-media',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/EditMediaModal').then(
          (m) => m.EditMediaModal
        )
      ),
    },
    // Edit Options modal
    {
      type: 'product-edit-options',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/EditOptionsModal').then(
          (m) => m.EditOptionsModal
        )
      ),
    },
    // Edit Attributes modal
    {
      type: 'product-edit-attributes',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/EditAttributesModal').then(
          (m) => m.EditAttributesModal
        )
      ),
    },
    // Edit SEO modal
    {
      type: 'product-edit-seo',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/EditSeoModal').then(
          (m) => m.EditSeoModal
        )
      ),
    },
    // Edit Variants modal (unified with tabs)
    {
      type: 'product-edit-variants',
      component: dynamic(() =>
        import('@/domains/inventory/products/components/variants/EditVariantsModal').then(
          (m) => m.EditVariantsModal
        )
      ),
    },
    // Edit Categories modal
    {
      type: 'product-edit-categories',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/EditCategoriesModal').then(
          (m) => m.EditCategoriesModal
        )
      ),
    },
    // Edit Tags modal
    {
      type: 'product-edit-tags',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/EditTagsModal').then(
          (m) => m.EditTagsModal
        )
      ),
    },
    // Edit Components modal (bundle configurator)
    {
      type: 'product-edit-components',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/EditComponentsModal').then(
          (m) => m.EditComponentsModal
        )
      ),
    },
    // Component Variant Settings modal
    {
      type: 'component-variant-settings',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/EditComponentsModal/components/VariantSettingsModal').then(
          (m) => m.VariantSettingsModal
        )
      ),
    },
  ];
}
