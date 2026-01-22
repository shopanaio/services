import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useReactFlow, useNodesState, useEdgesState } from "@xyflow/react";
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
  const layoutNodes = useColumnLayout({
    nodes: derivedNodes,
    edges: derivedEdges,
  });

  // React Flow's internal state - handles dragging efficiently
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(derivedEdges as Edge[]);

  // Track previous layout to detect structural changes
  const prevLayoutRef = useRef<string>("");

  // Sync derived data with React Flow state when structure changes
  useEffect(() => {
    const currentLayout = layoutNodes.map((n) => `${n.id}:${n.type}`).join(",");
    const edgeLayout = derivedEdges.map((e) => e.id).join(",");
    const layoutKey = `${currentLayout}|${edgeLayout}`;

    if (prevLayoutRef.current !== layoutKey) {
      prevLayoutRef.current = layoutKey;

      // Merge new layout with existing positions
      setNodes((currentNodes) => {
        const positionMap = new Map(currentNodes.map((n) => [n.id, n.position]));

        return layoutNodes.map((node) => {
          const existingPos = positionMap.get(node.id);
          return {
            ...node,
            position: existingPos ?? node.position,
          } as Node;
        });
      });

      setEdges(derivedEdges as Edge[]);
    }
  }, [layoutNodes, derivedEdges, setNodes, setEdges]);

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
    nodes,
    edges,
    draftRules,
    selectedRule,
    onNodesChange,
    onEdgesChange,
    handleNodeClick,
    handleRuleChange,
    handleFitView,
  };
};
