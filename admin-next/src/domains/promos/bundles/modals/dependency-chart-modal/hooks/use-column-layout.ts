import { useState, useEffect } from "react";
import ELK from "elkjs/lib/elk.bundled.js";
import type { ChartNode, ChartEdge, ItemNodeData, HubNodeData, RuleSortMode } from "../types";
import { NODE_DIMENSIONS } from "../constants";

const elk = new ELK();

const ELK_OPTIONS = {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT",
  "elk.spacing.nodeNode": "40",
  "elk.layered.spacing.nodeNodeBetweenLayers": "80",
  "elk.spacing.edgeEdge": "20",
  "elk.padding": "[top=30,left=30,bottom=30,right=30]",
  "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
};

// ============================================================================
// Utils
// ============================================================================

/**
 * Reorders rule nodes by their input order (priority order).
 * Takes the Y positions ELK assigned and reassigns them to maintain priority ordering.
 */
const reorderRuleNodesByPriority = (
  nodes: ChartNode[],
  nodePositions: Map<string, { x: number; y: number }>
): void => {
  const ruleNodeIds = nodes.filter((n) => n.type === "rule").map((n) => n.id);

  if (ruleNodeIds.length <= 1) return;

  // Get the Y positions that ELK assigned to rule nodes (sorted top to bottom)
  const ruleYPositions = ruleNodeIds
    .map((id) => nodePositions.get(id)?.y ?? 0)
    .sort((a, b) => a - b);

  // Reassign Y positions based on input order (which is priority order)
  ruleNodeIds.forEach((id, index) => {
    const pos = nodePositions.get(id);
    if (pos) {
      pos.y = ruleYPositions[index];
    }
  });
};

// ============================================================================
// Hook
// ============================================================================

interface UseColumnLayoutOptions {
  nodes: ChartNode[];
  edges: ChartEdge[];
  sortMode: RuleSortMode;
}

export const useColumnLayout = ({ nodes, edges, sortMode }: UseColumnLayoutOptions): ChartNode[] => {
  const [positionedNodes, setLayoutedNodes] = useState<ChartNode[]>([]);

  useEffect(() => {
    if (nodes.length === 0) return;

    // Build lookup maps for determining node positions
    const sourceNodeIds = new Set<string>();
    const targetNodeIds = new Set<string>();

    edges.forEach((edge) => {
      const isSourceToRule =
        edge.target.startsWith("rule:") &&
        (edge.source.startsWith("item:") || edge.source.startsWith("group:"));
      const isRuleToTarget =
        edge.source.startsWith("rule:") &&
        (edge.target.startsWith("item:") ||
          edge.target.startsWith("group:") ||
          edge.target.startsWith("bundle:"));

      if (isSourceToRule) {
        sourceNodeIds.add(edge.source);
      }
      if (isRuleToTarget) {
        targetNodeIds.add(edge.target);
      }
    });

    // Build ELK graph structure
    const elkGraph = {
      id: "root",
      layoutOptions: ELK_OPTIONS,
      children: nodes.map((node) => {
        // For hub nodes, adjust height based on number of labels
        const baseDimensions = NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS] ?? {
          width: 200,
          height: 60,
        };

        let width = baseDimensions.width;
        let height = baseDimensions.height;

        if (node.type === "hub") {
          const hubData = node.data as HubNodeData;
          const labelCount = Math.min(hubData.labels?.length ?? 1, 2);
          const extraHeight = labelCount > 1 ? (labelCount - 1) * 16 : 0;
          height = height + extraHeight;
        }

        return {
          id: node.id,
          width,
          height,
        };
      }),
      edges: edges.map((edge, index) => ({
        id: `e${index}`,
        sources: [edge.source],
        targets: [edge.target],
      })),
    };

    elk
      .layout(elkGraph)
      .then((layoutResult) => {
        // First pass: get all positions from ELK
        const nodePositions = new Map<string, { x: number; y: number }>();
        layoutResult.children?.forEach((elkNode) => {
          nodePositions.set(elkNode.id, { x: elkNode.x ?? 0, y: elkNode.y ?? 0 });
        });

        // Reorder rule nodes by priority (skip for auto mode - let ELK decide)
        if (sortMode !== "auto") {
          reorderRuleNodesByPriority(nodes, nodePositions);
        }

        // Build final positioned nodes
        const positionedNodes = nodes.map((node) => {
          const position = nodePositions.get(node.id) ?? { x: 0, y: 0 };

          // Determine if this is a source or target node for the ItemNode component
          const isSource = sourceNodeIds.has(node.id);
          const isTarget = targetNodeIds.has(node.id);

          // For item nodes, add the position property to data
          if (node.type === "item") {
            return {
              ...node,
              data: {
                ...node.data,
                position: isSource ? "source" : isTarget ? "target" : undefined,
              } as ItemNodeData,
              position,
            } as ChartNode;
          }

          return {
            ...node,
            position,
          };
        });

        setLayoutedNodes(positionedNodes);
      })
      .catch((error) => {
        console.error("ELK layout error:", error);
        setLayoutedNodes(nodes);
      });
  }, [nodes, edges, sortMode]);

  return positionedNodes;
};
