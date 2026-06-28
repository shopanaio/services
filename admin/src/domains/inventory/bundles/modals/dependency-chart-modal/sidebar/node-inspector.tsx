"use client";

import {
  useState,
  useCallback } from "react";
import {
  Typography,
  Button,
  Empty,
  Avatar,
  Tag,
  Flex,
  Divider,
  } from "antd";
import {
  LeftOutlined,
  RightOutlined,
  FolderOutlined,
  PictureOutlined,
  GiftOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  MinusCircleOutlined,
  NumberOutlined,
  DollarOutlined,
  AppstoreOutlined,
  LockOutlined,
  UnlockOutlined,
  } from "@ant-design/icons";

import type { IBundleGroup,
  BundleItem } from "@/domains/inventory/bundles/types";
import {
  PRICE_RULE_OPTIONS,
  DependencyTargetType,
  } from "@/domains/inventory/bundles/types";
import { CHART_NODE_ICONS,
} from "@/domains/inventory/bundles/dependency-rules";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { CopyableChip } from "@/ui-kit/copyable-chip";

import type { SelectedNode } from "../types";
import { RuleInspector } from "./rule-inspector";
import { useStyles } from "./node-inspector.styles";

// ============================================================================
// Types
// ============================================================================

interface INodeInspectorProps {
  selectedNode: SelectedNode;
  groups: IBundleGroup[];
  onRuleChange: (rule: import("@/domains/inventory/bundles/types").IDependencyRule) => void;
}

// ============================================================================
// Helpers
// ============================================================================

const getItemImageUrl = (item: BundleItem): string | undefined => {
  // BundleItem has its own featuredImage field
  return item.featuredImage?.url ?? undefined;
};

const getItemTitle = (item: BundleItem): string => {
  return (
    item.title ??
    item.assignedProduct?.title ??
    item.assignedVariant?.product?.title ??
    "Unnamed"
  );
};

const getVariantTitle = (item: BundleItem): string | undefined => {
  return item.assignedVariant?.title ?? undefined;
};

const getPriceRuleLabel = (item: BundleItem): string => {
  if (!item.pricingRule) return "No rule";
  if ("name" in item.pricingRule) {
    return item.pricingRule.name;
  }
  const option = PRICE_RULE_OPTIONS.find(
    (o) => o.value === item.pricingRule.priceType
  );
  if (!option) return "Unknown";
  if (option.requiresValue && item.pricingRule.priceValue !== null) {
    return `${item.pricingRule.priceValue}${option.valueSuffix ?? ""}`;
  }
  return option.label;
};

const getPriceRuleType = (item: BundleItem): string => {
  if (!item.pricingRule) return "None";
  if ("name" in item.pricingRule) {
    return "Template";
  }
  const option = PRICE_RULE_OPTIONS.find(
    (o) => o.value === item.pricingRule.priceType
  );
  return option?.label ?? "Unknown";
};

const getSelectionLabel = (group: IBundleGroup): string | null => {
  const min = group.minSelection;
  const max = group.maxSelection;
  if (min == null && max == null) return null;
  if (min != null && max != null) return min === max ? `[${min}]` : `[${min}–${max}]`;
  if (min != null) return `[${min}+]`;
  if (max != null) return `[1–${max}]`;
  return null;
};

// ============================================================================
// Item Inspector Content
// ============================================================================

interface IItemInspectorContentProps {
  item: BundleItem;
  group: IBundleGroup;
}

const ItemInspectorContent = ({ item, group }: IItemInspectorContentProps) => {
  const { styles } = useStyles();
  const imageUrl = getItemImageUrl(item);
  const title = getItemTitle(item);
  const variantTitle = getVariantTitle(item);

  const isVisible = item.visible !== "no";
  const isPreSelected = item.selected === "yes";

  return (
    <div className={styles.content}>
      {/* Header with image and title */}
      <div className={styles.header}>
        <Avatar
          size={64}
          src={imageUrl}
          icon={<PictureOutlined />}
          shape="square"
          className={styles.avatarItem}
        />
        <div className={styles.headerInfo}>
          <Typography.Text type="secondary" className={styles.groupLabel}>
            {group.title}
          </Typography.Text>
          <Typography.Text strong className={styles.title}>
            {title}
          </Typography.Text>
          {variantTitle && (
            <Typography.Text type="secondary" className={styles.variantTitle}>
              {variantTitle}
            </Typography.Text>
          )}
          <CopyableChip label="ID" value={item.id} mono />
        </div>
      </div>

      {/* Status badges */}
      <Flex gap={8} className={styles.statusRow}>
        <Tag
          icon={isVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
          color={isVisible ? "success" : "default"}
        >
          {isVisible ? "Visible" : "Hidden"}
        </Tag>
        <Tag
          icon={isPreSelected ? <CheckCircleOutlined /> : <MinusCircleOutlined />}
          color={isPreSelected ? "blue" : "default"}
        >
          {isPreSelected ? "Pre-selected" : "Not selected"}
        </Tag>
      </Flex>

      <Divider className={styles.divider} />

      {/* Stats grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statItem}>
          <NumberOutlined className={styles.statIcon} />
          <div className={styles.statContent}>
            <Typography.Text type="secondary" className={styles.statLabel}>
              Quantity
            </Typography.Text>
            <Typography.Text strong>
              {item.minQty ?? 1} — {item.maxQty ?? "∞"}
            </Typography.Text>
          </div>
        </div>
        <div className={styles.statItem}>
          <DollarOutlined className={styles.statIcon} />
          <div className={styles.statContent}>
            <Typography.Text type="secondary" className={styles.statLabel}>
              {getPriceRuleType(item)}
            </Typography.Text>
            <Typography.Text strong>
              {getPriceRuleLabel(item)}
            </Typography.Text>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Group Inspector Content
// ============================================================================

interface IGroupInspectorContentProps {
  group: IBundleGroup;
}

const GroupInspectorContent = ({ group }: IGroupInspectorContentProps) => {
  const { styles } = useStyles();

  const isRequired = group.minSelection != null && group.minSelection > 0;
  const isMultiple = group.maxSelection == null || group.maxSelection > 1;
  const selectionLabel = getSelectionLabel(group);

  return (
    <div className={styles.content}>
      {/* Header */}
      <div className={styles.header}>
        <Avatar
          size={64}
          icon={<FolderOutlined />}
          className={styles.avatarGroup}
        />
        <div className={styles.headerInfo}>
          <Typography.Text strong className={styles.title}>
            {group.title}
          </Typography.Text>
          <CopyableChip label="ID" value={group.id} mono />
        </div>
      </div>

      {/* Status tags */}
      <Flex gap={8} className={styles.statusRow}>
        <Tag icon={isRequired ? <LockOutlined /> : <UnlockOutlined />}>
          {isRequired ? "Required" : "Optional"}
        </Tag>
        <Tag icon={isMultiple ? <CheckSquareOutlined /> : <CheckCircleOutlined />}>
          {isMultiple ? `Multiple ${selectionLabel ?? ""}` : "Single"}
        </Tag>
      </Flex>

      <Divider className={styles.divider} />

      {/* Items list */}
      <div className={styles.itemsList}>
        <Typography.Text type="secondary" className={styles.itemsLabel}>
          Items in group
        </Typography.Text>
        <div className={styles.itemsGrid}>
          {group.items.map((item) => (
            <div key={item.id} className={styles.itemChip}>
              <Avatar
                size={32}
                src={getItemImageUrl(item)}
                icon={<PictureOutlined />}
              />
              <Typography.Text ellipsis className={styles.itemChipText}>
                {getItemTitle(item)}
              </Typography.Text>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Bundle Inspector Content
// ============================================================================

interface IBundleInspectorContentProps {
  label: string;
  groups: IBundleGroup[];
}

const BundleInspectorContent = ({ label, groups }: IBundleInspectorContentProps) => {
  const { styles } = useStyles();
  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className={styles.content}>
      {/* Header */}
      <div className={styles.header}>
        <Avatar
          size={64}
          icon={<GiftOutlined />}
          className={styles.avatarBundle}
        />
        <div className={styles.headerInfo}>
          <Typography.Text strong className={styles.title}>
            {label}
          </Typography.Text>
          <Typography.Text type="secondary">
            Bundle Root
          </Typography.Text>
        </div>
      </div>

      {/* Stats tags */}
      <Flex gap={8} className={styles.statusRow}>
        <Tag icon={<FolderOutlined />}>
          {groups.length} groups
        </Tag>
        <Tag icon={<AppstoreOutlined />}>
          {totalItems} items
        </Tag>
      </Flex>

      <Divider className={styles.divider} />

      {/* Description */}
      <Typography.Paragraph type="secondary" className={styles.description}>
        This is the bundle root node. It represents the entire bundle configuration
        and is the target for bundle-level actions in dependency rules.
      </Typography.Paragraph>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const NodeInspector = ({
  selectedNode,
  groups,
  onRuleChange,
}: INodeInspectorProps) => {
  const { styles, cx } = useStyles();
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  // Collapsed view
  if (collapsed) {
    return (
      <Paper className={cx(styles.container, styles.containerCollapsed)}>
        <PaperHeader
          icon={null}
          bordered={false}
          extra={
            <Button
              type="text"
              size="small"
              icon={<LeftOutlined />}
              onClick={toggleCollapsed}
            />
          }
        />
        <div className={styles.collapsedContent}>
          <span className={styles.verticalText}>Inspector</span>
        </div>
      </Paper>
    );
  }

  // For rule nodes, delegate to RuleInspector
  if (selectedNode?.type === "rule") {
    return (
      <RuleInspector
        rule={selectedNode.rule}
        groups={groups}
        onRuleChange={onRuleChange}
      />
    );
  }

  // Get title and icon based on selected node type
  const getInspectorHeader = () => {
    switch (selectedNode?.type) {
      case "item":
        return { icon: CHART_NODE_ICONS[DependencyTargetType.ITEM], title: "Item Inspector" };
      case "group":
        return { icon: CHART_NODE_ICONS[DependencyTargetType.GROUP], title: "Group Inspector" };
      case "bundle":
        return { icon: CHART_NODE_ICONS[DependencyTargetType.BUNDLE], title: "Bundle Inspector" };
      default:
        return { icon: null, title: "Inspector" };
    }
  };

  const { icon, title } = getInspectorHeader();

  // Empty state
  if (!selectedNode) {
    return (
      <Paper className={styles.container}>
        <PaperHeader
          icon={null}
          title="Inspector"
          actions={
            <Button
              type="text"
              size="small"
              icon={<RightOutlined />}
              onClick={toggleCollapsed}
            />
          }
        />
        <div className={styles.content}>
          <Empty
            description="Select a node to view details"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      </Paper>
    );
  }

  return (
    <Paper className={styles.container}>
      <PaperHeader
        icon={icon}
        title={title}
        actions={
          <Button
            type="text"
            size="small"
            icon={<RightOutlined />}
            onClick={toggleCollapsed}
          />
        }
      />

      {selectedNode.type === "item" && (
        <ItemInspectorContent item={selectedNode.item} group={selectedNode.group} />
      )}
      {selectedNode.type === "group" && (
        <GroupInspectorContent group={selectedNode.group} />
      )}
      {selectedNode.type === "bundle" && (
        <BundleInspectorContent label={selectedNode.label} groups={groups} />
      )}
    </Paper>
  );
};
