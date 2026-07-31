"use client";

import { useCallback, useMemo, useState } from "react";
import { Flex } from "antd";
import { ProductInfoHeader } from "../product-info-header";
import { ProductContentTabs } from "../product-content-tabs";
import { PricingBlock } from "../pricing/pricing-block";
import { SeoBlock } from "../seo";
import { AttributesSection } from "../attributes-section";
import { EditAction } from "../edit-action";
import { useDefaultCurrency } from "@/domains/workspace";
import { useProductReviewsWidget } from "@/domains/customer-content/reviews/hooks";
import { useProductInsightsModal } from "@/domains/customer-content/management/modals";
import {
  MediaSection,
  CategoriesSection,
  TagsSection,
  ReviewsSection,
  OptionsSection,
  InventorySection,
  VariantsTableSection,
} from "./sections";
import { useProductModals } from "./hooks";
import type { ApiProduct } from "@/graphql/types";
import type { IVariantsTableData } from "./types";
import {
  getProductCategories,
  getProductMediaFiles,
  getProductPrimaryCategory,
} from "../../utils/api-product-display";
import { BundleSection } from "@/domains/inventory/bundles/components/bundle-details-card/sections";
import {
  useDependencyChartModal,
  useEditBundleConfigurationModal,
  useEditBundleGroupsModal,
} from "@/domains/inventory/bundles/modals";
import type {
  IBundleConfiguration,
  IBundleGroup,
} from "@/domains/inventory/bundles/types";
import {
  LogicOperator,
  type IDependencyRule,
} from "@/domains/inventory/bundles/dependency-rules";
import { bundleDetailsMockData } from "@/mocks/products/bundle-details";

// ============================================================================
// Main Component
// ============================================================================

interface IProductDetailsCardProps {
  product: ApiProduct;
  variantsTableData?: IVariantsTableData;
  onEditSection?: (section: string) => void;
  onVariantsPageChange?: (direction: "next" | "prev") => void;
  isVariantsPageLoading?: boolean;
  onProductRefresh?: () => Promise<unknown>;
}

export const ProductDetailsCard = ({
  product,
  variantsTableData,
  onEditSection,
  onVariantsPageChange,
  isVariantsPageLoading = false,
  onProductRefresh,
}: IProductDetailsCardProps) => {
  const defaultCurrency = useDefaultCurrency();
  const modals = useProductModals(product, {
    onProductRefresh,
    defaultCurrency,
  });
  const reviewsWidget = useProductReviewsWidget(product.id);
  const { push: openProductInsights } = useProductInsightsModal();
  const { push: openEditGroupsModal } = useEditBundleGroupsModal();
  const { push: openEditConfigurationModal } =
    useEditBundleConfigurationModal();
  const { push: openDependencyChartModal } = useDependencyChartModal();
  const [activeConfigurationId, setActiveConfigurationId] = useState(
    bundleDetailsMockData.configurations[0]?.id ?? "",
  );
  const [configurations, setConfigurations] = useState<IBundleConfiguration[]>(
    bundleDetailsMockData.configurations,
  );
  const activeConfiguration = useMemo(
    () =>
      configurations.find(
        (configuration) => configuration.id === activeConfigurationId,
      ) ?? configurations[0],
    [activeConfigurationId, configurations],
  );
  const groups = activeConfiguration?.bundleItems ?? [];
  const dependencyRules = activeConfiguration?.dependencyRules ?? [];
  const shouldRenderVariantsSection =
    !!variantsTableData &&
    (variantsTableData.totalCount > 0 || product.variantsCount > 0);

  const handleEdit = (section: string) => onEditSection?.(section);

  const updateActiveConfiguration = useCallback(
    (updater: (configuration: IBundleConfiguration) => IBundleConfiguration) => {
      setConfigurations((currentConfigurations) =>
        currentConfigurations.map((configuration) =>
          configuration.id === activeConfiguration?.id
            ? updater(configuration)
            : configuration,
        ),
      );
    },
    [activeConfiguration?.id],
  );

  const handleCreateConfiguration = useCallback(
    (sourceConfigurationId?: string) => {
      openEditConfigurationModal({
        title: `Configuration ${configurations.length + 1}`,
        modalTitle: "New Bundle Configuration",
        submitLabel: "Create",
        onSave: ({ title }: { title: string }) => {
          const newConfigurationId = `bundle-config-${Date.now()}`;

          setConfigurations((currentConfigurations) => {
            const sourceConfiguration =
              currentConfigurations.find(
                (configuration) => configuration.id === sourceConfigurationId,
              ) ??
              currentConfigurations.find(
                (configuration) =>
                  configuration.id === activeConfigurationId,
              ) ??
              currentConfigurations[0];

            if (!sourceConfiguration) return currentConfigurations;

            return [
              ...currentConfigurations,
              { ...sourceConfiguration, id: newConfigurationId, title },
            ];
          });
          setActiveConfigurationId(newConfigurationId);
        },
      });
    },
    [
      activeConfigurationId,
      configurations.length,
      openEditConfigurationModal,
    ],
  );

  const handleEditConfiguration = useCallback(
    (configurationId: string) => {
      const configuration = configurations.find(
        (item) => item.id === configurationId,
      );

      if (!configuration) return;

      openEditConfigurationModal({
        title: configuration.title,
        modalTitle: "Edit Bundle Configuration",
        onSave: ({ title }: { title: string }) => {
          setConfigurations((currentConfigurations) =>
            currentConfigurations.map((item) =>
              item.id === configurationId ? { ...item, title } : item,
            ),
          );
        },
      });
    },
    [configurations, openEditConfigurationModal],
  );

  const handleDeleteConfiguration = useCallback(
    (configurationId: string) => {
      setConfigurations((currentConfigurations) => {
        if (currentConfigurations.length <= 1) return currentConfigurations;

        const configurationIndex = currentConfigurations.findIndex(
          (configuration) => configuration.id === configurationId,
        );
        const nextConfigurations = currentConfigurations.filter(
          (configuration) => configuration.id !== configurationId,
        );

        if (configurationId === activeConfigurationId) {
          const nextActiveConfiguration =
            nextConfigurations[Math.max(0, configurationIndex - 1)] ??
            nextConfigurations[0];
          setActiveConfigurationId(nextActiveConfiguration?.id ?? "");
        }

        return nextConfigurations;
      });
    },
    [activeConfigurationId],
  );

  const handleEditGroups = useCallback(() => {
    openEditGroupsModal({
      groups,
      pricingTemplates: bundleDetailsMockData.pricingTemplates,
      onSave: (updatedGroups: IBundleGroup[]) => {
        updateActiveConfiguration((configuration) => ({
          ...configuration,
          bundleItems: updatedGroups,
        }));
      },
    });
  }, [groups, openEditGroupsModal, updateActiveConfiguration]);

  const handleOpenChart = useCallback(() => {
    openDependencyChartModal({
      groups,
      rules: dependencyRules,
      onSave: (updatedRules: IDependencyRule[]) => {
        updateActiveConfiguration((configuration) => ({
          ...configuration,
          dependencyRules: updatedRules,
        }));
      },
    });
  }, [
    dependencyRules,
    groups,
    openDependencyChartModal,
    updateActiveConfiguration,
  ]);

  const handleAddRule = useCallback(() => {
    const maxPriority = Math.max(
      0,
      ...dependencyRules.map((rule) => rule.priority),
    );
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
        updateActiveConfiguration((configuration) => ({
          ...configuration,
          dependencyRules: updatedRules,
        }));
      },
    });
  }, [
    dependencyRules,
    groups,
    openDependencyChartModal,
    updateActiveConfiguration,
  ]);

  const handleEditRule = useCallback(
    (ruleId: string) => {
      openDependencyChartModal({
        groups,
        rules: dependencyRules,
        selectedRuleId: ruleId,
        onSave: (updatedRules: IDependencyRule[]) => {
          updateActiveConfiguration((configuration) => ({
            ...configuration,
            dependencyRules: updatedRules,
          }));
        },
      });
    },
    [
      dependencyRules,
      groups,
      openDependencyChartModal,
      updateActiveConfiguration,
    ],
  );

  return (
    <Flex vertical gap={12} style={{ width: "100%" }}>
      {/* PRODUCT INFORMATION */}
      <ProductInfoHeader product={product} onProductRefresh={onProductRefresh} />

      {/* CONTENT TABS */}
      <ProductContentTabs product={product} />

      {/* PRICING */}
      <PricingBlock
        product={product}
        onProductRefresh={onProductRefresh}
      />

      {/* MEDIA SECTION */}
      <MediaSection mediaFiles={getProductMediaFiles(product)} onEdit={modals.editMedia} />

      {/* INVENTORY */}
      <InventorySection
        product={product}
      />

      {/* CATEGORIES & TAGS */}

      <CategoriesSection
        productId={product.id}
        primaryCategory={getProductPrimaryCategory(product)}
        categories={getProductCategories(product)}
        onProductRefresh={onProductRefresh}
      />

      {/* BUNDLE CONFIGURATIONS */}
      <BundleSection
        configurations={configurations}
        activeConfigurationId={activeConfiguration?.id ?? ""}
        bundleType={bundleDetailsMockData.bundleType}
        onConfigurationChange={setActiveConfigurationId}
        onCreateConfiguration={handleCreateConfiguration}
        onEditConfiguration={handleEditConfiguration}
        onDeleteConfiguration={handleDeleteConfiguration}
        onEditGroups={handleEditGroups}
        onOpenChart={handleOpenChart}
        onAddRule={handleAddRule}
        onEditRule={handleEditRule}
      />

      {/* REVIEWS */}
      <ReviewsSection
        summary={reviewsWidget.data?.reviewSummary ?? null}
        loading={reviewsWidget.loading}
        error={reviewsWidget.error}
        onEdit={() => handleEdit("reviews")}
        onViewInsights={() => openProductInsights({
          product: { id: product.id, title: product.title, handle: product.handle },
        })}
      />

      {/* ATTRIBUTES */}
      <AttributesSection
        features={product.features}
        actions={
          <EditAction
            onEdit={modals.editAttributes}
            label="Edit attributes"
            testId="product-attributes-actions-button"
          />
        }
      />

      {/* OPTIONS */}
      <OptionsSection
        options={product.options}
        actions={
          <EditAction
            onEdit={modals.editOptions}
            label="Edit options"
            testId="product-options-actions-button"
          />
        }
      />

      {/* VARIANTS TABLE */}
      {shouldRenderVariantsSection && variantsTableData && (
        <VariantsTableSection
          variants={variantsTableData.variants}
          productOptions={product.options}
          pageInfo={variantsTableData.pageInfo}
          totalCount={variantsTableData.totalCount}
          defaultCurrency={defaultCurrency}
          onEdit={modals.editVariants}
          isEditLoading={modals.isEditVariantsLoading}
          isPageLoading={isVariantsPageLoading}
          onPageChange={onVariantsPageChange}
        />
      )}

      <TagsSection
        productId={product.id}
        productRevision={product.revision}
        tags={product.tags}
        onProductRefresh={onProductRefresh}
      />

      {/* SEO */}
      <SeoBlock
        data={{
          seoTitle: product.seo?.seoTitle ?? null,
          seoDescription: product.seo?.seoDescription ?? null,
          ogTitle: product.seo?.ogTitle ?? null,
          ogDescription: product.seo?.ogDescription ?? null,
          ogImage: product.seo?.ogImage ?? null,
          title: product.title,
          excerpt: product.excerpt?.text ?? null,
          slug: product.handle ?? product.id,
        }}
        actions={
          <EditAction
            label="Edit SEO"
            onEdit={modals.editSeo}
            testId="product-seo-actions-button"
          />
        }
      />
    </Flex>
  );
};
