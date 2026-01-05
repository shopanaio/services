"use client";

import { useCallback, useMemo } from "react";
import { createStyles } from "antd-style";
import { Typography, Tag, Button, Dropdown, Empty } from "antd";
import {
  CaretDownOutlined,
  CaretRightOutlined,
  MoreOutlined,
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";

import type { IComponentGroup, IComponentItem } from "../types";
import { formatPrice } from "../mocks/mockData";
import { GroupSettings } from "./GroupSettings";
import { ComponentsTable } from "./ComponentsTable";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  card: {
    marginBottom: 12,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    overflow: "hidden",
    background: token.colorBgContainer,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    cursor: "pointer",
    transition: "background 0.2s",
    "&:hover": {
      background: token.colorBgLayout,
    },
  },
  headerExpanded: {
    background: token.colorBgLayout,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
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
  content: {
    padding: 16,
  },
  itemsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemsTitle: {
    fontSize: 13,
    fontWeight: 500,
  },
  itemsCount: {
    color: token.colorTextSecondary,
    fontWeight: 400,
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
  onAddItem,
  onEditVariants,
}: IGroupCardProps) => {
  const { styles, cx } = useStyles();

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

  const handleMenuClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
    },
    []
  );

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
      <div
        className={cx(styles.header, isExpanded && styles.headerExpanded)}
        onClick={onToggle}
      >
        <div className={styles.headerLeft}>
          <div className={styles.titleRow}>
            {isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
            <Typography.Text className={styles.title}>
              {group.title}
            </Typography.Text>
          </div>
          <div className={styles.tagsRow}>
            <Tag color={group.isRequired ? "red" : "default"}>
              {group.isRequired ? "Required" : "Optional"}
            </Tag>
            <Tag color={group.isMultiple ? "blue" : "default"}>
              {group.isMultiple ? "Multiple" : "Single"}
            </Tag>
            <Tag>{group.items.length} items</Tag>
            {priceRange && <Tag color="green">{priceRange}</Tag>}
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
        <div className={styles.content}>
          {/* Group Settings */}
          <GroupSettings group={group} onChange={handleSettingsChange} />

          {/* Items Section */}
          <div className={styles.itemsHeader}>
            <Typography.Text className={styles.itemsTitle}>
              Items{" "}
              <span className={styles.itemsCount}>({group.items.length})</span>
            </Typography.Text>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={onAddItem}
            >
              Add
            </Button>
          </div>

          {group.items.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No items in this group"
              className={styles.emptyItems}
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={onAddItem}>
                Add first item
              </Button>
            </Empty>
          ) : (
            <ComponentsTable
              items={group.items}
              onItemsChange={handleItemsChange}
              onEditVariants={onEditVariants}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default GroupCard;
