"use client";

import { Typography, Button, Dropdown, Flex, Skeleton, Empty } from "antd";
import { MoreOutlined, PlusOutlined } from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { IRolesSectionProps } from "../../types";
import { RoleCard } from "../role-card";

export function RolesSection({
  roles,
  loading = false,
  onCreateRole,
  onEditRole,
  onDeleteRole,
}: IRolesSectionProps) {
  if (loading) {
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
        />
        <Skeleton active paragraph={{ rows: 2 }} />
      </Paper>
    );
  }

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
      {roles.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No roles defined"
        />
      ) : (
        roles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            onEdit={() => onEditRole(role)}
            onDelete={() => onDeleteRole(role.id)}
          />
        ))
      )}
    </Paper>
  );
}
