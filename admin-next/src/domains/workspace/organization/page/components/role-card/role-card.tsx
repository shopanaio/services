"use client";

import { Typography, Button } from "antd";
import {
  SafetyOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useStyles } from "../../organization-page.styles";
import type { IRoleCardProps } from "../../types";

const roleIcons: Record<string, React.ReactNode> = {
  admin: <SafetyOutlined style={{ color: "#1890ff" }} />,
  editor: <EditOutlined style={{ color: "#52c41a" }} />,
  viewer: <EyeOutlined style={{ color: "#8c8c8c" }} />,
};

export function RoleCard({ role, onEdit, onDelete }: IRoleCardProps) {
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
