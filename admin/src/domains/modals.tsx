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
    // App management modal
    // ========================================
    {
      type: 'app-management',
      component: dynamic(() =>
        import('@/domains/apps/management/modals/app-management-modal').then(
          (m) => m.AppManagementModal
        )
      ),
    },
    // ========================================
    // Website navigation modals
    // ========================================
    {
      type: 'navigation-menu',
      component: dynamic(() =>
        import('@/domains/media/navigation/modals/menu-modal').then(
          (m) => m.NavigationMenuModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved menu changes?',
    },
    {
      type: 'navigation-link',
      component: dynamic(() =>
        import('@/domains/media/navigation/modals/link-modal').then(
          (m) => m.NavigationLinkModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved menu item changes?',
    },
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
    // Email template editor
    // ========================================
    {
      type: 'system-email-template',
      component: dynamic(() =>
        import('@/domains/system/email/modals/email-template-modal').then(
          (m) => m.EmailTemplateModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard email template changes?',
    },
    {
      type: 'system-notification-item',
      component: dynamic(() =>
        import('@/domains/system/notifications/modals/notification-item-modal').then(
          (m) => m.NotificationItemModal
        )
      ),
    },
    {
      type: 'system-notification-template',
      component: dynamic(() =>
        import('@/domains/system/notifications/modals/notification-template-modal').then(
          (m) => m.NotificationTemplateModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard notification template changes?',
    },
    {
      type: 'system-notification-webhook',
      component: dynamic(() =>
        import('@/domains/system/notifications/modals/notification-webhook-modal').then(
          (m) => m.NotificationWebhookModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard webhook changes?',
    },
    {
      type: 'general-settings-edit-store-settings',
      component: dynamic(() =>
        import('@/domains/system/general-settings/modals/store-settings-modal').then(
          (m) => m.StoreSettingsModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard store settings changes?',
    },
    {
      type: 'general-settings-edit-store-defaults',
      component: dynamic(() =>
        import('@/domains/system/general-settings/modals/store-defaults-modal').then(
          (m) => m.StoreDefaultsModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard store defaults changes?',
    },
    {
      type: 'general-settings-edit-store-currency',
      component: dynamic(() =>
        import('@/domains/system/general-settings/modals/store-currency-modal').then(
          (m) => m.StoreCurrencyModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard currency changes?',
    },
    {
      type: 'general-settings-add-store-language',
      component: dynamic(() =>
        import('@/domains/system/general-settings/modals/store-language-modal').then(
          (m) => m.StoreLanguageModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard language selection?',
    },
    {
      type: 'general-settings-edit-customer-accounts',
      component: dynamic(() =>
        import('@/domains/system/general-settings/modals/customer-accounts-modal').then(
          (m) => m.CustomerAccountsModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard customer account changes?',
    },
    {
      type: 'general-settings-edit-store-order-processing',
      component: dynamic(() =>
        import('@/domains/system/general-settings/modals/store-order-processing-modal').then(
          (m) => m.StoreOrderProcessingModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard order processing changes?',
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
    {
      type: 'product-component-item-variant-settings',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/components-ui/variant-settings-modal').then(
          (m) => m.VariantSettingsModal
        )
      ),
    },
    {
      type: 'product-dependency-chart',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/components-ui/dependency-chart-modal').then(
          (m) => m.DependencyChartModal
        )
      ),
    },
    {
      type: 'product-component-edit-groups',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/components-ui/edit-groups-modal').then(
          (m) => m.EditGroupsModal
        )
      ),
    },
    {
      type: 'product-component-edit-configuration',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/components-ui/edit-configuration-modal').then(
          (m) => m.EditConfigurationModal
        )
      ),
    },
    {
      type: 'product-component-edit-templates',
      component: dynamic(() =>
        import('@/domains/inventory/products/modals/components-ui/edit-templates-modal').then(
          (m) => m.EditTemplatesModal
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
    {
      type: 'category-listing-preview',
      component: dynamic(() =>
        import('@/domains/inventory/categories/modals/listing-preview-modal').then(
          (m) => m.ListingPreviewModal
        )
      ),
    },
    // ========================================
    // Discount modals
    // ========================================
    {
      type: 'discount',
      component: dynamic(() =>
        import('@/domains/inventory/discounts/modals/discount-modal').then(
          (m) => m.DiscountModal
        )
      ),
    },
    {
      type: 'discount-create',
      component: dynamic(() =>
        import('@/domains/inventory/discounts/modals/create-discount-modal').then(
          (m) => m.CreateDiscountModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard this discount draft?',
    },
    {
      type: 'discount-general-edit',
      component: dynamic(() =>
        import('@/domains/inventory/discounts/modals/edit-general-settings-modal').then(
          (m) => m.EditGeneralSettingsModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard general settings changes?',
    },
    {
      type: 'discount-value-targets-edit',
      component: dynamic(() =>
        import('@/domains/inventory/discounts/modals/edit-value-targets-modal').then(
          (m) => m.EditValueTargetsModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard value, target and requirement changes?',
    },
    {
      type: 'discount-eligibility-channels-edit',
      component: dynamic(() =>
        import('@/domains/inventory/discounts/modals/edit-eligibility-channels-modal').then(
          (m) => m.EditEligibilityChannelsModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard eligibility and channel changes?',
    },
    {
      type: 'discount-availability-edit',
      component: dynamic(() =>
        import('@/domains/inventory/discounts/modals/edit-availability-modal').then(
          (m) => m.EditAvailabilityModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard availability, limit and combination changes?',
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
    {
      type: 'facet-value-group',
      component: dynamic(() =>
        import('@/domains/discovery/facets/modals/facet-value-group-modal').then(
          (m) => m.FacetValueGroupModal
        )
      ),
    },
    {
      type: 'facet-value-candidates',
      component: dynamic(() =>
        import('@/domains/discovery/facets/modals/value-candidates-modal').then(
          (m) => m.ValueCandidatesModal
        )
      ),
    },
    // ========================================
    // Facet modals
    // ========================================
    {
      type: 'facet-create',
      component: dynamic(() =>
        import('@/domains/discovery/facets/modals/create-facet-modal').then(
          (m) => m.CreateFacetModal
        )
      ),
    },
    {
      type: 'facet-edit',
      component: dynamic(() =>
        import('@/domains/discovery/facets/modals/edit-facet-modal').then(
          (m) => m.EditFacetModal
        )
      ),
    },
    {
      type: 'facet-source-picker',
      component: dynamic(() =>
        import('@/domains/discovery/facets/modals/facet-source-picker-modal').then(
          (m) => m.FacetSourcePickerModal
        )
      ),
    },
    {
      type: 'facet-scope-picker',
      component: dynamic(() =>
        import('@/domains/discovery/facets/modals/facet-scope-picker-modal').then(
          (m) => m.FacetScopePickerModal
        )
      ),
    },
    {
      type: 'facet-value-link-sources',
      component: dynamic(() =>
        import('@/domains/discovery/facets/modals/link-source-values-modal').then(
          (m) => m.LinkSourceValuesModal
        )
      ),
    },
    // ========================================
    // Search configuration modals
    // ========================================
    {
      type: 'search-product-boost',
      component: dynamic(() =>
        import('@/domains/discovery/search/product-boosts/modals').then(
          (m) => m.ProductBoostModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved changes?',
    },
    {
      type: 'search-synonym-group',
      component: dynamic(() =>
        import('@/domains/discovery/search/synonyms/modals').then(
          (m) => m.SynonymGroupModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved changes?',
    },
    // ========================================
    // Customer modals
    // ========================================
    {
      type: 'customer',
      component: dynamic(() =>
        import('@/domains/customers/all-customers/modals/customer-modal').then(
          (m) => m.CustomerModal
        )
      ),
    },
    {
      type: 'customer-create',
      component: dynamic(() =>
        import('@/domains/customers/all-customers/modals/create-customer-modal').then(
          (m) => m.CreateCustomerModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard this new customer?',
    },
    {
      type: 'customer-edit-profile',
      component: dynamic(() => import('@/domains/customers/all-customers/modals/edit-customer-profile-modal').then((m) => m.EditCustomerProfileModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved profile changes?',
    },
    {
      type: 'customer-edit-contact',
      component: dynamic(() => import('@/domains/customers/all-customers/modals/edit-customer-contact-modal').then((m) => m.EditCustomerContactModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved contact changes?',
    },
    {
      type: 'customer-edit-company',
      component: dynamic(() => import('@/domains/customers/all-customers/modals/edit-customer-company-modal').then((m) => m.EditCustomerCompanyModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved company changes?',
    },
    {
      type: 'customer-manage-addresses',
      component: dynamic(() => import('@/domains/customers/all-customers/modals/manage-customer-addresses-modal').then((m) => m.ManageCustomerAddressesModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved address changes?',
    },
    {
      type: 'customer-edit-address',
      component: dynamic(() => import('@/domains/customers/all-customers/modals/edit-customer-address-modal').then((m) => m.EditCustomerAddressModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard this address draft?',
    },
    {
      type: 'customer-edit-consents',
      component: dynamic(() => import('@/domains/customers/all-customers/modals/edit-customer-consents-modal').then((m) => m.EditCustomerConsentsModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved consent changes?',
    },
    {
      type: 'customer-edit-groups',
      component: dynamic(() => import('@/domains/customers/all-customers/modals/edit-customer-groups-modal').then((m) => m.EditCustomerGroupsModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved group changes?',
    },
    {
      type: 'customer-edit-tags',
      component: dynamic(() => import('@/domains/customers/all-customers/modals/edit-customer-tags-modal').then((m) => m.EditCustomerTagsModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved tag changes?',
    },
    {
      type: 'customer-edit-segments',
      component: dynamic(() => import('@/domains/customers/all-customers/modals/edit-customer-segments-modal').then((m) => m.EditCustomerSegmentsModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved segment changes?',
    },
    {
      type: 'customer-edit-status',
      component: dynamic(() => import('@/domains/customers/all-customers/modals/edit-customer-status-modal').then((m) => m.EditCustomerStatusModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard the status change?',
    },
    {
      type: 'customer-edit-note',
      component: dynamic(() => import('@/domains/customers/all-customers/modals/edit-customer-note-modal').then((m) => m.EditCustomerNoteModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard the merchant note change?',
    },
    {
      type: 'customer-edit-moderation',
      component: dynamic(() => import('@/domains/customers/all-customers/modals/edit-customer-moderation-modal').then((m) => m.EditCustomerModerationModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard the moderation note change?',
    },
    {
      type: 'customer-manage-tax-identifiers',
      component: dynamic(() => import('@/domains/customers/all-customers/modals/manage-customer-tax-identifiers-modal').then((m) => m.ManageCustomerTaxIdentifiersModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved tax identifier changes?',
    },
    {
      type: 'customer-edit-tax-identifier',
      component: dynamic(() => import('@/domains/customers/all-customers/modals/edit-customer-tax-identifier-modal').then((m) => m.EditCustomerTaxIdentifierModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard this tax identifier draft?',
    },
    {
      type: 'customer-manage-tax-exemptions',
      component: dynamic(() => import('@/domains/customers/all-customers/modals/manage-customer-tax-exemptions-modal').then((m) => m.ManageCustomerTaxExemptionsModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved tax exemption changes?',
    },
    {
      type: 'customer-edit-tax-exemption',
      component: dynamic(() => import('@/domains/customers/all-customers/modals/edit-customer-tax-exemption-modal').then((m) => m.EditCustomerTaxExemptionModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard this tax exemption draft?',
    },
    {
      type: 'customer-technical-metadata',
      component: dynamic(() => import('@/domains/customers/all-customers/modals/customer-technical-metadata-modal').then((m) => m.CustomerTechnicalMetadataModal)),
    },
    {
      type: 'customer-segment',
      component: dynamic(() =>
        import('@/domains/customers/segments/modals/segment-modal').then(
          (m) => m.CustomerSegmentModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved segment changes?',
    },
    {
      type: 'customer-group',
      component: dynamic(() =>
        import('@/domains/customers/groups/modals/group-modal').then(
          (m) => m.CustomerGroupModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved group changes?',
    },
    {
      type: 'customer-tag',
      component: dynamic(() =>
        import('@/domains/customers/tags/modals/tag-modal').then(
          (m) => m.CustomerTagModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved tag changes?',
    },
    {
      type: 'customer-review',
      component: dynamic(() =>
        import('@/domains/customer-content/reviews/modals/review-details-modal').then(
          (m) => m.ReviewModal
        )
      ),
    },
    {
      type: 'customer-review-create',
      component: dynamic(() =>
        import('@/domains/customer-content/reviews/modals/review-create-modal').then(
          (m) => m.ReviewCreateModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved review changes?',
    },
    {
      type: 'customer-review-edit-content',
      component: dynamic(() => import('@/domains/customer-content/reviews/modals/edit-review-content-modal').then((m) => m.EditReviewContentModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved review content changes?',
    },
    {
      type: 'customer-review-edit-reviewer',
      component: dynamic(() => import('@/domains/customer-content/reviews/modals/edit-reviewer-modal').then((m) => m.EditReviewerModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved reviewer changes?',
    },
    {
      type: 'customer-review-edit-subject',
      component: dynamic(() => import('@/domains/customer-content/reviews/modals/edit-review-subject-modal').then((m) => m.EditReviewSubjectModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved product and purchase changes?',
    },
    {
      type: 'customer-review-edit-ratings',
      component: dynamic(() => import('@/domains/customer-content/reviews/modals/edit-review-ratings-modal').then((m) => m.EditReviewRatingsModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved rating changes?',
    },
    {
      type: 'customer-review-edit-moderation',
      component: dynamic(() => import('@/domains/customer-content/reviews/modals/edit-review-moderation-modal').then((m) => m.EditReviewModerationModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved moderation changes?',
    },
    {
      type: 'customer-review-edit-verification',
      component: dynamic(() => import('@/domains/customer-content/reviews/modals/edit-review-verification-modal').then((m) => m.EditReviewVerificationModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved verification changes?',
    },
    {
      type: 'customer-review-edit-incentive',
      component: dynamic(() => import('@/domains/customer-content/reviews/modals/edit-review-incentive-modal').then((m) => m.EditReviewIncentiveModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved incentive disclosure changes?',
    },
    {
      type: 'customer-review-edit-media',
      component: dynamic(() => import('@/domains/customer-content/reviews/modals/edit-review-media-modal').then((m) => m.EditReviewMediaModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved media changes?',
    },
    {
      type: 'customer-review-edit-media-item',
      component: dynamic(() => import('@/domains/customer-content/reviews/modals/edit-review-media-item-modal').then((m) => m.EditReviewMediaItemModal)),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved media detail changes?',
    },
    {
      type: 'customer-review-technical-metadata',
      component: dynamic(() => import('@/domains/customer-content/reviews/modals/review-technical-metadata-modal').then((m) => m.ReviewTechnicalMetadataModal)),
    },
    {
      type: 'customer-question',
      component: dynamic(() =>
        import('@/domains/customer-content/questions/modals/question-details-modal').then(
          (m) => m.QuestionModal
        )
      ),
    },
    {
      type: 'customer-question-create',
      component: dynamic(() =>
        import('@/domains/customer-content/questions/modals/question-create-modal').then(
          (m) => m.QuestionCreateModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved question changes?',
    },
    {
      type: 'customer-question-edit',
      component: dynamic(() =>
        import('@/domains/customer-content/questions/modals/question-modal').then(
          (m) => m.QuestionEditModal
        )
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved question changes?',
    },
    {
      type: 'review-rating-criterion',
      component: dynamic(() =>
        import('@/domains/customer-content/management/criteria').then((m) => m.RatingCriterionModal)
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved criterion changes?',
    },
    {
      type: 'review-moderation-case',
      component: dynamic(() =>
        import('@/domains/customer-content/management/cases').then((m) => m.ModerationCaseModal)
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved case changes?',
    },
    {
      type: 'review-request',
      component: dynamic(() =>
        import('@/domains/customer-content/management/requests').then((m) => m.ReviewRequestModal)
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved request changes?',
    },
    {
      type: 'review-external-reference',
      component: dynamic(() =>
        import('@/domains/customer-content/management/external').then((m) => m.ExternalReferenceModal)
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved external reference changes?',
    },
    {
      type: 'product-insights',
      component: dynamic(() =>
        import('@/domains/customer-content/management/insights').then((m) => m.ProductInsightsModal)
      ),
    },
    // ========================================
    // Fulfillment modals
    // ========================================
    {
      type: 'fulfillment-stage',
      component: dynamic(() =>
        import('@/domains/sales/fulfillment/stages/modals/stage-modal').then((m) => m.FulfillmentStageModal)
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved stage changes?',
    },
    {
      type: 'fulfillment-order',
      component: dynamic(() =>
        import('@/domains/sales/all-orders/modals/order-modal').then((m) => m.OrderModal)
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved order changes?',
    },
    {
      type: 'fulfillment-status',
      component: dynamic(() =>
        import('@/domains/sales/all-orders/modals/fulfillment-status-modal').then((m) => m.OrderFulfillmentStatusModal)
      ),
    },
    {
      type: 'fulfillment-tracking',
      component: dynamic(() =>
        import('@/domains/sales/all-orders/modals/shipping-item-modal').then((m) => m.OrderShippingItemModal)
      ),
    },
    // ========================================
    // Order modals
    // ========================================
    {
      type: 'order',
      component: dynamic(() =>
        import('@/domains/sales/all-orders/modals/order-modal').then((m) => m.OrderModal)
      ),
      confirmOnDirtyClose: true,
      closeConfirmMessage: 'Discard unsaved order changes?',
    },
    {
      type: 'order-status',
      component: dynamic(() =>
        import('@/domains/sales/all-orders/modals/order-status-modal').then((m) => m.OrderStatusModal)
      ),
    },
    {
      type: 'order-payment-status',
      component: dynamic(() =>
        import('@/domains/sales/all-orders/modals/payment-status-modal').then((m) => m.OrderPaymentStatusModal)
      ),
    },
    {
      type: 'order-fulfillment-status',
      component: dynamic(() =>
        import('@/domains/sales/all-orders/modals/fulfillment-status-modal').then((m) => m.OrderFulfillmentStatusModal)
      ),
    },
    {
      type: 'order-shipping-item',
      component: dynamic(() =>
        import('@/domains/sales/all-orders/modals/shipping-item-modal').then((m) => m.OrderShippingItemModal)
      ),
    },
    {
      type: 'order-shipping-details',
      component: dynamic(() =>
        import('@/domains/sales/all-orders/modals/shipping-details-modal').then((m) => m.OrderShippingDetailsModal)
      ),
    },
    {
      type: 'order-payment-details',
      component: dynamic(() =>
        import('@/domains/sales/all-orders/modals/payment-details-modal').then((m) => m.OrderPaymentDetailsModal)
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
