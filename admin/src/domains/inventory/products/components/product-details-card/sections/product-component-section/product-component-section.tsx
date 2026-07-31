"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import { useMemo, useState } from "react";
import {
  App,
  Button,
  Dropdown,
  Empty,
  Flex,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import {
  LuEllipsis as MoreOutlined,
  LuPencil as EditOutlined,
  LuPlus as PlusOutlined,
  LuTrash2 as DeleteOutlined,
} from "react-icons/lu";
import type {
  ApiProduct,
  ApiProductComponentConfiguration,
} from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useProductComponentConfigurations } from "../../../../hooks";
import {
  useProductComponentConfigurationModal,
  useProductComponentPricingRulesModal,
} from "../../../../modals";
import { ProductComponentGroupsSection } from "./product-component-groups-section";
import { ProductComponentRulesSection } from "./product-component-rules-section";

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

export const ProductComponentSection = ({
  product,
}: {
  product: ApiProduct;
}) => {
  const { modal, message } = App.useApp();
  const { styles } = useStyles();
  const { push: openConfigurationModal } =
    useProductComponentConfigurationModal();
  const { push: openPricingRulesModal } =
    useProductComponentPricingRulesModal();
  const {
    createConfiguration,
    updateConfiguration,
    deleteConfiguration,
    loading,
  } = useProductComponentConfigurations();
  const configurations = useMemo(
    () => product.productComponent?.configurations ?? [],
    [product.productComponent?.configurations],
  );
  const [activeConfigurationId, setActiveConfigurationId] = useState(
    configurations[0]?.id ?? "",
  );
  const effectiveActiveConfigurationId = configurations.some(
    (configuration) => configuration.id === activeConfigurationId,
  )
    ? activeConfigurationId
    : configurations[0]?.id ?? "";

  const openCreateConfiguration = () => {
    openConfigurationModal({
      name: `Configuration ${configurations.length + 1}`,
      modalTitle: "New component configuration",
      submitLabel: "Create",
      onSave: async ({ name }) => {
        const result = await createConfiguration({
          productId: product.id,
          expectedRevision: product.revision,
          name,
        });

        if (result.userErrors.length > 0) {
          message.error(result.userErrors[0].message);
          return false;
        }

        if (result.configuration) {
          setActiveConfigurationId(result.configuration.id);
        }
        message.success("Component configuration created");
        return true;
      },
    });
  };

  const openEditConfiguration = (
    configuration: ApiProductComponentConfiguration,
  ) => {
    openConfigurationModal({
      name: configuration.name,
      modalTitle: "Edit component configuration",
      onSave: async ({ name }) => {
        const result = await updateConfiguration({
          id: configuration.id,
          expectedRevision: product.revision,
          name,
        });

        if (result.userErrors.length > 0) {
          message.error(result.userErrors[0].message);
          return false;
        }

        message.success("Component configuration updated");
        return true;
      },
    });
  };

  const confirmDeleteConfiguration = (
    configuration: ApiProductComponentConfiguration,
  ) => {
    if (configurations.length <= 1) return;

    modal.confirm({
      title: `Delete ${configuration.name}?`,
      content: "This configuration will be removed from the product component.",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        const result = await deleteConfiguration({
          id: configuration.id,
          expectedRevision: product.revision,
        });

        if (result.userErrors.length > 0) {
          message.error(result.userErrors[0].message);
          throw new Error(result.userErrors[0].message);
        }

        message.success("Component configuration deleted");
      },
    });
  };

  const handleEditTabs = (
    targetKey: MouseEvent | KeyboardEvent | string,
    action: "add" | "remove",
  ) => {
    if (action === "add") {
      openCreateConfiguration();
      return;
    }

    if (typeof targetKey !== "string") return;
    const configuration = configurations.find(
      (candidate) => candidate.id === targetKey,
    );
    if (configuration) confirmDeleteConfiguration(configuration);
  };

  const renderConfigurationMenu = (
    configuration: ApiProductComponentConfiguration,
  ) => (
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
            if (key === "edit") openEditConfiguration(configuration);
            if (key === "delete") confirmDeleteConfiguration(configuration);
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
        title="Components"
        extra={
          <Flex align="center" gap={8}>
            {product.productComponent ? (
              <Tag>{product.productComponent.displayStyle}</Tag>
            ) : null}
            {configurations.length === 0 ? (
              <Button
                size="small"
                icon={<PlusOutlined />}
                loading={loading}
                onClick={openCreateConfiguration}
              >
                Add configuration
              </Button>
            ) : null}
          </Flex>
        }
      />
      {configurations.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No product component configurations"
        />
      ) : (
        <Tabs
          type="editable-card"
          size="middle"
          className={styles.tabs}
          activeKey={effectiveActiveConfigurationId}
          onChange={setActiveConfigurationId}
          onEdit={handleEditTabs}
          hideAdd={loading}
          items={configurations.map((configuration) => ({
            key: configuration.id,
            label: configuration.name,
            closable: true,
            closeIcon: renderConfigurationMenu(configuration),
            children: (
              <Flex vertical gap={16}>
                {configuration.variants.length > 0 ? (
                  <Flex align="center" gap={8}>
                    <Typography.Text strong>Used by variants</Typography.Text>
                    {configuration.variants.map((variant) => (
                      <Tag key={variant.id}>{variant.title}</Tag>
                    ))}
                  </Flex>
                ) : null}
                <Flex vertical gap={10}>
                  <Typography.Text strong>Groups</Typography.Text>
                  <ProductComponentGroupsSection
                    groups={configuration.groups}
                  />
                </Flex>
                <Flex vertical gap={10}>
                  <Flex align="center" justify="space-between">
                    <Typography.Text strong>Pricing rules</Typography.Text>
                    <Button
                      size="small"
                      onClick={() =>
                        openPricingRulesModal({
                          configuration,
                          expectedRevision: product.revision,
                        })
                      }
                    >
                      Edit pricing rules
                    </Button>
                  </Flex>
                  <ProductComponentRulesSection
                    configuration={configuration}
                  />
                </Flex>
              </Flex>
            ),
          }))}
        />
      )}
    </Paper>
  );
};
