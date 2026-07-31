"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Flex } from "antd";
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
  ComponentsSection,
} from "./sections";
import { useProductModals } from "./hooks";
import type {
  ApiProduct,
  ApiProductComponentDependencyRule,
  ApiProductComponentGroup,
  ApiProductComponentOperationInput,
  ApiProductComponentPricingTemplate,
} from "@/graphql/types";
import {
  ProductComponentLogicOperator,
  ProductComponentOperationAction,
} from "@/graphql/types";
import type { IVariantsTableData } from "./types";
import {
  getProductCategories,
  getProductMediaFiles,
  getProductPrimaryCategory,
} from "../../utils/api-product-display";
import {
  useDependencyChartModal,
  useEditComponentConfigurationModal,
  useEditComponentGroupsModal,
  useEditComponentTemplatesModal,
} from "@/domains/inventory/products/modals";
import { useUpdateProduct } from "../../hooks";
import {
  toProductComponentDependencyRulesInput,
  toProductComponentGroupsInput,
  toProductComponentPricingTemplatesInput,
} from "../../mappers";

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
  const { message } = App.useApp();
  const defaultCurrency = useDefaultCurrency();
  const { updateProduct } = useUpdateProduct();
  const modals = useProductModals(product, {
    onProductRefresh,
    defaultCurrency,
  });
  const reviewsWidget = useProductReviewsWidget(product.id);
  const { push: openProductInsights } = useProductInsightsModal();
  const { push: openEditGroupsModal } = useEditComponentGroupsModal();
  const { push: openEditConfigurationModal } =
    useEditComponentConfigurationModal();
  const { push: openEditTemplatesModal } = useEditComponentTemplatesModal();
  const { push: openDependencyChartModal } = useDependencyChartModal();
  const configurations = product.productComponent?.configurations ?? [];
  const [activeConfigurationId, setActiveConfigurationId] = useState("");
  const activeConfiguration = useMemo(
    () =>
      configurations.find(
        (configuration) => configuration.id === activeConfigurationId,
      ) ?? configurations[0],
    [activeConfigurationId, configurations],
  );
  const groups = activeConfiguration?.groups ?? [];
  const dependencyRules = activeConfiguration?.dependencyRules ?? [];
  const shouldRenderVariantsSection =
    !!variantsTableData &&
    (variantsTableData.totalCount > 0 || product.variantsCount > 0);

  const handleEdit = (section: string) => onEditSection?.(section);

  useEffect(() => {
    if (
      configurations.length > 0 &&
      !configurations.some(({ id }) => id === activeConfigurationId)
    ) {
      setActiveConfigurationId(configurations[0].id);
    }
    if (configurations.length === 0 && activeConfigurationId) {
      setActiveConfigurationId("");
    }
  }, [activeConfigurationId, configurations]);

  const saveComponentOperation = useCallback(
    async (
      operation: ApiProductComponentOperationInput,
      successMessage: string,
    ) => {
      const result = await updateProduct({
        productId: product.id,
        expectedRevision: product.revision,
        operations: { components: [operation] },
      });

      if (result.errors.length > 0) {
        message.error(result.errors[0].message);
        return null;
      }

      if (onProductRefresh) {
        try {
          await onProductRefresh();
        } catch {
          message.warning(`${successMessage}, but refresh failed`);
          return result;
        }
      }

      message.success(successMessage);
      return result;
    },
    [message, onProductRefresh, product.id, product.revision, updateProduct],
  );

  const handleCreateConfiguration = useCallback(
    () => {
      openEditConfigurationModal({
        title: `Configuration ${configurations.length + 1}`,
        modalTitle: "New Component Configuration",
        submitLabel: "Create",
        onSave: async ({ title }: { title: string }) => {
          const clientMutationId = crypto.randomUUID();
          const result = await saveComponentOperation(
            {
              action: ProductComponentOperationAction.ConfigurationCreate,
              clientMutationId,
              name: title,
            },
            "Component configuration created",
          );
          const createdConfigurationId = result?.operationResults.find(
            (operationResult) =>
              operationResult.clientMutationId === clientMutationId,
          )?.entityId;
          if (createdConfigurationId) {
            setActiveConfigurationId(createdConfigurationId);
          }
          return !!result;
        },
      });
    },
    [configurations.length, openEditConfigurationModal, saveComponentOperation],
  );

  const handleEditConfiguration = useCallback(
    (configurationId: string) => {
      const configuration = configurations.find(
        (item) => item.id === configurationId,
      );

      if (!configuration) return;

      openEditConfigurationModal({
        title: configuration.name,
        modalTitle: "Edit Component Configuration",
        onSave: async ({ title }: { title: string }) => {
          const result = await saveComponentOperation(
            {
              action: ProductComponentOperationAction.ConfigurationUpdate,
              configurationId,
              name: title,
            },
            "Component configuration updated",
          );
          return !!result;
        },
      });
    },
    [configurations, openEditConfigurationModal, saveComponentOperation],
  );

  const handleDeleteConfiguration = useCallback(
    async (configurationId: string) => {
      const result = await saveComponentOperation(
        {
          action: ProductComponentOperationAction.ConfigurationDelete,
          configurationId,
        },
        "Component configuration deleted",
      );
      return !!result;
    },
    [saveComponentOperation],
  );

  const handleEditGroups = useCallback(() => {
    openEditGroupsModal({
      groups,
      pricingTemplates: activeConfiguration?.pricingTemplates ?? [],
      onSave: async (updatedGroups: ApiProductComponentGroup[]) => {
        if (!activeConfiguration || !defaultCurrency) {
          message.error("Store currency is unavailable");
          return false;
        }
        const result = await saveComponentOperation(
          {
            action: ProductComponentOperationAction.GroupsSync,
            configurationId: activeConfiguration.id,
            groups: toProductComponentGroupsInput(
              updatedGroups,
              defaultCurrency,
            ),
          },
          "Component items updated",
        );
        return !!result;
      },
    });
  }, [
    activeConfiguration?.id,
    groups,
    openEditGroupsModal,
    activeConfiguration?.pricingTemplates,
    defaultCurrency,
    message,
    saveComponentOperation,
  ]);

  const handleEditTemplates = useCallback(() => {
    if (!activeConfiguration) return;
    openEditTemplatesModal({
      pricingTemplates: activeConfiguration.pricingTemplates,
      onSave: async ({
        pricingTemplates,
      }: {
        pricingTemplates: ApiProductComponentPricingTemplate[];
      }) => {
        if (!defaultCurrency) {
          message.error("Store currency is unavailable");
          return false;
        }
        const result = await saveComponentOperation(
          {
            action: ProductComponentOperationAction.PricingTemplatesSync,
            configurationId: activeConfiguration.id,
            pricingTemplates: toProductComponentPricingTemplatesInput(
              pricingTemplates,
              defaultCurrency,
            ),
          },
          "Component pricing templates updated",
        );
        return !!result;
      },
    });
  }, [
    activeConfiguration,
    defaultCurrency,
    message,
    openEditTemplatesModal,
    saveComponentOperation,
  ]);

  const handleOpenChart = useCallback(() => {
    openDependencyChartModal({
      groups,
      rules: dependencyRules,
      onSave: async (updatedRules: ApiProductComponentDependencyRule[]) => {
        if (!activeConfiguration || !defaultCurrency) {
          message.error("Store currency is unavailable");
          return false;
        }
        const result = await saveComponentOperation(
          {
            action: ProductComponentOperationAction.DependencyRulesSync,
            configurationId: activeConfiguration.id,
            dependencyRules: toProductComponentDependencyRulesInput(
              updatedRules,
              activeConfiguration.id,
              defaultCurrency,
            ),
          },
          "Component dependency rules updated",
        );
        return !!result;
      },
    });
  }, [
    dependencyRules,
    groups,
    openDependencyChartModal,
    activeConfiguration,
    defaultCurrency,
    message,
    saveComponentOperation,
  ]);

  const handleAddRule = useCallback(() => {
    const maxPriority = Math.max(
      0,
      ...dependencyRules.map((rule) => rule.priority),
    );
    const now = new Date().toISOString();
    const newRule: ApiProductComponentDependencyRule = {
      __typename: "ProductComponentDependencyRule",
      id: `rule-${Date.now()}`,
      name: "",
      enabled: true,
      priority: maxPriority + 100,
      logicOperator: ProductComponentLogicOperator.And,
      conditionGroups: [],
      actions: [],
      createdAt: now,
      updatedAt: now,
    };

    openDependencyChartModal({
      groups,
      rules: [...dependencyRules, newRule],
      selectedRuleId: newRule.id,
      onSave: async (updatedRules: ApiProductComponentDependencyRule[]) => {
        if (!activeConfiguration || !defaultCurrency) {
          message.error("Store currency is unavailable");
          return false;
        }
        const result = await saveComponentOperation(
          {
            action: ProductComponentOperationAction.DependencyRulesSync,
            configurationId: activeConfiguration.id,
            dependencyRules: toProductComponentDependencyRulesInput(
              updatedRules,
              activeConfiguration.id,
              defaultCurrency,
            ),
          },
          "Component dependency rules updated",
        );
        return !!result;
      },
    });
  }, [
    dependencyRules,
    groups,
    openDependencyChartModal,
    activeConfiguration,
    defaultCurrency,
    message,
    saveComponentOperation,
  ]);

  const handleEditRule = useCallback(
    (ruleId: string) => {
      openDependencyChartModal({
        groups,
        rules: dependencyRules,
        selectedRuleId: ruleId,
        onSave: async (updatedRules: ApiProductComponentDependencyRule[]) => {
          if (!activeConfiguration || !defaultCurrency) {
            message.error("Store currency is unavailable");
            return false;
          }
          const result = await saveComponentOperation(
            {
              action: ProductComponentOperationAction.DependencyRulesSync,
              configurationId: activeConfiguration.id,
              dependencyRules: toProductComponentDependencyRulesInput(
                updatedRules,
                activeConfiguration.id,
                defaultCurrency,
              ),
            },
            "Component dependency rules updated",
          );
          return !!result;
        },
      });
    },
    [
      dependencyRules,
      groups,
      openDependencyChartModal,
      activeConfiguration,
      defaultCurrency,
      message,
      saveComponentOperation,
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

      {/* COMPONENT CONFIGURATIONS */}
      <ComponentsSection
        configurations={configurations}
        activeConfigurationId={activeConfiguration?.id ?? ""}
        onConfigurationChange={setActiveConfigurationId}
        onCreateConfiguration={handleCreateConfiguration}
        onEditConfiguration={handleEditConfiguration}
        onDeleteConfiguration={handleDeleteConfiguration}
        onEditGroups={handleEditGroups}
        onEditTemplates={handleEditTemplates}
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
