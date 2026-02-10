"use client";

import { useMemo, useCallback } from "react";
import { Typography, Button, Avatar, Dropdown, Table, Tag, Skeleton } from "antd";
import type { MenuProps } from "antd";
import { MoreOutlined, UserOutlined, UserAddOutlined } from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { ApiMember } from "@/graphql/types";
import { useStyles } from "../../organization-page.styles";
import { getInitials, getUserDisplayName, getRoleByName } from "../../utils";
import type { MembersSectionProps } from "../../types";

export function MembersSection({
  members,
  roles,
  loading = false,
  onInviteMember,
  onChangeRole,
  onRemoveMember,
}: MembersSectionProps) {
  const { styles } = useStyles();

  const getMemberActions = useCallback(
    (member: ApiMember): MenuProps["items"] => {
      const roleItems: MenuProps["items"] = roles
        .filter((role) => role.name !== member.role)
        .map((role) => ({
          key: role.id,
          label: role.displayName,
          onClick: () => onChangeRole(member.id, role.name),
        }));

      return [
        { key: "view", label: "View Profile" },
        { key: "role", label: "Change Role", children: roleItems },
        { type: "divider" },
        {
          key: "remove",
          label: "Remove from Team",
          danger: true,
          disabled: member.isOwner,
          onClick: () => onRemoveMember(member.id),
        },
      ];
    },
    [roles, onChangeRole, onRemoveMember]
  );

  const columns = useMemo(
    () => [
      {
        title: "Member",
        dataIndex: "user",
        key: "user",
        render: (_: unknown, record: ApiMember) => {
          const displayName = getUserDisplayName(record.user);
          return (
            <div className={styles.memberCell}>
              <Avatar src={record.user.avatar?.url} icon={<UserOutlined />}>
                {getInitials(displayName)}
              </Avatar>
              <div className={styles.memberInfo}>
                <Typography.Text className={styles.memberName}>
                  {displayName}
                </Typography.Text>
                <Typography.Text className={styles.memberEmail}>
                  {record.user.email}
                </Typography.Text>
              </div>
            </div>
          );
        },
      },
      {
        title: "Role",
        dataIndex: "role",
        key: "role",
        render: (_: unknown, record: ApiMember) => {
          const role = getRoleByName(roles, record.role);
          return (
            <Tag color={record.isOwner ? "gold" : "default"}>
              {role?.displayName || record.role}
            </Tag>
          );
        },
      },
      {
        title: "Actions",
        key: "actions",
        width: 80,
        render: (_: unknown, record: ApiMember) => (
          <Dropdown
            menu={{ items: getMemberActions(record) }}
            trigger={["click"]}
            disabled={record.isOwner}
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        ),
      },
    ],
    [styles, roles, getMemberActions]
  );

  if (loading) {
    return (
      <Paper>
        <PaperHeader title="Team Members" />
        <Skeleton active paragraph={{ rows: 3 }} />
      </Paper>
    );
  }

  return (
    <Paper>
      <PaperHeader
        title="Team Members"
        actions={
          <Dropdown
            menu={{
              items: [{ key: "add", label: "Add member", icon: <UserAddOutlined /> }],
              onClick: onInviteMember,
            }}
            trigger={["click"]}
          >
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        }
      />

      <Table
        columns={columns}
        dataSource={members}
        rowKey="id"
        pagination={false}
        locale={{ emptyText: "No members found" }}
      />

      <Typography.Text className={styles.footer}>
        {members.length} members
      </Typography.Text>
    </Paper>
  );
}
