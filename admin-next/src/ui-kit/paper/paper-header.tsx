import { createStyles } from "antd-style";
import { Typography, Flex } from "antd";
import { ReactNode } from "react";

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

interface IPaperHeaderProps {
  /** Title for the header (string or ReactNode) */
  title?: ReactNode;
  /** Additional content to display after the title */
  extra?: ReactNode;
  /** Custom actions on the right side (dropdown, buttons, etc.) */
  actions?: ReactNode;
  /** Whether to show bottom border (default: true) */
  bordered?: boolean;
  /** Custom class name */
  className?: string;
}

export const PaperHeader = ({
  title,
  extra,
  actions,
  bordered = true,
  className,
}: IPaperHeaderProps) => {
  const { styles, cx } = useStyles();

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
      {actions}
    </Flex>
  );
};

export type { IPaperHeaderProps };
