"use client";

import { useCallback, useState } from "react";
import { Typography, Button, Empty, Avatar, Tag, Flex, Divider } from "antd";
import {
  LuChevronLeft as LeftOutlined,
  LuChevronRight as RightOutlined,
  LuFolder as FolderOutlined,
  LuImage as PictureOutlined,
  LuGift as GiftOutlined,
  LuEye as EyeOutlined,
  LuEyeOff as EyeInvisibleOutlined,
  LuCircleCheck as CheckCircleOutlined,
  LuSquareCheckBig as CheckSquareOutlined,
  LuCircleMinus as MinusCircleOutlined,
  LuHash as NumberOutlined,
  LuCircleDollarSign as DollarOutlined,
  LuLayoutGrid as AppstoreOutlined,
  LuLockKeyhole as LockOutlined,
  LuLockOpen as UnlockOutlined,
} from "react-icons/lu";

import type {
  ApiProductComponentDependencyRule,
  ApiProductComponentGroup,
  ApiProductComponentItem,
} from "@/graphql/types";
import { ProductComponentDependencyTargetType } from "@/graphql/types";
import { getPriceRuleLabel as formatPriceRule } from "@/domains/inventory/products/components/product-details-card/sections/groups-section/helpers";
import { CHART_NODE_ICONS } from "@/domains/inventory/products/components/product-details-card/components-ui/dependency-rules";
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
  groups: ApiProductComponentGroup[];
  onRuleChange: (rule: ApiProductComponentDependencyRule) => void;
}

// ============================================================================
// Helpers
// ============================================================================

const getItemImageUrl = (item: ApiProductComponentItem): string | undefined => {
  // Product component items have their own featuredImage field.
  return item.featuredImage?.url ?? undefined;
};

const getItemTitle = (item: ApiProductComponentItem): string => {
  return item.title ?? item.refProduct?.title ?? item.refVariant?.product?.title ?? "Unnamed";
};

const getVariantTitle = (item: ApiProductComponentItem): string | undefined => {
  return item.refVariant?.title ?? undefined;
};

const getPriceRuleLabel = (item: ApiProductComponentItem): string => {
  const rule = item.pricingTemplate?.priceRule ?? item.priceRule;
  return rule ? (formatPriceRule(rule, item.pricingTemplate?.name) ?? "Base price") : "No rule";
};

const getPriceRuleType = (item: ApiProductComponentItem): string => {
  if (item.pricingTemplate) return "Template";
  return item.priceRule?.strategy ?? "None";
};

const getSelectionLabel = (group: ApiProductComponentGroup): string | null => {
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
  item: ApiProductComponentItem;
  group: ApiProductComponentGroup;
}

const ItemInspectorContent = ({ item, group }: IItemInspectorContentProps) => {
  const { styles } = useStyles();
  const imageUrl = getItemImageUrl(item);
  const title = getItemTitle(item);
  const variantTitle = getVariantTitle(item);

  const isVisible = item.visible;
  const isPreSelected = item.selected;

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
            <Typography.Text strong>{getPriceRuleLabel(item)}</Typography.Text>
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
  group: ApiProductComponentGroup;
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
        <Avatar size={64} icon={<FolderOutlined />} className={styles.avatarGroup} />
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
              <Avatar size={32} src={getItemImageUrl(item)} icon={<PictureOutlined />} />
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
// Component Inspector Content
// ============================================================================

interface IComponentInspectorContentProps {
  label: string;
  groups: ApiProductComponentGroup[];
}

const ComponentInspectorContent = ({ label, groups }: IComponentInspectorContentProps) => {
  const { styles } = useStyles();
  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className={styles.content}>
      {/* Header */}
      <div className={styles.header}>
        <Avatar size={64} icon={<GiftOutlined />} className={styles.avatarComponent} />
        <div className={styles.headerInfo}>
          <Typography.Text strong className={styles.title}>
            {label}
          </Typography.Text>
          <Typography.Text type="secondary">Components Root</Typography.Text>
        </div>
      </div>

      {/* Stats tags */}
      <Flex gap={8} className={styles.statusRow}>
        <Tag icon={<FolderOutlined />}>{groups.length} groups</Tag>
        <Tag icon={<AppstoreOutlined />}>{totalItems} items</Tag>
      </Flex>

      <Divider className={styles.divider} />

      {/* Description */}
      <Typography.Paragraph type="secondary" className={styles.description}>
        This is the components root node. It represents the entire component configuration and is
        the target for component-level actions in dependency rules.
      </Typography.Paragraph>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const NodeInspector = ({ selectedNode, groups, onRuleChange }: INodeInspectorProps) => {
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
            <Button type="text" size="small" icon={<LeftOutlined />} onClick={toggleCollapsed} />
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
    return <RuleInspector rule={selectedNode.rule} groups={groups} onRuleChange={onRuleChange} />;
  }

  // Get title and icon based on selected node type
  const getInspectorHeader = () => {
    switch (selectedNode?.type) {
      case "item":
        return {
          icon: CHART_NODE_ICONS[ProductComponentDependencyTargetType.Item],
          title: "Item Inspector",
        };
      case "group":
        return {
          icon: CHART_NODE_ICONS[ProductComponentDependencyTargetType.Group],
          title: "Group Inspector",
        };
      case "component":
        return {
          icon: CHART_NODE_ICONS[ProductComponentDependencyTargetType.Configuration],
          title: "Components Inspector",
        };
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
            <Button type="text" size="small" icon={<RightOutlined />} onClick={toggleCollapsed} />
          }
        />
        <div className={styles.content}>
          <Empty description="Select a node to view details" image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
          <Button type="text" size="small" icon={<RightOutlined />} onClick={toggleCollapsed} />
        }
      />

      {selectedNode.type === "item" && (
        <ItemInspectorContent item={selectedNode.item} group={selectedNode.group} />
      )}
      {selectedNode.type === "group" && <GroupInspectorContent group={selectedNode.group} />}
      {selectedNode.type === "component" && (
        <ComponentInspectorContent label={selectedNode.label} groups={groups} />
      )}
    </Paper>
  );
};
