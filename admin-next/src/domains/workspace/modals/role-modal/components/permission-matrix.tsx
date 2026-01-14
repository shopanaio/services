"use client";

import { Typography, Tooltip, Collapse, Tag } from "antd";
import {
  CheckCircleFilled,
  MinusCircleOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import { createStyles } from "antd-style";
import { Action } from "@/graphql/types";
import { PERMISSION_LEVELS } from "../constants";
import type { IResourcePermission, IPermissionCategory } from "../types";

const useStyles = createStyles(({ token }) => ({
  container: {
    width: "100%",
  },
  collapse: {
    background: "transparent",
    border: "none",
    "& .ant-collapse-item": {
      border: `1px solid ${token.colorBorderSecondary}`,
      borderRadius: `${token.borderRadiusLG}px !important`,
      marginBottom: token.marginSM,
      overflow: "hidden",
    },
    "& .ant-collapse-header": {
      background: token.colorBgContainer,
      padding: `${token.paddingSM}px ${token.paddingMD}px !important`,
      alignItems: "center !important",
    },
    "& .ant-collapse-content": {
      borderTop: `1px solid ${token.colorBorderSecondary}`,
    },
    "& .ant-collapse-content-box": {
      padding: "0 !important",
    },
  },
  categoryHeader: {
    display: "flex",
    alignItems: "center",
    gap: token.marginSM,
  },
  categoryLabel: {
    fontWeight: 600,
    fontSize: token.fontSize,
  },
  categoryDescription: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  categoryBadge: {
    marginLeft: "auto",
  },
  resourceRow: {
    display: "grid",
    gridTemplateColumns: "1fr repeat(3, 100px)",
    alignItems: "center",
    padding: `${token.paddingSM}px ${token.paddingMD}px`,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    transition: "background 0.2s",
    "&:last-child": {
      borderBottom: "none",
    },
    "&:hover": {
      background: token.colorBgTextHover,
    },
  },
  resourceInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  resourceLabel: {
    fontWeight: 500,
  },
  resourceDescription: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    lineHeight: 1.4,
  },
  levelCell: {
    display: "flex",
    justifyContent: "center",
  },
  levelButton: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s",
    border: `2px solid transparent`,
  },
  levelButtonInactive: {
    background: token.colorBgContainerDisabled,
    color: token.colorTextDisabled,
    "&:hover": {
      borderColor: token.colorBorder,
      color: token.colorTextSecondary,
    },
  },
  levelButtonActive: {
    color: token.colorWhite,
  },
  levelButtonDisabled: {
    cursor: "not-allowed",
    opacity: 0.5,
    "&:hover": {
      borderColor: "transparent",
    },
  },
  headerRow: {
    display: "grid",
    gridTemplateColumns: "1fr repeat(3, 100px)",
    padding: `${token.paddingXS}px ${token.paddingMD}px`,
    background: token.colorFillQuaternary,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  headerLabel: {
    fontSize: token.fontSizeSM,
    fontWeight: 600,
    color: token.colorTextSecondary,
    textTransform: "uppercase",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
}));

interface IPermissionMatrixProps {
  categories: IPermissionCategory[];
  permissions: IResourcePermission[];
  onChange: (permissions: IResourcePermission[]) => void;
  disabled?: boolean;
}

export const PermissionMatrix = ({
  categories,
  permissions,
  onChange,
  disabled = false,
}: IPermissionMatrixProps) => {
  const { styles, cx, theme } = useStyles();

  const getPermissionForResource = (resource: string): Action | null => {
    return permissions.find((p) => p.resource === resource)?.action ?? null;
  };

  const handlePermissionChange = (resource: string, action: Action | null) => {
    if (disabled) return;

    const currentAction = getPermissionForResource(resource);
    const newAction = currentAction === action ? null : action;

    const newPermissions = permissions.map((p) =>
      p.resource === resource ? { ...p, action: newAction } : p
    );
    onChange(newPermissions);
  };

  const getCategoryPermissionSummary = (
    categoryResources: string[]
  ): { label: string; color: string } => {
    const categoryPerms = categoryResources.map((r) =>
      getPermissionForResource(r)
    );
    const hasAdmin = categoryPerms.some((p) => p === Action.Admin);
    const hasWrite = categoryPerms.some((p) => p === Action.Write);
    const hasRead = categoryPerms.some((p) => p === Action.Read);
    const hasNone = categoryPerms.some((p) => p === null);
    const allSame = categoryPerms.every((p) => p === categoryPerms[0]);

    if (allSame && categoryPerms[0] === null) {
      return { label: "No Access", color: "default" };
    }
    if (allSame && categoryPerms[0] === Action.Admin) {
      return { label: "Full Access", color: "red" };
    }
    if (allSame && categoryPerms[0] === Action.Write) {
      return { label: "Edit Access", color: "orange" };
    }
    if (allSame && categoryPerms[0] === Action.Read) {
      return { label: "View Only", color: "blue" };
    }
    if (hasAdmin || hasWrite || hasRead) {
      return { label: "Mixed", color: "purple" };
    }
    return { label: "No Access", color: "default" };
  };

  const getLevelColor = (action: Action): string => {
    switch (action) {
      case Action.Read:
        return theme.colorInfo;
      case Action.Write:
        return theme.colorWarning;
      case Action.Admin:
        return theme.colorError;
    }
  };

  const collapseItems = categories.map((category) => {
    const categoryResources = category.resources.map((r) => r.resource);
    const summary = getCategoryPermissionSummary(categoryResources);

    return {
      key: category.id,
      label: (
        <div className={styles.categoryHeader}>
          <div>
            <Typography.Text className={styles.categoryLabel}>
              {category.label}
            </Typography.Text>
            {category.description && (
              <Typography.Text className={styles.categoryDescription}>
                {" "}
                - {category.description}
              </Typography.Text>
            )}
          </div>
          <div className={styles.categoryBadge}>
            <Tag color={summary.color}>{summary.label}</Tag>
          </div>
        </div>
      ),
      children: (
        <>
          <div className={styles.headerRow}>
            <span />
            {PERMISSION_LEVELS.map((level) => (
              <Tooltip
                key={level.action}
                title={level.description}
                placement="top"
              >
                <div className={styles.headerLabel}>
                  {level.label}
                  <QuestionCircleOutlined style={{ fontSize: 10 }} />
                </div>
              </Tooltip>
            ))}
          </div>
          {category.resources.map((resource) => {
            const currentAction = getPermissionForResource(resource.resource);

            return (
              <div key={resource.id} className={styles.resourceRow}>
                <div className={styles.resourceInfo}>
                  <Typography.Text className={styles.resourceLabel}>
                    {resource.label}
                  </Typography.Text>
                  <Typography.Text className={styles.resourceDescription}>
                    {resource.description}
                  </Typography.Text>
                </div>
                {PERMISSION_LEVELS.map((level) => {
                  const isActive = currentAction === level.action;
                  const bgColor = isActive ? getLevelColor(level.action) : undefined;

                  return (
                    <div key={level.action} className={styles.levelCell}>
                      <Tooltip
                        title={disabled ? "System roles cannot be modified" : level.label}
                      >
                        <div
                          className={cx(
                            styles.levelButton,
                            isActive
                              ? styles.levelButtonActive
                              : styles.levelButtonInactive,
                            disabled && styles.levelButtonDisabled
                          )}
                          style={isActive ? { background: bgColor } : undefined}
                          onClick={() =>
                            handlePermissionChange(resource.resource, level.action)
                          }
                        >
                          {isActive ? (
                            <CheckCircleFilled style={{ fontSize: 16 }} />
                          ) : (
                            <MinusCircleOutlined style={{ fontSize: 16 }} />
                          )}
                        </div>
                      </Tooltip>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </>
      ),
    };
  });

  return (
    <div className={styles.container}>
      <Collapse
        className={styles.collapse}
        defaultActiveKey={categories.map((c) => c.id)}
        ghost
        items={collapseItems}
      />
    </div>
  );
};
