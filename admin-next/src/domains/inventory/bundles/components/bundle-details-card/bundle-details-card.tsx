"use client";

import { useState, useCallback } from "react";
import { Flex } from "antd";
import { ProductInfoHeader } from "@/domains/inventory/products/components/product-info-header";
import { ProductContentTabs } from "@/domains/inventory/products/components/product-content-tabs";
import { SeoBlock } from "@/domains/inventory/products/components/seo";
import { AttributesSection } from "@/domains/inventory/products/components/attributes-section";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import {
  MediaSection,
  CategoriesSection,
  TagsSection,
} from "@/domains/inventory/products/components/product-details-card/sections";
import {
  GroupsSection,
  PricingSection,
  SettingsSection,
} from "./sections";
import {
  useEditMediaModal,
  useEditAttributesModal,
  useEditSeoModal,
  type IEditSeoModalPayload,
} from "@/domains/inventory/products/modals";
import {
  useEditBundleGroupsModal,
  useEditBundlePricingModal,
  useEditBundleSettingsModal,
} from "@/domains/inventory/bundles/modals";
import type { IProduct, IMediaFile } from "@/mocks/products/types";
import type { IBundleDetailsMockData } from "@/mocks/products/bundle-details";
import type {
  IComponentGroup,
  PricingRuleTemplate,
  IDependencyRule,
  IBundleSettings,
} from "@/domains/inventory/products/modals/edit-components-modal/types";

// ============================================================================
// Default Settings
// ============================================================================

const DEFAULT_BUNDLE_SETTINGS: IBundleSettings = {
  displayStyle: "accordion",
  showImages: true,
  showSku: true,
  showStock: true,
  showComparePrice: false,
  outOfStockBehavior: "disable",
  inheritStock: true,
  validationMessage: null,
};

// ============================================================================
// Props
// ============================================================================

interface IBundleDetailsCardProps {
  product: IProduct;
  mockData: IBundleDetailsMockData;
}

// ============================================================================
// Component
// ============================================================================

export const BundleDetailsCard = ({
  product,
  mockData,
}: IBundleDetailsCardProps) => {
  const { push: openEditMediaModal } = useEditMediaModal();
  const { push: openEditAttributesModal } = useEditAttributesModal();
  const { push: openEditSeoModal } = useEditSeoModal();
  const { push: openEditGroupsModal } = useEditBundleGroupsModal();
  const { push: openEditPricingModal } = useEditBundlePricingModal();
  const { push: openEditSettingsModal } = useEditBundleSettingsModal();

  // State
  const [groups, setGroups] = useState<IComponentGroup[]>(mockData.components);
  const [pricingTemplates, setPricingTemplates] = useState<PricingRuleTemplate[]>(
    mockData.pricingTemplates
  );
  const [dependencyRules, setDependencyRules] = useState<IDependencyRule[]>(
    mockData.dependencyRules
  );
  const [bundleSettings, setBundleSettings] = useState<IBundleSettings>(
    DEFAULT_BUNDLE_SETTINGS
  );

  // ========================================
  // Modal Handlers
  // ========================================

  const handleEditGroups = useCallback(() => {
    openEditGroupsModal({
      groups,
      pricingTemplates,
      onSave: (updatedGroups: IComponentGroup[]) => {
        setGroups(updatedGroups);
      },
    });
  }, [groups, pricingTemplates, openEditGroupsModal]);

  const handleEditPricing = useCallback(() => {
    openEditPricingModal({
      pricingTemplates,
      dependencyRules,
      groups,
      onSave: (data: {
        pricingTemplates: PricingRuleTemplate[];
        dependencyRules: IDependencyRule[];
      }) => {
        setPricingTemplates(data.pricingTemplates);
        setDependencyRules(data.dependencyRules);
      },
    });
  }, [pricingTemplates, dependencyRules, groups, openEditPricingModal]);

  const handleEditSettings = useCallback(() => {
    openEditSettingsModal({
      settings: bundleSettings,
      onSave: (updatedSettings: IBundleSettings) => {
        setBundleSettings(updatedSettings);
      },
    });
  }, [bundleSettings, openEditSettingsModal]);

  const handleEditMedia = useCallback(() => {
    openEditMediaModal({
      productId: product.id,
      featured: product.featured,
      gallery: product.gallery,
      onSave: (media: { featured: IMediaFile | null; gallery: IMediaFile[] }) => {
        console.log("Saved media:", media);
      },
    });
  }, [product.id, product.featured, product.gallery, openEditMediaModal]);

  const handleEditAttributes = useCallback(() => {
    openEditAttributesModal({ productId: product.id });
  }, [product.id, openEditAttributesModal]);

  const handleEditSeo = useCallback(() => {
    openEditSeoModal({
      productId: product.id,
      productTitle: product.title,
      productSlug: product.slug,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      onSave: (
        values: Parameters<NonNullable<IEditSeoModalPayload["onSave"]>>[0],
      ) => {
        console.log("Saved SEO:", values);
      },
    });
  }, [
    product.id,
    product.title,
    product.slug,
    product.seoTitle,
    product.seoDescription,
    openEditSeoModal,
  ]);

  return (
    <Flex vertical gap={12} style={{ width: "100%" }}>
      {/* BUNDLE INFO HEADER */}
      <ProductInfoHeader product={product} />

      {/* CONTENT TABS */}
      <ProductContentTabs product={product} />

      {/* MEDIA */}
      <MediaSection gallery={product.gallery} onEdit={handleEditMedia} />

      {/* COMPONENT GROUPS */}
      <GroupsSection groups={groups} onEdit={handleEditGroups} />

      {/* PRICING & DEPENDENCY RULES */}
      <PricingSection
        pricingTemplates={pricingTemplates}
        dependencyRules={dependencyRules}
        onEdit={handleEditPricing}
      />

      {/* BUNDLE SETTINGS */}
      <SettingsSection settings={bundleSettings} onEdit={handleEditSettings} />

      {/* CATEGORIES */}
      <CategoriesSection
        primaryCategory={mockData.categories.primary}
        categories={mockData.categories.list}
      />

      {/* ATTRIBUTES */}
      <AttributesSection
        data={mockData.attributes}
        actions={
          <EditAction onEdit={handleEditAttributes} label="Edit attributes" />
        }
      />

      {/* TAGS */}
      <TagsSection tags={mockData.tags} />

      {/* SEO */}
      <SeoBlock
        data={{
          seoTitle: product.seoTitle,
          seoDescription: product.seoDescription,
          title: product.title,
          excerpt: product.excerpt,
          slug: product.slug,
        }}
        actions={<EditAction label="Edit SEO" onEdit={handleEditSeo} />}
      />
    </Flex>
  );
};
