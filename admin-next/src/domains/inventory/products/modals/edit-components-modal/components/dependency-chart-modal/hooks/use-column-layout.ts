import { useMemo } from "react";
import type { ChartNode, ItemNodeData } from "../types";

// ============================================================================
// Constants
// ============================================================================

const COLUMN_X = {
  items: 50,     // Items
  groups: 300,   // Groups
  rules: 600,    // Rules
};

const NODE_HEIGHT = {
  item: 60,
  group: 90,
  rule: 80,
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

    const positionedNodes: ChartNode[] = [];

    // ========================================
    // 1. Position items and groups side by side
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

      const groupStartY = currentY;

      // Position items of this group
      groupItems.forEach((itemNode) => {
        positionedNodes.push({
          ...itemNode,
          position: { x: COLUMN_X.items, y: currentY },
        });
        currentY += NODE_HEIGHT.item + NODE_GAP;
      });

      // Calculate group center Y (middle of its items)
      const groupItemsHeight = groupItems.length * (NODE_HEIGHT.item + NODE_GAP) - NODE_GAP;
      const groupCenterY = groupStartY + (groupItemsHeight - NODE_HEIGHT.group) / 2;

      // Position the group node to the right, vertically centered with its items
      positionedNodes.push({
        ...groupNode,
        position: { x: COLUMN_X.groups, y: Math.max(groupStartY, groupCenterY) },
      });

      currentY += GROUP_GAP;
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
          x: COLUMN_X.rules,
          y: ruleStartY + index * ruleSpacing
        },
      });
    });

    return positionedNodes;
  }, [nodes]);
};

export default useColumnLayout;
