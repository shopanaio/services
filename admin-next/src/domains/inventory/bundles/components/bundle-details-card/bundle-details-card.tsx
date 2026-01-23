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
import { useComponentVariantSettingsModal } from "@/domains/inventory/products/modals";
import type { IProduct, IMediaFile } from "@/mocks/products/types";
import type { IBundleDetailsMockData } from "@/mocks/products/bundle-details";
import type {
  IComponentGroup,
  ComponentItem,
  PricingRuleTemplate,
  IDependencyRule,
  IBundleSettings,
} from "@/domains/inventory/products/modals/edit-components-modal/types";
import { ComponentItemType } from "@/domains/inventory/products/modals/edit-components-modal/types";

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
  const { push: openVariantSettingsModal } = useComponentVariantSettingsModal();

  // Component state (same as edit-components-modal)
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
  const [expandedProducts, setExpandedProducts] = useState<
    Map<string, ComponentItem>
  >(new Map());

  // ========================================
  // Groups Handlers
  // ========================================

  const handleGroupsChange = useCallback(
    (newGroups: IComponentGroup[]) => {
      const productsToRestore: Array<{
        productId: string;
        groupId: string;
        firstVariantIndex: number;
      }> = [];

      expandedProducts.forEach((_, productId) => {
        for (const group of newGroups) {
          const hasVariantsOfProduct = group.items.some(
            (item) =>
              item.itemType === ComponentItemType.VARIANT &&
              item.assignedVariant?.product?.id === productId
          );

          if (!hasVariantsOfProduct) {
            const currentGroup = groups.find((g) => g.id === group.id);
            const hadVariants = currentGroup?.items.some(
              (item) =>
                item.itemType === ComponentItemType.VARIANT &&
                item.assignedVariant?.product?.id === productId
            );

            if (hadVariants) {
              const firstVariantIndex =
                currentGroup?.items.findIndex(
                  (item) =>
                    item.itemType === ComponentItemType.VARIANT &&
                    item.assignedVariant?.product?.id === productId
                ) ?? 0;
              productsToRestore.push({
                productId,
                groupId: group.id,
                firstVariantIndex,
              });
            }
          }
        }
      });

      if (productsToRestore.length > 0) {
        let updatedGroups = newGroups;

        for (const { productId, groupId, firstVariantIndex } of productsToRestore) {
          const storedProduct = expandedProducts.get(productId);
          if (!storedProduct) continue;

          updatedGroups = updatedGroups.map((g) => {
            if (g.id !== groupId) return g;
            const newItems = [...g.items];
            newItems.splice(firstVariantIndex, 0, {
              ...storedProduct,
              sortIndex: firstVariantIndex,
            });
            return {
              ...g,
              items: newItems.map((item, idx) => ({ ...item, sortIndex: idx })),
            };
          });

          setExpandedProducts((prev) => {
            const newMap = new Map(prev);
            newMap.delete(productId);
            return newMap;
          });
        }

        setGroups(updatedGroups);
      } else {
        setGroups(newGroups);
      }
    },
    [expandedProducts, groups]
  );

  const handleEditVariants = useCallback(
    (item: ComponentItem, groupId: string) => {
      if (item.itemType !== ComponentItemType.PRODUCT || !item.assignedProduct) {
        return;
      }

      const assignedProduct = item.assignedProduct;
      const variantsFromConnection =
        assignedProduct.variants?.edges?.map((e) => e.node) ?? [];

      const priceType =
        "id" in item.pricingRule ? "BASE" : item.pricingRule.priceType;
      const priceValue =
        "id" in item.pricingRule ? null : item.pricingRule.priceValue;

      openVariantSettingsModal({
        itemId: item.id,
        productId: assignedProduct.id,
        productTitle: item.title ?? assignedProduct.title,
        availableVariantIds: item.excludeAssignedProductVariants ?? null,
        priceType: priceType as
          | "BASE"
          | "FIXED"
          | "MARKUP_PERCENT"
          | "DISCOUNT_PERCENT"
          | "MARKUP_FIXED"
          | "DISCOUNT_FIXED"
          | "FREE"
          | "INCLUDED",
        priceValue,
        variants: variantsFromConnection.map((v) => ({
          id: v.id,
          title: v.title ?? v.sku ?? v.id,
          sku: v.sku ?? "",
          price:
            typeof v.price?.amountMinor === "bigint"
              ? Number(v.price.amountMinor)
              : typeof v.price?.amountMinor === "number"
              ? v.price.amountMinor
              : 0,
          stock: v.stock?.[0]?.quantityOnHand ?? 0,
          options: v.selectedOptions?.map((o) => ({
            optionId: o.optionId,
            value: o.optionValueId,
          })),
        })),
        options: assignedProduct.options?.map((o) => ({
          id: o.id,
          name: o.name,
          values: o.values?.map((v) => v.name) ?? [],
        })),
        showAsVariants: false,
        onSave: (data: {
          availableVariantIds: string[] | null;
          showAsVariants: boolean;
        }) => {
          setGroups((prev) =>
            prev.map((g) =>
              g.id === groupId
                ? {
                    ...g,
                    items: g.items.map((i) =>
                      i.id === item.id
                        ? { ...i, excludeAssignedProductVariants: data.availableVariantIds }
                        : i
                    ),
                  }
                : g
            )
          );
        },
      });
    },
    [openVariantSettingsModal]
  );

  const handleIncludeVariants = useCallback(
    (item: ComponentItem, groupId: string) => {
      if (item.itemType !== ComponentItemType.PRODUCT || !item.assignedProduct) {
        return;
      }

      const assignedProduct = item.assignedProduct;
      const variantsFromConnection =
        assignedProduct.variants?.edges?.map((e) => e.node) ?? [];

      if (variantsFromConnection.length === 0) return;

      setExpandedProducts((prev) => new Map(prev).set(assignedProduct.id, item));

      const variantItems: ComponentItem[] = variantsFromConnection.map(
        (variant, index) => ({
          id: `item-${Date.now()}-${index}`,
          itemType: ComponentItemType.VARIANT,
          assignedVariant: variant,
          sortIndex: item.sortIndex + index + 1,
          pricingRule: item.pricingRule,
          title: item.title,
          featuredImage: item.featuredImage,
        })
      );

      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g;
          const itemIndex = g.items.findIndex((i) => i.id === item.id);
          const newItems = [...g.items];
          newItems.splice(itemIndex, 1, ...variantItems);
          return {
            ...g,
            items: newItems.map((i, idx) => ({ ...i, sortIndex: idx })),
          };
        })
      );
    },
    []
  );

  const handleShowAsProduct = useCallback(
    (item: ComponentItem, groupId: string) => {
      if (item.itemType !== ComponentItemType.VARIANT || !item.assignedVariant) {
        return;
      }

      const productId = item.assignedVariant.product?.id;
      if (!productId) return;

      const storedProduct = expandedProducts.get(productId);
      if (!storedProduct) return;

      setExpandedProducts((prev) => {
        const newMap = new Map(prev);
        newMap.delete(productId);
        return newMap;
      });

      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g;
          const firstVariantIndex = g.items.findIndex(
            (i) =>
              i.itemType === ComponentItemType.VARIANT &&
              i.assignedVariant?.product?.id === productId
          );
          if (firstVariantIndex === -1) return g;

          const newItems = g.items.filter(
            (i) =>
              !(
                i.itemType === ComponentItemType.VARIANT &&
                i.assignedVariant?.product?.id === productId
              )
          );
          newItems.splice(firstVariantIndex, 0, {
            ...storedProduct,
            sortIndex: firstVariantIndex,
          });
          return {
            ...g,
            items: newItems.map((i, idx) => ({ ...i, sortIndex: idx })),
          };
        })
      );
    },
    [expandedProducts]
  );

  // ========================================
  // Settings Handlers
  // ========================================

  const handleDisplayStyleChange = useCallback(
    (style: IBundleSettings["displayStyle"]) => {
      setBundleSettings((prev) => ({ ...prev, displayStyle: style }));
    },
    []
  );

  const handleShowImagesChange = useCallback((value: boolean) => {
    setBundleSettings((prev) => ({ ...prev, showImages: value }));
  }, []);

  const handleShowSkuChange = useCallback((value: boolean) => {
    setBundleSettings((prev) => ({ ...prev, showSku: value }));
  }, []);

  const handleShowStockChange = useCallback((value: boolean) => {
    setBundleSettings((prev) => ({ ...prev, showStock: value }));
  }, []);

  const handleShowComparePriceChange = useCallback((value: boolean) => {
    setBundleSettings((prev) => ({ ...prev, showComparePrice: value }));
  }, []);

  const handleOutOfStockBehaviorChange = useCallback(
    (value: IBundleSettings["outOfStockBehavior"]) => {
      setBundleSettings((prev) => ({ ...prev, outOfStockBehavior: value }));
    },
    []
  );

  const handleInheritStockChange = useCallback((value: boolean) => {
    setBundleSettings((prev) => ({ ...prev, inheritStock: value }));
  }, []);

  // ========================================
  // Other Modal Handlers
  // ========================================

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
      <GroupsSection
        groups={groups}
        onGroupsChange={handleGroupsChange}
        onEditVariants={handleEditVariants}
        onIncludeVariants={handleIncludeVariants}
        onShowAsProduct={handleShowAsProduct}
        pricingTemplates={pricingTemplates}
      />

      {/* PRICING & DEPENDENCY RULES */}
      <PricingSection
        pricingTemplates={pricingTemplates}
        onPricingTemplatesChange={setPricingTemplates}
        dependencyRules={dependencyRules}
        onDependencyRulesChange={setDependencyRules}
        groups={groups}
      />

      {/* BUNDLE SETTINGS */}
      <SettingsSection
        displayStyle={bundleSettings.displayStyle}
        onDisplayStyleChange={handleDisplayStyleChange}
        showImages={bundleSettings.showImages}
        onShowImagesChange={handleShowImagesChange}
        showSku={bundleSettings.showSku}
        onShowSkuChange={handleShowSkuChange}
        showStock={bundleSettings.showStock}
        onShowStockChange={handleShowStockChange}
        showComparePrice={bundleSettings.showComparePrice}
        onShowComparePriceChange={handleShowComparePriceChange}
        outOfStockBehavior={bundleSettings.outOfStockBehavior}
        onOutOfStockBehaviorChange={handleOutOfStockBehaviorChange}
        inheritStock={bundleSettings.inheritStock}
        onInheritStockChange={handleInheritStockChange}
      />

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
