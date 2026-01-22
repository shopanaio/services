import { useMemo } from "react";
import type { Edge } from "@xyflow/react";

import type { IComponentGroup, IDependencyRule } from "../../../types";
import {
  DependencyConditionType,
  DependencyActionType,
  DependencyTargetType,
  CONDITION_TYPE_LABELS,
  ACTION_TYPE_LABELS,
  PRICE_RULE_OPTIONS,
} from "../../../types";
import type { ChartNode, ChartEdge, ItemNodeData, GroupNodeData, RuleNodeData, BundleNodeData } from "../types";

// ============================================================================
// Helper Functions
// ============================================================================

const formatConditionLabel = (
  conditionType: DependencyConditionType,
  value?: number
): string => {
  const label = CONDITION_TYPE_LABELS[conditionType];
  if (value !== undefined) {
    return `${label} ${value}`;
  }
  return label;
};

const formatActionLabel = (
  actionType: DependencyActionType,
  priceType?: string,
  priceValue?: number | null,
  qtyValue?: number
): string => {
  const label = ACTION_TYPE_LABELS[actionType];

  if (actionType === DependencyActionType.SET_QTY && qtyValue !== undefined) {
    return `${label} ${qtyValue}`;
  }

  if (
    (actionType === DependencyActionType.OVERRIDE_PRICE ||
      actionType === DependencyActionType.ADJUST_PRICE) &&
    priceType
  ) {
    const priceOption = PRICE_RULE_OPTIONS.find((o) => o.value === priceType);
    const priceName = priceOption?.label ?? priceType;
    const value =
      priceValue !== null && priceValue !== undefined
        ? `${priceValue}${priceOption?.valueSuffix ?? ""}`
        : "";
    return `${label}: ${priceName} ${value}`.trim();
  }

  return label;
};

// ============================================================================
// Hook
// ============================================================================

interface UseDerivedGraphOptions {
  groups: IComponentGroup[];
  rules: IDependencyRule[];
  selectedRuleId: string | null;
}

interface UseDerivedGraphResult {
  nodes: ChartNode[];
  edges: ChartEdge[];
}

export const useDerivedGraph = ({
  groups,
  rules,
  selectedRuleId,
}: UseDerivedGraphOptions): UseDerivedGraphResult => {
  return useMemo(() => {
    const nodes: ChartNode[] = [];
    const edges: ChartEdge[] = [];

    // 1. Create item nodes from groups
    groups.forEach((group) => {
      group.items.forEach((item) => {
        const itemNode: ChartNode = {
          id: `item:${item.id}`,
          type: "item",
          data: {
            item,
            groupId: group.id,
            groupTitle: group.title,
          } as ItemNodeData,
          position: { x: 0, y: 0 }, // Will be set by layout hook
        };
        nodes.push(itemNode);
      });
    });

    // 2. Create group nodes
    groups.forEach((group) => {
      const groupNode: ChartNode = {
        id: `group:${group.id}`,
        type: "group",
        data: { group } as GroupNodeData,
        position: { x: 0, y: 0 },
      };
      nodes.push(groupNode);
    });

    // 3. Create bundle node (single node representing the bundle)
    const bundleNode: ChartNode = {
      id: "bundle:main",
      type: "bundle",
      data: { label: "Bundle" } as BundleNodeData,
      position: { x: 0, y: 0 },
    };
    nodes.push(bundleNode);

    // 4. Create rule nodes and edges
    rules.forEach((rule) => {
      const ruleNode: ChartNode = {
        id: `rule:${rule.id}`,
        type: "rule",
        data: {
          rule,
          isSelected: rule.id === selectedRuleId,
        } as RuleNodeData,
        position: { x: 0, y: 0 },
      };
      nodes.push(ruleNode);

      // Create edges from condition sources to rule
      rule.conditions.forEach((condition) => {
        const sourceNodeId =
          condition.targetType === DependencyTargetType.BUNDLE
            ? "bundle:main"
            : `${condition.targetType.toLowerCase()}:${condition.targetId}`;

        const edge: ChartEdge = {
          id: `cond:${condition.id}`,
          source: sourceNodeId,
          target: `rule:${rule.id}`,
          label: formatConditionLabel(condition.conditionType, condition.value),
          type: "default",
          animated: rule.enabled,
          style: {
            stroke: rule.enabled ? "#1890ff" : "#d9d9d9",
            strokeWidth: 2,
          },
          data: {
            condition,
            label: formatConditionLabel(condition.conditionType, condition.value),
          },
        };
        edges.push(edge);
      });

      // Create edges from rule to action targets
      rule.actions.forEach((action) => {
        const targetNodeId =
          action.targetType === DependencyTargetType.BUNDLE
            ? "bundle:main"
            : action.targetId
            ? `${action.targetType.toLowerCase()}:${action.targetId}`
            : "bundle:main";

        const edge: ChartEdge = {
          id: `action:${action.id}`,
          source: `rule:${rule.id}`,
          target: targetNodeId,
          label: formatActionLabel(
            action.actionType,
            action.priceType,
            action.priceValue,
            action.qtyValue
          ),
          type: "default",
          animated: rule.enabled,
          style: {
            stroke: rule.enabled ? "#52c41a" : "#d9d9d9",
            strokeWidth: 2,
          },
          data: {
            action,
            label: formatActionLabel(
              action.actionType,
              action.priceType,
              action.priceValue,
              action.qtyValue
            ),
          },
        };
        edges.push(edge);
      });
    });

    return { nodes, edges };
  }, [groups, rules, selectedRuleId]);
};

export default useDerivedGraph;
