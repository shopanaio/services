"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Input,
  Typography,
  Button,
  message,
  Descriptions,
  Avatar,
  Dropdown,
  Flex,
  Table,
  Tag,
  Tabs,
  Empty,
} from "antd";
import type { MenuProps } from "antd";
import { createStyles } from "antd-style";
import {
  WarningOutlined,
  TeamOutlined,
  SafetyOutlined,
  MoreOutlined,
  ShopOutlined,
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
  MailOutlined,
  UserAddOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { KPITile } from "@/ui-kit/kpi-tile";
import { SettingsLayout } from "../../layout";
import { DangerZone, PreviewCard } from "../../shared";
import {
  useDeleteOrganizationModal,
  useEditAvatarModal,
  useInviteMemberModal,
  useEditRoleModal,
} from "../../modals";
import type {
  ApiOrganization,
  ApiMember,
  ApiRole,
} from "@/graphql/types";
import {
  mockMembers,
  mockInvitations,
  mockRoles,
  getUserDisplayName,
  getRoleByName,
} from "../../mocks/data";
import type { IInvitation } from "../../mocks/data";

const useStyles = createStyles(({ token }) => ({
  formItem: {
    marginBottom: token.marginMD,
  },
  label: {
    display: "block",
    marginBottom: token.marginXS,
    fontWeight: 500,
  },
  warning: {
    display: "flex",
    alignItems: "center",
    gap: token.marginXS,
    color: token.colorWarning,
    fontSize: token.fontSizeSM,
    marginTop: token.marginXS,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: token.marginSM,
    marginTop: token.marginMD,
    paddingTop: token.paddingMD,
    borderTop: `1px solid ${token.colorBorderSecondary}`,
  },
  // Stores styles
  storeItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: token.paddingMD,
    backgroundColor: token.colorBgContainer,
    border: `1px solid ${token.colorBorder}`,
    borderRadius: token.borderRadiusLG,
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
    "&:hover": {
      backgroundColor: token.colorBgTextHover,
      borderColor: token.colorPrimaryBorder,
    },
  },
  storeItemDisabled: {
    cursor: "not-allowed",
    opacity: 0.6,
    "&:hover": {
      backgroundColor: token.colorBgContainer,
      borderColor: token.colorBorder,
    },
  },
  storeInfo: {
    marginLeft: token.marginMD,
  },
  storeName: {
    fontWeight: 500,
    marginBottom: 0,
  },
  storeSlug: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  storeList: {
    display: "flex",
    flexDirection: "column",
    gap: token.marginSM,
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: `${token.paddingXL * 2}px 0`,
  },
  // Members styles
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
  // Roles styles
  roleCard: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: token.padding,
    backgroundColor: token.colorBgLayout,
    borderRadius: token.borderRadius,
    marginBottom: token.marginSM,
    border: `1px solid ${token.colorBorder}`,
  },
  roleInfo: {
    display: "flex",
    alignItems: "flex-start",
    gap: token.marginSM,
  },
  roleIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  roleDetails: {
    display: "flex",
    flexDirection: "column",
  },
  roleName: {
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: token.marginXS,
  },
  roleDescription: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    marginTop: 2,
  },
  roleActions: {
    display: "flex",
    gap: token.marginXS,
  },
}));

interface OrganizationFormValues {
  displayName: string;
  name: string;
}

interface Store {
  id: string;
  name: string;
  slug: string;
  status: "active" | "inactive";
  color: string;
}

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

const mockStores: Store[] = [
  { id: "store-1", name: "Main Store", slug: "main-store", status: "active", color: "blue" },
  { id: "store-2", name: "Fashion Outlet", slug: "fashion-outlet", status: "active", color: "purple" },
  { id: "store-3", name: "Electronics Hub", slug: "electronics-hub", status: "active", color: "green" },
  { id: "store-4", name: "Home Decor", slug: "home-decor", status: "inactive", color: "orange" },
  { id: "store-5", name: "Sports Gear", slug: "sports-gear", status: "active", color: "red" },
];

const roleIcons: Record<string, React.ReactNode> = {
  admin: <SafetyOutlined style={{ color: "#1890ff" }} />,
  editor: <EditOutlined style={{ color: "#52c41a" }} />,
  viewer: <EyeOutlined style={{ color: "#8c8c8c" }} />,
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Store Item Component
interface StoreItemProps {
  store: Store;
  onClick?: () => void;
}

function StoreItem({ store, onClick }: StoreItemProps) {
  const { styles, cx } = useStyles();
  const isActive = store.status === "active";

  const handleClick = () => {
    if (isActive && onClick) {
      onClick();
    }
  };

  return (
    <div
      className={cx(styles.storeItem, !isActive && styles.storeItemDisabled)}
      onClick={handleClick}
    >
      <Flex align="center">
        <Avatar
          size="large"
          style={{
            backgroundColor: isActive
              ? `var(--ant-${store.color}-2, #e6f4ff)`
              : "#f5f5f5",
          }}
        >
          <ShopOutlined
            style={{
              color: isActive
                ? `var(--ant-${store.color}-6, #1890ff)`
                : "#8c8c8c",
              fontSize: 20,
            }}
          />
        </Avatar>
        <div className={styles.storeInfo}>
          <Typography.Text className={styles.storeName}>
            {store.name}
          </Typography.Text>
          <div className={styles.storeSlug}>{store.slug}</div>
        </div>
      </Flex>
      <Tag color={isActive ? "success" : "default"}>
        {isActive ? "Active" : "Inactive"}
      </Tag>
    </div>
  );
}

// Role Card Component
interface RoleCardProps {
  role: ApiRole;
  onEdit: () => void;
  onDelete: () => void;
}

function RoleCard({ role, onEdit, onDelete }: RoleCardProps) {
  const { styles } = useStyles();

  return (
    <div className={styles.roleCard}>
      <div className={styles.roleInfo}>
        <span className={styles.roleIcon}>
          {roleIcons[role.name] || <SafetyOutlined />}
        </span>
        <div className={styles.roleDetails}>
          <Typography.Text className={styles.roleName}>
            {role.displayName}
          </Typography.Text>
          <Typography.Text className={styles.roleDescription}>
            {role.description}
          </Typography.Text>
        </div>
      </div>
      {!role.isSystem && (
        <div className={styles.roleActions}>
          <Button size="small" onClick={onEdit}>
            Edit
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}

export default function OrganizationPage() {
  const { styles, cx } = useStyles();
  const [isEditing, setIsEditing] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [activeStoreTab, setActiveStoreTab] = useState("all");

  const { push: pushDeleteModal } = useDeleteOrganizationModal();
  const { push: pushEditAvatarModal } = useEditAvatarModal();
  const { push: pushInviteModal } = useInviteMemberModal();
  const { push: pushEditRoleModal } = useEditRoleModal();

  const organization = mockOrganization;
  const stores = mockStores;

  const memberCount = organization.membership.members.length;
  const roleCount = organization.membership.roles.length;
  const storesCount = stores.length;

  const activeStores = stores.filter((s) => s.status === "active");
  const inactiveStores = stores.filter((s) => s.status === "inactive");

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<OrganizationFormValues>({
    defaultValues: {
      displayName: organization.displayName,
      name: organization.name,
    },
  });

  const onSubmit = (values: OrganizationFormValues) => {
    console.log("Saving organization:", values);
    message.success("Organization updated successfully");
    setIsEditing(false);
  };

  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };

  const handleTransferOwnership = () => {
    message.info("Transfer ownership modal would open");
  };

  const handleEditLogo = () => {
    pushEditAvatarModal({
      currentImage: null,
      onSave: (imageUrl: string | null) => {
        console.log("New logo:", imageUrl);
        message.success(imageUrl ? "Logo updated" : "Logo removed");
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

  // Store handlers
  const handleStoreClick = (store: Store) => {
    console.log("Navigate to store:", store.slug);
  };

  const renderStoreList = (storeList: Store[]) => {
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

  // Member handlers
  const handleInviteMember = () => {
    pushInviteModal({
      onInvite: (email: string, roleId: string) => {
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

  // Role handlers
  const handleCreateRole = () => {
    message.info("Create role modal would open");
  };

  const handleEditRole = (role: ApiRole) => {
    pushEditRoleModal({
      role,
      onSave: (updatedRole: Partial<ApiRole>) => {
        message.success(`Role ${role.displayName} updated (mock)`);
      },
    });
  };

  const handleDeleteRole = (roleId: string) => {
    message.info("Delete role confirmation would open");
  };

  const storeTabItems = [
    { key: "all", label: `All (${stores.length})`, children: renderStoreList(stores) },
    { key: "active", label: `Active (${activeStores.length})`, children: renderStoreList(activeStores) },
    { key: "inactive", label: `Inactive (${inactiveStores.length})`, children: renderStoreList(inactiveStores) },
  ];

  return (
    <SettingsLayout name="organization">
      <PreviewCard
        type="organization"
        name={organization.displayName}
        subtitle={organization.name}
        meta={`Created ${formatDate(organization.createdAt)}`}
        image={undefined}
        onAvatarClick={handleEditLogo}
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
          title="General Information"
          actions={
            !isEditing && (
              <Dropdown
                menu={{
                  items: [{ key: "edit", label: "Edit" }],
                  onClick: () => setIsEditing(true),
                }}
                trigger={["click"]}
              >
                <Button size="small" icon={<MoreOutlined />} />
              </Dropdown>
            )
          }
        />
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.formItem}>
            <Typography.Text className={styles.label}>
              Display Name
            </Typography.Text>
            <Controller
              name="displayName"
              control={control}
              rules={{
                required: "Display name is required",
                minLength: { value: 1, message: "Display name must be at least 1 character" },
                maxLength: { value: 256, message: "Display name must be at most 256 characters" },
              }}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Organization name"
                  status={errors.displayName ? "error" : undefined}
                  disabled={!isEditing}
                />
              )}
            />
            {errors.displayName && (
              <Typography.Text type="danger">
                {errors.displayName.message}
              </Typography.Text>
            )}
          </div>

          <div className={styles.formItem}>
            <Typography.Text className={styles.label}>
              Organization Slug
            </Typography.Text>
            <Controller
              name="name"
              control={control}
              rules={{
                required: "Slug is required",
                minLength: { value: 3, message: "Slug must be at least 3 characters" },
                maxLength: { value: 64, message: "Slug must be at most 64 characters" },
                pattern: {
                  value: /^[a-z0-9]+(-[a-z0-9]+)*$/,
                  message: "Only lowercase letters, numbers, and hyphens allowed. Cannot start or end with hyphen.",
                },
              }}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="organization-slug"
                  status={errors.name ? "error" : undefined}
                  disabled={!isEditing}
                />
              )}
            />
            {errors.name ? (
              <Typography.Text type="danger">
                {errors.name.message}
              </Typography.Text>
            ) : (
              isEditing && (
                <div className={styles.warning}>
                  <WarningOutlined />
                  <span>Changing slug will break existing links</span>
                </div>
              )
            )}
          </div>

          {isEditing && (
            <div className={styles.actions}>
              <Button onClick={handleCancel}>Cancel</Button>
              <Button type="primary" htmlType="submit" disabled={!isDirty}>
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </Paper>

      <Paper>
        <PaperHeader title="Details" />
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Organization ID">
            <Typography.Text copyable={{ text: organization.id }}>
              {organization.id}
            </Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="Created">
            {formatDate(organization.createdAt)}
          </Descriptions.Item>
          {organization.updatedAt && (
            <Descriptions.Item label="Last Updated">
              {formatDate(organization.updatedAt)}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Paper>

      {/* Stores Section */}
      <Paper>
        <PaperHeader title="Stores" />
        <Tabs
          activeKey={activeStoreTab}
          onChange={setActiveStoreTab}
          items={storeTabItems}
        />
      </Paper>

      {/* Members Section */}
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

      {/* Roles Section */}
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
