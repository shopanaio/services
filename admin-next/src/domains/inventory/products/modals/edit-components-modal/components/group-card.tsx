"use client";

import { useCallback, useMemo, useState } from "react";
import { createStyles } from "antd-style";
import {
  Typography,
  Tag,
  Button,
  Dropdown,
  Empty,
  Switch,
  Select,
  Flex,
} from "antd";
import {
  CaretDownOutlined,
  CaretRightOutlined,
  MoreOutlined,
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";

import {
  ComponentPriceType,
  PRICE_RULE_OPTIONS,
  type IComponentGroup,
  type IComponentItem,
  type IPricingRuleTemplate,
} from "../types";
import { formatPrice, calculateFinalPrice } from "../mocks/mock-data";
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
  tagsRow: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },

  itemsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemsHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  itemsHeaderRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  itemsTitle: {
    fontSize: 13,
    fontWeight: 500,
  },
  itemsCount: {
    color: token.colorTextSecondary,
    fontWeight: 400,
  },
  bulkSwitch: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  selectedCount: {
    fontSize: 12,
    color: token.colorPrimary,
    fontWeight: 500,
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
  onAddItem: () => void;
  onEditVariants?: (item: IComponentItem) => void;
  onIncludeVariants?: (item: IComponentItem) => void;
  pricingTemplates: IPricingRuleTemplate[];
}

// ============================================================================
// Component
// ============================================================================

const TEMPLATE_PREFIX = "tpl:";

export const GroupCard = ({
  group,
  isExpanded,
  onToggle,
  onChange,
  onDelete,
  onDuplicate,
  onAddItem,
  onEditVariants,
  onIncludeVariants,
  pricingTemplates,
}: IGroupCardProps) => {
  const { styles, cx } = useStyles();

  // Bulk edit state
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Calculate price range
  const priceRange = useMemo(() => {
    if (group.items.length === 0) return null;
    const prices = group.items.map((item) => item.finalPrice);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return formatPrice(min);
    return `${formatPrice(min)} - ${formatPrice(max)}`;
  }, [group.items]);

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

  const handleBulkEditToggle = useCallback((checked: boolean) => {
    setBulkEditMode(checked);
    if (!checked) {
      setSelectedIds(new Set());
    }
  }, []);

  const handleSelectionChange = useCallback((ids: Set<string>) => {
    setSelectedIds(ids);
  }, []);

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

        <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
          <Button
            type="text"
            icon={<MoreOutlined />}
            onClick={handleMenuClick}
          />
        </Dropdown>
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
                onClick={onAddItem}
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
              bulkEditMode={bulkEditMode}
              onSelectionChange={handleSelectionChange}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default GroupCard;
