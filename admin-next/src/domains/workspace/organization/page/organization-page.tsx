"use client";

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Input,
  Typography,
  Button,
  message,
  Descriptions,
  Statistic,
  Row,
  Col,
  Avatar,
  Space,
  Dropdown,
} from "antd";
import { createStyles } from "antd-style";
import {
  WarningOutlined,
  TeamOutlined,
  SafetyOutlined,
  CrownOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { DangerZone, PageLayout, PreviewCard } from "../../shared";
import { useDeleteOrganizationModal, useEditAvatarModal } from "../../modals";
import type {
  ApiOrganization,
  ApiMember,
  ApiUser,
} from "@/graphql/types";

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
  ownerCard: {
    display: "flex",
    alignItems: "center",
    gap: token.marginMD,
    padding: token.paddingSM,
    background: token.colorBgLayout,
    borderRadius: token.borderRadiusLG,
    border: `1px solid ${token.colorBorder}`,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    color: token.colorWarning,
    fontSize: token.fontSizeSM,
  },
}));

interface OrganizationFormValues {
  displayName: string;
  name: string;
}

// Mock data using API types
const mockOwner: ApiUser = {
  id: "user-1",
  email: "owner@example.com",
  firstName: "John",
  lastName: "Doe",
  avatar: null,
};

const mockOwnerMember: ApiMember = {
  id: "member-1",
  user: mockOwner,
  role: "owner",
  isOwner: true,
  grantedAt: "2024-01-01T00:00:00Z",
  grantedBy: null,
};

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
      mockOwnerMember,
      {
        id: "member-2",
        user: {
          id: "user-2",
          email: "admin@example.com",
          firstName: "Jane",
          lastName: "Smith",
          avatar: null,
        },
        role: "admin",
        isOwner: false,
        grantedAt: "2024-02-15T00:00:00Z",
        grantedBy: mockOwner,
      },
      {
        id: "member-3",
        user: {
          id: "user-3",
          email: "editor@example.com",
          firstName: "Bob",
          lastName: "Wilson",
          avatar: null,
        },
        role: "editor",
        isOwner: false,
        grantedAt: "2024-03-01T00:00:00Z",
        grantedBy: mockOwner,
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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getUserDisplayName(user: ApiUser): string {
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(" ");
  }
  return user.email;
}

function getUserInitials(user: ApiUser): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  return user.email[0].toUpperCase();
}

export default function OrganizationPage() {
  const { styles } = useStyles();
  const [isEditing, setIsEditing] = useState(false);
  const { push: pushDeleteModal } = useDeleteOrganizationModal();
  const { push: pushEditAvatarModal } = useEditAvatarModal();

  const organization = mockOrganization;

  const owner = useMemo(() => {
    return organization.membership.members.find((m) => m.isOwner);
  }, [organization.membership.members]);

  const memberCount = organization.membership.members.length;
  const roleCount = organization.membership.roles.length;

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

  return (
    <PageLayout>
      <PreviewCard
        type="organization"
        name={organization.displayName}
        subtitle={organization.name}
        meta={`Created ${formatDate(organization.createdAt)}`}
        image={undefined}
        onAvatarClick={handleEditLogo}
      />

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
                minLength: {
                  value: 1,
                  message: "Display name must be at least 1 character",
                },
                maxLength: {
                  value: 256,
                  message: "Display name must be at most 256 characters",
                },
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
                minLength: {
                  value: 3,
                  message: "Slug must be at least 3 characters",
                },
                maxLength: {
                  value: 64,
                  message: "Slug must be at most 64 characters",
                },
                pattern: {
                  value: /^[a-z0-9]+(-[a-z0-9]+)*$/,
                  message:
                    "Only lowercase letters, numbers, and hyphens allowed. Cannot start or end with hyphen.",
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

      <Paper>
        <PaperHeader title="Ownership" />
        {owner && (
          <div className={styles.ownerCard}>
            <Avatar size={48} src={owner.user.avatar}>
              {getUserInitials(owner.user)}
            </Avatar>
            <div className={styles.ownerInfo}>
              <Typography.Text strong>
                {getUserDisplayName(owner.user)}
              </Typography.Text>
              <br />
              <Typography.Text type="secondary">
                {owner.user.email}
              </Typography.Text>
            </div>
            <Space className={styles.ownerBadge}>
              <CrownOutlined />
              <span>Owner</span>
            </Space>
          </div>
        )}
      </Paper>

      <Paper>
        <PaperHeader title="Statistics" />
        <Row gutter={[24, 16]}>
          <Col xs={12} sm={8}>
            <Statistic
              title="Members"
              value={memberCount}
              prefix={<TeamOutlined />}
            />
          </Col>
          <Col xs={12} sm={8}>
            <Statistic
              title="Roles"
              value={roleCount}
              prefix={<SafetyOutlined />}
            />
          </Col>
        </Row>
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
    </PageLayout>
  );
}
