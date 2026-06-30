"use client";

import type { ReactNode } from "react";
import { Typography } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import { useEntityContentTabsStyles } from "./entity-content-tabs.styles";
import type { EntityContentTabsEmptyState } from "./types";

interface EntityDetailsEmptyStateProps {
  state: EntityContentTabsEmptyState;
  icon?: ReactNode;
}

export const EntityDetailsEmptyState = ({
  state,
  icon = <FileTextOutlined />,
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
    </div>
  );
};
