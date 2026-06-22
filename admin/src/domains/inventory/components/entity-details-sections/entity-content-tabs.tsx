"use client";

import { Button, Flex, Tabs, Typography } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import { Paper } from "@/ui-kit/paper";
import { useEntityContentTabsStyles } from "./entity-content-tabs.styles";
import type { EntityContentTabsEmptyState, EntityContentTabsProps } from "./types";

interface EmptyStateProps {
  state: EntityContentTabsEmptyState;
  onEdit?: () => void;
}

const EntityContentEmptyState = ({
  state,
  onEdit,
}: EmptyStateProps) => {
  const { styles } = useEntityContentTabsStyles();

  return (
    <div className={styles.richEmptyState}>
      <div className={styles.richEmptyIcon}>
        <FileTextOutlined />
      </div>
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
      <Button type="primary" onClick={onEdit} className={styles.richEmptyAction}>
        {state.actionLabel}
      </Button>
    </div>
  );
};

export const EntityContentTabs = ({
  descriptionHtml,
  excerptHtml,
  actions,
  onEdit,
  sectionTestId,
  descriptionTestId,
  excerptTestId,
  descriptionEmpty,
  excerptEmpty,
}: EntityContentTabsProps) => {
  const { styles } = useEntityContentTabsStyles();

  return (
    <Paper className={styles.tabsSection} data-testid={sectionTestId}>
      <Tabs
        type="card"
        size="middle"
        tabBarExtraContent={actions}
        items={[
          {
            key: "description",
            label: "Description",
            forceRender: true,
            children: descriptionHtml ? (
              <div
                className={styles.renderedContent}
                data-testid={descriptionTestId}
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            ) : (
              <EntityContentEmptyState
                state={descriptionEmpty}
                onEdit={onEdit}
              />
            ),
          },
          {
            key: "excerpt",
            label: "Excerpt",
            forceRender: true,
            children: excerptHtml ? (
              <div
                className={styles.renderedContent}
                data-testid={excerptTestId}
                dangerouslySetInnerHTML={{ __html: excerptHtml }}
              />
            ) : (
              <EntityContentEmptyState
                state={excerptEmpty}
                onEdit={onEdit}
              />
            ),
          },
        ]}
      />
    </Paper>
  );
};
