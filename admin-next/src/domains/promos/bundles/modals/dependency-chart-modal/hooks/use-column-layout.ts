import { useState, useEffect } from "react";
import ELK from "elkjs/lib/elk.bundled.js";
import type { ChartNode, ChartEdge, ItemNodeData } from "../types";
import { NODE_DIMENSIONS } from "../constants";

const elk = new ELK();

const ELK_OPTIONS = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.spacing.nodeNode": "50",
  "elk.layered.spacing.nodeNodeBetweenLayers": "100",
  "elk.spacing.edgeEdge": "20",
  "elk.padding": "[top=40,left=40,bottom=40,right=40]",
  "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
};

// ============================================================================
// Hook
// ============================================================================

interface UseColumnLayoutOptions {
  nodes: ChartNode[];
  edges: ChartEdge[];
}

export const useColumnLayout = ({ nodes, edges }: UseColumnLayoutOptions): ChartNode[] => {
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
        const dimensions = NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS] ?? {
          width: 200,
          height: 60,
        };
        return {
          id: node.id,
          width: dimensions.width,
          height: dimensions.height,
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
        const positionedNodes = nodes.map((node) => {
          const elkNode = layoutResult.children?.find((n) => n.id === node.id);

          const position = {
            x: elkNode?.x ?? 0,
            y: elkNode?.y ?? 0,
          };

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
  }, [nodes, edges]);

  return positionedNodes;
};
