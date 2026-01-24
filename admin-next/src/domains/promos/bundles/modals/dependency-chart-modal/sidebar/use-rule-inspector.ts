import { useState, useCallback } from "react";

import type { IBundleGroup } from "@/domains/promos/bundles/types";
import type {
  IDependencyRule,
  IDependencyCondition,
  IDependencyAction,
} from "@/domains/promos/bundles/dependency-rules";
import {
  DependencyConditionType,
  DependencyActionType,
  DependencyTargetType,
} from "@/domains/promos/bundles/dependency-rules";

import { PRICE_RULE_OPTIONS } from "@/domains/promos/bundles/types";

export {
  getTargetOptions,
  getConditionTypeOptions,
  getActionTypeOptions,
  CONDITION_TARGET_TYPE_OPTIONS,
  ACTION_TARGET_TYPE_OPTIONS,
} from "@/domains/promos/bundles/dependency-rules";

export const PRICE_TYPE_OPTIONS = PRICE_RULE_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label,
}));

// ============================================================================
// Helper Functions
// ============================================================================

const generateId = (prefix: string): string => {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
};

// ============================================================================
// Hook
// ============================================================================

interface UseRuleInspectorOptions {
  rule: IDependencyRule | null;
  groups: IBundleGroup[];
  onRuleChange: (rule: IDependencyRule) => void;
}

export const useRuleInspector = ({
  rule,
  groups,
  onRuleChange,
}: UseRuleInspectorOptions) => {
  const [collapsed, setCollapsed] = useState(false);

  const handleNameChange = useCallback(
    (name: string) => {
      if (!rule) return;
      onRuleChange({ ...rule, name });
    },
    [rule, onRuleChange]
  );

  const handlePriorityChange = useCallback(
    (priority: number | null) => {
      if (!rule) return;
      onRuleChange({ ...rule, priority: priority ?? 0 });
    },
    [rule, onRuleChange]
  );

  const handleEnabledChange = useCallback(
    (enabled: boolean) => {
      if (!rule) return;
      onRuleChange({ ...rule, enabled });
    },
    [rule, onRuleChange]
  );

  // Condition handlers
  const handleAddCondition = useCallback(() => {
    if (!rule) return;
    const firstItem = groups[0]?.items[0];
    const newCondition: IDependencyCondition = {
      id: generateId("cond"),
      conditionType: DependencyConditionType.IS_SELECTED,
      targetType: DependencyTargetType.ITEM,
      targetId: firstItem?.id ?? "",
    };
    onRuleChange({
      ...rule,
      conditions: [...rule.conditions, newCondition],
    });
  }, [rule, groups, onRuleChange]);

  const handleUpdateCondition = useCallback(
    (conditionId: string, updates: Partial<IDependencyCondition>) => {
      if (!rule) return;
      onRuleChange({
        ...rule,
        conditions: rule.conditions.map((c) =>
          c.id === conditionId ? { ...c, ...updates } : c
        ),
      });
    },
    [rule, onRuleChange]
  );

  const handleDeleteCondition = useCallback(
    (conditionId: string) => {
      if (!rule) return;
      onRuleChange({
        ...rule,
        conditions: rule.conditions.filter((c) => c.id !== conditionId),
      });
    },
    [rule, onRuleChange]
  );

  // Action handlers
  const handleAddAction = useCallback(() => {
    if (!rule) return;
    const firstItem = groups[0]?.items[0];
    const newAction: IDependencyAction = {
      id: generateId("act"),
      actionType: DependencyActionType.DISABLE,
      targetType: DependencyTargetType.ITEM,
      targetId: firstItem?.id ?? "",
    };
    onRuleChange({
      ...rule,
      actions: [...rule.actions, newAction],
    });
  }, [rule, groups, onRuleChange]);

  const handleUpdateAction = useCallback(
    (actionId: string, updates: Partial<IDependencyAction>) => {
      if (!rule) return;
      onRuleChange({
        ...rule,
        actions: rule.actions.map((a) =>
          a.id === actionId ? { ...a, ...updates } : a
        ),
      });
    },
    [rule, onRuleChange]
  );

  const handleDeleteAction = useCallback(
    (actionId: string) => {
      if (!rule) return;
      onRuleChange({
        ...rule,
        actions: rule.actions.filter((a) => a.id !== actionId),
      });
    },
    [rule, onRuleChange]
  );

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  return {
    collapsed,
    toggleCollapsed,
    handleNameChange,
    handlePriorityChange,
    handleEnabledChange,
    handleAddCondition,
    handleUpdateCondition,
    handleDeleteCondition,
    handleAddAction,
    handleUpdateAction,
    handleDeleteAction,
  };
};
