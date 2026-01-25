import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useReactFlow, useNodesState, useEdgesState } from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";
import { v4 as uuid } from "uuid";

import type { IDependencyRule, IBundleGroup } from "@/domains/promos/bundles/types";
import { LogicOperator } from "@/domains/promos/bundles/dependency-rules";
import type { SelectedNode, ItemNodeData, BundleNodeData, RuleSortMode } from "../types";
import { useDerivedGraph } from "./use-derived-graph";
import { useColumnLayout } from "./use-column-layout";

interface UseDependencyChartOptions {
  groups: IBundleGroup[];
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
  const [selectedNode, setSelectedNode] = useState<SelectedNode>(null);
  const [ruleSortMode, setRuleSortMode] = useState<RuleSortMode>("desc");

  // Visible rules state - controls which rules are shown on the graph
  // If a specific rule is selected, show only that one initially
  const [visibleRuleIds, setVisibleRuleIds] = useState<Set<string>>(() => {
    if (initialSelectedRuleId) {
      return new Set([initialSelectedRuleId]);
    }
    return new Set(initialRules.map((r) => r.id));
  });

  // Handlers for rule visibility (defined early for use in useDerivedGraph)
  const handleToggleRuleVisibility = useCallback((ruleId: string) => {
    setVisibleRuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  }, []);

  const handleAddRule = useCallback(() => {
    const newRuleId = uuid();
    const newRule: IDependencyRule = {
      id: newRuleId,
      name: `Rule ${draftRules.length + 1}`,
      enabled: true,
      priority: draftRules.length,
      logicOperator: LogicOperator.AND,
      conditionGroups: [],
      actions: [],
    };

    setDraftRules((prev) => [...prev, newRule]);
    setVisibleRuleIds((prev) => new Set([...prev, newRuleId]));
    setSelectedRuleId(newRuleId);
    setSelectedNode({ type: "rule", rule: newRule });
  }, [draftRules.length]);

  // Filter rules based on visibility
  const visibleRules = useMemo(
    () => draftRules.filter((r) => visibleRuleIds.has(r.id)),
    [draftRules, visibleRuleIds]
  );

  // Derive graph from visible rules
  const { nodes: derivedNodes, edges: derivedEdges } = useDerivedGraph({
    groups,
    rules: visibleRules,
    selectedRuleId,
    sortMode: ruleSortMode,
  });

  // Apply column layout
  const layoutNodes = useColumnLayout({
    nodes: derivedNodes,
    edges: derivedEdges,
    sortMode: ruleSortMode,
  });

  // React Flow's internal state - handles dragging efficiently
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(derivedEdges as Edge[]);

  // Track previous keys to detect layout changes (not highlighting)
  const prevLayoutKeyRef = useRef<string>("");
  const prevEdgesKeyRef = useRef<string>("");

  // Sync layout when nodes change positions (structure changes)
  useEffect(() => {
    if (layoutNodes.length === 0) return;

    // Create a key based on node IDs and positions only
    const layoutKey = layoutNodes
      .map((n) => `${n.id}:${n.position.x}:${n.position.y}`)
      .join("|");

    if (prevLayoutKeyRef.current === layoutKey) return;
    prevLayoutKeyRef.current = layoutKey;

    setNodes(layoutNodes as Node[]);
    setEdges(derivedEdges as Edge[]);
  }, [layoutNodes, derivedEdges, setNodes, setEdges]);

  // Sync edges when labels change (e.g., rule edits in inspector)
  useEffect(() => {
    const edgesKey = derivedEdges
      .map((e) => `${e.id}:${(e.data as { labels?: string[] })?.labels?.join(",") ?? ""}`)
      .join("|");

    if (prevEdgesKeyRef.current === edgesKey) return;
    prevEdgesKeyRef.current = edgesKey;

    setEdges(derivedEdges as Edge[]);
  }, [derivedEdges, setEdges]);

  // Handlers
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type === "rule") {
        const ruleId = node.id.replace("rule:", "");
        setSelectedRuleId(ruleId);
        const rule = draftRules.find((r) => r.id === ruleId);
        if (rule) {
          setSelectedNode({ type: "rule", rule });
        }
      } else if (node.type === "item") {
        const data = node.data as ItemNodeData;
        setSelectedRuleId(null);

        if (data.isGroup) {
          // This is a group node
          const group = groups.find((g) => g.id === data.groupId);
          if (group) {
            setSelectedNode({ type: "group", group });
          }
        } else {
          // This is an item node
          const group = groups.find((g) => g.id === data.groupId);
          const item = group?.items.find((i) => i.id === data.item.id);
          if (group && item) {
            setSelectedNode({ type: "item", item, group });
          }
        }
      } else if (node.type === "bundle") {
        const data = node.data as BundleNodeData;
        setSelectedRuleId(null);
        setSelectedNode({ type: "bundle", label: data.label });
      }
    },
    [draftRules, groups]
  );

  // Handler to clear selection (click on empty canvas)
  const handlePaneClick = useCallback(() => {
    setSelectedRuleId(null);
    setSelectedNode(null);
  }, []);

  const handleRuleChange = useCallback((updatedRule: IDependencyRule) => {
    setDraftRules((prev) =>
      prev.map((r) => (r.id === updatedRule.id ? updatedRule : r))
    );
  }, []);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2 });
  }, [fitView]);

  const handleResetLayout = useCallback(() => {
    setSelectedRuleId(null);
    setSelectedNode(null);
    setNodes(layoutNodes as Node[]);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [layoutNodes, setNodes, fitView]);

  // Get selected rule
  const selectedRule = useMemo(
    () => draftRules.find((r) => r.id === selectedRuleId) ?? null,
    [draftRules, selectedRuleId]
  );

  // Keep selectedNode in sync when rule data changes
  const currentSelectedNode = useMemo((): SelectedNode => {
    if (selectedNode?.type === "rule" && selectedRule) {
      return { type: "rule", rule: selectedRule };
    }
    return selectedNode;
  }, [selectedNode, selectedRule]);

  return {
    nodes,
    edges,
    derivedEdges, // for path highlight context
    draftRules,
    visibleRuleIds,
    ruleSortMode,
    selectedRule,
    selectedNode: currentSelectedNode,
    onNodesChange,
    onEdgesChange,
    handleNodeClick,
    handlePaneClick,
    handleRuleChange,
    handleToggleRuleVisibility,
    handleAddRule,
    handleFitView,
    handleResetLayout,
    setRuleSortMode,
  };
};
