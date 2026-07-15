import { Flex, Typography } from "antd";
import { createStyles } from "antd-style";
import type { ReactNode } from "react";

const useStyles = createStyles(({ token }) => ({
  icon: {
    color: token.colorText,
    display: "flex",
    fontSize: 20,
    width: 20,
  },
  content: {
    minWidth: 0,
  },
  label: {
    color: token.colorTextSecondary,
    display: "block",
  },
  value: {
    display: "block",
  },
}));

interface SettingValueProps {
  icon: ReactNode;
  label: ReactNode;
  value: ReactNode;
}

export const SettingValue = ({ icon, label, value }: SettingValueProps) => {
  const { styles } = useStyles();

  return (
    <Flex align="center" gap={16}>
      <span className={styles.icon}>{icon}</span>
      <div className={styles.content}>
        <Typography.Text className={styles.label}>{label}</Typography.Text>
        <Typography.Text className={styles.value}>{value}</Typography.Text>
      </div>
    </Flex>
  );
};
