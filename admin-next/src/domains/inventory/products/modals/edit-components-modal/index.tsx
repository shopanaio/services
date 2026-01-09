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

import type {
  IComponentGroup,
  IComponentItem,
  IEditComponentsModalPayload,
  EditComponentsTabKey,
  IPricingRuleTemplate,
  ITieredDiscount,
  DisplayStyle,
  OutOfStockBehavior,
  IIncludedVariant,
  ComponentPriceType,
} from "./types";
import {
  mockGroups,
  mockPricingTemplates,
  mockTieredDiscounts,
  mockModalSettings,
} from "./mocks/mock-data";
import {
  GroupCard,
  PricingRulesTab,
  PreviewTab,
  SettingsTab,
} from "./components";
import { useComponentVariantSettingsModal } from "../../modals";
import { getProductById } from "./mocks/mock-data";
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
  groups: IComponentGroup[];
  onGroupsChange: (groups: IComponentGroup[]) => void;
  onEditVariants?: (item: IComponentItem, groupId: string) => void;
  onIncludeVariants?: (item: IComponentItem, groupId: string) => void;
  pricingTemplates: IPricingRuleTemplate[];
}

const GroupsTab = ({
  groups,
  onGroupsChange,
  onEditVariants,
  onIncludeVariants,
  pricingTemplates,
}: IGroupsTabProps) => {
  const { styles } = useStyles();
  const [expandedIds, setExpandedIds] = useState<string[]>([groups[0]?.id]);

  const handleToggle = useCallback((groupId: string) => {
    setExpandedIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  }, []);

  const handleAddGroup = useCallback(() => {
    const newGroup: IComponentGroup = {
      id: `grp-${Date.now()}`,
      title: "New Group",
      slug: `new-group-${Date.now()}`,
      sortIndex: groups.length,
      isRequired: false,
      isMultiple: false,
      minSelection: 0,
      maxSelection: 1,
      defaultItemIds: [],
      items: [],
    };
    onGroupsChange([...groups, newGroup]);
    setExpandedIds((prev) => [...prev, newGroup.id]);
  }, [groups, onGroupsChange]);

  const handleGroupChange = useCallback(
    (updatedGroup: IComponentGroup) => {
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

      const newGroup: IComponentGroup = {
        ...groupToDuplicate,
        id: `grp-${Date.now()}`,
        title: `${groupToDuplicate.title} (copy)`,
        slug: `${groupToDuplicate.slug}-copy`,
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
        <Typography.Text strong>COMPONENT GROUPS</Typography.Text>
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
          pricingTemplates={pricingTemplates}
        />
      ))}
    </div>
  );
};

// ============================================================================
// Main Modal Component
// ============================================================================

export const EditComponentsModal = () => {
  const { styles } = useStyles();
  const { pop, setDirty, payload } = useModalStackContext();

  const modalPayload = payload as unknown as IEditComponentsModalPayload | undefined;

  // State
  const [activeTab, setActiveTab] = useState<EditComponentsTabKey>("groups");
  const [groups, setGroups] = useState<IComponentGroup[]>(
    modalPayload?.groups ?? mockGroups
  );
  const [pricingTemplates, setPricingTemplates] = useState<
    IPricingRuleTemplate[]
  >(modalPayload?.pricingTemplates ?? mockPricingTemplates);
  const [tieredDiscounts, setTieredDiscounts] = useState<ITieredDiscount[]>(
    modalPayload?.tieredDiscounts ?? mockTieredDiscounts
  );
  const [displayStyle, setDisplayStyle] = useState<DisplayStyle>(
    modalPayload?.displayStyle ?? mockModalSettings.displayStyle
  );
  const [settings, setSettings] = useState({
    showImages: modalPayload?.showImages ?? mockModalSettings.showImages,
    showSku: modalPayload?.showSku ?? mockModalSettings.showSku,
    showStock: modalPayload?.showStock ?? mockModalSettings.showStock,
    showComparePrice:
      modalPayload?.showComparePrice ?? mockModalSettings.showComparePrice,
    outOfStockBehavior: (modalPayload?.outOfStockBehavior ??
      mockModalSettings.outOfStockBehavior) as OutOfStockBehavior,
    inheritStock: modalPayload?.inheritStock ?? mockModalSettings.inheritStock,
    validationMessage:
      modalPayload?.validationMessage ?? mockModalSettings.validationMessage,
  });

  // VariantSettingsModal hook
  const { push: pushVariantSettings } = useComponentVariantSettingsModal();

  // Handlers
  const handleGroupsChange = useCallback(
    (newGroups: IComponentGroup[]) => {
      setGroups(newGroups);
      setDirty(true);
    },
    [setDirty]
  );

  const handleEditVariants = useCallback(
    (item: IComponentItem, groupId: string) => {
      const product = getProductById(item.productId);
      if (!product || !product.variants) return;

      const hasIncludedVariants = !!(item.includedVariants && item.includedVariants.length > 0);

      pushVariantSettings({
        itemId: item.id,
        productId: item.productId,
        productTitle: product.title,
        availableVariantIds: item.availableVariantIds ?? null,
        priceType: item.priceType,
        priceValue: item.priceValue,
        variants: product.variants.map((v) => ({
          id: v.id,
          title: v.title,
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          options: v.options,
        })),
        options: product.options,
        showAsVariants: hasIncludedVariants,
        onSave: (data: { availableVariantIds: string[] | null; showAsVariants: boolean }) => {
          // Calculate max sortIndex for new variants
          const group = groups.find((g) => g.id === groupId);
          let maxSortIndex = 0;
          if (group) {
            group.items.forEach((groupItem) => {
              maxSortIndex = Math.max(maxSortIndex, groupItem.sortIndex);
              groupItem.includedVariants?.forEach((v) => {
                maxSortIndex = Math.max(maxSortIndex, v.sortIndex);
              });
            });
          }

          const updatedGroups = groups.map((grp) => {
            if (grp.id !== groupId) return grp;

            return {
              ...grp,
              items: grp.items.map((i) => {
                if (i.id !== item.id) return i;

                // Update available variant IDs
                let updatedItem = {
                  ...i,
                  availableVariantIds: data.availableVariantIds,
                };

                // Handle showAsVariants toggle
                if (data.showAsVariants && !hasIncludedVariants) {
                  // Add variants to table
                  const availableVariants = data.availableVariantIds
                    ? product.variants!.filter((v) =>
                        data.availableVariantIds!.includes(v.id)
                      )
                    : product.variants!;

                  const newIncludedVariants: IIncludedVariant[] = availableVariants.map(
                    (variant, index) => ({
                      id: `inc-${Date.now()}-${variant.id}`,
                      variantId: variant.id,
                      sortIndex: maxSortIndex + 1 + index,
                      priceType: item.priceType as ComponentPriceType,
                      priceValue: item.priceValue,
                      basePrice: variant.price,
                      finalPrice: variant.price,
                    })
                  );

                  updatedItem = {
                    ...updatedItem,
                    includedVariants: newIncludedVariants,
                  };
                } else if (!data.showAsVariants && hasIncludedVariants) {
                  // Remove variants from table
                  updatedItem = {
                    ...updatedItem,
                    includedVariants: undefined,
                  };
                }

                return updatedItem;
              }),
            };
          });

          setGroups(updatedGroups);
          setDirty(true);
        },
      });
    },
    [pushVariantSettings, groups, setDirty]
  );

  // Handle including variants in the table with individual pricing
  // Immediately adds all available variants without showing a modal
  const handleIncludeVariants = useCallback(
    (item: IComponentItem, groupId: string) => {
      const product = getProductById(item.productId);
      if (!product || !product.variants) return;

      // Get variants that are available for this item
      const availableVariants = item.availableVariantIds
        ? product.variants.filter((v) =>
            item.availableVariantIds!.includes(v.id)
          )
        : product.variants;

      // Get already included variant IDs
      const alreadyIncludedIds = new Set(
        item.includedVariants?.map((iv) => iv.variantId) ?? []
      );

      // Get variants that haven't been included yet
      const variantsToAdd = availableVariants.filter(
        (v) => !alreadyIncludedIds.has(v.id)
      );

      if (variantsToAdd.length === 0) {
        return; // All variants already included
      }

      // Calculate the starting sortIndex for new variants
      // Find max sortIndex among all items and existing variants in the group
      const group = groups.find((g) => g.id === groupId);
      let maxSortIndex = 0;
      if (group) {
        group.items.forEach((groupItem) => {
          maxSortIndex = Math.max(maxSortIndex, groupItem.sortIndex);
          groupItem.includedVariants?.forEach((v) => {
            maxSortIndex = Math.max(maxSortIndex, v.sortIndex);
          });
        });
      }

      // Create included variants with default pricing (inherits from parent)
      const newIncludedVariants: IIncludedVariant[] = variantsToAdd.map(
        (variant, index) => ({
          id: `inc-${Date.now()}-${variant.id}`,
          variantId: variant.id,
          sortIndex: maxSortIndex + 1 + index,
          priceType: item.priceType as ComponentPriceType,
          priceValue: item.priceValue,
          basePrice: variant.price,
          finalPrice: variant.price,
        })
      );

      const updatedGroups = groups.map((group) => {
        if (group.id !== groupId) return group;

        return {
          ...group,
          items: group.items.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  includedVariants: [
                    ...(i.includedVariants ?? []),
                    ...newIncludedVariants,
                  ],
                }
              : i
          ),
        };
      });

      setGroups(updatedGroups);
      setDirty(true);
    },
    [groups, setDirty]
  );

  const handleSave = useCallback(() => {
    const saveData = {
      groups,
      pricingTemplates,
      tieredDiscounts,
      displayStyle,
      settings,
    };

    console.log("Saving:", saveData);
    modalPayload?.onSave?.(saveData);
    pop();
  }, [
    groups,
    pricingTemplates,
    tieredDiscounts,
    displayStyle,
    settings,
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
          <PricingRulesTab
            pricingTemplates={pricingTemplates}
            onPricingTemplatesChange={(templates) => {
              setPricingTemplates(templates);
              setDirty(true);
            }}
            tieredDiscounts={tieredDiscounts}
            onTieredDiscountsChange={(discounts) => {
              setTieredDiscounts(discounts);
              setDirty(true);
            }}
          />
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
            displayStyle={displayStyle}
            showImages={settings.showImages}
            showSku={settings.showSku}
            showStock={settings.showStock}
            showComparePrice={settings.showComparePrice}
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
            displayStyle={displayStyle}
            onDisplayStyleChange={(style) => {
              setDisplayStyle(style);
              setDirty(true);
            }}
            showImages={settings.showImages}
            onShowImagesChange={(value) => {
              setSettings((prev) => ({ ...prev, showImages: value }));
              setDirty(true);
            }}
            showSku={settings.showSku}
            onShowSkuChange={(value) => {
              setSettings((prev) => ({ ...prev, showSku: value }));
              setDirty(true);
            }}
            showStock={settings.showStock}
            onShowStockChange={(value) => {
              setSettings((prev) => ({ ...prev, showStock: value }));
              setDirty(true);
            }}
            showComparePrice={settings.showComparePrice}
            onShowComparePriceChange={(value) => {
              setSettings((prev) => ({ ...prev, showComparePrice: value }));
              setDirty(true);
            }}
            outOfStockBehavior={settings.outOfStockBehavior}
            onOutOfStockBehaviorChange={(value) => {
              setSettings((prev) => ({ ...prev, outOfStockBehavior: value }));
              setDirty(true);
            }}
            inheritStock={settings.inheritStock}
            onInheritStockChange={(value) => {
              setSettings((prev) => ({ ...prev, inheritStock: value }));
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
      pricingTemplates,
      tieredDiscounts,
      displayStyle,
      settings,
      setDirty,
    ]
  );

  return (
    <ModalLayout
      name="edit-components"
      header={
        <ModalHeader
          name="edit-components"
          title="Edit Product Components"
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
          onChange={(key) => setActiveTab(key as EditComponentsTabKey)}
          items={tabItems}
          className={styles.tabsWrapper}
        />
      </Paper>
    </ModalLayout>
  );
};

export default EditComponentsModal;
