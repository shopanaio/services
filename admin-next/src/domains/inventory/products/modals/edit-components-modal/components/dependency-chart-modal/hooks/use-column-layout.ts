import { useMemo } from "react";
import type { ChartNode, ChartEdge, ItemNodeData } from "../types";

// ============================================================================
// Constants
// ============================================================================

const ROW_Y = {
  sources: 0,     // Source items (condition triggers)
  rules: 200,     // Rules in the middle
  targets: 400,   // Target items (action receivers)
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

    // Determine which items are sources (have edges going TO rules)
    // and which are targets (have edges coming FROM rules)
    const sourceItemIds = new Set<string>();
    const targetItemIds = new Set<string>();

    edges.forEach((edge) => {
      if (edge.source.startsWith("item:") && edge.target.startsWith("rule:")) {
        sourceItemIds.add(edge.source);
      }
      if (edge.source.startsWith("rule:") && edge.target.startsWith("item:")) {
        targetItemIds.add(edge.target);
      }
    });

    // Separate items into sources and targets
    // Items that are both source and target go to sources
    const sourceItems: ChartNode[] = [];
    const targetItems: ChartNode[] = [];

    itemNodes.forEach((node) => {
      const isSource = sourceItemIds.has(node.id);
      const isTarget = targetItemIds.has(node.id);

      if (isSource) {
        sourceItems.push(node);
      } else if (isTarget) {
        targetItems.push(node);
      }
      // Items that are neither source nor target are not shown
    });

    // Group items by groupId for better organization
    const groupSourceItems = (items: ChartNode[]) => {
      const byGroup = new Map<string, ChartNode[]>();
      items.forEach((node) => {
        const groupId = (node.data as ItemNodeData).groupId;
        if (!byGroup.has(groupId)) {
          byGroup.set(groupId, []);
        }
        byGroup.get(groupId)!.push(node);
      });
      // Flatten back maintaining group order
      const result: ChartNode[] = [];
      byGroup.forEach((groupItems) => {
        result.push(...groupItems);
      });
      return result;
    };

    const sortedSourceItems = groupSourceItems(sourceItems);
    const sortedTargetItems = groupSourceItems(targetItems);

    const positionedNodes: ChartNode[] = [];

    // ========================================
    // 1. Position source items at the top
    // ========================================
    const sourceRowWidth = sortedSourceItems.length * (NODE_WIDTH.item + NODE_GAP) - NODE_GAP;
    const sourceStartX = -sourceRowWidth / 2 + NODE_WIDTH.item / 2;

    sortedSourceItems.forEach((node, index) => {
      const isAlsoTarget = targetItemIds.has(node.id);
      positionedNodes.push({
        ...node,
        data: {
          ...node.data,
          position: isAlsoTarget ? "both" : "source",
        } as ItemNodeData,
        position: {
          x: sourceStartX + index * (NODE_WIDTH.item + NODE_GAP),
          y: ROW_Y.sources,
        },
      } as ChartNode);
    });

    // ========================================
    // 2. Position rules in the middle
    // ========================================
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

    // ========================================
    // 3. Position target items at the bottom
    // ========================================
    const targetRowWidth = sortedTargetItems.length * (NODE_WIDTH.item + NODE_GAP) - NODE_GAP;
    const targetStartX = -targetRowWidth / 2 + NODE_WIDTH.item / 2;

    sortedTargetItems.forEach((node, index) => {
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

    return positionedNodes;
  }, [nodes, edges]);
};

export default useColumnLayout;
