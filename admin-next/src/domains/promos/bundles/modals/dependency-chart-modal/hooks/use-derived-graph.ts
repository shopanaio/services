import { useMemo } from "react";
import { useTheme } from "antd-style";
import { MarkerType } from "@xyflow/react";

import type { IBundleGroup } from "@/domains/promos/bundles/types";
import type { IDependencyRule } from "@/domains/promos/bundles/dependency-rules";
import {
  DependencyTargetType,
  formatCondition,
  formatAction,
} from "@/domains/promos/bundles/dependency-rules";
import type { IDependencyCondition } from "@/domains/promos/bundles/dependency-rules";
import type {
  ChartNode,
  ChartEdge,
  ItemNodeData,
  RuleNodeData,
  BundleNodeData,
} from "../types";

// ============================================================================
// Hook
// ============================================================================

interface UseDerivedGraphOptions {
  groups: IBundleGroup[];
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
  const theme = useTheme();

  return useMemo(() => {
    const nodes: ChartNode[] = [];
    const edges: ChartEdge[] = [];

    // Edge colors from theme
    const conditionColor = theme.colorPrimary;
    const actionColor = theme.colorSuccess;
    const disabledColor = theme.colorBorder;

    // Helper: flatten all conditions from a rule's condition groups
    const getAllConditions = (rule: IDependencyRule): IDependencyCondition[] =>
      rule.conditionGroups.flatMap((g) => g.conditions);

    // 1. First pass: collect which items/groups are used as sources (conditions) and targets (actions)
    const sourceItemIds = new Set<string>();
    const targetItemIds = new Set<string>();
    const sourceGroupIds = new Set<string>();
    const targetGroupIds = new Set<string>();
    let hasBundleSource = false;
    let hasBundleTarget = false;

    rules.forEach((rule) => {
      getAllConditions(rule).forEach((condition) => {
        if (condition.targetType === DependencyTargetType.ITEM && condition.targetId) {
          sourceItemIds.add(condition.targetId);
        }
        if (condition.targetType === DependencyTargetType.GROUP && condition.targetId) {
          sourceGroupIds.add(condition.targetId);
        }
        if (condition.targetType === DependencyTargetType.BUNDLE) {
          hasBundleSource = true;
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
    if (hasBundleSource || hasBundleTarget) {
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

    // 6. Create edges - deduplicated by (source, target) pair with combined labels
    // Map key: "sourceNodeId->targetNodeId", value: { labels, conditions/actions, rule info }
    interface ConditionEdgeGroup {
      sourceNodeId: string;
      ruleNodeId: string;
      labels: string[];
      firstCondition: IDependencyCondition;
      rule: IDependencyRule;
    }
    interface ActionEdgeGroup {
      ruleNodeId: string;
      targetNodeId: string;
      labels: string[];
      firstAction: typeof rules[0]["actions"][0];
      rule: IDependencyRule;
    }

    const conditionEdgeGroups = new Map<string, ConditionEdgeGroup>();
    const actionEdgeGroups = new Map<string, ActionEdgeGroup>();

    rules.forEach((rule) => {
      const ruleNodeId = `rule:${rule.id}`;

      // Group conditions by (sourceNodeId -> ruleNodeId)
      getAllConditions(rule).forEach((condition) => {
        if (!condition.targetId && condition.targetType !== DependencyTargetType.BUNDLE) return;

        let sourceNodeId: string;
        if (condition.targetType === DependencyTargetType.ITEM) {
          sourceNodeId = duplicatedItemIds.has(condition.targetId!)
            ? `item:${condition.targetId}:source`
            : `item:${condition.targetId}`;
        } else if (condition.targetType === DependencyTargetType.GROUP) {
          sourceNodeId = duplicatedGroupIds.has(condition.targetId!)
            ? `group:${condition.targetId}:source`
            : `group:${condition.targetId}`;
        } else {
          sourceNodeId = "bundle:main";
        }

        if (!nodeIds.has(sourceNodeId)) return;

        const edgeKey = `${sourceNodeId}->${ruleNodeId}`;
        const label = formatCondition(condition);

        const existing = conditionEdgeGroups.get(edgeKey);
        if (existing) {
          existing.labels.push(label);
        } else {
          conditionEdgeGroups.set(edgeKey, {
            sourceNodeId,
            ruleNodeId,
            labels: [label],
            firstCondition: condition,
            rule,
          });
        }
      });

      // Group actions by (ruleNodeId -> targetNodeId)
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

        const edgeKey = `${ruleNodeId}->${targetNodeId}`;
        const label = formatAction(action);

        const existing = actionEdgeGroups.get(edgeKey);
        if (existing) {
          existing.labels.push(label);
        } else {
          actionEdgeGroups.set(edgeKey, {
            ruleNodeId,
            targetNodeId,
            labels: [label],
            firstAction: action,
            rule,
          });
        }
      });
    });

    // 7. Create deduplicated edges
    conditionEdgeGroups.forEach((group, edgeKey) => {
      const edgeColor = group.rule.enabled ? conditionColor : disabledColor;

      edges.push({
        id: `cond:${edgeKey}`,
        source: group.sourceNodeId,
        target: group.ruleNodeId,
        type: "labeled",
        animated: false,
        style: {
          stroke: edgeColor,
          strokeWidth: 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
        },
        data: {
          condition: group.firstCondition,
          label: group.labels[0],
          labels: group.labels,
          tagColor: group.rule.enabled ? "blue" : "default",
        },
      });
    });

    actionEdgeGroups.forEach((group, edgeKey) => {
      const actionEdgeColor = group.rule.enabled ? actionColor : disabledColor;

      edges.push({
        id: `action:${edgeKey}`,
        source: group.ruleNodeId,
        target: group.targetNodeId,
        type: "labeled",
        animated: false,
        style: {
          stroke: actionEdgeColor,
          strokeWidth: 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: actionEdgeColor,
        },
        data: {
          action: group.firstAction,
          label: group.labels[0],
          labels: group.labels,
          tagColor: group.rule.enabled ? "green" : "default",
        },
      });
    });

    return { nodes, edges };
  }, [groups, rules, selectedRuleId, theme]);
};
