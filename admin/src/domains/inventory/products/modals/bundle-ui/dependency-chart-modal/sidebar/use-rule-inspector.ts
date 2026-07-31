import { useCallback, useState } from "react";

import type {
  ApiProductComponentCondition,
  ApiProductComponentConditionGroup,
  ApiProductComponentDependencyAction,
  ApiProductComponentDependencyRule,
  ApiProductComponentGroup,
} from "@/graphql/types";
import {
  ProductComponentConditionCategory,
  ProductComponentConditionOperator,
  ProductComponentConditionSubject,
  ProductComponentDependencyActionType,
  ProductComponentDependencyTargetType,
  ProductComponentLogicOperator,
} from "@/graphql/types";

import { PRICE_RULE_OPTIONS } from "@/domains/inventory/products/components/product-details-card/bundle-ui/types";

export {
  getTargetOptions,
  getSubjectOptions,
  getOperatorOptions,
  getActionTypeOptions,
  getActionCategoryOptions,
  getActionTypeOptionsByCategory,
  CONDITION_TARGET_TYPE_OPTIONS,
  ACTION_TARGET_TYPE_OPTIONS,
} from "@/domains/inventory/products/components/product-details-card/bundle-ui/dependency-rules";

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
const getDefaultGroup = (
  rule: ApiProductComponentDependencyRule,
): ApiProductComponentConditionGroup => {
  if (rule.conditionGroups.length > 0) {
    return rule.conditionGroups[0];
  }
  return {
    __typename: "ProductComponentConditionGroup",
    id: generateId("grp"),
    logicOperator: ProductComponentLogicOperator.And,
    sortIndex: 0,
    conditions: [],
  };
};

/** Update conditions in the first group, creating the group if needed */
const updateFirstGroupConditions = (
  rule: ApiProductComponentDependencyRule,
  updater: (
    conditions: ApiProductComponentCondition[],
  ) => ApiProductComponentCondition[],
): ApiProductComponentDependencyRule => {
  const group = getDefaultGroup(rule);
  const updatedGroup: ApiProductComponentConditionGroup = {
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
  rule: ApiProductComponentDependencyRule | null;
  groups: ApiProductComponentGroup[];
  onRuleChange: (rule: ApiProductComponentDependencyRule) => void;
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
    const newCondition: ApiProductComponentCondition = {
      __typename: "ProductComponentCondition",
      id: generateId("cond"),
      category: ProductComponentConditionCategory.StateCheck,
      subject: ProductComponentConditionSubject.ItemSelected,
      operator: ProductComponentConditionOperator.IsSelected,
      targetType: ProductComponentDependencyTargetType.Item,
      targetId: firstItem?.id ?? "",
      value: null,
      sortIndex: getDefaultGroup(rule).conditions.length,
    };
    onRuleChange(updateFirstGroupConditions(rule, (conds) => [...conds, newCondition]));
  }, [rule, groups, onRuleChange]);

  const handleUpdateCondition = useCallback(
    (conditionId: string, updates: Partial<ApiProductComponentCondition>) => {
      if (!rule) return;
      onRuleChange(
        updateFirstGroupConditions(rule, (conds) =>
          conds.map((c) =>
            c.id === conditionId ? ({ ...c, ...updates } as ApiProductComponentCondition) : c
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
    const newAction: ApiProductComponentDependencyAction = {
      __typename: "ProductComponentDependencyAction",
      id: generateId("act"),
      actionType: ProductComponentDependencyActionType.Hide,
      targetType: ProductComponentDependencyTargetType.Item,
      targetId: firstItem?.id ?? "",
      requiredValue: null,
      priceRule: null,
      stackable: false,
      sortIndex: rule.actions.length,
    };
    onRuleChange({
      ...rule,
      actions: [...rule.actions, newAction],
    });
  }, [rule, groups, onRuleChange]);

  const handleUpdateAction = useCallback(
    (actionId: string, updates: Partial<ApiProductComponentDependencyAction>) => {
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
