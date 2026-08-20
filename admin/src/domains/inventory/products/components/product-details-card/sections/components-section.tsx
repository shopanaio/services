"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import { App, Button, Dropdown, Flex, Tabs, Typography } from "antd";
import {
  LuTrash2 as DeleteOutlined,
  LuPencil as EditOutlined,
  LuEllipsis as MoreOutlined,
  LuGitBranch as PartitionOutlined,
  LuPlus as PlusOutlined,
} from "react-icons/lu";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import type { ApiProductComponentConfiguration } from "@/graphql/types";
import { createStyles } from "antd-style";
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

interface IComponentsSectionProps {
  configurations: ApiProductComponentConfiguration[];
  activeConfigurationId: string;
  onConfigurationChange: (configurationId: string) => void;
  onCreateConfiguration: () => void;
  onEditConfiguration: (configurationId: string) => void;
  onDeleteConfiguration: (configurationId: string) => boolean | void | Promise<boolean | void>;
  onEditGroups: () => void;
  onEditTemplates: () => void;
  onOpenChart: () => void;
  onAddRule: () => void;
  onEditRule: (ruleId: string) => void;
}

export const ComponentsSection = ({
  configurations,
  activeConfigurationId,
  onConfigurationChange,
  onCreateConfiguration,
  onEditConfiguration,
  onDeleteConfiguration,
  onEditGroups,
  onEditTemplates,
  onOpenChart,
  onAddRule,
  onEditRule,
}: IComponentsSectionProps) => {
  const { modal } = App.useApp();
  const { styles } = useStyles();

  const handleDeleteConfiguration = (configuration: ApiProductComponentConfiguration) => {
    if (configurations.length <= 1) return;

    modal.confirm({
      title: `Delete ${configuration.name}?`,
      content: "This configuration will be removed from the components.",
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
      onCreateConfiguration();
      return;
    }

    if (typeof targetKey !== "string") return;

    const configuration = configurations.find((item) => item.id === targetKey);

    if (configuration) {
      handleDeleteConfiguration(configuration);
    }
  };

  const renderConfigurationMenu = (configuration: ApiProductComponentConfiguration) => (
    <span
      onClick={(event: MouseEvent<HTMLElement>) => event.stopPropagation()}
      onMouseDown={(event: MouseEvent<HTMLElement>) => event.stopPropagation()}
    >
      <Dropdown
        menu={{
          items: [
            {
              key: "edit",
              icon: <EditOutlined />,
              label: "Edit configuration",
            },
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

            if (key === "edit") onEditConfiguration(configuration.id);
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
    <Paper data-testid="product-components-section">
      <PaperHeader title="Components" />
      <Tabs
        data-testid="product-components-configurations-tabs"
        type="editable-card"
        addIcon={<PlusOutlined data-testid="product-components-add-configuration-button" />}
        size="middle"
        className={styles.tabs}
        activeKey={activeConfigurationId}
        onChange={onConfigurationChange}
        onEdit={handleEditConfigurations}
        items={configurations.map((configuration) => ({
          key: configuration.id,
          label: configuration.name,
          closable: true,
          closeIcon: renderConfigurationMenu(configuration),
          forceRender: true,
          children: (
            <Flex vertical gap={16}>
              <Flex vertical gap={10}>
                <Flex align="center" justify="space-between">
                  <Typography.Text strong>Groups</Typography.Text>
                  <EditAction
                    onEdit={onEditGroups}
                    label="Edit component items"
                    testId="product-components-groups-actions-button"
                  />
                </Flex>
                <GroupsSection groups={configuration.groups} onEdit={onEditGroups} />
              </Flex>

              <Flex vertical gap={10}>
                <Flex align="center" justify="space-between">
                  <Typography.Text strong>Pricing rules</Typography.Text>
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: "templates",
                          icon: <EditOutlined />,
                          label: "Edit Pricing Templates",
                          "data-testid": "product-components-pricing-templates-menu-item",
                        },
                        {
                          key: "add",
                          icon: <PlusOutlined />,
                          label: "Add Rule",
                          "data-testid": "product-components-add-rule-menu-item",
                        },
                        {
                          key: "chart",
                          icon: <PartitionOutlined />,
                          label: "Open Chart",
                          "data-testid": "product-components-open-chart-menu-item",
                          disabled: configuration.dependencyRules.length === 0,
                        },
                      ],
                      onClick: ({ key }) => {
                        if (key === "templates") onEditTemplates();
                        if (key === "add") onAddRule();
                        if (key === "chart") onOpenChart();
                      },
                    }}
                    trigger={["click"]}
                  >
                    <Button
                      size="small"
                      icon={<MoreOutlined />}
                      data-testid="product-components-pricing-actions-button"
                    />
                  </Dropdown>
                </Flex>
                <DependencyRulesSection
                  dependencyRules={configuration.dependencyRules}
                  groups={configuration.groups}
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
