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
  // Use ruleIds from edge data to filter only relevant paths
  const { highlightedNodeIds, highlightedEdgeIds } = useMemo(() => {
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();

    if (!selectedNodeId) {
      return { highlightedNodeIds: nodeIds, highlightedEdgeIds: edgeIds };
    }

    nodeIds.add(selectedNodeId);

    const isConditionHub = (id: string) => id.startsWith("hub:cond:");
    const isActionHub = (id: string) => id.startsWith("hub:action:");
    const isRule = (id: string) => id.startsWith("rule:");
    const isItem = (id: string) => id.startsWith("item:") || id.startsWith("group:") || id.startsWith("bundle:");

    // Get ruleId from "rule:xxx" node id
    const extractRuleId = (nodeId: string) => nodeId.replace("rule:", "");

    // Helper: get ruleIds from edge data
    const getEdgeRuleIds = (edgeId: string): string[] => {
      const edge = edges.find((e) => e.id === edgeId);
      return (edge?.data as { ruleIds?: string[] })?.ruleIds ?? [];
    };

    // Helper: highlight path for a specific rule, filtering edges by ruleId
    const highlightRulePathFiltered = (ruleId: string) => {
      const ruleNodeId = `rule:${ruleId}`;
      nodeIds.add(ruleNodeId);

      // When: condition hubs → source items (only edges with this ruleId)
      adjacencyMap.incoming.get(ruleNodeId)?.forEach(({ nodeId: hubId, edgeId }) => {
        if (isConditionHub(hubId)) {
          const edgeRuleIds = getEdgeRuleIds(edgeId);
          if (edgeRuleIds.includes(ruleId)) {
            nodeIds.add(hubId);
            edgeIds.add(edgeId);
            // Source items - only edges that belong to this rule
            adjacencyMap.incoming.get(hubId)?.forEach(({ nodeId: itemId, edgeId: itemEdgeId }) => {
              if (isItem(itemId)) {
                const itemEdgeRuleIds = getEdgeRuleIds(itemEdgeId);
                if (itemEdgeRuleIds.includes(ruleId)) {
                  nodeIds.add(itemId);
                  edgeIds.add(itemEdgeId);
                }
              }
            });
          }
        }
      });

      // Then: action hubs → target items (only edges with this ruleId)
      adjacencyMap.outgoing.get(ruleNodeId)?.forEach(({ nodeId: hubId, edgeId }) => {
        if (isActionHub(hubId)) {
          const edgeRuleIds = getEdgeRuleIds(edgeId);
          if (edgeRuleIds.includes(ruleId)) {
            nodeIds.add(hubId);
            edgeIds.add(edgeId);
            // Target items - only edges that belong to this rule
            adjacencyMap.outgoing.get(hubId)?.forEach(({ nodeId: itemId, edgeId: itemEdgeId }) => {
              if (isItem(itemId)) {
                const itemEdgeRuleIds = getEdgeRuleIds(itemEdgeId);
                if (itemEdgeRuleIds.includes(ruleId)) {
                  nodeIds.add(itemId);
                  edgeIds.add(itemEdgeId);
                }
              }
            });
          }
        }
      });
    };

    if (isRule(selectedNodeId)) {
      // Selected Rule: show only its own when → then
      const ruleId = extractRuleId(selectedNodeId);
      highlightRulePathFiltered(ruleId);

    } else if (isItem(selectedNodeId)) {
      // Check if this item is a source (when) or target (then)
      const rulesAsSource = new Set<string>();
      const rulesAsTarget = new Set<string>();

      // As source (when): item → condition hub → rule
      adjacencyMap.outgoing.get(selectedNodeId)?.forEach(({ nodeId: hubId, edgeId }) => {
        if (isConditionHub(hubId)) {
          const ruleIds = getEdgeRuleIds(edgeId);
          ruleIds.forEach((ruleId) => rulesAsSource.add(ruleId));
        }
      });

      // As target (then): item ← action hub ← rule
      adjacencyMap.incoming.get(selectedNodeId)?.forEach(({ nodeId: hubId, edgeId }) => {
        if (isActionHub(hubId)) {
          const ruleIds = getEdgeRuleIds(edgeId);
          ruleIds.forEach((ruleId) => rulesAsTarget.add(ruleId));
        }
      });

      // If item is a source (when): show this item + hubs + rules + THEN side only
      rulesAsSource.forEach((ruleId) => {
        const ruleNodeId = `rule:${ruleId}`;
        nodeIds.add(ruleNodeId);

        // This item's outgoing edges to condition hubs
        adjacencyMap.outgoing.get(selectedNodeId)?.forEach(({ nodeId: hubId, edgeId }) => {
          if (isConditionHub(hubId)) {
            const edgeRuleIds = getEdgeRuleIds(edgeId);
            if (edgeRuleIds.includes(ruleId)) {
              nodeIds.add(hubId);
              edgeIds.add(edgeId);
              // Hub → rule edge
              adjacencyMap.outgoing.get(hubId)?.forEach(({ nodeId: targetId, edgeId: hubEdgeId }) => {
                if (targetId === ruleNodeId) {
                  edgeIds.add(hubEdgeId);
                }
              });
            }
          }
        });

        // THEN side: rule → action hubs → all target items
        adjacencyMap.outgoing.get(ruleNodeId)?.forEach(({ nodeId: hubId, edgeId }) => {
          if (isActionHub(hubId)) {
            const edgeRuleIds = getEdgeRuleIds(edgeId);
            if (edgeRuleIds.includes(ruleId)) {
              nodeIds.add(hubId);
              edgeIds.add(edgeId);
              adjacencyMap.outgoing.get(hubId)?.forEach(({ nodeId: itemId, edgeId: itemEdgeId }) => {
                if (isItem(itemId)) {
                  const itemEdgeRuleIds = getEdgeRuleIds(itemEdgeId);
                  if (itemEdgeRuleIds.includes(ruleId)) {
                    nodeIds.add(itemId);
                    edgeIds.add(itemEdgeId);
                  }
                }
              });
            }
          }
        });
      });

      // If item is a target (then): show WHEN side + rules + hubs + this item
      rulesAsTarget.forEach((ruleId) => {
        const ruleNodeId = `rule:${ruleId}`;
        nodeIds.add(ruleNodeId);

        // WHEN side: all source items → condition hubs → rule
        adjacencyMap.incoming.get(ruleNodeId)?.forEach(({ nodeId: hubId, edgeId }) => {
          if (isConditionHub(hubId)) {
            const edgeRuleIds = getEdgeRuleIds(edgeId);
            if (edgeRuleIds.includes(ruleId)) {
              nodeIds.add(hubId);
              edgeIds.add(edgeId);
              adjacencyMap.incoming.get(hubId)?.forEach(({ nodeId: itemId, edgeId: itemEdgeId }) => {
                if (isItem(itemId)) {
                  const itemEdgeRuleIds = getEdgeRuleIds(itemEdgeId);
                  if (itemEdgeRuleIds.includes(ruleId)) {
                    nodeIds.add(itemId);
                    edgeIds.add(itemEdgeId);
                  }
                }
              });
            }
          }
        });

        // This item's incoming edges from action hubs
        adjacencyMap.incoming.get(selectedNodeId)?.forEach(({ nodeId: hubId, edgeId }) => {
          if (isActionHub(hubId)) {
            const edgeRuleIds = getEdgeRuleIds(edgeId);
            if (edgeRuleIds.includes(ruleId)) {
              nodeIds.add(hubId);
              edgeIds.add(edgeId);
              // Rule → hub edge
              adjacencyMap.incoming.get(hubId)?.forEach(({ nodeId: sourceId, edgeId: hubEdgeId }) => {
                if (sourceId === ruleNodeId) {
                  edgeIds.add(hubEdgeId);
                }
              });
            }
          }
        });
      });

    } else if (isConditionHub(selectedNodeId) || isActionHub(selectedNodeId)) {
      // Find rules connected to this hub via edge data
      const connectedRules = new Set<string>();

      adjacencyMap.outgoing.get(selectedNodeId)?.forEach(({ edgeId }) => {
        const ruleIds = getEdgeRuleIds(edgeId);
        ruleIds.forEach((ruleId) => connectedRules.add(ruleId));
      });

      adjacencyMap.incoming.get(selectedNodeId)?.forEach(({ edgeId }) => {
        const ruleIds = getEdgeRuleIds(edgeId);
        ruleIds.forEach((ruleId) => connectedRules.add(ruleId));
      });

      // Highlight filtered path for each connected rule
      connectedRules.forEach((ruleId) => highlightRulePathFiltered(ruleId));
    }

    return { highlightedNodeIds: nodeIds, highlightedEdgeIds: edgeIds };
  }, [selectedNodeId, adjacencyMap, edges]);

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
