"use client";

import React, { useCallback, useMemo, useState } from "react";
import { createStyles } from "antd-style";
import {
  Typography,
  Table,
  Button,
  Input,
  InputNumber,
  Switch,
  Popconfirm,
  Space,
  Tooltip,
  Empty,
  Tag,
  Dropdown,
} from "antd";
import type { MenuProps } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  CopyOutlined,
  MoreOutlined,
  PartitionOutlined,
  WarningOutlined,
  StopOutlined,
  HolderOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type {
  IDependencyRule,
  IDependencyCondition,
  IDependencyAction,
  IComponentGroup,
} from "../types";
import {
  DependencyConditionType,
  DependencyActionType,
  DependencyTargetType,
  CONDITION_TYPE_LABELS,
  ACTION_TYPE_LABELS,
  PRICE_RULE_OPTIONS,
} from "../types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  headerButtons: {
    display: "flex",
    gap: 8,
  },
  tableActions: {
    display: "flex",
    gap: 4,
  },
  editInput: {
    width: "100%",
  },
  summaryText: {
    fontFamily: "monospace",
    fontSize: 12,
  },
  priorityTag: {
    fontFamily: "monospace",
    minWidth: 40,
    textAlign: "center",
  },
  statusIcon: {
    cursor: "help",
  },
  emptyState: {
    padding: "24px 0",
  },
  disabledRow: {
    opacity: 0.5,
  },
  dragHandle: {
    cursor: "grab",
    color: token.colorTextSecondary,
    "&:hover": {
      color: token.colorText,
    },
    "&:active": {
      cursor: "grabbing",
    },
  },
  draggingRow: {
    background: token.colorBgContainer,
    boxShadow: token.boxShadow,
    zIndex: 1000,
  },
}));

// ============================================================================
// Sortable Row Component
// ============================================================================

interface SortableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  "data-row-key": string;
}

const SortableRow = ({ "data-row-key": id, ...props }: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { position: "relative", zIndex: 9999 } : {}),
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...props}
      {...attributes}
    >
      {/* Inject listeners into the first cell (drag handle) via context */}
      {React.Children.map(props.children, (child, index) => {
        if (index === 0 && React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            ...listeners,
          });
        }
        return child;
      })}
    </tr>
  );
};

// ============================================================================
// Types
// ============================================================================

interface IDependencyRulesTableProps {
  rules: IDependencyRule[];
  onRulesChange: (rules: IDependencyRule[]) => void;
  groups: IComponentGroup[];
  onOpenChart: () => void;
  onEditRule?: (ruleId: string) => void;
}

interface IEditingRule extends IDependencyRule {
  isNew?: boolean;
}

interface RuleStatus {
  type: "ok" | "warning" | "error";
  icon: React.ReactNode;
  tooltip: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

const getItemName = (
  itemId: string,
  groups: IComponentGroup[]
): string | null => {
  for (const group of groups) {
    const item = group.items.find((i) => i.id === itemId);
    if (item) {
      return item.title ?? item.assignedProduct?.title ?? item.assignedVariant?.title ?? itemId;
    }
  }
  return null;
};

const getGroupName = (
  groupId: string,
  groups: IComponentGroup[]
): string | null => {
  const group = groups.find((g) => g.id === groupId);
  return group?.title ?? null;
};

const getTargetName = (
  targetType: DependencyTargetType,
  targetId: string | undefined,
  groups: IComponentGroup[]
): string => {
  if (targetType === DependencyTargetType.BUNDLE) {
    return "Bundle";
  }
  if (!targetId) return "?";

  if (targetType === DependencyTargetType.ITEM) {
    return getItemName(targetId, groups) ?? targetId;
  }
  if (targetType === DependencyTargetType.GROUP) {
    return getGroupName(targetId, groups) ?? targetId;
  }
  return targetId;
};

const formatCondition = (
  condition: IDependencyCondition,
  groups: IComponentGroup[]
): string => {
  const targetName = getTargetName(
    condition.targetType,
    condition.targetId,
    groups
  );
  const conditionLabel = CONDITION_TYPE_LABELS[condition.conditionType];

  if (condition.value !== undefined) {
    return `${targetName} ${conditionLabel} ${condition.value}`;
  }
  return `${targetName} ${conditionLabel}`;
};

const formatAction = (
  action: IDependencyAction,
  groups: IComponentGroup[]
): string => {
  const targetName = getTargetName(action.targetType, action.targetId, groups);
  const actionLabel = ACTION_TYPE_LABELS[action.actionType];

  if (action.actionType === DependencyActionType.SET_QTY && action.qtyValue !== undefined) {
    return `${actionLabel} ${targetName} to ${action.qtyValue}`;
  }

  if (
    (action.actionType === DependencyActionType.OVERRIDE_PRICE ||
      action.actionType === DependencyActionType.ADJUST_PRICE) &&
    action.priceType
  ) {
    const priceOption = PRICE_RULE_OPTIONS.find((o) => o.value === action.priceType);
    const priceLabel = priceOption?.label ?? action.priceType;
    const value = action.priceValue !== null && action.priceValue !== undefined
      ? `${action.priceValue}${priceOption?.valueSuffix ?? ""}`
      : "";
    return `${actionLabel} ${targetName}: ${priceLabel} ${value}`.trim();
  }

  return `${actionLabel} ${targetName}`;
};

const formatRuleSummary = (
  rule: IDependencyRule,
  groups: IComponentGroup[]
): string => {
  const whenPart = rule.conditions
    .map((c) => formatCondition(c, groups))
    .join(" + ");

  const thenPart = rule.actions
    .map((a) => formatAction(a, groups))
    .join(", ");

  if (!whenPart && !thenPart) return "No conditions or actions";
  if (!whenPart) return `→ ${thenPart}`;
  if (!thenPart) return `${whenPart} → ?`;

  return `${whenPart} → ${thenPart}`;
};

const getRuleStatus = (
  rule: IDependencyRule,
  groups: IComponentGroup[]
): RuleStatus => {
  // Error: rule is broken
  if (rule.conditions.length === 0) {
    return {
      type: "error",
      icon: <StopOutlined style={{ color: "var(--ant-color-error)" }} />,
      tooltip: "No conditions defined",
    };
  }
  if (rule.actions.length === 0) {
    return {
      type: "error",
      icon: <StopOutlined style={{ color: "var(--ant-color-error)" }} />,
      tooltip: "No actions defined",
    };
  }

  // Warning: potential issues
  const allItemIds = groups.flatMap((g) => g.items.map((i) => i.id));
  const allGroupIds = groups.map((g) => g.id);

  const missingConditionTarget = rule.conditions.find((c) => {
    if (c.targetType === DependencyTargetType.ITEM) {
      return !allItemIds.includes(c.targetId);
    }
    if (c.targetType === DependencyTargetType.GROUP) {
      return !allGroupIds.includes(c.targetId);
    }
    return false;
  });

  if (missingConditionTarget) {
    return {
      type: "warning",
      icon: <WarningOutlined style={{ color: "var(--ant-color-warning)" }} />,
      tooltip: "References deleted item/group in condition",
    };
  }

  const missingActionTarget = rule.actions.find((a) => {
    if (a.targetType === DependencyTargetType.ITEM && a.targetId) {
      return !allItemIds.includes(a.targetId);
    }
    if (a.targetType === DependencyTargetType.GROUP && a.targetId) {
      return !allGroupIds.includes(a.targetId);
    }
    return false;
  });

  if (missingActionTarget) {
    return {
      type: "warning",
      icon: <WarningOutlined style={{ color: "var(--ant-color-warning)" }} />,
      tooltip: "References deleted item/group in action",
    };
  }

  return { type: "ok", icon: null, tooltip: "" };
};

// ============================================================================
// Component
// ============================================================================

export const DependencyRulesTable = ({
  rules,
  onRulesChange,
  groups,
  onOpenChart,
  onEditRule,
}: IDependencyRulesTableProps) => {
  const { styles, cx } = useStyles();

  // ========================================
  // Editing State
  // ========================================
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<IEditingRule | null>(null);

  // ========================================
  // Handlers
  // ========================================
  const handleAddRule = useCallback(() => {
    const maxPriority = Math.max(0, ...rules.map((r) => r.priority));
    const newRule: IEditingRule = {
      id: `rule-${Date.now()}`,
      name: "",
      enabled: true,
      priority: maxPriority + 100,
      conditions: [],
      actions: [],
      isNew: true,
    };
    setEditingRuleId(newRule.id);
    setEditingRule(newRule);
  }, [rules]);

  const handleEditRuleName = useCallback((rule: IDependencyRule) => {
    setEditingRuleId(rule.id);
    setEditingRule({ ...rule });
  }, []);

  const handleSaveRule = useCallback(() => {
    if (!editingRule || !editingRule.name.trim()) return;

    const { isNew, ...ruleData } = editingRule;

    if (isNew) {
      onRulesChange([...rules, ruleData]);
    } else {
      onRulesChange(
        rules.map((r) => (r.id === ruleData.id ? ruleData : r))
      );
    }

    setEditingRuleId(null);
    setEditingRule(null);
  }, [editingRule, rules, onRulesChange]);

  const handleCancelEdit = useCallback(() => {
    setEditingRuleId(null);
    setEditingRule(null);
  }, []);

  const handleDeleteRule = useCallback(
    (id: string) => {
      onRulesChange(rules.filter((r) => r.id !== id));
    },
    [rules, onRulesChange]
  );

  const handleDuplicateRule = useCallback(
    (rule: IDependencyRule) => {
      const newRule: IDependencyRule = {
        ...rule,
        id: `rule-${Date.now()}`,
        name: `${rule.name} (copy)`,
        priority: rule.priority - 1,
        conditions: rule.conditions.map((c) => ({
          ...c,
          id: `cond-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        })),
        actions: rule.actions.map((a) => ({
          ...a,
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        })),
      };
      onRulesChange([...rules, newRule]);
    },
    [rules, onRulesChange]
  );

  const handleToggleEnabled = useCallback(
    (id: string, enabled: boolean) => {
      onRulesChange(
        rules.map((r) => (r.id === id ? { ...r, enabled } : r))
      );
    },
    [rules, onRulesChange]
  );

  const handlePriorityChange = useCallback(
    (id: string, priority: number) => {
      onRulesChange(
        rules.map((r) => (r.id === id ? { ...r, priority } : r))
      );
    },
    [rules, onRulesChange]
  );

  // ========================================
  // Dropdown menu for actions
  // ========================================
  const getActionMenuItems = useCallback(
    (record: IDependencyRule): MenuProps["items"] => [
      {
        key: "edit",
        icon: <EditOutlined />,
        label: "Edit in Chart",
        onClick: () => onEditRule?.(record.id),
      },
      {
        key: "duplicate",
        icon: <CopyOutlined />,
        label: "Duplicate",
        onClick: () => handleDuplicateRule(record),
      },
      { type: "divider" },
      {
        key: "delete",
        icon: <DeleteOutlined />,
        label: "Delete",
        danger: true,
        onClick: () => handleDeleteRule(record.id),
      },
    ],
    [handleDuplicateRule, handleDeleteRule, onEditRule]
  );

  // ========================================
  // Drag and Drop
  // ========================================
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = rules.findIndex((r) => r.id === active.id);
        const newIndex = rules.findIndex((r) => r.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          // Reorder rules and recalculate priorities
          const newRules = arrayMove([...rules], oldIndex, newIndex);

          // Update priorities based on new position (higher position = higher priority)
          const maxPriority = Math.max(...newRules.map((r) => r.priority), 0);
          const updatedRules = newRules.map((rule, index) => ({
            ...rule,
            priority: maxPriority - index * 10,
          }));

          onRulesChange(updatedRules);
        }
      }
    },
    [rules, onRulesChange]
  );

  // ========================================
  // Table Columns
  // ========================================
  const columns: ColumnsType<IDependencyRule> = useMemo(
    () => [
      {
        title: "",
        key: "drag",
        width: 32,
        render: () => (
          <HolderOutlined className={styles.dragHandle} />
        ),
      },
      {
        title: "On",
        dataIndex: "enabled",
        key: "enabled",
        width: 50,
        render: (_, record) => (
          <Switch
            size="small"
            checked={record.enabled}
            onChange={(checked) => handleToggleEnabled(record.id, checked)}
          />
        ),
      },
      {
        title: "Prio",
        dataIndex: "priority",
        key: "priority",
        width: 70,
        sorter: (a, b) => b.priority - a.priority,
        render: (_, record) => {
          if (editingRuleId === record.id && editingRule) {
            return (
              <InputNumber
                value={editingRule.priority}
                onChange={(value) =>
                  setEditingRule({ ...editingRule, priority: value ?? 0 })
                }
                min={0}
                size="small"
                style={{ width: 60 }}
              />
            );
          }
          return (
            <InputNumber
              value={record.priority}
              onChange={(value) => handlePriorityChange(record.id, value ?? 0)}
              min={0}
              size="small"
              variant="borderless"
              style={{ width: 60 }}
            />
          );
        },
      },
      {
        title: "Name",
        dataIndex: "name",
        key: "name",
        width: 180,
        render: (_, record) => {
          if (editingRuleId === record.id && editingRule) {
            return (
              <Input
                value={editingRule.name}
                onChange={(e) =>
                  setEditingRule({ ...editingRule, name: e.target.value })
                }
                placeholder="Rule name"
                className={styles.editInput}
                autoFocus
                onPressEnter={handleSaveRule}
              />
            );
          }
          return (
            <Typography.Text
              strong
              style={{ cursor: "pointer" }}
              onClick={() => handleEditRuleName(record)}
            >
              {record.name || <Typography.Text type="secondary">Unnamed</Typography.Text>}
            </Typography.Text>
          );
        },
      },
      {
        title: "WHEN → THEN",
        key: "summary",
        ellipsis: true,
        render: (_, record) => (
          <Typography.Text
            className={styles.summaryText}
            type={record.enabled ? undefined : "secondary"}
          >
            {formatRuleSummary(record, groups)}
          </Typography.Text>
        ),
      },
      {
        title: "",
        key: "status",
        width: 40,
        render: (_, record) => {
          const status = getRuleStatus(record, groups);
          if (status.icon) {
            return (
              <Tooltip title={status.tooltip}>
                <span className={styles.statusIcon}>{status.icon}</span>
              </Tooltip>
            );
          }
          return null;
        },
      },
      {
        title: "",
        key: "actions",
        width: 90,
        render: (_, record) => {
          if (editingRuleId === record.id) {
            return (
              <Space className={styles.tableActions}>
                <Button
                  type="text"
                  size="small"
                  icon={<SaveOutlined />}
                  onClick={handleSaveRule}
                  disabled={!editingRule?.name.trim()}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={handleCancelEdit}
                />
              </Space>
            );
          }
          return (
            <Space className={styles.tableActions}>
              <Tooltip title="Edit in Chart">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onEditRule?.(record.id)}
                />
              </Tooltip>
              <Dropdown
                menu={{ items: getActionMenuItems(record) }}
                trigger={["click"]}
              >
                <Button type="text" size="small" icon={<MoreOutlined />} />
              </Dropdown>
            </Space>
          );
        },
      },
    ],
    [
      editingRuleId,
      editingRule,
      styles,
      groups,
      handleToggleEnabled,
      handlePriorityChange,
      handleEditRuleName,
      handleSaveRule,
      handleCancelEdit,
      getActionMenuItems,
      onEditRule,
    ]
  );

  // ========================================
  // Data Source
  // ========================================
  const dataSource = useMemo(() => {
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);
    if (editingRule?.isNew) {
      return [editingRule, ...sortedRules];
    }
    return sortedRules;
  }, [rules, editingRule]);

  return (
    <div>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <Typography.Text strong>Dependency Rules</Typography.Text>
          <Tooltip title="Define conditional rules for component behavior">
            <Tag color="blue">{rules.length}</Tag>
          </Tooltip>
        </div>
        <div className={styles.headerButtons}>
          <Button
            icon={<PartitionOutlined />}
            onClick={onOpenChart}
            size="small"
          >
            Open Chart
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={handleAddRule}
            disabled={editingRuleId !== null}
            size="small"
          >
            Add Rule
          </Button>
        </div>
      </div>

      {dataSource.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={dataSource.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <Table
              dataSource={dataSource}
              columns={columns}
              rowKey="id"
              pagination={false}
              size="small"
              rowClassName={(record) =>
                !record.enabled ? styles.disabledRow : ""
              }
              components={{
                body: {
                  row: SortableRow,
                },
              }}
            />
          </SortableContext>
        </DndContext>
      ) : (
        <Empty
          className={styles.emptyState}
          description="No dependency rules configured"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </div>
  );
};

export default DependencyRulesTable;
