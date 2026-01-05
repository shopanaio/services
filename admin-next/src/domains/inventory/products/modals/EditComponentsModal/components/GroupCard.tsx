"use client";

import { useCallback, useMemo, useState } from "react";
import { createStyles } from "antd-style";
import { Typography, Tag, Button, Dropdown, Empty, Switch, Select, Flex } from "antd";
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
import { formatPrice, calculateFinalPrice } from "../mocks/mockData";
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

  // Bulk price options
  const bulkPriceOptions = useMemo(() => [
    ...(pricingTemplates.length > 0
      ? [
          {
            label: "Templates",
            options: pricingTemplates.map((tpl) => {
              const rule = PRICE_RULE_OPTIONS.find((r) => r.value === tpl.priceType);
              const valueStr =
                tpl.priceValue !== null && rule?.valueSuffix
                  ? ` (${tpl.priceValue}${rule.valueSuffix})`
                  : "";
              return {
                label: `${tpl.name}${valueStr}`,
                value: `${TEMPLATE_PREFIX}${tpl.id}`,
              };
            }),
          },
        ]
      : []),
    {
      label: "Custom",
      options: PRICE_RULE_OPTIONS.map((opt) => ({
        label: opt.label,
        value: opt.value,
      })),
    },
  ], [pricingTemplates]);

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

  // Apply pricing rule to selected items
  const handleBulkApplyPriceRule = useCallback(
    (value: string) => {
      if (selectedIds.size === 0) return;

      let priceType: ComponentPriceType;
      let priceValue: number | null;
      let templateId: string | undefined;

      if (value.startsWith(TEMPLATE_PREFIX)) {
        const tplId = value.replace(TEMPLATE_PREFIX, "");
        const template = pricingTemplates.find((t) => t.id === tplId);
        if (!template) return;
        priceType = template.priceType;
        priceValue = template.priceValue;
        templateId = tplId;
      } else {
        priceType = value as ComponentPriceType;
        const rule = PRICE_RULE_OPTIONS.find((r) => r.value === priceType);
        priceValue = rule?.requiresValue ? 0 : null;
        templateId = undefined;
      }

      const newItems = group.items.map((item) => {
        if (!selectedIds.has(item.id)) return item;

        const finalPrice = calculateFinalPrice(item.basePrice, priceType, priceValue);

        return {
          ...item,
          priceType,
          priceValue,
          templateId,
          finalPrice,
        };
      });

      onChange({ ...group, items: newItems });
      setSelectedIds(new Set());
      setBulkEditMode(false);
    },
    [group, selectedIds, pricingTemplates, onChange]
  );

  // Delete selected items
  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    const newItems = group.items.filter((item) => !selectedIds.has(item.id));
    onChange({ ...group, items: newItems });
    setSelectedIds(new Set());
    setBulkEditMode(false);
  }, [group, selectedIds, onChange]);

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
            <div className={styles.itemsHeaderLeft}>
              <Typography.Text className={styles.itemsTitle}>
                Items{" "}
                <span className={styles.itemsCount}>({group.items.length})</span>
              </Typography.Text>
              {group.items.length > 0 && (
                <Flex align="center" gap={6}>
                  <Switch
                    size="small"
                    checked={bulkEditMode}
                    onChange={handleBulkEditToggle}
                  />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Bulk
                  </Typography.Text>
                </Flex>
              )}
            </div>
            <Button
              type="default"
              size="small"
              icon={<PlusOutlined />}
              onClick={onAddItem}
            />
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
