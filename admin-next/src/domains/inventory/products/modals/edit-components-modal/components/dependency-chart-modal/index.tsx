"use client";

import { useState, useCallback, useMemo } from "react";
import { createStyles } from "antd-style";
import { Button, Flex, Typography } from "antd";
import {
  AimOutlined,
  CloseOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import type { Node, Edge, Connection } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import type { IDependencyChartModalPayload } from "../../../../modals";
import type {
  IDependencyRule,
  IDependencyCondition,
  IDependencyAction,
  IComponentGroup,
} from "../../types";
import {
  DependencyConditionType,
  DependencyActionType,
  DependencyTargetType,
} from "../../types";
import {
  ITEM_HANDLES,
  GROUP_HANDLES,
  RULE_HANDLES,
  BUNDLE_HANDLES,
} from "./types";

import { ItemNode, GroupNode, RuleNode, BundleNode } from "./nodes";
import { RuleInspector } from "./sidebar/rule-inspector";
import { useDerivedGraph } from "./hooks/use-derived-graph";
import { useColumnLayout } from "./hooks/use-column-layout";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    height: "calc(100vh - 120px)",
    minHeight: 500,
  },
  chartArea: {
    flex: 1,
    position: "relative",
  },
  reactFlow: {
    background: token.colorBgLayout,
  },
  controls: {
    position: "absolute",
    top: 10,
    left: 10,
    display: "flex",
    gap: 8,
  },
  legend: {
    position: "absolute",
    bottom: 10,
    left: 10,
    background: token.colorBgContainer,
    padding: "8px 12px",
    borderRadius: token.borderRadius,
    boxShadow: token.boxShadowTertiary,
    display: "flex",
    gap: 16,
    fontSize: 11,
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
  },
}));

// ============================================================================
// Node Types
// ============================================================================

const nodeTypes = {
  item: ItemNode,
  group: GroupNode,
  rule: RuleNode,
  bundle: BundleNode,
} as const;

// ============================================================================
// Handle to Type Mapping
// ============================================================================

const handleToConditionType = (
  handle: string
): DependencyConditionType | null => {
  switch (handle) {
    case ITEM_HANDLES.COND_SELECTED:
      return DependencyConditionType.IS_SELECTED;
    case ITEM_HANDLES.COND_NOT_SELECTED:
      return DependencyConditionType.IS_NOT_SELECTED;
    case ITEM_HANDLES.COND_QTY:
      return DependencyConditionType.QTY_GTE;
    case GROUP_HANDLES.COND_VALID:
      return DependencyConditionType.GROUP_VALID;
    case GROUP_HANDLES.COND_INVALID:
      return DependencyConditionType.GROUP_INVALID;
    case GROUP_HANDLES.COND_COUNT_UNIQUE:
      return DependencyConditionType.GROUP_UNIQUE_GTE;
    case GROUP_HANDLES.COND_COUNT_TOTAL:
      return DependencyConditionType.GROUP_TOTAL_QTY_GTE;
    default:
      return null;
  }
};

const handleToActionType = (handle: string): DependencyActionType | null => {
  switch (handle) {
    case ITEM_HANDLES.ACT_AVAILABILITY:
    case GROUP_HANDLES.ACT_AVAILABILITY:
      return DependencyActionType.DISABLE;
    case ITEM_HANDLES.ACT_VISIBILITY:
    case GROUP_HANDLES.ACT_VISIBILITY:
      return DependencyActionType.HIDE;
    case ITEM_HANDLES.ACT_PRICE:
    case BUNDLE_HANDLES.ACT_PRICE:
      return DependencyActionType.ADJUST_PRICE;
    case ITEM_HANDLES.ACT_QTY:
      return DependencyActionType.SET_QTY;
    default:
      return null;
  }
};

const parseNodeId = (nodeId: string): { type: string; id: string } => {
  const [type, ...rest] = nodeId.split(":");
  return { type, id: rest.join(":") };
};

const getTargetType = (nodeType: string): DependencyTargetType => {
  switch (nodeType) {
    case "item":
      return DependencyTargetType.ITEM;
    case "group":
      return DependencyTargetType.GROUP;
    case "bundle":
      return DependencyTargetType.BUNDLE;
    default:
      return DependencyTargetType.ITEM;
  }
};

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
    initialSelectedRuleId ?? null
  );

  // Derive graph from draft rules
  const { nodes: derivedNodes, edges: derivedEdges } = useDerivedGraph({
    groups,
    rules: draftRules,
    selectedRuleId,
  });

  // Apply column layout
  const layoutedNodes = useColumnLayout({ nodes: derivedNodes });

  // React Flow state - use 'as any' to work around strict typing
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(derivedEdges as Edge[]);

  // Update nodes/edges when draft rules change
  useMemo(() => {
    setNodes(layoutedNodes as Node[]);
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
    []
  );

  const handlePaneClick = useCallback(() => {
    // Optionally deselect when clicking on empty area
    // setSelectedRuleId(null);
  }, []);

  const handleRuleChange = useCallback((updatedRule: IDependencyRule) => {
    setDraftRules((prev) =>
      prev.map((r) => (r.id === updatedRule.id ? updatedRule : r))
    );
  }, []);

  // Update a specific rule by ID
  const updateDraftRule = useCallback(
    (ruleId: string, updater: (rule: IDependencyRule) => IDependencyRule) => {
      setDraftRules((prev) =>
        prev.map((r) => (r.id === ruleId ? updater(r) : r))
      );
    },
    []
  );

  // Create a new rule and return its ID
  const createNewRule = useCallback((): string => {
    const maxPriority = Math.max(0, ...draftRules.map((r) => r.priority));
    const newRule: IDependencyRule = {
      id: `rule-${Date.now()}`,
      name: "New Rule",
      enabled: true,
      priority: maxPriority + 100,
      conditions: [],
      actions: [],
    };
    setDraftRules((prev) => [...prev, newRule]);
    return newRule.id;
  }, [draftRules]);

  // Handle edge connections from drag-and-drop
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const source = parseNodeId(connection.source);
      const target = parseNodeId(connection.target);
      const sourceHandle = connection.sourceHandle;
      const targetHandle = connection.targetHandle;

      // Case 1: Item/Group → Rule (add condition)
      if (
        (source.type === "item" || source.type === "group") &&
        target.type === "rule" &&
        sourceHandle?.startsWith("cond:")
      ) {
        const conditionType = handleToConditionType(sourceHandle);
        if (!conditionType) return;

        const newCondition: IDependencyCondition = {
          id: `cond-${Date.now()}`,
          conditionType,
          targetType: getTargetType(source.type),
          targetId: source.id,
          // Add default value for quantity-based conditions
          value: [
            DependencyConditionType.QTY_GTE,
            DependencyConditionType.QTY_LTE,
            DependencyConditionType.QTY_EQ,
            DependencyConditionType.GROUP_UNIQUE_GTE,
            DependencyConditionType.GROUP_TOTAL_QTY_GTE,
          ].includes(conditionType)
            ? 1
            : undefined,
        };

        updateDraftRule(target.id, (rule) => ({
          ...rule,
          conditions: [...rule.conditions, newCondition],
        }));

        // Select the rule to show it in the inspector
        setSelectedRuleId(target.id);
      }

      // Case 2: Rule → Item/Group/Bundle (add action)
      if (
        source.type === "rule" &&
        (target.type === "item" ||
          target.type === "group" ||
          target.type === "bundle") &&
        targetHandle?.startsWith("act:")
      ) {
        const actionType = handleToActionType(targetHandle);
        if (!actionType) return;

        const newAction: IDependencyAction = {
          id: `act-${Date.now()}`,
          actionType,
          targetType: getTargetType(target.type),
          targetId: target.type === "bundle" ? undefined : target.id,
          // Add default values for specific action types
          qtyValue: actionType === DependencyActionType.SET_QTY ? 1 : undefined,
        };

        updateDraftRule(source.id, (rule) => ({
          ...rule,
          actions: [...rule.actions, newAction],
        }));

        // Select the rule to show it in the inspector
        setSelectedRuleId(source.id);
      }

      // Case 3: Item/Group → Item/Group/Bundle (create new rule with condition + action)
      if (
        (source.type === "item" || source.type === "group") &&
        (target.type === "item" ||
          target.type === "group" ||
          target.type === "bundle") &&
        sourceHandle?.startsWith("cond:") &&
        targetHandle?.startsWith("act:")
      ) {
        const conditionType = handleToConditionType(sourceHandle);
        const actionType = handleToActionType(targetHandle);
        if (!conditionType || !actionType) return;

        const maxPriority = Math.max(0, ...draftRules.map((r) => r.priority));
        const newRuleId = `rule-${Date.now()}`;

        const newCondition: IDependencyCondition = {
          id: `cond-${Date.now()}`,
          conditionType,
          targetType: getTargetType(source.type),
          targetId: source.id,
          value: [
            DependencyConditionType.QTY_GTE,
            DependencyConditionType.QTY_LTE,
            DependencyConditionType.QTY_EQ,
            DependencyConditionType.GROUP_UNIQUE_GTE,
            DependencyConditionType.GROUP_TOTAL_QTY_GTE,
          ].includes(conditionType)
            ? 1
            : undefined,
        };

        const newAction: IDependencyAction = {
          id: `act-${Date.now() + 1}`,
          actionType,
          targetType: getTargetType(target.type),
          targetId: target.type === "bundle" ? undefined : target.id,
          qtyValue: actionType === DependencyActionType.SET_QTY ? 1 : undefined,
        };

        const newRule: IDependencyRule = {
          id: newRuleId,
          name: "New Rule",
          enabled: true,
          priority: maxPriority + 100,
          conditions: [newCondition],
          actions: [newAction],
        };

        setDraftRules((prev) => [...prev, newRule]);
        setSelectedRuleId(newRuleId);
      }
    },
    [draftRules, updateDraftRule]
  );

  const handleCloseInspector = useCallback(() => {
    setSelectedRuleId(null);
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
    [draftRules, selectedRuleId]
  );

  return (
    <ModalLayout
      name="dependency-chart"
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
        {/* Chart Area */}
        <div className={styles.chartArea}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            nodeTypes={nodeTypes}
            fitView
            className={styles.reactFlow}
            proOptions={{ hideAttribution: true }}
            connectionLineStyle={{ stroke: "#faad14", strokeWidth: 2 }}
          >
            <Background />
            <Controls position="top-right" />
            <MiniMap
              position="bottom-right"
              nodeColor={(node) => {
                if (node.type === "rule") return "#faad14";
                if (node.type === "item") return "#1890ff";
                if (node.type === "group") return "#52c41a";
                if (node.type === "bundle") return "#722ed1";
                return "#d9d9d9";
              }}
            />
          </ReactFlow>

          {/* Custom controls overlay */}
          <div className={styles.controls}>
            <Button size="small" icon={<AimOutlined />} onClick={handleFitView}>
              Fit View
            </Button>
          </div>

          {/* Legend */}
          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <div
                className={styles.legendDot}
                style={{ background: "#1890ff" }}
              />
              <span>Items</span>
            </div>
            <div className={styles.legendItem}>
              <div
                className={styles.legendDot}
                style={{ background: "#52c41a" }}
              />
              <span>Groups</span>
            </div>
            <div className={styles.legendItem}>
              <div
                className={styles.legendDot}
                style={{ background: "#faad14" }}
              />
              <span>Rules</span>
            </div>
            <div className={styles.legendItem}>
              <div
                className={styles.legendDot}
                style={{ background: "#722ed1" }}
              />
              <span>Bundle</span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <RuleInspector
          rule={selectedRule}
          groups={groups}
          onRuleChange={handleRuleChange}
          onClose={handleCloseInspector}
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
