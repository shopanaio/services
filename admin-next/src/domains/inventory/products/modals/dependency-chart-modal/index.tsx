"use client";

import { useState, useCallback, useMemo } from "react";
import { createStyles } from "antd-style";
import { Button } from "antd";
import { AimOutlined, SaveOutlined } from "@ant-design/icons";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import type { IDependencyChartModalPayload } from "../../modals";
import type {
  IDependencyRule,
  IComponentGroup,
} from "../edit-components-modal/types";

import { ItemNode, RuleNode, BundleNode } from "./nodes";
import { LabeledEdge } from "./edges";
import { RuleInspector } from "./sidebar/rule-inspector";
import { useDerivedGraph } from "./hooks/use-derived-graph";
import { useColumnLayout } from "./hooks/use-column-layout";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token, isDarkMode }) => ({
  container: {
    width: "100%",
    display: "flex",
    height: "calc(100vh - 120px)",
    padding: token.padding,
    boxSizing: "border-box",
  },
  chartArea: {
    flex: 1,
    position: "relative",
  },
  reactFlow: {
    background: token.colorBgLayout,
    "& .react-flow__node.selected": {
      outline: "none",
      boxShadow: "none",
    },
    "& .react-flow__node:focus": {
      outline: "none",
    },
    // Dark theme for Controls panel
    "& .react-flow__controls": {
      background: token.colorBgContainer,
      borderColor: token.colorBorder,
      boxShadow: token.boxShadowSecondary,
    },
    "& .react-flow__controls-button": {
      background: token.colorBgContainer,
      borderColor: token.colorBorder,
      fill: token.colorText,
      "&:hover": {
        background: token.colorBgTextHover,
      },
    },
    // Dark theme for edge labels
    "& .react-flow__edgelabel-renderer": {
      "& .ant-tag": {
        background: isDarkMode ? token.colorBgElevated : undefined,
      },
    },
  },
  controls: {
    position: "absolute",
    top: 10,
    left: 10,
    display: "flex",
    gap: 8,
  },
}));

// ============================================================================
// Node Types
// ============================================================================

const nodeTypes = {
  item: ItemNode,
  rule: RuleNode,
  bundle: BundleNode,
} as const;

const edgeTypes = {
  labeled: LabeledEdge,
} as const;

// ============================================================================
// Inner Component (needs ReactFlowProvider context)
// ============================================================================

interface IDependencyChartInnerProps {
  groups: IComponentGroup[];
  initialRules: IDependencyRule[];
  selectedRuleId?: string;
  onSave?: (rules: IDependencyRule[]) => void;
  onCancel: () => void;
}

const DependencyChartInner = ({
  groups,
  initialRules,
  selectedRuleId: initialSelectedRuleId,
  onSave,
  onCancel,
}: IDependencyChartInnerProps) => {
  const { styles } = useStyles();
  const { fitView } = useReactFlow();

  // Draft state - changes don't affect parent until Save
  const [draftRules, setDraftRules] = useState<IDependencyRule[]>(initialRules);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(
    initialSelectedRuleId ?? null,
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
  const [nodes, setNodes, onNodesChange] = useNodesState(
    layoutedNodes as Node[],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    derivedEdges as Edge[],
  );

  // Update nodes/edges when draft rules change, preserving existing positions
  useMemo(() => {
    setNodes((currentNodes) => {
      const currentPositions = new Map(
        currentNodes.map((n) => [n.id, n.position]),
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

  // ========================================
  // Handlers
  // ========================================

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: { id: string; type?: string }) => {
      if (node.type === "rule") {
        const ruleId = node.id.replace("rule:", "");
        setSelectedRuleId(ruleId);
      }
    },
    [],
  );

  const handleRuleChange = useCallback((updatedRule: IDependencyRule) => {
    setDraftRules((prev) =>
      prev.map((r) => (r.id === updatedRule.id ? updatedRule : r)),
    );
  }, []);

  const handleSave = useCallback(() => {
    onSave?.(draftRules);
  }, [draftRules, onSave]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2 });
  }, [fitView]);

  // Get selected rule
  const selectedRule = useMemo(
    () => draftRules.find((r) => r.id === selectedRuleId) ?? null,
    [draftRules, selectedRuleId],
  );

  return (
    <ModalLayout
      name="dependency-chart"
      fullWidth
      header={
        <ModalHeader
          name="dependency-chart"
          title="Dependency Rules Chart"
          onClose={onCancel}
          submitButtonProps={{
            children: "Save Changes",
            icon: <SaveOutlined />,
            onClick: handleSave,
          }}
        />
      }
    >
      <div className={styles.container}>
        <div className={styles.chartArea}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            className={styles.reactFlow}
            proOptions={{ hideAttribution: true }}
            connectionLineStyle={{ stroke: "#faad14", strokeWidth: 2 }}
          >
            <Background />
            <Controls position="top-right" />
          </ReactFlow>

          {/* Custom controls overlay */}
          <div className={styles.controls}>
            <Button size="small" icon={<AimOutlined />} onClick={handleFitView}>
              Fit View
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <RuleInspector
          rule={selectedRule}
          groups={groups}
          onRuleChange={handleRuleChange}
        />
      </div>
    </ModalLayout>
  );
};

// ============================================================================
// Main Component with Provider
// ============================================================================

export const DependencyChartModal = () => {
  const { pop, payload } = useModalStackContext();

  const modalPayload = payload as unknown as
    | IDependencyChartModalPayload
    | undefined;

  if (!modalPayload) {
    return null;
  }

  const handleSave = (rules: IDependencyRule[]) => {
    modalPayload.onSave?.(rules);
    pop();
  };

  return (
    <ReactFlowProvider>
      <DependencyChartInner
        groups={modalPayload.groups}
        initialRules={modalPayload.rules}
        selectedRuleId={modalPayload.selectedRuleId}
        onSave={handleSave}
        onCancel={pop}
      />
    </ReactFlowProvider>
  );
};

export default DependencyChartModal;
