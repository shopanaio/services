"use client";

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
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";

import type { IDependencyRule, IBundleGroup } from "@/domains/promos/bundles/types";
import {
  DependencyActionType,
  DependencyTargetType,
  PRICE_RULE_OPTIONS,
} from "@/domains/promos/bundles/types";
import {
  ConditionCategory,
  ComparisonOperator,
  ActionCategory,
  CONDITION_SUBJECT_META,
  COMPARISON_OPERATOR_META,
  ACTIONS_BY_CATEGORY,
  CATEGORIES_BY_TARGET,
} from "@/domains/promos/bundles/dependency-rules";
import type { IDependencyCondition } from "@/domains/promos/bundles/dependency-rules";
import { Paper, PaperHeader } from "@/ui-kit/paper";

import { useStyles } from "./rule-inspector.styles";
import {
  useRuleInspector,
  getTargetOptions,
  getSubjectOptions,
  getOperatorOptions,
  getActionCategoryOptions,
  getActionTypeOptionsByCategory,
  CONDITION_TARGET_TYPE_OPTIONS,
  ACTION_TARGET_TYPE_OPTIONS,
  PRICE_TYPE_OPTIONS,
} from "./use-rule-inspector";

// ============================================================================
// Types
// ============================================================================

interface IRuleInspectorProps {
  rule: IDependencyRule | null;
  groups: IBundleGroup[];
  onRuleChange: (rule: IDependencyRule) => void;
}

// ============================================================================
// Helpers
// ============================================================================

/** Check if a condition needs a value input */
const conditionNeedsValue = (condition: IDependencyCondition): boolean => {
  if (condition.category !== ConditionCategory.NUMERIC) return false;
  const meta = COMPARISON_OPERATOR_META[condition.operator];
  return meta?.requiresValue ?? false;
};

/** Check if a condition needs a second value input (BETWEEN) */
const conditionNeedsSecondValue = (condition: IDependencyCondition): boolean => {
  if (condition.category !== ConditionCategory.NUMERIC) return false;
  return condition.operator === ComparisonOperator.BETWEEN;
};

/** Derive ActionCategory from an action type (reverse lookup) */
const getCategoryForAction = (actionType: DependencyActionType): ActionCategory => {
  for (const [cat, actions] of Object.entries(ACTIONS_BY_CATEGORY)) {
    if ((actions as DependencyActionType[]).includes(actionType)) return cat as ActionCategory;
  }
  return ActionCategory.VISIBILITY;
};

// ============================================================================
// Component
// ============================================================================

export const RuleInspector = ({ rule, groups, onRuleChange }: IRuleInspectorProps) => {
  const { styles, cx } = useStyles();

  const {
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
  } = useRuleInspector({ rule, groups, onRuleChange });

  // Get all conditions from all groups (flattened for display)
  const allConditions: IDependencyCondition[] =
    rule?.conditionGroups.flatMap((g) => g.conditions) ?? [];

  // Collapsed view
  if (collapsed) {
    return (
      <Paper className={cx(styles.container, styles.containerCollapsed)}>
        <PaperHeader
          bordered={false}
          extra={
            <Button
              type="text"
              size="small"
              icon={<LeftOutlined />}
              onClick={toggleCollapsed}
            />
          }
        />
        <div className={styles.collapsedContent}>
          <span className={styles.verticalText}>Rule Inspector</span>
        </div>
      </Paper>
    );
  }

  // Empty state
  if (!rule) {
    return (
      <Paper className={styles.container}>
        <PaperHeader
          title="Rule Inspector"
          actions={
            <Button
              type="text"
              size="small"
              icon={<RightOutlined />}
              onClick={toggleCollapsed}
            />
          }
        />
        <div className={styles.content}>
          <Empty
            description="Select a rule to edit"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      </Paper>
    );
  }

  return (
    <Paper className={styles.container}>
      <PaperHeader
        title="Rule Inspector"
        actions={
          <Button
            type="text"
            size="small"
            icon={<RightOutlined />}
            onClick={toggleCollapsed}
          />
        }
      />

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
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <div className={styles.field} style={{ flex: 1, marginBottom: 0 }}>
              <Typography.Text className={styles.fieldLabel}>Priority</Typography.Text>
              <InputNumber
                value={rule.priority}
                onChange={handlePriorityChange}
                min={0}
                max={199}
                style={{ width: 70 }}
              />
            </div>
            <div style={{ paddingBottom: 4 }}>
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

          {allConditions.length === 0 ? (
            <div className={styles.emptyConditions}>
              <Typography.Text type="secondary">No conditions</Typography.Text>
            </div>
          ) : (
            allConditions.map((condition) => (
              <div key={condition.id} className={styles.conditionItem}>
                {/* Row 1: Target type + target select */}
                <div className={styles.conditionRow}>
                  <Select
                    value={condition.targetType}
                    onChange={(value) => {
                      const subjects = getSubjectOptions(value as DependencyTargetType);
                      const firstSubject = subjects[0]?.value;
                      const operators = firstSubject ? getOperatorOptions(firstSubject) : [];
                      const firstOperator = operators[0]?.value;
                      const subjectMeta = firstSubject ? CONDITION_SUBJECT_META[firstSubject] : null;
                      handleUpdateCondition(condition.id, {
                        targetType: value,
                        subject: firstSubject,
                        operator: firstOperator,
                        category: subjectMeta?.category ?? ConditionCategory.STATE_CHECK,
                        targetId:
                          value === DependencyTargetType.BUNDLE
                            ? ""
                            : value === DependencyTargetType.ITEM
                              ? (groups[0]?.items[0]?.id ?? "")
                              : (groups[0]?.id ?? ""),
                      } as Partial<IDependencyCondition>);
                    }}
                    options={CONDITION_TARGET_TYPE_OPTIONS}
                    size="small"
                    style={{ width: 80 }}
                  />
                  {condition.targetType !== DependencyTargetType.BUNDLE && (
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
                  )}
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteCondition(condition.id)}
                    className={styles.deleteButton}
                  />
                </div>

                {/* Row 2: Subject + Operator */}
                <div className={styles.conditionRow}>
                  <Select
                    value={condition.subject}
                    onChange={(value) => {
                      const operators = getOperatorOptions(value);
                      const firstOperator = operators[0]?.value;
                      const subjectMeta = CONDITION_SUBJECT_META[value];
                      handleUpdateCondition(condition.id, {
                        subject: value,
                        operator: firstOperator,
                        category: subjectMeta.category,
                      } as Partial<IDependencyCondition>);
                    }}
                    options={getSubjectOptions(condition.targetType)}
                    size="small"
                    style={{ flex: 1 }}
                  />
                  <Select
                    value={condition.operator}
                    onChange={(value) =>
                      handleUpdateCondition(condition.id, { operator: value } as Partial<IDependencyCondition>)
                    }
                    options={getOperatorOptions(condition.subject)}
                    size="small"
                    style={{ flex: 1 }}
                  />
                </div>

                {/* Row 3: Value (for numeric conditions) */}
                {conditionNeedsValue(condition) && (
                  <div className={styles.conditionRow}>
                    <InputNumber
                      value={condition.category === ConditionCategory.NUMERIC ? condition.value : undefined}
                      onChange={(value) =>
                        handleUpdateCondition(condition.id, { value: value ?? 0 })
                      }
                      min={0}
                      size="small"
                      style={{ flex: 1 }}
                      placeholder="Value"
                    />
                    {conditionNeedsSecondValue(condition) && (
                      <InputNumber
                        value={condition.category === ConditionCategory.NUMERIC ? condition.valueTo : undefined}
                        onChange={(value) =>
                          handleUpdateCondition(condition.id, { valueTo: value ?? 0 })
                        }
                        min={0}
                        size="small"
                        style={{ flex: 1 }}
                        placeholder="To"
                      />
                    )}
                  </div>
                )}
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
                {/* Row 1: Target type + target select */}
                <div className={styles.conditionRow}>
                  <Select
                    value={action.targetType}
                    onChange={(value) => {
                      const categories = CATEGORIES_BY_TARGET[value as DependencyTargetType];
                      const firstCategory = categories[0];
                      const actionsInCategory = ACTIONS_BY_CATEGORY[firstCategory];
                      const newActionType = actionsInCategory[0];
                      handleUpdateAction(action.id, {
                        targetType: value,
                        actionType: newActionType,
                        targetId:
                          value === DependencyTargetType.BUNDLE
                            ? undefined
                            : value === DependencyTargetType.ITEM
                              ? (groups[0]?.items[0]?.id ?? "")
                              : (groups[0]?.id ?? ""),
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

                {/* Row 2: Action category + action type */}
                <div className={styles.conditionRow}>
                  <Select
                    value={getCategoryForAction(action.actionType)}
                    onChange={(value) => {
                      const actionsInCategory = ACTIONS_BY_CATEGORY[value as ActionCategory];
                      handleUpdateAction(action.id, { actionType: actionsInCategory[0] });
                    }}
                    options={getActionCategoryOptions(action.targetType)}
                    size="small"
                    style={{ flex: 1 }}
                  />
                  <Select
                    value={action.actionType}
                    onChange={(value) =>
                      handleUpdateAction(action.id, { actionType: value })
                    }
                    options={getActionTypeOptionsByCategory(getCategoryForAction(action.actionType))}
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
                      PRICE_RULE_OPTIONS.find((o) => o.value === action.priceType)
                        ?.requiresValue && (
                        <InputNumber
                          value={action.priceValue ?? undefined}
                          onChange={(value) =>
                            handleUpdateAction(action.id, { priceValue: value })
                          }
                          min={0}
                          size="small"
                          style={{ width: 80 }}
                          addonAfter={
                            PRICE_RULE_OPTIONS.find((o) => o.value === action.priceType)
                              ?.valueSuffix
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

                {/* Quantity limits fields */}
                {action.actionType === DependencyActionType.SET_QTY_LIMITS && (
                  <div className={styles.conditionRow}>
                    <InputNumber
                      value={action.minQtyValue ?? undefined}
                      onChange={(value) =>
                        handleUpdateAction(action.id, { minQtyValue: value })
                      }
                      min={0}
                      size="small"
                      style={{ flex: 1 }}
                      placeholder="Min"
                    />
                    <InputNumber
                      value={action.maxQtyValue ?? undefined}
                      onChange={(value) =>
                        handleUpdateAction(action.id, { maxQtyValue: value })
                      }
                      min={0}
                      size="small"
                      style={{ flex: 1 }}
                      placeholder="Max"
                    />
                  </div>
                )}

                {/* Required field */}
                {action.actionType === DependencyActionType.SET_REQUIRED && (
                  <div className={styles.conditionRow}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Required:
                    </Typography.Text>
                    <Switch
                      checked={action.requiredValue ?? false}
                      onChange={(checked) =>
                        handleUpdateAction(action.id, { requiredValue: checked })
                      }
                      size="small"
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Paper>
  );
};
