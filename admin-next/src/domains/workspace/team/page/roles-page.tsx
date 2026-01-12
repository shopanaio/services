"use client";

import { Typography, Button, Tag, message } from "antd";
import { createStyles } from "antd-style";
import {
  PlusOutlined,
  CrownOutlined,
  SafetyOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { SettingsSection } from "../../shared";
import { mockRoles } from "../../mocks/data";
import type { IRole } from "../../mocks/data";
import { useEditRoleModal } from "../../modals";

const useStyles = createStyles(({ token }) => ({
  container: {
    maxWidth: 800,
    margin: "0 auto",
    padding: token.paddingLG,
    display: "flex",
    flexDirection: "column",
    gap: token.marginLG,
  },
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
  roleMemberCount: {
    color: token.colorTextTertiary,
    fontSize: token.fontSizeSM,
    marginTop: token.marginXS,
  },
  roleActions: {
    display: "flex",
    gap: token.marginXS,
  },
}));

const roleIcons: Record<string, React.ReactNode> = {
  Owner: <CrownOutlined style={{ color: "#faad14" }} />,
  Admin: <SafetyOutlined style={{ color: "#1890ff" }} />,
  Editor: <EditOutlined style={{ color: "#52c41a" }} />,
  Viewer: <EyeOutlined style={{ color: "#8c8c8c" }} />,
};

export default function RolesPage() {
  const { styles } = useStyles();
  const { push: pushEditRoleModal } = useEditRoleModal();

  const handleCreateRole = () => {
    message.info("Create role modal would open");
  };

  const handleEditRole = (role: IRole) => {
    pushEditRoleModal({
      role,
      onSave: (updatedRole: Partial<IRole>) => {
        message.success(`Role ${role.name} updated (mock)`);
      },
    });
  };

  const handleDeleteRole = (roleId: string) => {
    message.info("Delete role confirmation would open");
  };

  const getMemberText = (count: number) => {
    if (count === 1) return "1 member";
    return `${count} members`;
  };

  return (
    <div className={styles.container}>
      <SettingsSection
        title="Roles"
        description="Manage roles and their permissions"
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateRole}
          >
            Create Role
          </Button>
        }
      >
        {mockRoles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            onEdit={() => handleEditRole(role)}
            onDelete={() => handleDeleteRole(role.id)}
          />
        ))}
      </SettingsSection>
    </div>
  );
}

interface IRoleCardProps {
  role: IRole;
  onEdit: () => void;
  onDelete: () => void;
}

function RoleCard({ role, onEdit, onDelete }: IRoleCardProps) {
  const { styles } = useStyles();

  const getMemberText = (count: number) => {
    if (count === 1) return "1 member";
    return `${count} members`;
  };

  return (
    <div className={styles.roleCard}>
      <div className={styles.roleInfo}>
        <span className={styles.roleIcon}>
          {roleIcons[role.name] || <SafetyOutlined />}
        </span>
        <div className={styles.roleDetails}>
          <Typography.Text className={styles.roleName}>
            {role.name}
            {role.isSystem && (
              <Tag color="default" style={{ marginLeft: 8 }}>
                System
              </Tag>
            )}
            {!role.isSystem && (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                Custom
              </Tag>
            )}
          </Typography.Text>
          <Typography.Text className={styles.roleDescription}>
            {role.description}
          </Typography.Text>
          <Typography.Text className={styles.roleMemberCount}>
            {getMemberText(role.memberCount)}
          </Typography.Text>
        </div>
      </div>
      <div className={styles.roleActions}>
        {role.name !== "Owner" && (
          <Button size="small" onClick={onEdit}>
            Edit
          </Button>
        )}
        {!role.isSystem && (
          <Button size="small" danger icon={<DeleteOutlined />} onClick={onDelete}>
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
