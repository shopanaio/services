import type { Node, Edge } from "@xyflow/react";
import type { BundleItem, IBundleGroup } from "@/domains/promos/bundles/types";
import type {
  IDependencyRule,
  IDependencyCondition,
  IDependencyAction,
} from "@/domains/promos/bundles/dependency-rules";

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
  [key: string]: unknown;
}

export interface BundleNodeData {
  label: string;
  isSelected?: boolean;
  [key: string]: unknown;
}

// ============================================================================
// Node Types
// ============================================================================

export type ItemNode = Node<ItemNodeData, "item">;
export type RuleNode = Node<RuleNodeData, "rule">;
export type BundleNode = Node<BundleNodeData, "bundle">;

export type ChartNode = ItemNode | RuleNode | BundleNode;

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
