import { useMemo } from "react";
import type { ChartNode } from "../types";

// ============================================================================
// Constants
// ============================================================================

const COLUMN_X = {
  items: 50,
  groups: 50,
  rules: 400,
  bundle: 750,
};

const NODE_HEIGHT = {
  item: 60,
  group: 80,
  rule: 70,
  bundle: 60,
};

const NODE_GAP = 20;
const SECTION_GAP = 40;

// ============================================================================
// Hook
// ============================================================================

interface UseColumnLayoutOptions {
  nodes: ChartNode[];
}

export const useColumnLayout = ({ nodes }: UseColumnLayoutOptions): ChartNode[] => {
  return useMemo(() => {
    // Separate nodes by type
    const itemNodes = nodes.filter((n) => n.type === "item");
    const groupNodes = nodes.filter((n) => n.type === "group");
    const ruleNodes = nodes.filter((n) => n.type === "rule");
    const bundleNodes = nodes.filter((n) => n.type === "bundle");

    const positionedNodes: ChartNode[] = [];

    // Position items in left column
    let itemY = 0;
    itemNodes.forEach((node) => {
      positionedNodes.push({
        ...node,
        position: { x: COLUMN_X.items, y: itemY },
      });
      itemY += NODE_HEIGHT.item + NODE_GAP;
    });

    // Position groups below items
    let groupY = itemY + SECTION_GAP;
    groupNodes.forEach((node) => {
      positionedNodes.push({
        ...node,
        position: { x: COLUMN_X.groups, y: groupY },
      });
      groupY += NODE_HEIGHT.group + NODE_GAP;
    });

    // Position rules in center column
    let ruleY = 0;
    ruleNodes.forEach((node) => {
      positionedNodes.push({
        ...node,
        position: { x: COLUMN_X.rules, y: ruleY },
      });
      ruleY += NODE_HEIGHT.rule + NODE_GAP;
    });

    // Position bundle in right column (centered vertically)
    const totalLeftHeight = Math.max(groupY, itemY);
    const bundleCenterY = Math.max(0, (totalLeftHeight - NODE_HEIGHT.bundle) / 2);
    bundleNodes.forEach((node, index) => {
      positionedNodes.push({
        ...node,
        position: { x: COLUMN_X.bundle, y: bundleCenterY + index * (NODE_HEIGHT.bundle + NODE_GAP) },
      });
    });

    return positionedNodes;
  }, [nodes]);
};

export default useColumnLayout;
