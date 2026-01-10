"use client";

import { Switch, Flex, Typography } from "antd";
import { SunOutlined, MoonOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import { useThemeContext } from "@/ui-kit/theme";

const useStyles = createStyles(({ token }) => ({
  container: {
    padding: "12px 16px",
    borderTop: `1px solid ${token.colorBorderSecondary}`,
    marginTop: "auto",
  },
  containerCollapsed: {
    padding: "12px 8px",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  icon: {
    fontSize: 16,
    color: token.colorTextSecondary,
  },
  iconActive: {
    color: token.colorText,
  },
}));

interface ThemeToggleProps {
  isCollapsed?: boolean;
}

export const ThemeToggle = ({ isCollapsed }: ThemeToggleProps) => {
  const { styles, cx } = useStyles();
  const { isDark, toggleTheme } = useThemeContext();

  if (isCollapsed) {
    return (
      <Flex
        className={cx(styles.container, styles.containerCollapsed)}
        justify="center"
      >
        <Switch
          size="small"
          checked={isDark}
          onChange={toggleTheme}
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
        />
      </Flex>
    );
  }

  return (
    <Flex
      className={styles.container}
      align="center"
      justify="space-between"
    >
      <Flex align="center" gap={8}>
        <SunOutlined
          className={cx(styles.icon, !isDark && styles.iconActive)}
        />
        <Typography.Text className={styles.label}>
          {isDark ? "Dark" : "Light"}
        </Typography.Text>
      </Flex>
      <Switch
        size="small"
        checked={isDark}
        onChange={toggleTheme}
        checkedChildren={<MoonOutlined />}
        unCheckedChildren={<SunOutlined />}
      />
    </Flex>
  );
};
