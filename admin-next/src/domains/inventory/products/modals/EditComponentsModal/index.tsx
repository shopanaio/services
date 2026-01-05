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
import { Paper } from "../../components/Paper";

import type {
  IComponentGroup,
  IComponentItem,
  IEditComponentsModalPayload,
  EditComponentsTabKey,
  BundleCalcMode,
  IPricingRuleTemplate,
  ITieredDiscount,
  DisplayStyle,
  OutOfStockBehavior,
} from "./types";
import {
  mockGroups,
  mockPricingTemplates,
  mockTieredDiscounts,
  mockModalSettings,
} from "./mocks/mockData";
import { GroupCard, ProductPicker } from "./components";
import { useComponentVariantSettingsModal } from "../../modals";
import { getProductById } from "./mocks/mockData";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
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
  placeholder: {
    padding: 32,
    textAlign: "center",
    color: token.colorTextSecondary,
  },
}));


// ============================================================================
// Groups Tab
// ============================================================================

interface IGroupsTabProps {
  groups: IComponentGroup[];
  onGroupsChange: (groups: IComponentGroup[]) => void;
  onAddItem: (groupId: string) => void;
  onEditVariants?: (item: IComponentItem, groupId: string) => void;
}

const GroupsTab = ({
  groups,
  onGroupsChange,
  onAddItem,
  onEditVariants,
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
        <Button icon={<PlusOutlined />} onClick={handleAddGroup}>
          Add Group
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
          onAddItem={() => onAddItem(group.id)}
          onEditVariants={
            onEditVariants
              ? (item) => onEditVariants(item, group.id)
              : undefined
          }
        />
      ))}
    </div>
  );
};

// ============================================================================
// Pricing Rules Tab (Placeholder)
// ============================================================================

const PricingRulesTab = () => {
  const { styles } = useStyles();
  return (
    <Paper className={styles.placeholder}>
      <DollarOutlined style={{ fontSize: 32, marginBottom: 16 }} />
      <Typography.Title level={5}>Pricing Rules</Typography.Title>
      <Typography.Text type="secondary">
        Configure bundle calculation mode and pricing rule templates
      </Typography.Text>
    </Paper>
  );
};

// ============================================================================
// Preview Tab (Placeholder)
// ============================================================================

const PreviewTab = () => {
  const { styles } = useStyles();
  return (
    <Paper className={styles.placeholder}>
      <EyeOutlined style={{ fontSize: 32, marginBottom: 16 }} />
      <Typography.Title level={5}>Storefront Preview</Typography.Title>
      <Typography.Text type="secondary">
        Preview how the component configurator will appear on the storefront
      </Typography.Text>
    </Paper>
  );
};

// ============================================================================
// Settings Tab (Placeholder)
// ============================================================================

const SettingsTab = () => {
  const { styles } = useStyles();
  return (
    <Paper className={styles.placeholder}>
      <SettingOutlined style={{ fontSize: 32, marginBottom: 16 }} />
      <Typography.Title level={5}>Settings</Typography.Title>
      <Typography.Text type="secondary">
        Display, inventory and validation settings
      </Typography.Text>
    </Paper>
  );
};

// ============================================================================
// Main Modal Component
// ============================================================================

export const EditComponentsModal = () => {
  const { styles } = useStyles();
  const { pop, setDirty, payload } = useModalStackContext();

  const modalPayload = payload as IEditComponentsModalPayload | undefined;

  // State
  const [activeTab, setActiveTab] = useState<EditComponentsTabKey>("groups");
  const [groups, setGroups] = useState<IComponentGroup[]>(
    modalPayload?.groups ?? mockGroups
  );
  const [bundleCalcMode, setBundleCalcMode] = useState<BundleCalcMode>(
    modalPayload?.bundleCalcMode ?? mockModalSettings.bundleCalcMode
  );
  const [pricingTemplates, setPricingTemplates] = useState<IPricingRuleTemplate[]>(
    modalPayload?.pricingTemplates ?? mockPricingTemplates
  );
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
    showComparePrice: modalPayload?.showComparePrice ?? mockModalSettings.showComparePrice,
    outOfStockBehavior: (modalPayload?.outOfStockBehavior ??
      mockModalSettings.outOfStockBehavior) as OutOfStockBehavior,
    inheritStock: modalPayload?.inheritStock ?? mockModalSettings.inheritStock,
    validationMessage:
      modalPayload?.validationMessage ?? mockModalSettings.validationMessage,
  });

  // ProductPicker state
  const [pickerState, setPickerState] = useState<{
    open: boolean;
    groupId: string | null;
  }>({ open: false, groupId: null });

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

  const handleAddItem = useCallback((groupId: string) => {
    setPickerState({ open: true, groupId });
  }, []);

  const handleClosePicker = useCallback(() => {
    setPickerState({ open: false, groupId: null });
  }, []);

  const handleProductSelect = useCallback(
    (items: IComponentItem[]) => {
      if (!pickerState.groupId) return;

      const updatedGroups = groups.map((group) => {
        if (group.id !== pickerState.groupId) return group;

        // Add items with correct sortIndex
        const newItems = items.map((item, idx) => ({
          ...item,
          sortIndex: group.items.length + idx,
        }));

        return {
          ...group,
          items: [...group.items, ...newItems],
        };
      });

      setGroups(updatedGroups);
      setDirty(true);
    },
    [pickerState.groupId, groups, setDirty]
  );

  // Get excluded product IDs for current group
  const excludeProductIds = useMemo(() => {
    if (!pickerState.groupId) return [];
    const group = groups.find((g) => g.id === pickerState.groupId);
    return group?.items.map((item) => item.productId) ?? [];
  }, [pickerState.groupId, groups]);

  const handleEditVariants = useCallback(
    (item: IComponentItem, groupId: string) => {
      const product = getProductById(item.productId);
      if (!product || !product.variants) return;

      pushVariantSettings({
        itemId: item.id,
        productId: item.productId,
        productTitle: product.title,
        availableVariantIds: item.availableVariantIds ?? null,
        autoHideOutOfStock: item.autoHideOutOfStock ?? false,
        variants: product.variants.map((v) => ({
          id: v.id,
          title: v.title,
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          options: v.options,
        })),
        options: product.options,
        onSave: (data) => {
          const updatedGroups = groups.map((group) => {
            if (group.id !== groupId) return group;

            return {
              ...group,
              items: group.items.map((i) =>
                i.id === item.id
                  ? {
                      ...i,
                      availableVariantIds: data.availableVariantIds,
                      autoHideOutOfStock: data.autoHideOutOfStock,
                    }
                  : i
              ),
            };
          });

          setGroups(updatedGroups);
          setDirty(true);
        },
      });
    },
    [pushVariantSettings, groups, setDirty]
  );

  const handleSave = useCallback(() => {
    const saveData = {
      groups,
      bundleCalcMode,
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
    bundleCalcMode,
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
            onAddItem={handleAddItem}
            onEditVariants={handleEditVariants}
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
        children: <PricingRulesTab />,
      },
      {
        key: "preview" as const,
        label: (
          <Flex gap={6} align="center">
            <EyeOutlined />
            Preview
          </Flex>
        ),
        children: <PreviewTab />,
      },
      {
        key: "settings" as const,
        label: (
          <Flex gap={6} align="center">
            <SettingOutlined />
            Settings
          </Flex>
        ),
        children: <SettingsTab />,
      },
    ],
    [groups, handleGroupsChange, handleAddItem, handleEditVariants]
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
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as EditComponentsTabKey)}
        items={tabItems}
        className={styles.tabsWrapper}
      />

      {/* Product Picker Modal */}
      <ProductPicker
        open={pickerState.open}
        onClose={handleClosePicker}
        onSelect={handleProductSelect}
        excludeProductIds={excludeProductIds}
      />
    </ModalLayout>
  );
};

export default EditComponentsModal;
