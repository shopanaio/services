"use client";

import { App, Switch } from "antd";
import { createStyles } from "antd-style";
import type {
  ApiGenericUserError,
  ApiNotificationDefinition,
} from "@/graphql/types";
import {
  GroupedLinkItem,
  GroupedLinkItemDivider,
} from "@/ui-kit/grouped-link-item";
import { Paper } from "@/ui-kit/paper";
import type {
  NotificationItemConfig,
  NotificationSectionConfig,
} from "../constants";

type NotificationDefinitionSummary = Pick<
  ApiNotificationDefinition,
  | "key"
  | "enabled"
  | "version"
  | "allowedChannels"
  | "variables"
>;

const useStyles = createStyles(({ css, token }) => ({
  paper: css`
    padding: 0;
    overflow: hidden;
    border: 0;
    border-radius: ${token.borderRadiusLG}px;
    box-shadow:
      inset 0 0 0 1px ${token.colorBorderSecondary},
      0 2px 8px rgb(0 0 0 / 8%);
  `,
  header: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    height: 50,
    paddingInline: 16,
    color: token.colorText,
    fontSize: 14,
    fontWeight: token.fontWeightStrong,
    lineHeight: "22px",
  },
  itemDivider: {
    position: "relative",
    zIndex: 3,
    marginBottom: -1,
  },
}));

export interface NotificationSectionProps {
  section: NotificationSectionConfig;
  definitions: NotificationDefinitionSummary[];
  updatingKeys: ReadonlySet<string>;
  onOpen: (
    item: NotificationItemConfig,
    definition?: NotificationDefinitionSummary,
  ) => void;
  onToggle: (
    definition: NotificationDefinitionSummary,
    enabled: boolean,
  ) => Promise<{ userErrors: ApiGenericUserError[] }>;
}

export function NotificationSection({
  section,
  definitions,
  updatingKeys,
  onOpen,
  onToggle,
}: NotificationSectionProps) {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const definitionByKey = new Map(
    definitions.map((definition) => [definition.key, definition]),
  );

  const toggle = async (
    definition: NotificationDefinitionSummary,
    enabled: boolean,
  ) => {
    try {
      const result = await onToggle(definition, enabled);
      if (result.userErrors.length > 0) {
        message.error(
          result.userErrors.map(({ message: text }) => text).join("\n"),
        );
      }
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : "The notification setting could not be changed.",
      );
    }
  };

  return (
    <Paper className={styles.paper}>
      <div className={styles.header}>{section.title}</div>
      <GroupedLinkItemDivider />
      {section.items.map((item, index) => {
        const definition = definitionByKey.get(item.key);
        const updating = updatingKeys.has(item.key);

        return (
          <div key={item.key}>
            <GroupedLinkItem
              ariaLabel={`Open ${item.title}`}
              control={
                item.switchable ? (
                  <Switch
                    aria-label={`Enable ${item.title}`}
                    checked={definition?.enabled ?? false}
                    disabled={!definition || updating}
                    loading={updating}
                    onChange={(enabled) => {
                      if (definition) void toggle(definition, enabled);
                    }}
                    size="small"
                  />
                ) : undefined
              }
              description={item.description}
              onClick={() => onOpen(item, definition)}
              title={item.title}
            />
            {index < section.items.length - 1 ? (
              <GroupedLinkItemDivider className={styles.itemDivider} />
            ) : null}
          </div>
        );
      })}
    </Paper>
  );
}
