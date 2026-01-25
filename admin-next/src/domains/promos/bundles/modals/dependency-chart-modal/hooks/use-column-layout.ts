import { useMemo } from "react";
import dagre from "@dagrejs/dagre";
import type { ChartNode, ChartEdge, ItemNodeData } from "../types";

// ============================================================================
// Constants
// ============================================================================

const NODE_DIMENSIONS = {
  item: { width: 220, height: 90 },
  rule: { width: 200, height: 70 },
  bundle: { width: 120, height: 50 },
};

const GRAPH_CONFIG = {
  rankdir: "TB" as const, // Top to Bottom
  nodesep: 50, // Horizontal spacing between nodes
  ranksep: 100, // Vertical spacing between ranks (layers)
  edgesep: 20, // Spacing between edges
  marginx: 40,
  marginy: 40,
};

// ============================================================================
// Hook
// ============================================================================

interface UseColumnLayoutOptions {
  nodes: ChartNode[];
  edges: ChartEdge[];
}

export const useColumnLayout = ({ nodes, edges }: UseColumnLayoutOptions): ChartNode[] => {
  return useMemo(() => {
    if (nodes.length === 0) return [];

    // Create a new dagre graph
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph(GRAPH_CONFIG);

    // Add nodes with their dimensions
    nodes.forEach((node) => {
      const dimensions = NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS] ?? {
        width: 200,
        height: 60,
      };
      g.setNode(node.id, { ...dimensions });
    });

    // Add edges for dagre to calculate optimal positions
    edges.forEach((edge) => {
      g.setEdge(edge.source, edge.target);
    });

    // Run the dagre layout algorithm
    dagre.layout(g);

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

    // Apply calculated positions to nodes
    return nodes.map((node) => {
      const nodeWithPosition = g.node(node.id) as { x: number; y: number };
      const dimensions = NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS] ?? {
        width: 200,
        height: 60,
      };

      // Determine if this is a source or target node for the ItemNode component
      const isSource = sourceNodeIds.has(node.id);
      const isTarget = targetNodeIds.has(node.id);

      // Center the node around the dagre-calculated position
      const position = {
        x: nodeWithPosition.x - dimensions.width / 2,
        y: nodeWithPosition.y - dimensions.height / 2,
      };

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
  }, [nodes, edges]);
};
