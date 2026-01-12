"use client";

import { useState } from "react";
import {
  Typography,
  Button,
  message,
  Avatar,
  Dropdown,
  Flex,
  Input,
  Table,
  Tag,
  Tabs,
  Empty,
} from "antd";
import type { MenuProps } from "antd";
import {
  TeamOutlined,
  SafetyOutlined,
  MoreOutlined,
  ShopOutlined,
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
  MailOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { KPITile } from "@/ui-kit/kpi-tile";
import { SettingsLayout } from "../../layout";
import { DangerZone } from "../../shared";
import { OrganizationInfoHeader } from "../components";
import {
  useDeleteOrganizationModal,
  useEditOrganizationModal,
  useInviteMemberModal,
  useEditRoleModal,
  useCreateStoreModal,
} from "../../modals";
import type { ApiOrganization, ApiMember, ApiRole } from "@/graphql/types";
import {
  mockMembers,
  mockInvitations,
  mockRoles,
  getUserDisplayName,
  getRoleByName,
} from "../../mocks/data";
import type { IInvitation } from "../../mocks/data";
import { useStyles } from "./organization-page.styles";
import type { IStore } from "./types";
import { StoreItem, RoleCard } from "./components";

const mockOrganization: ApiOrganization = {
  id: "org-123",
  name: "acme-corp",
  displayName: "Acme Corporation",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-06-15T10:30:00Z",
  membership: {
    domain: "org",
    organizationId: "org-123",
    members: [
      {
        id: "member-1",
        user: {
          id: "user-1",
          email: "admin@example.com",
          firstName: "Jane",
          lastName: "Smith",
          avatar: null,
        },
        role: "admin",
        isOwner: false,
        grantedAt: "2024-02-15T00:00:00Z",
        grantedBy: null,
      },
      {
        id: "member-2",
        user: {
          id: "user-2",
          email: "editor@example.com",
          firstName: "Bob",
          lastName: "Wilson",
          avatar: null,
        },
        role: "editor",
        isOwner: false,
        grantedAt: "2024-03-01T00:00:00Z",
        grantedBy: null,
      },
    ],
    roles: [
      {
        id: "role-1",
        name: "admin",
        displayName: "Administrator",
        domain: "org",
        isSystem: true,
        permissions: [],
      },
      {
        id: "role-2",
        name: "editor",
        displayName: "Editor",
        domain: "org",
        isSystem: true,
        permissions: [],
      },
      {
        id: "role-3",
        name: "viewer",
        displayName: "Viewer",
        domain: "org",
        isSystem: true,
        permissions: [],
      },
    ],
  },
};

const mockStores: IStore[] = [
  { id: "store-1", name: "Main Store", slug: "main-store", status: "active", color: "blue" },
  { id: "store-2", name: "Fashion Outlet", slug: "fashion-outlet", status: "active", color: "purple" },
  { id: "store-3", name: "Electronics Hub", slug: "electronics-hub", status: "active", color: "green" },
  { id: "store-4", name: "Home Decor", slug: "home-decor", status: "inactive", color: "orange" },
  { id: "store-5", name: "Sports Gear", slug: "sports-gear", status: "active", color: "red" },
];

export default function OrganizationPage() {
  const { styles } = useStyles();
  const [searchValue, setSearchValue] = useState("");
  const [activeStoreTab, setActiveStoreTab] = useState("all");

  const { push: pushDeleteModal } = useDeleteOrganizationModal();
  const { push: pushEditOrganizationModal } = useEditOrganizationModal();
  const { push: pushInviteModal } = useInviteMemberModal();
  const { push: pushEditRoleModal } = useEditRoleModal();
  const { push: pushCreateStoreModal } = useCreateStoreModal();

  const organization = mockOrganization;
  const stores = mockStores;

  const memberCount = organization.membership.members.length;
  const roleCount = organization.membership.roles.length;
  const storesCount = stores.length;

  const activeStores = stores.filter((s) => s.status === "active");
  const inactiveStores = stores.filter((s) => s.status === "inactive");

  const handleTransferOwnership = () => {
    message.info("Transfer ownership modal would open");
  };

  const handleEditOrganization = () => {
    pushEditOrganizationModal({
      displayName: organization.displayName,
      slug: organization.name,
      currentLogo: null,
      onSave: (values: { displayName: string; slug: string; logo: string | null }) => {
        console.log("Saving organization:", values);
        message.success("Organization updated successfully");
      },
    });
  };

  const handleDeleteOrganization = () => {
    pushDeleteModal({
      organizationName: organization.displayName,
      organizationSlug: organization.name,
      onDelete: () => {
        message.success("Organization deleted");
      },
    });
  };

  const handleStoreClick = (store: IStore) => {
    console.log("Navigate to store:", store.slug);
  };

  const handleCreateStore = () => {
    pushCreateStoreModal({
      onCreate: (values: { name: string }) => {
        console.log("Creating store:", values);
        message.success(`Store "${values.name}" created successfully`);
      },
    });
  };

  const renderStoreList = (storeList: IStore[]) => {
    if (!storeList.length) {
      return (
        <div className={styles.emptyState}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Typography.Text type="secondary">
                No stores found
              </Typography.Text>
            }
          />
        </div>
      );
    }

    return (
      <div className={styles.storeList}>
        {storeList.map((store) => (
          <StoreItem
            key={store.id}
            store={store}
            onClick={() => handleStoreClick(store)}
          />
        ))}
      </div>
    );
  };

  const handleInviteMember = () => {
    pushInviteModal({
      onInvite: (email: string, _roleId: string) => {
        message.success(`Invitation sent to ${email} (mock)`);
      },
    });
  };

  const handleChangeRole = (_memberId: string, _roleId: string) => {
    message.success("Role updated");
  };

  const handleRemoveMember = (_memberId: string) => {
    message.success("Member removed");
  };

  const handleResendInvitation = (_invitationId: string) => {
    message.success("Invitation resent");
  };

  const handleCancelInvitation = (_invitationId: string) => {
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

  const memberColumns = [
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

  const handleCreateRole = () => {
    message.info("Create role modal would open");
  };

  const handleEditRole = (role: ApiRole) => {
    pushEditRoleModal({
      role,
      onSave: (_updatedRole: Partial<ApiRole>) => {
        message.success(`Role ${role.displayName} updated (mock)`);
      },
    });
  };

  const handleDeleteRole = (_roleId: string) => {
    message.info("Delete role confirmation would open");
  };

  const storeTabItems = [
    { key: "all", label: `All (${stores.length})`, children: renderStoreList(stores) },
    { key: "active", label: `Active (${activeStores.length})`, children: renderStoreList(activeStores) },
    { key: "inactive", label: `Inactive (${inactiveStores.length})`, children: renderStoreList(inactiveStores) },
  ];

  return (
    <SettingsLayout name="organization">
      <OrganizationInfoHeader
        organization={organization}
        onEdit={handleEditOrganization}
      />

      <Flex gap={16}>
        <KPITile
          label="Stores"
          value={storesCount}
          icon={<ShopOutlined />}
          tooltip="Total number of stores in organization"
        />
        <KPITile
          label="Members"
          value={memberCount}
          icon={<TeamOutlined />}
          tooltip="Total team members"
        />
        <KPITile
          label="Roles"
          value={roleCount}
          icon={<SafetyOutlined />}
          tooltip="Custom roles defined"
        />
      </Flex>

      <Paper>
        <PaperHeader
          title="Stores"
          actions={
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={handleCreateStore}
            >
              Create Store
            </Button>
          }
        />
        <Tabs
          activeKey={activeStoreTab}
          onChange={setActiveStoreTab}
          items={storeTabItems}
        />
      </Paper>

      <Paper>
        <PaperHeader
          title="Team Members"
          actions={
            <Dropdown
              menu={{
                items: [{ key: "invite", label: "Invite member", icon: <UserAddOutlined /> }],
                onClick: handleInviteMember,
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
          columns={memberColumns}
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

      <Paper>
        <PaperHeader
          title="Roles"
          extra={
            <Typography.Text type="secondary">
              Manage roles and their permissions
            </Typography.Text>
          }
          actions={
            <Dropdown
              menu={{
                items: [{ key: "create", label: "Create role", icon: <PlusOutlined /> }],
                onClick: handleCreateRole,
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
            onEdit={() => handleEditRole(role)}
            onDelete={() => handleDeleteRole(role.id)}
          />
        ))}
      </Paper>

      <DangerZone
        items={[
          {
            title: "Transfer Ownership",
            description:
              "Transfer this organization to another admin member. You will retain admin access.",
            buttonText: "Transfer...",
            onClick: handleTransferOwnership,
          },
          {
            title: "Delete Organization",
            description:
              "Permanently delete this organization and all its data. This action cannot be undone.",
            buttonText: "Delete...",
            onClick: handleDeleteOrganization,
          },
        ]}
      />
    </SettingsLayout>
  );
}
