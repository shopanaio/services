import type { Node, Edge } from "@xyflow/react";
import type { BundleItem, IBundleGroup } from "@/domains/promos/bundles/types";
import type {
  IDependencyRule,
  IDependencyCondition,
  IDependencyAction,
} from "@/domains/promos/bundles/dependency-rules";

// ============================================================================
// Sort Mode
// ============================================================================

export type RuleSortMode = "asc" | "desc" | "auto";

// ============================================================================
// Node Data Types (with index signature for React Flow compatibility)
// ============================================================================

export interface ItemNodeData {
  item: BundleItem | { id: string; title: string; isGroup?: boolean };
  groupId: string;
  groupTitle: string;
  /** Item position in layout: source (top) or target (bottom). Set by layout hook. */
  position?: "source" | "target";
  /** True if this node represents a group, not an item */
  isGroup?: boolean;
  /** True if this node is selected */
  isSelected?: boolean;
  /** True if this node should be dimmed (not in selected path) */
  isDimmed?: boolean;
  [key: string]: unknown;
}

// ============================================================================
// Selected Node Types
// ============================================================================

export type SelectedNodeType = "rule" | "item" | "group" | "bundle" | null;

export interface SelectedRuleNode {
  type: "rule";
  rule: IDependencyRule;
}

export interface SelectedItemNode {
  type: "item";
  item: BundleItem;
  group: IBundleGroup;
}

export interface SelectedGroupNode {
  type: "group";
  group: IBundleGroup;
}

export interface SelectedBundleNode {
  type: "bundle";
  label: string;
}

export type SelectedNode =
  | SelectedRuleNode
  | SelectedItemNode
  | SelectedGroupNode
  | SelectedBundleNode
  | null;

export interface RuleNodeData {
  rule: IDependencyRule;
  isSelected: boolean;
  /** True if this node should be dimmed (not in selected path) */
  isDimmed?: boolean;
  [key: string]: unknown;
}

export interface BundleNodeData {
  label: string;
  isSelected?: boolean;
  /** True if this node should be dimmed (not in selected path) */
  isDimmed?: boolean;
  [key: string]: unknown;
}

export type HubType = "condition" | "action";

export interface HubNodeData {
  /** Type of hub: condition (before rule) or action (after rule) */
  hubType: HubType;
  /** Labels to display (e.g., "qty >= 2", "disable") */
  labels: string[];
  /** The rule this hub belongs to */
  ruleId: string;
  /** Rule priority for display */
  rulePriority?: number;
  /** Rule name for display */
  ruleName?: string;
  /** Whether the associated rule is enabled */
  isEnabled?: boolean;
  /** True if this node is selected */
  isSelected?: boolean;
  /** True if this node should be dimmed (not in selected path) */
  isDimmed?: boolean;
  [key: string]: unknown;
}

// ============================================================================
// Node Types
// ============================================================================

export type ItemNode = Node<ItemNodeData, "item">;
export type RuleNode = Node<RuleNodeData, "rule">;
export type BundleNode = Node<BundleNodeData, "bundle">;
export type HubNode = Node<HubNodeData, "hub">;

export type ChartNode = ItemNode | RuleNode | BundleNode | HubNode;

// ============================================================================
// Edge Data Types (with index signature for React Flow compatibility)
// ============================================================================

export interface ConditionEdgeData {
  condition: IDependencyCondition;
  label: string;
  /** All labels for edges pointing to the same target */
  labels?: string[];
  tagColor?: string;
  [key: string]: unknown;
}

export interface ActionEdgeData {
  action: IDependencyAction;
  label: string;
  /** All labels for edges pointing to the same target */
  labels?: string[];
  tagColor?: string;
  [key: string]: unknown;
}

export type ChartEdge = Edge<ConditionEdgeData | ActionEdgeData>;
