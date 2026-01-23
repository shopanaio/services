"use client";

import { useCallback } from "react";
import { Paper } from "@/ui-kit/paper";
import { DependencyRulesTable } from "./dependency-rules-table";
import { useDependencyChartModal } from "@/domains/inventory/products/modals";
import type {
  IDependencyRule,
  IComponentGroup,
} from "../types";

// ============================================================================
// Types
// ============================================================================

interface IDependencyRulesTabProps {
  dependencyRules: IDependencyRule[];
  onDependencyRulesChange: (rules: IDependencyRule[]) => void;
  groups: IComponentGroup[];
}

// ============================================================================
// Component
// ============================================================================

export const DependencyRulesTab = ({
  dependencyRules,
  onDependencyRulesChange,
  groups,
}: IDependencyRulesTabProps) => {
  const { push: openChartModal } = useDependencyChartModal();

  const handleOpenChart = useCallback(() => {
    openChartModal({
      groups,
      rules: dependencyRules,
      onSave: (updatedRules: IDependencyRule[]) => {
        onDependencyRulesChange(updatedRules);
      },
    });
  }, [groups, dependencyRules, onDependencyRulesChange, openChartModal]);

  const handleEditRuleInChart = useCallback(
    (ruleId: string) => {
      const rule = dependencyRules.find((r) => r.id === ruleId);
      if (!rule) return;

      openChartModal({
        groups,
        rules: [rule],
        selectedRuleId: ruleId,
        onSave: (updatedRules: IDependencyRule[]) => {
          const updatedRule = updatedRules[0];
          if (updatedRule) {
            onDependencyRulesChange(
              dependencyRules.map((r) => (r.id === updatedRule.id ? updatedRule : r))
            );
          }
        },
      });
    },
    [groups, dependencyRules, onDependencyRulesChange, openChartModal]
  );

  return (
    <Paper>
      <DependencyRulesTable
        rules={dependencyRules}
        onRulesChange={onDependencyRulesChange}
        groups={groups}
        onOpenChart={handleOpenChart}
        onEditRule={handleEditRuleInChart}
      />
    </Paper>
  );
};

export default DependencyRulesTab;
