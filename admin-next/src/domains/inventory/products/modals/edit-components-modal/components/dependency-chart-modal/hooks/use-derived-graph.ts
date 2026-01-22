import { useMemo } from "react";

import type { IComponentGroup, IDependencyRule } from "../../../types";
import {
  DependencyConditionType,
  DependencyActionType,
  DependencyTargetType,
  CONDITION_TYPE_LABELS,
  ACTION_TYPE_LABELS,
  PRICE_RULE_OPTIONS,
} from "../../../types";
import { MarkerType } from "@xyflow/react";
import type { ChartNode, ChartEdge, ItemNodeData, RuleNodeData, BundleNodeData } from "../types";

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

    // 1. First pass: collect which items/groups are used as sources (conditions) and targets (actions)
    const sourceItemIds = new Set<string>();
    const targetItemIds = new Set<string>();
    const sourceGroupIds = new Set<string>();
    const targetGroupIds = new Set<string>();
    let hasBundleTarget = false;

    rules.forEach((rule) => {
      rule.conditions.forEach((condition) => {
        if (condition.targetType === DependencyTargetType.ITEM && condition.targetId) {
          sourceItemIds.add(condition.targetId);
        }
        if (condition.targetType === DependencyTargetType.GROUP && condition.targetId) {
          sourceGroupIds.add(condition.targetId);
        }
      });
      rule.actions.forEach((action) => {
        if (action.targetType === DependencyTargetType.ITEM && action.targetId) {
          targetItemIds.add(action.targetId);
        }
        if (action.targetType === DependencyTargetType.GROUP && action.targetId) {
          targetGroupIds.add(action.targetId);
        }
        if (action.targetType === DependencyTargetType.BUNDLE) {
          hasBundleTarget = true;
        }
      });
    });

    // Items/groups that appear in both need to be duplicated
    const duplicatedItemIds = new Set<string>();
    sourceItemIds.forEach((id) => {
      if (targetItemIds.has(id)) {
        duplicatedItemIds.add(id);
      }
    });

    const duplicatedGroupIds = new Set<string>();
    sourceGroupIds.forEach((id) => {
      if (targetGroupIds.has(id)) {
        duplicatedGroupIds.add(id);
      }
    });

    // 2. Create item nodes - duplicate items that are both source and target
    const nodeIds = new Set<string>();

    groups.forEach((group) => {
      group.items.forEach((item) => {
        const isDuplicated = duplicatedItemIds.has(item.id);
        const isSource = sourceItemIds.has(item.id);
        const isTarget = targetItemIds.has(item.id);

        // Skip items not used in any rule
        if (!isSource && !isTarget) return;

        if (isDuplicated) {
          // Create separate source and target nodes
          const sourceNodeId = `item:${item.id}:source`;
          nodeIds.add(sourceNodeId);
          nodes.push({
            id: sourceNodeId,
            type: "item",
            data: {
              item,
              groupId: group.id,
              groupTitle: group.title,
            } as ItemNodeData,
            position: { x: 0, y: 0 },
          });

          const targetNodeId = `item:${item.id}:target`;
          nodeIds.add(targetNodeId);
          nodes.push({
            id: targetNodeId,
            type: "item",
            data: {
              item,
              groupId: group.id,
              groupTitle: group.title,
            } as ItemNodeData,
            position: { x: 0, y: 0 },
          });
        } else {
          // Single node
          const nodeId = `item:${item.id}`;
          nodeIds.add(nodeId);
          nodes.push({
            id: nodeId,
            type: "item",
            data: {
              item,
              groupId: group.id,
              groupTitle: group.title,
            } as ItemNodeData,
            position: { x: 0, y: 0 },
          });
        }
      });
    });

    // 3. Create group nodes as "item" type - duplicate groups that are both source and target
    groups.forEach((group) => {
      const isDuplicated = duplicatedGroupIds.has(group.id);
      const isSource = sourceGroupIds.has(group.id);
      const isTarget = targetGroupIds.has(group.id);

      // Skip groups not used in any rule
      if (!isSource && !isTarget) return;

      const groupNodeData = {
        item: { id: group.id, title: group.title },
        groupId: group.id,
        groupTitle: `${group.items.length} items`,
        isGroup: true,
      };

      if (isDuplicated) {
        // Create separate source and target nodes
        const sourceNodeId = `group:${group.id}:source`;
        nodeIds.add(sourceNodeId);
        nodes.push({
          id: sourceNodeId,
          type: "item",
          data: groupNodeData as unknown as ItemNodeData,
          position: { x: 0, y: 0 },
        });

        const targetNodeId = `group:${group.id}:target`;
        nodeIds.add(targetNodeId);
        nodes.push({
          id: targetNodeId,
          type: "item",
          data: groupNodeData as unknown as ItemNodeData,
          position: { x: 0, y: 0 },
        });
      } else {
        // Single node
        const nodeId = `group:${group.id}`;
        nodeIds.add(nodeId);
        nodes.push({
          id: nodeId,
          type: "item",
          data: groupNodeData as unknown as ItemNodeData,
          position: { x: 0, y: 0 },
        });
      }
    });

    // 4. Create bundle node if needed
    if (hasBundleTarget) {
      const bundleNodeId = "bundle:main";
      nodeIds.add(bundleNodeId);
      nodes.push({
        id: bundleNodeId,
        type: "bundle",
        data: {
          label: "Bundle",
        } as BundleNodeData,
        position: { x: 0, y: 0 },
      });
    }

    // 5. Create rule nodes
    rules.forEach((rule) => {
      const ruleNodeId = `rule:${rule.id}`;
      nodeIds.add(ruleNodeId);

      nodes.push({
        id: ruleNodeId,
        type: "rule",
        data: {
          rule,
          isSelected: rule.id === selectedRuleId,
        } as RuleNodeData,
        position: { x: 0, y: 0 },
      });
    });

    // 6. First pass: collect labels by groups
    // Conditions: group by SOURCE item
    // Actions: group by TARGET item
    const conditionSourceLabelsMap = new Map<string, string[]>();
    const actionTargetLabelsMap = new Map<string, string[]>();

    rules.forEach((rule) => {
      // Collect condition labels by SOURCE
      rule.conditions.forEach((condition) => {
        if (condition.targetType === DependencyTargetType.BUNDLE) return;
        if (!condition.targetId) return;

        let sourceNodeId: string;
        if (condition.targetType === DependencyTargetType.ITEM) {
          sourceNodeId = duplicatedItemIds.has(condition.targetId)
            ? `item:${condition.targetId}:source`
            : `item:${condition.targetId}`;
        } else {
          sourceNodeId = duplicatedGroupIds.has(condition.targetId)
            ? `group:${condition.targetId}:source`
            : `group:${condition.targetId}`;
        }

        const label = formatConditionLabel(condition.conditionType, condition.value);
        if (!conditionSourceLabelsMap.has(sourceNodeId)) {
          conditionSourceLabelsMap.set(sourceNodeId, []);
        }
        conditionSourceLabelsMap.get(sourceNodeId)!.push(label);
      });

      // Collect action labels by TARGET
      rule.actions.forEach((action) => {
        let targetNodeId: string;
        if (action.targetType === DependencyTargetType.BUNDLE) {
          targetNodeId = "bundle:main";
        } else if (action.targetType === DependencyTargetType.ITEM) {
          if (!action.targetId) return;
          targetNodeId = duplicatedItemIds.has(action.targetId)
            ? `item:${action.targetId}:target`
            : `item:${action.targetId}`;
        } else {
          if (!action.targetId) return;
          targetNodeId = duplicatedGroupIds.has(action.targetId)
            ? `group:${action.targetId}:target`
            : `group:${action.targetId}`;
        }

        const label = formatActionLabel(
          action.actionType,
          action.priceType,
          action.priceValue,
          action.qtyValue
        );
        if (!actionTargetLabelsMap.has(targetNodeId)) {
          actionTargetLabelsMap.set(targetNodeId, []);
        }
        actionTargetLabelsMap.get(targetNodeId)!.push(label);
      });
    });

    // 7. Create edges with grouped labels
    rules.forEach((rule) => {
      const ruleNodeId = `rule:${rule.id}`;

      // Condition edges: grouped by SOURCE item
      rule.conditions.forEach((condition) => {
        if (condition.targetType === DependencyTargetType.BUNDLE) return;
        if (!condition.targetId) return;

        let sourceNodeId: string;
        if (condition.targetType === DependencyTargetType.ITEM) {
          sourceNodeId = duplicatedItemIds.has(condition.targetId)
            ? `item:${condition.targetId}:source`
            : `item:${condition.targetId}`;
        } else {
          sourceNodeId = duplicatedGroupIds.has(condition.targetId)
            ? `group:${condition.targetId}:source`
            : `group:${condition.targetId}`;
        }

        if (!nodeIds.has(sourceNodeId)) return;

        // All condition labels from this source item
        const allLabels = conditionSourceLabelsMap.get(sourceNodeId) ?? [];

        edges.push({
          id: `cond:${condition.id}`,
          source: sourceNodeId,
          target: ruleNodeId,
          type: "labeled",
          animated: false,
          style: {
            stroke: rule.enabled ? "#1890ff" : "#d9d9d9",
            strokeWidth: 1,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: rule.enabled ? "#1890ff" : "#d9d9d9",
          },
          data: {
            condition,
            label: formatConditionLabel(condition.conditionType, condition.value),
            labels: allLabels,
          },
        });
      });

      // Action edges: grouped by TARGET item
      rule.actions.forEach((action) => {
        let targetNodeId: string;
        if (action.targetType === DependencyTargetType.BUNDLE) {
          targetNodeId = "bundle:main";
        } else if (action.targetType === DependencyTargetType.ITEM) {
          if (!action.targetId) return;
          targetNodeId = duplicatedItemIds.has(action.targetId)
            ? `item:${action.targetId}:target`
            : `item:${action.targetId}`;
        } else {
          if (!action.targetId) return;
          targetNodeId = duplicatedGroupIds.has(action.targetId)
            ? `group:${action.targetId}:target`
            : `group:${action.targetId}`;
        }

        if (!nodeIds.has(targetNodeId)) return;

        // All action labels going to this target item
        const allLabels = actionTargetLabelsMap.get(targetNodeId) ?? [];

        edges.push({
          id: `action:${action.id}`,
          source: ruleNodeId,
          target: targetNodeId,
          type: "labeled",
          animated: false,
          style: {
            stroke: rule.enabled ? "#52c41a" : "#d9d9d9",
            strokeWidth: 1,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: rule.enabled ? "#52c41a" : "#d9d9d9",
          },
          data: {
            action,
            label: formatActionLabel(
              action.actionType,
              action.priceType,
              action.priceValue,
              action.qtyValue
            ),
            labels: allLabels,
          },
        });
      });
    });

    return { nodes, edges };
  }, [groups, rules, selectedRuleId]);
};

export default useDerivedGraph;
