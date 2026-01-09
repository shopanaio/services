import { createStyles } from "antd-style";
import { Typography, Button, Dropdown, Flex } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import { ReactNode } from "react";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  title: {
    fontSize: token.fontSizeLG,
  },
  header: {
    marginBottom: token.margin,
    paddingBottom: token.paddingSM,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  extra: {
    flex: 1,
  },
}));

// ============================================================================
// Types
// ============================================================================

interface IPaperHeaderProps {
  /** Title for the header (string or ReactNode) */
  title?: ReactNode;
  /** Additional content to display after the title */
  extra?: ReactNode;
  /** Custom actions on the right side (dropdown, buttons, etc.) */
  actions?: ReactNode;
  /** Quick edit handler - adds a default dropdown with "Edit" action */
  onEdit?: () => void;
  /** Additional menu items when using onEdit */
  menuItems?: Array<{ key: string; label: string; danger?: boolean }>;
  /** Handler for menu item clicks (key of the clicked item) */
  onMenuClick?: (key: string) => void;
  /** Whether to show bottom border (default: true) */
  bordered?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export const PaperHeader = ({
  title,
  extra,
  actions,
  onEdit,
  menuItems,
  onMenuClick,
  bordered = true,
  className,
}: IPaperHeaderProps) => {
  const { styles, cx } = useStyles();

  const defaultMenuItems = [{ key: "edit", label: "Edit" }];
  const finalMenuItems = menuItems || defaultMenuItems;

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === "edit" && onEdit) {
      onEdit();
    }
    onMenuClick?.(key);
  };

  const renderActions = () => {
    if (actions) return actions;

    if (onEdit || menuItems) {
      return (
        <Dropdown
          menu={{
            items: finalMenuItems,
            onClick: handleMenuClick,
          }}
          trigger={["click"]}
        >
          <Button size="small" icon={<MoreOutlined />} />
        </Dropdown>
      );
    }

    return null;
  };

  const renderTitle = () => {
    if (!title) return null;
    if (typeof title === "string") {
      return (
        <Typography.Text strong className={styles.title}>
          {title}
        </Typography.Text>
      );
    }
    return title;
  };

  return (
    <Flex
      align="center"
      justify="space-between"
      className={cx(className, bordered && styles.header)}
    >
      <Flex align="center" gap={12} style={{ flex: 1 }}>
        {renderTitle()}
        {extra && <div className={styles.extra}>{extra}</div>}
      </Flex>
      {renderActions()}
    </Flex>
  );
};

export type { IPaperHeaderProps };
