"use client";

import { Flex, Tabs } from "antd";
import { Paper } from "@/ui-kit/paper";
import { EntityDetailsEmptyState } from "./entity-details-empty-state";
import { useEntityContentTabsStyles } from "./entity-content-tabs.styles";
import type { EntityContentTabsProps } from "./types";

export const EntityContentTabs = ({
  descriptionHtml,
  excerptHtml,
  actions,
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
              <EntityDetailsEmptyState state={descriptionEmpty} />
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
              <EntityDetailsEmptyState state={excerptEmpty} />
            ),
          },
        ]}
      />
    </Paper>
  );
};
