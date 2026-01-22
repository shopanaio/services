import { useMemo } from "react";
import type { ChartNode, ItemNodeData } from "../types";

// ============================================================================
// Constants
// ============================================================================

const COLUMN_X = {
  left: 50,      // Items & Groups
  center: 500,   // Rules
  right: 900,    // Bundle
};

const NODE_HEIGHT = {
  item: 60,
  group: 90,
  rule: 80,
  bundle: 80,
};

const NODE_GAP = 20;
const GROUP_GAP = 50;

// ============================================================================
// Hook
// ============================================================================

interface UseColumnLayoutOptions {
  nodes: ChartNode[];
}

export const useColumnLayout = ({ nodes }: UseColumnLayoutOptions): ChartNode[] => {
  return useMemo(() => {
    const itemNodes = nodes.filter((n) => n.type === "item");
    const groupNodes = nodes.filter((n) => n.type === "group");
    const ruleNodes = nodes.filter((n) => n.type === "rule");
    const bundleNodes = nodes.filter((n) => n.type === "bundle");

    const positionedNodes: ChartNode[] = [];

    // ========================================
    // 1. Position items grouped by their group, with group card below
    // ========================================
    const itemsByGroup = new Map<string, ChartNode[]>();
    itemNodes.forEach((node) => {
      const groupId = (node.data as ItemNodeData).groupId;
      if (!itemsByGroup.has(groupId)) {
        itemsByGroup.set(groupId, []);
      }
      itemsByGroup.get(groupId)!.push(node);
    });

    let currentY = 0;

    groupNodes.forEach((groupNode) => {
      const groupId = groupNode.id.replace("group:", "");
      const groupItems = itemsByGroup.get(groupId) || [];

      // Position items of this group
      groupItems.forEach((itemNode) => {
        positionedNodes.push({
          ...itemNode,
          position: { x: COLUMN_X.left, y: currentY },
        });
        currentY += NODE_HEIGHT.item + NODE_GAP;
      });

      // Position the group node below its items
      positionedNodes.push({
        ...groupNode,
        position: { x: COLUMN_X.left, y: currentY },
      });
      currentY += NODE_HEIGHT.group + GROUP_GAP;
    });

    const totalLeftHeight = currentY;

    // ========================================
    // 2. Position rules in center column, spread evenly
    // ========================================
    const ruleCount = ruleNodes.length;
    const ruleSpacing = ruleCount > 1
      ? Math.min((totalLeftHeight - NODE_HEIGHT.rule) / (ruleCount - 1), NODE_HEIGHT.rule + NODE_GAP * 2)
      : 0;
    const ruleStartY = ruleCount > 1
      ? Math.max(0, (totalLeftHeight - (ruleCount - 1) * ruleSpacing - NODE_HEIGHT.rule) / 2)
      : Math.max(0, (totalLeftHeight - NODE_HEIGHT.rule) / 2);

    ruleNodes.forEach((node, index) => {
      positionedNodes.push({
        ...node,
        position: {
          x: COLUMN_X.center,
          y: ruleStartY + index * ruleSpacing
        },
      });
    });

    // ========================================
    // 3. Position bundle centered vertically on the right
    // ========================================
    const bundleCenterY = Math.max(0, (totalLeftHeight - NODE_HEIGHT.bundle) / 2);
    bundleNodes.forEach((node) => {
      positionedNodes.push({
        ...node,
        position: { x: COLUMN_X.right, y: bundleCenterY },
      });
    });

    return positionedNodes;
  }, [nodes]);
};

export default useColumnLayout;
