import {
  useState,
  useCallback } from "react";

import type { IBundleGroup } from "@/domains/inventory/bundles/types";
import type {
  IDependencyRule,
} from "@/domains/inventory/bundles/dependency-rules/types";
import type { IDependencyCondition, IDependencyAction, IConditionGroup } from "@/domains/inventory/bundles/dependency-rules/types";
import {
  DependencyActionType,
  DependencyTargetType,
  ConditionSubject,
  ConditionCategory,
  StateCheckOperator,
  LogicOperator,
} from "@/domains/inventory/bundles/dependency-rules";

import {
  PRICE_RULE_OPTIONS } from "@/domains/inventory/bundles/types";

export {
  getTargetOptions,
  getSubjectOptions,
  getOperatorOptions,
  getActionTypeOptions,
  getActionCategoryOptions,
  getActionTypeOptionsByCategory,
  CONDITION_TARGET_TYPE_OPTIONS,
  ACTION_TARGET_TYPE_OPTIONS,
} from "@/domains/inventory/bundles/dependency-rules";

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

/** Get the first condition group (or a default one) */
const getDefaultGroup = (rule: IDependencyRule): IConditionGroup => {
  if (rule.conditionGroups.length > 0) {
    return rule.conditionGroups[0];
  }
  return { id: generateId("grp"), logicOperator: LogicOperator.AND, conditions: [] };
};

/** Update conditions in the first group, creating the group if needed */
const updateFirstGroupConditions = (
  rule: IDependencyRule,
  updater: (conditions: IDependencyCondition[]) => IDependencyCondition[],
): IDependencyRule => {
  const group = getDefaultGroup(rule);
  const updatedGroup: IConditionGroup = {
    ...group,
    conditions: updater(group.conditions),
  };
  const groups = rule.conditionGroups.length > 0
    ? [updatedGroup, ...rule.conditionGroups.slice(1)]
    : [updatedGroup];
  return { ...rule, conditionGroups: groups };
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
      category: ConditionCategory.STATE_CHECK,
      subject: ConditionSubject.ITEM_SELECTED,
      operator: StateCheckOperator.IS_SELECTED,
      targetType: DependencyTargetType.ITEM,
      targetId: firstItem?.id ?? "",
    };
    onRuleChange(updateFirstGroupConditions(rule, (conds) => [...conds, newCondition]));
  }, [rule, groups, onRuleChange]);

  const handleUpdateCondition = useCallback(
    (conditionId: string, updates: Partial<IDependencyCondition>) => {
      if (!rule) return;
      onRuleChange(
        updateFirstGroupConditions(rule, (conds) =>
          conds.map((c) =>
            c.id === conditionId ? ({ ...c, ...updates } as IDependencyCondition) : c
          )
        )
      );
    },
    [rule, onRuleChange]
  );

  const handleDeleteCondition = useCallback(
    (conditionId: string) => {
      if (!rule) return;
      onRuleChange(
        updateFirstGroupConditions(rule, (conds) =>
          conds.filter((c) => c.id !== conditionId)
        )
      );
    },
    [rule, onRuleChange]
  );

  // Action handlers
  const handleAddAction = useCallback(() => {
    if (!rule) return;
    const firstItem = groups[0]?.items[0];
    const newAction: IDependencyAction = {
      id: generateId("act"),
      actionType: DependencyActionType.HIDE,
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
