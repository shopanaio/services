"use client";

import type { ReactNode } from "react";
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
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  LeftOutlined,
  RightOutlined,
  CheckSquareOutlined,
  NumberOutlined,
  InboxOutlined,
  AppstoreOutlined,
  OrderedListOutlined,
  DollarOutlined,
  ContainerOutlined,
  EyeOutlined,
  PoweroffOutlined,
  TagOutlined,
  GiftOutlined,
} from "@ant-design/icons";

import type { IDependencyRule, IBundleGroup } from "@/domains/promos/bundles/types";
import {
  DependencyActionType,
  DependencyTargetType,
  PRICE_RULE_OPTIONS,
} from "@/domains/promos/bundles/types";
import {
  ConditionCategory,
  ConditionSubject,
  ComparisonOperator,
  ActionCategory,
  CONDITION_SUBJECT_META,
  CONDITION_SUBJECT_LABELS,
  COMPARISON_OPERATOR_META,
  STATE_CHECK_OPERATOR_META,
  SUBJECTS_BY_TARGET,
  OPERATORS_BY_SUBJECT,
  ACTIONS_BY_CATEGORY,
  CATEGORIES_BY_TARGET,
  ACTION_CATEGORY_LABELS,
  ACTION_META,
} from "@/domains/promos/bundles/dependency-rules";
import type { IDependencyCondition } from "@/domains/promos/bundles/dependency-rules";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { NavigableDropdown, type IMenuLevel } from "@/ui-kit/navigable-dropdown";

import { useStyles } from "./rule-inspector.styles";
import {
  useRuleInspector,
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

/** Get display label for any operator (symbol for comparison, label for state) */
const getOperatorLabel = (op: string): string => {
  if (op in ComparisonOperator) {
    return COMPARISON_OPERATOR_META[op as ComparisonOperator]?.symbol ?? op;
  }
  return STATE_CHECK_OPERATOR_META[op as keyof typeof STATE_CHECK_OPERATOR_META]?.label ?? op;
};

/** Short subject names for chip display */
const SUBJECT_SHORT: Partial<Record<ConditionSubject, string>> = {
  [ConditionSubject.ITEM_QTY]: "qty",
  [ConditionSubject.GROUP_UNIQUE_COUNT]: "unique count",
  [ConditionSubject.GROUP_TOTAL_QTY]: "total qty",
  [ConditionSubject.GROUP_SUBTOTAL]: "subtotal",
  [ConditionSubject.BUNDLE_SUBTOTAL]: "subtotal",
};

/** Grammatically correct verb phrases for comparison operators */
const OPERATOR_PHRASE: Record<ComparisonOperator, string> = {
  [ComparisonOperator.GT]: "is greater than",
  [ComparisonOperator.GTE]: "is at least",
  [ComparisonOperator.EQ]: "equals",
  [ComparisonOperator.LTE]: "is at most",
  [ComparisonOperator.LT]: "is less than",
  [ComparisonOperator.BETWEEN]: "is between",
  [ComparisonOperator.IN_LIST]: "is in",
};

/** Build a grammatically correct chip label for a condition */
const getConditionChipLabel = (subject: ConditionSubject, operator: string): string => {
  // State checks — the operator label is already a phrase
  if (!(operator in ComparisonOperator)) {
    return STATE_CHECK_OPERATOR_META[operator as keyof typeof STATE_CHECK_OPERATOR_META]?.label ?? operator;
  }
  // Numeric — short subject + verb phrase
  const subjectShort = SUBJECT_SHORT[subject] ?? subject;
  const phrase = OPERATOR_PHRASE[operator as ComparisonOperator] ?? operator;
  return `${subjectShort} ${phrase}`;
};

/** Grammatically correct phrases for action chip display */
const ACTION_PHRASE: Record<DependencyActionType, string> = {
  [DependencyActionType.SHOW]: "is shown",
  [DependencyActionType.HIDE]: "is hidden",
  [DependencyActionType.ENABLE]: "is enabled",
  [DependencyActionType.DISABLE]: "is disabled",
  [DependencyActionType.SET_QTY]: "quantity is",
  [DependencyActionType.SET_QTY_LIMITS]: "quantity limits",
  [DependencyActionType.SET_REQUIRED]: "is required",
  [DependencyActionType.OVERRIDE_PRICE]: "price override",
  [DependencyActionType.ADJUST_PRICE]: "price adjust",
};

/** Icon maps for first-level menu items */
const SUBJECT_ICONS: Record<string, ReactNode> = {
  [ConditionSubject.ITEM_SELECTED]: <CheckSquareOutlined />,
  [ConditionSubject.ITEM_QTY]: <NumberOutlined />,
  [ConditionSubject.ITEM_STOCK]: <InboxOutlined />,
  [ConditionSubject.GROUP_UNIQUE_COUNT]: <AppstoreOutlined />,
  [ConditionSubject.GROUP_TOTAL_QTY]: <OrderedListOutlined />,
  [ConditionSubject.GROUP_SUBTOTAL]: <DollarOutlined />,
  [ConditionSubject.GROUP_CONTAINS]: <ContainerOutlined />,
  [ConditionSubject.BUNDLE_SUBTOTAL]: <DollarOutlined />,
};

const CATEGORY_ICONS: Record<string, ReactNode> = {
  [ActionCategory.VISIBILITY]: <EyeOutlined />,
  [ActionCategory.STATE]: <PoweroffOutlined />,
  [ActionCategory.QUANTITY]: <NumberOutlined />,
  [ActionCategory.SELECTION]: <CheckSquareOutlined />,
  [ActionCategory.PRICE]: <DollarOutlined />,
};

/** Target type display config */
const TARGET_TYPE_ICONS: Record<DependencyTargetType, ReactNode> = {
  [DependencyTargetType.ITEM]: <TagOutlined />,
  [DependencyTargetType.GROUP]: <AppstoreOutlined />,
  [DependencyTargetType.BUNDLE]: <GiftOutlined />,
};

const TARGET_TYPE_COLORS: Record<DependencyTargetType, string> = {
  [DependencyTargetType.ITEM]: "blue",
  [DependencyTargetType.GROUP]: "purple",
  [DependencyTargetType.BUNDLE]: "gold",
};

/** Get display label for a target */
const getTargetLabel = (
  targetType: DependencyTargetType,
  targetId: string | undefined,
  groups: IBundleGroup[],
): string => {
  if (targetType === DependencyTargetType.BUNDLE) return "Bundle";
  if (targetType === DependencyTargetType.GROUP) {
    const group = groups.find((g) => g.id === targetId);
    return group?.title ?? targetId ?? "—";
  }
  for (const g of groups) {
    const item = g.items.find((i) => i.id === targetId);
    if (item) return item.title ?? item.assignedProduct?.title ?? item.id;
  }
  return targetId ?? "—";
};

/** Build target selection levels: Item → items list, Group → groups list, Bundle → leaf */
const buildTargetLevels = (
  groups: IBundleGroup[],
  onSelect: (targetType: DependencyTargetType, targetId: string) => void,
): IMenuLevel[] => [
  {
    key: DependencyTargetType.ITEM,
    label: "Item",
    icon: <TagOutlined />,
    childrenLayout: "list",
    children: groups.flatMap((g) =>
      g.items.map((item) => ({
        key: item.id,
        label: item.title ?? item.assignedProduct?.title ?? item.id,
        onClick: () => onSelect(DependencyTargetType.ITEM, item.id),
      })),
    ),
  },
  {
    key: DependencyTargetType.GROUP,
    label: "Group",
    icon: <AppstoreOutlined />,
    childrenLayout: "list",
    children: groups.map((g) => ({
      key: g.id,
      label: g.title,
      onClick: () => onSelect(DependencyTargetType.GROUP, g.id),
    })),
  },
  {
    key: DependencyTargetType.BUNDLE,
    label: "Bundle",
    icon: <GiftOutlined />,
    onClick: () => onSelect(DependencyTargetType.BUNDLE, ""),
  },
];

/** Build 2-level structure for condition subject→operator */
const buildConditionLevels = (
  targetType: DependencyTargetType,
  onSelect: (subject: ConditionSubject, operator: string) => void,
): IMenuLevel[] => {
  const subjects = SUBJECTS_BY_TARGET[targetType];
  return subjects.map((subject) => ({
    key: subject,
    label: CONDITION_SUBJECT_LABELS[subject],
    icon: SUBJECT_ICONS[subject],
    children: OPERATORS_BY_SUBJECT[subject].map((op) => ({
      key: `${subject}:${op}`,
      label: getOperatorLabel(op),
      onClick: () => onSelect(subject, op),
    })),
  }));
};

/** Build 2-level structure for action category→type */
const buildActionLevels = (
  targetType: DependencyTargetType,
  onSelect: (actionType: DependencyActionType) => void,
): IMenuLevel[] => {
  const categories = CATEGORIES_BY_TARGET[targetType];
  return categories.map((cat) => ({
    key: cat,
    label: ACTION_CATEGORY_LABELS[cat],
    icon: CATEGORY_ICONS[cat],
    children: ACTIONS_BY_CATEGORY[cat].map((actionType) => ({
      key: `${cat}:${actionType}`,
      label: ACTION_META[actionType].label,
      onClick: () => onSelect(actionType),
    })),
  }));
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
                {/* Row 1: Target chip (navigable dropdown) */}
                <div className={styles.conditionRow}>
                  <NavigableDropdown
                    levels={buildTargetLevels(groups, (targetType, targetId) => {
                      const subjects = SUBJECTS_BY_TARGET[targetType];
                      const firstSubject = subjects[0];
                      const operators = firstSubject ? OPERATORS_BY_SUBJECT[firstSubject] : [];
                      const firstOperator = operators[0];
                      const subjectMeta = firstSubject ? CONDITION_SUBJECT_META[firstSubject] : null;
                      handleUpdateCondition(condition.id, {
                        targetType,
                        targetId,
                        subject: firstSubject,
                        operator: firstOperator,
                        category: subjectMeta?.category ?? ConditionCategory.STATE_CHECK,
                      } as Partial<IDependencyCondition>);
                    })}
                  >
                    <div className={styles.operatorChip}>
                      <Tag
                        className={styles.chipOperator}
                        color={TARGET_TYPE_COLORS[condition.targetType]}
                      >
                        {TARGET_TYPE_ICONS[condition.targetType]}
                      </Tag>
                      <span className={styles.chipSubject}>
                        {getTargetLabel(condition.targetType, condition.targetId, groups)}
                      </span>
                    </div>
                  </NavigableDropdown>
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteCondition(condition.id)}
                    className={styles.deleteButton}
                  />
                </div>

                {/* Row 2: Operator chip (navigable dropdown) + optional value */}
                <div className={styles.conditionRow}>
                  <NavigableDropdown
                    levels={buildConditionLevels(
                      condition.targetType,
                      (subject, operator) => {
                        const subjectMeta = CONDITION_SUBJECT_META[subject];
                        handleUpdateCondition(condition.id, {
                          subject,
                          operator,
                          category: subjectMeta.category,
                        } as Partial<IDependencyCondition>);
                      },
                    )}
                  >
                    <div className={styles.operatorChip}>
                      {getConditionChipLabel(condition.subject, condition.operator)}
                    </div>
                  </NavigableDropdown>
                  {conditionNeedsValue(condition) && (
                    <InputNumber
                      value={condition.category === ConditionCategory.NUMERIC ? condition.value : undefined}
                      onChange={(value) =>
                        handleUpdateCondition(condition.id, { value: value ?? 0 })
                      }
                      min={0}
                      size="small"
                      style={{ width: 56 }}
                    />
                  )}
                  {conditionNeedsSecondValue(condition) && (
                    <InputNumber
                      value={condition.category === ConditionCategory.NUMERIC ? condition.valueTo : undefined}
                      onChange={(value) =>
                        handleUpdateCondition(condition.id, { valueTo: value ?? 0 })
                      }
                      min={0}
                      size="small"
                      style={{ width: 56 }}
                      placeholder="to"
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
                {/* Row 1: Target chip (navigable dropdown) */}
                <div className={styles.conditionRow}>
                  <NavigableDropdown
                    levels={buildTargetLevels(groups, (targetType, targetId) => {
                      const categories = CATEGORIES_BY_TARGET[targetType];
                      const firstCategory = categories[0];
                      const actionsInCategory = ACTIONS_BY_CATEGORY[firstCategory];
                      const newActionType = actionsInCategory[0];
                      handleUpdateAction(action.id, {
                        targetType,
                        actionType: newActionType,
                        targetId: targetType === DependencyTargetType.BUNDLE ? undefined : targetId,
                      });
                    })}
                  >
                    <div className={styles.operatorChip}>
                      <Tag
                        className={styles.chipOperator}
                        color={TARGET_TYPE_COLORS[action.targetType]}
                      >
                        {TARGET_TYPE_ICONS[action.targetType]}
                      </Tag>
                      <span className={styles.chipSubject}>
                        {getTargetLabel(action.targetType, action.targetId, groups)}
                      </span>
                    </div>
                  </NavigableDropdown>
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteAction(action.id)}
                    className={styles.deleteButton}
                  />
                </div>

                {/* Row 2: Action chip (navigable dropdown) */}
                <div className={styles.conditionRow}>
                  <NavigableDropdown
                    levels={buildActionLevels(
                      action.targetType,
                      (actionType) => handleUpdateAction(action.id, { actionType }),
                    )}
                  >
                    <div className={styles.operatorChip}>
                      {ACTION_PHRASE[action.actionType]}
                    </div>
                  </NavigableDropdown>
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
