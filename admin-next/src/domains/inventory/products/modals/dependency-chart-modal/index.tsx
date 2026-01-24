"use client";

import { useCallback } from "react";
import { Button } from "antd";
import { AimOutlined, SaveOutlined } from "@ant-design/icons";
import {
  ReactFlow,
  Background,
  Controls,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import type { IDependencyChartModalPayload } from "../../modals";
import type { IDependencyRule, IBundleGroup } from "@/domains/promos/bundles/types";

import { ItemNode, RuleNode, BundleNode } from "./nodes";
import { LabeledEdge } from "./edges";
import { RuleInspector } from "./sidebar/rule-inspector";
import { useDependencyChart } from "./hooks";
import { useStyles } from "./dependency-chart-modal.styles";

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

  const {
    nodes,
    edges,
    draftRules,
    selectedRule,
    onNodesChange,
    onEdgesChange,
    handleNodeClick,
    handleRuleChange,
    handleFitView,
  } = useDependencyChart({
    groups,
    initialRules,
    initialSelectedRuleId,
  });

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
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
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
          </div>
        </div>

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

  const handleSave = useCallback(
    (rules: IDependencyRule[]) => {
      modalPayload?.onSave?.(rules);
      pop();
    },
    [modalPayload, pop]
  );

  if (!modalPayload) {
    return null;
  }

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
