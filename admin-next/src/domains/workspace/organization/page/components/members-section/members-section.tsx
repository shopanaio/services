"use client";

import { useState } from "react";
import { Typography, Button, Avatar, Dropdown, Input, Table, Tag } from "antd";
import type { MenuProps } from "antd";
import { MoreOutlined, SearchOutlined, UserOutlined, UserAddOutlined } from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { ApiMember } from "@/graphql/types";
import { mockMembers, mockRoles, getUserDisplayName, getRoleByName } from "../../../../mocks/data";
import { useStyles } from "../../organization-page.styles";
import { getInitials } from "../../utils";
import type { IMembersSectionProps } from "../../types";

export function MembersSection({ onInviteMember }: IMembersSectionProps) {
  const { styles } = useStyles();
  const [searchValue, setSearchValue] = useState("");

  const handleChangeRole = (_memberId: string, _roleId: string) => {
    // TODO: Implement role change
  };

  const handleRemoveMember = (_memberId: string) => {
    // TODO: Implement member removal
  };

  const getMemberActions = (member: ApiMember): MenuProps["items"] => {
    const roleItems: MenuProps["items"] = mockRoles
      .filter((role) => role.name !== member.role)
      .map((role) => ({
        key: role.id,
        label: role.displayName,
        onClick: () => handleChangeRole(member.id, role.id),
      }));

    return [
      { key: "view", label: "View Profile" },
      { key: "role", label: "Change Role", children: roleItems },
      { type: "divider" },
      {
        key: "remove",
        label: "Remove from Team",
        danger: true,
        onClick: () => handleRemoveMember(member.id),
      },
    ];
  };

  const columns = [
    {
      title: "Member",
      dataIndex: "user",
      key: "user",
      render: (_: unknown, record: ApiMember) => {
        const displayName = getUserDisplayName(record.user);
        return (
          <div className={styles.memberCell}>
            <Avatar src={record.user.avatar} icon={<UserOutlined />}>
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
        const role = getRoleByName(record.role);
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
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const filteredMembers = mockMembers.filter((member) => {
    const displayName = getUserDisplayName(member.user);
    return (
      displayName.toLowerCase().includes(searchValue.toLowerCase()) ||
      String(member.user.email).toLowerCase().includes(searchValue.toLowerCase())
    );
  });

  return (
    <Paper>
      <PaperHeader
        title="Team Members"
        actions={
          <Dropdown
            menu={{
              items: [{ key: "invite", label: "Invite member", icon: <UserAddOutlined /> }],
              onClick: onInviteMember,
            }}
            trigger={["click"]}
          >
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        }
      />
      <div className={styles.searchRow}>
        <Input
          placeholder="Search members..."
          prefix={<SearchOutlined />}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          style={{ maxWidth: 300 }}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredMembers}
        rowKey="id"
        pagination={false}
      />

      <Typography.Text className={styles.footer}>
        Showing {filteredMembers.length} of {mockMembers.length} members
      </Typography.Text>
    </Paper>
  );
}
