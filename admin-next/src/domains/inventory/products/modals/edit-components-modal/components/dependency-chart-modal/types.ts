import type { Node, Edge } from "@xyflow/react";
import type {
  IDependencyRule,
  IDependencyCondition,
  IDependencyAction,
  IComponentGroup,
  ComponentItem,
} from "../../types";

// ============================================================================
// Node Data Types (with index signature for React Flow compatibility)
// ============================================================================

export interface ItemNodeData {
  item: ComponentItem | { id: string; title: string; isGroup?: boolean };
  groupId: string;
  groupTitle: string;
  /** Item position in layout: source (top) or target (bottom). Set by layout hook. */
  position?: "source" | "target";
  /** True if this node represents a group, not an item */
  isGroup?: boolean;
  [key: string]: unknown;
}

export interface GroupNodeData {
  group: IComponentGroup;
  /** Group position in layout: source (top) or target (bottom). Set by layout hook. */
  position?: "source" | "target";
  [key: string]: unknown;
}

export interface DefaultNodeData {
  label: string;
  [key: string]: unknown;
}

export interface RuleNodeData {
  rule: IDependencyRule;
  isSelected: boolean;
  [key: string]: unknown;
}

export interface BundleNodeData {
  label: string;
  [key: string]: unknown;
}

// ============================================================================
// Node Types
// ============================================================================

export type ItemNode = Node<ItemNodeData, "item">;
export type GroupNode = Node<GroupNodeData, "group">;
export type RuleNode = Node<RuleNodeData, "rule">;
export type BundleNode = Node<BundleNodeData, "bundle">;
export type DefaultNode = Node<DefaultNodeData, "default">;

export type ChartNode = ItemNode | GroupNode | RuleNode | BundleNode | DefaultNode;

// ============================================================================
// Edge Data Types (with index signature for React Flow compatibility)
// ============================================================================

export interface ConditionEdgeData {
  condition: IDependencyCondition;
  label: string;
  [key: string]: unknown;
}

export interface ActionEdgeData {
  action: IDependencyAction;
  label: string;
  [key: string]: unknown;
}

export type ChartEdge = Edge<ConditionEdgeData | ActionEdgeData>;

// ============================================================================
// Handle IDs
// ============================================================================

export const ITEM_HANDLES = {
  // Output handles (for conditions)
  COND_SELECTED: "cond:selected",
  COND_NOT_SELECTED: "cond:notSelected",
  COND_QTY: "cond:qty",
  // Input handles (for actions)
  ACT_AVAILABILITY: "act:availability",
  ACT_VISIBILITY: "act:visibility",
  ACT_PRICE: "act:price",
  ACT_QTY: "act:qty",
} as const;

export const GROUP_HANDLES = {
  // Output handles
  COND_VALID: "cond:valid",
  COND_INVALID: "cond:invalid",
  COND_COUNT_UNIQUE: "cond:countUnique",
  COND_COUNT_TOTAL: "cond:countTotal",
  // Input handles
  ACT_VISIBILITY: "act:visibility",
  ACT_AVAILABILITY: "act:availability",
} as const;

export const RULE_HANDLES = {
  INPUT: "in",
  OUTPUT: "out",
} as const;

export const BUNDLE_HANDLES = {
  ACT_PRICE: "act:price",
} as const;
