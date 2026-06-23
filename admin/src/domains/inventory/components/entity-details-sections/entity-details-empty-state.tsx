"use client";

import type { ReactNode } from "react";
import { Button, Typography } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import { useEntityContentTabsStyles } from "./entity-content-tabs.styles";
import type { EntityContentTabsEmptyState } from "./types";

interface EntityDetailsEmptyStateProps {
  state: EntityContentTabsEmptyState;
  icon?: ReactNode;
  onAction?: () => void;
}

export const EntityDetailsEmptyState = ({
  state,
  icon = <FileTextOutlined />,
  onAction,
}: EntityDetailsEmptyStateProps) => {
  const { styles } = useEntityContentTabsStyles();

  return (
    <div className={styles.richEmptyState}>
      <div className={styles.richEmptyIcon}>{icon}</div>
      <div className={styles.richEmptyContent}>
        <Typography.Title level={5} className={styles.richEmptyTitle}>
          {state.title}
        </Typography.Title>
        {state.description ? (
          <Typography.Text type="secondary" className={styles.richEmptyText}>
            {state.description}
          </Typography.Text>
        ) : null}
      </div>
      <Button
        type="primary"
        onClick={onAction}
        className={styles.richEmptyAction}
      >
        {state.actionLabel}
      </Button>
    </div>
  );
};
