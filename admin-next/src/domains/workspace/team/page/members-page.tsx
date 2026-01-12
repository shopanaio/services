"use client";

import { useState } from "react";
import {
  Typography,
  Button,
  Table,
  Avatar,
  Tag,
  Dropdown,
  Input,
  message,
} from "antd";
import type { MenuProps } from "antd";
import { createStyles } from "antd-style";
import {
  PlusOutlined,
  SearchOutlined,
  MoreOutlined,
  UserOutlined,
  MailOutlined,
} from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { ApiMember } from "@/graphql/types";
import {
  mockMembers,
  mockInvitations,
  mockRoles,
  getUserDisplayName,
  getRoleByName,
} from "../../mocks/data";
import type { IInvitation } from "../../mocks/data";
import { useInviteMemberModal } from "../../modals";

const useStyles = createStyles(({ token }) => ({
  container: {
    maxWidth: 1000,
    margin: "0 auto",
    padding: token.paddingLG,
    display: "flex",
    flexDirection: "column",
    gap: token.marginLG,
  },
  searchRow: {
    marginBottom: token.marginMD,
  },
  memberCell: {
    display: "flex",
    alignItems: "center",
    gap: token.marginSM,
  },
  memberInfo: {
    display: "flex",
    flexDirection: "column",
  },
  memberName: {
    fontWeight: 500,
  },
  memberEmail: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  invitationItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: token.padding,
    backgroundColor: token.colorBgLayout,
    borderRadius: token.borderRadius,
    marginBottom: token.marginSM,
  },
  invitationInfo: {
    display: "flex",
    alignItems: "center",
    gap: token.marginSM,
  },
  invitationIcon: {
    fontSize: 20,
    color: token.colorTextSecondary,
  },
  invitationDetails: {
    display: "flex",
    flexDirection: "column",
  },
  invitationEmail: {
    fontWeight: 500,
  },
  invitationMeta: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  invitationActions: {
    display: "flex",
    gap: token.marginXS,
  },
  footer: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    marginTop: token.marginSM,
  },
}));

export default function MembersPage() {
  const { styles } = useStyles();
  const [searchValue, setSearchValue] = useState("");
  const { push: pushInviteModal } = useInviteMemberModal();

  const handleInviteMember = () => {
    pushInviteModal({
      onInvite: (email: string, roleId: string, personalMessage?: string) => {
        message.success(`Invitation sent to ${email} (mock)`);
      },
    });
  };

  const handleChangeRole = (memberId: string, roleId: string) => {
    message.success("Role updated");
  };

  const handleRemoveMember = (memberId: string) => {
    message.success("Member removed");
  };

  const handleResendInvitation = (invitationId: string) => {
    message.success("Invitation resent");
  };

  const handleCancelInvitation = (invitationId: string) => {
    message.success("Invitation cancelled");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
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
      {
        key: "view",
        label: "View Profile",
      },
      {
        key: "role",
        label: "Change Role",
        children: roleItems,
      },
      {
        type: "divider",
      },
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
    <div className={styles.container}>
      <Paper>
        <PaperHeader
          title="Team Members"
          actions={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleInviteMember}
            >
              Invite Member
            </Button>
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

      {mockInvitations.length > 0 && (
        <Paper>
          <PaperHeader title="Pending Invitations" />
          {mockInvitations.map((invitation: IInvitation) => {
            const role = getRoleByName(invitation.role);
            return (
              <div key={invitation.id} className={styles.invitationItem}>
                <div className={styles.invitationInfo}>
                  <MailOutlined className={styles.invitationIcon} />
                  <div className={styles.invitationDetails}>
                    <Typography.Text className={styles.invitationEmail}>
                      {invitation.email}
                    </Typography.Text>
                    <Typography.Text className={styles.invitationMeta}>
                      Invited as: {role?.displayName || invitation.role} ·
                      Expires in {getDaysUntilExpiry(invitation.expiresAt)} days
                    </Typography.Text>
                  </div>
                </div>
                <div className={styles.invitationActions}>
                  <Button
                    size="small"
                    onClick={() => handleResendInvitation(invitation.id)}
                  >
                    Resend
                  </Button>
                  <Button
                    size="small"
                    danger
                    onClick={() => handleCancelInvitation(invitation.id)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            );
          })}
        </Paper>
      )}
    </div>
  );
}
