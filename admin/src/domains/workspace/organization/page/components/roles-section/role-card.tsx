"use client";

import { Typography, Button, Dropdown } from "antd";
import {
  SafetyOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { useStyles } from "../../organization-page.styles";
import type { RoleCardProps } from "../../types";

const roleIcons: Record<string, React.ReactNode> = {
  admin: <SafetyOutlined style={{ color: "#1890ff" }} />,
  editor: <EditOutlined style={{ color: "#52c41a" }} />,
  viewer: <EyeOutlined style={{ color: "#8c8c8c" }} />,
  member: <EyeOutlined style={{ color: "#8c8c8c" }} />,
};

export function RoleCard({
  role,
  onEdit,
  onDelete,
  selected,
  onSelect,
}: RoleCardProps) {
  const { styles, cx } = useStyles();
  const isSelectable = onSelect !== undefined;

  return (
    <div
      className={cx(styles.roleCard, selected && styles.roleCardSelected)}
      onClick={isSelectable ? onSelect : onEdit}
    >
      <div className={styles.roleInfo}>
        <span className={styles.roleIcon}>
          {roleIcons[role.name] || <EyeOutlined style={{ color: "#8c8c8c" }} />}
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

      {!isSelectable && !role.isSystem && (
        <Dropdown
          menu={{
            items: [
              { key: "edit", label: "Edit", icon: <EditOutlined /> },
              {
                key: "delete",
                label: "Delete",
                icon: <DeleteOutlined />,
                danger: true,
              },
            ],
            onClick: ({ key, domEvent }) => {
              domEvent.stopPropagation();
              if (key === "edit") onEdit?.();
              if (key === "delete") onDelete?.();
            },
          }}
          trigger={["click"]}
        >
          <Button
            variant="text"
            color="default"
            size="small"
            icon={<MoreOutlined />}
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
      )}
    </div>
  );
}
