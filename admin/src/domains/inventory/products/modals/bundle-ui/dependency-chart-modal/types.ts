import {
  Node,
  Edge } from "@xyflow/react";
import type {
  ApiProductComponentGroup,
  ApiProductComponentItem,
} from "@/graphql/types";
import type { ApiProductComponentDependencyRule } from "@/graphql/types";

// ============================================================================
// Sort Mode
// ============================================================================

export type RuleSortMode = "asc" | "desc" | "auto";

// ============================================================================
// Node Data Types (with index signature for React Flow compatibility)
// ============================================================================

export interface ItemNodeData {
  item: ApiProductComponentItem | { id: string; title: string; isGroup?: boolean };
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
  /** True if this node is highlighted (in selected path) */
  isHighlighted?: boolean;
  [key: string]: unknown;
}

// ============================================================================
// Selected Node Types
// ============================================================================

export type SelectedNodeType = "rule" | "item" | "group" | "bundle" | null;

export interface SelectedRuleNode {
  type: "rule";
  rule: ApiProductComponentDependencyRule;
}

export interface SelectedItemNode {
  type: "item";
  item: ApiProductComponentItem;
  group: ApiProductComponentGroup;
}

export interface SelectedGroupNode {
  type: "group";
  group: ApiProductComponentGroup;
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
  rule: ApiProductComponentDependencyRule;
  isSelected: boolean;
  /** True if this node should be dimmed (not in selected path) */
  isDimmed?: boolean;
  /** True if this node is highlighted (in selected path) */
  isHighlighted?: boolean;
  [key: string]: unknown;
}

export interface BundleNodeData {
  label: string;
  isSelected?: boolean;
  /** True if this node should be dimmed (not in selected path) */
  isDimmed?: boolean;
  /** True if this node is highlighted (in selected path) */
  isHighlighted?: boolean;
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
  /** True if this node is highlighted (in selected path) */
  isHighlighted?: boolean;
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

export interface ChartEdgeData {
  /** Rule IDs this edge belongs to (for path highlighting) */
  ruleIds?: string[];
  [key: string]: unknown;
}

export type ChartEdge = Edge<ChartEdgeData>;
