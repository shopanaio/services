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
    // Role modal (unified create/edit/view)
    {
      type: 'workspace-role',
      component: dynamic(() =>
        import('@/domains/workspace/modals/role-modal').then(
          (m) => m.RoleModal
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
    // ========================================
    // Profile modals
    // ========================================
    // Change Password modal
    {
      type: 'profile-change-password',
      component: dynamic(() =>
        import('@/domains/profile/modals/change-password-modal').then(
          (m) => m.ChangePasswordModal
        )
      ),
    },
    // Change Email modal
    {
      type: 'profile-change-email',
      component: dynamic(() =>
        import('@/domains/profile/modals/change-email-modal').then(
          (m) => m.ChangeEmailModal
        )
      ),
    },
    // Edit Avatar modal
    {
      type: 'profile-edit-avatar',
      component: dynamic(() =>
        import('@/domains/profile/modals/edit-avatar-modal').then(
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
      type: 'profile-edit-profile',
      component: dynamic(() =>
        import('@/domains/profile/modals/edit-profile-modal').then(
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
    // Edit Tags modal
    {
      type: 'product-edit-tags',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/edit-tags-modal').then(
          (m) => m.EditTagsModal
        )
      ),
    },
    // Bundle Item Variant Settings modal
    {
      type: 'bundle-item-variant-settings',
      component: dynamic(() =>
        import('@/domains/inventory/bundles/modals/variant-settings-modal').then(
          (m) => m.VariantSettingsModal
        )
      ),
    },
    // Dependency Chart modal
    {
      type: 'dependency-chart',
      component: dynamic(() =>
        import('@/domains/inventory/bundles/modals/dependency-chart-modal').then(
          (m) => m.DependencyChartModal
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
    // ========================================
    // Warehouse modals
    // ========================================
    // Warehouse modal
    {
      type: 'warehouse',
      component: dynamic(() =>
        import('@/domains/inventory/warehouse/modals/warehouse-modal').then(
          (m) => m.WarehouseModal
        )
      ),
    },
    // Create Warehouse modal
    {
      type: 'warehouse-create',
      component: dynamic(() =>
        import('@/domains/inventory/warehouse/modals/create-warehouse-modal').then(
          (m) => m.CreateWarehouseModal
        )
      ),
    },
    // Edit warehouse identity modal
    {
      type: 'warehouse-edit-identity',
      component: dynamic(() =>
        import('@/domains/inventory/warehouse/modals/edit-identity-modal').then(
          (m) => m.EditIdentityModal
        )
      ),
    },
    // Edit warehouse default modal
    {
      type: 'warehouse-edit-default',
      component: dynamic(() =>
        import('@/domains/inventory/warehouse/modals/edit-default-modal').then(
          (m) => m.EditDefaultModal
        )
      ),
    },
    // Delete warehouse modal
    {
      type: 'warehouse-delete',
      component: dynamic(() =>
        import('@/domains/inventory/warehouse/modals/delete-warehouse-modal').then(
          (m) => m.DeleteWarehouseModal
        )
      ),
    },
    // ========================================
    // Category modals
    // ========================================
    // Category modal
    {
      type: 'category',
      component: dynamic(() =>
        import('@/domains/inventory/categories/modals/category-modal').then(
          (m) => m.CategoryModal
        )
      ),
    },
    // Create Category modal
    {
      type: 'category-create',
      component: dynamic(() =>
        import('@/domains/inventory/categories/modals/create-category-modal').then(
          (m) => m.CreateCategoryModal
        )
      ),
    },
    {
      type: 'category-edit-identity',
      component: dynamic(() =>
        import('@/domains/inventory/categories/modals/edit-category-identity-modal').then(
          (m) => m.EditCategoryIdentityModal
        )
      ),
    },
    {
      type: 'category-edit-content',
      component: dynamic(() =>
        import('@/domains/inventory/categories/modals/edit-category-content-modal').then(
          (m) => m.EditCategoryContentModal
        )
      ),
    },
    {
      type: 'category-edit-seo',
      component: dynamic(() =>
        import('@/domains/inventory/categories/modals/edit-category-seo-modal').then(
          (m) => m.EditCategorySeoModal
        )
      ),
    },
    {
      type: 'category-edit-media',
      component: dynamic(() =>
        import('@/domains/inventory/categories/modals/edit-category-media-modal').then(
          (m) => m.EditCategoryMediaModal
        )
      ),
    },
    {
      type: 'category-edit-sort',
      component: dynamic(() =>
        import('@/domains/inventory/categories/modals/edit-category-sort-modal').then(
          (m) => m.EditCategorySortModal
        )
      ),
    },
    // ========================================
    // Tag modals
    // ========================================
    // Tag modal
    {
      type: 'tag',
      component: dynamic(() =>
        import('@/domains/inventory/tags/modals/tag-modal').then(
          (m) => m.TagModal
        )
      ),
    },
    // Create Tag modal
    {
      type: 'tag-create',
      component: dynamic(() =>
        import('@/domains/inventory/tags/modals/create-tag-modal').then(
          (m) => m.CreateTagModal
        )
      ),
    },
    // Edit tag identity modal
    {
      type: 'tag-edit-identity',
      component: dynamic(() =>
        import('@/domains/inventory/tags/modals/edit-tag-identity-modal').then(
          (m) => m.EditTagIdentityModal
        )
      ),
    },
    // ========================================
    // Facet modals
    // ========================================
    {
      type: 'facet-create',
      component: dynamic(() =>
        import('@/domains/inventory/facets/modals/create-facet-modal').then(
          (m) => m.CreateFacetModal
        )
      ),
    },
    {
      type: 'facet-edit',
      component: dynamic(() =>
        import('@/domains/inventory/facets/modals/edit-facet-modal').then(
          (m) => m.EditFacetModal
        )
      ),
    },
    {
      type: 'facet-value-link-sources',
      component: dynamic(() =>
        import('@/domains/inventory/facets/modals/link-source-values-modal').then(
          (m) => m.LinkSourceValuesModal
        )
      ),
    },
    // ========================================
    // Picker modals
    // ========================================
    // Generic Entity Picker modal
    {
      type: 'entity-picker',
      component: dynamic(() =>
        import('@/shared/components/entity-picker-modal/entity-picker-modal').then(
          (m) => m.EntityPickerModal
        )
      ),
    },
    // Product Picker modal
    {
      type: 'product-picker',
      component: dynamic(() =>
        import('@/shared/components/entity-picker-modal/product-picker-modal').then(
          (m) => m.ProductPickerModal
        )
      ),
    },
    // Variant Picker modal
    {
      type: 'variant-picker',
      component: dynamic(() =>
        import('@/shared/components/entity-picker-modal/variant-picker-modal').then(
          (m) => m.VariantPickerModal
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
    // Media Picker modal
    {
      type: 'media-picker',
      component: dynamic(() =>
        import('@/shared/components/entity-picker-modal/media-picker-modal').then(
          (m) => m.MediaPickerModal
        )
      ),
    },
    // ========================================
    // Bundle modals
    // ========================================
    // Bundle modal
    {
      type: 'bundle',
      component: dynamic(() =>
        import('@/domains/inventory/bundles/modals/bundle-modal').then(
          (m) => m.BundleModal
        )
      ),
    },
    // Bundle Edit Groups modal
    {
      type: 'bundle-edit-groups',
      component: dynamic(() =>
        import('@/domains/inventory/bundles/modals/edit-groups-modal').then(
          (m) => m.EditGroupsModal
        )
      ),
    },
    // Bundle Edit Configuration modal
    {
      type: 'bundle-edit-configuration',
      component: dynamic(() =>
        import('@/domains/inventory/bundles/modals/edit-configuration-modal').then(
          (m) => m.EditConfigurationModal
        )
      ),
    },
    // Bundle Edit Templates modal
    {
      type: 'bundle-edit-templates',
      component: dynamic(() =>
        import('@/domains/inventory/bundles/modals/edit-templates-modal').then(
          (m) => m.EditTemplatesModal
        )
      ),
    },
    // Bundle Edit Settings modal
    {
      type: 'bundle-edit-settings',
      component: dynamic(() =>
        import('@/domains/inventory/bundles/modals/edit-settings-modal').then(
          (m) => m.EditSettingsModal
        )
      ),
    },
    // ========================================
    // Media modals
    // ========================================
    // Upload Media modal
    {
      type: 'media-upload',
      component: dynamic(() =>
        import('@/domains/media/modals/upload-media-modal').then(
          (m) => m.UploadMediaModal
        )
      ),
    },
  ];
}
