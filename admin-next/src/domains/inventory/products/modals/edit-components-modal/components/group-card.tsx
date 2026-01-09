"use client";

import { useCallback, useMemo } from "react";
import { createStyles } from "antd-style";
import { Typography, Button, Dropdown, Empty, Flex } from "antd";
import {
  CaretDownOutlined,
  CaretRightOutlined,
  MoreOutlined,
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";

// Entity Picker Modal - imports for side effects (registration)
import "@/shared/components/entity-picker-modal/register";
import "@/shared/components/entity-picker-modal/configs/product-picker-config";
import {
  useProductPicker,
  type IPickableEntity,
} from "@/shared/components/entity-picker-modal";

import {
  ComponentItemType,
  ComponentPriceType,
  type IComponentGroup,
  type IComponentItem,
  type IPricingRuleTemplate,
} from "../types";
import { GroupSettings } from "./group-settings";
import { ComponentsTable } from "./components-table";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  card: {
    background: token.colorBgContainer,
  },
  header: {
    display: "flex",
    borderRadius: token.borderRadiusLG,
    justifyContent: "space-between",
    background: token.colorBgLayout,
    alignItems: "center",
    padding: "12px 16px",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontWeight: 600,
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  emptyItems: {
    padding: "24px 0",
  },
}));

// ============================================================================
// Props
// ============================================================================

interface IGroupCardProps {
  group: IComponentGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (group: IComponentGroup) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onEditVariants?: (item: IComponentItem) => void;
  onIncludeVariants?: (item: IComponentItem) => void;
  pricingTemplates: IPricingRuleTemplate[];
}

// ============================================================================
// Component
// ============================================================================

export const GroupCard = ({
  group,
  isExpanded,
  onToggle,
  onChange,
  onDelete,
  onDuplicate,
  onEditVariants,
  onIncludeVariants,
  pricingTemplates,
}: IGroupCardProps) => {
  const { styles, cx } = useStyles();

  // Get existing product IDs to exclude from picker
  const existingProductIds = useMemo(
    () => group.items.map((item) => item.productId),
    [group.items]
  );

  // Transform selected products to component items
  const handleProductsSelected = useCallback(
    (products: IPickableEntity[]) => {
      const newItems: IComponentItem[] = products.map((product, index) => ({
        id: `item-${Date.now()}-${index}`,
        itemType: ComponentItemType.SIMPLE_PRODUCT,
        productId: product.id,
        priceType: ComponentPriceType.BASE,
        priceValue: null,
        basePrice: 0,
        finalPrice: 0,
        sortIndex: group.items.length + index,
        isAvailable: true,
        customTitle: product.title,
      }));

      onChange({
        ...group,
        items: [...group.items, ...newItems],
      });
    },
    [group, onChange]
  );

  // Product picker hook
  const { openPicker } = useProductPicker({
    excludeIds: existingProductIds,
    onConfirm: handleProductsSelected,
  });

  // Handle add button click
  const handleAddClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      openPicker();
    },
    [openPicker]
  );

  // Handlers
  const handleSettingsChange = useCallback(
    (updates: Partial<IComponentGroup>) => {
      onChange({ ...group, ...updates });
    },
    [group, onChange]
  );

  const handleItemsChange = useCallback(
    (items: IComponentItem[]) => {
      onChange({ ...group, items });
    },
    [group, onChange]
  );

  const handleMenuClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Menu items
  const menuItems: MenuProps["items"] = [
    {
      key: "duplicate",
      icon: <CopyOutlined />,
      label: "Duplicate group",
      onClick: () => onDuplicate(),
    },
    { type: "divider" },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Delete group",
      danger: true,
      onClick: () => onDelete(),
    },
  ];

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={cx(styles.header)} onClick={onToggle}>
        <div className={styles.headerLeft}>
          <div className={styles.titleRow}>
            {isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
            <Typography.Text className={styles.title}>
              {group.title}
            </Typography.Text>
          </div>
        </div>

        <Flex gap={4}>
          <Button
            type="text"
            icon={<PlusOutlined />}
            onClick={handleAddClick}
          />
          <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
            <Button
              type="text"
              icon={<MoreOutlined />}
              onClick={handleMenuClick}
            />
          </Dropdown>
        </Flex>
      </div>

      {/* Content */}
      {isExpanded && (
        <div>
          {/* Group Settings */}
          <GroupSettings group={group} onChange={handleSettingsChange} />

          {group.items.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No items in this group"
              className={styles.emptyItems}
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openPicker}
              >
                Add first item
              </Button>
            </Empty>
          ) : (
            <ComponentsTable
              items={group.items}
              onItemsChange={handleItemsChange}
              onEditVariants={onEditVariants}
              onIncludeVariants={onIncludeVariants}
              pricingTemplates={pricingTemplates}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default GroupCard;
