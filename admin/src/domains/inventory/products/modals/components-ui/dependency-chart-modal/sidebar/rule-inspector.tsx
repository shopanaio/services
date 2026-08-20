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
  Tooltip,
} from "antd";
import {
  LuPlus as PlusOutlined,
  LuTrash2 as DeleteOutlined,
  LuChevronLeft as LeftOutlined,
  LuChevronRight as RightOutlined,
  LuSquareCheckBig as CheckSquareOutlined,
  LuHash as NumberOutlined,
  LuListOrdered as OrderedListOutlined,
  LuCircleDollarSign as DollarOutlined,
  LuEye as EyeOutlined,
  LuZap as ThunderboltOutlined,
  LuCircleHelp as InfoCircleOutlined,
} from "react-icons/lu";

import type {
  ApiProductComponentCondition,
  ApiProductComponentDependencyRule,
  ApiProductComponentGroup,
} from "@/graphql/types";
import {
  ProductComponentConditionCategory,
  ProductComponentConditionOperator,
  ProductComponentConditionSubject,
  ProductComponentDependencyActionType,
  ProductComponentDependencyTargetType,
} from "@/graphql/types";
import { PRICE_RULE_OPTIONS } from "@/domains/inventory/products/components/product-details-card/components-ui/types";
import {
  ActionCategory,
  CONDITION_SUBJECT_META,
  CONDITION_SUBJECT_LABELS,
  COMPARISON_OPERATOR_META,
  SUBJECTS_BY_TARGET,
  OPERATORS_BY_SUBJECT,
  ACTIONS_BY_CATEGORY,
  CATEGORIES_BY_TARGET,
  ACTION_CATEGORY_LABELS,
  ACTION_PHRASE,
  TARGET_TYPE_COLORS,
  CHART_NODE_ICONS,
  getOperatorLabel,
  getConditionChipLabel,
} from "@/domains/inventory/products/components/product-details-card/components-ui/dependency-rules";
import {
  toApiPriceRule,
  toEditorPriceRule,
} from "@/domains/inventory/products/mappers/product-component-editor.mapper";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { NavigableDropdown } from "@/ui-kit/navigable-dropdown";
import type { IMenuLevel } from "@/ui-kit/navigable-dropdown/navigable-dropdown";

import { useStyles } from "./rule-inspector.styles";
import { useRuleInspector, PRICE_TYPE_OPTIONS } from "./use-rule-inspector";

// ============================================================================
// Types
// ============================================================================

interface IRuleInspectorProps {
  rule: ApiProductComponentDependencyRule | null;
  groups: ApiProductComponentGroup[];
  onRuleChange: (rule: ApiProductComponentDependencyRule) => void;
}

// ============================================================================
// Helpers
// ============================================================================

/** Check if a condition needs a value input */
const conditionNeedsValue = (condition: ApiProductComponentCondition): boolean => {
  if (condition.category !== ProductComponentConditionCategory.Numeric) return false;
  const meta = COMPARISON_OPERATOR_META[condition.operator];
  return meta?.requiresValue ?? false;
};

/** Icon maps for first-level menu items */
const SUBJECT_ICONS: Record<string, ReactNode> = {
  [ProductComponentConditionSubject.ItemSelected]: <CheckSquareOutlined />,
  [ProductComponentConditionSubject.ItemQty]: <NumberOutlined />,
  [ProductComponentConditionSubject.GroupTotalQty]: <OrderedListOutlined />,
};

const CATEGORY_ICONS: Record<string, ReactNode> = {
  [ActionCategory.VISIBILITY]: <EyeOutlined />,
  [ActionCategory.SELECTION]: <CheckSquareOutlined />,
  [ActionCategory.PRICE]: <DollarOutlined />,
};

/** Get display label for a target */
const getTargetLabel = (
  targetType: ProductComponentDependencyTargetType,
  targetId: string | undefined,
  groups: ApiProductComponentGroup[],
): string => {
  if (targetType === ProductComponentDependencyTargetType.Configuration) return "Components";
  if (targetType === ProductComponentDependencyTargetType.Group) {
    const group = groups.find((g) => g.id === targetId);
    return group?.title ?? targetId ?? "—";
  }
  for (const g of groups) {
    const item = g.items.find((i) => i.id === targetId);
    if (item) return item.title ?? item.refProduct?.title ?? item.id;
  }
  return targetId ?? "—";
};

/** Build target selection levels: Item → items list, Group → groups list, Components → leaf */
const buildTargetLevels = (
  groups: ApiProductComponentGroup[],
  onSelect: (targetType: ProductComponentDependencyTargetType, targetId: string) => void,
): IMenuLevel[] => [
  {
    key: ProductComponentDependencyTargetType.Item,
    label: "Item",
    icon: CHART_NODE_ICONS[ProductComponentDependencyTargetType.Item],
    children: groups.flatMap((g) =>
      g.items.map((item) => ({
        key: item.id,
        label: item.title ?? item.refProduct?.title ?? item.id,
        onClick: () => onSelect(ProductComponentDependencyTargetType.Item, item.id),
      })),
    ),
  },
  {
    key: ProductComponentDependencyTargetType.Group,
    label: "Group",
    icon: CHART_NODE_ICONS[ProductComponentDependencyTargetType.Group],
    children: groups.map((g) => ({
      key: g.id,
      label: g.title,
      onClick: () => onSelect(ProductComponentDependencyTargetType.Group, g.id),
    })),
  },
  {
    key: ProductComponentDependencyTargetType.Configuration,
    label: "Components",
    icon: CHART_NODE_ICONS[ProductComponentDependencyTargetType.Configuration],
    onClick: () => onSelect(ProductComponentDependencyTargetType.Configuration, ""),
  },
];

/** Build 2-level structure for condition subject→operator */
const buildConditionLevels = (
  targetType: ProductComponentDependencyTargetType,
  onSelect: (
    subject: ProductComponentConditionSubject,
    operator: ProductComponentConditionOperator,
  ) => void,
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
  targetType: ProductComponentDependencyTargetType,
  onSelect: (actionType: ProductComponentDependencyActionType) => void,
): IMenuLevel[] => {
  const categories = CATEGORIES_BY_TARGET[targetType];
  return categories.map((cat) => ({
    key: cat,
    label: ACTION_CATEGORY_LABELS[cat],
    icon: CATEGORY_ICONS[cat],
    children: ACTIONS_BY_CATEGORY[cat].map((actionType) => ({
      key: `${cat}:${actionType}`,
      label: ACTION_PHRASE[actionType],
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
  const allConditions: ApiProductComponentCondition[] =
    rule?.conditionGroups.flatMap((g) => g.conditions) ?? [];

  // Collapsed view
  if (collapsed) {
    return (
      <Paper className={cx(styles.container, styles.containerCollapsed)}>
        <PaperHeader
          bordered={false}
          extra={
            <Button type="text" size="small" icon={<LeftOutlined />} onClick={toggleCollapsed} />
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
          icon={CHART_NODE_ICONS.rule}
          title="Rule Inspector"
          actions={
            <Button type="text" size="small" icon={<RightOutlined />} onClick={toggleCollapsed} />
          }
        />
        <div className={styles.content}>
          <Empty description="Select a rule to edit" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      </Paper>
    );
  }

  return (
    <Paper className={styles.container} data-testid="dependency-rule-inspector">
      <PaperHeader
        icon={<ThunderboltOutlined className={styles.titleIcon} />}
        title="Rule Inspector"
        actions={
          <Button type="text" size="small" icon={<RightOutlined />} onClick={toggleCollapsed} />
        }
      />

      <div className={styles.content}>
        {/* Basic Info */}
        <div className={styles.section}>
          <div className={styles.field}>
            <Typography.Text className={styles.fieldLabel}>Name</Typography.Text>
            <Input
              data-testid="dependency-rule-name-input"
              value={rule.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Rule name"
            />
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <div className={styles.field} style={{ flex: 1, marginBottom: 0 }}>
              <Typography.Text className={styles.fieldLabel}>Priority</Typography.Text>
              <InputNumber
                data-testid="dependency-rule-priority-input"
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
                  data-testid="dependency-rule-enabled-switch"
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
              WHEN{" "}
              <Tooltip title="Conditions that must be met for this rule to trigger. For example: an item is selected, or a group has a certain quantity.">
                <InfoCircleOutlined style={{ fontSize: 12, opacity: 0.45 }} />
              </Tooltip>
            </Typography.Text>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              data-testid="dependency-rule-add-condition-button"
              onClick={handleAddCondition}
            />
          </div>

          {allConditions.length === 0 ? (
            <div className={styles.emptyConditions}>
              <Typography.Text type="secondary">No conditions</Typography.Text>
            </div>
          ) : (
            allConditions.map((condition) => (
              <div
                key={condition.id}
                className={styles.conditionItem}
                data-testid="dependency-rule-condition"
              >
                {/* Row 1: Target chip (navigable dropdown) */}
                <div className={styles.conditionRow}>
                  <NavigableDropdown
                    testId="dependency-rule-condition-target-menu"
                    levels={buildTargetLevels(groups, (targetType, targetId) => {
                      const subjects = SUBJECTS_BY_TARGET[targetType];
                      const firstSubject = subjects[0];
                      const operators = firstSubject ? OPERATORS_BY_SUBJECT[firstSubject] : [];
                      const firstOperator = operators[0];
                      const subjectMeta = firstSubject
                        ? CONDITION_SUBJECT_META[firstSubject]
                        : null;
                      handleUpdateCondition(condition.id, {
                        targetType,
                        targetId,
                        subject: firstSubject,
                        operator: firstOperator,
                        category:
                          subjectMeta?.category ?? ProductComponentConditionCategory.StateCheck,
                      } as Partial<ApiProductComponentCondition>);
                    })}
                  >
                    <Button
                      className={styles.operatorChip}
                      data-testid="dependency-rule-condition-target-button"
                    >
                      <Tag
                        className={styles.chipOperator}
                        color={TARGET_TYPE_COLORS[condition.targetType]}
                      >
                        {CHART_NODE_ICONS[condition.targetType]}
                      </Tag>
                      <span className={styles.chipSubject}>
                        {getTargetLabel(condition.targetType, condition.targetId, groups)}
                      </span>
                    </Button>
                  </NavigableDropdown>
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteCondition(condition.id)}
                    className={styles.deleteButton}
                  />
                </div>

                {/* Row 2: Operator chip (navigable dropdown) + optional value */}
                <div className={styles.conditionRow}>
                  <NavigableDropdown
                    testId="dependency-rule-condition-operator-menu"
                    levels={buildConditionLevels(condition.targetType, (subject, operator) => {
                      const subjectMeta = CONDITION_SUBJECT_META[subject];
                      handleUpdateCondition(condition.id, {
                        subject,
                        operator,
                        category: subjectMeta.category,
                      } as Partial<ApiProductComponentCondition>);
                    })}
                  >
                    <Button
                      className={styles.operatorChip}
                      data-testid="dependency-rule-condition-operator-button"
                    >
                      {getConditionChipLabel(condition.subject, condition.operator)}
                    </Button>
                  </NavigableDropdown>
                  {conditionNeedsValue(condition) && (
                    <InputNumber
                      data-testid="dependency-rule-condition-value-input"
                      value={
                        condition.category === ProductComponentConditionCategory.Numeric
                          ? condition.value
                          : undefined
                      }
                      onChange={(value) =>
                        handleUpdateCondition(condition.id, {
                          value: value ?? 0,
                        })
                      }
                      min={0}
                      style={{ width: 72 }}
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
              THEN{" "}
              <Tooltip title="Actions that will be applied when all conditions above are met. For example: show or hide an item, set a price, or change quantity limits.">
                <InfoCircleOutlined style={{ fontSize: 12, opacity: 0.45 }} />
              </Tooltip>
            </Typography.Text>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              data-testid="dependency-rule-add-action-button"
              onClick={handleAddAction}
            />
          </div>

          {rule.actions.length === 0 ? (
            <div className={styles.emptyConditions}>
              <Typography.Text type="secondary">No actions</Typography.Text>
            </div>
          ) : (
            rule.actions.map((action) => (
              <div
                key={action.id}
                className={styles.actionItem}
                data-testid="dependency-rule-action"
              >
                {/* Row 1: Target chip (navigable dropdown) */}
                <div className={styles.conditionRow}>
                  <NavigableDropdown
                    testId="dependency-rule-action-target-menu"
                    levels={buildTargetLevels(groups, (targetType, targetId) => {
                      const categories = CATEGORIES_BY_TARGET[targetType];
                      const firstCategory = categories[0];
                      const actionsInCategory = ACTIONS_BY_CATEGORY[firstCategory];
                      const newActionType = actionsInCategory[0];
                      handleUpdateAction(action.id, {
                        targetType,
                        actionType: newActionType,
                        targetId:
                          targetType === ProductComponentDependencyTargetType.Configuration
                            ? ""
                            : targetId,
                      });
                    })}
                  >
                    <Button
                      className={styles.operatorChip}
                      data-testid="dependency-rule-action-target-button"
                    >
                      <Tag
                        className={styles.chipOperator}
                        color={TARGET_TYPE_COLORS[action.targetType]}
                      >
                        {CHART_NODE_ICONS[action.targetType]}
                      </Tag>
                      <span className={styles.chipSubject}>
                        {getTargetLabel(action.targetType, action.targetId, groups)}
                      </span>
                    </Button>
                  </NavigableDropdown>
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteAction(action.id)}
                    className={styles.deleteButton}
                  />
                </div>

                {/* Row 2: Action chip (navigable dropdown) */}
                <div className={styles.conditionRow}>
                  <NavigableDropdown
                    testId="dependency-rule-action-type-menu"
                    levels={buildActionLevels(action.targetType, (actionType) =>
                      handleUpdateAction(action.id, { actionType }),
                    )}
                  >
                    <Button
                      className={styles.operatorChip}
                      data-testid="dependency-rule-action-type-button"
                    >
                      {ACTION_PHRASE[action.actionType]}
                    </Button>
                  </NavigableDropdown>
                </div>

                {/* Price-specific fields */}
                {action.actionType === ProductComponentDependencyActionType.AdjustPrice && (
                  <div className={styles.conditionRow}>
                    <Select
                      data-testid="dependency-rule-price-type-select"
                      value={toEditorPriceRule(action.priceRule).priceType}
                      onChange={(value) =>
                        handleUpdateAction(action.id, {
                          priceRule: toApiPriceRule(
                            {
                              priceType: value,
                              priceValue: toEditorPriceRule(action.priceRule).priceValue,
                            },
                            action.priceRule?.id ?? `${action.id}-price-rule`,
                          ),
                        })
                      }
                      options={PRICE_TYPE_OPTIONS}
                      size="small"
                      style={{ flex: 1 }}
                      placeholder="Price type"
                    />
                    {toEditorPriceRule(action.priceRule).priceType &&
                      PRICE_RULE_OPTIONS.find(
                        (o) => o.value === toEditorPriceRule(action.priceRule).priceType,
                      )?.requiresValue && (
                        <InputNumber
                          data-testid="dependency-rule-price-value-input"
                          value={toEditorPriceRule(action.priceRule).priceValue ?? undefined}
                          onChange={(value) =>
                            handleUpdateAction(action.id, {
                              priceRule: toApiPriceRule(
                                {
                                  priceType: toEditorPriceRule(action.priceRule).priceType,
                                  priceValue: value,
                                },
                                action.priceRule?.id ?? `${action.id}-price-rule`,
                              ),
                            })
                          }
                          min={0}
                          size="small"
                          style={{ width: 80 }}
                          addonAfter={
                            PRICE_RULE_OPTIONS.find(
                              (o) => o.value === toEditorPriceRule(action.priceRule).priceType,
                            )?.valueSuffix
                          }
                        />
                      )}
                  </div>
                )}

                {/* Required field */}
                {action.actionType === ProductComponentDependencyActionType.SetRequired && (
                  <div className={styles.conditionRow}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Required:
                    </Typography.Text>
                    <Switch
                      checked={action.requiredValue ?? false}
                      onChange={(checked) =>
                        handleUpdateAction(action.id, {
                          requiredValue: checked,
                        })
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
