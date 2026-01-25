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
  HubNodeData,
  RuleSortMode,
} from "../types";

// ============================================================================
// Hook
// ============================================================================

interface UseDerivedGraphOptions {
  groups: IBundleGroup[];
  rules: IDependencyRule[];
  selectedRuleId: string | null;
  sortMode: RuleSortMode;
}

interface UseDerivedGraphResult {
  nodes: ChartNode[];
  edges: ChartEdge[];
}

export const useDerivedGraph = ({
  groups,
  rules,
  selectedRuleId,
  sortMode,
}: UseDerivedGraphOptions): UseDerivedGraphResult => {
  const theme = useTheme();

  return useMemo(() => {
    const nodes: ChartNode[] = [];
    const edges: ChartEdge[] = [];

    // Edge colors
    const conditionColor = theme.colorPrimary;
    const actionColor = theme.colorSuccess;

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

    // 5. Create rule nodes (sorted by priority based on sortMode)
    const sortedRules =
      sortMode === "auto"
        ? rules
        : [...rules].sort((a, b) =>
            sortMode === "desc" ? b.priority - a.priority : a.priority - b.priority
          );
    sortedRules.forEach((rule) => {
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

    // 6. Create hub nodes and edges with GLOBAL bundling
    // Strategy: Create one hub per unique (sourceNodeId + labels) for conditions
    // and one hub per unique (targetNodeId + labels) for actions.
    // Multiple rules can share the same hub.

    // Helper to get source node ID for a condition
    const getConditionSourceNodeId = (condition: IDependencyCondition): string | null => {
      if (!condition.targetId && condition.targetType !== DependencyTargetType.BUNDLE) return null;

      if (condition.targetType === DependencyTargetType.ITEM) {
        return duplicatedItemIds.has(condition.targetId!)
          ? `item:${condition.targetId}:source`
          : `item:${condition.targetId}`;
      } else if (condition.targetType === DependencyTargetType.GROUP) {
        return duplicatedGroupIds.has(condition.targetId!)
          ? `group:${condition.targetId}:source`
          : `group:${condition.targetId}`;
      } else {
        return "bundle:main";
      }
    };

    // Helper to get target node ID for an action
    const getActionTargetNodeId = (action: typeof rules[0]["actions"][0]): string | null => {
      if (action.targetType === DependencyTargetType.BUNDLE) {
        return "bundle:main";
      } else if (action.targetType === DependencyTargetType.ITEM) {
        if (!action.targetId) return null;
        return duplicatedItemIds.has(action.targetId)
          ? `item:${action.targetId}:target`
          : `item:${action.targetId}`;
      } else {
        if (!action.targetId) return null;
        return duplicatedGroupIds.has(action.targetId)
          ? `group:${action.targetId}:target`
          : `group:${action.targetId}`;
      }
    };

    // ========================================================================
    // GLOBAL condition hubs: key = label only (one hub per unique condition)
    // Track which (sourceItem, rule) pairs exist for proper highlighting
    // ========================================================================
    interface ConditionHubData {
      label: string;
      // Map: sourceNodeId → Set of ruleIds that use this source with this condition
      sourceToRules: Map<string, Set<string>>;
      ruleIds: Set<string>;
      isEnabled: boolean;
    }
    const conditionHubs = new Map<string, ConditionHubData>();

    sortedRules.forEach((rule) => {
      const conditions = getAllConditions(rule);

      conditions.forEach((condition) => {
        const sourceNodeId = getConditionSourceNodeId(condition);
        if (!sourceNodeId || !nodeIds.has(sourceNodeId)) return;

        const label = formatCondition(condition);
        const hubKey = label;

        const existing = conditionHubs.get(hubKey);
        if (existing) {
          if (!existing.sourceToRules.has(sourceNodeId)) {
            existing.sourceToRules.set(sourceNodeId, new Set());
          }
          existing.sourceToRules.get(sourceNodeId)!.add(rule.id);
          existing.ruleIds.add(rule.id);
          if (rule.enabled) existing.isEnabled = true;
        } else {
          const sourceToRules = new Map<string, Set<string>>();
          sourceToRules.set(sourceNodeId, new Set([rule.id]));
          conditionHubs.set(hubKey, {
            label,
            sourceToRules,
            ruleIds: new Set([rule.id]),
            isEnabled: rule.enabled,
          });
        }
      });
    });

    // ========================================================================
    // GLOBAL action hubs: key = label only (one hub per unique action)
    // Track which (rule, targetItem) pairs exist for proper highlighting
    // ========================================================================
    interface ActionHubData {
      label: string;
      // Map: targetNodeId → Set of ruleIds that target this item with this action
      targetToRules: Map<string, Set<string>>;
      ruleIds: Set<string>;
      isEnabled: boolean;
    }
    const actionHubs = new Map<string, ActionHubData>();

    sortedRules.forEach((rule) => {
      rule.actions.forEach((action) => {
        const targetNodeId = getActionTargetNodeId(action);
        if (!targetNodeId || !nodeIds.has(targetNodeId)) return;

        const label = formatAction(action);
        const hubKey = label;

        const existing = actionHubs.get(hubKey);
        if (existing) {
          if (!existing.targetToRules.has(targetNodeId)) {
            existing.targetToRules.set(targetNodeId, new Set());
          }
          existing.targetToRules.get(targetNodeId)!.add(rule.id);
          existing.ruleIds.add(rule.id);
          if (rule.enabled) existing.isEnabled = true;
        } else {
          const targetToRules = new Map<string, Set<string>>();
          targetToRules.set(targetNodeId, new Set([rule.id]));
          actionHubs.set(hubKey, {
            label,
            targetToRules,
            ruleIds: new Set([rule.id]),
            isEnabled: rule.enabled,
          });
        }
      });
    });

    // ========================================================================
    // Create condition hub nodes and edges
    // ========================================================================
    conditionHubs.forEach((hubData, hubKey) => {
      // Use label-based ID for stability (encode to avoid special chars)
      const hubId = `hub:cond:${encodeURIComponent(hubKey)}`;

      nodes.push({
        id: hubId,
        type: "hub",
        data: {
          hubType: "condition",
          labels: [hubData.label],
          ruleId: [...hubData.ruleIds][0],
          isEnabled: hubData.isEnabled,
        } as HubNodeData,
        position: { x: 0, y: 0 },
      });

      // Edges: source → hub (with ruleIds metadata for highlighting)
      hubData.sourceToRules.forEach((ruleIdsForSource, sourceNodeId) => {
        edges.push({
          id: `e:${sourceNodeId}->${hubId}`,
          source: sourceNodeId,
          target: hubId,
          type: "labeled",
          animated: false,
          style: { strokeWidth: 1, stroke: conditionColor },
          markerEnd: { type: MarkerType.ArrowClosed, color: conditionColor },
          data: { ruleIds: [...ruleIdsForSource] },
        });
      });

      // Edges: hub → rule
      hubData.ruleIds.forEach((ruleId) => {
        const ruleNodeId = `rule:${ruleId}`;
        edges.push({
          id: `e:${hubId}->${ruleNodeId}`,
          source: hubId,
          target: ruleNodeId,
          type: "labeled",
          animated: false,
          style: { strokeWidth: 1, stroke: conditionColor },
          markerEnd: { type: MarkerType.ArrowClosed, color: conditionColor },
          data: { ruleIds: [ruleId] },
        });
      });
    });

    // ========================================================================
    // Create action hub nodes and edges
    // ========================================================================
    actionHubs.forEach((hubData, hubKey) => {
      // Use label-based ID for stability (encode to avoid special chars)
      const hubId = `hub:action:${encodeURIComponent(hubKey)}`;

      nodes.push({
        id: hubId,
        type: "hub",
        data: {
          hubType: "action",
          labels: [hubData.label],
          ruleId: [...hubData.ruleIds][0],
          isEnabled: hubData.isEnabled,
        } as HubNodeData,
        position: { x: 0, y: 0 },
      });

      // Edges: rule → hub
      hubData.ruleIds.forEach((ruleId) => {
        const ruleNodeId = `rule:${ruleId}`;
        edges.push({
          id: `e:${ruleNodeId}->${hubId}`,
          source: ruleNodeId,
          target: hubId,
          type: "labeled",
          animated: false,
          style: { strokeWidth: 1, stroke: actionColor },
          markerEnd: { type: MarkerType.ArrowClosed, color: actionColor },
          data: { ruleIds: [ruleId] },
        });
      });

      // Edges: hub → target (with ruleIds metadata for highlighting)
      hubData.targetToRules.forEach((ruleIdsForTarget, targetNodeId) => {
        edges.push({
          id: `e:${hubId}->${targetNodeId}`,
          source: hubId,
          target: targetNodeId,
          type: "labeled",
          animated: false,
          style: { strokeWidth: 1, stroke: actionColor },
          markerEnd: { type: MarkerType.ArrowClosed, color: actionColor },
          data: { ruleIds: [...ruleIdsForTarget] },
        });
      });
    });

    return { nodes, edges };
  }, [groups, rules, selectedRuleId, sortMode, theme]);
};
