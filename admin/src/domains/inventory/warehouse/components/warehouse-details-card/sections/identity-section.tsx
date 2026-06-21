"use client";

import { Button, Descriptions, Dropdown, type MenuProps } from "antd";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { ApiWarehouse } from "@/graphql/types";
import { WarehouseDefaultTag } from "../../warehouse-default-tag";

interface IdentitySectionProps {
  warehouse: ApiWarehouse;
  onEditIdentity: () => void;
  onEditDefault: () => void;
  onDelete: () => void;
}

export function IdentitySection({
  warehouse,
  onEditIdentity,
  onEditDefault,
  onDelete,
}: IdentitySectionProps) {
  const items: MenuProps["items"] = [
    {
      key: "edit-identity",
      label: "Edit identity",
      icon: <EditOutlined />,
      onClick: onEditIdentity,
    },
    {
      key: "edit-default",
      label: warehouse.isDefault ? "Default settings" : "Set as default",
      icon: <CheckCircleOutlined />,
      onClick: onEditDefault,
    },
    {
      type: "divider",
    },
    {
      key: "delete",
      label: "Delete warehouse",
      icon: <DeleteOutlined />,
      danger: true,
      onClick: onDelete,
    },
  ];

  return (
    <Paper>
      <PaperHeader
        title="Identity"
        actions={
          <Dropdown menu={{ items }} trigger={["click"]}>
            <Button
              type="text"
              icon={<MoreOutlined />}
              data-testid="warehouse-identity-actions-button"
            />
          </Dropdown>
        }
      />
      <Descriptions size="small" column={1}>
        <Descriptions.Item label="Name">{warehouse.name}</Descriptions.Item>
        <Descriptions.Item label="Code">{warehouse.code}</Descriptions.Item>
        <Descriptions.Item label="Default warehouse">
          {warehouse.isDefault ? (
            <WarehouseDefaultTag isDefault />
          ) : (
            "No"
          )}
        </Descriptions.Item>
      </Descriptions>
    </Paper>
  );
}
