"use client";

import { Typography, Empty, Tag, Dropdown, Button } from "antd";
import {
  PartitionOutlined,
  PlusOutlined,
  MoreOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { createStyles } from "antd-style";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { IBundleGroup } from "@/domains/promos/bundles/types";
import type { IDependencyRule } from "@/domains/promos/bundles/dependency-rules";
import {
  resolveTargetName,
  formatCondition,
  formatAction,
  TARGET_TYPE_COLORS,
  CHART_NODE_ICONS,
} from "@/domains/promos/bundles/dependency-rules";

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
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    padding: "8px 12px",
    cursor: "pointer",
    transition: "border-color 0.2s",
    "&:hover": {
      borderColor: token.colorBorder,
    },
  },
  ruleHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "4px 0 4px 0",
  },
  ruleName: {
    fontSize: token.fontSize,
    fontWeight: 600,
  },
  rulePriority: {
    fontSize: token.fontSizeSM,
    color: token.colorTextTertiary,
    fontFamily: "monospace",
  },
  ruleBody: {
    display: "flex",
    alignItems: "stretch",
    gap: 0,
    paddingBottom: 4,
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
    pointerEvents: "none",
  },
  flowRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 4,
    padding: "2px 0",
    fontSize: 12,
  },
  targetTag: {
    "&&": {
      fontSize: 10,
      lineHeight: "16px",
      padding: "0 4px",
    },
  },
  targetName: {
    fontSize: 12,
    fontWeight: 500,
  },
  disabledBadge: {
    "&&": {
      fontSize: 10,
    },
  },
  compactBody: {
    paddingBottom: 4,
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
// FlowBlock
// ============================================================================

interface IFlowBlockItem {
  key: string;
  targetType: string;
  name: string | null;
  description: string;
}

const FlowBlock = ({
  label,
  items,
  styles,
}: {
  label: string;
  items: IFlowBlockItem[];
  styles: ReturnType<typeof useStyles>["styles"];
}) => (
  <div className={styles.flowBlock}>
    <div className={styles.flowLabel}>{label}</div>
    {items.map((item) => (
      <div key={item.key} className={styles.flowRow}>
        <Tag
          variant="outlined"
          className={styles.targetTag}
          color={TARGET_TYPE_COLORS[item.targetType]}
        >
          {CHART_NODE_ICONS[item.targetType]}
        </Tag>
        {item.name && (
          <Typography.Text className={styles.targetName}>
            {item.name}
          </Typography.Text>
        )}
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {item.description}
        </Typography.Text>
      </div>
    ))}
  </div>
);

// ============================================================================
// Props
// ============================================================================

interface IDependencyRulesSectionProps {
  dependencyRules: IDependencyRule[];
  groups: IBundleGroup[];
  onOpenChart: () => void;
  onAddRule: () => void;
  onEditRule: (ruleId: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export const DependencyRulesSection = ({
  dependencyRules,
  groups,
  onOpenChart,
  onAddRule,
  onEditRule,
}: IDependencyRulesSectionProps) => {
  const { styles, theme } = useStyles();

  const activeCount = dependencyRules.filter((r) => r.enabled).length;
  const disabledCount = dependencyRules.length - activeCount;

  return (
    <Paper>
      <PaperHeader
        title="Pricing Rules"
        actions={
          <Dropdown
            menu={{
              items: [
                {
                  key: "add",
                  icon: <PlusOutlined />,
                  label: "Add Rule",
                },
                {
                  key: "chart",
                  icon: <PartitionOutlined />,
                  label: "Open Chart",
                  disabled: dependencyRules.length === 0,
                },
              ],
              onClick: ({ key }) => {
                if (key === "add") onAddRule();
                if (key === "chart") onOpenChart();
              },
            }}
            trigger={["click"]}
          >
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        }
      />
      {dependencyRules.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No dependency rules configured"
        />
      ) : (
        <>
          <div className={styles.subtitle}>
            {activeCount} active
            {disabledCount > 0 && ` · ${disabledCount} disabled`}
          </div>
          <div className={styles.rules}>
            {dependencyRules.map((rule) => (
              <div
                key={rule.id}
                className={styles.ruleCard}
                onClick={() => onEditRule(rule.id)}
              >
                <div className={styles.ruleHeader}>
                  <Typography.Text
                    className={styles.ruleName}
                    type={rule.enabled ? undefined : "secondary"}
                  >
                    {rule.name}
                    {!rule.enabled && (
                      <Tag
                        className={styles.disabledBadge}
                        style={{ marginLeft: 8 }}
                      >
                        DISABLED
                      </Tag>
                    )}
                  </Typography.Text>
                  <span className={styles.rulePriority}>#{rule.priority}</span>
                </div>

                {rule.enabled ? (
                  <div className={styles.ruleBody}>
                    <FlowBlock
                      label="When"
                      styles={styles}
                      items={rule.conditionGroups
                        .flatMap((g) => g.conditions)
                        .map((cond) => ({
                          key: cond.id,
                          targetType: cond.targetType,
                          name: resolveTargetName(
                            cond.targetType,
                            cond.targetId,
                            groups,
                          ),
                          description: formatCondition(cond),
                        }))}
                    />
                    <div className={styles.flowArrow}>
                      <Button
                        size="small"
                        type="text"
                        icon={
                          <RightOutlined style={{ color: theme.colorIcon }} />
                        }
                      />
                    </div>
                    <FlowBlock
                      label="Then"
                      styles={styles}
                      items={rule.actions.map((action) => ({
                        key: action.id,
                        targetType: action.targetType,
                        name: resolveTargetName(
                          action.targetType,
                          action.targetId,
                          groups,
                        ),
                        description: formatAction(action),
                      }))}
                    />
                  </div>
                ) : (
                  <div className={styles.compactBody}>
                    {rule.conditionGroups.reduce(
                      (sum, g) => sum + g.conditions.length,
                      0,
                    )}{" "}
                    conditions → {rule.actions.length} actions
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
