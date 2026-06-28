"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import { App, Button, Dropdown, Flex, Tabs, Tag, Typography } from "antd";
import {
  DeleteOutlined,
  MoreOutlined,
  PartitionOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import type { IBundleConfiguration } from "@/domains/promos/bundles/types";
import type { BundleType } from "@/graphql/types";
import { createStyles } from "antd-style";
import { BUNDLE_TYPE_CONFIG } from "./groups-section/constants";
import { GroupsSection } from "./groups-section";
import { DependencyRulesSection } from "./dependency-rules-section";

const useStyles = createStyles(({ token }) => ({
  tabs: {
    ".ant-tabs-tab-remove": {
      padding: 0,
      marginLeft: 4,
      color: token.colorTextTertiary,
      lineHeight: 1,
    },
  },
  tabMenuIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 16,
    height: 16,
    lineHeight: 1,
  },
}));

interface IBundleSectionProps {
  configurations: IBundleConfiguration[];
  activeConfigurationId: string;
  bundleType?: BundleType | null;
  onConfigurationChange: (configurationId: string) => void;
  onCreateConfiguration: (sourceConfigurationId?: string) => void;
  onDeleteConfiguration: (configurationId: string) => void;
  onEditGroups: () => void;
  onOpenChart: () => void;
  onAddRule: () => void;
  onEditRule: (ruleId: string) => void;
}

export const BundleSection = ({
  configurations,
  activeConfigurationId,
  bundleType,
  onConfigurationChange,
  onCreateConfiguration,
  onDeleteConfiguration,
  onEditGroups,
  onOpenChart,
  onAddRule,
  onEditRule,
}: IBundleSectionProps) => {
  const { modal } = App.useApp();
  const { styles } = useStyles();

  const handleDeleteConfiguration = (
    configuration: IBundleConfiguration,
  ) => {
    if (configurations.length <= 1) return;

    modal.confirm({
      title: `Delete ${configuration.title}?`,
      content: "This configuration will be removed from the bundle.",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: () => onDeleteConfiguration(configuration.id),
    });
  };

  const handleEditConfigurations = (
    targetKey: MouseEvent | KeyboardEvent | string,
    action: "add" | "remove",
  ) => {
    if (action === "add") {
      onCreateConfiguration(activeConfigurationId);
      return;
    }

    if (typeof targetKey !== "string") return;

    const configuration = configurations.find(
      (item) => item.id === targetKey,
    );

    if (configuration) {
      handleDeleteConfiguration(configuration);
    }
  };

  const renderConfigurationMenu = (configuration: IBundleConfiguration) => (
    <span
      onClick={(event: MouseEvent<HTMLElement>) => event.stopPropagation()}
      onMouseDown={(event: MouseEvent<HTMLElement>) => event.stopPropagation()}
    >
      <Dropdown
        menu={{
          items: [
            {
              key: "delete",
              icon: <DeleteOutlined />,
              label: "Delete configuration",
              danger: true,
              disabled: configurations.length <= 1,
            },
          ],
          onClick: ({ key, domEvent }) => {
            domEvent.stopPropagation();

            if (key === "delete") handleDeleteConfiguration(configuration);
          },
        }}
        trigger={["click"]}
      >
        <span className={styles.tabMenuIcon}>
          <MoreOutlined />
        </span>
      </Dropdown>
    </span>
  );

  return (
    <Paper>
      <PaperHeader
        title="Bundle"
        extra={
          bundleType && BUNDLE_TYPE_CONFIG[bundleType] ? (
            <Tag color={BUNDLE_TYPE_CONFIG[bundleType].color}>
              {BUNDLE_TYPE_CONFIG[bundleType].label}
            </Tag>
          ) : undefined
        }
      />
      <Tabs
        type="editable-card"
        size="middle"
        className={styles.tabs}
        activeKey={activeConfigurationId}
        onChange={onConfigurationChange}
        onEdit={handleEditConfigurations}
        items={configurations.map((configuration) => ({
          key: configuration.id,
          label: configuration.title,
          closable: true,
          closeIcon: renderConfigurationMenu(configuration),
          forceRender: true,
          children: (
            <Flex vertical gap={16}>
              <Flex vertical gap={10}>
                <Flex align="center" justify="space-between">
                  <Typography.Text strong>Groups</Typography.Text>
                  <EditAction onEdit={onEditGroups} label="Edit bundle items" />
                </Flex>
                <GroupsSection
                  groups={configuration.bundleItems}
                  onEdit={onEditGroups}
                />
              </Flex>

              <Flex vertical gap={10}>
                <Flex align="center" justify="space-between">
                  <Typography.Text strong>Pricing rules</Typography.Text>
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
                          disabled: configuration.dependencyRules.length === 0,
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
                </Flex>
                <DependencyRulesSection
                  dependencyRules={configuration.dependencyRules}
                  groups={configuration.bundleItems}
                  onEditRule={onEditRule}
                />
              </Flex>
            </Flex>
          ),
        }))}
      />
    </Paper>
  );
};
