"use client";

import { useMemo } from "react";
import { createStyles } from "antd-style";
import {
  Typography,
  Input,
  InputNumber,
  Switch,
  Select,
  Button,
  Space,
  Divider,
  Empty,
  Tag,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  CloseOutlined,
} from "@ant-design/icons";

import type {
  IDependencyRule,
  IDependencyCondition,
  IDependencyAction,
  IComponentGroup,
} from "../../../types";
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
  ComponentPriceType,
} from "../../../types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  container: {
    width: 320,
    height: "100%",
    borderLeft: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    padding: "12px 16px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontWeight: 600,
  },
  content: {
    flex: 1,
    padding: 16,
    overflowY: "auto",
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: token.colorTextSecondary,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    color: token.colorTextSecondary,
    marginBottom: 4,
    display: "block",
  },
  conditionItem: {
    padding: 8,
    background: token.colorBgLayout,
    borderRadius: token.borderRadius,
    marginBottom: 8,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  conditionRow: {
    display: "flex",
    gap: 6,
    alignItems: "center",
  },
  actionItem: {
    padding: 8,
    background: token.colorBgLayout,
    borderRadius: token.borderRadius,
    marginBottom: 8,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  deleteButton: {
    flexShrink: 0,
  },
  emptyConditions: {
    padding: "16px 0",
    textAlign: "center",
  },
}));

// ============================================================================
// Types
// ============================================================================

interface IRuleInspectorProps {
  rule: IDependencyRule | null;
  groups: IComponentGroup[];
  onRuleChange: (rule: IDependencyRule) => void;
  onClose: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

const getTargetOptions = (
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

/**
 * Get condition type options filtered by target type
 */
const getConditionTypeOptions = (targetType: DependencyTargetType) => {
  const validTypes = CONDITION_TYPES_BY_TARGET[targetType];
  return validTypes.map((type) => ({
    value: type,
    label: CONDITION_TYPE_LABELS[type],
  }));
};

/**
 * Get action type options filtered by target type
 */
const getActionTypeOptions = (targetType: DependencyTargetType) => {
  const validTypes = ACTION_TYPES_BY_TARGET[targetType];
  return validTypes.map((type) => ({
    value: type,
    label: ACTION_TYPE_LABELS[type],
  }));
};

/**
 * Target type options for conditions (exclude BUNDLE as it can't be a condition source)
 */
const CONDITION_TARGET_TYPE_OPTIONS = [
  { value: DependencyTargetType.ITEM, label: TARGET_TYPE_LABELS[DependencyTargetType.ITEM] },
  { value: DependencyTargetType.GROUP, label: TARGET_TYPE_LABELS[DependencyTargetType.GROUP] },
];

/**
 * Target type options for actions (all targets are valid)
 */
const ACTION_TARGET_TYPE_OPTIONS = Object.entries(TARGET_TYPE_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  })
);

const PRICE_TYPE_OPTIONS = PRICE_RULE_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label,
}));

// ============================================================================
// Component
// ============================================================================

export const RuleInspector = ({
  rule,
  groups,
  onRuleChange,
  onClose,
}: IRuleInspectorProps) => {
  const { styles } = useStyles();

  // ========================================
  // Handlers
  // ========================================

  const handleNameChange = (name: string) => {
    if (!rule) return;
    onRuleChange({ ...rule, name });
  };

  const handleEnabledChange = (enabled: boolean) => {
    if (!rule) return;
    onRuleChange({ ...rule, enabled });
  };

  // Condition handlers
  const handleAddCondition = () => {
    if (!rule) return;
    const firstItem = groups[0]?.items[0];
    const newCondition: IDependencyCondition = {
      id: `cond-${Date.now()}`,
      conditionType: DependencyConditionType.IS_SELECTED,
      targetType: DependencyTargetType.ITEM,
      targetId: firstItem?.id ?? "",
    };
    onRuleChange({
      ...rule,
      conditions: [...rule.conditions, newCondition],
    });
  };

  const handleUpdateCondition = (
    conditionId: string,
    updates: Partial<IDependencyCondition>
  ) => {
    if (!rule) return;
    onRuleChange({
      ...rule,
      conditions: rule.conditions.map((c) =>
        c.id === conditionId ? { ...c, ...updates } : c
      ),
    });
  };

  const handleDeleteCondition = (conditionId: string) => {
    if (!rule) return;
    onRuleChange({
      ...rule,
      conditions: rule.conditions.filter((c) => c.id !== conditionId),
    });
  };

  // Action handlers
  const handleAddAction = () => {
    if (!rule) return;
    const firstItem = groups[0]?.items[0];
    const newAction: IDependencyAction = {
      id: `act-${Date.now()}`,
      actionType: DependencyActionType.DISABLE,
      targetType: DependencyTargetType.ITEM,
      targetId: firstItem?.id ?? "",
    };
    onRuleChange({
      ...rule,
      actions: [...rule.actions, newAction],
    });
  };

  const handleUpdateAction = (
    actionId: string,
    updates: Partial<IDependencyAction>
  ) => {
    if (!rule) return;
    onRuleChange({
      ...rule,
      actions: rule.actions.map((a) =>
        a.id === actionId ? { ...a, ...updates } : a
      ),
    });
  };

  const handleDeleteAction = (actionId: string) => {
    if (!rule) return;
    onRuleChange({
      ...rule,
      actions: rule.actions.filter((a) => a.id !== actionId),
    });
  };

  // ========================================
  // Render
  // ========================================

  if (!rule) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Typography.Text className={styles.headerTitle}>
            Rule Inspector
          </Typography.Text>
        </div>
        <div className={styles.content}>
          <Empty
            description="Select a rule to edit"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Typography.Text className={styles.headerTitle}>
          Rule Inspector
        </Typography.Text>
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} />
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Basic Info */}
        <div className={styles.section}>
          <div className={styles.field}>
            <Typography.Text className={styles.fieldLabel}>Name</Typography.Text>
            <Input
              value={rule.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Rule name"
            />
          </div>
          <div className={styles.field}>
            <Space>
              <Switch
                checked={rule.enabled}
                onChange={handleEnabledChange}
                size="small"
              />
              <Typography.Text>Enabled</Typography.Text>
            </Space>
          </div>
        </div>

        <Divider style={{ margin: "12px 0" }} />

        {/* WHEN Conditions */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Typography.Text className={styles.sectionTitle}>
              WHEN (Conditions)
            </Typography.Text>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleAddCondition}
            />
          </div>

          {rule.conditions.length === 0 ? (
            <div className={styles.emptyConditions}>
              <Typography.Text type="secondary">No conditions</Typography.Text>
            </div>
          ) : (
            rule.conditions.map((condition) => (
              <div key={condition.id} className={styles.conditionItem}>
                <div className={styles.conditionRow}>
                  <Select
                    value={condition.targetType}
                    onChange={(value) => {
                      // Reset condition type to first valid type for new target
                      const validTypes = CONDITION_TYPES_BY_TARGET[value as DependencyTargetType];
                      const newConditionType = validTypes.includes(condition.conditionType)
                        ? condition.conditionType
                        : validTypes[0];
                      handleUpdateCondition(condition.id, {
                        targetType: value,
                        conditionType: newConditionType,
                        targetId:
                          value === DependencyTargetType.ITEM
                            ? groups[0]?.items[0]?.id ?? ""
                            : groups[0]?.id ?? "",
                      });
                    }}
                    options={CONDITION_TARGET_TYPE_OPTIONS}
                    size="small"
                    style={{ width: 80 }}
                  />
                  <Select
                    value={condition.targetId}
                    onChange={(value) =>
                      handleUpdateCondition(condition.id, { targetId: value })
                    }
                    options={getTargetOptions(condition.targetType, groups)}
                    size="small"
                    style={{ flex: 1 }}
                    showSearch
                    optionFilterProp="label"
                  />
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteCondition(condition.id)}
                    className={styles.deleteButton}
                  />
                </div>
                <div className={styles.conditionRow}>
                  <Select
                    value={condition.conditionType}
                    onChange={(value) =>
                      handleUpdateCondition(condition.id, { conditionType: value })
                    }
                    options={getConditionTypeOptions(condition.targetType)}
                    size="small"
                    style={{ flex: 1 }}
                  />
                  {[
                    DependencyConditionType.QTY_GTE,
                    DependencyConditionType.QTY_LTE,
                    DependencyConditionType.QTY_EQ,
                    DependencyConditionType.GROUP_UNIQUE_GTE,
                    DependencyConditionType.GROUP_TOTAL_QTY_GTE,
                  ].includes(condition.conditionType) && (
                    <InputNumber
                      value={condition.value}
                      onChange={(value) =>
                        handleUpdateCondition(condition.id, { value: value ?? 0 })
                      }
                      min={0}
                      size="small"
                      style={{ width: 60 }}
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <Divider style={{ margin: "12px 0" }} />

        {/* THEN Actions */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Typography.Text className={styles.sectionTitle}>
              THEN (Actions)
            </Typography.Text>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleAddAction}
            />
          </div>

          {rule.actions.length === 0 ? (
            <div className={styles.emptyConditions}>
              <Typography.Text type="secondary">No actions</Typography.Text>
            </div>
          ) : (
            rule.actions.map((action) => (
              <div key={action.id} className={styles.actionItem}>
                <div className={styles.conditionRow}>
                  <Select
                    value={action.targetType}
                    onChange={(value) => {
                      // Reset action type to first valid type for new target
                      const validTypes = ACTION_TYPES_BY_TARGET[value as DependencyTargetType];
                      const newActionType = validTypes.includes(action.actionType)
                        ? action.actionType
                        : validTypes[0];
                      handleUpdateAction(action.id, {
                        targetType: value,
                        actionType: newActionType,
                        targetId:
                          value === DependencyTargetType.BUNDLE
                            ? undefined
                            : value === DependencyTargetType.ITEM
                            ? groups[0]?.items[0]?.id ?? ""
                            : groups[0]?.id ?? "",
                      });
                    }}
                    options={ACTION_TARGET_TYPE_OPTIONS}
                    size="small"
                    style={{ width: 80 }}
                  />
                  {action.targetType !== DependencyTargetType.BUNDLE && (
                    <Select
                      value={action.targetId}
                      onChange={(value) =>
                        handleUpdateAction(action.id, { targetId: value })
                      }
                      options={getTargetOptions(action.targetType, groups)}
                      size="small"
                      style={{ flex: 1 }}
                      showSearch
                      optionFilterProp="label"
                    />
                  )}
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteAction(action.id)}
                    className={styles.deleteButton}
                  />
                </div>
                <div className={styles.conditionRow}>
                  <Select
                    value={action.actionType}
                    onChange={(value) =>
                      handleUpdateAction(action.id, { actionType: value })
                    }
                    options={getActionTypeOptions(action.targetType)}
                    size="small"
                    style={{ flex: 1 }}
                  />
                </div>

                {/* Price-specific fields */}
                {(action.actionType === DependencyActionType.OVERRIDE_PRICE ||
                  action.actionType === DependencyActionType.ADJUST_PRICE) && (
                  <div className={styles.conditionRow}>
                    <Select
                      value={action.priceType}
                      onChange={(value) =>
                        handleUpdateAction(action.id, { priceType: value })
                      }
                      options={PRICE_TYPE_OPTIONS}
                      size="small"
                      style={{ flex: 1 }}
                      placeholder="Price type"
                    />
                    {action.priceType &&
                      PRICE_RULE_OPTIONS.find(
                        (o) => o.value === action.priceType
                      )?.requiresValue && (
                        <InputNumber
                          value={action.priceValue ?? undefined}
                          onChange={(value) =>
                            handleUpdateAction(action.id, { priceValue: value })
                          }
                          min={0}
                          size="small"
                          style={{ width: 80 }}
                          addonAfter={
                            PRICE_RULE_OPTIONS.find(
                              (o) => o.value === action.priceType
                            )?.valueSuffix
                          }
                        />
                      )}
                  </div>
                )}

                {/* Quantity field */}
                {action.actionType === DependencyActionType.SET_QTY && (
                  <div className={styles.conditionRow}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Quantity:
                    </Typography.Text>
                    <InputNumber
                      value={action.qtyValue}
                      onChange={(value) =>
                        handleUpdateAction(action.id, { qtyValue: value ?? 0 })
                      }
                      min={0}
                      size="small"
                      style={{ flex: 1 }}
                    />
                  </div>
                )}

              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RuleInspector;
