"use client";

import { createContext, useContext, useMemo, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { Edge } from "@xyflow/react";

interface PathHighlightContextValue {
  selectedNodeId: string | null;
  highlightedNodeIds: Set<string>;
  highlightedEdgeIds: Set<string>;
  setSelectedNodeId: (nodeId: string | null) => void;
  setEdges: (edges: Edge[]) => void;
}

const PathHighlightContext = createContext<PathHighlightContextValue | null>(null);

interface PathHighlightProviderProps {
  children: ReactNode;
}

export const PathHighlightProvider = ({ children }: PathHighlightProviderProps) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [edges, setEdgesState] = useState<Edge[]>([]);

  const setEdges = useCallback((newEdges: Edge[]) => {
    setEdgesState(newEdges);
  }, []);

  // Build adjacency map from edges
  const adjacencyMap = useMemo(() => {
    const outgoing = new Map<string, Array<{ nodeId: string; edgeId: string }>>();
    const incoming = new Map<string, Array<{ nodeId: string; edgeId: string }>>();

    edges.forEach((edge) => {
      if (!outgoing.has(edge.source)) {
        outgoing.set(edge.source, []);
      }
      outgoing.get(edge.source)!.push({ nodeId: edge.target, edgeId: edge.id });

      if (!incoming.has(edge.target)) {
        incoming.set(edge.target, []);
      }
      incoming.get(edge.target)!.push({ nodeId: edge.source, edgeId: edge.id });
    });

    return { outgoing, incoming };
  }, [edges]);

  // Calculate highlighted nodes and edges based on selected node
  // Follow arrows: when -> rule -> then (full path in both directions)
  const { highlightedNodeIds, highlightedEdgeIds } = useMemo(() => {
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();

    if (!selectedNodeId) {
      return { highlightedNodeIds: nodeIds, highlightedEdgeIds: edgeIds };
    }

    // Add selected node
    nodeIds.add(selectedNodeId);

    // Go upstream (follow arrows backwards): who points to me, and who points to them, etc.
    const upstreamQueue = [selectedNodeId];
    const visitedUpstream = new Set<string>();
    while (upstreamQueue.length > 0) {
      const currentId = upstreamQueue.shift()!;
      if (visitedUpstream.has(currentId)) continue;
      visitedUpstream.add(currentId);

      const incomingEdges = adjacencyMap.incoming.get(currentId);
      if (incomingEdges) {
        incomingEdges.forEach(({ nodeId, edgeId }) => {
          nodeIds.add(nodeId);
          edgeIds.add(edgeId);
          if (!visitedUpstream.has(nodeId)) {
            upstreamQueue.push(nodeId);
          }
        });
      }
    }

    // Go downstream (follow arrows forward): where do I point, and where do they point, etc.
    const downstreamQueue = [selectedNodeId];
    const visitedDownstream = new Set<string>();
    while (downstreamQueue.length > 0) {
      const currentId = downstreamQueue.shift()!;
      if (visitedDownstream.has(currentId)) continue;
      visitedDownstream.add(currentId);

      const outgoingEdges = adjacencyMap.outgoing.get(currentId);
      if (outgoingEdges) {
        outgoingEdges.forEach(({ nodeId, edgeId }) => {
          nodeIds.add(nodeId);
          edgeIds.add(edgeId);
          if (!visitedDownstream.has(nodeId)) {
            downstreamQueue.push(nodeId);
          }
        });
      }
    }

    return { highlightedNodeIds: nodeIds, highlightedEdgeIds: edgeIds };
  }, [selectedNodeId, adjacencyMap]);

  const value = useMemo(
    () => ({
      selectedNodeId,
      highlightedNodeIds,
      highlightedEdgeIds,
      setSelectedNodeId,
      setEdges,
    }),
    [selectedNodeId, highlightedNodeIds, highlightedEdgeIds, setEdges]
  );

  return (
    <PathHighlightContext.Provider value={value}>
      {children}
    </PathHighlightContext.Provider>
  );
};

export const usePathHighlightContext = () => {
  const context = useContext(PathHighlightContext);
  if (!context) {
    throw new Error("usePathHighlightContext must be used within PathHighlightProvider");
  }
  return context;
};
