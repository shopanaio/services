"use client";

import { ReactNode } from "react";
import { createStyles } from "antd-style";
import { Typography, Avatar, Flex, Button, Tag } from "antd";
import { EditOutlined, UserOutlined, TeamOutlined } from "@ant-design/icons";

const useStyles = createStyles(({ token }) => ({
  card: {
    padding: token.paddingLG,
    backgroundColor: token.colorBgContainer,
    borderRadius: token.borderRadiusLG,
    boxShadow: token.boxShadowTertiary,
  },
  avatar: {
    backgroundColor: token.colorPrimary,
  },
  avatarClickable: {
    cursor: "pointer",
    transition: "opacity 0.2s",
    "&:hover": {
      opacity: 0.8,
    },
  },
  name: {
    fontSize: token.fontSizeXL,
    fontWeight: 600,
    marginBottom: 0,
    lineHeight: 1.3,
  },
  subtitle: {
    color: token.colorTextSecondary,
    fontSize: token.fontSize,
  },
  meta: {
    color: token.colorTextTertiary,
    fontSize: token.fontSizeSM,
    marginTop: token.marginXS,
  },
}));

interface IPreviewCardProps {
  type: "organization" | "profile";
  name: string;
  subtitle?: string;
  meta?: string;
  image?: string | null;
  badge?: string;
  onEdit?: () => void;
  onAvatarClick?: () => void;
  className?: string;
}

export const PreviewCard = ({
  type,
  name,
  subtitle,
  meta,
  image,
  badge,
  onEdit,
  onAvatarClick,
  className,
}: IPreviewCardProps) => {
  const { styles, cx } = useStyles();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const avatarIcon = type === "organization" ? <TeamOutlined /> : <UserOutlined />;

  return (
    <div className={cx(styles.card, className)}>
      <Flex justify="space-between" align="flex-start">
        <Flex gap={16} align="center">
          <Avatar
            size={64}
            src={image}
            icon={!image && avatarIcon}
            className={cx(styles.avatar, onAvatarClick && styles.avatarClickable)}
            onClick={onAvatarClick}
          >
            {!image && getInitials(name)}
          </Avatar>
          <div>
            <Flex align="center" gap={8}>
              <Typography.Title level={4} className={styles.name}>
                {name}
              </Typography.Title>
              {badge && <Tag color="blue">{badge}</Tag>}
            </Flex>
            {subtitle && (
              <Typography.Text className={styles.subtitle}>
                {subtitle}
              </Typography.Text>
            )}
            {meta && (
              <div className={styles.meta}>
                {meta}
              </div>
            )}
          </div>
        </Flex>
        {onEdit && (
          <Button icon={<EditOutlined />} onClick={onEdit}>
            Edit
          </Button>
        )}
      </Flex>
    </div>
  );
};
