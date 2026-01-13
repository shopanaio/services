"use client";

import { createStyles } from "antd-style";
import { Typography, Button } from "antd";

const useStyles = createStyles(({ token }) => ({
  section: {
    padding: token.paddingLG,
    borderRadius: token.borderRadiusLG,
    border: `1px solid ${token.colorErrorBorder}`,
    backgroundColor: token.colorBgContainer,
  },
  header: {
    marginBottom: token.marginLG,
    paddingBottom: token.paddingSM,
    borderBottom: `1px solid ${token.colorErrorBorderHover}`,
  },
  title: {
    fontSize: token.fontSizeLG,
    fontWeight: 600,
    margin: 0,
    color: token.colorError,
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: `${token.paddingSM}px 0`,
    "&:not(:last-child)": {
      borderBottom: `1px solid ${token.colorErrorBorder}`,
    },
  },
  itemTitle: {
    fontWeight: 500,
  },
  itemDescription: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
}));

interface IDangerItem {
  title: string;
  description: string;
  buttonText: string;
  onClick: () => void;
}

interface IDangerZoneProps {
  items: IDangerItem[];
  className?: string;
}

export const DangerZone = ({ items, className }: IDangerZoneProps) => {
  const { styles, cx } = useStyles();

  return (
    <div className={cx(styles.section, className)}>
      <div className={styles.header}>
        <Typography.Title level={5} className={styles.title}>
          Danger Zone
        </Typography.Title>
      </div>
      {items.map((item, index) => (
        <div key={index} className={styles.item}>
          <div>
            <Typography.Text className={styles.itemTitle}>
              {item.title}
            </Typography.Text>
            <br />
            <Typography.Text className={styles.itemDescription}>
              {item.description}
            </Typography.Text>
          </div>
          <Button size="small" danger onClick={item.onClick}>
            {item.buttonText}
          </Button>
        </div>
      ))}
    </div>
  );
};
