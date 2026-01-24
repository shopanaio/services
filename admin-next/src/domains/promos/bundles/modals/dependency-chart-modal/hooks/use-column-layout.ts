import { useMemo } from "react";
import type { ChartNode, ChartEdge, ItemNodeData } from "../types";

// ============================================================================
// Constants
// ============================================================================

const ROW_Y = {
  sources: 0,
  rules: 200,
  targets: 400,
};

const NODE_WIDTH = {
  item: 220,
  rule: 200,
};

const NODE_GAP = 30;

// ============================================================================
// Hook
// ============================================================================

interface UseColumnLayoutOptions {
  nodes: ChartNode[];
  edges: ChartEdge[];
}

export const useColumnLayout = ({ nodes, edges }: UseColumnLayoutOptions): ChartNode[] => {
  return useMemo(() => {
    const itemNodes = nodes.filter((n) => n.type === "item");
    const ruleNodes = nodes.filter((n) => n.type === "rule");
    const bundleNodes = nodes.filter((n) => n.type === "bundle");

    // Determine which nodes are sources and which are targets
    const sourceNodeIds = new Set<string>();
    const targetNodeIds = new Set<string>();

    edges.forEach((edge) => {
      const isSourceToRule =
        edge.target.startsWith("rule:") &&
        (edge.source.startsWith("item:") || edge.source.startsWith("group:"));
      const isRuleToTarget =
        edge.source.startsWith("rule:") &&
        (edge.target.startsWith("item:") || edge.target.startsWith("group:"));

      if (isSourceToRule) {
        sourceNodeIds.add(edge.source);
      }
      if (isRuleToTarget) {
        targetNodeIds.add(edge.target);
      }
    });

    // Separate nodes into sources and targets
    const sourceNodes: ChartNode[] = [];
    const targetNodes: ChartNode[] = [];

    itemNodes.forEach((node) => {
      if (sourceNodeIds.has(node.id)) {
        sourceNodes.push(node);
      } else if (targetNodeIds.has(node.id)) {
        targetNodes.push(node);
      }
    });

    // Sort by groupId for better organization
    const sortByGroupId = (items: ChartNode[]): ChartNode[] => {
      const byGroup = new Map<string, ChartNode[]>();

      items.forEach((node) => {
        const groupId = (node.data as ItemNodeData).groupId;
        const groupNodes = byGroup.get(groupId) ?? [];
        groupNodes.push(node);
        byGroup.set(groupId, groupNodes);
      });

      const result: ChartNode[] = [];
      byGroup.forEach((groupItems) => {
        result.push(...groupItems);
      });
      return result;
    };

    const allSourceNodes = sortByGroupId(sourceNodes);
    const allTargetNodes = sortByGroupId(targetNodes);

    const positionedNodes: ChartNode[] = [];

    // 1. Position source items/groups at the top
    const sourceRowWidth = allSourceNodes.length * (NODE_WIDTH.item + NODE_GAP) - NODE_GAP;
    const sourceStartX = -sourceRowWidth / 2 + NODE_WIDTH.item / 2;

    allSourceNodes.forEach((node, index) => {
      positionedNodes.push({
        ...node,
        data: {
          ...node.data,
          position: "source",
        } as ItemNodeData,
        position: {
          x: sourceStartX + index * (NODE_WIDTH.item + NODE_GAP),
          y: ROW_Y.sources,
        },
      } as ChartNode);
    });

    // 2. Position rules in the middle
    const rulesRowWidth = ruleNodes.length * (NODE_WIDTH.rule + NODE_GAP) - NODE_GAP;
    const rulesStartX = -rulesRowWidth / 2 + NODE_WIDTH.rule / 2;

    ruleNodes.forEach((node, index) => {
      positionedNodes.push({
        ...node,
        position: {
          x: rulesStartX + index * (NODE_WIDTH.rule + NODE_GAP),
          y: ROW_Y.rules,
        },
      });
    });

    // 3. Position target items/groups and bundle at the bottom
    const bundleWidth = 120;
    const targetRowWidth =
      allTargetNodes.length * (NODE_WIDTH.item + NODE_GAP) +
      bundleNodes.length * (bundleWidth + NODE_GAP) -
      NODE_GAP;
    const targetStartX = -targetRowWidth / 2 + NODE_WIDTH.item / 2;

    allTargetNodes.forEach((node, index) => {
      positionedNodes.push({
        ...node,
        data: {
          ...node.data,
          position: "target",
        } as ItemNodeData,
        position: {
          x: targetStartX + index * (NODE_WIDTH.item + NODE_GAP),
          y: ROW_Y.targets,
        },
      } as ChartNode);
    });

    // Position bundle nodes after target items/groups
    bundleNodes.forEach((node, index) => {
      const bundleX =
        allTargetNodes.length > 0
          ? targetStartX +
            allTargetNodes.length * (NODE_WIDTH.item + NODE_GAP) +
            index * (bundleWidth + NODE_GAP)
          : index * (bundleWidth + NODE_GAP) -
            (bundleNodes.length * (bundleWidth + NODE_GAP) - NODE_GAP) / 2;

      positionedNodes.push({
        ...node,
        position: {
          x: bundleX,
          y: ROW_Y.targets,
        },
      });
    });

    return positionedNodes;
  }, [nodes, edges]);
};
