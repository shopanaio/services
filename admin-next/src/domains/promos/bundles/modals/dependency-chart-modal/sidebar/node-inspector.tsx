"use client";

import { useState, useCallback } from "react";
import {
  Typography,
  Button,
  Empty,
  Descriptions,
  Avatar,
  Tag,
} from "antd";
import {
  LeftOutlined,
  RightOutlined,
  FolderOutlined,
  PictureOutlined,
  GiftOutlined,
} from "@ant-design/icons";

import type { IBundleGroup, BundleItem } from "@/domains/promos/bundles/types";
import {
  PRICE_RULE_OPTIONS,
  ITEM_TYPE_LABELS,
  DependencyTargetType,
} from "@/domains/promos/bundles/types";
import { CHART_NODE_ICONS } from "@/domains/promos/bundles/dependency-rules";
import { Paper, PaperHeader } from "@/ui-kit/paper";

import type { SelectedNode } from "../types";
import { RuleInspector } from "./rule-inspector";
import { useStyles } from "./rule-inspector.styles";

// ============================================================================
// Types
// ============================================================================

interface INodeInspectorProps {
  selectedNode: SelectedNode;
  groups: IBundleGroup[];
  onRuleChange: (rule: import("@/domains/promos/bundles/types").IDependencyRule) => void;
}

// ============================================================================
// Helpers
// ============================================================================

const getItemImageUrl = (item: BundleItem): string | undefined => {
  return (
    item.featuredImage?.url ??
    item.assignedProduct?.featuredImage?.url ??
    item.assignedVariant?.featuredImage?.url ??
    item.assignedVariant?.product?.featuredImage?.url ??
    undefined
  );
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
  if (!item.pricingRule) return "No pricing rule";
  if ("name" in item.pricingRule) {
    return item.pricingRule.name;
  }
  const option = PRICE_RULE_OPTIONS.find(
    (o) => o.value === item.pricingRule.priceType
  );
  if (!option) return "Unknown";
  if (option.requiresValue && item.pricingRule.priceValue !== null) {
    return `${option.label}: ${item.pricingRule.priceValue}${option.valueSuffix ?? ""}`;
  }
  return option.label;
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

  return (
    <div className={styles.content}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Avatar
          size={56}
          src={imageUrl}
          icon={<PictureOutlined />}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Typography.Text style={{ fontSize: 11, color: "#888", display: "block" }}>
            {group.title}
          </Typography.Text>
          <Typography.Text strong style={{ fontSize: 14 }}>
            {title}
          </Typography.Text>
          {variantTitle && (
            <Typography.Text style={{ fontSize: 12, color: "#1890ff", display: "block" }}>
              {variantTitle}
            </Typography.Text>
          )}
        </div>
      </div>

      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="ID">
          <Typography.Text copyable code style={{ fontSize: 11 }}>
            {item.id}
          </Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Type">
          <Tag>{ITEM_TYPE_LABELS[item.itemType]}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Quantity">
          {item.minQty ?? 1} - {item.maxQty ?? "unlimited"}
        </Descriptions.Item>
        <Descriptions.Item label="Pricing Rule">
          {getPriceRuleLabel(item)}
        </Descriptions.Item>
        <Descriptions.Item label="Visible">
          <Tag color={item.visible === "no" ? "default" : "green"}>
            {item.visible === "no" ? "No" : "Yes"}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Pre-selected">
          <Tag color={item.selected === "yes" ? "blue" : "default"}>
            {item.selected === "yes" ? "Yes" : "No"}
          </Tag>
        </Descriptions.Item>
      </Descriptions>
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

  return (
    <div className={styles.content}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Avatar
          size={56}
          icon={<FolderOutlined />}
          style={{ backgroundColor: "#1890ff" }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Typography.Text strong style={{ fontSize: 14 }}>
            {group.title}
          </Typography.Text>
          <Typography.Text style={{ fontSize: 12, color: "#888", display: "block" }}>
            {group.items.length} item(s)
          </Typography.Text>
        </div>
      </div>

      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="ID">
          <Typography.Text copyable code style={{ fontSize: 11 }}>
            {group.id}
          </Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Selection Range">
          {group.minSelection ?? 0} - {group.maxSelection ?? "unlimited"}
        </Descriptions.Item>
        <Descriptions.Item label="Items">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {group.items.map((item) => (
              <Typography.Text key={item.id} style={{ fontSize: 12 }}>
                {getItemTitle(item)}
              </Typography.Text>
            ))}
          </div>
        </Descriptions.Item>
      </Descriptions>
    </div>
  );
};

// ============================================================================
// Bundle Inspector Content
// ============================================================================

interface IBundleInspectorContentProps {
  label: string;
}

const BundleInspectorContent = ({ label }: IBundleInspectorContentProps) => {
  const { styles } = useStyles();

  return (
    <div className={styles.content}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Avatar
          size={56}
          icon={<GiftOutlined />}
          style={{ backgroundColor: "#52c41a" }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Typography.Text strong style={{ fontSize: 14 }}>
            {label}
          </Typography.Text>
          <Typography.Text style={{ fontSize: 12, color: "#888", display: "block" }}>
            Bundle root node
          </Typography.Text>
        </div>
      </div>

      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
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
        <BundleInspectorContent label={selectedNode.label} />
      )}
    </Paper>
  );
};
