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
  ReviewsSection,
} from "@/domains/inventory/products/components/product-details-card/sections";
import {
  GroupsSection,
  DependencyRulesSection,
} from "./sections";
import {
  useEditMediaModal,
  useEditAttributesModal,
  useEditSeoModal,
  useDependencyChartModal,
  type IEditSeoModalPayload,
} from "@/domains/inventory/products/modals";
import {
  useEditBundleGroupsModal,
} from "@/domains/inventory/bundles/modals";
import type { IProduct, IMediaFile } from "@/mocks/products/types";
import type { IBundleDetailsMockData } from "@/mocks/products/bundle-details";
import type {
  IBundleGroup,
  IDependencyRule,
} from "@/domains/inventory/products/modals/edit-components-modal/types";

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
  const { push: openDependencyChartModal } = useDependencyChartModal();

  // State
  const [groups, setGroups] = useState<IBundleGroup[]>(mockData.bundleItems);
  const [dependencyRules, setDependencyRules] = useState<IDependencyRule[]>(
    mockData.dependencyRules
  );

  // ========================================
  // Modal Handlers
  // ========================================

  const handleEditGroups = useCallback(() => {
    openEditGroupsModal({
      groups,
      onSave: (updatedGroups: IBundleGroup[]) => {
        setGroups(updatedGroups);
      },
    });
  }, [groups, openEditGroupsModal]);

  const handleOpenChart = useCallback(() => {
    openDependencyChartModal({
      groups,
      rules: dependencyRules,
      onSave: (updatedRules: IDependencyRule[]) => {
        setDependencyRules(updatedRules);
      },
    });
  }, [groups, dependencyRules, openDependencyChartModal]);

  const handleAddRule = useCallback(() => {
    const maxPriority = Math.max(0, ...dependencyRules.map((r) => r.priority));
    const newRule: IDependencyRule = {
      id: `rule-${Date.now()}`,
      name: "",
      enabled: true,
      priority: maxPriority + 100,
      conditions: [],
      actions: [],
    };
    openDependencyChartModal({
      groups,
      rules: [newRule],
      selectedRuleId: newRule.id,
      onSave: (updatedRules: IDependencyRule[]) => {
        setDependencyRules([...dependencyRules, ...updatedRules]);
      },
    });
  }, [groups, dependencyRules, openDependencyChartModal]);

  const handleEditRule = useCallback(
    (ruleId: string) => {
      const rule = dependencyRules.find((r) => r.id === ruleId);
      if (!rule) return;
      openDependencyChartModal({
        groups,
        rules: [rule],
        selectedRuleId: ruleId,
        onSave: (updatedRules: IDependencyRule[]) => {
          const updatedRule = updatedRules[0];
          if (updatedRule) {
            setDependencyRules(
              dependencyRules.map((r) => (r.id === updatedRule.id ? updatedRule : r))
            );
          }
        },
      });
    },
    [groups, dependencyRules, openDependencyChartModal]
  );

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

  const handleEditReviews = useCallback(() => {
    console.log("Edit reviews");
  }, []);

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

      {/* CATEGORIES */}
      <CategoriesSection
        primaryCategory={mockData.categories.primary}
        categories={mockData.categories.list}
      />

      {/* BUNDLE ITEMS */}
      <GroupsSection groups={groups} onEdit={handleEditGroups} />

      {/* DEPENDENCY RULES */}
      <DependencyRulesSection
        dependencyRules={dependencyRules}
        groups={groups}
        onOpenChart={handleOpenChart}
        onAddRule={handleAddRule}
        onEditRule={handleEditRule}
      />

      {/* REVIEWS */}
      <ReviewsSection
        rating={mockData.reviews.rating}
        reviewsCount={mockData.reviews.reviewsCount}
        breakdown={mockData.reviews.breakdown}
        onEdit={handleEditReviews}
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
