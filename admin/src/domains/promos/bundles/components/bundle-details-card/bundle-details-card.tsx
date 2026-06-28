"use client";

import {
  useState,
  useCallback,
  useMemo } from "react";
import { App, Flex } from "antd";
import { ProductInfoHeader } from "@/domains/inventory/products/components/product-info-header";
import { ProductContentTabs } from "@/domains/inventory/products/components/product-content-tabs";
import { PricingBlock } from "@/domains/inventory/products/components/pricing/pricing-block";
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
  BundleSection,
  } from "./sections";
import {
  useEditMediaModal,
  useEditSeoModal,
  IEditMediaModalPayload,
  IEditSeoModalPayload,
  } from "@/domains/inventory/products/modals";
import {
  useEditBundleGroupsModal,
  useDependencyChartModal,
  } from "@/domains/promos/bundles/modals";
import { EntityStatus,
  IProduct } from "@/mocks/products/types";
import type { IBundleDetailsMockData } from "@/mocks/products/bundle-details";
import type {
  IBundleGroup,
  } from "@/domains/promos/bundles/types";
import { LogicOperator,
} from "@/domains/promos/bundles/dependency-rules";
import type { IDependencyRule } from "@/domains/promos/bundles/dependency-rules/types";
import { createMockApiProduct } from "@/mocks/products/api-builders";
import type { ApiProductFeature } from "@/graphql/types";

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
  const { message } = App.useApp();
  const { push: openEditMediaModal } = useEditMediaModal();
  const { push: openEditSeoModal } = useEditSeoModal();
  const { push: openEditGroupsModal } = useEditBundleGroupsModal();
  const { push: openDependencyChartModal } = useDependencyChartModal();

  // State
  const [groups, setGroups] = useState<IBundleGroup[]>(mockData.bundleItems);
  const [dependencyRules, setDependencyRules] = useState<IDependencyRule[]>(
    mockData.dependencyRules
  );
  const apiProduct = useMemo(
    () =>
      createMockApiProduct({
        id: product.id,
        title: product.title,
        handle: product.slug,
        isPublished: product.status === EntityStatus.PUBLISHED,
        description: product.description,
        excerpt: null,
        variants: [],
        options: [],
        categories: [
          ...(mockData.categories.primary ? [mockData.categories.primary] : []),
          ...mockData.categories.list,
        ],
        tags: mockData.tags,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        deletedAt:
          product.status === EntityStatus.ARCHIVED
            ? product.updatedAt.toISOString()
            : null,
      }),
    [product, mockData.categories.primary, mockData.categories.list, mockData.tags],
  );
  const attributeFeatures = useMemo<ApiProductFeature[]>(() => {
    const rowsById = new Map(mockData.attributes.map((row) => [row.id, row]));

    return mockData.attributes.map((row) => {
      const parent = row.parentId ? rowsById.get(row.parentId) : null;

      return {
        __typename: "ProductFeature",
        id: row.id,
        name: row.name,
        slug: row.name.toLocaleLowerCase().replace(/\s+/g, "-"),
        isGroup: row.type === "group",
        index: parent ? [parent.sortIndex, row.sortIndex] : [row.sortIndex],
        children: [],
        parent: undefined,
        values:
          row.type === "attribute"
            ? (row.values ?? []).map((value) => ({
                __typename: "ProductFeatureValue",
                id: value.id,
                name: value.name,
                slug: value.slug,
                index: value.sortIndex,
              }))
            : [],
      };
    });
  }, [mockData.attributes]);

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
      logicOperator: LogicOperator.AND,
      conditionGroups: [],
      actions: [],
    };
    openDependencyChartModal({
      groups,
      rules: [...dependencyRules, newRule],
      selectedRuleId: newRule.id,
      onSave: (updatedRules: IDependencyRule[]) => {
        setDependencyRules(updatedRules);
      },
    });
  }, [groups, dependencyRules, openDependencyChartModal]);

  const handleEditRule = useCallback(
    (ruleId: string) => {
      openDependencyChartModal({
        groups,
        rules: dependencyRules,
        selectedRuleId: ruleId,
        onSave: (updatedRules: IDependencyRule[]) => {
          setDependencyRules(updatedRules);
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
      onSave: (
        media: Parameters<NonNullable<IEditMediaModalPayload["onSave"]>>[0],
      ) => {
        console.log("Saved media:", media);
      },
    });
  }, [product.id, product.featured, product.gallery, openEditMediaModal]);

  const handleEditAttributes = useCallback(() => {
    message.info("Bundle attribute updates are not API-backed yet");
  }, [message]);

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
      <ProductInfoHeader product={apiProduct} />

      {/* CONTENT TABS */}
      <ProductContentTabs product={apiProduct} />

      {/* PRICING */}
      <PricingBlock productId={product.id} />

      {/* MEDIA */}
      <MediaSection mediaFiles={product.gallery} onEdit={handleEditMedia} />

      {/* CATEGORIES */}
      <CategoriesSection
        primaryCategory={mockData.categories.primary}
        categories={mockData.categories.list}
      />

      {/* BUNDLE */}
      <BundleSection
        groups={groups}
        bundleType={mockData.bundleType}
        dependencyRules={dependencyRules}
        onEditGroups={handleEditGroups}
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
        features={attributeFeatures}
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
