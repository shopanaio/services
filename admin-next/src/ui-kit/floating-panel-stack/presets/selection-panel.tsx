"use client";

import { Flex, Button, Typography, Tooltip } from "antd";
import { CheckSquareOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import { PanelBase } from "../components";
import type { ActionConfig } from "../core";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token, css }) => ({
  label: css`
    color: ${token.colorText};
    font-weight: 500;
    white-space: nowrap;
  `,
  icon: css`
    font-size: 16px;
    color: ${token.colorPrimary};
  `,
  divider: css`
    width: 1px;
    height: 24px;
    background: ${token.colorBorderSecondary};
    margin: 0 ${token.marginXS}px;
  `,
  actionCount: css`
    margin-left: 4px;
    color: ${token.colorTextSecondary};
  `,
}));

// ============================================================================
// Component
// ============================================================================

export interface SelectionPanelProps {
  /** Number of selected items */
  count: number;
  /** Actions to display */
  actions: ActionConfig[];
  /** Label template (default: "{count} selected") */
  labelTemplate?: string;
  /** Panel width */
  width?: number | string;
  /** Custom class name */
  className?: string;
}

export function SelectionPanel({
  count,
  actions,
  labelTemplate = "{count} selected",
  width,
  className,
}: SelectionPanelProps) {
  const { styles } = useStyles();

  const label = labelTemplate.replace("{count}", String(count));

  return (
    <PanelBase width={width} className={className}>
      <Flex align="center" gap="small" style={{ flex: 1 }}>
        <CheckSquareOutlined className={styles.icon} />
        <Typography.Text className={styles.label}>{label}</Typography.Text>
      </Flex>

      <div className={styles.divider} />

      <Flex align="center" gap="small">
        {actions.map((action) => {
          const isDisabled =
            action.disabled || (action.count !== undefined && action.count === 0);

          const button = (
            <Button
              key={action.key}
              danger={action.danger}
              icon={action.icon}
              loading={action.loading}
              disabled={isDisabled}
              onClick={action.onClick}
              size="middle"
            >
              {action.label}
              {action.count !== undefined && action.count > 0 && (
                <span className={styles.actionCount}>({action.count})</span>
              )}
            </Button>
          );

          if (action.tooltip || action.count === 0) {
            return (
              <Tooltip
                key={action.key}
                title={action.tooltip || "No items match this action"}
              >
                {button}
              </Tooltip>
            );
          }

          return button;
        })}
      </Flex>
    </PanelBase>
  );
}
