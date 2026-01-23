"use client";

import { Typography, Empty, Tag } from "antd";
import { createStyles } from "antd-style";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import type {
  IDependencyRule,
  IDependencyCondition,
  IDependencyAction,
} from "@/domains/inventory/products/modals/edit-components-modal/types";
import {
  CONDITION_TYPE_LABELS,
  ACTION_TYPE_LABELS,
  TARGET_TYPE_LABELS,
} from "@/domains/inventory/products/modals/edit-components-modal/types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  rules: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  ruleCard: {
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    overflow: "hidden",
    position: "relative" as const,
  },
  ruleStripe: {
    position: "absolute" as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  ruleStripeActive: {
    background: token.colorPrimary,
  },
  ruleStripeDisabled: {
    background: token.colorTextQuaternary,
  },
  ruleHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px 6px 16px",
  },
  ruleName: {
    fontSize: 13,
    fontWeight: 600,
  },
  rulePriority: {
    fontSize: 11,
    color: token.colorTextTertiary,
    fontFamily: "monospace",
  },
  ruleBody: {
    display: "flex",
    alignItems: "stretch",
    gap: 0,
    padding: "0 12px 10px 16px",
  },
  flowBlock: {
    flex: 1,
    padding: "8px 10px",
    borderRadius: 6,
    background: token.colorFillQuaternary,
  },
  flowLabel: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: token.colorTextTertiary,
    marginBottom: 6,
  },
  flowArrow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 8px",
    color: token.colorTextQuaternary,
    fontSize: 16,
    userSelect: "none" as const,
  },
  conditionRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 4,
    padding: "2px 0",
    fontSize: 12,
  },
  actionRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 4,
    padding: "2px 0",
    fontSize: 12,
  },
  actionLabel: {
    fontSize: 11,
    color: token.colorTextTertiary,
    fontStyle: "italic" as const,
    paddingLeft: 16,
  },
  targetTag: {
    "&&": {
      fontSize: 10,
      lineHeight: "16px",
      padding: "0 4px",
    },
  },
  disabledBadge: {
    "&&": {
      fontSize: 10,
    },
  },
  compactBody: {
    padding: "0 12px 8px 16px",
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  subtitle: {
    fontSize: 12,
    color: token.colorTextTertiary,
    marginBottom: 8,
  },
}));

// ============================================================================
// Helpers
// ============================================================================

const formatCondition = (cond: IDependencyCondition): string => {
  const label = CONDITION_TYPE_LABELS[cond.conditionType] ?? cond.conditionType;
  if (cond.value != null) return `${label} ${cond.value}`;
  return label;
};

const formatAction = (action: IDependencyAction): string => {
  const label = ACTION_TYPE_LABELS[action.actionType] ?? action.actionType;
  if (action.qtyValue != null) return `${label}: ${action.qtyValue}`;
  if (action.priceValue != null) return `${label}: ${action.priceValue}`;
  return label;
};

// ============================================================================
// Props
// ============================================================================

interface IDependencyRulesSectionProps {
  dependencyRules: IDependencyRule[];
  onEdit: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const DependencyRulesSection = ({
  dependencyRules,
  onEdit,
}: IDependencyRulesSectionProps) => {
  const { styles, cx } = useStyles();

  const activeCount = dependencyRules.filter((r) => r.enabled).length;
  const disabledCount = dependencyRules.length - activeCount;

  return (
    <Paper>
      <PaperHeader
        title="Dependency Rules"
        actions={<EditAction onEdit={onEdit} label="Edit rules" />}
      />
      {dependencyRules.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No dependency rules configured"
        />
      ) : (
        <>
          <div className={styles.subtitle}>
            {activeCount} active{disabledCount > 0 && ` · ${disabledCount} disabled`}
          </div>
          <div className={styles.rules}>
            {dependencyRules.map((rule) => (
              <div key={rule.id} className={styles.ruleCard}>
                <div
                  className={cx(
                    styles.ruleStripe,
                    rule.enabled ? styles.ruleStripeActive : styles.ruleStripeDisabled,
                  )}
                />
                <div className={styles.ruleHeader}>
                  <Typography.Text
                    className={styles.ruleName}
                    type={rule.enabled ? undefined : "secondary"}
                  >
                    {rule.name}
                    {!rule.enabled && (
                      <Tag className={styles.disabledBadge} style={{ marginLeft: 8 }}>
                        DISABLED
                      </Tag>
                    )}
                  </Typography.Text>
                  <span className={styles.rulePriority}>#{rule.priority}</span>
                </div>

                {rule.enabled ? (
                  <div className={styles.ruleBody}>
                    <div className={styles.flowBlock}>
                      <div className={styles.flowLabel}>When</div>
                      {rule.conditions.map((cond) => (
                        <div key={cond.id} className={styles.conditionRow}>
                          <Tag className={styles.targetTag} color="default">
                            {TARGET_TYPE_LABELS[cond.targetType]}
                          </Tag>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {formatCondition(cond)}
                          </Typography.Text>
                        </div>
                      ))}
                    </div>
                    <div className={styles.flowArrow}>→</div>
                    <div className={styles.flowBlock}>
                      <div className={styles.flowLabel}>Then</div>
                      {rule.actions.map((action) => (
                        <div key={action.id}>
                          <div className={styles.actionRow}>
                            <Tag className={styles.targetTag} color="default">
                              {TARGET_TYPE_LABELS[action.targetType]}
                            </Tag>
                            <Typography.Text style={{ fontSize: 12 }}>
                              {formatAction(action)}
                            </Typography.Text>
                          </div>
                          {action.label && (
                            <div className={styles.actionLabel}>
                              {action.label}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={styles.compactBody}>
                    {rule.conditions.length} conditions → {rule.actions.length} actions
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Paper>
  );
};
