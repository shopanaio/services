import { useState, useCallback } from "react";

import type {
  IDependencyRule,
  IDependencyCondition,
  IDependencyAction,
  IComponentGroup,
} from "../../edit-components-modal/types";
import {
  DependencyConditionType,
  DependencyActionType,
  DependencyTargetType,
  CONDITION_TYPE_LABELS,
  ACTION_TYPE_LABELS,
  TARGET_TYPE_LABELS,
  CONDITION_TYPES_BY_TARGET,
  ACTION_TYPES_BY_TARGET,
  PRICE_RULE_OPTIONS,
} from "../../edit-components-modal/types";

// ============================================================================
// Helper Functions
// ============================================================================

const generateId = (prefix: string): string => {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
};

export const getTargetOptions = (
  targetType: DependencyTargetType,
  groups: IComponentGroup[]
): { value: string; label: string }[] => {
  if (targetType === DependencyTargetType.ITEM) {
    return groups.flatMap((g) =>
      g.items.map((item) => ({
        value: item.id,
        label:
          item.title ??
          item.assignedProduct?.title ??
          item.assignedVariant?.title ??
          item.id,
      }))
    );
  }
  if (targetType === DependencyTargetType.GROUP) {
    return groups.map((g) => ({
      value: g.id,
      label: g.title,
    }));
  }
  return [];
};

export const getConditionTypeOptions = (targetType: DependencyTargetType) => {
  const validTypes = CONDITION_TYPES_BY_TARGET[targetType];
  return validTypes.map((type) => ({
    value: type,
    label: CONDITION_TYPE_LABELS[type],
  }));
};

export const getActionTypeOptions = (targetType: DependencyTargetType) => {
  const validTypes = ACTION_TYPES_BY_TARGET[targetType];
  return validTypes.map((type) => ({
    value: type,
    label: ACTION_TYPE_LABELS[type],
  }));
};

export const CONDITION_TARGET_TYPE_OPTIONS = [
  {
    value: DependencyTargetType.ITEM,
    label: TARGET_TYPE_LABELS[DependencyTargetType.ITEM],
  },
  {
    value: DependencyTargetType.GROUP,
    label: TARGET_TYPE_LABELS[DependencyTargetType.GROUP],
  },
];

export const ACTION_TARGET_TYPE_OPTIONS = Object.entries(TARGET_TYPE_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  })
);

export const PRICE_TYPE_OPTIONS = PRICE_RULE_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label,
}));

// ============================================================================
// Hook
// ============================================================================

interface UseRuleInspectorOptions {
  rule: IDependencyRule | null;
  groups: IComponentGroup[];
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
    handleEnabledChange,
    handleAddCondition,
    handleUpdateCondition,
    handleDeleteCondition,
    handleAddAction,
    handleUpdateAction,
    handleDeleteAction,
  };
};
