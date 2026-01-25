"use client";

import { useCallback, useMemo, useEffect } from "react";
import { Button, Dropdown, Badge } from "antd";
import type { MenuProps } from "antd";
import {
  AimOutlined,
  SaveOutlined,
  ReloadOutlined,
  DownOutlined,
  PlusOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
} from "@ant-design/icons";
import {
  ReactFlow,
  Background,
  Controls,
  ReactFlowProvider,
} from "@xyflow/react";
import type { Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import type { IDependencyChartModalPayload } from "../../modals";
import type {
  IDependencyRule,
  IBundleGroup,
} from "@/domains/promos/bundles/types";

import { ItemNode, RuleNode, BundleNode } from "./nodes";
import { LabeledEdge } from "./edges";
import { NodeInspector } from "./sidebar/node-inspector";
import { useDependencyChart } from "./hooks";
import { useStyles } from "./dependency-chart-modal.styles";
import type { RuleSortMode } from "./types";
import {
  PathHighlightProvider,
  usePathHighlightContext,
} from "./contexts/path-highlight-context";

// ============================================================================
// Node & Edge Types
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
  groups: IBundleGroup[];
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
  const { setSelectedNodeId, setEdges: setContextEdges, selectedNodeId, highlightedNodeIds, highlightedEdgeIds } =
    usePathHighlightContext();

  const {
    nodes,
    edges,
    draftRules,
    visibleRuleIds,
    ruleSortMode,
    selectedNode,
    onNodesChange,
    onEdgesChange,
    handleNodeClick: baseHandleNodeClick,
    handlePaneClick: baseHandlePaneClick,
    handleRuleChange,
    handleToggleRuleVisibility,
    handleAddRule,
    handleFitView,
    handleResetLayout,
    setRuleSortMode,
  } = useDependencyChart({
    groups,
    initialRules,
    initialSelectedRuleId,
  });

  // Sync edges to path highlight context
  useEffect(() => {
    setContextEdges(edges);
  }, [edges, setContextEdges]);

  // Wrap node click to also set path highlight
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
      baseHandleNodeClick(event, node);
    },
    [setSelectedNodeId, baseHandleNodeClick]
  );

  // Wrap pane click to clear path highlight
  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    baseHandlePaneClick();
  }, [setSelectedNodeId, baseHandlePaneClick]);

  // Apply dimming to nodes
  const highlightedNodes = useMemo(() => {
    if (!selectedNodeId) return nodes;

    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        isDimmed: !highlightedNodeIds.has(node.id),
      },
    }));
  }, [nodes, selectedNodeId, highlightedNodeIds]);

  // Apply dimming to edges
  const highlightedEdges = useMemo(() => {
    if (!selectedNodeId) return edges;

    return edges.map((edge) => ({
      ...edge,
      style: {
        ...edge.style,
        opacity: !highlightedEdgeIds.has(edge.id) ? 0.3 : 1,
      },
    }));
  }, [edges, selectedNodeId, highlightedEdgeIds]);

  const visibleCount = visibleRuleIds.size;

  const handleRulesMenuClick = useCallback(
    (info: { key: string }) => {
      if (info.key === "add-rule") {
        handleAddRule();
      } else {
        handleToggleRuleVisibility(info.key);
      }
    },
    [handleAddRule, handleToggleRuleVisibility],
  );

  const rulesMenuItems: MenuProps["items"] = useMemo(() => {
    const items: MenuProps["items"] = [
      {
        key: "add-rule",
        icon: <PlusOutlined />,
        label: "Add Rule",
      },
    ];

    if (draftRules.length > 0) {
      items.push({ type: "divider" });

      draftRules.forEach((rule) => {
        items.push({
          key: rule.id,
          label: rule.name || `Rule ${rule.id.slice(0, 6)}`,
        });
      });
    }

    return items;
  }, [draftRules]);

  const sortMenuItems: MenuProps["items"] = useMemo(
    () => [
      { key: "desc", label: "Priority ↓", icon: <SortDescendingOutlined /> },
      { key: "asc", label: "Priority ↑", icon: <SortAscendingOutlined /> },
      { key: "auto", label: "Auto" },
    ],
    []
  );

  const handleSortMenuClick = useCallback(
    (info: { key: string }) => {
      setRuleSortMode(info.key as RuleSortMode);
    },
    [setRuleSortMode]
  );

  const handleSave = useCallback(() => {
    onSave?.(draftRules);
  }, [draftRules, onSave]);

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
            nodes={highlightedNodes}
            edges={highlightedEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            className={styles.reactFlow}
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls position="top-right" />
          </ReactFlow>

          <div className={styles.controls}>
            <Button size="small" icon={<AimOutlined />} onClick={handleFitView}>
              Fit View
            </Button>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={handleResetLayout}
            >
              Reset
            </Button>
            <Dropdown
              menu={{
                selectable: true,
                items: rulesMenuItems,
                onClick: handleRulesMenuClick,
                selectedKeys: draftRules
                  .filter((it) => visibleRuleIds.has(it.id))
                  .map((it) => it.id),
              }}
              trigger={["click"]}
              placement="bottomLeft"
            >
              <Button size="small">
                <span style={{ marginLeft: 4 }}>Rules</span>
                <Badge
                  count={visibleCount}
                  size="small"
                  showZero
                  color="blue"
                />
                <DownOutlined style={{ fontSize: 10 }} />
              </Button>
            </Dropdown>
            <Dropdown
              menu={{
                selectable: true,
                items: sortMenuItems,
                onClick: handleSortMenuClick,
                selectedKeys: [ruleSortMode],
              }}
              trigger={["click"]}
              placement="bottomLeft"
            >
              <Button
                size="small"
                icon={
                  ruleSortMode === "desc" ? (
                    <SortDescendingOutlined />
                  ) : ruleSortMode === "asc" ? (
                    <SortAscendingOutlined />
                  ) : null
                }
              >
                Sort
                <DownOutlined style={{ fontSize: 10 }} />
              </Button>
            </Dropdown>
          </div>
        </div>

        <NodeInspector
          selectedNode={selectedNode}
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

  const handleSave = useCallback(
    (rules: IDependencyRule[]) => {
      modalPayload?.onSave?.(rules);
      pop();
    },
    [modalPayload, pop],
  );

  if (!modalPayload) {
    return null;
  }

  return (
    <ReactFlowProvider>
      <PathHighlightProvider>
        <DependencyChartInner
          groups={modalPayload.groups}
          initialRules={modalPayload.rules}
          selectedRuleId={modalPayload.selectedRuleId}
          onSave={handleSave}
          onCancel={pop}
        />
      </PathHighlightProvider>
    </ReactFlowProvider>
  );
};

export default DependencyChartModal;
