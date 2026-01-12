"use client";

import { Typography, Button, Dropdown, Flex } from "antd";
import { MoreOutlined, PlusOutlined } from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { mockRoles } from "../../../../mocks/data";
import type { IRolesSectionProps } from "../../types";
import { RoleCard } from "../role-card";

export function RolesSection({
  onCreateRole,
  onEditRole,
  onDeleteRole,
}: IRolesSectionProps) {
  return (
    <Paper>
      <PaperHeader
        title={
          <Flex vertical>
            <Typography.Text strong style={{ fontSize: 16 }}>
              Roles
            </Typography.Text>
            <Typography.Text type="secondary">
              Manage roles and their permissions
            </Typography.Text>
          </Flex>
        }
        actions={
          <Dropdown
            menu={{
              items: [
                { key: "create", label: "Create role", icon: <PlusOutlined /> },
              ],
              onClick: onCreateRole,
            }}
            trigger={["click"]}
          >
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        }
      />
      {mockRoles.map((role) => (
        <RoleCard
          key={role.id}
          role={role}
          onEdit={() => onEditRole(role)}
          onDelete={() => onDeleteRole(role.id)}
        />
      ))}
    </Paper>
  );
}
