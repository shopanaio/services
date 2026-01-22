import { useState, useCallback, useMemo, useEffect } from "react";
import { useNodesState, useEdgesState, useReactFlow } from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";

import type { IDependencyRule, IComponentGroup } from "../../edit-components-modal/types";
import { useDerivedGraph } from "./use-derived-graph";
import { useColumnLayout } from "./use-column-layout";

interface UseDependencyChartOptions {
  groups: IComponentGroup[];
  initialRules: IDependencyRule[];
  initialSelectedRuleId?: string;
}

export const useDependencyChart = ({
  groups,
  initialRules,
  initialSelectedRuleId,
}: UseDependencyChartOptions) => {
  const { fitView } = useReactFlow();

  // Draft state - changes don't affect parent until Save
  const [draftRules, setDraftRules] = useState<IDependencyRule[]>(initialRules);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(
    initialSelectedRuleId ?? null
  );

  // Derive graph from draft rules
  const { nodes: derivedNodes, edges: derivedEdges } = useDerivedGraph({
    groups,
    rules: draftRules,
    selectedRuleId,
  });

  // Apply column layout
  const layoutedNodes = useColumnLayout({
    nodes: derivedNodes,
    edges: derivedEdges,
  });

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(derivedEdges as Edge[]);

  // Update nodes/edges when draft rules change, preserving existing positions
  useEffect(() => {
    setNodes((currentNodes) => {
      const currentPositions = new Map(
        currentNodes.map((n) => [n.id, n.position])
      );
      return layoutedNodes.map((node) => {
        const existingPosition = currentPositions.get(node.id);
        if (existingPosition) {
          return { ...node, position: existingPosition } as Node;
        }
        return node as Node;
      });
    });
    setEdges(derivedEdges as Edge[]);
  }, [layoutedNodes, derivedEdges, setNodes, setEdges]);

  // Handlers
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: { id: string; type?: string }) => {
      if (node.type === "rule") {
        const ruleId = node.id.replace("rule:", "");
        setSelectedRuleId(ruleId);
      }
    },
    []
  );

  const handleRuleChange = useCallback((updatedRule: IDependencyRule) => {
    setDraftRules((prev) =>
      prev.map((r) => (r.id === updatedRule.id ? updatedRule : r))
    );
  }, []);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2 });
  }, [fitView]);

  // Get selected rule
  const selectedRule = useMemo(
    () => draftRules.find((r) => r.id === selectedRuleId) ?? null,
    [draftRules, selectedRuleId]
  );

  return {
    // State
    nodes,
    edges,
    draftRules,
    selectedRule,

    // Handlers
    onNodesChange,
    onEdgesChange,
    handleNodeClick,
    handleRuleChange,
    handleFitView,
  };
};
