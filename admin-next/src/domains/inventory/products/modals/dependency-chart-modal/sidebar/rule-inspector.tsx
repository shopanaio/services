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

import type { IDependencyRule, IBundleGroup } from "../../edit-components-modal/types";
import {
  DependencyConditionType,
  DependencyActionType,
  DependencyTargetType,
  CONDITION_TYPES_BY_TARGET,
  ACTION_TYPES_BY_TARGET,
  PRICE_RULE_OPTIONS,
} from "../../edit-components-modal/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";

import { useStyles } from "./rule-inspector.styles";
import {
  useRuleInspector,
  getTargetOptions,
  getConditionTypeOptions,
  getActionTypeOptions,
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
                      const validTypes =
                        CONDITION_TYPES_BY_TARGET[value as DependencyTargetType];
                      const newConditionType = validTypes.includes(condition.conditionType)
                        ? condition.conditionType
                        : validTypes[0];
                      handleUpdateCondition(condition.id, {
                        targetType: value,
                        conditionType: newConditionType,
                        targetId:
                          value === DependencyTargetType.ITEM
                            ? (groups[0]?.items[0]?.id ?? "")
                            : (groups[0]?.id ?? ""),
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
                      const validTypes =
                        ACTION_TYPES_BY_TARGET[value as DependencyTargetType];
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
              </div>
            ))
          )}
        </div>
      </div>
    </Paper>
  );
};
