"use client";

import { useState, useCallback, useMemo } from "react";
import { createStyles } from "antd-style";
import { Tabs, Typography, Flex, Button } from "antd";
import {
  PlusOutlined,
  AppstoreOutlined,
  DollarOutlined,
  EyeOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { useBundleItemVariantSettingsModal } from "../../modals";

import type {
  EditBundleItemsTabKey,
  IBundleGroup,
  BundleItem,
  PricingRuleTemplate,
  IBundleSettings,
  IDependencyRule,
} from "./types";
import { BundleItemType } from "./types";
import {
  GroupCard,
  PreviewTab,
} from "./components";
import { TemplatesTab } from "@/domains/inventory/bundles/modals/edit-templates-modal/components";
import { DependencyRulesTab } from "./components/dependency-rules-tab";
import { SettingsTab } from "@/domains/inventory/bundles/modals/edit-settings-modal/components";
import { Paper } from "@/ui-kit/paper";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(() => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  tabsWrapper: {
    marginBottom: 0,
  },
  groupsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
}));

// ============================================================================
// Groups Tab
// ============================================================================

interface IGroupsTabProps {
  groups: IBundleGroup[];
  onGroupsChange: (groups: IBundleGroup[]) => void;
  onEditVariants?: (item: BundleItem, groupId: string) => void;
  onIncludeVariants?: (item: BundleItem, groupId: string) => void;
  onShowAsProduct?: (item: BundleItem, groupId: string) => void;
  pricingTemplates: PricingRuleTemplate[];
}

const GroupsTab = ({
  groups,
  onGroupsChange,
  onEditVariants,
  onIncludeVariants,
  onShowAsProduct,
  pricingTemplates,
}: IGroupsTabProps) => {
  const { styles } = useStyles();
  const [expandedIds, setExpandedIds] = useState<string[]>(
    groups[0]?.id ? [groups[0].id] : []
  );

  const handleToggle = useCallback((groupId: string) => {
    setExpandedIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  }, []);

  const handleAddGroup = useCallback(() => {
    const newGroup: IBundleGroup = {
      id: `grp-${Date.now()}`,
      title: "New Group",
      sortIndex: groups.length,

      isRequired: false,
      isMultiple: false,
      minSelection: null,
      maxSelection: null,

      items: [],
    };
    onGroupsChange([...groups, newGroup]);
    setExpandedIds((prev) => [...prev, newGroup.id]);
  }, [groups, onGroupsChange]);

  const handleGroupChange = useCallback(
    (updatedGroup: IBundleGroup) => {
      onGroupsChange(
        groups.map((g) => (g.id === updatedGroup.id ? updatedGroup : g))
      );
    },
    [groups, onGroupsChange]
  );

  const handleDeleteGroup = useCallback(
    (groupId: string) => {
      onGroupsChange(groups.filter((g) => g.id !== groupId));
    },
    [groups, onGroupsChange]
  );

  const handleDuplicateGroup = useCallback(
    (groupId: string) => {
      const groupToDuplicate = groups.find((g) => g.id === groupId);
      if (!groupToDuplicate) return;

      const newGroup: IBundleGroup = {
        ...groupToDuplicate,
        id: `grp-${Date.now()}`,
        title: `${groupToDuplicate.title} (copy)`,
        sortIndex: groups.length,
        items: groupToDuplicate.items.map((item) => ({
          ...item,
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        })),
      };
      onGroupsChange([...groups, newGroup]);
      setExpandedIds((prev) => [...prev, newGroup.id]);
    },
    [groups, onGroupsChange]
  );

  return (
    <div className={styles.container}>
      <div className={styles.groupsHeader}>
        <Typography.Text strong>BUNDLE ITEMS</Typography.Text>
        <Button size="small" icon={<PlusOutlined />} onClick={handleAddGroup}>
          Add
        </Button>
      </div>

      {groups.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          isExpanded={expandedIds.includes(group.id)}
          onToggle={() => handleToggle(group.id)}
          onChange={handleGroupChange}
          onDelete={() => handleDeleteGroup(group.id)}
          onDuplicate={() => handleDuplicateGroup(group.id)}
          onEditVariants={
            onEditVariants
              ? (item) => onEditVariants(item, group.id)
              : undefined
          }
          onIncludeVariants={
            onIncludeVariants
              ? (item) => onIncludeVariants(item, group.id)
              : undefined
          }
          onShowAsProduct={
            onShowAsProduct
              ? (item) => onShowAsProduct(item, group.id)
              : undefined
          }
          pricingTemplates={pricingTemplates}
        />
      ))}
    </div>
  );
};

// ============================================================================
// Main Modal Component
// ============================================================================

// Payload interface for modal
interface IEditBundleItemsModalPayload {
  groups?: IBundleGroup[];
  pricingTemplates?: PricingRuleTemplate[];
  dependencyRules?: IDependencyRule[];
  bundleSettings?: IBundleSettings;
  onSave?: (data: unknown) => void;
}

// Default bundle settings
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

export const EditBundleItemsModal = () => {
  const { styles } = useStyles();
  const { pop, setDirty, payload } = useModalStackContext();
  const { push: openVariantSettingsModal } = useBundleItemVariantSettingsModal();

  const modalPayload = payload as unknown as
    | IEditBundleItemsModalPayload
    | undefined;

  // State
  const [activeTab, setActiveTab] = useState<EditBundleItemsTabKey>("groups");
  const [groups, setGroups] = useState<IBundleGroup[]>(
    modalPayload?.groups ?? []
  );
  const [pricingTemplates, setPricingTemplates] = useState<
    PricingRuleTemplate[]
  >(modalPayload?.pricingTemplates ?? []);
  const [dependencyRules, setDependencyRules] = useState<IDependencyRule[]>(
    modalPayload?.dependencyRules ?? []
  );
  const [bundleSettings, setBundleSettings] = useState<IBundleSettings>(
    modalPayload?.bundleSettings ?? DEFAULT_BUNDLE_SETTINGS
  );
  // Store expanded products (products converted to variants) for restoration
  const [expandedProducts, setExpandedProducts] = useState<
    Map<string, BundleItem>
  >(new Map());

  // Handlers
  const handleGroupsChange = useCallback(
    (newGroups: IBundleGroup[]) => {
      // Check if any expanded products need to be restored (all variants removed)
      const productsToRestore: Array<{
        productId: string;
        groupId: string;
        firstVariantIndex: number;
      }> = [];

      expandedProducts.forEach((_, productId) => {
        // Check each group for variants of this product
        for (const group of newGroups) {
          const hasVariantsOfProduct = group.items.some(
            (item) =>
              item.itemType === BundleItemType.VARIANT &&
              item.assignedVariant?.product?.id === productId
          );

          if (!hasVariantsOfProduct) {
            // Check if this group previously had variants of this product
            const currentGroup = groups.find((g) => g.id === group.id);
            const hadVariants = currentGroup?.items.some(
              (item) =>
                item.itemType === BundleItemType.VARIANT &&
                item.assignedVariant?.product?.id === productId
            );

            if (hadVariants) {
              // Find where to insert the product (where first variant was)
              const firstVariantIndex =
                currentGroup?.items.findIndex(
                  (item) =>
                    item.itemType === BundleItemType.VARIANT &&
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

      // Restore products if needed
      if (productsToRestore.length > 0) {
        let updatedGroups = newGroups;

        for (const {
          productId,
          groupId,
          firstVariantIndex,
        } of productsToRestore) {
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

          // Remove from expanded products
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

      setDirty(true);
    },
    [setDirty, expandedProducts, groups]
  );

  // Handler for editing variant selection for a bundle item
  const handleEditVariants = useCallback(
    (item: BundleItem, groupId: string) => {
      if (
        item.itemType !== BundleItemType.PRODUCT ||
        !item.assignedProduct
      ) {
        return;
      }

      const product = item.assignedProduct;
      const variantsFromConnection =
        product.variants?.edges?.map((e) => e.node) ?? [];

      // Get price rule info
      const priceType =
        "id" in item.pricingRule ? "BASE" : item.pricingRule.priceType;
      const priceValue =
        "id" in item.pricingRule ? null : item.pricingRule.priceValue;

      openVariantSettingsModal({
        itemId: item.id,
        productId: product.id,
        productTitle: item.title ?? product.title,
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
        options: product.options?.map((o) => ({
          id: o.id,
          name: o.name,
          values: o.values?.map((v) => v.name) ?? [],
        })),
        showAsVariants: false,
        onSave: (data: {
          availableVariantIds: string[] | null;
          showAsVariants: boolean;
        }) => {
          // Update the item with new variant selection
          setGroups((prev) =>
            prev.map((g) =>
              g.id === groupId
                ? {
                    ...g,
                    items: g.items.map((i) =>
                      i.id === item.id
                        ? {
                            ...i,
                            excludeAssignedProductVariants:
                              data.availableVariantIds,
                          }
                        : i
                    ),
                  }
                : g
            )
          );
          setDirty(true);
        },
      });
    },
    [openVariantSettingsModal, setDirty]
  );

  // Handler for including variants as separate items (Show as variants)
  const handleIncludeVariants = useCallback(
    (item: BundleItem, groupId: string) => {
      if (
        item.itemType !== BundleItemType.PRODUCT ||
        !item.assignedProduct
      ) {
        return;
      }

      const product = item.assignedProduct;
      const variantsFromConnection =
        product.variants?.edges?.map((e) => e.node) ?? [];

      if (variantsFromConnection.length === 0) {
        console.log("No variants to include for product:", product.id);
        return;
      }

      // Store the product item for later restoration
      setExpandedProducts((prev) => new Map(prev).set(product.id, item));

      // Create variant items from product variants
      const variantItems: BundleItem[] = variantsFromConnection.map(
        (variant, index) => ({
          id: `item-${Date.now()}-${index}`,
          itemType: BundleItemType.VARIANT,
          assignedVariant: variant,
          sortIndex: item.sortIndex + index + 1,
          pricingRule: item.pricingRule,
          title: item.title,
          featuredImage: item.featuredImage,
        })
      );

      // Replace product item with variant items
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g;

          const itemIndex = g.items.findIndex((i) => i.id === item.id);
          const newItems = [...g.items];
          // Remove the product and insert variants in its place
          newItems.splice(itemIndex, 1, ...variantItems);

          // Update sort indices
          return {
            ...g,
            items: newItems.map((i, idx) => ({ ...i, sortIndex: idx })),
          };
        })
      );
      setDirty(true);
    },
    [setDirty]
  );

  // Handler for showing variants as product (restore product from variants)
  const handleShowAsProduct = useCallback(
    (item: BundleItem, groupId: string) => {
      if (
        item.itemType !== BundleItemType.VARIANT ||
        !item.assignedVariant
      ) {
        return;
      }

      const productId = item.assignedVariant.product?.id;
      if (!productId) return;

      // Get stored product item
      const storedProduct = expandedProducts.get(productId);
      if (!storedProduct) return;

      // Remove from expanded products
      setExpandedProducts((prev) => {
        const newMap = new Map(prev);
        newMap.delete(productId);
        return newMap;
      });

      // Find first variant of this product to get its position
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g;

          // Find the first variant of this product
          const firstVariantIndex = g.items.findIndex(
            (i) =>
              i.itemType === BundleItemType.VARIANT &&
              i.assignedVariant?.product?.id === productId
          );
          if (firstVariantIndex === -1) return g;

          // Remove all variants of this product and insert the product
          const newItems = g.items.filter(
            (i) =>
              !(
                i.itemType === BundleItemType.VARIANT &&
                i.assignedVariant?.product?.id === productId
              )
          );

          // Insert product at the position where first variant was
          newItems.splice(firstVariantIndex, 0, {
            ...storedProduct,
            sortIndex: firstVariantIndex,
          });

          // Update sort indices
          return {
            ...g,
            items: newItems.map((i, idx) => ({ ...i, sortIndex: idx })),
          };
        })
      );
      setDirty(true);
    },
    [expandedProducts, setDirty]
  );

  const handleSave = useCallback(() => {
    const saveData = {
      groups,
      pricingTemplates,
      dependencyRules,
      bundleSettings,
    };

    console.log("Saving:", saveData);
    modalPayload?.onSave?.(saveData);
    pop();
  }, [
    groups,
    pricingTemplates,
    dependencyRules,
    bundleSettings,
    modalPayload,
    pop,
  ]);

  // Tab items
  const tabItems = useMemo(
    () => [
      {
        key: "groups" as const,
        label: (
          <Flex gap={6} align="center">
            <AppstoreOutlined />
            Groups
          </Flex>
        ),
        children: (
          <GroupsTab
            groups={groups}
            onGroupsChange={handleGroupsChange}
            onEditVariants={handleEditVariants}
            onIncludeVariants={handleIncludeVariants}
            onShowAsProduct={handleShowAsProduct}
            pricingTemplates={pricingTemplates}
          />
        ),
      },
      {
        key: "pricing" as const,
        label: (
          <Flex gap={6} align="center">
            <DollarOutlined />
            Pricing
          </Flex>
        ),
        children: (
          <Flex vertical gap={24}>
            <TemplatesTab
              pricingTemplates={pricingTemplates}
              onPricingTemplatesChange={(templates) => {
                setPricingTemplates(templates);
                setDirty(true);
              }}
            />
            <DependencyRulesTab
              dependencyRules={dependencyRules}
              onDependencyRulesChange={(rules) => {
                setDependencyRules(rules);
                setDirty(true);
              }}
              groups={groups}
            />
          </Flex>
        ),
      },
      {
        key: "preview" as const,
        label: (
          <Flex gap={6} align="center">
            <EyeOutlined />
            Preview
          </Flex>
        ),
        children: (
          <PreviewTab
            groups={groups}
            displayStyle={bundleSettings.displayStyle}
            showImages={bundleSettings.showImages}
            showSku={bundleSettings.showSku}
            showStock={bundleSettings.showStock}
            showComparePrice={bundleSettings.showComparePrice}
          />
        ),
      },
      {
        key: "settings" as const,
        label: (
          <Flex gap={6} align="center">
            <SettingOutlined />
            Settings
          </Flex>
        ),
        children: (
          <SettingsTab
            displayStyle={bundleSettings.displayStyle}
            onDisplayStyleChange={(style) => {
              setBundleSettings((prev) => ({ ...prev, displayStyle: style }));
              setDirty(true);
            }}
            showImages={bundleSettings.showImages}
            onShowImagesChange={(value) => {
              setBundleSettings((prev) => ({ ...prev, showImages: value }));
              setDirty(true);
            }}
            showSku={bundleSettings.showSku}
            onShowSkuChange={(value) => {
              setBundleSettings((prev) => ({ ...prev, showSku: value }));
              setDirty(true);
            }}
            showStock={bundleSettings.showStock}
            onShowStockChange={(value) => {
              setBundleSettings((prev) => ({ ...prev, showStock: value }));
              setDirty(true);
            }}
            showComparePrice={bundleSettings.showComparePrice}
            onShowComparePriceChange={(value) => {
              setBundleSettings((prev) => ({
                ...prev,
                showComparePrice: value,
              }));
              setDirty(true);
            }}
            outOfStockBehavior={bundleSettings.outOfStockBehavior}
            onOutOfStockBehaviorChange={(value) => {
              setBundleSettings((prev) => ({
                ...prev,
                outOfStockBehavior: value,
              }));
              setDirty(true);
            }}
            inheritStock={bundleSettings.inheritStock}
            onInheritStockChange={(value) => {
              setBundleSettings((prev) => ({ ...prev, inheritStock: value }));
              setDirty(true);
            }}
          />
        ),
      },
    ],
    [
      groups,
      handleGroupsChange,
      handleEditVariants,
      handleIncludeVariants,
      handleShowAsProduct,
      pricingTemplates,
      dependencyRules,
      bundleSettings,
      setDirty,
    ]
  );

  return (
    <ModalLayout
      name="edit-bundle-items"
      header={
        <ModalHeader
          name="edit-bundle-items"
          title="Edit Bundle Items"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            onClick: handleSave,
          }}
        />
      }
    >
      <Paper>
        <Tabs
          type="card"
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as EditBundleItemsTabKey)}
          items={tabItems}
          className={styles.tabsWrapper}
        />
      </Paper>
    </ModalLayout>
  );
};

export default EditBundleItemsModal;
