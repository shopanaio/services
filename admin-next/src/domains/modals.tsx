'use client';

import dynamic from 'next/dynamic';
import type { IModalStackDefinition } from '@/layouts/modals/types';

/**
 * All modal stack definitions for the application.
 * This file is imported on the client side for modal stack registration.
 */
export function getModalStackDefinitions(): IModalStackDefinition[] {
  return [
    // ========================================
    // Workspace modals
    // ========================================
    // Invite Member modal
    {
      type: 'workspace-invite-member',
      component: dynamic(() =>
        import('@/domains/workspace/modals/invite-member-modal').then(
          (m) => m.InviteMemberModal
        )
      ),
    },
    // Edit Role modal
    {
      type: 'workspace-edit-role',
      component: dynamic(() =>
        import('@/domains/workspace/modals/edit-role-modal').then(
          (m) => m.EditRoleModal
        )
      ),
    },
    // Delete Organization modal
    {
      type: 'workspace-delete-organization',
      component: dynamic(() =>
        import('@/domains/workspace/modals/delete-organization-modal').then(
          (m) => m.DeleteOrganizationModal
        )
      ),
    },
    // Change Password modal
    {
      type: 'workspace-change-password',
      component: dynamic(() =>
        import('@/domains/workspace/modals/change-password-modal').then(
          (m) => m.ChangePasswordModal
        )
      ),
    },
    // Change Email modal
    {
      type: 'workspace-change-email',
      component: dynamic(() =>
        import('@/domains/workspace/modals/change-email-modal').then(
          (m) => m.ChangeEmailModal
        )
      ),
    },
    // Edit Avatar modal
    {
      type: 'workspace-edit-avatar',
      component: dynamic(() =>
        import('@/domains/workspace/modals/edit-avatar-modal').then(
          (m) => m.EditAvatarModal
        )
      ),
    },
    // Edit Organization modal
    {
      type: 'workspace-edit-organization',
      component: dynamic(() =>
        import('@/domains/workspace/modals/edit-organization-modal').then(
          (m) => m.EditOrganizationModal
        )
      ),
    },
    // Edit Profile modal
    {
      type: 'workspace-edit-profile',
      component: dynamic(() =>
        import('@/domains/workspace/modals/edit-profile-modal').then(
          (m) => m.EditProfileModal
        )
      ),
    },
    // Create Store modal
    {
      type: 'workspace-create-store',
      component: dynamic(() =>
        import('@/domains/workspace/modals/create-store-modal').then(
          (m) => m.CreateStoreModal
        )
      ),
    },
    // Create Organization modal
    {
      type: 'workspace-create-organization',
      component: dynamic(() =>
        import('@/domains/workspace/modals/create-organization-modal').then(
          (m) => m.CreateOrganizationModal
        )
      ),
    },
    // ========================================
    // Product modals
    // ========================================
    // Product modal
    {
      type: 'product',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/product-modal').then(
          (m) => m.ProductModal
        )
      ),
    },
    // Create Product modal
    {
      type: 'product-create',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/create-product-modal').then(
          (m) => m.CreateProductModal
        )
      ),
    },
    // Edit title modal
    {
      type: 'product-edit-title',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/edit-title-modal').then(
          (m) => m.EditTitleModal
        )
      ),
    },
    // Edit description modal
    {
      type: 'product-edit-description',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/edit-description-modal').then(
          (m) => m.EditDescriptionModal
        )
      ),
    },
    // AI Writer modal
    {
      type: 'product-ai-writer',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/ai-writer-modal').then(
          (m) => m.AIWriterModal
        )
      ),
    },
    // Price History modal
    {
      type: 'product-price-history',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/price-history-modal').then(
          (m) => m.PriceHistoryModal
        )
      ),
    },
    // Edit Media modal
    {
      type: 'product-edit-media',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/edit-media-modal').then(
          (m) => m.EditMediaModal
        )
      ),
    },
    // Edit Options modal
    {
      type: 'product-edit-options',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/edit-options-modal').then(
          (m) => m.EditOptionsModal
        )
      ),
    },
    // Edit Attributes modal
    {
      type: 'product-edit-attributes',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/edit-attributes-modal').then(
          (m) => m.EditAttributesModal
        )
      ),
    },
    // Edit SEO modal
    {
      type: 'product-edit-seo',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/edit-seo-modal').then(
          (m) => m.EditSeoModal
        )
      ),
    },
    // Edit Variants modal (unified with tabs)
    {
      type: 'product-edit-variants',
      component: dynamic(() =>
        import('@/domains/inventory/products/components/variants/edit-variants-modal').then(
          (m) => m.EditVariantsModal
        )
      ),
    },
    // Edit Categories modal
    {
      type: 'product-edit-categories',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/edit-categories-modal').then(
          (m) => m.EditCategoriesModal
        )
      ),
    },
    // Edit Tags modal
    {
      type: 'product-edit-tags',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/edit-tags-modal').then(
          (m) => m.EditTagsModal
        )
      ),
    },
    // Edit Components modal (bundle configurator)
    {
      type: 'product-edit-components',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/edit-components-modal').then(
          (m) => m.EditComponentsModal
        )
      ),
    },
    // Component Variant Settings modal
    {
      type: 'component-variant-settings',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/edit-components-modal/components/variant-settings-modal').then(
          (m) => m.VariantSettingsModal
        )
      ),
    },
    // Bulk Editor modal
    {
      type: 'bulk-editor',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/bulk-editor-modal').then(
          (m) => m.BulkEditorModal
        )
      ),
    },
    // Category Picker modal
    {
      type: 'category-picker',
      component: dynamic(() =>
        import('@/shared/components/entity-picker-modal/category-picker-modal').then(
          (m) => m.CategoryPickerModal
        )
      ),
    },
    // Tag Picker modal
    {
      type: 'tag-picker',
      component: dynamic(() =>
        import('@/shared/components/entity-picker-modal/tag-picker-modal').then(
          (m) => m.TagPickerModal
        )
      ),
    },
  ];
}
